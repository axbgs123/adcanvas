import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createProviderExecutor, resolveReferenceImages } from './providerExecutor.js';

const createTask = (overrides = {}) => ({
    id: 'task-1',
    nodeId: 'node-1',
    kind: 'image',
    provider: 'openai',
    model: 'gpt-image-1.5',
    qualityPreset: 'balanced',
    estimatedCost: 0.2,
    input: { prompt: 'Product on stone', aspectRatio: '4:5', referenceImages: [] },
    ...overrides
});

test('resolves only safe local image references and data URLs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-refs-'));
    try {
        fs.writeFileSync(path.join(directory, 'product.png'), Buffer.from('image-bytes'));
        const values = resolveReferenceImages([
            '/library/images/product.png?t=1',
            'data:image/png;base64,aGVsbG8='
        ], directory);
        assert.match(values[0], /^data:image\/png;base64,/);
        assert.equal(values[1], 'data:image/png;base64,aGVsbG8=');
        assert.throws(
            () => resolveReferenceImages(['https://example.com/product.png'], directory),
            (error) => error.code === 'UNSUPPORTED_REFERENCE_IMAGE'
        );
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('executes image provider contract, persists output and forwards reference data', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-image-provider-'));
    const imagesDirectory = path.join(root, 'images');
    const videosDirectory = path.join(root, 'videos');
    fs.mkdirSync(imagesDirectory);
    fs.mkdirSync(videosDirectory);
    fs.writeFileSync(path.join(imagesDirectory, 'product.png'), Buffer.from('reference'));
    let received;
    try {
        const execute = createProviderExecutor({
            credentials: { OPENAI_API_KEY: 'test-key' },
            imagesDirectory,
            videosDirectory,
            adapters: {
                generateOpenAIImage: async (input) => {
                    received = input;
                    return Buffer.from('generated-image');
                }
            }
        });
        const result = await execute(createTask({
            input: {
                prompt: 'Product on stone',
                skillId: 'product-scene-remix',
                aspectRatio: '4:5',
                referenceImages: ['/library/images/product.png']
            }
        }));
        assert.equal(received.model, 'gpt-image-1.5');
        assert.match(received.imageBase64Array[0], /^data:image\/png;base64,/);
        assert.match(result.output.resultUrl, /^\/library\/images\/ad_img_/);
        assert.ok(fs.existsSync(path.join(imagesDirectory, `${result.output.assetId}.png`)));
        assert.ok(fs.existsSync(path.join(imagesDirectory, `${result.output.assetId}.json`)));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('executes text and first-last-frame video provider contracts', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-provider-contract-'));
    const imagesDirectory = path.join(root, 'images');
    const videosDirectory = path.join(root, 'videos');
    fs.mkdirSync(imagesDirectory);
    fs.mkdirSync(videosDirectory);
    fs.writeFileSync(path.join(imagesDirectory, 'first.png'), Buffer.from('first'));
    fs.writeFileSync(path.join(imagesDirectory, 'last.png'), Buffer.from('last'));
    let videoInput;
    try {
        const execute = createProviderExecutor({
            credentials: { GEMINI_API_KEY: 'test-key' },
            imagesDirectory,
            videosDirectory,
            adapters: {
                generateText: async ({ model, prompt }) => `${model}:${prompt}`,
                generateVeoVideo: async (input) => {
                    videoInput = input;
                    return Buffer.from('generated-video');
                }
            }
        });
        const textResult = await execute(createTask({
            kind: 'text', provider: 'google', model: 'gemini-3.5-flash', input: { prompt: 'Write a route' }
        }));
        assert.match(textResult.output.content, /gemini-3.5-flash/);

        const videoResult = await execute(createTask({
            kind: 'video',
            provider: 'google',
            model: 'veo-3.1-fast-generate-preview',
            input: {
                prompt: 'Transition between approved frames',
                aspectRatio: '16:9',
                duration: 8,
                referenceImages: ['/library/images/first.png', '/library/images/last.png']
            }
        }));
        assert.match(videoInput.imageBase64, /^data:image\/png;base64,/);
        assert.match(videoInput.lastFrameBase64, /^data:image\/png;base64,/);
        assert.equal(videoInput.duration, 8);
        assert.match(videoResult.output.resultUrl, /^\/library\/videos\/ad_vid_/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
