import type { NodeData } from '../../types';

export interface BrandProfileSnapshot {
  id: string;
  tone: string;
  brandColors: string[];
  fonts: string[];
  logoRules: string;
  mustInclude: string[];
  prohibited: string[];
  visualSystem: string;
}

export interface BrandComplianceResult {
  hasConflict: boolean;
  hardConflicts: string[];
  warnings: string[];
}

const parseList = (value = '') => value
  .split(/[\n,，、;；]+/)
  .map((item) => item.trim())
  .filter(Boolean);

export const getBrandProfileFromNode = (brandNode?: NodeData): BrandProfileSnapshot | null => {
  if (!brandNode?.advertising) return null;
  const fields = brandNode.advertising.fields;
  return {
    id: brandNode.id,
    tone: fields.tone || '',
    brandColors: parseList(fields.brandColors),
    fonts: parseList(fields.fonts),
    logoRules: fields.logoRules || '',
    mustInclude: parseList(fields.mustInclude),
    prohibited: parseList(fields.prohibited),
    visualSystem: fields.visualSystem || ''
  };
};

export const evaluateBrandCompliance = (
  node: NodeData,
  profile: BrandProfileSnapshot | null
): BrandComplianceResult => {
  if (!node.advertising || !profile || node.id === profile.id || node.advertising.brandInheritance === 'override') {
    return { hasConflict: false, hardConflicts: [], warnings: [] };
  }

  const content = Object.values(node.advertising.fields).join('\n').toLocaleLowerCase();
  const hardConflicts = profile.prohibited
    .filter((term) => content.includes(term.toLocaleLowerCase()))
    .map((term) => `包含品牌禁止内容：“${term}”`);

  const shouldRequireMustInclude = ['ready', 'needs-review', 'approved'].includes(node.advertising.lifecycle);
  if (shouldRequireMustInclude && content.trim()) {
    const missing = profile.mustInclude.filter((term) => !content.includes(term.toLocaleLowerCase()));
    if (missing.length > 0) {
      hardConflicts.push(`缺少品牌必选内容：${missing.join('、')}`);
    }
  }

  const warnings: string[] = [];
  if (profile.tone && content.trim() && node.advertising.brandInheritance === 'inherit') {
    warnings.push(`应遵循品牌语调：${profile.tone}`);
  }

  return {
    hasConflict: hardConflicts.length > 0,
    hardConflicts,
    warnings
  };
};

export const applyBrandComplianceToNodes = (nodes: NodeData[]): NodeData[] => {
  const brandNode = nodes.find((node) => node.type === 'Brand Profile');
  const profile = getBrandProfileFromNode(brandNode);
  if (!profile) return nodes;

  return nodes.map((node) => {
    if (!node.advertising || node.id === profile.id) return node;
    const compliance = evaluateBrandCompliance(node, profile);
    return {
      ...node,
      advertising: {
        ...node.advertising,
        inheritedBrandProfileId: profile.id,
        hasBrandConflict: compliance.hasConflict,
        brandConflictMessage: compliance.hardConflicts.join('；') || undefined
      }
    };
  });
};
