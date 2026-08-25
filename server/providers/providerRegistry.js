const providerDefinitions = [
    {
        id: 'gemini-text',
        provider: 'google',
        model: 'gemini-2.0-flash',
        kind: 'text',
        presets: ['quick', 'balanced', 'high'],
        requiredCredential: 'GEMINI_API_KEY'
    },
    {
        id: 'openai-image',
        provider: 'openai',
        model: 'gpt-image-1.5',
        kind: 'image',
        presets: ['balanced', 'high'],
        requiredCredential: 'OPENAI_API_KEY'
    },
    {
        id: 'gemini-image',
        provider: 'google',
        model: 'gemini-3-pro-image-preview',
        kind: 'image',
        presets: ['quick', 'balanced', 'high'],
        requiredCredential: 'GEMINI_API_KEY'
    },
    {
        id: 'gemini-video',
        provider: 'google',
        model: 'veo-3.1-fast-generate-preview',
        kind: 'video',
        presets: ['quick', 'balanced', 'high'],
        requiredCredential: 'GEMINI_API_KEY'
    }
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
        available: Boolean(credentials[definition.requiredCredential])
    }));

    const getDefinition = (provider, model) => definitions.find(
        (definition) => definition.provider === provider && definition.model === model
    );

    return {
        list() {
            return definitions.map(({ requiredCredential, ...definition }) => definition);
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
                const requested = getDefinition(requestedProvider, requestedModel);
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
