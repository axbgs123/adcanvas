import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createGenerationQueue } from './generationQueue.js';
import { createTaskRepository } from './taskRepository.js';

test('executes a queued simulation task and records its cost', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-queue-'));
    try {
        const repository = createTaskRepository(directory);
        const task = repository.createTask('student-a', {
            projectId: 'project-1',
            nodeId: 'node-1',
            kind: 'text',
            qualityPreset: 'quick',
            provider: 'auto',
            model: 'auto',
            mode: 'simulation',
            estimatedCost: 0.01,
            pricingVersion: 'test',
            idempotencyKey: 'queue-test-1',
            confirmed: true
        }).task;
        const queue = createGenerationQueue(repository, { executionDelayMs: 0 });
        assert.equal(queue.enqueue('student-a', task.id), true);
        assert.equal(queue.enqueue('student-a', task.id), false);

        await new Promise((resolve) => setTimeout(resolve, 20));
        const completed = repository.getTask('student-a', task.id);
        assert.equal(completed.status, 'succeeded');
        assert.equal(completed.actualCost, 0.01);
        assert.equal(completed.output.mode, 'simulation');
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('delegates provider tasks to the configured provider executor', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-provider-queue-'));
    try {
        const repository = createTaskRepository(directory);
        const task = repository.createTask('student-a', {
            projectId: 'project-1',
            nodeId: 'node-1',
            kind: 'text',
            qualityPreset: 'balanced',
            provider: 'google',
            model: 'gemini-2.0-flash',
            mode: 'provider',
            estimatedCost: 0.03,
            pricingVersion: 'test',
            idempotencyKey: 'provider-queue-test-1',
            confirmed: true
        }).task;
        const queue = createGenerationQueue(repository, {
            executionDelayMs: 0,
            providerExecutor: async (providerTask) => ({
                actualCost: providerTask.estimatedCost,
                output: { provider: providerTask.provider, content: 'generated' }
            })
        });
        queue.enqueue('student-a', task.id);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const completed = repository.getTask('student-a', task.id);
        assert.equal(completed.status, 'succeeded');
        assert.equal(completed.output.provider, 'google');
        assert.equal(completed.output.content, 'generated');
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
