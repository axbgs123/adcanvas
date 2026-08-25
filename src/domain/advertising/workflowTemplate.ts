import { NodeData, NodeStatus, NodeType } from '../../types';
import type { AdvertisingWorkflowInput } from './types';
import { createAdvertisingNodeData, getAdvertisingNodeDefinition } from './nodeRegistry';

const createNode = (
  type: NodeType,
  id: string,
  x: number,
  y: number,
  parentIds: string[],
  prompt = ''
): NodeData => ({
  id,
  type,
  title: getAdvertisingNodeDefinition(type)?.label,
  x,
  y,
  prompt,
  status: NodeStatus.IDLE,
  model: 'auto',
  aspectRatio: 'Auto',
  resolution: 'Auto',
  parentIds,
  advertising: createAdvertisingNodeData(type)
});

export const createAdvertisingWorkflowTemplate = ({
  projectId,
  projectTitle,
  briefSummary = ''
}: AdvertisingWorkflowInput): NodeData[] => {
  const prefix = `ad-${projectId}`;
  const briefId = `${prefix}-brief`;
  const brandId = `${prefix}-brand`;
  const nodes: NodeData[] = [
    createNode(NodeType.BRAND_PROFILE, brandId, 40, 60, []),
    createNode(NodeType.AD_BRIEF, briefId, 40, 520, [brandId], briefSummary)
  ];

  const branchTypes = [
    NodeType.CREATIVE_ROUTE,
    NodeType.MOODBOARD,
    NodeType.AD_SCRIPT,
    NodeType.AD_STORYBOARD,
    NodeType.AD_SHOT
  ];
  const terminalShotIds: string[] = [];

  for (let branchIndex = 0; branchIndex < 3; branchIndex += 1) {
    let parentId = briefId;
    branchTypes.forEach((type, stageIndex) => {
      const id = `${prefix}-route-${branchIndex + 1}-${stageIndex + 1}`;
      nodes.push(
        createNode(
          type,
          id,
          520 + stageIndex * 430,
          80 + branchIndex * 460,
          [parentId],
          type === NodeType.CREATIVE_ROUTE ? `${projectTitle} · 创意路线 ${branchIndex + 1}` : ''
        )
      );
      parentId = id;
    });
    terminalShotIds.push(parentId);
  }

  const editPlanId = `${prefix}-edit-plan`;
  nodes.push(createNode(NodeType.EDIT_PLAN, editPlanId, 2670, 520, terminalShotIds));
  nodes.push(createNode(NodeType.DELIVERY, `${prefix}-delivery`, 3100, 520, [editPlanId]));

  return nodes;
};
