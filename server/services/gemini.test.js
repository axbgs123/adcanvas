import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVeoRequestArgs } from './gemini.js';

test('builds the documented Veo first-and-last-frame request shape', () => {
    const request = buildVeoRequestArgs({
        prompt: 'Move from pack shot to end card',
        imageBase64: 'data:image/png;base64,Zmlyc3Q=',
        lastFrameBase64: 'data:image/webp;base64,bGFzdA==',
        aspectRatio: '16:9',
        resolution: '1080p',
        duration: 8,
        model: 'veo-3.1-fast-generate-preview'
    });

    assert.deepEqual(request.image, {
        imageBytes: 'Zmlyc3Q=',
        mimeType: 'image/png'
    });
    assert.deepEqual(request.config.lastFrame, {
        imageBytes: 'bGFzdA==',
        mimeType: 'image/webp'
    });
    assert.equal(request.config.referenceImages, undefined);
    assert.equal(request.config.durationSeconds, 8);
});
