# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Genshin Impact players and theorycrafters who export their account inventory using GOOD v1–v3 scanners (such as Irminsul or Artiscan) and want fast, accurate artifact and weapon optimization without manually wiring multi-step formula trees from scratch.

## Product Purpose

`gi-optimizer` is a personal, preset-first Genshin Impact build optimizer that runs 100% locally in the browser with zero server uploads. Success means a player can import their GOOD JSON once, pick a curated preset (or author a custom team and rotation), adjust team buffs, weapon choices, or stat floors, and immediately evaluate and rank builds with exact Genshin Optimizer formula parity.

## Positioning

Combines exact vendored Genshin Optimizer (`@frzyc/genshin-optimizer`) character, weapon, artifact, and resonance sheets with a preset-first workflow: curated Akasha leaderboard presets (fixed target/teammate investment, free weapon choice, user artifacts), Official meta team presets (owned-first teammate builds with simulated fallback and Fast Mode "Virtual 6th Artifact" adjustments), and custom team/rotation authoring, backed by an in-browser Web Worker branch-and-bound solver.

## Operating Context

- **Routes & Workflows**:
  - `/` (`apps/web/src/app/page.tsx`): Onboarding and 3-step workflow hub (Import Account Data → Pick or Build a Preset → Run Optimizer).
  - `/import` (`apps/web/src/app/import/page.tsx`): Drag-and-drop or paste GOOD v1–v3 JSON import, validation diagnostics, and searchable inventory tables (characters, weapons, artifacts with RV%).
  - `/presets` (`apps/web/src/app/presets/page.tsx`): Browse, filter, and inspect bundled Official and Akasha presets (team roster, rotation breakdown, enemy assumptions, provenance).
  - `/teams` (`apps/web/src/app/teams/page.tsx`): Create, fork, edit, and export/import custom team presets and multi-hit rotations.
  - `/optimize` (`apps/web/src/app/optimize/page.tsx`): 5-stage optimization workspace:
    1. Preset Picker
    2. Mode Selection (`Optimize 1 Character`, `Compare Weapons`, `Optimize Team`)
    3. Team & Buffs (per-effect Elemental Resonance controls, member selector tabs, unified member editor with weapon modal picker, Base → Final stat grid, teammate Fast Mode modal, and conditional buff controls)
    4. Artifact Settings (Artifact Set Filter & Protected Characters inline collapsible, Artifact Pool Filters modal editor, Stat Constraints modal editor)
    5. Run & Results (Current vs. Top N ranked builds, multi-weapon comparison rankings, conflict-free team optimization, inline accordion Build Details with per-instance formula and stat attribution breakdowns, and `Verify GO (.json)` export)
- **Data & Storage**: All user account data (`GOOD` JSON), custom presets, and optimizer settings persist locally in browser `IndexedDB` (`gi-optimizer-db`) and `localStorage`/`sessionStorage`.

## Capabilities and Constraints

- **Exact Formula Parity**: Damage instances, stat breakdowns, conditionals, and elemental resonances are evaluated through the vendored Genshin Optimizer calculation graph (`@gi/engine`), verified against golden fixtures (`packages/engine/test/goldens/`).
- **100% Client-Side Execution**: Static-exportable Next.js App Router frontend (`output: 'export'` compatible) paired with bundled Web Workers (`optimizer.worker.js`, `BackgroundWorker.js`). No backend server or external network requests during usage.
- **Preset Source Rules**:
  - **Akasha Presets (`source: 'akasha'`)**: Target investment (level, ascension, constellation, talents, baked-in conditional assumptions) and teammate builds are fixed by the leaderboard case; target weapon is freely selectable (defaulting to the case weapon); only the user's artifacts feed the solver.
  - **Official Presets (`source: 'official'`)**: Owned-first teammate resolution (uses imported GOOD character/weapon/artifacts when owned, with per-member toggle to Simulated TC build and Fast Mode Virtual 6th Artifact adjustments).
  - **Custom Presets (`source: 'custom'`)**: User-authored 1–4 member teams, enemy level/resistance overrides, and multi-member rotation targets.
- **Terminology**:
  - `Current`: The character's currently equipped build in imported GOOD data.
  - `Roll Value (RV%)`: Sum of substat roll percentages relative to maximum 5★ roll values.
  - `Fast Mode (Virtual 6th Artifact)`: Teammate-only stat adjustment layer injecting positive or negative stat rolls at the artifact layer.

## Brand Commitments

- **Name**: `gi-optimizer`
- **Voice**: Direct, transparent, player-facing terminology (human-readable rotation labels, plain-language conditional descriptions, explicit truncation and constraint notices, never raw internal formula keys).

## Evidence on Hand

- Bundled preset catalogue (`packages/presets/presets/official/` and `packages/presets/presets/akasha/`) with recorded provenance and golden regression fixtures (`packages/engine/test/goldens/`).
- Vendored Genshin Optimizer game data, icons (`apps/web/public/game-icons/`), and localization sheets (`packages/gi-wr/`).
- No external customer testimonials, marketing claims, or hosted cloud service exist; future work must not fabricate them.

## Product Principles

1. **Formula Honesty Over Approximation**: Every number, stat diff, and breakdown tree must reconcile to the Genshin Optimizer calculation graph and be exportable via `Verify GO (.json)`.
2. **Preset-First Speed, Full Control When Needed**: Sensible defaults (curated rotations, owned gear detection, triggered resonances) let players optimize immediately while keeping every conditional, weapon, pool filter, and stat constraint inspectable and overridable.
3. **Zero-Upload Local Privacy**: Account inventories, custom teams, and settings stay strictly in the user's browser storage.
4. **Scannable Operational Clarity**: High-density numerical comparisons (damage totals, relative deltas, stat tables, 5-slot artifact strips) prioritize tabular alignment, clear baseline references (`vs. Current`, `vs. leader`, `vs. weapon best`), and uncluttered progressive disclosure.
