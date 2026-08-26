import express from 'express';
import { estimateGenerationCost } from '../services/costEstimator.js';

const getDemoUserId = (request) => String(request.header('x-demo-user-id') || 'demo@student').trim().slice(0, 120);

const sendError = (response, error) => {
    if ((error.statusCode || 500) >= 500 && error.code !== 'PROVIDER_NOT_CONFIGURED') {
        console.error('[Tasks API]', error);
    } else {
        console.warn('[Tasks API]', error.code || error.message);
    }
    response.status(error.statusCode || 500).json({
        error: error.message || 'Task operation failed',
        code: error.code || 'TASK_ERROR'
    });
};

export const createTasksRouter = ({ taskRepository, generationQueue, projectRepository, providerRegistry }) => {
    const router = express.Router();

    router.post('/estimate', (request, response) => {
        try {
            response.json(estimateGenerationCost(request.body?.kind, request.body?.qualityPreset));
        } catch (error) {
            sendError(response, error);
        }
    });

    router.get('/budget', (request, response) => {
        try {
            response.json(taskRepository.getBudgetSummary(getDemoUserId(request)));
        } catch (error) {
            sendError(response, error);
        }
    });

    router.get('/', (request, response) => {
        try {
            response.json(taskRepository.listTasks(getDemoUserId(request), {
                projectId: request.query.projectId,
                status: request.query.status
            }));
        } catch (error) {
            sendError(response, error);
        }
    });

    router.post('/', (request, response) => {
        try {
            const userId = getDemoUserId(request);
            const body = request.body || {};
            const project = projectRepository.getProject(userId, body.projectId);
            if (!project) return response.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });

            const estimate = estimateGenerationCost(body.kind, body.qualityPreset);
            const successfulProjectVideos = body.kind === 'rough-cut'
                ? taskRepository.listTasks(userId, { projectId: body.projectId })
                    .filter((task) => task.kind === 'video' && task.status === 'succeeded' && task.output?.resultUrl)
                    .map((task) => task.output.resultUrl)
                : [];
            const executionMode = body.mode === 'provider' ? 'provider' : 'simulation';
            const providerSelection = executionMode === 'provider'
                ? providerRegistry.resolve(body.kind, body.qualityPreset, body.provider, body.model)
                : { provider: 'simulation', model: 'demo-simulator' };
            const result = taskRepository.createTask(userId, {
                ...body,
                ...estimate,
                mode: executionMode,
                provider: providerSelection.provider,
                model: providerSelection.model,
                payload: {
                    ...(body.payload || {}),
                    ...(body.kind === 'rough-cut' ? { sourceVideos: successfulProjectVideos } : {})
                },
                confirmed: body.confirmed === true
            });
            if (result.task.status === 'queued') generationQueue.enqueue(userId, result.task.id);
            response.status(result.created ? 201 : 200).json({
                ...result.task,
                deduplicated: !result.created
            });
        } catch (error) {
            sendError(response, error);
        }
    });

    router.get('/:taskId', (request, response) => {
        try {
            const task = taskRepository.getTask(getDemoUserId(request), request.params.taskId);
            if (!task) return response.status(404).json({ error: 'Task not found', code: 'TASK_NOT_FOUND' });
            response.json(task);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.post('/:taskId/cancel', (request, response) => {
        try {
            const task = taskRepository.cancelTask(getDemoUserId(request), request.params.taskId);
            if (!task) return response.status(404).json({ error: 'Task not found', code: 'TASK_NOT_FOUND' });
            response.json(task);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.post('/:taskId/retry', (request, response) => {
        try {
            const userId = getDemoUserId(request);
            const task = taskRepository.retryTask(userId, request.params.taskId);
            if (!task) return response.status(404).json({ error: 'Task not found', code: 'TASK_NOT_FOUND' });
            generationQueue.enqueue(userId, task.id);
            response.json(task);
        } catch (error) {
            sendError(response, error);
        }
    });

    return router;
};

export default createTasksRouter;
