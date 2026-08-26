import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3, FolderUp, Plus, Search, Sparkles, WalletCards } from 'lucide-react';
import type { DemoProject } from './projectStore';

interface ProjectWorkbenchProps {
  projects: DemoProject[];
  onCreateProject: (name: string, brand: string) => void | Promise<void>;
  onOpenProject: (project: DemoProject) => void | Promise<void>;
  isLoadingProject?: boolean;
  budgetReserved?: number;
  budgetLimit?: number;
  activeTaskCount?: number;
  onImportProject: (packageValue: unknown) => void | Promise<void>;
}

const statusLabel = {
  draft: '创意草稿',
  generating: '正在生成',
  'needs-review': '等待确认'
};

export const ProjectWorkbench: React.FC<ProjectWorkbenchProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  isLoadingProject = false,
  budgetReserved = 0,
  budgetLimit = 200,
  activeTaskCount = 0,
  onImportProject
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [query, setQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) => `${project.name} ${project.brand}`.toLowerCase().includes(normalized));
  }, [projects, query]);

  const submitProject = () => {
    if (!name.trim()) return;
    onCreateProject(name.trim(), brand.trim() || '未命名品牌');
    setName('');
    setBrand('');
    setIsCreating(false);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const value = JSON.parse(await file.text());
      await onImportProject(value);
      setImportError(null);
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : '项目包导入失败');
    }
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f3f3f3] text-[#111111]">
      <div className="studio-proof-strip h-1.5 w-full" />
      <header className="border-b border-[#d9d9d9] bg-white px-8 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-sm font-black tracking-tight text-white shadow-[4px_4px_0_#777777]">
              AD
            </div>
            <div>
              <div className="font-semibold tracking-wide text-[#111111]">AdCanvas</div>
              <div className="text-xs text-[#666666]">AI广告创意与制作自由画布</div>
            </div>
          </div>
          <div className="studio-utility flex items-center gap-3 text-xs text-[#666666]">
            <span className="rounded-full border border-[#c8c8c8] bg-[#eeeeee] px-3 py-1.5 text-[#444444]">
              邀请测试
            </span>
            <span>demo@student</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-10">
        <section className="mb-12 grid gap-4 md:grid-cols-[1fr_220px_220px]">
          <div className="relative overflow-hidden bg-transparent p-8 py-12">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#777777]" />
            <div className="studio-utility mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111111]">
              <Sparkles size={15} /> Creative production desk
            </div>
            <h1 className="studio-display max-w-3xl text-5xl leading-[1.16] tracking-[-0.045em] text-[#111111]">
              从广告需求开始，在一张画布中发展创意、分镜与 AI 镜头素材。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#666666]">
              AI 先搭建工作流，所有节点仍可由你手动创建、修改、分支和采用版本。
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-7 flex items-center gap-2 rounded-lg bg-[#111111] px-5 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_#777777] transition hover:-translate-y-0.5 hover:bg-[#111111]"
            >
              <Plus size={17} /> 新建广告项目
            </button>
          </div>
          <div className="rounded-lg border border-[#d0d0d0] bg-[#f1f1f1] p-6">
            <WalletCards className="mb-8 text-[#111111]" size={24} />
            <div className="studio-utility text-3xl font-semibold text-[#111111]">¥{budgetReserved.toFixed(2)}</div>
            <div className="mt-1 text-xs text-[#666666]">已预留 / ¥{budgetLimit.toFixed(0)} Demo预算</div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#dedede]">
              <div className="h-full bg-[#111111]" style={{ width: `${Math.min(100, (budgetReserved / budgetLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-[#c9c9c9] bg-[#efefef] p-6">
            <Clock3 className="mb-8 text-[#777777]" size={24} />
            <div className="studio-utility text-3xl font-semibold text-[#111111]">{activeTaskCount}</div>
            <div className="mt-1 text-xs text-[#666666]">运行中的生成任务</div>
            <div className="mt-5 text-xs text-[#555555]">付费任务执行前必须确认</div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="studio-display text-2xl font-semibold text-[#111111]">广告项目</h2>
              <p className="mt-1 text-sm text-[#666666]">继续最近创作，或导入一个可编辑项目包。</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-4 py-2.5 shadow-sm focus-within:border-[#111111]">
                <Search size={15} className="text-[#666666]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索项目或品牌"
                  className="w-44 bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#999999]"
                />
              </label>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,.adcanvas.json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-4 py-2.5 text-sm text-[#444444] hover:border-[#111111] hover:text-[#111111]"
              >
                <FolderUp size={16} /> 导入项目包
              </button>
            </div>
          </div>

          {importError && (
            <div className="mb-4 rounded-lg border border-[#c8c8c8] bg-[#eeeeee] p-3 text-sm text-[#333333]">{importError}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project, index) => (
              <button
                key={project.id}
                disabled={isLoadingProject}
                onClick={() => onOpenProject(project)}
                className="group rounded-xl border border-[#d9d9d9] border-t-4 bg-white p-5 text-left shadow-[0_8px_24px_rgba(17,17,17,0.06)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(17,17,17,0.12)] disabled:cursor-wait disabled:opacity-60"
                style={{ borderTopColor: ['#777777', '#111111'][index % 2] }}
              >
                <div className="mb-10 flex items-start justify-between gap-4">
                  <span className="studio-utility rounded-full border border-[#c9c9c9] bg-[#f1f1f1] px-2.5 py-1 text-[10px] text-[#555555]">
                    {statusLabel[project.status]}
                  </span>
                  <ArrowRight size={17} className="text-[#999999] transition group-hover:translate-x-1 group-hover:text-[#111111]" />
                </div>
                <h3 className="studio-display text-xl font-semibold text-[#111111]">{project.name}</h3>
                <p className="mt-1 text-sm text-[#666666]">{project.brand}</p>
                <p className="studio-utility mt-5 text-[10px] text-[#999999]">
                  更新于 {new Date(project.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111111]/25 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white p-6 text-[#111111] shadow-[0_28px_80px_rgba(17,17,17,0.2)]">
            <div className="studio-proof-strip -mx-6 -mt-6 mb-6 h-1.5" />
            <div className="studio-utility text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111111]">New project</div>
            <h2 className="studio-display mt-2 text-2xl font-semibold">创建广告项目</h2>
            <p className="mt-2 text-sm leading-6 text-[#666666]">创建后进入自由画布，再由你选择是否生成工作流草案。</p>
            <label className="mt-6 block text-xs text-[#555555]">
              项目名称
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：春季品牌概念广告"
                className="mt-2 w-full rounded-lg border border-[#d9d9d9] bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#111111]"
              />
            </label>
            <label className="mt-4 block text-xs text-[#555555]">
              品牌名称
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="可稍后补充"
                className="mt-2 w-full rounded-lg border border-[#d9d9d9] bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#111111]"
              />
            </label>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setIsCreating(false)} className="rounded-lg px-4 py-2 text-sm text-[#666666] hover:bg-[#f4f4f4]">
                取消
              </button>
              <button
                onClick={submitProject}
                disabled={!name.trim()}
                className="rounded-lg bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#777777] disabled:cursor-not-allowed disabled:opacity-30"
              >
                创建并进入画布
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
