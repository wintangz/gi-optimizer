# Implementation Plan: Per-Effect Elemental Resonance Controls (`resonance-effects`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/resonance-effects/spec.md`

## Summary

Replace the single vague `"Elemental Resonance"` row with a GO-style per-effect resonance list below the master `"Elemental Resonance"` all-on/all-off switch:
1. **Vendored GO Resonance Catalogue & Per-Effect User Settings (`@gi/presets`)**:
   - Import vendored GO resonance strings from `vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en/elementalResonance_gen.json` and `vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/elementalResonance.json`.
   - Define `RESONANCE_EFFECT_KEYS`, `ResonanceEffectKey`, `ResonanceEffectsStateMap`, `TriggeredResonanceDescriptor`, and `listTriggeredResonances(teamOrPreset)` in `packages/presets/src/settings.ts` (re-exported in `packages/presets/src/index.ts`).
   - Add `resonanceEffectsByPreset?: Record<string, ResonanceEffectsStateMap>` and `resonanceEffects?: ResonanceEffectsStateMap` to `OptimizerSettings` (defaulting to `{}` in `DEFAULT_OPTIMIZER_SETTINGS`), with helpers `normalizeResonanceEffectKey`, `getPresetResonanceEffects`, `isPresetResonanceEffectEnabled`, `setPresetResonanceEffectEnabled`, and `hasDisabledResonanceEffects`.
   - Update `setPresetResonanceEnabled(settings, presetId, true)` to clear `false` per-effect overrides for that preset so toggling Master ON acts as an all-on control, and update `resetMemberConditionalOverrides(settings, presetId)` to clear `resonanceEffectsByPreset[presetId]`.
2. **Independent Per-Effect Resonance Filtering in the Engine (`@gi/engine`)**:
   - Add `resonanceEffects?: ResonanceEffectsStateMap` to `BuildSelection`, `HydratePresetTeamOptions`, `TeamOptimizeOptions`, `session.optimize`, and `compareWeapons`.
   - In `hydratePresetTeam` (`packages/engine/src/session.ts`), apply `opts?.resonanceEffects` for triggered resonances so any resonance effect with `resonanceEffects[effectKey] === false` sets `effectiveResonance[capEle] = 'off'`, `effectiveResonance[ele] = 'off'`, and `effectiveResonance[effectKey] = 'off'` (and sub-trigger keys `'off'` for that resonance) without mutating `preset.teamConditional.resonance`, and include disabled resonance effects in `presetTeamFingerprint`.
   - In `getEffectiveResonanceData` (`packages/engine/src/teamData.ts`), honour per-effect `'off'` flags for all 8 GO resonances (`ProtectiveCanopy`, `FerventFlames`, `SoothingWater`, `ShatteringIce`, `HighVoltage`, `ImpetuousWinds`, `EnduringRock`, `SprawlingGreenery`), deleting only the disabled resonance's `premod`/`total` stat keys (and suppressing only that element in `smallTeamEleCounts`) while keeping all other triggered resonances untouched. When Master is ON and all triggered effects are ON, return `resonanceData` unchanged so all golden fixtures remain 100% byte-identical.
   - Propagate `resonanceEffects` through `evaluate`, `optimize`, `runSolver`, `compareWeapons`, and `optimizeTeam`.
3. **Resonance Effects List UI & Optimize Flow Wiring (`@gi/web`)**:
   - In `ConditionalTogglePanel` (`apps/web/src/components/ConditionalTogglePanel.tsx`), render `data-testid="team-resonance-effects-list"` below `data-testid="team-resonance-master-row"`, with one `data-testid="resonance-effect-row-<key>"` row per triggered resonance showing element icons, the vendored GO name (`data-testid="resonance-effect-name-<key>"`), the plain-language summary + vendored GO description with any secondary condition (`data-testid="resonance-effect-desc-<key>"`), and its own `role="switch"` toggle (`data-testid="resonance-effect-toggle-<key>"`).
   - In `apps/web/src/app/optimize/page.tsx`, wire `activeResonanceEffects` into Current build evaluation, Top-N build evaluation, Weapon Comparison build evaluation, and Team Optimization.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router, static export)  
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, vendored `@genshin-optimizer/gi/*`  
**Storage**: Browser IndexedDB (`useOptimizerSettings` in `apps/web/src/lib/storage/useGood.ts`)  
**Testing**: Vitest (`packages/presets/test/settings.test.ts`, `packages/engine/test/buff-coverage.test.ts`, `apps/web/test/ConditionalTogglePanel.test.tsx`)  
**Target Platform**: Client-side Web Worker + static browser bundle  
**Performance Goals**: Zero overhead on solver hot path; default ON path returns exact `resonanceData` reference  
**Constraints**: Never modify `vendor/genshin-optimizer`; never mutate bundled preset JSON; all golden fixtures byte-identical at defaults

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — Per-effect resonance settings persist in IndexedDB via `OptimizerSettings`; calculation runs in the client-side engine/Web Worker.
- **II. GO Formula Fidelity**: PASS — Resonance names and descriptions come directly from vendored GO localization JSON; per-effect node filtering operates on GO's `resonanceData` in `packages/engine/src/teamData.ts` without modifying `vendor/genshin-optimizer`; default ON preserves all GO golden fixtures bit-for-bit.
- **III. Import Is GOOD Only**: PASS — No change to import format.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — Per-effect states live in `OptimizerSettings.resonanceEffectsByPreset`, never in bundled preset JSON files.
- **V. Single-Character, Akasha-Style Objective**: PASS — Consistent per-effect resonance state across Current build evaluation, single optimize, weapon compare, and team optimize.

## Project Structure

### Documentation (this feature)

```text
specs/resonance-effects/
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
