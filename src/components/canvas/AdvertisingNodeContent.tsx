import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, GitBranch, ShieldCheck, Sparkles } from 'lucide-react';
import { NodeData, NodeType } from '../../types';
import { getAdvertisingNodeDefinition } from '../../domain/advertising/nodeRegistry';
import { VersionPanel } from '../../features/versions/VersionPanel';

interface AdvertisingNodeContentProps {
  data: NodeData;
  selected: boolean;
  onUpdate?: (nodeId: string, updates: Partial<NodeData>) => void;
  onRequestGeneration?: (nodeId: string) => void;
  onSaveVersion?: (nodeId: string) => void;
  onAdoptVersion?: (nodeId: string, versionId: string) => void;
  onCreateBranch?: (nodeId: string) => void;
}

const fieldLabels: Record<string, string> = {
  objective: '广告目标',
  audience: '目标受众',
  coreMessage: '核心信息',
  deliverables: '交付目标',
  tone: '品牌语调',
  brandColors: '品牌色',
  fonts: '品牌字体',
  logoRules: 'Logo使用规则',
  visualSystem: '视觉规范',
  mustInclude: '必须出现',
  prohibited: '禁止出现',
  concept: '核心概念',
  audienceInsight: '人群洞察',
  visualMetaphor: '视觉隐喻',
  emotionalArc: '情绪曲线',
  palette: '色彩',
  materials: '材质',
  lighting: '灯光',
  composition: '构图',
  duration: '时长',
  opening: '开场',
  development: '发展',
  endFrame: '品牌落版',
  shotCount: '镜头数量',
  aspectRatio: '画幅',
  rhythm: '节奏',
  visualContinuity: '视觉连续性',
  shotNumber: '镜头编号',
  action: '画面动作',
  targetDuration: '目标时长',
  pacing: '剪辑节奏',
  music: '音乐方向',
  transitions: '转场',
  formats: '交付规格',
  adoptedAssets: '采用素材',
  postNotes: '后期说明',
  missingItems: '缺失项',
  aiOutput: 'AI输出',
  generatedAsset: '生成素材'
};

const lifecycleLabels = {
  draft: '草稿',
  ready: '可生成',
  'needs-review': '待确认',
  approved: '已采用',
  stale: '可能已过期'
};

export const AdvertisingNodeContent: React.FC<AdvertisingNodeContentProps> = ({
  data,
  selected,
  onUpdate,
  onRequestGeneration,
  onSaveVersion,
  onAdoptVersion,
  onCreateBranch
}) => {
  const [isVersionsOpen, setIsVersionsOpen] = React.useState(false);
  const [isBrandOverrideConfirmOpen, setIsBrandOverrideConfirmOpen] = React.useState(false);
  const definition = getAdvertisingNodeDefinition(data.type);
  const advertising = data.advertising;

  if (!definition || !advertising) return null;

  const updateField = (key: string, value: string) => {
    onUpdate?.(data.id, {
      advertising: {
        ...advertising,
        fields: {
          ...advertising.fields,
          [key]: value
        }
      }
    });
  };

  const toggleAdvanced = () => {
    onUpdate?.(data.id, {
      advertising: {
        ...advertising,
        advancedSettingsOpen: !advertising.advancedSettingsOpen
      }
    });
  };

  const setBrandInheritance = (mode: 'inherit' | 'extend' | 'override') => {
    if (mode === 'override') {
      setIsBrandOverrideConfirmOpen(true);
      return;
    }
    setIsBrandOverrideConfirmOpen(false);
    applyBrandInheritance(mode);
  };

  const applyBrandInheritance = (mode: 'inherit' | 'extend' | 'override') => {
    onUpdate?.(data.id, {
      advertising: {
        ...advertising,
        brandInheritance: mode,
        hasBrandConflict: mode === 'override' ? false : advertising.hasBrandConflict,
        brandConflictMessage: mode === 'override' ? undefined : advertising.brandConflictMessage
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-xl bg-white text-[#111111]">
      <header
        className="relative border-b border-[#d9d9d9] px-4 py-4"
        style={{ background: `linear-gradient(135deg, ${definition.accent}12, #ffffff 70%)` }}
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: definition.accent }} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="studio-utility mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#666666]">
              {definition.purpose}
            </div>
            <h3 className="studio-display text-lg font-semibold text-[#111111]">{definition.label}</h3>
            <p className="mt-1 text-xs leading-5 text-[#666666]">{definition.description}</p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium"
            style={{ color: definition.accent, borderColor: `${definition.accent}66` }}
          >
            {lifecycleLabels[advertising.isStale ? 'stale' : advertising.lifecycle]}
          </span>
        </div>
      </header>

      {data.resultUrl && (
        <div className="border-b border-[#d9d9d9] bg-[#f4f4f4] p-3">
          {data.resultUrl.toLowerCase().includes('.mp4') ? (
            <video src={data.resultUrl} controls className="aspect-video w-full rounded-xl object-cover" />
          ) : (
            <img src={data.resultUrl} alt="AI生成结果" className="aspect-video w-full rounded-xl object-cover" />
          )}
        </div>
      )}

      {(advertising.isStale || advertising.hasBrandConflict) && (
        <div className="space-y-2 border-b border-[#d9d9d9] px-4 py-3">
          {advertising.isStale && (
            <div className="flex gap-2 rounded-lg border border-[#c9c9c9] bg-[#f1f1f1] p-2 text-xs text-[#555555]">
              <AlertTriangle className="mt-0.5 shrink-0" size={14} />
              <span>{advertising.staleReason || '上游采用版本已变化，请确认是否更新此节点。'}</span>
            </div>
          )}
          {advertising.hasBrandConflict && (
            <div className="flex gap-2 rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-2 text-xs text-[#333333]">
              <ShieldCheck className="mt-0.5 shrink-0" size={14} />
              <span>{advertising.brandConflictMessage || '当前内容与品牌硬性规则存在冲突。'}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 p-4">
        {(Object.entries(advertising.fields) as Array<[string, string]>).map(([key, value]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-[#666666]">
              {fieldLabels[key] || key}
            </span>
            <textarea
              value={value}
              rows={value.length > 70 ? 3 : 1}
              placeholder="点击输入，或让 AI 协助补全"
              onChange={(event) => updateField(key, event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
              className="w-full resize-none rounded-md border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-xs leading-5 text-[#444444] outline-none transition focus:border-[#111111] focus:bg-white"
            />
          </label>
        ))}
      </div>

      <footer className="border-t border-[#d9d9d9] bg-[#fcfcfc] px-4 py-3">
        <div className="studio-utility flex items-center justify-between gap-3 text-[10px] text-[#666666]">
          <button
            type="button"
            aria-label={`版本记录：${definition.label}`}
            onClick={() => setIsVersionsOpen((current) => !current)}
            onPointerDown={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 hover:text-[#111111]"
          >
            <GitBranch size={13} />
            {advertising.versions.length} 个版本
          </button>
          <span className="flex items-center gap-1.5">
            {advertising.brandInheritance === 'inherit' ? (
              <ShieldCheck size={13} className="text-[#333333]" />
            ) : (
              <CheckCircle2 size={13} />
            )}
            {advertising.brandInheritance === 'inherit' ? '继承品牌规则' : '使用局部规则'}
          </span>
        </div>
        {isVersionsOpen && onSaveVersion && onAdoptVersion && onCreateBranch && (
          <VersionPanel
            node={data}
            onSaveVersion={onSaveVersion}
            onAdoptVersion={onAdoptVersion}
            onCreateBranch={onCreateBranch}
          />
        )}
        <button
          type="button"
          aria-label={`交给AI：${definition.label}`}
          onClick={() => onRequestGeneration?.(data.id)}
          onPointerDown={(event) => event.stopPropagation()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#111111] px-3 py-2.5 text-xs font-semibold text-white shadow-[3px_3px_0_#777777] transition hover:bg-[#111111]"
        >
          <Sparkles size={14} /> 交给AI
        </button>
        <button
          type="button"
          onClick={toggleAdvanced}
          onPointerDown={(event) => event.stopPropagation()}
          className={`mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
            selected
              ? 'border-[#c7c7c7] bg-[#f1f1f1] text-[#111111] hover:bg-[#e8e8e8]'
              : 'border-[#d9d9d9] bg-white text-[#666666] hover:bg-[#f4f4f4]'
          }`}
        >
          <span>高级设置与模型参数</span>
          {advertising.advancedSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {advertising.advancedSettingsOpen && (
          <div className="mt-2 space-y-3 rounded-lg border border-dashed border-[#c8c8c8] bg-white p-3 text-xs leading-5 text-[#666666]">
            <div>生成策略：AI 推荐模型 · 当前不自动调用付费任务</div>
            {data.type !== NodeType.BRAND_PROFILE && (
              <label className="block">
                <span className="mb-1 block text-[11px] text-[#666666]">品牌规则</span>
                <select
                  value={advertising.brandInheritance}
                  onChange={(event) => setBrandInheritance(event.target.value as 'inherit' | 'extend' | 'override')}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-xs text-[#444444] outline-none"
                >
                  <option value="inherit">继承项目品牌规范</option>
                  <option value="extend">继承并增加局部参考</option>
                  <option value="override">覆盖项目品牌规范（需确认）</option>
                </select>
              </label>
            )}
            {isBrandOverrideConfirmOpen && (
              <div className="rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-3 text-xs leading-5 text-[#333333]">
                <div className="font-medium">确认覆盖项目品牌规范？</div>
                <div className="mt-1 text-[#666666]">当前节点将不再接受禁止词和必选内容检查，操作会保存在画布中。</div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBrandOverrideConfirmOpen(false)}
                    className="rounded-md px-3 py-1.5 text-[11px] text-[#666666] hover:bg-white"
                  >
                    取消覆盖
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyBrandInheritance('override');
                      setIsBrandOverrideConfirmOpen(false);
                    }}
                    className="rounded-md bg-[#333333] px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    确认局部覆盖
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </footer>
    </section>
  );
};
