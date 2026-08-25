import express from 'express';

const getDemoUserId = (request) => {
    const value = request.header('x-demo-user-id') || 'demo@student';
    return String(value).trim().slice(0, 120);
};

const sendError = (response, error) => {
    console.error('[Projects API]', error);
    response.status(error.statusCode || 500).json({ error: error.message || 'Project operation failed' });
};

export const createProjectsRouter = (repository) => {
    const router = express.Router();

    router.get('/', (request, response) => {
        try {
            response.json(repository.listProjects(getDemoUserId(request)));
        } catch (error) {
            sendError(response, error);
        }
    });

    router.post('/', (request, response) => {
        try {
            const project = repository.createProject(getDemoUserId(request), request.body || {});
            response.status(201).json(project);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.get('/:projectId', (request, response) => {
        try {
            const project = repository.getProject(getDemoUserId(request), request.params.projectId);
            if (!project) return response.status(404).json({ error: 'Project not found' });
            response.json(project);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.patch('/:projectId', (request, response) => {
        try {
            const project = repository.updateProject(getDemoUserId(request), request.params.projectId, request.body || {});
            if (!project) return response.status(404).json({ error: 'Project not found' });
            response.json(project);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.get('/:projectId/canvas', (request, response) => {
        try {
            const canvas = repository.getCanvas(getDemoUserId(request), request.params.projectId);
            if (!canvas) return response.status(404).json({ error: 'Project not found' });
            response.json(canvas);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.put('/:projectId/canvas', (request, response) => {
        try {
            const canvas = repository.saveCanvas(getDemoUserId(request), request.params.projectId, request.body || {});
            if (!canvas) return response.status(404).json({ error: 'Project not found' });
            response.json(canvas);
        } catch (error) {
            sendError(response, error);
        }
    });

    return router;
};

export default createProjectsRouter;
