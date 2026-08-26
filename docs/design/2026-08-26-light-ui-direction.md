# AdCanvas Light UI Direction

## Subject

AdCanvas is a professional AI advertising workspace for agency creatives, art directors, storyboard artists, and AI visual producers. The primary screen must feel like a daylight art-direction table covered with production sheets, not a generic SaaS dashboard or a developer node editor.

## Reference refinement

The local reference at `http://localhost:3000/` uses oversized black grotesk type, off-white paper texture, asymmetric composition, black structural blocks, sparse gold anchors, and deliberate loading/scroll choreography. AdCanvas borrows those principles—not the portfolio layout, brand name, imagery, or spherical artwork. The product remains a dense professional workspace, but its hierarchy should be carried by scale and space rather than many colored surfaces.

## Palette

- Studio White `#F2F4EF` — textured daylight workspace background
- Paper `#FFFFFF` — project sheets and node cards
- Editorial Ink `#171918` — primary text and high-contrast structural blocks
- Proof Blue `#2457D6` — active selection, links, and structural annotations
- Aperture Gold `#C8A33A` — important calls to action and review marks
- Mint Proof `#CDEFD9` — approved and safe status
- Rule Gray `#DCE1E7` — dividers, grid, and quiet borders

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

The signature element is the aperture rail: a narrow black-and-gold structural strip paired with occasional circular status markers. It references camera gates, edit timelines, and production slates without copying the reference site's imagery.

## Self-critique

The initial direction risked becoming a colorful SaaS/editorial hybrid. After reviewing the reference, it was tightened to textured daylight white, near-black production typography, cobalt only for interaction, and sparse aperture gold. Rounded corners are reduced and varied by hierarchy; scale and space now carry more of the identity.
