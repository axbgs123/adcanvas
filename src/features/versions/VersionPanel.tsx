import React from 'react';
import { Check, GitBranch, History, Plus } from 'lucide-react';
import type { NodeData } from '../../types';
import { hasUnsavedAdvertisingChanges } from '../../domain/advertising/versioning';

interface VersionPanelProps {
  node: NodeData;
  onSaveVersion: (nodeId: string) => void;
  onAdoptVersion: (nodeId: string, versionId: string) => void;
  onCreateBranch: (nodeId: string) => void;
}

export const VersionPanel: React.FC<VersionPanelProps> = ({
  node,
  onSaveVersion,
  onAdoptVersion,
  onCreateBranch
}) => {
  const advertising = node.advertising;
  if (!advertising) return null;

  const hasChanges = hasUnsavedAdvertisingChanges(node);

  return (
    <div className="mt-3 rounded-lg border border-[#dce1e7] bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#344054]">
          <History size={14} /> 版本记录
        </span>
        {hasChanges && <span className="rounded-full bg-[#fff7df] px-2 py-1 text-[10px] text-[#8a5a00]">有未保存修改</span>}
      </div>

      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
        {[...advertising.versions].reverse().map((version) => {
          const isActive = version.id === advertising.activeVersionId;
          return (
            <button
              key={version.id}
              type="button"
              aria-label={`采用版本：${version.label}`}
              onClick={() => onAdoptVersion(node.id, version.id)}
              onPointerDown={(event) => event.stopPropagation()}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition ${isActive ? 'border-[#9bd5b0] bg-[#e8f8ed]' : 'border-[#e5e9ee] hover:bg-[#f2f4ef]'}`}
            >
              <span>
                <span className="block text-[#344054]">{version.label}</span>
                <span className="studio-utility mt-0.5 block text-[9px] text-[#98a2b3]">
                  {version.createdBy === 'ai' ? 'AI' : '用户'} · {new Date(version.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              {isActive && <Check size={14} className="text-[#00875a]" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSaveVersion(node.id)}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={!hasChanges && !advertising.isStale}
          className="flex items-center justify-center gap-1.5 rounded-md border border-[#dce1e7] px-3 py-2 text-xs text-[#475467] hover:border-[#2457d6] hover:text-[#2457d6] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={13} /> 保存新版本
        </button>
        <button
          type="button"
          onClick={() => onCreateBranch(node.id)}
          onPointerDown={(event) => event.stopPropagation()}
          className="flex items-center justify-center gap-1.5 rounded-md border border-[#dce1e7] px-3 py-2 text-xs text-[#475467] hover:border-[#2457d6] hover:text-[#2457d6]"
        >
          <GitBranch size={13} /> 创建分支
        </button>
      </div>
    </div>
  );
};
