import express from 'express';

export const createProvidersRouter = (registry) => {
    const router = express.Router();

    router.get('/', (request, response) => {
        response.json(registry.list());
    });

    router.get('/recommend', (request, response) => {
        response.json(registry.recommend(request.query.kind, request.query.qualityPreset || 'balanced'));
    });

    return router;
};

export default createProvidersRouter;
