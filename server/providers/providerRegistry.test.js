import assert from 'node:assert/strict';
import test from 'node:test';
import { createProviderRegistry } from './providerRegistry.js';

test('reports providers unavailable when credentials are missing', () => {
    const registry = createProviderRegistry({});
    assert.equal(registry.recommend('text', 'balanced').available, false);
    assert.equal(registry.recommend('image', 'balanced').available, false);
    assert.equal(registry.recommend('rough-cut', 'balanced').available, true);
    assert.throws(
        () => registry.resolve('video', 'balanced'),
        (error) => error.code === 'PROVIDER_NOT_CONFIGURED'
    );
});

test('selects configured providers according to quality preference', () => {
    const registry = createProviderRegistry({
        GEMINI_API_KEY: 'configured',
        OPENAI_API_KEY: 'configured'
    });
    assert.deepEqual(
        registry.recommend('image', 'quick'),
        {
            available: true,
            provider: 'google',
            model: 'gemini-3.1-flash-image',
            kind: 'image',
            preset: 'quick',
            reason: 'Recommended for the quick quality preset.'
        }
    );
    assert.equal(registry.recommend('image', 'high').provider, 'openai');
    assert.equal(registry.recommend('video', 'balanced').model, 'veo-3.1-fast-generate-preview');
});

test('rejects an explicitly requested but unavailable model', () => {
    const registry = createProviderRegistry({ GEMINI_API_KEY: 'configured' });
    assert.throws(
        () => registry.resolve('image', 'high', 'openai', 'gpt-image-1.5'),
        (error) => error.code === 'PROVIDER_NOT_CONFIGURED'
    );
});
