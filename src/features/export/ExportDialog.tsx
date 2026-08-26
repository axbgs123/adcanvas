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
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-[#171918]/25 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#dce1e7] bg-white p-6 text-[#171918] shadow-[0_28px_80px_rgba(23,32,51,0.2)]">
        <div className="studio-proof-strip -mx-6 -mt-6 mb-6 h-1.5" />
        <div className="flex items-start justify-between">
          <div>
            <div className="studio-utility text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2457d6]">Project package</div>
            <h2 className="studio-display mt-2 text-2xl font-semibold">导出广告项目</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-[#667085] hover:bg-[#f2f4f7] hover:text-[#171918]"><X size={18} /></button>
        </div>

        <div className="mt-6 space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setType(option.value);
                setCompleted(false);
              }}
              className={`flex w-full gap-4 rounded-xl border p-4 text-left transition ${type === option.value ? 'border-[#c8a33a] bg-[#f8f3e6]' : 'border-[#dce1e7] bg-[#fafbfc] hover:bg-white'}`}
            >
              <span className={type === option.value ? 'text-[#c8a33a]' : 'text-[#667085]'}>{option.icon}</span>
              <span>
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[#667085]">{option.description}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-[#bfd0f7] bg-[#eef3ff] p-3 text-xs leading-5 text-[#274b9f]">
          当前格式为可审计的JSON项目包，媒体使用项目素材引用；完整媒体ZIP将在后续增强。
        </div>
        {error && <div className="mt-4 rounded-lg border border-[#f3a7a7] bg-[#fff1f1] p-3 text-sm text-[#a52626]">{error}</div>}
        {completed && <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#9bd5b0] bg-[#e8f8ed] p-3 text-sm text-[#176b43]"><CheckCircle2 size={16} /> 导出完成</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-5 py-2.5 text-sm text-[#667085] hover:bg-[#f2f4f7]">关闭</button>
          <button
            onClick={exportPackage}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-md bg-[#171918] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#c8a33a] disabled:opacity-40"
          >
            <Download size={16} /> {isExporting ? '正在导出…' : '下载项目包'}
          </button>
        </div>
      </div>
    </div>
  );
};
