import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Command, CornerDownLeft, Loader2, Sparkles, X, XCircle } from 'lucide-react';
import type { NodeData } from '../../types';
import { planCanvasCommand } from '../../domain/assistant/canvasCommandPlanner';
import type { CanvasCommandPlan, CanvasOperationRecord } from '../../domain/assistant/types';

interface CanvasAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeData[];
  selectedNodeIds: string[];
  operationLog: CanvasOperationRecord[];
  onExecutePlan: (plan: CanvasCommandPlan) => Promise<{ success: boolean; message: string }>;
  onRecordCancelled: (plan: CanvasCommandPlan) => void;
}

const examples = [
  '创建一个创意路线节点',
  '整理画布',
  '给选中节点创建分支',
  '创建完整广告工作流',
  '删除选中节点'
];

export const CanvasAssistantPanel: React.FC<CanvasAssistantPanelProps> = ({
  isOpen,
  onClose,
  nodes,
  selectedNodeIds,
  operationLog,
  onExecutePlan,
  onRecordCancelled
}) => {
  const [message, setMessage] = useState('');
  const [pendingPlan, setPendingPlan] = useState<CanvasCommandPlan | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const execute = async (plan: CanvasCommandPlan) => {
    setIsExecuting(true);
    const result = await onExecutePlan(plan);
    setFeedback(result);
    setPendingPlan(null);
    setIsExecuting(false);
  };

  const submit = async () => {
    const plan = planCanvasCommand(message, {
      nodeCount: nodes.length,
      selectedNodeCount: selectedNodeIds.length
    });
    if (!plan) {
      setFeedback({ success: false, message: '暂未识别这条画布命令。可以参考下方示例，普通创意问答将在接入模型密钥后恢复。' });
      return;
    }
    setMessage('');
    setFeedback(null);
    if (plan.requiresConfirmation) {
      setPendingPlan(plan);
    } else {
      await execute(plan);
    }
  };

  return (
    <aside className="fixed right-0 top-0 z-[160] flex h-full w-[420px] flex-col border-l border-white/10 bg-[#121419]/98 text-white shadow-2xl backdrop-blur-xl">
      <header className="flex items-start justify-between border-b border-white/10 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={15} /> Canvas assistant
          </div>
          <h2 className="mt-2 text-xl font-semibold">AI画布助手</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">先生成结构化操作计划，再按风险等级执行。</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-white/5 hover:text-white"><X size={18} /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-xs leading-5 text-cyan-100">
          当前使用本地可解释规划器，不依赖模型密钥。创建和整理等低风险操作直接执行；删除、清空和替换画布必须确认。
        </div>

        {pendingPlan && (
          <section className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-200"><AlertTriangle size={15} /> 高风险操作计划</div>
            <h3 className="mt-2 font-medium">{pendingPlan.title}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-400">{pendingPlan.summary}</p>
            <div className="mt-3 space-y-1 rounded-xl bg-black/20 p-3 text-xs text-neutral-400">
              {pendingPlan.operations.map((operation, index) => (
                <div key={`${operation.type}-${index}`}>• {operation.type}</div>
              ))}
              <div>• {pendingPlan.reversible ? '可通过撤销恢复' : '不可撤销'}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  onRecordCancelled(pendingPlan);
                  setPendingPlan(null);
                }}
                className="rounded-full px-4 py-2 text-xs text-neutral-400 hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={() => execute(pendingPlan)}
                disabled={isExecuting}
                className="flex items-center gap-2 rounded-full bg-amber-200 px-4 py-2 text-xs font-semibold text-amber-950 disabled:opacity-40"
              >
                {isExecuting && <Loader2 size={13} className="animate-spin" />} 确认执行
              </button>
            </div>
          </section>
        )}

        {feedback && (
          <div className={`mt-4 flex gap-2 rounded-xl p-3 text-xs leading-5 ${feedback.success ? 'bg-emerald-300/10 text-emerald-100' : 'bg-red-300/10 text-red-100'}`}>
            {feedback.success ? <CheckCircle2 className="mt-0.5 shrink-0" size={15} /> : <XCircle className="mt-0.5 shrink-0" size={15} />}
            {feedback.message}
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">快捷命令</div>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setMessage(example)}
                className="rounded-full border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">操作记录</div>
          <div className="space-y-2">
            {operationLog.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-neutral-600">暂无AI画布操作</div>}
            {[...operationLog].reverse().slice(0, 20).map((record) => (
              <article key={record.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-medium text-neutral-300">{record.planTitle}</div>
                  <span className={`rounded-full px-2 py-1 text-[10px] ${record.status === 'executed' ? 'bg-emerald-300/10 text-emerald-200' : record.status === 'cancelled' ? 'bg-white/5 text-neutral-500' : 'bg-red-300/10 text-red-200'}`}>
                    {record.status === 'executed' ? '已执行' : record.status === 'cancelled' ? '已取消' : '失败'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-neutral-600">{record.request}</div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-cyan-300/30">
          <Command className="mb-2 ml-1 shrink-0 text-neutral-600" size={17} />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="例如：创建一个创意路线节点"
            rows={2}
            className="min-h-[48px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-700"
          />
          <button
            onClick={submit}
            disabled={!message.trim() || isExecuting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black disabled:opacity-25"
          >
            <CornerDownLeft size={16} />
          </button>
        </div>
      </footer>
    </aside>
  );
};
