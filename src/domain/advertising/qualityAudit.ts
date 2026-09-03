import type { NodeData, NodeType } from '../../types.ts';

export interface QualityAuditSnapshotNode {
  id: string;
  type: NodeType;
  title: string;
  fields: Record<string, string>;
  hasAsset: boolean;
  isStale: boolean;
  hasBrandConflict: boolean;
}

export interface QualityAuditResult {
  overallScore: number;
  verdict: string;
  brandScore: number;
  productScore: number;
  copyScore: number;
  platformScore: number;
  issues: string[];
  recommendations: string[];
}

export const buildQualityAuditSnapshot = (nodes: NodeData[], auditNode: NodeData) => {
  const included = new Set<string>();
  const pending = [...(auditNode.parentIds || [])];
  while (pending.length > 0) {
    const id = pending.shift();
    if (!id || included.has(id)) continue;
    included.add(id);
    const node = nodes.find((candidate) => candidate.id === id);
    pending.push(...(node?.parentIds || []));
  }
  nodes.filter((node) => node.type === 'Brand Profile').forEach((node) => included.add(node.id));

  return {
    nodes: nodes
      .filter((node) => included.has(node.id))
      .map((node): QualityAuditSnapshotNode => ({
        id: node.id,
        type: node.type,
        title: node.title || node.type,
        fields: node.advertising?.fields || {},
        hasAsset: Boolean(node.resultUrl || node.advertising?.fields.generatedAsset),
        isStale: Boolean(node.advertising?.isStale),
        hasBrandConflict: Boolean(node.advertising?.hasBrandConflict)
      }))
  };
};

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
};

export const parseQualityAuditResult = (output: Record<string, unknown> | null): QualityAuditResult | null => {
  let candidate: unknown = output?.audit;
  if (!candidate && typeof output?.content === 'string') {
    try {
      candidate = JSON.parse(output.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Record<string, unknown>;
  return {
    overallScore: numeric(value.overallScore),
    verdict: String(value.verdict || '需要修改'),
    brandScore: numeric(value.brandScore),
    productScore: numeric(value.productScore),
    copyScore: numeric(value.copyScore),
    platformScore: numeric(value.platformScore),
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
    recommendations: Array.isArray(value.recommendations) ? value.recommendations.map(String) : []
  };
};
