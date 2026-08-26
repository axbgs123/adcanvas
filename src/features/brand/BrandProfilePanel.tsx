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
    <aside className="fixed left-20 top-20 z-[130] w-[390px] overflow-hidden rounded-xl border border-[#dce1e7] bg-white text-[#172033] shadow-[0_20px_60px_rgba(31,42,68,0.15)]">
      <div className="h-1.5 bg-[#ff6b3d]" />
      <header className="flex items-start justify-between border-b border-[#dce1e7] p-5">
        <div>
          <div className="studio-utility flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff6b3d]">
            <ShieldCheck size={15} /> Brand context
          </div>
          <h2 className="studio-display mt-2 text-xl font-semibold">项目品牌规范</h2>
          <p className="mt-1 text-xs leading-5 text-[#667085]">默认传递到创意、脚本、分镜和镜头节点。</p>
        </div>
        <button onClick={onClose} className="rounded-md p-2 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#172033]">
          <X size={17} />
        </button>
      </header>

      {!brandNode?.advertising ? (
        <div className="p-8 text-center">
          <Palette className="mx-auto text-[#98a2b3]" size={32} />
          <p className="mt-4 text-sm text-[#475467]">当前画布还没有品牌资产节点。</p>
          <p className="mt-1 text-xs text-[#98a2b3]">生成广告工作流草案，或手动创建“品牌资产”节点。</p>
        </div>
      ) : (
        <div className="max-h-[680px] space-y-4 overflow-y-auto p-5">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#475467]">{field.label}</span>
              <textarea
                value={brandNode.advertising?.fields[field.key] || ''}
                onChange={(event) => updateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={field.key === 'visualSystem' ? 3 : 2}
                className="w-full resize-none rounded-md border border-[#dce1e7] bg-[#fafbfc] px-3 py-2.5 text-xs leading-5 text-[#344054] outline-none placeholder:text-[#98a2b3] focus:border-[#2457d6] focus:bg-white"
              />
            </label>
          ))}
          <div className="rounded-lg border border-[#bfd0f7] bg-[#eef3ff] p-3 text-xs leading-5 text-[#274b9f]">
            当前Demo会检查禁止词和已确认节点缺失的必选内容。视觉颜色、Logo安全区和字体识别将在图片审查阶段扩展。
          </div>
        </div>
      )}
    </aside>
  );
};
