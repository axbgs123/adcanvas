import { apiRequest } from '../../services/apiClient';
import type {
  BudgetSummary,
  GenerationCostEstimate,
  GenerationQualityPreset,
  GenerationTask,
  GenerationTaskKind,
  ProviderRecommendation
} from '../../domain/generation/types';

export const estimateTask = (kind: GenerationTaskKind, qualityPreset: GenerationQualityPreset) =>
  apiRequest<GenerationCostEstimate>('/api/tasks/estimate', {
    method: 'POST',
    body: JSON.stringify({ kind, qualityPreset })
  });

export const createTask = (input: {
  projectId: string;
  nodeId: string;
  kind: GenerationTaskKind;
  qualityPreset: GenerationQualityPreset;
  confirmed: boolean;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  mode: 'simulation' | 'provider';
  provider: string;
  model: string;
}) => apiRequest<GenerationTask>('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    ...input,
    provider: input.provider,
    model: input.model,
    mode: input.mode
  })
});

export const listTasks = (projectId?: string) => {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiRequest<GenerationTask[]>(`/api/tasks${query}`);
};

export const getBudget = () => apiRequest<BudgetSummary>('/api/tasks/budget');

export const getProviderRecommendation = (kind: GenerationTaskKind, qualityPreset: GenerationQualityPreset) =>
  apiRequest<ProviderRecommendation>(
    `/api/providers/recommend?kind=${encodeURIComponent(kind)}&qualityPreset=${encodeURIComponent(qualityPreset)}`
  );

export const cancelTask = (taskId: string) => apiRequest<GenerationTask>(`/api/tasks/${taskId}/cancel`, {
  method: 'POST',
  body: '{}'
});

export const retryTask = (taskId: string) => apiRequest<GenerationTask>(`/api/tasks/${taskId}/retry`, {
  method: 'POST',
  body: '{}'
});
