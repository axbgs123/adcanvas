import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Command, CornerDownLeft, Loader2, MessageCircle, Send, Sparkles, X, XCircle } from 'lucide-react';
import type { NodeData } from '../../types';
import { planCanvasCommand } from '../../domain/assistant/canvasCommandPlanner';
import type { AssistantConversationMessage, CanvasCommandPlan, CanvasOperationRecord } from '../../domain/assistant/types';
import { sendAssistantMessage } from './assistantApi';

interface CanvasAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeData[];
  selectedNodeIds: string[];
  operationLog: CanvasOperationRecord[];
  onExecutePlan: (plan: CanvasCommandPlan) => Promise<{ success: boolean; message: string }>;
  onRecordCancelled: (plan: CanvasCommandPlan) => void;
  conversation: AssistantConversationMessage[];
  onConversationChange: (messages: AssistantConversationMessage[]) => void;
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
  onRecordCancelled,
  conversation,
  onConversationChange
}) => {
  const [activeTab, setActiveTab] = useState<'actions' | 'chat'>('actions');
  const [message, setMessage] = useState('');
  const [pendingPlan, setPendingPlan] = useState<CanvasCommandPlan | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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

  const submitChat = async () => {
    const content = chatMessage.trim();
    if (!content || isChatLoading) return;
    const userMessage: AssistantConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    const nextConversation = [...conversation, userMessage];
    onConversationChange(nextConversation);
    setChatMessage('');
    setIsChatLoading(true);
    setChatError(null);
    try {
      const response = await sendAssistantMessage({
        message: content,
        history: nextConversation.slice(-10),
        context: {
          nodes: nodes.slice(0, 100).map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            lifecycle: node.advertising?.lifecycle,
            isStale: node.advertising?.isStale,
            hasBrandConflict: node.advertising?.hasBrandConflict
          })),
          selectedNodes: nodes
            .filter((node) => selectedNodeIds.includes(node.id))
            .map((node) => ({ id: node.id, type: node.type, title: node.title }))
        }
      });
      onConversationChange([...nextConversation, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.response,
        mode: response.mode,
        createdAt: new Date().toISOString()
      }]);
    } catch (reason) {
      setChatError(reason instanceof Error ? reason.message : '智能体回复失败');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <aside className="fixed right-0 top-0 z-[160] flex h-full w-full flex-col border-l border-[#dce1e7] bg-white text-[#171918] shadow-[-16px_0_50px_rgba(31,42,68,0.1)] sm:w-[420px]">
      <div className="studio-proof-strip h-1.5 w-full shrink-0" />
      <header className="flex items-start justify-between border-b border-[#dce1e7] p-5">
        <div>
          <div className="studio-utility flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2457d6]">
            <Sparkles size={15} /> Canvas assistant
          </div>
          <h2 className="studio-display mt-2 text-xl font-semibold">AI画布助手</h2>
          <p className="mt-1 text-xs leading-5 text-[#667085]">先生成结构化操作计划，再按风险等级执行。</p>
        </div>
        <button onClick={onClose} className="rounded-md p-2 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#171918]"><X size={18} /></button>
      </header>

      <div className="grid grid-cols-2 border-b border-[#dce1e7] bg-[#f7f8fa] p-2">
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-medium transition ${activeTab === 'actions' ? 'bg-[#171918] text-white shadow-sm' : 'text-[#667085] hover:bg-white hover:text-[#2457d6]'}`}
        >
          <Command size={14} /> 画布操作
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-medium transition ${activeTab === 'chat' ? 'bg-[#171918] text-white shadow-sm' : 'text-[#667085] hover:bg-white hover:text-[#2457d6]'}`}
        >
          <MessageCircle size={14} /> 创意对话
        </button>
      </div>

      <div className={activeTab === 'actions' ? 'flex-1 overflow-y-auto p-5' : 'hidden'}>
        <div className="rounded-xl border border-[#bfd0f7] bg-[#eef3ff] p-4 text-xs leading-5 text-[#274b9f]">
          当前使用本地可解释规划器，不依赖模型密钥。创建和整理等低风险操作直接执行；删除、清空和替换画布必须确认。
        </div>

        {pendingPlan && (
          <section className="mt-4 rounded-xl border border-[#f1c66f] bg-[#fff7df] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8a5a00]"><AlertTriangle size={15} /> 高风险操作计划</div>
            <h3 className="mt-2 font-medium">{pendingPlan.title}</h3>
            <p className="mt-1 text-xs leading-5 text-[#667085]">{pendingPlan.summary}</p>
            <div className="studio-utility mt-3 space-y-1 rounded-lg border border-[#ead18d] bg-white/70 p-3 text-[10px] text-[#667085]">
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
                className="rounded-md px-4 py-2 text-xs text-[#667085] hover:bg-white"
              >
                取消
              </button>
              <button
                onClick={() => execute(pendingPlan)}
                disabled={isExecuting}
                className="flex items-center gap-2 rounded-md bg-[#171918] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {isExecuting && <Loader2 size={13} className="animate-spin" />} 确认执行
              </button>
            </div>
          </section>
        )}

        {feedback && (
          <div className={`mt-4 flex gap-2 rounded-lg border p-3 text-xs leading-5 ${feedback.success ? 'border-[#9bd5b0] bg-[#e8f8ed] text-[#176b43]' : 'border-[#f3a7a7] bg-[#fff1f1] text-[#a52626]'}`}>
            {feedback.success ? <CheckCircle2 className="mt-0.5 shrink-0" size={15} /> : <XCircle className="mt-0.5 shrink-0" size={15} />}
            {feedback.message}
          </div>
        )}

        <section className="mt-6">
          <div className="studio-utility mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98a2b3]">快捷命令</div>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setMessage(example)}
                className="rounded-full border border-[#dce1e7] bg-white px-3 py-2 text-xs text-[#667085] hover:border-[#2457d6] hover:text-[#2457d6]"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="studio-utility mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98a2b3]">操作记录</div>
          <div className="space-y-2">
            {operationLog.length === 0 && <div className="rounded-lg border border-dashed border-[#c8d0da] bg-[#fafbfc] p-5 text-center text-xs text-[#98a2b3]">暂无AI画布操作</div>}
            {[...operationLog].reverse().slice(0, 20).map((record) => (
              <article key={record.id} className="rounded-lg border border-[#e5e9ee] bg-[#fafbfc] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-medium text-[#344054]">{record.planTitle}</div>
                  <span className={`rounded-full px-2 py-1 text-[10px] ${record.status === 'executed' ? 'bg-[#e8f8ed] text-[#176b43]' : record.status === 'cancelled' ? 'bg-[#f2f4f7] text-[#667085]' : 'bg-[#fff1f1] text-[#a52626]'}`}>
                    {record.status === 'executed' ? '已执行' : record.status === 'cancelled' ? '已取消' : '失败'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[#98a2b3]">{record.request}</div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {activeTab === 'chat' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-xl border border-[#d8c9ff] bg-[#f5f0ff] p-4 text-xs leading-5 text-[#6240a8]">
            智能体会读取当前节点类型、采用状态、品牌冲突和选中节点。配置模型密钥后使用Gemini；否则使用明确标注的本地回退回答。
          </div>
          <div className="mt-5 space-y-3">
            {conversation.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c8d0da] bg-[#fafbfc] p-6 text-center text-sm text-[#98a2b3]">
                可以问：项目进度怎么样？下一步应该做什么？当前有没有品牌冲突？
              </div>
            )}
            {conversation.map((item) => (
              <article
                key={item.id}
                className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'ml-auto rounded-br-sm bg-[#2457d6] text-white' : 'rounded-bl-sm border border-[#dce1e7] bg-[#f7f8fa] text-[#344054]'}`}
              >
                {item.content}
                {item.role === 'assistant' && item.mode && (
                  <div className={`studio-utility mt-2 text-[9px] ${item.mode === 'provider' ? 'text-[#00875a]' : 'text-[#a05f00]'}`}>
                    {item.mode === 'provider' ? 'Gemini智能体' : '本地回退模式'}
                  </div>
                )}
              </article>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-[#667085]"><Loader2 size={14} className="animate-spin" /> 智能体正在分析画布…</div>
            )}
            {chatError && <div className="rounded-lg border border-[#f3a7a7] bg-[#fff1f1] p-3 text-xs text-[#a52626]">{chatError}</div>}
          </div>
        </div>
      )}

      {activeTab === 'actions' ? (
      <footer className="border-t border-[#dce1e7] bg-[#fafbfc] p-4">
        <div className="flex items-end gap-2 rounded-xl border border-[#dce1e7] bg-white p-2 focus-within:border-[#2457d6]">
          <Command className="mb-2 ml-1 shrink-0 text-[#98a2b3]" size={17} />
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
            className="min-h-[48px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
          />
          <button
            onClick={submit}
            disabled={!message.trim() || isExecuting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#171918] text-white disabled:opacity-25"
          >
            <CornerDownLeft size={16} />
          </button>
        </div>
      </footer>
      ) : (
        <footer className="border-t border-[#dce1e7] bg-[#fafbfc] p-4">
          <div className="flex items-end gap-2 rounded-xl border border-[#dce1e7] bg-white p-2 focus-within:border-[#8a4fff]">
            <MessageCircle className="mb-2 ml-1 shrink-0 text-[#98a2b3]" size={17} />
            <textarea
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitChat();
                }
              }}
              placeholder="结合当前画布提问…"
              rows={2}
              className="min-h-[48px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
            />
            <button
              onClick={submitChat}
              disabled={!chatMessage.trim() || isChatLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#8a4fff] text-white disabled:opacity-25"
            >
              <Send size={16} />
            </button>
          </div>
        </footer>
      )}
    </aside>
  );
};
