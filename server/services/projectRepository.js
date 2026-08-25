import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

const assertProjectId = (projectId) => {
    if (!PROJECT_ID_PATTERN.test(projectId)) {
        const error = new Error('Invalid project id');
        error.statusCode = 400;
        throw error;
    }
};

const userDirectoryName = (userId) => crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex')
    .slice(0, 24);

const readJson = (filePath, fallback = null) => {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJsonAtomic = (filePath, value) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2));
    fs.renameSync(temporaryPath, filePath);
};

export const createProjectRepository = (projectsDirectory) => {
    fs.mkdirSync(projectsDirectory, { recursive: true });

    const getUserDirectory = (userId) => path.join(projectsDirectory, userDirectoryName(userId));
    const getProjectDirectory = (userId, projectId) => {
        assertProjectId(projectId);
        return path.join(getUserDirectory(userId), projectId);
    };
    const getProjectFile = (userId, projectId) => path.join(getProjectDirectory(userId, projectId), 'project.json');
    const getCanvasFile = (userId, projectId) => path.join(getProjectDirectory(userId, projectId), 'canvas.json');

    const getProject = (userId, projectId) => readJson(getProjectFile(userId, projectId));

    return {
        listProjects(userId) {
            const userDirectory = getUserDirectory(userId);
            if (!fs.existsSync(userDirectory)) return [];

            return fs.readdirSync(userDirectory, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && PROJECT_ID_PATTERN.test(entry.name))
                .map((entry) => getProject(userId, entry.name))
                .filter(Boolean)
                .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
        },

        createProject(userId, input) {
            if (input.sourceKey) {
                const existing = this.listProjects(userId).find((project) => project.sourceKey === input.sourceKey);
                if (existing) return existing;
            }
            const now = new Date().toISOString();
            const project = {
                id: crypto.randomUUID(),
                name: String(input.name || '').trim(),
                brand: String(input.brand || '未命名品牌').trim(),
                status: 'draft',
                sourceKey: input.sourceKey || null,
                ownerId: userId,
                createdAt: now,
                updatedAt: now
            };

            if (!project.name) {
                const error = new Error('Project name is required');
                error.statusCode = 400;
                throw error;
            }

            writeJsonAtomic(getProjectFile(userId, project.id), project);
            return project;
        },

        getProject,

        updateProject(userId, projectId, updates) {
            const project = getProject(userId, projectId);
            if (!project) return null;

            const updated = {
                ...project,
                name: updates.name === undefined ? project.name : String(updates.name).trim(),
                brand: updates.brand === undefined ? project.brand : String(updates.brand).trim(),
                status: updates.status || project.status,
                updatedAt: new Date().toISOString()
            };
            writeJsonAtomic(getProjectFile(userId, projectId), updated);
            return updated;
        },

        getCanvas(userId, projectId) {
            if (!getProject(userId, projectId)) return null;
            return readJson(getCanvasFile(userId, projectId), {
                schemaVersion: 1,
                title: getProject(userId, projectId).name,
                nodes: [],
                groups: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                updatedAt: null
            });
        },

        saveCanvas(userId, projectId, canvas) {
            const project = getProject(userId, projectId);
            if (!project) return null;

            const document = {
                schemaVersion: 1,
                title: String(canvas.title || project.name),
                nodes: Array.isArray(canvas.nodes) ? canvas.nodes : [],
                groups: Array.isArray(canvas.groups) ? canvas.groups : [],
                viewport: canvas.viewport || { x: 0, y: 0, zoom: 1 },
                updatedAt: new Date().toISOString()
            };
            writeJsonAtomic(getCanvasFile(userId, projectId), document);
            writeJsonAtomic(getProjectFile(userId, projectId), {
                ...project,
                name: document.title,
                updatedAt: document.updatedAt
            });
            return document;
        }
    };
};
