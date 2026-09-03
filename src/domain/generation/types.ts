import { NodeType } from '../../types';

export type GenerationTaskKind = 'text' | 'image' | 'video' | 'rough-cut';
export type GenerationQualityPreset = 'quick' | 'balanced' | 'high';
export type GenerationTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationCostEstimate {
  kind: GenerationTaskKind;
  preset: GenerationQualityPreset;
  currency: 'CNY';
  estimatedCost: number;
  pricingVersion: string;
  disclaimer: string;
}

export interface GenerationTask {
  id: string;
  projectId: string;
  nodeId: string | null;
  kind: GenerationTaskKind;
  qualityPreset: GenerationQualityPreset;
  provider: string;
  model: string;
  mode: 'simulation' | 'provider';
  status: GenerationTaskStatus;
  estimatedCost: number;
  actualCost: number | null;
  currency: 'CNY';
  idempotencyKey: string;
  input?: Record<string, unknown>;
  attempt: number;
  maxAttempts: number;
  output: Record<string, unknown> | null;
  error: { message: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  deduplicated?: boolean;
}

export interface BudgetSummary {
  currency: 'CNY';
  limit: number;
  reserved: number;
  remaining: number;
}

export interface ProviderRecommendation {
  available: boolean;
  provider: string | null;
  model: string | null;
  kind: GenerationTaskKind;
  preset: GenerationQualityPreset;
  reason: string;
}

export const getGenerationKindForNode = (type: NodeType): GenerationTaskKind => {
  if ([NodeType.MOODBOARD, NodeType.AD_STORYBOARD].includes(type)) return 'image';
  if (type === NodeType.AD_SHOT) return 'video';
  if ([NodeType.EDIT_PLAN, NodeType.DELIVERY].includes(type)) return 'rough-cut';
  return 'text';
};
