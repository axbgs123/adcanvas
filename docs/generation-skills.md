# AdCanvas generation skills

AdCanvas generation skills are original advertising-domain wrappers. They convert a business node, brand constraints, references, aspect ratio, and duration into a provider-neutral generation request. They do not copy upstream workflow JSON or claim upstream examples as AdCanvas output.

| Skill | Output | Reference requirement | Primary use |
| --- | --- | --- | --- |
| 产品主视觉 | Image | 0–3 | Hero image, poster, campaign cover |
| 产品换景 | Image | 1–3 | Keep product identity while changing the scene |
| 电影感产品镜头 | Video | 0–1 | Controlled commercial product shot |
| 首尾帧转场 | Video | Exactly 2 | Directed transition between approved frames |
| 竖屏 UGC 开场 | Video | 0–1 | Short-form hook with mobile-camera language |

## Reference projects

- [OpenAI Cookbook: GPT Image prompting guide](https://github.com/openai/openai-cookbook/blob/main/examples/multimodal/image-gen-models-prompting-guide.ipynb) — MIT. Referenced for structured image prompts, explicit invariants, identity preservation, and iterative edits.
- [GoogleCloudPlatform/generative-ai: Veo 3 video generation](https://github.com/GoogleCloudPlatform/generative-ai/blob/main/vision/getting-started/veo3_video_generation.ipynb) — Apache-2.0. Referenced for separating subject, action, scene, camera, temporal behavior, and audio.
- [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) — MIT. Referenced for composable image-edit, image-to-video, first/last-frame, and merge-workflow boundaries.

The runtime definitions live in `src/domain/generation/skillRegistry.ts`. Each definition has a stable ID and version so future prompt changes or additional providers do not silently alter historical tasks.
