import { NodeType } from '../../types';
import type { AdvertisingNodeData } from './types';

export interface AdvertisingNodeDefinition {
  type: NodeType;
  label: string;
  shortLabel: string;
  description: string;
  purpose: string;
  accent: string;
  defaultFields: Record<string, string>;
}

export const advertisingNodeDefinitions: AdvertisingNodeDefinition[] = [
  {
    type: NodeType.AD_BRIEF,
    label: '广告 Brief',
    shortLabel: 'Brief',
    description: '统一广告目标、受众、核心信息和交付约束',
    purpose: '项目源头',
    accent: '#f59e0b',
    defaultFields: {
      objective: '',
      audience: '',
      coreMessage: '',
      deliverables: '15 秒品牌概念广告'
    }
  },
  {
    type: NodeType.BRAND_PROFILE,
    label: '品牌资产',
    shortLabel: 'Brand',
    description: '集中管理品牌语调、视觉规范和硬性限制',
    purpose: '全局约束',
    accent: '#ef4444',
    defaultFields: {
      tone: '',
      brandColors: '',
      fonts: '',
      logoRules: '',
      visualSystem: '',
      mustInclude: '',
      prohibited: ''
    }
  },
  {
    type: NodeType.CREATIVE_ROUTE,
    label: '创意路线',
    shortLabel: 'Concept',
    description: '表达一条独立的广告概念和视觉隐喻',
    purpose: '方案发散',
    accent: '#8b5cf6',
    defaultFields: {
      concept: '',
      audienceInsight: '',
      visualMetaphor: '',
      emotionalArc: ''
    }
  },
  {
    type: NodeType.MOODBOARD,
    label: '情绪板',
    shortLabel: 'Moodboard',
    description: '定义色彩、材质、灯光、构图和参考方向',
    purpose: '视觉语言',
    accent: '#ec4899',
    defaultFields: {
      palette: '',
      materials: '',
      lighting: '',
      composition: ''
    }
  },
  {
    type: NodeType.AD_SCRIPT,
    label: '广告脚本',
    shortLabel: 'Script',
    description: '组织时间、画面、旁白、声音和品牌落点',
    purpose: '叙事结构',
    accent: '#3b82f6',
    defaultFields: {
      duration: '15s',
      opening: '',
      development: '',
      endFrame: ''
    }
  },
  {
    type: NodeType.AD_STORYBOARD,
    label: '广告分镜',
    shortLabel: 'Storyboard',
    description: '把脚本拆成可执行的镜头序列',
    purpose: '制作规划',
    accent: '#06b6d4',
    defaultFields: {
      shotCount: '4–6',
      aspectRatio: '16:9',
      rhythm: '',
      visualContinuity: ''
    }
  },
  {
    type: NodeType.AD_SHOT,
    label: '镜头',
    shortLabel: 'Shot',
    description: '管理单个镜头目标、构图、动作和采用素材',
    purpose: '素材生产',
    accent: '#10b981',
    defaultFields: {
      shotNumber: '',
      duration: '',
      composition: '',
      action: ''
    }
  },
  {
    type: NodeType.EDIT_PLAN,
    label: '剪辑计划',
    shortLabel: 'Edit',
    description: '先确认镜头顺序、节奏、声音和品牌落版',
    purpose: '草片计划',
    accent: '#6366f1',
    defaultFields: {
      targetDuration: '15s',
      pacing: '',
      music: '',
      transitions: ''
    }
  },
  {
    type: NodeType.DELIVERY,
    label: '制作交付',
    shortLabel: 'Delivery',
    description: '汇总采用素材、规格和后期说明',
    purpose: '项目交接',
    accent: '#14b8a6',
    defaultFields: {
      formats: '16:9, 9:16',
      adoptedAssets: '',
      postNotes: '',
      missingItems: ''
    }
  }
];

const definitionByType = new Map(
  advertisingNodeDefinitions.map((definition) => [definition.type, definition])
);

export const isAdvertisingNodeType = (type: NodeType): boolean => definitionByType.has(type);

export const getAdvertisingNodeDefinition = (
  type: NodeType
): AdvertisingNodeDefinition | undefined => definitionByType.get(type);

export const createAdvertisingNodeData = (type: NodeType): AdvertisingNodeData | undefined => {
  const definition = getAdvertisingNodeDefinition(type);
  if (!definition) return undefined;

  const versionId = crypto.randomUUID();
  const fields = { ...definition.defaultFields };

  return {
    lifecycle: 'draft',
    fields,
    activeVersionId: versionId,
    versions: [
      {
        id: versionId,
        label: '初始版本',
        createdAt: new Date().toISOString(),
        createdBy: 'user',
        fields
      }
    ],
    isStale: false,
    brandInheritance: type === NodeType.BRAND_PROFILE ? 'override' : 'inherit',
    hasBrandConflict: false,
    advancedSettingsOpen: false
  };
};
