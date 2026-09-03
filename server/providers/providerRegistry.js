const providerDefinitions = [
    {
        id: 'gemini-text',
        provider: 'google',
        model: 'gemini-3.5-flash',
        kind: 'text',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['GEMINI_API_KEY']
    },
    {
        id: 'openai-image',
        provider: 'openai',
        model: 'gpt-image-1.5',
        kind: 'image',
        presets: ['balanced', 'high'],
        requiredCredentials: ['OPENAI_API_KEY']
    },
    {
        id: 'gemini-image',
        provider: 'google',
        model: 'gemini-3.1-flash-image',
        kind: 'image',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['GEMINI_API_KEY']
    },
    {
        id: 'gemini-image-legacy-alias',
        provider: 'google',
        model: 'gemini-pro',
        kind: 'image',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['GEMINI_API_KEY']
    },
    {
        id: 'gemini-video',
        provider: 'google',
        model: 'veo-3.1-fast-generate-preview',
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['GEMINI_API_KEY']
    },
    {
        id: 'gemini-video-legacy-alias',
        provider: 'google',
        model: 'veo-3.1',
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['GEMINI_API_KEY']
    },
    ...['kling-v1-5', 'kling-v2', 'kling-v2-1', 'kling-v2-new'].map((model) => ({
        id: `kling-image-${model}`,
        provider: 'kling',
        model,
        kind: 'image',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY']
    })),
    ...['kling-v2-1', 'kling-v2-1-master', 'kling-v2-5-turbo'].map((model) => ({
        id: `kling-video-${model}`,
        provider: 'kling',
        model,
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY']
    })),
    {
        id: 'fal-video-kling-v2-6',
        provider: 'fal',
        model: 'kling-v2-6',
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['FAL_API_KEY']
    },
    ...['hailuo-2.3', 'hailuo-2.3-fast', 'hailuo-02'].map((model) => ({
        id: `hailuo-video-${model}`,
        provider: 'hailuo',
        model,
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredentials: ['HAILUO_API_KEY']
    }))
];

const preferenceByKindAndPreset = {
    text: {
        quick: ['gemini-text'],
        balanced: ['gemini-text'],
        high: ['gemini-text']
    },
    image: {
        quick: ['gemini-image', 'openai-image'],
        balanced: ['openai-image', 'gemini-image'],
        high: ['openai-image', 'gemini-image']
    },
    video: {
        quick: ['gemini-video'],
        balanced: ['gemini-video'],
        high: ['gemini-video']
    }
};

export const createProviderRegistry = (credentials = {}) => {
    const definitions = providerDefinitions.map((definition) => ({
        ...definition,
        available: definition.requiredCredentials.every((name) => Boolean(credentials[name]))
    }));

    const getDefinition = (kind, provider, model) => definitions.find(
        (definition) => definition.kind === kind && definition.provider === provider && definition.model === model
    );

    return {
        list() {
            return definitions.map(({ requiredCredentials, ...definition }) => definition);
        },

        recommend(kind, preset = 'balanced') {
            if (kind === 'rough-cut') {
                return {
                    available: true,
                    provider: 'local',
                    model: 'ffmpeg-plan',
                    kind,
                    preset,
                    reason: 'Rough-cut planning and rendering can run locally.'
                };
            }

            const preferredIds = preferenceByKindAndPreset[kind]?.[preset] || [];
            const preferred = preferredIds
                .map((id) => definitions.find((definition) => definition.id === id))
                .find((definition) => definition?.available);

            if (!preferred) {
                return {
                    available: false,
                    provider: null,
                    model: null,
                    kind,
                    preset,
                    reason: `No configured ${kind} provider is available.`
                };
            }

            return {
                available: true,
                provider: preferred.provider,
                model: preferred.model,
                kind,
                preset,
                reason: `Recommended for the ${preset} quality preset.`
            };
        },

        resolve(kind, preset, requestedProvider = 'auto', requestedModel = 'auto') {
            if (kind === 'rough-cut') return this.recommend(kind, preset);
            if (requestedProvider !== 'auto' && requestedModel !== 'auto') {
                const requested = getDefinition(kind, requestedProvider, requestedModel);
                if (!requested || requested.kind !== kind || !requested.available) {
                    const error = new Error('Requested provider or model is not configured');
                    error.statusCode = 503;
                    error.code = 'PROVIDER_NOT_CONFIGURED';
                    throw error;
                }
                return {
                    available: true,
                    provider: requested.provider,
                    model: requested.model,
                    kind,
                    preset,
                    reason: 'User-selected provider.'
                };
            }

            const recommendation = this.recommend(kind, preset);
            if (!recommendation.available) {
                const error = new Error(recommendation.reason);
                error.statusCode = 503;
                error.code = 'PROVIDER_NOT_CONFIGURED';
                throw error;
            }
            return recommendation;
        }
    };
};
