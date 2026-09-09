const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

const hasAny = (node, keys) => keys.some((key) => String(node?.fields?.[key] || '').trim());

export const evaluateQualityAudit = (snapshot = {}) => {
    const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const byType = (type) => nodes.filter((node) => node.type === type);
    const issues = [];
    const recommendations = [];

    const brand = byType('Brand Profile')[0];
    const conflicts = nodes.filter((node) => node.hasBrandConflict).length;
    const stale = nodes.filter((node) => node.isStale).length;
    let brandScore = brand ? 78 : 35;
    if (brand && hasAny(brand, ['tone', 'brandColors', 'logoRules', 'mustInclude', 'prohibited'])) brandScore += 17;
    brandScore -= conflicts * 25;
    if (!brand) issues.push('缺少品牌资产节点，无法验证品牌一致性。');
    if (conflicts) issues.push(`${conflicts} 个节点存在品牌规则冲突。`);

    const productionNodes = nodes.filter((node) => ['Moodboard', 'Advertising Storyboard', 'Advertising Shot'].includes(node.type));
    const assetCount = productionNodes.filter((node) => node.hasAsset).length;
    let productScore = productionNodes.length ? 45 + (assetCount / productionNodes.length) * 50 : 25;
    if (!assetCount) issues.push('没有可供检查的生成素材。');

    const brief = byType('Advertising Brief')[0];
    const script = byType('Advertising Script')[0];
    let copyScore = 30;
    if (brief && hasAny(brief, ['objective', 'audience', 'coreMessage'])) copyScore += 30;
    if (script && hasAny(script, ['opening', 'development', 'endFrame'])) copyScore += 35;
    if (!brief || !hasAny(brief, ['coreMessage'])) issues.push('广告需求缺少明确的核心信息。');
    if (!script) issues.push('缺少广告脚本，无法验证文案和品牌落版。');

    const editPlan = byType('Edit Plan')[0];
    let platformScore = editPlan ? 68 : 35;
    if (editPlan && hasAny(editPlan, ['targetDuration', 'pacing', 'transitions'])) platformScore += 22;
    if (!editPlan) issues.push('缺少剪辑计划和交付规格。');
    if (stale) {
        platformScore -= stale * 8;
        issues.push(`${stale} 个上游节点已过期。`);
    }

    brandScore = clamp(brandScore);
    productScore = clamp(productScore);
    copyScore = clamp(copyScore);
    platformScore = clamp(platformScore);
    const overallScore = clamp((brandScore + productScore + copyScore + platformScore) / 4);

    if (brandScore < 80) recommendations.push('补全品牌语调、品牌色、Logo 规则和必选/禁用内容。');
    if (productScore < 80) recommendations.push('为关键情绪板、分镜或镜头补充采用素材，再执行一致性检查。');
    if (copyScore < 80) recommendations.push('明确核心信息，并补全开场、发展和品牌落版文案。');
    if (platformScore < 80) recommendations.push('确认时长、画幅、节奏、转场及不同投放平台的交付规格。');
    if (!recommendations.length) recommendations.push('关键证据完整，可以进入人工终审与交付。');

    return {
        overallScore,
        verdict: overallScore >= 85 ? '建议通过' : overallScore >= 65 ? '修改后复检' : '暂不通过',
        brandScore,
        productScore,
        copyScore,
        platformScore,
        issues,
        recommendations
    };
};
