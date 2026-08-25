import React, { useEffect, useState } from 'react';
import CanvasApp from '../App';
import { ProjectWorkbench } from '../features/projects/ProjectWorkbench';
import { DemoProject, loadDemoProjects, loadLocalCanvas, saveDemoProjects, saveLocalCanvas } from '../features/projects/projectStore';
import {
  createProject as createProjectRemote,
  emptyProjectCanvas,
  listProjects,
  loadProjectCanvas,
  ProjectCanvasDocument,
  saveProjectCanvas
} from '../features/projects/projectApi';
import { getBudget, listTasks } from '../features/tasks/taskApi';
import { importProjectPackage } from '../features/export/exportApi';

const deduplicateProjects = (items: DemoProject[]) => Array.from(
  new Map(items.map((project) => [project.sourceKey || `${project.name}::${project.brand}`, project])).values()
);

export const ProductShell: React.FC = () => {
  const [projects, setProjects] = useState<DemoProject[]>(loadDemoProjects);
  const [activeProject, setActiveProject] = useState<DemoProject | null>(null);
  const [activeCanvas, setActiveCanvas] = useState<ProjectCanvasDocument | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState({ reserved: 0, limit: 200 });
  const [activeTaskCount, setActiveTaskCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const hydrateProjects = async () => {
      try {
        let remoteProjects = await listProjects();
        if (remoteProjects.length === 0) {
          const starter = projects[0];
          remoteProjects = [await createProjectRemote(starter.name, starter.brand, 'starter-demo')];
        }
        if (!cancelled) setProjects(deduplicateProjects(remoteProjects));
      } catch (error) {
        console.info('[AdCanvas] Project API unavailable; using local Demo storage.', error);
      }
    };

    hydrateProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeProject) return;
    Promise.all([getBudget(), listTasks()])
      .then(([budget, tasks]) => {
        setBudgetSummary({ reserved: budget.reserved, limit: budget.limit });
        setActiveTaskCount(tasks.filter((task) => ['queued', 'running'].includes(task.status)).length);
      })
      .catch(() => {
        setBudgetSummary({ reserved: 0, limit: 200 });
        setActiveTaskCount(0);
      });
  }, [activeProject]);

  useEffect(() => {
    saveDemoProjects(projects);
  }, [projects]);

  const createProject = async (name: string, brand: string) => {
    let project: DemoProject;
    try {
      project = await createProjectRemote(name, brand);
    } catch {
      project = {
        id: crypto.randomUUID(),
        name,
        brand,
        status: 'draft',
        updatedAt: new Date().toISOString()
      };
    }
    setProjects((current) => [project, ...current]);
    setActiveCanvas(emptyProjectCanvas(project.name));
    setActiveProject(project);
  };

  const openProject = async (project: DemoProject) => {
    setIsLoadingProject(true);
    try {
      const canvas = await loadProjectCanvas(project.id);
      setActiveCanvas(canvas);
    } catch {
      setActiveCanvas(loadLocalCanvas<ProjectCanvasDocument>(project.id) || emptyProjectCanvas(project.name));
    } finally {
      setActiveProject(project);
      setIsLoadingProject(false);
    }
  };

  const persistCanvas = async (canvas: Omit<ProjectCanvasDocument, 'schemaVersion' | 'updatedAt'>) => {
    if (!activeProject) return;
    try {
      const saved = await saveProjectCanvas(activeProject.id, canvas);
      setActiveCanvas(saved);
    } catch {
      const localDocument: ProjectCanvasDocument = {
        ...canvas,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      };
      saveLocalCanvas(activeProject.id, localDocument);
      setActiveCanvas(localDocument);
    }
  };

  const importProject = async (packageValue: unknown) => {
    const project = await importProjectPackage(packageValue);
    setProjects((current) => [project, ...current]);
    await openProject(project);
  };

  if (activeProject && activeCanvas) {
    return (
      <CanvasApp
        initialCanvasTitle={activeCanvas.title || activeProject.name}
        initialCanvas={activeCanvas}
        projectId={activeProject.id}
        onSaveProjectCanvas={persistCanvas}
        onExitProject={() => {
          setActiveProject(null);
          setActiveCanvas(null);
        }}
      />
    );
  }

  return (
    <ProjectWorkbench
      projects={projects}
      onCreateProject={createProject}
      onOpenProject={openProject}
      isLoadingProject={isLoadingProject}
      budgetReserved={budgetSummary.reserved}
      budgetLimit={budgetSummary.limit}
      activeTaskCount={activeTaskCount}
      onImportProject={importProject}
    />
  );
};
