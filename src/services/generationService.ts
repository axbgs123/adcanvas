import type { GenerationQualityPreset, GenerationTask, GenerationTaskKind } from '../domain/generation/types';
import { apiRequest } from './apiClient';

interface BaseGenerationParams {
  projectId: string;
  nodeId: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
}

export interface GenerateImageParams extends BaseGenerationParams {
  imageBase64?: string | string[];
  imageModel?: string;
  klingReferenceMode?: 'subject' | 'face';
  klingFaceIntensity?: number;
  klingSubjectIntensity?: number;
}

export interface GenerateVideoParams extends BaseGenerationParams {
  imageBase64?: string;
  lastFrameBase64?: string;
  duration?: number;
  videoModel?: string;
  motionReferenceUrl?: string;
  generateAudio?: boolean;
}

const inferProvider = (model = '') => {
  if (model.startsWith('gpt-image-')) return 'openai';
  if (model.startsWith('kling-v2-6')) return 'fal';
  if (model.startsWith('kling-')) return 'kling';
  if (model.startsWith('hailuo-')) return 'hailuo';
  return model ? 'google' : 'auto';
};

const inferQuality = (resolution = ''): GenerationQualityPreset =>
  ['4K', '1080p'].includes(resolution) ? 'high' : resolution === '512' ? 'quick' : 'balanced';

const waitForTask = async (taskId: string, timeoutMs = 15 * 60 * 1000): Promise<GenerationTask> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const task = await apiRequest<GenerationTask>(`/api/tasks/${taskId}`);
    if (task.status === 'succeeded') return task;
    if (task.status === 'failed' || task.status === 'cancelled') {
      throw new Error(task.error?.message || `Generation task ${task.status}`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  throw new Error('Generation task timed out');
};

const runGenerationTask = async (
  kind: Extract<GenerationTaskKind, 'image' | 'video'>,
  params: BaseGenerationParams & Record<string, unknown>,
  model?: string
) => {
  const qualityPreset = inferQuality(String(params.resolution || ''));
  const created = await apiRequest<GenerationTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      projectId: params.projectId,
      nodeId: params.nodeId,
      kind,
      qualityPreset,
      confirmed: true,
      idempotencyKey: crypto.randomUUID(),
      mode: 'provider',
      provider: inferProvider(model),
      model: model || 'auto',
      payload: {
        ...params,
        referenceImages: [
          ...(Array.isArray(params.imageBase64) ? params.imageBase64 : params.imageBase64 ? [params.imageBase64] : []),
          ...(typeof params.lastFrameBase64 === 'string' ? [params.lastFrameBase64] : [])
        ]
      }
    })
  });
  const completed = await waitForTask(created.id);
  const resultUrl = completed.output?.resultUrl;
  if (typeof resultUrl !== 'string') throw new Error('Generation task returned no media result');
  return resultUrl;
};

/** All cloud image generation now runs through the persistent task API. */
export const generateImage = (params: GenerateImageParams): Promise<string> =>
  runGenerationTask('image', params as GenerateImageParams & Record<string, unknown>, params.imageModel);

/** All cloud video generation now runs through the same task API and provider executor. */
export const generateVideo = (params: GenerateVideoParams): Promise<string> =>
  runGenerationTask('video', params as GenerateVideoParams & Record<string, unknown>, params.videoModel);
