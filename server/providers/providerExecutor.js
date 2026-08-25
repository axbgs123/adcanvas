import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { generateGeminiImage, generateVeoVideo } from '../services/gemini.js';
import { generateOpenAIImage } from '../services/openai.js';
import { saveBufferToFile } from '../utils/imageHelpers.js';

const buildPrompt = (task) => {
    const payload = task.input || {};
    const fields = payload.fields || {};
    const fieldText = Object.entries(fields)
        .filter(([, value]) => String(value || '').trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    return [
        payload.prompt,
        payload.title ? `Task: ${payload.title}` : '',
        payload.nodeType ? `Node type: ${payload.nodeType}` : '',
        fieldText
    ].filter(Boolean).join('\n\n') || 'Create a professional advertising concept draft.';
};

const extractGeminiText = (result) => {
    const parts = result.candidates?.[0]?.content?.parts || [];
    return parts.map((part) => part.text || '').join('').trim();
};

const saveMetadata = (directory, metadataId, metadata) => {
    fs.writeFileSync(path.join(directory, `${metadataId}.json`), JSON.stringify(metadata, null, 2));
};

export const createProviderExecutor = ({ credentials, imagesDirectory, videosDirectory }) => async (task) => {
    const prompt = buildPrompt(task);

    if (task.kind === 'rough-cut') {
        return {
            actualCost: 0,
            output: {
                provider: 'local',
                model: 'ffmpeg-plan',
                content: 'Rough-cut provider boundary is ready; FFmpeg rendering will be implemented in the export milestone.'
            }
        };
    }

    if (task.kind === 'text') {
        if (!credentials.GEMINI_API_KEY) {
            const error = new Error('GEMINI_API_KEY is not configured');
            error.code = 'PROVIDER_NOT_CONFIGURED';
            throw error;
        }
        const client = new GoogleGenAI({ apiKey: credentials.GEMINI_API_KEY });
        const result = await client.models.generateContent({
            model: task.model,
            contents: {
                parts: [{
                    text: `You are an advertising creative assistant. Return concise, production-ready content for the requested node.\n\n${prompt}`
                }]
            }
        });
        const content = extractGeminiText(result);
        if (!content) throw new Error('Text provider returned no content');
        return {
            actualCost: task.estimatedCost,
            output: { provider: task.provider, model: task.model, content }
        };
    }

    if (task.kind === 'image') {
        let buffer;
        if (task.provider === 'openai') {
            buffer = await generateOpenAIImage({
                prompt,
                imageBase64Array: task.input.referenceImages || [],
                aspectRatio: task.input.aspectRatio || '16:9',
                resolution: task.qualityPreset === 'high' ? '4K' : '2K',
                apiKey: credentials.OPENAI_API_KEY
            });
        } else {
            buffer = await generateGeminiImage({
                prompt,
                imageBase64Array: task.input.referenceImages || [],
                aspectRatio: task.input.aspectRatio || '16:9',
                resolution: task.qualityPreset === 'high' ? '4K' : '1K',
                apiKey: credentials.GEMINI_API_KEY
            });
        }
        const saved = saveBufferToFile(buffer, imagesDirectory, 'ad_img', 'png');
        saveMetadata(imagesDirectory, saved.id, {
            id: saved.id,
            taskId: task.id,
            nodeId: task.nodeId,
            prompt,
            provider: task.provider,
            model: task.model,
            createdAt: new Date().toISOString(),
            type: 'images'
        });
        return {
            actualCost: task.estimatedCost,
            output: { provider: task.provider, model: task.model, resultUrl: saved.url, assetId: saved.id }
        };
    }

    if (task.kind === 'video') {
        const buffer = await generateVeoVideo({
            prompt,
            imageBase64: task.input.referenceImages?.[0],
            lastFrameBase64: task.input.referenceImages?.[1],
            aspectRatio: task.input.aspectRatio || '16:9',
            resolution: task.qualityPreset === 'high' ? '1080p' : '720p',
            duration: Number(task.input.duration || 6),
            generateAudio: true,
            apiKey: credentials.GEMINI_API_KEY
        });
        const saved = saveBufferToFile(buffer, videosDirectory, 'ad_vid', 'mp4');
        saveMetadata(videosDirectory, saved.id, {
            id: saved.id,
            taskId: task.id,
            nodeId: task.nodeId,
            prompt,
            provider: task.provider,
            model: task.model,
            createdAt: new Date().toISOString(),
            type: 'videos'
        });
        return {
            actualCost: task.estimatedCost,
            output: { provider: task.provider, model: task.model, resultUrl: saved.url, assetId: saved.id }
        };
    }

    throw new Error(`Unsupported provider task kind: ${task.kind}`);
};
