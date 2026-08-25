# AI Advertising Canvas Implementation Plan

Date: 2026-08-25

Branch: `codex/ai-ad-platform`

Design source: `/Users/baiyan1/Documents/文稿/docs/superpowers/specs/2026-08-25-ai-ad-canvas-platform-design.md`

## Baseline audit

- The upstream production build succeeds with Vite.
- `src/App.tsx` is about 1,400 lines and coordinates nearly all canvas features.
- `server/index.js` is about 1,200 lines and combines storage, workflows, media, and integrations.
- Workflow APIs are hard-coded to `http://localhost:3001`, blocking portable web deployment.
- Workflow persistence is local JSON and has no user/project isolation.
- The production bundle is about 2.1 MB before gzip and needs later code splitting.
- No automated test script is defined in `package.json`.

## Delivery strategy

Build an advertising domain layer around the existing canvas before attempting cloud persistence. The existing image/video nodes remain available as technical nodes. Advertising nodes use their own registry and rendering component so domain behavior does not spread through every existing component.

## Milestone 1 — Advertising domain foundation

### Task 1: Define advertising domain contracts

Files:

- Create `src/domain/advertising/types.ts`
- Create `src/domain/advertising/nodeRegistry.ts`
- Create `src/domain/advertising/workflowTemplate.ts`
- Modify `src/types.ts`

Requirements:

- Add Brief, Brand, Creative Route, Moodboard, Script, Storyboard, Shot, Edit Plan, and Delivery node types.
- Define node lifecycle, version, adoption, stale dependency, and brand constraint fields.
- Centralize labels, colors, descriptions, default fields, and connection rules in a registry.
- Provide a deterministic starter workflow builder that creates a Brief and three creative branches without invoking paid generation.

Verification:

- TypeScript compilation passes.
- Registry contains every advertising node type exactly once.
- Starter workflow IDs and edges are valid and every parent exists.

### Task 2: Render advertising business cards

Files:

- Create `src/components/canvas/AdvertisingNodeContent.tsx`
- Modify `src/components/canvas/NodeContent.tsx`
- Modify `src/components/canvas/CanvasNode.tsx`

Requirements:

- Show a business-friendly card instead of raw model controls by default.
- Display node purpose, lifecycle state, stale warning, adopted version, fields, and brand inheritance.
- Allow direct manual editing.
- Preserve access to advanced technical settings for later model controls.

Verification:

- Every advertising node renders without a model result.
- Manual text changes persist through the existing `onUpdate` path.
- Existing image, video, text, and editor nodes still render.

### Task 3: Expose business nodes in creation flows

Files:

- Modify `src/components/ContextMenu.tsx`
- Modify `src/hooks/useNodeManagement.ts`
- Modify `src/utils/connectionHelpers.ts`

Requirements:

- Separate “Advertising workflow” from “Generation tools” in the node menu.
- Create advertising nodes with registry defaults.
- Validate common business dependencies while keeping existing technical connections working.

Verification:

- Nodes can be manually created from blank canvas and connectors.
- Invalid business connections return an actionable reason.
- Existing node creation remains backward compatible.

## Milestone 2 — Product shell and project workbench

### Task 4: Add an online-product shell

Files:

- Create `src/app/ProductShell.tsx`
- Create `src/features/projects/ProjectWorkbench.tsx`
- Create `src/features/projects/projectStore.ts`
- Modify `src/index.tsx`
- Modify `index.html`

Requirements:

- Add invite-demo login state and a project workbench.
- Show recent projects, tasks, and demo quota.
- Open the existing canvas inside a selected project context.
- Replace visible TwitCanva branding while retaining LICENSE and NOTICE files.

### Task 5: Replace hard-coded API origins

Files:

- Create `src/services/apiClient.ts`
- Modify hooks and services that use `http://localhost:3001`
- Modify `vite.config.ts`

Requirements:

- Use relative `/api` routes in production.
- Use a Vite development proxy locally.
- Centralize JSON error handling and cancellation.

## Milestone 3 — Project persistence and task layer

### Task 6: Split server modules

Files:

- Create `server/app.js`
- Create `server/routes/projects.js`
- Create `server/routes/canvas.js`
- Create `server/routes/tasks.js`
- Create `server/routes/assets.js`
- Create `server/services/projectRepository.js`
- Create `server/services/taskRepository.js`
- Reduce `server/index.js` to bootstrap and legacy route mounting.

Requirements:

- Introduce project/user boundaries using an invite demo identity.
- Persist projects, canvases, nodes, versions, tasks, assets, and cost records.
- Keep existing generation routes available behind the task service.

### Task 7: Add asynchronous generation contracts

Files:

- Create `src/domain/generation/types.ts`
- Create `src/features/tasks/TaskCenter.tsx`
- Create `server/services/generationQueue.js`
- Adapt `src/services/generationService.ts`

Requirements:

- Use queued/running/succeeded/failed/cancelled states.
- Require confirmation metadata for paid tasks.
- Record estimated and actual cost.
- Avoid duplicate submission with idempotency keys.

## Milestone 4 — Versions, branches, brand rules, export

### Task 8: Version and stale propagation

Files:

- Create `src/domain/advertising/versioning.ts`
- Create `src/features/versions/VersionPanel.tsx`
- Integrate with node updates and workflow persistence.

Requirements:

- Keep multiple versions per node and one adopted version.
- Mark descendants stale when an adopted upstream version changes.
- Never auto-regenerate descendants.

### Task 9: Brand inheritance

Files:

- Create `src/domain/advertising/brandRules.ts`
- Create `src/features/brand/BrandProfilePanel.tsx`
- Integrate warnings into advertising cards and generation confirmation.

### Task 10: Project packages

Files:

- Create `src/domain/export/projectPackage.ts`
- Create `server/routes/exports.js`
- Create `server/services/exportService.js`
- Create `src/features/export/ExportDialog.tsx`

Requirements:

- Export/import an editable, versioned project package.
- Export a production handoff package containing only adopted assets.
- Validate schema and file integrity before import.

## Quality gates

- Add a TypeScript no-emit check.
- Add unit tests for registries, connection rules, stale propagation, brand inheritance, cost limits, and package validation.
- Add integration tests for project isolation and task idempotency.
- Add one browser-level happy path for Brief → branches → storyboard → selected assets → export.
- Keep upstream image/video flows functional throughout the migration.
- Do not implement payments, realtime collaboration, or a professional multitrack editor in the four-week Demo.
