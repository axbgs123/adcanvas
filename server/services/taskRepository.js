import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);
const VALID_TRANSITIONS = {
    queued: new Set(['running', 'cancelled']),
    running: new Set(['succeeded', 'failed', 'cancelled']),
    succeeded: new Set([]),
    failed: new Set(['queued']),
    cancelled: new Set(['queued'])
};

const userDirectoryName = (userId) => crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex')
    .slice(0, 24);

const writeJsonAtomic = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2));
    fs.renameSync(temporaryPath, filePath);
};

const readTasks = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(value) ? value : [];
};

export const createTaskRepository = (tasksDirectory, options = {}) => {
    const accountBudgetLimit = Number(options.accountBudgetLimit ?? process.env.DEMO_ACCOUNT_BUDGET_CNY ?? 200);
    fs.mkdirSync(tasksDirectory, { recursive: true });

    const getTaskFile = (userId) => path.join(tasksDirectory, userDirectoryName(userId), 'tasks.json');
    const listTasks = (userId) => readTasks(getTaskFile(userId));
    const saveTasks = (userId, tasks) => writeJsonAtomic(getTaskFile(userId), tasks);

    const getReservedCost = (tasks) => tasks
        .filter((task) => task.status !== 'cancelled' && task.status !== 'failed')
        .reduce((sum, task) => sum + Number(task.actualCost ?? task.estimatedCost ?? 0), 0);

    const findTaskIndex = (tasks, taskId) => tasks.findIndex((task) => task.id === taskId);

    return {
        listTasks(userId, filters = {}) {
            return listTasks(userId)
                .filter((task) => !filters.projectId || task.projectId === filters.projectId)
                .filter((task) => !filters.status || task.status === filters.status)
                .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        },

        getTask(userId, taskId) {
            return listTasks(userId).find((task) => task.id === taskId) || null;
        },

        getBudgetSummary(userId) {
            const tasks = listTasks(userId);
            const reserved = getReservedCost(tasks);
            return {
                currency: 'CNY',
                limit: accountBudgetLimit,
                reserved,
                remaining: Math.max(0, accountBudgetLimit - reserved)
            };
        },

        createTask(userId, input) {
            const tasks = listTasks(userId);
            const existing = tasks.find((task) => task.idempotencyKey === input.idempotencyKey);
            if (existing) return { task: existing, created: false };

            if (!input.idempotencyKey || typeof input.idempotencyKey !== 'string') {
                const error = new Error('idempotencyKey is required');
                error.statusCode = 400;
                throw error;
            }
            if (input.estimatedCost > 0 && !input.confirmed) {
                const error = new Error('Paid generation requires explicit confirmation');
                error.statusCode = 409;
                error.code = 'CONFIRMATION_REQUIRED';
                throw error;
            }

            const reserved = getReservedCost(tasks);
            if (reserved + input.estimatedCost > accountBudgetLimit) {
                const error = new Error('Demo account budget would be exceeded');
                error.statusCode = 402;
                error.code = 'BUDGET_EXCEEDED';
                throw error;
            }

            const now = new Date().toISOString();
            const task = {
                id: crypto.randomUUID(),
                ownerId: userId,
                projectId: input.projectId,
                nodeId: input.nodeId || null,
                kind: input.kind,
                qualityPreset: input.qualityPreset,
                provider: input.provider || 'auto',
                model: input.model || 'auto',
                mode: input.mode || 'simulation',
                status: 'queued',
                estimatedCost: Number(input.estimatedCost || 0),
                actualCost: null,
                currency: 'CNY',
                pricingVersion: input.pricingVersion,
                idempotencyKey: input.idempotencyKey,
                confirmedAt: input.confirmed ? now : null,
                attempt: 0,
                maxAttempts: Number(input.maxAttempts || 2),
                input: input.payload || {},
                output: null,
                error: null,
                createdAt: now,
                updatedAt: now,
                startedAt: null,
                completedAt: null
            };
            tasks.push(task);
            saveTasks(userId, tasks);
            return { task, created: true };
        },

        transitionTask(userId, taskId, nextStatus, updates = {}) {
            const tasks = listTasks(userId);
            const index = findTaskIndex(tasks, taskId);
            if (index === -1) return null;

            const task = tasks[index];
            if (!VALID_TRANSITIONS[task.status]?.has(nextStatus)) {
                const error = new Error(`Invalid task transition: ${task.status} → ${nextStatus}`);
                error.statusCode = 409;
                throw error;
            }

            const now = new Date().toISOString();
            const next = {
                ...task,
                ...updates,
                status: nextStatus,
                updatedAt: now,
                startedAt: nextStatus === 'running' ? now : task.startedAt,
                completedAt: TERMINAL_STATUSES.has(nextStatus) ? now : null,
                attempt: nextStatus === 'running' ? task.attempt + 1 : task.attempt
            };
            tasks[index] = next;
            saveTasks(userId, tasks);
            return next;
        },

        cancelTask(userId, taskId) {
            const task = this.getTask(userId, taskId);
            if (!task) return null;
            if (TERMINAL_STATUSES.has(task.status)) return task;
            return this.transitionTask(userId, taskId, 'cancelled');
        },

        retryTask(userId, taskId) {
            const task = this.getTask(userId, taskId);
            if (!task) return null;
            if (!['failed', 'cancelled'].includes(task.status)) {
                const error = new Error('Only failed or cancelled tasks can be retried');
                error.statusCode = 409;
                throw error;
            }
            if (task.attempt >= task.maxAttempts) {
                const error = new Error('Task retry limit reached');
                error.statusCode = 409;
                throw error;
            }
            return this.transitionTask(userId, taskId, 'queued', { error: null });
        }
    };
};
