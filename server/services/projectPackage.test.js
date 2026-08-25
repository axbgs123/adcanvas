import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildEditableProjectPackage,
    buildProductionHandoffPackage,
    validateEditableProjectPackage
} from './projectPackage.js';

const project = { id: 'project-1', name: 'Campaign', brand: 'Brand' };
const canvas = {
    title: 'Campaign Canvas',
    nodes: [
        {
            id: 'brief',
            type: 'Advertising Brief',
            parentIds: [],
            advertising: {
                lifecycle: 'approved',
                fields: { objective: 'Awareness' },
                activeVersionId: 'v1',
                versions: [{ id: 'v1', label: 'Version 1', fields: { objective: 'Awareness' } }],
                brandInheritance: 'inherit',
                hasBrandConflict: false
            }
        },
        {
            id: 'shot',
            type: 'Advertising Shot',
            parentIds: ['brief'],
            advertising: {
                lifecycle: 'stale',
                fields: { action: 'Product reveal' },
                activeVersionId: 'shot-v1',
                versions: [{ id: 'shot-v1', label: 'Version 1', fields: { action: 'Product reveal' } }],
                brandInheritance: 'inherit',
                hasBrandConflict: false
            }
        }
    ],
    groups: [],
    viewport: { x: 0, y: 0, zoom: 1 }
};

test('builds and validates a round-trippable editable package', () => {
    const value = buildEditableProjectPackage({ project, canvas, tasks: [] });
    assert.equal(value.packageType, 'adcanvas-editable');
    assert.equal(validateEditableProjectPackage(value), value);
    assert.notEqual(value.canvas, canvas);
});

test('rejects packages with broken parent references', () => {
    const value = buildEditableProjectPackage({ project, canvas, tasks: [] });
    value.canvas.nodes[1].parentIds = ['missing'];
    assert.throws(() => validateEditableProjectPackage(value), /missing parent/);
});

test('handoff contains adopted versions, successful assets, and missing-item warnings', () => {
    const value = buildProductionHandoffPackage({
        project,
        canvas,
        tasks: [
            {
                id: 'task-1',
                nodeId: 'shot',
                kind: 'video',
                provider: 'google',
                model: 'veo',
                status: 'succeeded',
                output: { resultUrl: '/library/videos/shot.mp4', assetId: 'asset-1' }
            },
            {
                id: 'task-2',
                nodeId: 'shot',
                kind: 'video',
                provider: 'google',
                model: 'veo',
                status: 'failed',
                output: null
            }
        ]
    });
    assert.equal(value.production.adoptedNodes.length, 2);
    assert.equal(value.production.assets.length, 1);
    assert.equal(value.production.missingItems[0].nodeId, 'shot');
});
