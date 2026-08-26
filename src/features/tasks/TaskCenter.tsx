import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, ChevronUp, Clock3, Coins, ListTodo, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import type { BudgetSummary, GenerationTask, GenerationTaskStatus } from '../../domain/generation/types';
import { cancelTask, getBudget, listTasks, retryTask } from './taskApi';

interface TaskCenterProps {
  projectId: string;
  refreshSignal?: number;
  onTaskCompleted?: (task: GenerationTask) => void;
  assistantOpen?: boolean;
}

const statusMeta: Record<GenerationTaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: '排队中', color: 'text-[#8a5a00] bg-[#fff7df] border-[#f1c66f]', icon: <Clock3 size={13} /> },
  running: { label: '生成中', color: 'text-[#2457d6] bg-[#eef3ff] border-[#bfd0f7]', icon: <Loader2 size={13} className="animate-spin" /> },
  succeeded: { label: '已完成', color: 'text-[#176b43] bg-[#e8f8ed] border-[#9bd5b0]', icon: <CheckCircle2 size={13} /> },
  failed: { label: '失败', color: 'text-[#a52626] bg-[#fff1f1] border-[#f3a7a7]', icon: <XCircle size={13} /> },
  cancelled: { label: '已取消', color: 'text-[#667085] bg-[#f2f4f7] border-[#dce1e7]', icon: <Ban size={13} /> }
};

const kindLabel = {
  text: '文本',
  image: '图片',
  video: '视频',
  'rough-cut': '草片'
};

export const TaskCenter: React.FC<TaskCenterProps> = ({ projectId, refreshSignal = 0, onTaskCompleted, assistantOpen = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notifiedTaskIdsRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const [nextTasks, nextBudget] = await Promise.all([listTasks(projectId), getBudget()]);
      setTasks(nextTasks);
      setBudget(nextBudget);
      setError(null);
      nextTasks
        .filter((task) => task.status === 'succeeded' && !notifiedTaskIdsRef.current.has(task.id))
        .forEach((task) => {
          notifiedTaskIdsRef.current.add(task.id);
          onTaskCompleted?.(task);
        });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '任务中心加载失败');
    }
  }, [projectId, onTaskCompleted]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
  }, [refresh, refreshSignal]);

  const activeCount = useMemo(
    () => tasks.filter((task) => ['queued', 'running'].includes(task.status)).length,
    [tasks]
  );

  const handleCancel = async (taskId: string) => {
    await cancelTask(taskId);
    await refresh();
  };

  const handleRetry = async (taskId: string) => {
    await retryTask(taskId);
    await refresh();
  };

  return (
    <aside className={`fixed top-20 z-[120] text-[#172033] transition-[right] ${assistantOpen ? 'right-4 sm:right-[436px]' : 'right-4'}`}>
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="ml-auto flex items-center gap-2 rounded-lg border border-[#dce1e7] bg-white px-4 py-2.5 text-sm shadow-[0_8px_24px_rgba(31,42,68,0.1)] hover:border-[#2457d6] hover:text-[#2457d6]"
      >
        <ListTodo size={16} />
        任务中心
        {activeCount > 0 && <span className="studio-utility rounded-full bg-[#2457d6] px-2 py-0.5 text-[9px] font-bold text-white">{activeCount}</span>}
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="mt-3 w-[380px] overflow-hidden rounded-xl border border-[#dce1e7] bg-white shadow-[0_20px_60px_rgba(31,42,68,0.15)]">
          <header className="border-b border-[#dce1e7] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">生成任务</h3>
                <p className="mt-1 text-xs text-[#667085]">任务关闭页面后仍会继续执行</p>
              </div>
              <button onClick={refresh} className="rounded-md p-2 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#2457d6]">
                <RefreshCw size={15} />
              </button>
            </div>
            {budget && (
              <div className="mt-4 rounded-lg border border-[#bfd0f7] bg-[#eef3ff] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#667085]"><Coins size={13} /> Demo预算</span>
                  <span>¥{budget.reserved.toFixed(2)} / ¥{budget.limit.toFixed(2)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d8e2fa]">
                  <div
                    className="h-full rounded-full bg-[#2457d6]"
                    style={{ width: `${Math.min(100, (budget.reserved / budget.limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </header>

          <div className="max-h-[480px] space-y-2 overflow-y-auto p-3">
            {error && <div className="rounded-lg border border-[#f3a7a7] bg-[#fff1f1] p-3 text-xs text-[#a52626]">{error}</div>}
            {!error && tasks.length === 0 && (
              <div className="py-10 text-center text-sm text-[#98a2b3]">还没有生成任务</div>
            )}
            {tasks.map((task) => {
              const meta = statusMeta[task.status];
              return (
                <article key={task.id} className="rounded-lg border border-[#e5e9ee] bg-[#fafbfc] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{kindLabel[task.kind]}生成 · {task.qualityPreset}</div>
                      <div className="studio-utility mt-1 text-[9px] text-[#667085]">
                        {task.mode === 'simulation' ? '模拟执行' : `${task.provider}/${task.model}`}
                      </div>
                      <div className="studio-utility mt-1 text-[9px] text-[#98a2b3]">节点 {task.nodeId?.slice(0, 10) || '—'}</div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${meta.color}`}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>
                  <div className="studio-utility mt-3 flex items-center justify-between text-[10px] text-[#667085]">
                    <span>预计 ¥{task.estimatedCost.toFixed(2)}</span>
                    <span>尝试 {task.attempt}/{task.maxAttempts}</span>
                  </div>
                  {task.error && <div className="mt-2 rounded-lg bg-[#fff1f1] p-2 text-xs text-[#a52626]">{task.error.message}</div>}
                  {typeof task.output?.resultUrl === 'string' && (
                    <a
                      href={task.output.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs text-[#2457d6] hover:underline"
                    >
                      查看生成结果
                    </a>
                  )}
                  {['queued', 'running'].includes(task.status) && (
                    <button onClick={() => handleCancel(task.id)} className="mt-3 flex items-center gap-1.5 text-xs text-[#667085] hover:text-[#a52626]">
                      <Ban size={13} /> 取消任务
                    </button>
                  )}
                  {['failed', 'cancelled'].includes(task.status) && task.attempt < task.maxAttempts && (
                    <button onClick={() => handleRetry(task.id)} className="mt-3 flex items-center gap-1.5 text-xs text-[#667085] hover:text-[#2457d6]">
                      <RotateCcw size={13} /> 重试
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
