import assert from 'node:assert/strict';
import test from 'node:test';
import {
    applyBrandComplianceToNodes,
    evaluateBrandCompliance,
    getBrandProfileFromNode
} from '../src/domain/advertising/brandRules.ts';

const createAdvertisingNode = (overrides = {}) => ({
    id: 'node-1',
    type: 'Advertising Script',
    title: 'Script',
    x: 0,
    y: 0,
    prompt: '',
    status: 'idle',
    model: 'auto',
    aspectRatio: 'Auto',
    resolution: 'Auto',
    parentIds: [],
    advertising: {
        lifecycle: 'needs-review',
        fields: { message: '高端香水，限时折扣' },
        activeVersionId: 'v1',
        versions: [],
        isStale: false,
        brandInheritance: 'inherit',
        hasBrandConflict: false,
        advancedSettingsOpen: false
    },
    ...overrides
});

const brandNode = createAdvertisingNode({
    id: 'brand-1',
    type: 'Brand Profile',
    title: 'Brand',
    advertising: {
        lifecycle: 'draft',
        fields: {
            tone: '克制、高级',
            brandColors: '#D99A45, #2C140B',
            fonts: '思源宋体',
            logoRules: '结尾展示',
            visualSystem: '日光与琥珀',
            mustInclude: '品牌名, 香水瓶',
            prohibited: '折扣, 低价'
        },
        activeVersionId: 'brand-v1',
        versions: [],
        isStale: false,
        brandInheritance: 'override',
        hasBrandConflict: false,
        advancedSettingsOpen: false
    }
});

test('parses a brand profile from the project brand node', () => {
    const profile = getBrandProfileFromNode(brandNode);
    assert.deepEqual(profile.brandColors, ['#D99A45', '#2C140B']);
    assert.deepEqual(profile.mustInclude, ['品牌名', '香水瓶']);
});

test('detects prohibited content and missing required brand elements', () => {
    const profile = getBrandProfileFromNode(brandNode);
    const result = evaluateBrandCompliance(createAdvertisingNode(), profile);
    assert.equal(result.hasConflict, true);
    assert.equal(result.hardConflicts.some((message) => message.includes('折扣')), true);
    assert.equal(result.hardConflicts.some((message) => message.includes('品牌名')), true);
});

test('explicit local override bypasses inherited hard rules', () => {
    const profile = getBrandProfileFromNode(brandNode);
    const node = createAdvertisingNode({
        advertising: {
            ...createAdvertisingNode().advertising,
            brandInheritance: 'override'
        }
    });
    assert.equal(evaluateBrandCompliance(node, profile).hasConflict, false);
});

test('applies inherited profile id and conflict state across the canvas', () => {
    const result = applyBrandComplianceToNodes([brandNode, createAdvertisingNode()]);
    const script = result.find((node) => node.id === 'node-1');
    assert.equal(script.advertising.inheritedBrandProfileId, 'brand-1');
    assert.equal(script.advertising.hasBrandConflict, true);
});
