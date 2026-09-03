import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileGenerationSkillPrompt,
  generationSkills,
  getGenerationSkillsForKind,
  validateGenerationSkillReferences
} from '../src/domain/generation/skillRegistry.ts';

test('ships unique, versioned advertising generation skills with attributed sources', () => {
  assert.equal(new Set(generationSkills.map((skill) => skill.id)).size, generationSkills.length);
  assert.ok(generationSkills.length >= 4);
  for (const skill of generationSkills) {
    assert.ok(skill.version > 0);
    assert.ok(skill.sources.length > 0);
    assert.ok(skill.sources.every((source) => source.url.startsWith('https://github.com/')));
  }
});

test('compiles business context and brand constraints into a production prompt', () => {
  const prompt = compileGenerationSkillPrompt('product-key-visual', {
    title: '秋季新品 KV',
    prompt: '产品置于岩石台面',
    fields: { composition: '右侧留白' },
    brandRules: { prohibited: '不可改变瓶身文字' }
  });
  assert.match(prompt, /产品主视觉/);
  assert.match(prompt, /右侧留白/);
  assert.match(prompt, /不可改变瓶身文字/);
});

test('enforces reference requirements for reference-dependent skills', () => {
  const skill = getGenerationSkillsForKind('video').find((item) => item.id === 'first-last-frame-transition');
  assert.ok(skill);
  assert.equal(validateGenerationSkillReferences(skill, 1).valid, false);
  assert.equal(validateGenerationSkillReferences(skill, 2).valid, true);
});
