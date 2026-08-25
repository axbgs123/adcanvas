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
  missingItems: '缺失项'
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
    <section className="overflow-hidden rounded-2xl bg-[#101114] text-neutral-100">
      <header
        className="border-b border-white/10 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${definition.accent}22, transparent)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {definition.purpose}
            </div>
            <h3 className="text-base font-semibold text-white">{definition.label}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-400">{definition.description}</p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium"
            style={{ color: definition.accent, borderColor: `${definition.accent}66` }}
          >
            {lifecycleLabels[advertising.isStale ? 'stale' : advertising.lifecycle]}
          </span>
        </div>
      </header>

      {(advertising.isStale || advertising.hasBrandConflict) && (
        <div className="space-y-2 border-b border-white/10 px-4 py-3">
          {advertising.isStale && (
            <div className="flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={14} />
              <span>{advertising.staleReason || '上游采用版本已变化，请确认是否更新此节点。'}</span>
            </div>
          )}
          {advertising.hasBrandConflict && (
            <div className="flex gap-2 rounded-lg border border-red-400/20 bg-red-400/10 p-2 text-xs text-red-200">
              <ShieldCheck className="mt-0.5 shrink-0" size={14} />
              <span>{advertising.brandConflictMessage || '当前内容与品牌硬性规则存在冲突。'}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 p-4">
        {(Object.entries(advertising.fields) as Array<[string, string]>).map(([key, value]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-500">
              {fieldLabels[key] || key}
            </span>
            <textarea
              value={value}
              rows={value.length > 70 ? 3 : 1}
              placeholder="点击输入，或让 AI 协助补全"
              onChange={(event) => updateField(key, event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-neutral-200 outline-none transition focus:border-white/30 focus:bg-black/30"
            />
          </label>
        ))}
      </div>

      <footer className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-[11px] text-neutral-500">
          <button
            type="button"
            aria-label={`版本记录：${definition.label}`}
            onClick={() => setIsVersionsOpen((current) => !current)}
            onPointerDown={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 hover:text-white"
          >
            <GitBranch size={13} />
            {advertising.versions.length} 个版本
          </button>
          <span className="flex items-center gap-1.5">
            {advertising.brandInheritance === 'inherit' ? (
              <ShieldCheck size={13} className="text-emerald-400" />
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-200"
        >
          <Sparkles size={14} /> 交给AI
        </button>
        <button
          type="button"
          onClick={toggleAdvanced}
          onPointerDown={(event) => event.stopPropagation()}
          className={`mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
            selected
              ? 'border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10'
              : 'border-white/5 text-neutral-600'
          }`}
        >
          <span>高级设置与模型参数</span>
          {advertising.advancedSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {advertising.advancedSettingsOpen && (
          <div className="mt-2 space-y-3 rounded-lg border border-dashed border-white/10 p-3 text-xs leading-5 text-neutral-500">
            <div>生成策略：AI 推荐模型 · 当前不自动调用付费任务</div>
            {data.type !== NodeType.BRAND_PROFILE && (
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-500">品牌规则</span>
                <select
                  value={advertising.brandInheritance}
                  onChange={(event) => setBrandInheritance(event.target.value as 'inherit' | 'extend' | 'override')}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="w-full rounded-lg border border-white/10 bg-[#17191e] px-3 py-2 text-xs text-neutral-300 outline-none"
                >
                  <option value="inherit">继承项目品牌规范</option>
                  <option value="extend">继承并增加局部参考</option>
                  <option value="override">覆盖项目品牌规范（需确认）</option>
                </select>
              </label>
            )}
            {isBrandOverrideConfirmOpen && (
              <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs leading-5 text-red-100">
                <div className="font-medium">确认覆盖项目品牌规范？</div>
                <div className="mt-1 text-red-200/70">当前节点将不再接受禁止词和必选内容检查，操作会保存在画布中。</div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBrandOverrideConfirmOpen(false)}
                    className="rounded-full px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-white/5"
                  >
                    取消覆盖
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyBrandInheritance('override');
                      setIsBrandOverrideConfirmOpen(false);
                    }}
                    className="rounded-full bg-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-950"
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
