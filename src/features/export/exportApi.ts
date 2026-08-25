import { apiDownload, apiRequest } from '../../services/apiClient';
import type { DemoProject } from '../projects/projectStore';

export type ProjectExportType = 'editable' | 'handoff';

export const downloadProjectPackage = (projectId: string, type: ProjectExportType) =>
  apiDownload(`/api/exports/projects/${projectId}?type=${type}`);

export const importProjectPackage = (packageValue: unknown) => apiRequest<DemoProject>('/api/exports/import', {
  method: 'POST',
  body: JSON.stringify(packageValue)
});
