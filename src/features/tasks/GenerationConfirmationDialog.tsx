import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { NodeData } from '../../types';
import {
  GenerationCostEstimate,
  GenerationQualityPreset,
  GenerationTask,
  ProviderRecommendation,
  getGenerationKindForNode
} from '../../domain/generation/types';
import { createTask, estimateTask, getProviderRecommendation } from './taskApi';

interface GenerationConfirmationDialogProps {
  projectId: string;
  node: NodeData | null;
  onClose: () => void;
  onCreated: (task: GenerationTask) => void;
}

const qualityOptions: Array<{ value: GenerationQualityPreset; label: string; description: string }> = [
  { value: 'quick', label: '快速', description: '低成本验证构图和方向' },
  { value: 'balanced', label: '均衡', description: '质量、速度与成本平衡' },
  { value: 'high', label: '高质量', description: '用于最终候选素材' }
];

const kindLabels = {
  text: '文本创意任务',
  image: '图片生成任务',
  video: '视频生成任务',
  'rough-cut': '广告草片任务'
};

export const GenerationConfirmationDialog: React.FC<GenerationConfirmationDialogProps> = ({
  projectId,
  node,
  onClose,
  onCreated
}) => {
  const [qualityPreset, setQualityPreset] = useState<GenerationQualityPreset>('balanced');
  const [estimate, setEstimate] = useState<GenerationCostEstimate | null>(null);
  const [recommendation, setRecommendation] = useState<ProviderRecommendation | null>(null);
  const [executionMode, setExecutionMode] = useState<'simulation' | 'provider'>('simulation');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const kind = node ? getGenerationKindForNode(node.type) : 'text';

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    setEstimate(null);
    setRecommendation(null);
    setConfirmed(false);
    setError(null);
    idempotencyKeyRef.current = crypto.randomUUID();

    Promise.all([
      estimateTask(kind, qualityPreset),
      getProviderRecommendation(kind, qualityPreset)
    ])
      .then(([nextEstimate, nextRecommendation]) => {
        if (!cancelled) {
          setEstimate(nextEstimate);
          setRecommendation(nextRecommendation);
          setExecutionMode(nextRecommendation.available ? 'provider' : 'simulation');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason.message || '费用估算失败');
      });

    return () => {
      cancelled = true;
    };
  }, [node?.id, kind, qualityPreset]);

  if (!node) return null;

  const submit = async () => {
    if (!confirmed || !estimate || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const task = await createTask({
        projectId,
        nodeId: node.id,
        kind,
        qualityPreset,
        confirmed,
        idempotencyKey: idempotencyKeyRef.current,
        payload: {
          nodeType: node.type,
          title: node.title,
          prompt: node.prompt,
          fields: node.advertising?.fields || {}
        },
        mode: executionMode,
        provider: recommendation?.provider || 'auto',
        model: recommendation?.model || 'auto'
      });
      onCreated(task);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '任务创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#171918]/25 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#dce1e7] bg-white p-6 text-[#171918] shadow-[0_28px_80px_rgba(23,32,51,0.2)]">
        <div className="studio-proof-strip -mx-6 -mt-6 mb-6 h-1.5" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="studio-utility text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2457d6]">Generation plan</div>
            <h2 className="studio-display mt-2 text-2xl font-semibold">确认AI任务</h2>
            <p className="mt-2 text-sm text-[#667085]">{node.title || node.type} · {kindLabels[kind]}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#171918]">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setQualityPreset(option.value)}
              className={`rounded-lg border p-3 text-left transition ${qualityPreset === option.value ? 'border-[#c8a33a] bg-[#f8f3e6]' : 'border-[#dce1e7] bg-[#fafbfc] hover:bg-white'}`}
            >
              <div className="flex items-center justify-between text-sm font-medium">
                {option.label}
                {qualityPreset === option.value && <Check size={14} className="text-[#c8a33a]" />}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-[#667085]">{option.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[#dce1e7] bg-[#fafbfc] p-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => recommendation?.available && setExecutionMode('provider')}
              disabled={!recommendation?.available}
              className={`rounded-lg border p-3 text-left text-xs transition ${executionMode === 'provider' ? 'border-[#9bd5b0] bg-[#e8f8ed]' : 'border-[#dce1e7] bg-white'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className="block font-medium text-[#344054]">真实模型</span>
              <span className="mt-1 block text-[10px] text-[#667085]">
                {recommendation?.available ? '调用已配置Provider' : '当前没有可用密钥'}
              </span>
            </button>
            <button
              onClick={() => setExecutionMode('simulation')}
              className={`rounded-lg border p-3 text-left text-xs transition ${executionMode === 'simulation' ? 'border-[#bfd0f7] bg-[#eef3ff]' : 'border-[#dce1e7] bg-white'}`}
            >
              <span className="block font-medium text-[#344054]">模拟执行</span>
              <span className="mt-1 block text-[10px] text-[#667085]">验证状态与费用流程</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#667085]">推荐模型</span>
            <span>{recommendation?.model || '未配置'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-[#667085]">预计费用</span>
            <span className="studio-utility text-lg font-semibold text-[#c8a33a]">
              {estimate ? `¥${estimate.estimatedCost.toFixed(2)}` : '计算中…'}
            </span>
          </div>
          <div className={`mt-3 flex gap-2 rounded-lg border p-2 text-xs leading-5 ${executionMode === 'simulation' ? 'border-[#bfd0f7] bg-[#eef3ff] text-[#274b9f]' : 'border-[#9bd5b0] bg-[#e8f8ed] text-[#176b43]'}`}>
            <AlertTriangle className="mt-0.5 shrink-0" size={14} />
            {executionMode === 'simulation'
              ? '当前任务使用明确标注的模拟执行器，不会调用付费模型。'
              : `任务将调用 ${recommendation?.provider}/${recommendation?.model}，产生的实际账单以供应商为准。`}
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#dce1e7] bg-[#fafbfc] p-3 text-sm text-[#475467]">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#2457d6]"
          />
          <span>我已确认任务类型、生成档位和预计费用。</span>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-[#f3a7a7] bg-[#fff1f1] p-3 text-sm text-[#a52626]">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-5 py-2.5 text-sm text-[#667085] hover:bg-[#f2f4f7]">取消</button>
          <button
            onClick={submit}
            disabled={!confirmed || !estimate || isSubmitting}
            className="flex items-center gap-2 rounded-md bg-[#171918] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#c8a33a] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
};
