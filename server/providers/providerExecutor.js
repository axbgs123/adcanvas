import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { generateGeminiImage, generateVeoVideo } from '../services/gemini.js';
import { generateOpenAIImage } from '../services/openai.js';
import { saveBufferToFile } from '../utils/imageHelpers.js';
import { executeRoughCut } from '../services/roughCutExecutor.js';
import { generateKlingImage, generateKlingMultiImage, generateKlingVideo } from '../services/kling.js';
import { generateHailuoVideo } from '../services/hailuo.js';
import { generateFalImageToVideo, generateFalMotionControl } from '../services/fal.js';

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
        fieldText,
        payload.auditSnapshot ? `Project evidence to audit:\n${JSON.stringify(payload.auditSnapshot)}` : ''
    ].filter(Boolean).join('\n\n') || 'Create a professional advertising concept draft.';
};

const extractGeminiText = (result) => {
    const parts = result.candidates?.[0]?.content?.parts || [];
    return parts.map((part) => part.text || '').join('').trim();
};

const saveMetadata = (directory, metadataId, metadata) => {
    fs.writeFileSync(path.join(directory, `${metadataId}.json`), JSON.stringify(metadata, null, 2));
};

const downloadProviderAsset = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download provider asset: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
};

const mimeByExtension = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
};

export const resolveReferenceImages = (references = [], imagesDirectory) => references.map((reference) => {
    if (typeof reference !== 'string') throw new Error('Reference image must be a data URL or local library URL');
    if (reference.startsWith('data:image/')) return reference;
    if (!reference.startsWith('/library/images/')) {
        const error = new Error('Only data URLs and local image-library references are supported');
        error.code = 'UNSUPPORTED_REFERENCE_IMAGE';
        throw error;
    }

    const filename = path.basename(decodeURIComponent(reference.split('?')[0]));
    const extension = path.extname(filename).toLowerCase();
    const mimeType = mimeByExtension[extension];
    if (!mimeType) throw new Error(`Unsupported reference image type: ${extension || 'unknown'}`);
    const filePath = path.join(imagesDirectory, filename);
    if (!fs.existsSync(filePath)) {
        const error = new Error(`Reference image not found: ${filename}`);
        error.code = 'REFERENCE_IMAGE_NOT_FOUND';
        throw error;
    }
    return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
});

const resolveMotionReference = (reference, videosDirectory) => {
    if (!reference) return undefined;
    if (typeof reference !== 'string') throw new Error('Motion reference must be a data URL or local video-library URL');
    if (reference.startsWith('data:video/')) return reference;
    if (!reference.startsWith('/library/videos/')) {
        const error = new Error('Only data URLs and local video-library references are supported');
        error.code = 'UNSUPPORTED_MOTION_REFERENCE';
        throw error;
    }
    const filename = path.basename(decodeURIComponent(reference.split('?')[0]));
    const extension = path.extname(filename).toLowerCase();
    const mimeType = extension === '.webm' ? 'video/webm' : extension === '.mp4' ? 'video/mp4' : null;
    if (!mimeType) throw new Error(`Unsupported motion reference type: ${extension || 'unknown'}`);
    const filePath = path.join(videosDirectory, filename);
    if (!fs.existsSync(filePath)) throw new Error(`Motion reference not found: ${filename}`);
    return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
};

const defaultGenerateText = async ({ apiKey, model, prompt }) => {
    if (!apiKey) {
        const error = new Error('GEMINI_API_KEY is not configured');
        error.code = 'PROVIDER_NOT_CONFIGURED';
        throw error;
    }
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
        model,
        contents: { parts: [{ text: `You are an advertising creative assistant. Return concise, production-ready content for the requested node.\n\n${prompt}` }] }
    });
    return extractGeminiText(result);
};

export const createProviderExecutor = ({ credentials, imagesDirectory, videosDirectory, adapters = {} }) => async (task) => {
    const prompt = buildPrompt(task);
    const referenceImages = resolveReferenceImages(task.input?.referenceImages || [], imagesDirectory);
    const motionReference = resolveMotionReference(task.input?.motionReferenceUrl, videosDirectory);
    const generateText = adapters.generateText || defaultGenerateText;
    const generateImageWithOpenAI = adapters.generateOpenAIImage || generateOpenAIImage;
    const generateImageWithGemini = adapters.generateGeminiImage || generateGeminiImage;
    const generateVideoWithVeo = adapters.generateVeoVideo || generateVeoVideo;

    if (task.kind === 'rough-cut') {
        const result = await executeRoughCut({
            sourceVideos: task.input.sourceVideos,
            targetDuration: task.input.fields?.targetDuration || task.input.targetDuration,
            videosDirectory,
            taskId: task.id
        });
        return {
            actualCost: 0,
            output: {
                provider: 'local',
                model: 'ffmpeg-plan',
                ...result
            }
        };
    }

    if (task.kind === 'text') {
        const content = await generateText({ apiKey: credentials.GEMINI_API_KEY, model: task.model, prompt });
        if (!content) throw new Error('Text provider returned no content');
        return {
            actualCost: task.estimatedCost,
            output: { provider: task.provider, model: task.model, content }
        };
    }

    if (task.kind === 'image') {
        let buffer;
        if (task.provider === 'openai') {
            buffer = await generateImageWithOpenAI({
                prompt,
                imageBase64Array: referenceImages,
                aspectRatio: task.input.aspectRatio || '16:9',
                resolution: task.qualityPreset === 'high' ? '4K' : '2K',
                apiKey: credentials.OPENAI_API_KEY,
                model: task.model
            });
        } else if (task.provider === 'kling') {
            const usesMultiImage = referenceImages.length > 1 || ['kling-v2', 'kling-v2-1', 'kling-v2-new'].includes(task.model);
            const resultUrl = usesMultiImage
                ? await generateKlingMultiImage({
                    prompt,
                    subjectImages: referenceImages,
                    modelId: task.model,
                    aspectRatio: task.input.aspectRatio,
                    resolution: task.input.resolution,
                    accessKey: credentials.KLING_ACCESS_KEY,
                    secretKey: credentials.KLING_SECRET_KEY
                })
                : await generateKlingImage({
                    prompt,
                    imageBase64: referenceImages[0],
                    modelId: task.model,
                    aspectRatio: task.input.aspectRatio,
                    resolution: task.input.resolution,
                    klingReferenceMode: task.input.klingReferenceMode,
                    klingFaceIntensity: task.input.klingFaceIntensity,
                    klingSubjectIntensity: task.input.klingSubjectIntensity,
                    accessKey: credentials.KLING_ACCESS_KEY,
                    secretKey: credentials.KLING_SECRET_KEY
                });
            buffer = await downloadProviderAsset(resultUrl);
        } else {
            buffer = await generateImageWithGemini({
                prompt,
                imageBase64Array: referenceImages,
                aspectRatio: task.input.aspectRatio || '16:9',
                resolution: task.qualityPreset === 'high' ? '4K' : '1K',
                apiKey: credentials.GEMINI_API_KEY,
                model: task.model === 'gemini-pro' ? 'gemini-3.1-flash-image' : task.model
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
        let buffer;
        if (task.provider === 'kling') {
            const resultUrl = await generateKlingVideo({
                prompt,
                imageBase64: referenceImages[0],
                lastFrameBase64: referenceImages[1],
                modelId: task.model,
                aspectRatio: task.input.aspectRatio,
                duration: Number(task.input.duration || 5),
                motionReferenceUrl: motionReference,
                accessKey: credentials.KLING_ACCESS_KEY,
                secretKey: credentials.KLING_SECRET_KEY
            });
            buffer = await downloadProviderAsset(resultUrl);
        } else if (task.provider === 'hailuo') {
            const resultUrl = await generateHailuoVideo({
                prompt,
                imageBase64: referenceImages[0],
                lastFrameBase64: referenceImages[1],
                modelId: task.model,
                aspectRatio: task.input.aspectRatio,
                resolution: task.input.resolution,
                duration: Number(task.input.duration || 5),
                apiKey: credentials.HAILUO_API_KEY
            });
            buffer = await downloadProviderAsset(resultUrl);
        } else if (task.provider === 'fal') {
            const resultUrl = motionReference
                ? await generateFalMotionControl({
                    prompt,
                    characterImageBase64: referenceImages[0],
                    motionVideoBase64: motionReference,
                    characterOrientation: 'video',
                    apiKey: credentials.FAL_API_KEY
                })
                : await generateFalImageToVideo({
                    prompt,
                    imageBase64: referenceImages[0],
                    duration: String(task.input.duration || 5),
                    generateAudio: task.input.generateAudio !== false,
                    apiKey: credentials.FAL_API_KEY
                });
            buffer = await downloadProviderAsset(resultUrl);
        } else {
            buffer = await generateVideoWithVeo({
                prompt,
                imageBase64: referenceImages[0],
                lastFrameBase64: referenceImages[1],
                aspectRatio: task.input.aspectRatio || '16:9',
                resolution: task.qualityPreset === 'high' ? '1080p' : '720p',
                duration: Number(task.input.duration || 6),
                generateAudio: task.input.generateAudio !== false,
                apiKey: credentials.GEMINI_API_KEY,
                model: task.model === 'veo-3.1' ? 'veo-3.1-fast-generate-preview' : task.model
            });
        }
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
