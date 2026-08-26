import assert from 'node:assert/strict';
import test from 'node:test';
import { planCanvasCommand } from '../src/domain/assistant/canvasCommandPlanner.ts';
import { layoutCanvasNodes } from '../src/domain/assistant/layout.ts';

test('plans low-risk manual node creation', () => {
    const plan = planCanvasCommand('创建一个创意路线节点', { nodeCount: 3, selectedNodeCount: 0 });
    assert.equal(plan.risk, 'low');
    assert.equal(plan.requiresConfirmation, false);
    assert.deepEqual(plan.operations[0], {
        type: 'add-node',
        nodeType: 'Creative Route',
        label: '创意路线'
    });
});

test('requires confirmation before destructive operations', () => {
    const deletePlan = planCanvasCommand('删除选中节点', { nodeCount: 10, selectedNodeCount: 2 });
    assert.equal(deletePlan.risk, 'high');
    assert.equal(deletePlan.operations[0].count, 2);

    const clearPlan = planCanvasCommand('清空整个画布', { nodeCount: 10, selectedNodeCount: 2 });
    assert.equal(clearPlan.operations[0].type, 'clear-canvas');
    assert.equal(clearPlan.operations[0].count, 10);
});

test('requires confirmation when a generated workflow would replace existing nodes', () => {
    const emptyPlan = planCanvasCommand('创建完整广告工作流', { nodeCount: 0, selectedNodeCount: 0 });
    const replacePlan = planCanvasCommand('创建完整广告工作流', { nodeCount: 5, selectedNodeCount: 0 });
    assert.equal(emptyPlan.requiresConfirmation, false);
    assert.equal(replacePlan.requiresConfirmation, true);
});

test('lays out nodes by dependency depth', () => {
    const nodes = [
        { id: 'shot', parentIds: ['script'], x: 9, y: 9 },
        { id: 'brief', parentIds: [], x: 8, y: 8 },
        { id: 'script', parentIds: ['brief'], x: 7, y: 7 },
        { id: 'route', parentIds: ['brief'], x: 6, y: 6 }
    ];
    const result = layoutCanvasNodes(nodes);
    const byId = Object.fromEntries(result.map((node) => [node.id, node]));
    assert.equal(byId.brief.x, 80);
    assert.equal(byId.script.x, 520);
    assert.equal(byId.route.x, 520);
    assert.equal(byId.shot.x, 960);
    assert.notEqual(byId.script.y, byId.route.y);
});
