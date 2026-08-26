import type { NodeData } from '../../types';

export const layoutCanvasNodes = (nodes: NodeData[]): NodeData[] => {
  const depthById = new Map<string, number>();
  const resolveDepth = (node: NodeData, visiting = new Set<string>()): number => {
    if (depthById.has(node.id)) return depthById.get(node.id)!;
    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);
    const parentDepths = (node.parentIds || [])
      .map((parentId) => nodes.find((candidate) => candidate.id === parentId))
      .filter((parent): parent is NodeData => Boolean(parent))
      .map((parent) => resolveDepth(parent, visiting));
    const depth = parentDepths.length > 0 ? Math.max(...parentDepths) + 1 : 0;
    depthById.set(node.id, depth);
    visiting.delete(node.id);
    return depth;
  };

  nodes.forEach((node) => resolveDepth(node));
  const rowsByDepth = new Map<number, number>();
  return [...nodes]
    .sort((left, right) => (depthById.get(left.id) || 0) - (depthById.get(right.id) || 0) || left.y - right.y)
    .map((node) => {
      const depth = depthById.get(node.id) || 0;
      const row = rowsByDepth.get(depth) || 0;
      rowsByDepth.set(depth, row + 1);
      return {
        ...node,
        x: 80 + depth * 440,
        y: 80 + row * 430
      };
    });
};
