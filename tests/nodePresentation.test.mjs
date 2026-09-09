import assert from 'node:assert/strict';
import test from 'node:test';
import { getNodeDisplayTitle, getNodeTypeLabel, nodeTypeLabels } from '../src/domain/nodePresentation.ts';
import { getAssetCategoryLabel, localizeLegacyContent } from '../src/i18n/zhCN.ts';

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

test('presents persisted asset category keys in Chinese', () => {
  assert.equal(getAssetCategoryLabel('Character'), '人物');
  assert.equal(getAssetCategoryLabel('Sound Effect'), '音效');
  assert.equal(getAssetCategoryLabel('custom'), 'custom');
});

test('localizes legacy English demo output without changing stored identifiers', () => {
  assert.equal(
    localizeLegacyContent('image task completed in Demo simulation mode'),
    '图片生成任务已在 Demo 模拟模式下完成'
  );
  assert.equal(localizeLegacyContent('广告 Brief 缺少信息'), '广告需求缺少信息');
});
