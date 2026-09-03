import type { GenerationTaskKind } from './types';

export interface GenerationSkillSource {
  label: string;
  url: string;
  license: 'MIT' | 'Apache-2.0';
}

export interface GenerationSkill {
  id: string;
  version: number;
  label: string;
  description: string;
  kind: Extract<GenerationTaskKind, 'image' | 'video'>;
  referenceImageCount: { min: number; max: number };
  defaultAspectRatio: string;
  defaultDuration?: number;
  promptTemplate: string[];
  sources: GenerationSkillSource[];
}

export interface GenerationSkillContext {
  title?: string;
  prompt?: string;
  fields?: Record<string, string>;
  brandRules?: Record<string, string>;
}

const openAiPromptGuide: GenerationSkillSource = {
  label: 'OpenAI Cookbook · GPT Image prompting guide',
  url: 'https://github.com/openai/openai-cookbook/blob/main/examples/multimodal/image-gen-models-prompting-guide.ipynb',
  license: 'MIT'
};

const googleVeoGuide: GenerationSkillSource = {
  label: 'Google Cloud Generative AI · Veo 3 video generation',
  url: 'https://github.com/GoogleCloudPlatform/generative-ai/blob/main/vision/getting-started/veo3_video_generation.ipynb',
  license: 'Apache-2.0'
};

const comfyWorkflowTemplates: GenerationSkillSource = {
  label: 'Comfy-Org · workflow_templates',
  url: 'https://github.com/Comfy-Org/workflow_templates',
  license: 'MIT'
};

export const generationSkills: GenerationSkill[] = [
  {
    id: 'product-key-visual',
    version: 1,
    label: '产品主视觉',
    description: '生成可用于首页、海报或投放封面的产品英雄图。',
    kind: 'image',
    referenceImageCount: { min: 0, max: 3 },
    defaultAspectRatio: '16:9',
    promptTemplate: [
      'Asset: premium advertising product key visual.',
      'Make the product the single unmistakable focal point.',
      'Describe camera angle, composition, lighting, material response, backdrop and usable negative space.',
      'Preserve supplied product identity, geometry, label and brand marks exactly.',
      'Do not invent extra products, logos, claims, packaging text or watermarks.'
    ],
    sources: [openAiPromptGuide]
  },
  {
    id: 'product-scene-remix',
    version: 1,
    label: '产品换景',
    description: '锁定参考产品，只替换环境、灯光和氛围。',
    kind: 'image',
    referenceImageCount: { min: 1, max: 3 },
    defaultAspectRatio: '4:5',
    promptTemplate: [
      'Task: place the referenced product into a new advertising environment.',
      'Treat the first reference image as the product identity source of truth.',
      'Keep product silhouette, proportions, material, label, logo placement and colors unchanged.',
      'Change only the scene, surface, lighting, reflections and supporting props requested below.',
      'Match contact shadow, perspective and reflected light so the composite looks photographed, not pasted.',
      'Do not add unrequested copy, badges, packaging variants or watermarks.'
    ],
    sources: [openAiPromptGuide, comfyWorkflowTemplates]
  },
  {
    id: 'cinematic-product-shot',
    version: 1,
    label: '电影感产品镜头',
    description: '把产品动作、镜头运动、环境变化和声音拆开描述。',
    kind: 'video',
    referenceImageCount: { min: 0, max: 1 },
    defaultAspectRatio: '16:9',
    defaultDuration: 6,
    promptTemplate: [
      'Create one continuous advertising shot with no cuts.',
      'Subject and action: state exactly what the product does and what must remain stable.',
      'Camera: specify shot size, angle, lens character and one physically plausible movement.',
      'Environment: specify background motion, atmosphere, particles and light changes separately.',
      'Timing: include a clear opening pose, action beat and end hold for editing.',
      'Audio: describe only diegetic ambience and product sound; no narration unless explicitly requested.',
      'Avoid morphing, label drift, duplicate products, sudden cuts, subtitles and watermarks.'
    ],
    sources: [googleVeoGuide]
  },
  {
    id: 'first-last-frame-transition',
    version: 1,
    label: '首尾帧转场',
    description: '使用两张参考图约束镜头起点和终点。',
    kind: 'video',
    referenceImageCount: { min: 2, max: 2 },
    defaultAspectRatio: '16:9',
    defaultDuration: 8,
    promptTemplate: [
      'Generate a single continuous transition from reference frame 1 to reference frame 2.',
      'Preserve the key subject identity and scene geometry at both endpoints.',
      'Describe the intermediate physical action and camera path; do not merely crossfade.',
      'Keep motion direction, lighting evolution and object continuity coherent through the shot.',
      'Finish on a stable hold matching the final reference for editability.',
      'Avoid new objects, identity drift, teleportation, cuts, subtitles and watermarks.'
    ],
    sources: [googleVeoGuide, comfyWorkflowTemplates]
  },
  {
    id: 'vertical-ugc-hook',
    version: 1,
    label: '竖屏 UGC 开场',
    description: '生成前 3 秒有明确动作钩子的手机感竖屏广告镜头。',
    kind: 'video',
    referenceImageCount: { min: 0, max: 1 },
    defaultAspectRatio: '9:16',
    defaultDuration: 6,
    promptTemplate: [
      'Format: authentic vertical mobile advertising shot, one continuous take.',
      'Open with an immediately readable visual action in the first second.',
      'Use natural handheld micro-movement while keeping the product legible.',
      'Keep the setting believable, lighting natural and performance conversational rather than cinematic.',
      'Leave clean visual space for platform captions; do not render caption text into the video.',
      'Avoid beauty-filter artifacts, product deformation, extra fingers, logos not supplied and watermarks.'
    ],
    sources: [googleVeoGuide]
  }
];

export const getGenerationSkillsForKind = (kind: GenerationTaskKind) =>
  generationSkills.filter((skill) => skill.kind === kind);

export const getGenerationSkill = (skillId?: string | null) =>
  generationSkills.find((skill) => skill.id === skillId);

const formatFields = (fields: Record<string, string> = {}) => Object.entries(fields)
  .filter(([, value]) => String(value || '').trim())
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

export const compileGenerationSkillPrompt = (
  skillId: string | null | undefined,
  context: GenerationSkillContext
) => {
  const skill = getGenerationSkill(skillId);
  if (!skill) return context.prompt || '';

  return [
    `Advertising generation skill: ${skill.label} (v${skill.version})`,
    ...skill.promptTemplate,
    context.title ? `Task title: ${context.title}` : '',
    context.prompt ? `Creative direction:\n${context.prompt}` : '',
    formatFields(context.fields) ? `Node details:\n${formatFields(context.fields)}` : '',
    formatFields(context.brandRules) ? `Brand constraints:\n${formatFields(context.brandRules)}` : ''
  ].filter(Boolean).join('\n\n');
};

export const validateGenerationSkillReferences = (skill: GenerationSkill, referenceCount: number) => ({
  valid: referenceCount >= skill.referenceImageCount.min && referenceCount <= skill.referenceImageCount.max,
  message: referenceCount < skill.referenceImageCount.min
    ? `至少需要 ${skill.referenceImageCount.min} 张上游参考图`
    : referenceCount > skill.referenceImageCount.max
      ? `最多使用 ${skill.referenceImageCount.max} 张参考图`
      : ''
});
