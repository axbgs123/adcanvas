/**
 * gemini.js
 * 
 * Google Gemini/Veo API service for image and video generation.
 */

import { GoogleGenAI } from '@google/genai';

// ============================================================================
// CLIENT SETUP
// ============================================================================

const clients = new Map();

/**
 * Get or create Gemini AI client
 */
export function getGeminiClient(apiKey) {
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }
    if (!clients.has(apiKey)) clients.set(apiKey, new GoogleGenAI({ apiKey }));
    return clients.get(apiKey);
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate image using Gemini
 * @returns {Promise<Buffer>} Image buffer
 */
export async function generateGeminiImage({ prompt, imageBase64Array, aspectRatio, resolution, apiKey, model = 'gemini-3.1-flash-image' }) {
    const ai = getGeminiClient(apiKey);
    const input = [];

    // Add input images
    if (imageBase64Array && imageBase64Array.length > 0) {
        for (const img of imageBase64Array) {
            const match = img.match(/^data:(image\/\w+);base64,/);
            const mimeType = match ? match[1] : "image/png";
            const base64Clean = img.replace(/^data:image\/\w+;base64,/, "");
            input.push({ type: 'image', mime_type: mimeType, data: base64Clean });
        }
    }
    input.unshift({ type: 'text', text: prompt });

    // Map aspect ratio - Gemini supports: "1:1", "3:4", "4:3", "9:16", "16:9"
    // Default to 16:9 for video-ready format
    const ratioMap = {
        'Auto': '16:9',
        '1:1': '1:1',
        '3:4': '3:4',
        '4:3': '4:3',
        '3:2': '3:2',
        '2:3': '2:3',
        '4:5': '4:5',
        '5:4': '5:4',
        '9:16': '9:16',
        '16:9': '16:9',
        '21:9': '16:9' // Fallback for ultra-wide
    };
    const mappedRatio = ratioMap[aspectRatio] || '1:1';

    // Map resolution - Supports 1K, 2K, 4K (must be uppercase)
    // Default to 1K if not specified or 'Auto'
    const resolutionMap = {
        'Auto': '1K',
        '1K': '1K',
        '2K': '2K',
        '4K': '4K'
    };
    const mappedResolution = resolutionMap[resolution] || '1K';

    console.log('[Gemini Image] Generating with:', {
        model,
        hasInputImages: imageBase64Array?.length || 0,
        aspectRatio: mappedRatio,
        resolution: mappedResolution,
        promptPreview: prompt?.substring(0, 80) + '...'
    });

    let response;
    try {
        response = await ai.interactions.create({
            model,
            input,
            response_format: {
                type: 'image',
                aspect_ratio: mappedRatio,
                image_size: mappedResolution
            }
        });
    } catch (error) {
        console.error('[Gemini Image] API Error Details:', {
            message: error.message,
            status: error.status,
            hasInputImages: imageBase64Array?.length || 0,
            aspectRatio: mappedRatio,
            resolution: mappedResolution
        });
        throw error;
    }

    const imageOutput = response.outputs?.find((output) => output.type === 'image' && output.data);
    if (imageOutput?.data) return Buffer.from(imageOutput.data, 'base64');

    throw new Error("No image data returned from Gemini");
}

// ============================================================================
// VIDEO GENERATION
// ============================================================================

/**
 * Generate video using Veo
 * @returns {Promise<Buffer>} Video buffer
 */
export function buildVeoRequestArgs({ prompt, imageBase64, lastFrameBase64, aspectRatio, resolution, duration, model = 'veo-3.1-fast-generate-preview' }) {
    // Map resolution
    const resolutionMap = {
        '1080p': '1080p',
        '720p': '720p',
        '512p': '512p',
        'Auto': '720p'
    };
    const mappedResolution = resolutionMap[resolution] || '720p';

    // Map aspect ratio
    const ratioMap = {
        'Auto': '16:9',
        '16:9': '16:9',
        '9:16': '9:16'
    };
    const mappedRatio = ratioMap[aspectRatio] || '16:9';

    // Map duration - Veo 3 supports 4, 6, or 8 seconds only
    const validDurations = [4, 6, 8];
    const mappedDuration = validDurations.includes(duration) ? duration : 8;

    // Build API arguments
    // Note: generateAudio is NOT supported by @google/genai library yet (throws error)
    // Even though Veo 3.1 API docs mention it, the SDK doesn't expose this parameter
    const args = {
        model: model,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            durationSeconds: mappedDuration,
            resolution: mappedResolution,
            aspectRatio: mappedRatio
            // generateAudio: not available in current @google/genai SDK
        }
    };

    // Add image inputs
    if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,/);
        const mimeType = match ? match[1] : "image/png";
        const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        args.image = {
            imageBytes: base64Clean,
            mimeType: mimeType
        };
    }

    // Add last frame for interpolation
    if (lastFrameBase64) {
        const match = lastFrameBase64.match(/^data:(image\/\w+);base64,/);
        const mimeType = match ? match[1] : "image/png";
        const base64Clean = lastFrameBase64.replace(/^data:image\/\w+;base64,/, "");

        // Veo interpolation expects the ending frame in config.lastFrame.
        args.config.lastFrame = {
            imageBytes: base64Clean,
            mimeType
        };
    }

    return args;
}

export async function generateVeoVideo({ prompt, imageBase64, lastFrameBase64, aspectRatio, resolution, duration, generateAudio = true, apiKey, model = 'veo-3.1-fast-generate-preview' }) {
    const ai = getGeminiClient(apiKey);
    const args = buildVeoRequestArgs({ prompt, imageBase64, lastFrameBase64, aspectRatio, resolution, duration, model });

    console.log('Calling Veo API with args:', {
        model: args.model,
        prompt: args.prompt.substring(0, 100) + '...',
        config: args.config,
        image: args.image ? { mimeType: args.image.mimeType, length: args.image.imageBytes?.length } : undefined,
        requestedDuration: duration,
        mappedDuration: args.config.durationSeconds
    });

    // Start generation
    let operation = await ai.models.generateVideos(args);

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    // Get video data - Veo returns either a URI or direct bytes
    const response = operation.response;
    const generatedVideo = response?.generatedVideos?.[0];

    if (!generatedVideo) {
        console.error('Veo API response structure:', JSON.stringify(response, null, 2));
        throw new Error('No video generated by Veo');
    }

    // Check if we got a URI (need to download) or direct bytes
    if (generatedVideo.video?.uri) {
        // Download video from URI - need to add API key for authentication
        console.log('Downloading video from Veo URI...');
        const downloadUrl = new URL(generatedVideo.video.uri);
        downloadUrl.searchParams.set('key', apiKey);

        const videoResponse = await fetch(downloadUrl.toString());
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video from Veo: ${videoResponse.status}`);
        }
        return Buffer.from(await videoResponse.arrayBuffer());
    } else if (generatedVideo.video?.videoBytes) {
        // Direct bytes
        return Buffer.from(generatedVideo.video.videoBytes, 'base64');
    } else if (generatedVideo.videoBytes) {
        return Buffer.from(generatedVideo.videoBytes, 'base64');
    }

    console.error('Veo API response structure:', JSON.stringify(response, null, 2));
    throw new Error('No video data in response');
}
