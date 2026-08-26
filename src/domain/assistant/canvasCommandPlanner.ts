import type { CanvasCommandContext, CanvasCommandPlan } from './types';

const nodeKeywords: Array<{ keywords: string[]; nodeType: string; label: string }> = [
  { keywords: ['brief', '需求', '简报'], nodeType: 'Advertising Brief', label: '广告 Brief' },
  { keywords: ['品牌资产', '品牌规范', 'brand'], nodeType: 'Brand Profile', label: '品牌资产' },
  { keywords: ['创意路线', '创意方向', 'concept'], nodeType: 'Creative Route', label: '创意路线' },
  { keywords: ['情绪板', 'moodboard'], nodeType: 'Moodboard', label: '情绪板' },
  { keywords: ['广告脚本', '脚本', 'script'], nodeType: 'Advertising Script', label: '广告脚本' },
  { keywords: ['广告分镜', '分镜', 'storyboard'], nodeType: 'Advertising Storyboard', label: '广告分镜' },
  { keywords: ['镜头', 'shot'], nodeType: 'Advertising Shot', label: '镜头' },
  { keywords: ['剪辑计划', '剪辑', 'edit plan'], nodeType: 'Edit Plan', label: '剪辑计划' },
  { keywords: ['制作交付', '交付', 'delivery'], nodeType: 'Production Delivery', label: '制作交付' }
];

const createPlan = (request: string, values: Omit<CanvasCommandPlan, 'id' | 'request'>): CanvasCommandPlan => ({
  id: crypto.randomUUID(),
  request,
  ...values
});

export const planCanvasCommand = (
  rawRequest: string,
  context: CanvasCommandContext
): CanvasCommandPlan | null => {
  const request = rawRequest.trim();
  const normalized = request.toLocaleLowerCase();
  if (!request) return null;

  if (/(整理|排列|排版|对齐).*(画布|节点)|整理画布/.test(normalized)) {
    return createPlan(request, {
      title: '整理画布节点',
      summary: `按业务依赖重新排列 ${context.nodeCount} 个节点。`,
      risk: 'low',
      requiresConfirmation: false,
      reversible: true,
      operations: [{ type: 'tidy-layout' }]
    });
  }

  if (/(创建|生成|搭建).*(完整|全部).*(工作流|流程)/.test(normalized)) {
    const replaceExisting = context.nodeCount > 0;
    return createPlan(request, {
      title: '创建完整广告工作流',
      summary: replaceExisting ? `将替换当前 ${context.nodeCount} 个节点并创建标准三路线工作流。` : '创建标准三路线广告工作流。',
      risk: replaceExisting ? 'high' : 'low',
      requiresConfirmation: replaceExisting,
      reversible: true,
      operations: [{ type: 'create-workflow', replaceExisting }]
    });
  }

  if (/(创建|复制|新建).*(分支)/.test(normalized)) {
    return createPlan(request, {
      title: '从选中节点创建分支',
      summary: context.selectedNodeCount === 1 ? '复制选中业务节点并保留其上游依赖。' : '需要先且只选择一个业务节点。',
      risk: 'low',
      requiresConfirmation: false,
      reversible: true,
      operations: [{ type: 'branch-selected' }]
    });
  }

  if (/(清空|删除全部|移除全部).*(画布|节点)/.test(normalized)) {
    return createPlan(request, {
      title: '清空画布',
      summary: `将删除画布中的全部 ${context.nodeCount} 个节点。`,
      risk: 'high',
      requiresConfirmation: true,
      reversible: true,
      operations: [{ type: 'clear-canvas', count: context.nodeCount }]
    });
  }

  if (/(删除|移除).*(选中|节点)/.test(normalized)) {
    return createPlan(request, {
      title: '删除选中节点',
      summary: `将删除当前选中的 ${context.selectedNodeCount} 个节点。`,
      risk: 'high',
      requiresConfirmation: true,
      reversible: true,
      operations: [{ type: 'delete-selected', count: context.selectedNodeCount }]
    });
  }

  const wantsCreation = /(创建|新建|添加|加一个|增加)/.test(normalized);
  if (wantsCreation) {
    const match = nodeKeywords.find((candidate) => candidate.keywords.some((keyword) => normalized.includes(keyword)));
    if (match) {
      return createPlan(request, {
        title: `创建${match.label}节点`,
        summary: `在当前视口中心创建一个空白${match.label}节点，内容仍可由用户手动编辑。`,
        risk: 'low',
        requiresConfirmation: false,
        reversible: true,
        operations: [{ type: 'add-node', nodeType: match.nodeType, label: match.label }]
      });
    }
  }

  return null;
};
