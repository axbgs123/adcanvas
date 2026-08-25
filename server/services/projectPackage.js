const SCHEMA_VERSION = 1;
const EDITABLE_PACKAGE_TYPE = 'adcanvas-editable';
const HANDOFF_PACKAGE_TYPE = 'adcanvas-production-handoff';

const clone = (value) => JSON.parse(JSON.stringify(value));

const validateCanvasGraph = (canvas) => {
    if (!canvas || !Array.isArray(canvas.nodes) || !Array.isArray(canvas.groups)) {
        throw new Error('Package canvas must contain nodes and groups arrays');
    }
    const ids = canvas.nodes.map((node) => node.id);
    if (ids.some((id) => typeof id !== 'string' || !id)) {
        throw new Error('Every canvas node must have a non-empty string id');
    }
    if (new Set(ids).size !== ids.length) {
        throw new Error('Canvas contains duplicate node ids');
    }
    const idSet = new Set(ids);
    canvas.nodes.forEach((node) => {
        (node.parentIds || []).forEach((parentId) => {
            if (!idSet.has(parentId)) {
                throw new Error(`Node ${node.id} references missing parent ${parentId}`);
            }
        });
    });
};

export const buildEditableProjectPackage = ({ project, canvas, tasks = [] }) => ({
    schemaVersion: SCHEMA_VERSION,
    packageType: EDITABLE_PACKAGE_TYPE,
    exportedAt: new Date().toISOString(),
    project: {
        name: project.name,
        brand: project.brand,
        sourceProjectId: project.id
    },
    canvas: clone(canvas),
    generationHistory: tasks.map((task) => ({
        id: task.id,
        nodeId: task.nodeId,
        kind: task.kind,
        provider: task.provider,
        model: task.model,
        mode: task.mode,
        status: task.status,
        estimatedCost: task.estimatedCost,
        actualCost: task.actualCost,
        output: task.output,
        completedAt: task.completedAt
    }))
});

export const buildProductionHandoffPackage = ({ project, canvas, tasks = [] }) => {
    const adoptedNodes = canvas.nodes
        .filter((node) => node.advertising)
        .map((node) => {
            const activeVersion = node.advertising.versions?.find(
                (version) => version.id === node.advertising.activeVersionId
            );
            return {
                id: node.id,
                type: node.type,
                title: node.title || node.type,
                parentIds: node.parentIds || [],
                lifecycle: node.advertising.lifecycle,
                adoptedVersion: activeVersion ? clone(activeVersion) : {
                    id: node.advertising.activeVersionId,
                    label: 'Current working copy',
                    fields: clone(node.advertising.fields)
                },
                brandInheritance: node.advertising.brandInheritance,
                hasBrandConflict: node.advertising.hasBrandConflict
            };
        });

    const assets = tasks
        .filter((task) => task.status === 'succeeded' && task.output?.resultUrl)
        .map((task) => ({
            taskId: task.id,
            nodeId: task.nodeId,
            kind: task.kind,
            provider: task.provider,
            model: task.model,
            resultUrl: task.output.resultUrl,
            assetId: task.output.assetId || null
        }));

    return {
        schemaVersion: SCHEMA_VERSION,
        packageType: HANDOFF_PACKAGE_TYPE,
        exportedAt: new Date().toISOString(),
        project: {
            name: project.name,
            brand: project.brand,
            sourceProjectId: project.id
        },
        production: {
            adoptedNodes,
            assets,
            missingItems: adoptedNodes
                .filter((node) => node.hasBrandConflict || node.lifecycle === 'stale')
                .map((node) => ({ nodeId: node.id, title: node.title, reason: node.hasBrandConflict ? 'Brand conflict' : 'Stale dependency' }))
        }
    };
};

export const validateEditableProjectPackage = (value) => {
    if (!value || typeof value !== 'object') throw new Error('Project package must be a JSON object');
    if (value.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported package schema version: ${value.schemaVersion}`);
    if (value.packageType !== EDITABLE_PACKAGE_TYPE) throw new Error('Only editable AdCanvas packages can be imported');
    if (!value.project?.name || typeof value.project.name !== 'string') throw new Error('Package project name is required');
    validateCanvasGraph(value.canvas);
    return value;
};

export const projectPackageConstants = {
    SCHEMA_VERSION,
    EDITABLE_PACKAGE_TYPE,
    HANDOFF_PACKAGE_TYPE
};
