import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, ChevronUp, Clock3, Coins, ListTodo, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import type { BudgetSummary, GenerationTask, GenerationTaskStatus } from '../../domain/generation/types';
import { cancelTask, getBudget, listTasks, retryTask } from './taskApi';

interface TaskCenterProps {
  projectId: string;
  refreshSignal?: number;
  onTaskCompleted?: (task: GenerationTask) => void;
}

const statusMeta: Record<GenerationTaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: '排队中', color: 'text-amber-200 bg-amber-300/10 border-amber-300/20', icon: <Clock3 size={13} /> },
  running: { label: '生成中', color: 'text-cyan-200 bg-cyan-300/10 border-cyan-300/20', icon: <Loader2 size={13} className="animate-spin" /> },
  succeeded: { label: '已完成', color: 'text-emerald-200 bg-emerald-300/10 border-emerald-300/20', icon: <CheckCircle2 size={13} /> },
  failed: { label: '失败', color: 'text-red-200 bg-red-300/10 border-red-300/20', icon: <XCircle size={13} /> },
  cancelled: { label: '已取消', color: 'text-neutral-400 bg-white/5 border-white/10', icon: <Ban size={13} /> }
};

const kindLabel = {
  text: '文本',
  image: '图片',
  video: '视频',
  'rough-cut': '草片'
};

export const TaskCenter: React.FC<TaskCenterProps> = ({ projectId, refreshSignal = 0, onTaskCompleted }) => {
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
    <aside className="fixed right-4 top-20 z-[120] text-white">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-[#17191e]/95 px-4 py-2.5 text-sm shadow-xl backdrop-blur hover:bg-[#20232a]"
      >
        <ListTodo size={16} />
        任务中心
        {activeCount > 0 && <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold text-black">{activeCount}</span>}
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="mt-3 w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#121419]/95 shadow-2xl backdrop-blur-xl">
          <header className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">生成任务</h3>
                <p className="mt-1 text-xs text-neutral-500">任务关闭页面后仍会继续执行</p>
              </div>
              <button onClick={refresh} className="rounded-full p-2 text-neutral-500 hover:bg-white/5 hover:text-white">
                <RefreshCw size={15} />
              </button>
            </div>
            {budget && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-neutral-400"><Coins size={13} /> Demo预算</span>
                  <span>¥{budget.reserved.toFixed(2)} / ¥{budget.limit.toFixed(2)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500"
                    style={{ width: `${Math.min(100, (budget.reserved / budget.limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </header>

          <div className="max-h-[480px] space-y-2 overflow-y-auto p-3">
            {error && <div className="rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}
            {!error && tasks.length === 0 && (
              <div className="py-10 text-center text-sm text-neutral-600">还没有生成任务</div>
            )}
            {tasks.map((task) => {
              const meta = statusMeta[task.status];
              return (
                <article key={task.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{kindLabel[task.kind]}生成 · {task.qualityPreset}</div>
                      <div className="mt-1 text-[10px] text-neutral-500">
                        {task.mode === 'simulation' ? '模拟执行' : `${task.provider}/${task.model}`}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-600">节点 {task.nodeId?.slice(0, 10) || '—'}</div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${meta.color}`}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                    <span>预计 ¥{task.estimatedCost.toFixed(2)}</span>
                    <span>尝试 {task.attempt}/{task.maxAttempts}</span>
                  </div>
                  {task.error && <div className="mt-2 rounded-lg bg-red-400/10 p-2 text-xs text-red-200">{task.error.message}</div>}
                  {typeof task.output?.resultUrl === 'string' && (
                    <a
                      href={task.output.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs text-cyan-300 hover:text-cyan-200"
                    >
                      查看生成结果
                    </a>
                  )}
                  {['queued', 'running'].includes(task.status) && (
                    <button onClick={() => handleCancel(task.id)} className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-300">
                      <Ban size={13} /> 取消任务
                    </button>
                  )}
                  {['failed', 'cancelled'].includes(task.status) && task.attempt < task.maxAttempts && (
                    <button onClick={() => handleRetry(task.id)} className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white">
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
