import { evaluateQualityAudit } from './qualityAudit.js';

const defaultSimulationExecutor = async (task) => {
    const audit = task.input?.auditSnapshot ? evaluateQualityAudit(task.input.auditSnapshot) : null;
    return {
        actualCost: task.estimatedCost,
        output: audit ? {
            mode: 'simulation',
            content: JSON.stringify(audit),
            audit,
            completedForNodeId: task.nodeId
        } : {
            mode: 'simulation',
            message: `${task.kind === 'image' ? '图片' : task.kind === 'video' ? '视频' : task.kind === 'text' ? '文本' : '生成'}任务已在 Demo 模拟模式下完成`,
            completedForNodeId: task.nodeId
        }
    };
};

export const createGenerationQueue = (repository, options = {}) => {
    const concurrency = Math.max(1, Number(options.concurrency || 2));
    const executionDelayMs = Math.max(0, Number(options.executionDelayMs ?? 600));
    const simulationExecutor = options.simulationExecutor || defaultSimulationExecutor;
    const providerExecutor = options.providerExecutor;
    const pending = [];
    const pendingIds = new Set();
    let activeCount = 0;

    const drain = () => {
        while (activeCount < concurrency && pending.length > 0) {
            const item = pending.shift();
            activeCount += 1;

            setTimeout(async () => {
                try {
                    const queuedTask = repository.getTask(item.userId, item.taskId);
                    if (!queuedTask || queuedTask.status !== 'queued') return;

                    const runningTask = repository.transitionTask(item.userId, item.taskId, 'running');
                    const result = runningTask.mode === 'simulation'
                        ? await simulationExecutor(runningTask)
                        : providerExecutor
                            ? await providerExecutor(runningTask)
                            : (() => {
                                const error = new Error('Real provider execution is not configured');
                                error.code = 'PROVIDER_NOT_CONFIGURED';
                                throw error;
                            })();
                    repository.transitionTask(item.userId, item.taskId, 'succeeded', {
                        actualCost: Number(result.actualCost ?? runningTask.estimatedCost),
                        output: result.output || null,
                        error: null
                    });
                } catch (error) {
                    const currentTask = repository.getTask(item.userId, item.taskId);
                    if (currentTask && currentTask.status === 'running') {
                        repository.transitionTask(item.userId, item.taskId, 'failed', {
                            error: {
                                message: error.message || 'Generation task failed',
                                code: error.code || 'TASK_EXECUTION_FAILED'
                            }
                        });
                    }
                } finally {
                    pendingIds.delete(`${item.userId}:${item.taskId}`);
                    activeCount -= 1;
                    drain();
                }
            }, executionDelayMs);
        }
    };

    return {
        enqueue(userId, taskId) {
            const key = `${userId}:${taskId}`;
            if (pendingIds.has(key)) return false;
            pendingIds.add(key);
            pending.push({ userId, taskId });
            drain();
            return true;
        },

        getStats() {
            return { activeCount, pendingCount: pending.length, concurrency };
        }
    };
};
