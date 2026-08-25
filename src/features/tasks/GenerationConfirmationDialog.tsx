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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#15171c] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Generation plan</div>
            <h2 className="mt-2 text-2xl font-semibold">确认AI任务</h2>
            <p className="mt-2 text-sm text-neutral-500">{node.title || node.type} · {kindLabels[kind]}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setQualityPreset(option.value)}
              className={`rounded-xl border p-3 text-left transition ${qualityPreset === option.value ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/10 bg-black/15 hover:bg-white/5'}`}
            >
              <div className="flex items-center justify-between text-sm font-medium">
                {option.label}
                {qualityPreset === option.value && <Check size={14} className="text-amber-300" />}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-neutral-500">{option.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => recommendation?.available && setExecutionMode('provider')}
              disabled={!recommendation?.available}
              className={`rounded-xl border p-3 text-left text-xs transition ${executionMode === 'provider' ? 'border-emerald-300/40 bg-emerald-300/10' : 'border-white/10'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className="block font-medium text-neutral-200">真实模型</span>
              <span className="mt-1 block text-[10px] text-neutral-500">
                {recommendation?.available ? '调用已配置Provider' : '当前没有可用密钥'}
              </span>
            </button>
            <button
              onClick={() => setExecutionMode('simulation')}
              className={`rounded-xl border p-3 text-left text-xs transition ${executionMode === 'simulation' ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10'}`}
            >
              <span className="block font-medium text-neutral-200">模拟执行</span>
              <span className="mt-1 block text-[10px] text-neutral-500">验证状态与费用流程</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">推荐模型</span>
            <span>{recommendation?.model || '未配置'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-neutral-400">预计费用</span>
            <span className="text-lg font-semibold text-amber-200">
              {estimate ? `¥${estimate.estimatedCost.toFixed(2)}` : '计算中…'}
            </span>
          </div>
          <div className={`mt-3 flex gap-2 rounded-lg p-2 text-xs leading-5 ${executionMode === 'simulation' ? 'bg-cyan-400/10 text-cyan-200' : 'bg-emerald-400/10 text-emerald-200'}`}>
            <AlertTriangle className="mt-0.5 shrink-0" size={14} />
            {executionMode === 'simulation'
              ? '当前任务使用明确标注的模拟执行器，不会调用付费模型。'
              : `任务将调用 ${recommendation?.provider}/${recommendation?.model}，产生的实际账单以供应商为准。`}
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-300"
          />
          <span>我已确认任务类型、生成档位和预计费用。</span>
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-5 py-2.5 text-sm text-neutral-400 hover:bg-white/5">取消</button>
          <button
            onClick={submit}
            disabled={!confirmed || !estimate || isSubmitting}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
};
