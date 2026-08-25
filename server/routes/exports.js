import express from 'express';
import {
    buildEditableProjectPackage,
    buildProductionHandoffPackage,
    validateEditableProjectPackage
} from '../services/projectPackage.js';

const getDemoUserId = (request) => String(request.header('x-demo-user-id') || 'demo@student').trim().slice(0, 120);

const safeFilename = (value) => String(value || 'adcanvas-project')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-')
    .slice(0, 80);

const sendError = (response, error) => {
    const status = error.statusCode || 400;
    if (status >= 500) console.error('[Exports API]', error);
    response.status(status).json({ error: error.message || 'Export operation failed' });
};

export const createExportsRouter = ({ projectRepository, taskRepository }) => {
    const router = express.Router();

    router.get('/projects/:projectId', (request, response) => {
        try {
            const userId = getDemoUserId(request);
            const project = projectRepository.getProject(userId, request.params.projectId);
            const canvas = projectRepository.getCanvas(userId, request.params.projectId);
            if (!project || !canvas) return response.status(404).json({ error: 'Project not found' });
            const tasks = taskRepository.listTasks(userId, { projectId: project.id });
            const type = request.query.type === 'handoff' ? 'handoff' : 'editable';
            const packageValue = type === 'handoff'
                ? buildProductionHandoffPackage({ project, canvas, tasks })
                : buildEditableProjectPackage({ project, canvas, tasks });

            const suffix = type === 'handoff' ? 'production-handoff' : 'editable';
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.setHeader(
                'Content-Disposition',
                `attachment; filename*=UTF-8''${encodeURIComponent(`${safeFilename(project.name)}-${suffix}.adcanvas.json`)}`
            );
            response.json(packageValue);
        } catch (error) {
            sendError(response, error);
        }
    });

    router.post('/import', (request, response) => {
        try {
            const userId = getDemoUserId(request);
            const packageValue = validateEditableProjectPackage(request.body);
            const project = projectRepository.createProject(userId, {
                name: `${packageValue.project.name}（导入）`,
                brand: packageValue.project.brand || '未命名品牌'
            });
            projectRepository.saveCanvas(userId, project.id, {
                ...packageValue.canvas,
                title: `${packageValue.canvas.title || packageValue.project.name}（导入）`
            });
            response.status(201).json(projectRepository.getProject(userId, project.id));
        } catch (error) {
            sendError(response, error);
        }
    });

    return router;
};

export default createExportsRouter;
