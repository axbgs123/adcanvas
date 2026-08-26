import assert from 'node:assert/strict';
import test from 'node:test';
import { answerAdvertisingQuestion } from './advertisingAssistant.js';

const context = {
    nodes: [
        { type: 'Advertising Brief', title: 'Brief', isStale: false, hasBrandConflict: false },
        { type: 'Creative Route', title: 'Route A', isStale: true, hasBrandConflict: false },
        { type: 'Advertising Shot', title: 'Shot 1', isStale: false, hasBrandConflict: true }
    ],
    selectedNodes: [{ type: 'Advertising Shot', title: 'Shot 1' }]
};

test('summarizes canvas progress without a model key', async () => {
    const result = await answerAdvertisingQuestion({ message: '项目进度怎么样', context });
    assert.equal(result.mode, 'local-fallback');
    assert.match(result.response, /3个节点/);
    assert.match(result.response, /1个节点可能已过期/);
    assert.match(result.response, /1个节点存在品牌冲突/);
});

test('prioritizes brand conflicts in next-step guidance', async () => {
    const result = await answerAdvertisingQuestion({ message: '下一步应该做什么', context });
    assert.match(result.response, /先处理1个品牌冲突/);
});

test('describes the currently selected node', async () => {
    const result = await answerAdvertisingQuestion({ message: '分析当前选中节点', context });
    assert.match(result.response, /Shot 1/);
});
