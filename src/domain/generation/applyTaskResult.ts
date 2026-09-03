import type { NodeData } from '../../types.ts';
import { applyBrandComplianceToNodes } from '../advertising/brandRules.ts';
import { markAdvertisingDescendantsStale, saveAdvertisingNodeVersion } from '../advertising/versioning.ts';
import type { GenerationTask } from './types.ts';
import { parseQualityAuditResult } from '../advertising/qualityAudit.ts';

export const applyCompletedGenerationTask = (nodes: NodeData[], task: GenerationTask): NodeData[] => {
  if (!task.nodeId || task.status !== 'succeeded') return nodes;
  const source = nodes.find((node) => node.id === task.nodeId);
  if (!source || source.lastAppliedTaskId === task.id) return nodes;

  const resultUrl = typeof task.output?.resultUrl === 'string' ? task.output.resultUrl : undefined;
  const aiOutput = typeof task.output?.content === 'string'
    ? task.output.content
    : typeof task.output?.message === 'string'
      ? task.output.message
      : '';
  let updatedNode: NodeData = {
    ...source,
    status: 'success' as NodeData['status'],
    resultUrl: resultUrl || source.resultUrl,
    lastAppliedTaskId: task.id
  };

  if (source.advertising) {
    const audit = parseQualityAuditResult(task.output);
    updatedNode = {
      ...updatedNode,
      advertising: {
        ...source.advertising,
          fields: {
            ...source.advertising.fields,
            ...(aiOutput ? { aiOutput } : {}),
            ...(resultUrl ? { generatedAsset: resultUrl } : {}),
            ...(audit ? {
              overallScore: String(audit.overallScore),
              verdict: audit.verdict,
              brandScore: String(audit.brandScore),
              productScore: String(audit.productScore),
              copyScore: String(audit.copyScore),
              platformScore: String(audit.platformScore),
              issues: audit.issues.join('\n'),
              recommendations: audit.recommendations.join('\n')
            } : {})
          },
        lifecycle: 'needs-review'
      }
    };
    updatedNode = saveAdvertisingNodeVersion(updatedNode, 'ai');
  }

  const nextNodes = nodes.map((node) => node.id === source.id ? updatedNode : node);
  return applyBrandComplianceToNodes(markAdvertisingDescendantsStale(
    nextNodes,
    source.id,
    `${source.title || source.type}生成了新的AI版本，请确认是否更新下游。`
  ));
};
