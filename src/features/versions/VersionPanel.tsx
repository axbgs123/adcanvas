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
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
          <History size={14} /> 版本记录
        </span>
        {hasChanges && <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] text-amber-200">有未保存修改</span>}
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
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${isActive ? 'border-emerald-300/30 bg-emerald-300/10' : 'border-white/5 hover:bg-white/5'}`}
            >
              <span>
                <span className="block text-neutral-200">{version.label}</span>
                <span className="mt-0.5 block text-[10px] text-neutral-600">
                  {version.createdBy === 'ai' ? 'AI' : '用户'} · {new Date(version.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              {isActive && <Check size={14} className="text-emerald-300" />}
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
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={13} /> 保存新版本
        </button>
        <button
          type="button"
          onClick={() => onCreateBranch(node.id)}
          onPointerDown={(event) => event.stopPropagation()}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5"
        >
          <GitBranch size={13} /> 创建分支
        </button>
      </div>
    </div>
  );
};
