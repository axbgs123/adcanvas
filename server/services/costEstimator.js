const COST_TABLE_CNY = {
    text: {
        quick: 0.01,
        balanced: 0.03,
        high: 0.08
    },
    image: {
        quick: 0.2,
        balanced: 0.5,
        high: 1
    },
    video: {
        quick: 5,
        balanced: 10,
        high: 20
    },
    'rough-cut': {
        quick: 0.05,
        balanced: 0.1,
        high: 0.2
    }
};

export const SUPPORTED_TASK_KINDS = Object.freeze(Object.keys(COST_TABLE_CNY));
export const SUPPORTED_QUALITY_PRESETS = Object.freeze(['quick', 'balanced', 'high']);

export const estimateGenerationCost = (kind, preset = 'balanced') => {
    if (!SUPPORTED_TASK_KINDS.includes(kind)) {
        const error = new Error(`Unsupported generation task kind: ${kind}`);
        error.statusCode = 400;
        throw error;
    }
    if (!SUPPORTED_QUALITY_PRESETS.includes(preset)) {
        const error = new Error(`Unsupported quality preset: ${preset}`);
        error.statusCode = 400;
        throw error;
    }

    return {
        kind,
        preset,
        currency: 'CNY',
        estimatedCost: COST_TABLE_CNY[kind][preset],
        pricingVersion: 'demo-2026-08-25',
        disclaimer: 'Demo estimate for budget controls; provider billing remains authoritative.'
    };
};
