# Implementation Plan: Master Elemental Resonance Toggle (`resonance-master-toggle`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/resonance-master-toggle/spec.md`

## Summary

Add a per-preset master Elemental Resonance on/off toggle (`Elemental Resonance`) to `OptimizerSettings`, the engine calculation/optimization pipeline, and the `Buffs & Passives` UI panel:
1. **Per-Preset Settings (`@gi/presets`)**: Add `resonanceEnabledByPreset?: Record<string, boolean>` (and optional run-level `resonanceEnabled?: boolean`) to `OptimizerSettings` in `packages/presets/src/settings.ts`, defaulting to `true` (ON), with helpers `getPresetResonanceEnabled(settings, presetId)` and `setPresetResonanceEnabled(settings, presetId, enabled)`. Update `resetMemberConditionalOverrides(settings, presetId)` (when resetting all overrides for a preset) to also clear the preset's resonance override back to default (`true`).
2. **Engine Resonance Suppression (`@gi/engine`)**: Add `resonanceEnabled?: boolean` to `BuildSelection`, `HydratePresetTeamOptions`, `optimize`, `compareWeapons`, and `optimizeTeam`. When `resonanceEnabled === false`, `hydratePresetTeam` marks `effectiveResonance` with `__masterOff: 'off'` (included in `presetTeamFingerprint`) and `getEffectiveResonanceData` in `packages/engine/src/teamData.ts` returns an empty `Data` object (`{}`), completely suppressing all elemental resonance contributions (`resonanceData` and `smallTeamEleCounts`) and eliminating `Elemental Resonance` (`category: 'resonance'`) from stat and damage formula breakdowns while leaving `preset.teamConditional.resonance` and per-trigger overrides intact.
3. **Web UI & Optimize Flow (`@gi/web`)**: Render a team-level `"Elemental Resonance"` switch (`role="switch"`, `aria-checked`, `ON`/`OFF`) in `ConditionalTogglePanel` (`apps/web/src/components/ConditionalTogglePanel.tsx`) and wire `activeResonanceEnabled` through Current build evaluation, single-character optimization, weapon comparison, and team-wide optimization in `apps/web/src/app/optimize/page.tsx`.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router, static export)  
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, vendored `@genshin-optimizer/gi/*`  
**Storage**: Browser IndexedDB (`useOptimizerSettings` in `apps/web/src/lib/storage/useGood.ts`)  
**Testing**: Vitest (`packages/presets/test/settings.test.ts`, `packages/engine/test/buff-coverage.test.ts`, `apps/web/test/ConditionalTogglePanel.test.tsx`)  
**Target Platform**: Client-side Web Worker + static browser bundle  
**Performance Goals**: Zero overhead on solver hot path; default ON path is bit-for-bit identical  
**Constraints**: Never modify `vendor/genshin-optimizer`; never mutate bundled preset JSON; all golden fixtures byte-identical at default (ON)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — Setting persists in IndexedDB via `OptimizerSettings`; calculation runs in the client-side engine/Web Worker.
- **II. GO Formula Fidelity**: PASS — Suppresses `resonanceData` in the GO `TeamData` bundle adapter (`packages/engine/src/teamData.ts`) without touching vendored GO sheets; default ON preserves all GO golden fixtures bit-for-bit.
- **III. Import Is GOOD Only**: PASS — No change to import format.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — The master toggle is stored in user `OptimizerSettings` (`resonanceEnabledByPreset`), never in bundled preset JSON files.
- **V. Single-Character, Akasha-Style Objective**: PASS — Consistent resonance state across Current build evaluation, single optimize, weapon compare, and team optimize.

## Project Structure

### Documentation (this feature)

```text
specs/resonance-master-toggle/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   ├── settings.ts
│   └── index.ts
└── test/
    └── settings.test.ts

packages/engine/
├── src/
│   ├── types.ts
│   ├── teamData.ts
│   ├── session.ts
│   ├── solver.ts
│   └── index.ts
└── test/
    └── buff-coverage.test.ts

apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   └── optimize/page.tsx
│   └── components/
│       └── ConditionalTogglePanel.tsx
└── test/
    └── ConditionalTogglePanel.test.tsx
```

**Structure Decision**: Existing monorepo layering (`@gi/presets` → `@gi/engine` → `@gi/web`) is preserved with zero new packages or external dependencies.
