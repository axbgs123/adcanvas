import assert from 'node:assert/strict';
import test from 'node:test';
import {
    adoptAdvertisingNodeVersion,
    createAdvertisingBranchNode,
    markAdvertisingDescendantsStale,
    saveAdvertisingNodeVersion
} from '../src/domain/advertising/versioning.ts';

const createNode = (id, parentIds = [], objective = 'old') => ({
    id,
    type: 'Advertising Brief',
    title: id,
    x: 0,
    y: 0,
    prompt: '',
    status: 'idle',
    model: 'auto',
    aspectRatio: 'Auto',
    resolution: 'Auto',
    parentIds,
    advertising: {
        lifecycle: 'draft',
        fields: { objective },
        activeVersionId: 'v1',
        versions: [{
            id: 'v1',
            label: 'Initial',
            createdAt: new Date().toISOString(),
            createdBy: 'user',
            fields: { objective: 'old' }
        }],
        isStale: false,
        brandInheritance: 'inherit',
        hasBrandConflict: false,
        advancedSettingsOpen: false
    }
});

test('saves immutable versions and can adopt an earlier version', () => {
    const source = createNode('brief', [], 'new working copy');
    const versioned = saveAdvertisingNodeVersion(source);
    assert.equal(versioned.advertising.versions.length, 2);
    assert.equal(versioned.advertising.versions[0].fields.objective, 'old');

    const adopted = adoptAdvertisingNodeVersion(versioned, 'v1');
    assert.equal(adopted.advertising.fields.objective, 'old');
    assert.equal(adopted.advertising.lifecycle, 'approved');
});

test('marks every downstream business node stale without changing the source', () => {
    const source = createNode('brief');
    const child = createNode('route', ['brief']);
    const grandchild = createNode('moodboard', ['route']);
    const unrelated = createNode('brand');
    const result = markAdvertisingDescendantsStale(
        [source, child, grandchild, unrelated],
        source.id,
        'Brief changed'
    );

    assert.equal(result.find((node) => node.id === 'brief').advertising.isStale, false);
    assert.equal(result.find((node) => node.id === 'route').advertising.isStale, true);
    assert.equal(result.find((node) => node.id === 'moodboard').advertising.isStale, true);
    assert.equal(result.find((node) => node.id === 'brand').advertising.isStale, false);
});

test('creates a new independent branch while retaining upstream dependencies', () => {
    const source = createNode('route', ['brief']);
    const branch = createAdvertisingBranchNode(source);
    assert.notEqual(branch.id, source.id);
    assert.deepEqual(branch.parentIds, ['brief']);
    assert.equal(branch.advertising.versions.length, 1);
    assert.notEqual(branch.advertising.activeVersionId, source.advertising.activeVersionId);
});
