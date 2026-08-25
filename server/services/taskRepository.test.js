import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { estimateGenerationCost } from './costEstimator.js';
import { createTaskRepository } from './taskRepository.js';

const createInput = (overrides = {}) => ({
    projectId: 'project-1',
    nodeId: 'node-1',
    kind: 'image',
    qualityPreset: 'balanced',
    provider: 'auto',
    model: 'auto',
    mode: 'simulation',
    estimatedCost: 0.5,
    pricingVersion: 'test',
    idempotencyKey: 'idem-1',
    confirmed: true,
    ...overrides
});

const withRepository = (options = {}) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adcanvas-tasks-'));
    return {
        repository: createTaskRepository(directory, options),
        cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
    };
};

test('estimates task costs by kind and quality preset', () => {
    assert.equal(estimateGenerationCost('text', 'quick').estimatedCost, 0.01);
    assert.equal(estimateGenerationCost('image', 'balanced').estimatedCost, 0.5);
    assert.equal(estimateGenerationCost('video', 'high').estimatedCost, 20);
});

test('requires confirmation before reserving paid generation', () => {
    const { repository, cleanup } = withRepository();
    try {
        assert.throws(
            () => repository.createTask('student-a', createInput({ confirmed: false })),
            (error) => error.code === 'CONFIRMATION_REQUIRED'
        );
    } finally {
        cleanup();
    }
});

test('deduplicates tasks with the same idempotency key', () => {
    const { repository, cleanup } = withRepository();
    try {
        const first = repository.createTask('student-a', createInput());
        const second = repository.createTask('student-a', createInput());
        assert.equal(first.created, true);
        assert.equal(second.created, false);
        assert.equal(second.task.id, first.task.id);
    } finally {
        cleanup();
    }
});

test('enforces the account budget against active reservations', () => {
    const { repository, cleanup } = withRepository({ accountBudgetLimit: 1 });
    try {
        repository.createTask('student-a', createInput({ estimatedCost: 1 }));
        assert.throws(
            () => repository.createTask('student-a', createInput({ idempotencyKey: 'idem-2', estimatedCost: 0.01 })),
            (error) => error.code === 'BUDGET_EXCEEDED'
        );
    } finally {
        cleanup();
    }
});

test('persists valid state transitions and rejects invalid ones', () => {
    const { repository, cleanup } = withRepository();
    try {
        const created = repository.createTask('student-a', createInput()).task;
        const running = repository.transitionTask('student-a', created.id, 'running');
        assert.equal(running.status, 'running');
        assert.equal(running.attempt, 1);

        const succeeded = repository.transitionTask('student-a', created.id, 'succeeded', {
            actualCost: 0.4,
            output: { assetId: 'asset-1' }
        });
        assert.equal(succeeded.status, 'succeeded');
        assert.equal(succeeded.actualCost, 0.4);

        assert.throws(
            () => repository.transitionTask('student-a', created.id, 'running'),
            /Invalid task transition/
        );
    } finally {
        cleanup();
    }
});

test('supports cancellation and bounded retries', () => {
    const { repository, cleanup } = withRepository();
    try {
        const created = repository.createTask('student-a', createInput()).task;
        const cancelled = repository.cancelTask('student-a', created.id);
        assert.equal(cancelled.status, 'cancelled');

        const retried = repository.retryTask('student-a', created.id);
        assert.equal(retried.status, 'queued');
        assert.equal(retried.error, null);
    } finally {
        cleanup();
    }
});
