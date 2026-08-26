import express from 'express';
import { answerAdvertisingQuestion } from '../services/advertisingAssistant.js';

const router = express.Router();

router.post('/chat', async (request, response) => {
    try {
        const message = String(request.body?.message || '').trim();
        if (!message) return response.status(400).json({ error: 'Message is required' });
        const result = await answerAdvertisingQuestion({
            message,
            context: request.body?.context || {},
            history: Array.isArray(request.body?.history) ? request.body.history : [],
            apiKey: request.app.locals.GEMINI_API_KEY
        });
        response.json(result);
    } catch (error) {
        console.error('[Advertising Assistant]', error);
        response.status(500).json({ error: error.message || 'Assistant request failed' });
    }
});

export default router;
