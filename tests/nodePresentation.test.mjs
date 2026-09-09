import assert from 'node:assert/strict';
import test from 'node:test';
import { getNodeDisplayTitle, getNodeTypeLabel, nodeTypeLabels } from '../src/domain/nodePresentation.ts';

test('provides Chinese labels for every persisted node type', () => {
  for (const type of Object.keys(nodeTypeLabels)) {
    assert.ok(getNodeTypeLabel(type));
    assert.notEqual(getNodeTypeLabel(type), type);
  }
});

test('replaces legacy default titles without overwriting custom titles', () => {
  assert.equal(getNodeDisplayTitle('Image', 'Image'), '图片生成');
  assert.equal(getNodeDisplayTitle('Advertising Brief', '广告 Brief'), '广告需求');
  assert.equal(getNodeDisplayTitle('Image', '新品主视觉'), '新品主视觉');
});
