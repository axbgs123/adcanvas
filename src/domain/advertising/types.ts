export type AdvertisingLifecycle =
  | 'draft'
  | 'ready'
  | 'needs-review'
  | 'approved'
  | 'stale';

export type BrandInheritanceMode = 'inherit' | 'extend' | 'override';

export interface AdvertisingNodeVersion {
  id: string;
  label: string;
  createdAt: string;
  createdBy: 'user' | 'ai';
  fields: Record<string, string>;
}

export interface AdvertisingNodeData {
  lifecycle: AdvertisingLifecycle;
  fields: Record<string, string>;
  activeVersionId: string;
  versions: AdvertisingNodeVersion[];
  isStale: boolean;
  staleReason?: string;
  brandInheritance: BrandInheritanceMode;
  inheritedBrandProfileId?: string;
  hasBrandConflict: boolean;
  brandConflictMessage?: string;
  advancedSettingsOpen: boolean;
}

export interface AdvertisingWorkflowInput {
  projectId: string;
  projectTitle: string;
  briefSummary?: string;
}
