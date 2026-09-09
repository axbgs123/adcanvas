import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { NodeData, NodeType } from '../../types';
import {
  GenerationCostEstimate,
  GenerationQualityPreset,
  GenerationTask,
  ProviderRecommendation,
  getGenerationKindForNode
} from '../../domain/generation/types';
import {
  compileGenerationSkillPrompt,
  getGenerationSkill,
  getGenerationSkillsForKind,
  validateGenerationSkillReferences
} from '../../domain/generation/skillRegistry';
import { createTask, estimateTask, getProviderRecommendation } from './taskApi';
import { buildQualityAuditSnapshot } from '../../domain/advertising/qualityAudit';

interface GenerationConfirmationDialogProps {
  projectId: string;
  node: NodeData | null;
  nodes: NodeData[];
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
  nodes,
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
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const kind = node ? getGenerationKindForNode(node.type) : 'text';
  const availableSkills = useMemo(() => getGenerationSkillsForKind(kind), [kind]);
  const selectedSkill = getGenerationSkill(selectedSkillId);
  const referenceImages = useMemo(() => {
    if (!node) return [];
    const parentAssets = (node.parentIds || [])
      .map((parentId) => nodes.find((candidate) => candidate.id === parentId))
      .map((parent) => parent?.resultUrl || parent?.advertising?.fields.generatedAsset)
      .filter((value): value is string => Boolean(value));
    const ownInput = node.inputUrl ? [node.inputUrl] : [];
    return [...new Set([...parentAssets, ...ownInput])];
  }, [node, nodes]);
  const brandRules = useMemo(
    () => nodes.find((candidate) => candidate.type === 'Brand Profile')?.advertising?.fields || {},
    [nodes]
  );
  const isQualityAudit = node?.type === NodeType.QUALITY_AUDIT;
  const referenceValidation = selectedSkill
    ? validateGenerationSkillReferences(selectedSkill, Math.min(referenceImages.length, selectedSkill.referenceImageCount.max))
    : { valid: true, message: '' };

  useEffect(() => {
    if (!node) return;
    let cancelled = false;
    setEstimate(null);
    setRecommendation(null);
    setConfirmed(false);
    setError(null);
    const firstSkill = getGenerationSkillsForKind(kind)[0];
    setSelectedSkillId(firstSkill?.id || '');
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
          prompt: compileGenerationSkillPrompt(selectedSkillId, {
            title: node.title,
            prompt: isQualityAudit
              ? `${node.prompt || ''}\nReturn JSON only with: overallScore, verdict, brandScore, productScore, copyScore, platformScore, issues[], recommendations[]. Score each dimension from 0 to 100. Evaluate only the supplied project evidence; identify missing evidence instead of inventing facts.`
              : node.prompt,
            fields: node.advertising?.fields || {},
            brandRules
          }),
          fields: node.advertising?.fields || {},
          brandRules,
          ...(isQualityAudit ? { auditSnapshot: buildQualityAuditSnapshot(nodes, node) } : {}),
          skillId: selectedSkill?.id || null,
          skillVersion: selectedSkill?.version || null,
          referenceImages: selectedSkill
            ? referenceImages.slice(0, selectedSkill.referenceImageCount.max)
            : referenceImages,
          aspectRatio: selectedSkill?.defaultAspectRatio || node.aspectRatio || '16:9',
          duration: selectedSkill?.defaultDuration || node.videoDuration || 6
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#111111]/25 p-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d9d9d9] bg-white p-6 text-[#111111] shadow-[0_28px_80px_rgba(17,17,17,0.2)]">
        <div className="studio-proof-strip -mx-6 -mt-6 mb-6 h-1.5" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="studio-utility text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111111]">生成计划</div>
            <h2 className="studio-display mt-2 text-2xl font-semibold">确认AI任务</h2>
            <p className="mt-2 text-sm text-[#666666]">{node.title || node.type} · {kindLabels[kind]}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-[#666666] hover:bg-[#f4f4f4] hover:text-[#111111]">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setQualityPreset(option.value)}
              className={`rounded-lg border p-3 text-left transition ${qualityPreset === option.value ? 'border-[#777777] bg-[#efefef]' : 'border-[#d9d9d9] bg-[#fafafa] hover:bg-white'}`}
            >
              <div className="flex items-center justify-between text-sm font-medium">
                {option.label}
                {qualityPreset === option.value && <Check size={14} className="text-[#777777]" />}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-[#666666]">{option.description}</div>
            </button>
          ))}
        </div>

        {availableSkills.length > 0 && (
          <div className="mt-5 rounded-xl border border-[#d9d9d9] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">广告生成 Skill</div>
                <div className="mt-1 text-[10px] text-[#777777]">结构化 Prompt、素材约束与模型参数</div>
              </div>
              <span className="studio-utility text-[10px] text-[#777777]">{referenceImages.length} 张上游素材</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {availableSkills.map((skill) => {
                const validation = validateGenerationSkillReferences(
                  skill,
                  Math.min(referenceImages.length, skill.referenceImageCount.max)
                );
                return (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={`rounded-lg border p-3 text-left transition ${selectedSkillId === skill.id ? 'border-[#111111] bg-[#eeeeee]' : 'border-[#d9d9d9] bg-[#fafafa] hover:bg-white'}`}
                  >
                    <span className="block text-xs font-semibold">{skill.label}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-[#666666]">{skill.description}</span>
                    {!validation.valid && <span className="mt-2 block text-[9px] font-medium text-[#333333]">{validation.message}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-[#d9d9d9] bg-[#fafafa] p-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => recommendation?.available && setExecutionMode('provider')}
              disabled={!recommendation?.available}
              className={`rounded-lg border p-3 text-left text-xs transition ${executionMode === 'provider' ? 'border-[#c8c8c8] bg-[#eeeeee]' : 'border-[#d9d9d9] bg-white'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className="block font-medium text-[#444444]">真实模型</span>
              <span className="mt-1 block text-[10px] text-[#666666]">
                {recommendation?.available ? '调用已配置Provider' : '当前没有可用密钥'}
              </span>
            </button>
            <button
              onClick={() => setExecutionMode('simulation')}
              className={`rounded-lg border p-3 text-left text-xs transition ${executionMode === 'simulation' ? 'border-[#d0d0d0] bg-[#f1f1f1]' : 'border-[#d9d9d9] bg-white'}`}
            >
              <span className="block font-medium text-[#444444]">模拟执行</span>
              <span className="mt-1 block text-[10px] text-[#666666]">验证状态与费用流程</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#666666]">推荐模型</span>
            <span>{recommendation?.model || '未配置'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-[#666666]">预计费用</span>
            <span className="studio-utility text-lg font-semibold text-[#777777]">
              {estimate ? `¥${estimate.estimatedCost.toFixed(2)}` : '计算中…'}
            </span>
          </div>
          <div className={`mt-3 flex gap-2 rounded-lg border p-2 text-xs leading-5 ${executionMode === 'simulation' ? 'border-[#d0d0d0] bg-[#f1f1f1] text-[#555555]' : 'border-[#c8c8c8] bg-[#eeeeee] text-[#444444]'}`}>
            <AlertTriangle className="mt-0.5 shrink-0" size={14} />
            {executionMode === 'simulation'
              ? '当前任务使用明确标注的模拟执行器，不会调用付费模型。'
              : `任务将调用 ${recommendation?.provider}/${recommendation?.model}，产生的实际账单以供应商为准。`}
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#d9d9d9] bg-[#fafafa] p-3 text-sm text-[#555555]">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#111111]"
          />
          <span>我已确认任务类型、生成档位和预计费用。</span>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-3 text-sm text-[#333333]">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-5 py-2.5 text-sm text-[#666666] hover:bg-[#f4f4f4]">取消</button>
          <button
            onClick={submit}
            disabled={!confirmed || !estimate || isSubmitting || !referenceValidation.valid}
            className="flex items-center gap-2 rounded-md bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#777777] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
};
