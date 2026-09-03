import { GoogleGenAI } from '@google/genai';

const summarizeContext = (context = {}) => {
    const nodes = Array.isArray(context.nodes) ? context.nodes : [];
    const typeCounts = nodes.reduce((result, node) => {
        result[node.type] = (result[node.type] || 0) + 1;
        return result;
    }, {});
    return {
        nodeCount: nodes.length,
        typeCounts,
        staleCount: nodes.filter((node) => node.isStale).length,
        brandConflictCount: nodes.filter((node) => node.hasBrandConflict).length,
        selectedNodes: Array.isArray(context.selectedNodes) ? context.selectedNodes : []
    };
};

const localFallbackResponse = (message, context) => {
    const summary = summarizeContext(context);
    const normalized = message.toLocaleLowerCase();
    const typeSummary = Object.entries(summary.typeCounts)
        .map(([type, count]) => `${type} ${count}个`)
        .join('、') || '暂无节点';

    if (/(进度|概况|有哪些|现在).*(节点|内容|完成)|项目进度/.test(normalized)) {
        return `当前画布共${summary.nodeCount}个节点：${typeSummary}。其中${summary.staleCount}个节点可能已过期，${summary.brandConflictCount}个节点存在品牌冲突。`;
    }
    if (/(下一步|接下来|应该做什么|怎么推进)/.test(normalized)) {
        if (summary.brandConflictCount > 0) return `建议先处理${summary.brandConflictCount}个品牌冲突，再继续生成素材，避免把错误规范传递到下游。`;
        if (summary.staleCount > 0) return `建议先检查${summary.staleCount}个过期节点，确认是否基于最新上游版本更新。`;
        if (!summary.typeCounts['Advertising Brief']) return '建议先创建广告Brief，明确目标、受众、核心信息和交付规格。';
        if (!summary.typeCounts['Creative Route']) return 'Brief已经存在，下一步建议并行创建至少三条差异明显的创意路线。';
        if (!summary.typeCounts['Advertising Shot']) return '创意结构已经建立，下一步建议完成脚本、分镜并拆出4到6个镜头。';
        return '核心制作链路已经建立，下一步建议确认采用版本，再从镜头节点创建图片或视频任务。';
    }
    if (/(品牌|规范|冲突)/.test(normalized)) {
        return summary.brandConflictCount > 0
            ? `当前有${summary.brandConflictCount}个节点违反品牌硬性规则。请打开“品牌规范”，检查禁止内容和必须出现项。`
            : '当前未检测到品牌硬性冲突。仍建议在正式生成前确认Logo、品牌色、字体和禁用表达。';
    }
    if (/(选中|这个节点|当前节点)/.test(normalized) && summary.selectedNodes.length > 0) {
        return `当前选中：${summary.selectedNodes.map((node) => node.title || node.type).join('、')}。你可以要求我分析下一步，或切换到“画布操作”执行创建分支、整理等命令。`;
    }

    return '当前处于本地对话回退模式。我可以回答“项目进度怎么样”“下一步做什么”“有没有品牌冲突”以及分析当前选中节点；配置GEMINI_API_KEY后会切换到真实创意模型。';
};

const extractText = (result) => (result.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

export const answerAdvertisingQuestion = async ({ message, context, history = [], apiKey }) => {
    if (!apiKey) {
        return { response: localFallbackResponse(message, context), mode: 'local-fallback', model: null };
    }

    const client = new GoogleGenAI({ apiKey });
    const safeContext = {
        ...summarizeContext(context),
        nodes: (context.nodes || []).slice(0, 100),
        selectedNodes: (context.selectedNodes || []).slice(0, 10)
    };
    const safeHistory = history.slice(-10).map((item) => ({ role: item.role, content: String(item.content || '').slice(0, 2000) }));
    const prompt = [
        'You are AdCanvas, a concise senior advertising creative and AI production assistant.',
        'Use the project context to give actionable advice. Never claim an operation was executed; canvas operations happen in a separate tab.',
        `Project context: ${JSON.stringify(safeContext)}`,
        `Recent conversation: ${JSON.stringify(safeHistory)}`,
        `User: ${String(message).slice(0, 4000)}`
    ].join('\n\n');
    const result = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [{ text: prompt }] }
    });
    const response = extractText(result);
    if (!response) throw new Error('Advertising assistant returned no content');
    return { response, mode: 'provider', model: 'gemini-3.5-flash' };
};
