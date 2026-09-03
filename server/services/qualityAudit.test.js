import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateQualityAudit } from './qualityAudit.js';

test('scores project evidence and produces actionable quality findings', () => {
    const result = evaluateQualityAudit({
        nodes: [
            { type: 'Brand Profile', fields: { tone: '克制', brandColors: 'black', logoRules: '留白' } },
            { type: 'Advertising Brief', fields: { objective: '转化', audience: '学生', coreMessage: '轻盈' } },
            { type: 'Advertising Script', fields: { opening: '产品特写', development: '使用演示', endFrame: '品牌落版' } },
            { type: 'Advertising Shot', fields: { action: '旋转' }, hasAsset: true },
            { type: 'Edit Plan', fields: { targetDuration: '15s', pacing: '紧凑', transitions: '硬切' } }
        ]
    });

    assert.ok(result.overallScore >= 80);
    assert.equal(result.brandScore, 95);
    assert.ok(Array.isArray(result.recommendations));
});
