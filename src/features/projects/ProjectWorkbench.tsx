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
    <main className="min-h-screen overflow-y-auto bg-[#08090c] text-white">
      <header className="border-b border-white/10 bg-black/20 px-8 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-orange-500 to-fuchsia-600 text-sm font-black text-black">
              AD
            </div>
            <div>
              <div className="font-semibold tracking-wide">AdCanvas</div>
              <div className="text-xs text-neutral-500">AI 广告创意与制作自由画布</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
              邀请测试
            </span>
            <span>demo@student</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-10">
        <section className="mb-10 grid gap-4 md:grid-cols-[1fr_220px_220px]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-7">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              <Sparkles size={15} /> Creative workspace
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight">
              从广告需求开始，在一张画布中发展创意、分镜与 AI 镜头素材。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              AI 先搭建工作流，所有节点仍可由你手动创建、修改、分支和采用版本。
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-200"
            >
              <Plus size={17} /> 新建广告项目
            </button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <WalletCards className="mb-8 text-amber-300" size={24} />
            <div className="text-3xl font-semibold">¥{budgetReserved.toFixed(2)}</div>
            <div className="mt-1 text-xs text-neutral-500">已预留 / ¥{budgetLimit.toFixed(0)} Demo预算</div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-amber-300" style={{ width: `${Math.min(100, (budgetReserved / budgetLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <Clock3 className="mb-8 text-cyan-300" size={24} />
            <div className="text-3xl font-semibold">{activeTaskCount}</div>
            <div className="mt-1 text-xs text-neutral-500">运行中的生成任务</div>
            <div className="mt-5 text-xs text-neutral-600">付费任务执行前必须确认</div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">广告项目</h2>
              <p className="mt-1 text-sm text-neutral-500">继续最近创作，或导入一个可编辑项目包。</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <Search size={15} className="text-neutral-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索项目或品牌"
                  className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-600"
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
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5"
              >
                <FolderUp size={16} /> 导入项目包
              </button>
            </div>
          </div>

          {importError && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{importError}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <button
                key={project.id}
                disabled={isLoadingProject}
                onClick={() => onOpenProject(project)}
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
              >
                <div className="mb-10 flex items-start justify-between gap-4">
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-200">
                    {statusLabel[project.status]}
                  </span>
                  <ArrowRight size={17} className="text-neutral-600 transition group-hover:translate-x-1 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-medium">{project.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{project.brand}</p>
                <p className="mt-5 text-xs text-neutral-600">
                  更新于 {new Date(project.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#15171c] p-6 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">New project</div>
            <h2 className="mt-2 text-2xl font-semibold">创建广告项目</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">创建后进入自由画布，再由你选择是否生成工作流草案。</p>
            <label className="mt-6 block text-xs text-neutral-400">
              项目名称
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：春季品牌概念广告"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-amber-300/40"
              />
            </label>
            <label className="mt-4 block text-xs text-neutral-400">
              品牌名称
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="可稍后补充"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-amber-300/40"
              />
            </label>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setIsCreating(false)} className="rounded-full px-4 py-2 text-sm text-neutral-400 hover:bg-white/5">
                取消
              </button>
              <button
                onClick={submitProject}
                disabled={!name.trim()}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-30"
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
