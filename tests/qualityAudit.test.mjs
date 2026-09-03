import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQualityAuditSnapshot, parseQualityAuditResult } from '../src/domain/advertising/qualityAudit.ts';

const node = (id, type, parentIds = []) => ({
  id, type, parentIds, x: 0, y: 0, prompt: '', status: 'idle',
  model: 'auto', aspectRatio: 'Auto', resolution: 'Auto'
});

test('quality snapshot includes every ancestor and the project brand profile', () => {
  const brand = node('brand', 'Brand Profile');
  const brief = node('brief', 'Advertising Brief', ['brand']);
  const shot = { ...node('shot', 'Advertising Shot', ['brief']), resultUrl: '/library/images/shot.png' };
  const audit = node('audit', 'AI Quality Audit', ['shot']);
  const unrelated = node('other', 'Text');
  const snapshot = buildQualityAuditSnapshot([brand, brief, shot, audit, unrelated], audit);
  assert.deepEqual(snapshot.nodes.map((item) => item.id), ['brand', 'brief', 'shot']);
  assert.equal(snapshot.nodes[2].hasAsset, true);
});

test('parses structured model output into bounded quality scores', () => {
  const result = parseQualityAuditResult({
    content: '```json\n{"overallScore":106,"verdict":"通过","brandScore":90,"productScore":88,"copyScore":82,"platformScore":79,"issues":[],"recommendations":["终审"]}\n```'
  });
  assert.equal(result?.overallScore, 100);
  assert.equal(result?.platformScore, 79);
  assert.deepEqual(result?.recommendations, ['终审']);
});
