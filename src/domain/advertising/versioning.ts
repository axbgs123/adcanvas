import type { NodeData } from '../../types';
import type { AdvertisingNodeVersion } from './types';

const cloneFields = (fields: Record<string, string>) => ({ ...fields });

export const hasUnsavedAdvertisingChanges = (node: NodeData): boolean => {
  const advertising = node.advertising;
  if (!advertising) return false;
  const active = advertising.versions.find((version) => version.id === advertising.activeVersionId);
  if (!active) return true;
  return JSON.stringify(active.fields) !== JSON.stringify(advertising.fields);
};

export const saveAdvertisingNodeVersion = (
  node: NodeData,
  createdBy: 'user' | 'ai' = 'user'
): NodeData => {
  if (!node.advertising) return node;
  const versionNumber = node.advertising.versions.length + 1;
  const version: AdvertisingNodeVersion = {
    id: crypto.randomUUID(),
    label: `版本 ${versionNumber}`,
    createdAt: new Date().toISOString(),
    createdBy,
    fields: cloneFields(node.advertising.fields)
  };

  return {
    ...node,
    advertising: {
      ...node.advertising,
      versions: [...node.advertising.versions, version],
      activeVersionId: version.id,
      isStale: false,
      staleReason: undefined,
      lifecycle: 'needs-review'
    }
  };
};

export const adoptAdvertisingNodeVersion = (node: NodeData, versionId: string): NodeData => {
  if (!node.advertising) return node;
  const version = node.advertising.versions.find((candidate) => candidate.id === versionId);
  if (!version) return node;

  return {
    ...node,
    advertising: {
      ...node.advertising,
      activeVersionId: version.id,
      fields: cloneFields(version.fields),
      isStale: false,
      staleReason: undefined,
      lifecycle: 'approved'
    }
  };
};

export const markAdvertisingDescendantsStale = (
  nodes: NodeData[],
  sourceNodeId: string,
  reason: string
): NodeData[] => {
  const descendantIds = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    nodes.forEach((node) => {
      if (node.id === sourceNodeId || descendantIds.has(node.id)) return;
      const dependsOnSource = (node.parentIds || []).some(
        (parentId) => parentId === sourceNodeId || descendantIds.has(parentId)
      );
      if (dependsOnSource) {
        descendantIds.add(node.id);
        changed = true;
      }
    });
  }

  return nodes.map((node) => {
    if (!descendantIds.has(node.id) || !node.advertising) return node;
    return {
      ...node,
      advertising: {
        ...node.advertising,
        isStale: true,
        staleReason: reason,
        lifecycle: 'stale'
      }
    };
  });
};

export const createAdvertisingBranchNode = (source: NodeData): NodeData => {
  const branchVersionId = crypto.randomUUID();
  const fields = cloneFields(source.advertising?.fields || {});
  return {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title || source.type} · 新分支`,
    x: source.x + 90,
    y: source.y + 390,
    groupId: undefined,
    resultUrl: undefined,
    errorMessage: undefined,
    advertising: source.advertising ? {
      ...source.advertising,
      fields,
      versions: [{
        id: branchVersionId,
        label: '分支起点',
        createdAt: new Date().toISOString(),
        createdBy: 'user',
        fields: cloneFields(fields)
      }],
      activeVersionId: branchVersionId,
      isStale: false,
      staleReason: undefined,
      lifecycle: 'draft'
    } : undefined
  };
};
