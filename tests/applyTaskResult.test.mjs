import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCompletedGenerationTask } from '../src/domain/generation/applyTaskResult.ts';
const node = (id, type, parentIds = []) => ({
  id,
  type,
  title: id,
  x: 0,
  y: 0,
  prompt: '',
  status: 'idle',
  model: 'auto',
  aspectRatio: '16:9',
  resolution: 'Auto',
  parentIds,
  advertising: {
    lifecycle: 'draft',
    fields: {},
    activeVersionId: `${id}-v1`,
    versions: [{ id: `${id}-v1`, label: '初始版本', createdAt: new Date(0).toISOString(), createdBy: 'user', fields: {} }],
    isStale: false,
    brandInheritance: type === 'Brand Profile' ? 'override' : 'inherit',
    hasBrandConflict: false,
    advancedSettingsOpen: false
  }
});

test('applies provider media to its node, creates an AI version and stales descendants once', () => {
  const source = node('shot-1', 'Advertising Shot');
  const downstream = node('edit-1', 'Edit Plan', ['shot-1']);
  const task = {
    id: 'task-1',
    nodeId: 'shot-1',
    status: 'succeeded',
    output: { resultUrl: '/library/videos/ad.mp4' }
  };
  const applied = applyCompletedGenerationTask([source, downstream], task);
  assert.equal(applied[0].resultUrl, '/library/videos/ad.mp4');
  assert.equal(applied[0].advertising.fields.generatedAsset, '/library/videos/ad.mp4');
  assert.equal(applied[0].advertising.versions.length, 2);
  assert.equal(applied[1].advertising.isStale, true);
  assert.strictEqual(applyCompletedGenerationTask(applied, task), applied);
});
