import React from 'react';
import { Palette, ShieldCheck, X } from 'lucide-react';
import type { NodeData } from '../../types';

interface BrandProfilePanelProps {
  isOpen: boolean;
  brandNode?: NodeData;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<NodeData>) => void;
}

const fields = [
  { key: 'tone', label: '品牌语调', placeholder: '例如：克制、温暖、具有诗意，避免促销口吻' },
  { key: 'brandColors', label: '品牌色', placeholder: '例如：琥珀金 #D99A45、深棕 #2C140B' },
  { key: 'fonts', label: '品牌字体', placeholder: '例如：思源宋体、Helvetica Neue' },
  { key: 'logoRules', label: 'Logo使用规则', placeholder: '例如：结尾至少展示2秒，四周保留安全区' },
  { key: 'visualSystem', label: '视觉规范', placeholder: '材质、灯光、构图和摄影风格' },
  { key: 'mustInclude', label: '必须出现', placeholder: '每行或逗号分隔，例如：品牌名、产品瓶' },
  { key: 'prohibited', label: '禁止出现', placeholder: '每行或逗号分隔，例如：低价、促销、折扣' }
] as const;

export const BrandProfilePanel: React.FC<BrandProfilePanelProps> = ({
  isOpen,
  brandNode,
  onClose,
  onUpdate
}) => {
  if (!isOpen) return null;

  const updateField = (key: string, value: string) => {
    if (!brandNode?.advertising) return;
    onUpdate(brandNode.id, {
      advertising: {
        ...brandNode.advertising,
        fields: {
          ...brandNode.advertising.fields,
          [key]: value
        }
      }
    });
  };

  return (
    <aside className="fixed left-20 top-20 z-[130] w-[390px] overflow-hidden rounded-2xl border border-white/10 bg-[#121419]/95 text-white shadow-2xl backdrop-blur-xl">
      <header className="flex items-start justify-between border-b border-white/10 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            <ShieldCheck size={15} /> Brand context
          </div>
          <h2 className="mt-2 text-xl font-semibold">项目品牌规范</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">默认传递到创意、脚本、分镜和镜头节点。</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-white/5 hover:text-white">
          <X size={17} />
        </button>
      </header>

      {!brandNode?.advertising ? (
        <div className="p-8 text-center">
          <Palette className="mx-auto text-neutral-700" size={32} />
          <p className="mt-4 text-sm text-neutral-400">当前画布还没有品牌资产节点。</p>
          <p className="mt-1 text-xs text-neutral-600">生成广告工作流草案，或手动创建“品牌资产”节点。</p>
        </div>
      ) : (
        <div className="max-h-[680px] space-y-4 overflow-y-auto p-5">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">{field.label}</span>
              <textarea
                value={brandNode.advertising?.fields[field.key] || ''}
                onChange={(event) => updateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={field.key === 'visualSystem' ? 3 : 2}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs leading-5 outline-none placeholder:text-neutral-700 focus:border-amber-300/30"
              />
            </label>
          ))}
          <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">
            当前Demo会检查禁止词和已确认节点缺失的必选内容。视觉颜色、Logo安全区和字体识别将在图片审查阶段扩展。
          </div>
        </div>
      )}
    </aside>
  );
};
