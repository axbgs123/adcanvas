# AdCanvas Light UI Direction

## Subject

AdCanvas is a professional AI advertising workspace for agency creatives, art directors, storyboard artists, and AI visual producers. The primary screen must feel like a daylight art-direction table covered with production sheets, not a generic SaaS dashboard or a developer node editor.

## Reference refinement

The local reference at `http://localhost:3000/` uses oversized black grotesk type, off-white paper texture, asymmetric composition, black structural blocks, sparse gold anchors, and deliberate loading/scroll choreography. AdCanvas borrows those principles—not the portfolio layout, brand name, imagery, or spherical artwork. The product remains a dense professional workspace, but its hierarchy should be carried by scale and space rather than many colored surfaces.

## Palette

- Black `#111111` — typography, selected actions, and structural blocks
- White `#FFFFFF` — production sheets, dialogs, and editable surfaces
- Gray — `#F4F4F4` workspace, `#D9D9D9` rules, and black-opacity text/status variations

No chromatic UI colors are permitted. Status differences use icons, labels, border weight, line style, and gray value rather than hue. Generated advertising media remains in its original color.

## Typography

- Display: `PingFang SC`, `Heiti SC`, sans-serif at 700–900 weight — oversized production headlines
- Body: `PingFang SC`, `Microsoft YaHei`, sans-serif — interface copy and forms
- Utility: `SFMono-Regular`, `Menlo`, monospace — costs, status, time, and technical metadata

## Layout

The workbench uses an asymmetric editorial grid: a wide project thesis block, a narrow live-production rail, and project sheets below. The canvas remains spatial, but nodes look like printed production sheets with a colored proof strip rather than floating dark glass cards.

```text
┌──────────────────── studio header ────────────────────┐
│ AdCanvas / Projects                    quota / account │
├───────────────────────────────┬────────────────────────┤
│ large creative-work thesis    │ live production rail   │
│ and new-project action        │ budget / running tasks │
├───────────────────────────────┴────────────────────────┤
│ project sheets / recent work                           │
└────────────────────────────────────────────────────────┘
```

## Signature

The signature element is the aperture rail: a narrow black-and-gray structural strip paired with occasional circular status markers. It references camera gates, edit timelines, and production slates without copying the reference site's imagery.

## Self-critique

The initial direction risked becoming a colorful SaaS/editorial hybrid. After reviewing the reference and the final color constraint, it was tightened to textured gray-white, black production typography, white work surfaces, and gray structural states. Rounded corners are reduced and varied by hierarchy; scale, space, weight, and line treatment now carry the identity.
