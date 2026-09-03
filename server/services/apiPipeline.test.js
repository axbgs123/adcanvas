import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { createTasksRouter } from '../routes/tasks.js';
import { createProvidersRouter } from '../routes/providers.js';
import { createProviderRegistry } from '../providers/providerRegistry.js';
import { createGenerationQueue } from './generationQueue.js';
import { createProjectRepository } from './projectRepository.js';
import { createTaskRepository } from './taskRepository.js';

test('provider API pipeline recommends, queues and returns a canvas-ready result', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-api-pipeline-'));
    const userId = 'integration@student';
    const projectRepository = createProjectRepository(path.join(root, 'projects'));
    const taskRepository = createTaskRepository(path.join(root, 'tasks'));
    const project = projectRepository.createProject(userId, { name: 'API test', brand: 'Test' });
    const providerRegistry = createProviderRegistry({ GEMINI_API_KEY: 'configured' });
    const generationQueue = createGenerationQueue(taskRepository, {
        executionDelayMs: 0,
        providerExecutor: async (task) => ({
            actualCost: task.estimatedCost,
            output: {
                provider: task.provider,
                model: task.model,
                resultUrl: '/library/videos/contract-test.mp4',
                assetId: 'contract-test'
            }
        })
    });
    const app = express();
    app.use(express.json());
    app.use('/api/tasks', createTasksRouter({ taskRepository, generationQueue, projectRepository, providerRegistry }));
    app.use('/api/providers', createProvidersRouter(providerRegistry));
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const headers = { 'content-type': 'application/json', 'x-demo-user-id': userId };

    try {
        const recommendationResponse = await fetch(`${baseUrl}/api/providers/recommend?kind=video&qualityPreset=balanced`, { headers });
        const recommendation = await recommendationResponse.json();
        assert.equal(recommendation.available, true);
        assert.equal(recommendation.model, 'veo-3.1-fast-generate-preview');

        const createResponse = await fetch(`${baseUrl}/api/tasks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                projectId: project.id,
                nodeId: 'shot-1',
                kind: 'video',
                qualityPreset: 'balanced',
                confirmed: true,
                idempotencyKey: 'api-provider-contract',
                mode: 'provider',
                provider: recommendation.provider,
                model: recommendation.model,
                payload: { prompt: 'One product shot', skillId: 'cinematic-product-shot' }
            })
        });
        assert.equal(createResponse.status, 201);
        const created = await createResponse.json();
        assert.equal(created.status, 'queued');
        assert.equal(created.mode, 'provider');

        await new Promise((resolve) => setTimeout(resolve, 30));
        const listResponse = await fetch(`${baseUrl}/api/tasks?projectId=${project.id}`, { headers });
        const tasks = await listResponse.json();
        assert.equal(tasks[0].status, 'succeeded');
        assert.equal(tasks[0].output.resultUrl, '/library/videos/contract-test.mp4');
        assert.equal(tasks[0].input.skillId, 'cinematic-product-shot');
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
