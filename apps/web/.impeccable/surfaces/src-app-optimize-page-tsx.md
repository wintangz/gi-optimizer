---
version: 1
slug: "src-app-optimize-page-tsx"
primary_target: "src/app/optimize/page.tsx"
related_targets: ["src/components/OptimizeViews.tsx","src/components/ConditionalTogglePanel.tsx"]
---

# Surface Brief: /optimize Workbench

- **Mode:** Operate
- **Scope:** `src/app/optimize/page.tsx` and supporting stage components (`src/components/OptimizeViews.tsx`, `src/components/ConditionalTogglePanel.tsx`)
- **Audience & Job:** Competitive Genshin Impact optimizers and theorycrafters configuring a 4-character rotation preset, adjusting weapons/resonance/buffs/constraints, and solving for top artifact builds.
- **Constraints:** Preserve all existing `data-testid` attributes, ARIA roles/labels, modal/inline editor rulings, and solver/engine behavior so the full Vitest suite passes unchanged.

## Direction contract

THESIS: The `/optimize` page operates as a Dual-Deck Instrument Panel that gives full horizontal breathing room to preset selection, mode switching, and 4-member Team & Buffs configuration in the upper deck, then pairs Stage 4 (Artifact Settings) beside Stage 5 (Run & Results) in a responsive lower split deck—refusing the endless single-column scroll where solver constraints are divorced from the results dock.

OWN-WORLD: Three-level nocturnal slate hierarchy (`#0d1017` Abyssal Slate canvas, `#161b26` Obsidian stage panels, `#202736` Astral Slate cards, `#11151f` Trench Inset wells) framed by `1px solid #2f3950` borders, Leyline Cobalt (`#6ea0ff`) active rings and numbered stage badges (`01`–`05`), Verdigris Signal (`#4cc38a`) positive deltas, and `tabular-nums` alignment across every stat and damage readout.

STORY: The player scans the sticky stage-wayfinding header strip to see their active preset, mode, team buff count, and constraint summary at a glance; configures their preset, mode, and 4-tab team setup across the wide upper deck; and adjusts artifact pool/stat constraints directly alongside the live Stage 5 Run & Results dock in the lower deck.

FIRST VIEWPORT: A compact flight-deck header with a live 5-stage wayfinding strip (`01 Preset`, `02 Mode`, `03 Team & Buffs`, `04 Artifacts`, `05 Run & Results`) over the upper configuration deck (Stages 1 & 2 paired cleanly on desktop above Stage 3's 4-column member selector tabs and unified member editor), leading into the lower two-column split where Stage 4's summary-row rail sits beside Stage 5's high-impact Run command bar and build comparison list.

FORM: Dual-Deck Instrument Panel (Candidate 7 on the grounded list, dealt at position 2), seed:416aa8a2be1bb1a5.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
