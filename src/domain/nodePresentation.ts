import type { NodeType } from '../types';

/**
 * NodeType values are persisted identifiers and therefore remain in English.
 * All creator-facing names must go through this Chinese presentation map.
 */
export const nodeTypeLabels: Record<NodeType, string> = {
  Text: '文本',
  Image: '图片生成',
  Video: '视频生成',
  Audio: '音频',
  'Image Editor': '图片编辑',
  'Video Editor': '视频编辑',
  'Storyboard Manager': '分镜管理',
  'Camera Angle': '镜头角度',
  'Local Image Model': '本地图片模型',
  'Local Video Model': '本地视频模型',
  'Advertising Brief': '广告需求',
  'Brand Profile': '品牌资产',
  'Creative Route': '创意路线',
  Moodboard: '情绪板',
  'Advertising Script': '广告脚本',
  'Advertising Storyboard': '广告分镜',
  'Advertising Shot': '镜头',
  'Edit Plan': '剪辑计划',
  'AI Quality Audit': 'AI 质检',
  'Production Delivery': '制作交付'
};

export const getNodeTypeLabel = (type: NodeType): string => nodeTypeLabels[type] || type;

export const getNodeDisplayTitle = (type: NodeType, title?: string): string => {
  const legacyDefaultTitles: Partial<Record<NodeType, string[]>> = {
    'Advertising Brief': ['广告 Brief']
  };
  if (!title || title === type || legacyDefaultTitles[type]?.includes(title)) {
    return getNodeTypeLabel(type);
  }
  return title;
};
