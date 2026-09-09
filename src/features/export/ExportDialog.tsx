import React, { useState } from 'react';
import { CheckCircle2, Download, FileArchive, PackageCheck, X } from 'lucide-react';
import { downloadProjectPackage, ProjectExportType } from './exportApi';

interface ExportDialogProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
}

const options: Array<{
  value: ProjectExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'editable',
    title: '可编辑项目包',
    description: '包含画布、节点、版本、提示词和生成历史，可重新导入继续编辑。',
    icon: <FileArchive size={20} />
  },
  {
    value: 'handoff',
    title: '制作交付包',
    description: '只保留采用版本、成功素材引用和缺失项，适合交给剪辑与后期人员。',
    icon: <PackageCheck size={20} />
  }
];

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, projectId, onClose }) => {
  const [type, setType] = useState<ProjectExportType>('editable');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const exportPackage = async () => {
    setIsExporting(true);
    setError(null);
    setCompleted(false);
    try {
      const result = await downloadProjectPackage(projectId, type);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCompleted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '项目包导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-[#111111]/25 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white p-6 text-[#111111] shadow-[0_28px_80px_rgba(17,17,17,0.2)]">
        <div className="studio-proof-strip -mx-6 -mt-6 mb-6 h-1.5" />
        <div className="flex items-start justify-between">
          <div>
            <div className="studio-utility text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111111]">项目包</div>
            <h2 className="studio-display mt-2 text-2xl font-semibold">导出广告项目</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-[#666666] hover:bg-[#f4f4f4] hover:text-[#111111]"><X size={18} /></button>
        </div>

        <div className="mt-6 space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setType(option.value);
                setCompleted(false);
              }}
              className={`flex w-full gap-4 rounded-xl border p-4 text-left transition ${type === option.value ? 'border-[#777777] bg-[#efefef]' : 'border-[#d9d9d9] bg-[#fafafa] hover:bg-white'}`}
            >
              <span className={type === option.value ? 'text-[#777777]' : 'text-[#666666]'}>{option.icon}</span>
              <span>
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[#666666]">{option.description}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-[#d0d0d0] bg-[#f1f1f1] p-3 text-xs leading-5 text-[#555555]">
          当前格式为可审计的JSON项目包，媒体使用项目素材引用；完整媒体ZIP将在后续增强。
        </div>
        {error && <div className="mt-4 rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-3 text-sm text-[#333333]">{error}</div>}
        {completed && <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-3 text-sm text-[#444444]"><CheckCircle2 size={16} /> 导出完成</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-5 py-2.5 text-sm text-[#666666] hover:bg-[#f4f4f4]">关闭</button>
          <button
            onClick={exportPackage}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-md bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#777777] disabled:opacity-40"
          >
            <Download size={16} /> {isExporting ? '正在导出…' : '下载项目包'}
          </button>
        </div>
      </div>
    </div>
  );
};
