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

test('resolves legacy canvas models through the unified provider registry', () => {
    const registry = createProviderRegistry({
        GEMINI_API_KEY: 'configured',
        KLING_ACCESS_KEY: 'access',
        KLING_SECRET_KEY: 'secret',
        HAILUO_API_KEY: 'configured',
        FAL_API_KEY: 'configured'
    });
    assert.equal(registry.resolve('image', 'balanced', 'google', 'gemini-pro').model, 'gemini-pro');
    assert.equal(registry.resolve('video', 'balanced', 'kling', 'kling-v2-1').provider, 'kling');
    assert.equal(registry.resolve('video', 'balanced', 'fal', 'kling-v2-6').provider, 'fal');
    assert.equal(registry.resolve('video', 'balanced', 'hailuo', 'hailuo-2.3').provider, 'hailuo');
});
