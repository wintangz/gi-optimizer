# Tasks: Per-Effect Elemental Resonance Controls (`resonance-effects`)

**Input**: Design documents from `/specs/resonance-effects/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

## Phase 1: Foundational Catalogue & Per-Effect Settings (`@gi/presets`)

**Purpose**: Load vendored GO resonance names/descriptions, derive triggered resonances per team composition, and manage per-preset per-effect user settings in `@gi/presets`.

- [x] T001 Import vendored `elementalResonance_gen.json` and `elementalResonance.json`, define `RESONANCE_EFFECT_KEYS`, `ResonanceEffectKey`, `ResonanceEffectsStateMap`, `TriggeredResonanceDescriptor`, `listTriggeredResonances`, `normalizeResonanceEffectKey`, `getPresetResonanceEffects`, `isPresetResonanceEffectEnabled`, `setPresetResonanceEffectEnabled`, and `hasDisabledResonanceEffects`, and update `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `setPresetResonanceEnabled`, and `resetMemberConditionalOverrides` in `packages/presets/src/settings.ts` and `packages/presets/src/index.ts`
- [x] T002 [P] Add unit tests in `packages/presets/test/settings.test.ts` covering `listTriggeredResonances` (single-resonance, dual-resonance, 4-element `ProtectiveCanopy`, and <4-member teams), vendored GO names/descriptions, per-effect settings helpers, team composition re-derivation, and `resetMemberConditionalOverrides`

---

## Phase 2: User Story 2 - Independent Per-Effect Engine Evaluation & Optimization (`@gi/engine`)

**Goal**: Honour per-effect resonance switches independently across `evaluate`, `optimize`, `compareWeapons`, `optimizeTeam`, and `hydrateTeamIntoDb` while keeping default ON behaviour bit-for-bit identical.

**Independent Test**: Run `packages/engine/test/buff-coverage.test.ts` verifying `official/skirk-freeze` (`ShatteringIce` OFF drops CR by `0.15` and lowers total; back ON restores total bit-for-bit) and dual-resonance independence (`FerventFlames` + `SoothingWater` and `SoothingWater` + `ShatteringIce` toggling independently across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`).

- [x] T003 [US2] Add `resonanceEffects?: ResonanceEffectsStateMap` to `BuildSelection` and `TeamOptimizeOptions`, and re-export all new resonance types and helpers in `packages/engine/src/types.ts` and `packages/engine/src/index.ts`
- [x] T004 [US2] Update `getEffectiveResonanceData` in `packages/engine/src/teamData.ts` to support per-effect suppression for all 8 GO resonances (`ProtectiveCanopy`, `FerventFlames`, `SoothingWater`, `ShatteringIce`, `HighVoltage`, `ImpetuousWinds`, `EnduringRock`, `SprawlingGreenery`) independently
- [x] T005 [US2] Update `presetTeamFingerprint`, `hydratePresetTeam`, `hydrateTeamIntoDb`, `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam` in `packages/engine/src/session.ts` and `runSolver` in `packages/engine/src/solver.ts` to propagate `resonanceEffects` (filtering against triggered team resonances so stored states apply only while triggered)
- [x] T006 [US2] Add engine tests in `packages/engine/test/buff-coverage.test.ts` for `official/skirk-freeze` per-effect `ShatteringIce` toggling and dual-resonance independent toggling across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`

---

## Phase 3: User Story 1 - Per-Effect Resonance List UI & Optimize Page Wiring (`@gi/web`)

**Goal**: Render the triggered resonance list with vendored GO names, plain-language + condition descriptions, and per-effect ON/OFF switches below the master `"Elemental Resonance"` switch in `ConditionalTogglePanel`, and wire `activeResonanceEffects` through `apps/web/src/app/optimize/page.tsx`.

**Independent Test**: Run `apps/web/test/ConditionalTogglePanel.test.tsx` verifying `official/skirk-freeze` shows `Shattering Ice` with its `+15% CRIT Rate` vs `Frozen` description and toggle switch, dual-resonance teams list both resonances and toggle them independently, preset/team changes re-derive the list, and Master switch + `Reset All to Defaults` work seamlessly.

- [x] T007 [US1] Update `apps/web/src/components/ConditionalTogglePanel.tsx` and `apps/web/src/app/globals.css` to render `team-resonance-effects-list` below `team-resonance-master-row` with one row per triggered resonance (`resonance-effect-row-<key>`, `resonance-effect-name-<key>`, `resonance-effect-desc-<key>`, `resonance-effect-toggle-<key>`)
- [x] T008 [US1] Wire `activeResonanceEffects` through Current build evaluation, Top-N build evaluation, Weapon Comparison build evaluation, and Team Optimization in `apps/web/src/app/optimize/page.tsx`
- [x] T009 [US1] Add unit tests in `apps/web/test/ConditionalTogglePanel.test.tsx` verifying the per-effect resonance list on `official/skirk-freeze`, independent toggling on a dual-resonance team, re-derivation on preset/team change, and Master / Reset All interaction

---

## Phase 4: Polish & Full Verification

- [x] T010 Mark all tasks completed in `specs/resonance-effects/tasks.md`, run full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), and commit `feat: resonance-effects`
