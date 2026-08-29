<div align="center">
  <img src="public/adcanvas-mark.svg" alt="AdCanvas" width="88" />
  <h1>AdCanvas</h1>
  <p>An AI-powered freeform canvas for advertising ideation and production</p>
  <p><a href="./README.md">简体中文</a> · <strong>English</strong></p>
</div>

![AdCanvas project workbench](docs/design/screenshots/light-workbench.png)

## Overview

AdCanvas is a PC web demo built for advertising creative teams. It brings the advertising brief, brand rules, creative routes, moodboards, scripts, storyboards, generated shots, edit plans, and delivery packages into one extensible canvas. AI assists with generation and organization, while people retain control over judgment, revision, and final version adoption.

## Current Demo

- Advertising project workbench with local project persistence
- Nine advertising business-node types with manual creation, editing, and connections
- Structured workflow drafts that generate three creative routes from a brief
- Project-level brand rules, prohibited content, required elements, and local node overrides
- Cost confirmation, budget reservation, idempotency, cancellation, and retry for generation tasks
- Node version saving, adoption, branching, and downstream stale-state propagation
- Editable project-package import/export and production handoff manifests
- Explainable canvas-action agent and a separate creative-chat agent
- Provider Adapters for Gemini, OpenAI, and other models, with safe no-key fallback behavior
- FFmpeg multi-shot rough-cut rendering
- Monochrome desktop workbench and canvas interface

## Core Workflow

```text
Advertising Brief
  → Brand Constraints
  → Creative Routes
  → Moodboard / Script
  → Storyboard
  → Shot Generation
  → Edit Plan
  → Delivery Package
```

Core business capabilities expose extension points through the node registry, Provider Adapter layer, and task executors. New advertising nodes, model providers, review rules, and delivery formats can be added later without rebuilding the core workflow.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Express
- Three.js / React Three Fiber
- Provider layers for Gemini, OpenAI, Kling, Hailuo, and Fal.ai
- FFmpeg
- Node.js native test runner

## Run Locally

Node.js 20 or later and a system installation of FFmpeg are recommended.

```bash
git clone https://github.com/axbgs123/adcanvas.git
cd adcanvas
npm install
npm run dev
```

The development servers run at:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Without model credentials, the workbench, business nodes, version system, task confirmation flow, and local explainable agent remain available. Real generation tasks report that their provider is unavailable instead of returning a fabricated success.

Optional environment variables:

```env
GEMINI_API_KEY=
OPENAI_API_KEY=
KLING_ACCESS_KEY=
KLING_SECRET_KEY=
HAILUO_API_KEY=
FAL_API_KEY=
DEMO_ACCOUNT_BUDGET_CNY=200
FFMPEG_PATH=ffmpeg
```

## Verification

```bash
npm run typecheck
npm run test:server
npm run test:domain
npm run build
```

The current suite contains 30 automated tests covering provider selection, task state transitions, budget and cost confirmation, project packages, brand constraints, canvas-operation planning, node versions, and FFmpeg rough-cut rendering.

## Documentation

- [Product and implementation plan](docs/plans/2026-08-25-ai-ad-platform-implementation-plan.md)
- [Frontend visual direction](docs/design/2026-08-26-light-ui-direction.md)
- [Video editor node](docs/video-editor-node.md)

## Attribution and License

AdCanvas is derived from the Apache-2.0-licensed [SankaiAI/TwitCanva-Video-Workflow](https://github.com/SankaiAI/TwitCanva-Video-Workflow). The original [`LICENSE`](LICENSE), [`NOTICE`](NOTICE), and copyright notices are retained.

This README presents only AdCanvas pages and functionality. Upstream showcase videos are not presented as AdCanvas work.
