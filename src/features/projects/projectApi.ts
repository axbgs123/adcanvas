import type { NodeData, NodeGroup, Viewport } from '../../types';
import { apiRequest } from '../../services/apiClient';
import type { DemoProject } from './projectStore';
import type { CanvasOperationRecord } from '../../domain/assistant/types';

export interface ProjectCanvasDocument {
  schemaVersion: 1;
  title: string;
  nodes: NodeData[];
  groups: NodeGroup[];
  viewport: Viewport;
  operationLog: CanvasOperationRecord[];
  updatedAt: string | null;
}

export const emptyProjectCanvas = (title: string): ProjectCanvasDocument => ({
  schemaVersion: 1,
  title,
  nodes: [],
  groups: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  operationLog: [],
  updatedAt: null
});

export const listProjects = () => apiRequest<DemoProject[]>('/api/projects');

export const createProject = (name: string, brand: string, sourceKey?: string) => apiRequest<DemoProject>('/api/projects', {
  method: 'POST',
  body: JSON.stringify({ name, brand, sourceKey })
});

export const loadProjectCanvas = (projectId: string) => apiRequest<ProjectCanvasDocument>(`/api/projects/${projectId}/canvas`);

export const saveProjectCanvas = (
  projectId: string,
  canvas: Omit<ProjectCanvasDocument, 'schemaVersion' | 'updatedAt'>
) => apiRequest<ProjectCanvasDocument>(`/api/projects/${projectId}/canvas`, {
  method: 'PUT',
  body: JSON.stringify(canvas)
});
