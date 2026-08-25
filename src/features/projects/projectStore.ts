export interface DemoProject {
  id: string;
  name: string;
  brand: string;
  status: 'draft' | 'generating' | 'needs-review';
  updatedAt: string;
  sourceKey?: string | null;
}

const STORAGE_KEY = 'adcanvas.demo.projects';
const CANVAS_STORAGE_PREFIX = 'adcanvas.demo.canvas.';

const starterProjects: DemoProject[] = [
  {
    id: 'demo-solar-amber',
    name: '日光琥珀品牌概念广告',
    brand: 'ÉLAN（虚构品牌）',
    status: 'draft',
    sourceKey: 'starter-demo',
    updatedAt: new Date().toISOString()
  }
];

export const loadDemoProjects = (): DemoProject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : starterProjects;
  } catch {
    return starterProjects;
  }
};

export const saveDemoProjects = (projects: DemoProject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const loadLocalCanvas = <T>(projectId: string): T | null => {
  try {
    const value = localStorage.getItem(`${CANVAS_STORAGE_PREFIX}${projectId}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const saveLocalCanvas = (projectId: string, canvas: unknown) => {
  localStorage.setItem(`${CANVAS_STORAGE_PREFIX}${projectId}`, JSON.stringify(canvas));
};
