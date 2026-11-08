# Tasks: Master Elemental Resonance Toggle (`resonance-master-toggle`)

**Input**: Design documents from `/specs/resonance-master-toggle/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

## Phase 1: Foundational Settings (`@gi/presets`)

**Purpose**: Define per-preset master Elemental Resonance settings and helpers in `@gi/presets`

- [x] T001 Add `resonanceEnabledByPreset?: Record<string, boolean>` and `resonanceEnabled?: boolean` to `OptimizerSettings` (defaulting to `{}` in `DEFAULT_OPTIMIZER_SETTINGS`), implement `getPresetResonanceEnabled` and `setPresetResonanceEnabled`, update `resetMemberConditionalOverrides` (when resetting all overrides for a preset) in `packages/presets/src/settings.ts`, and re-export from `packages/presets/src/index.ts`
- [x] T002 [P] Add unit tests for `getPresetResonanceEnabled`, `setPresetResonanceEnabled`, sub-preset ID fallback, and full-preset reset in `packages/presets/test/settings.test.ts`

---

## Phase 2: User Story 2 - Engine Resonance Suppression Across All Evaluation & Optimization Modes (Priority: P1)

**Goal**: Suppress all elemental resonances (`resonanceData` and `smallTeamEleCounts`) and remove `Elemental Resonance` breakdown contributors when `resonanceEnabled === false`, while preserving default ON calculations bit-for-bit across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.

**Independent Test**: Run `packages/engine/test/buff-coverage.test.ts` verifying `official/skirk-freeze` (CR drops by `0.15`, total drops, no `resonance` breakdown contributors when OFF; restored bit-for-bit when ON) and Pyro/Hydro/Cryo/Geo/Dendro suppression across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.

- [x] T003 [US2] Add `resonanceEnabled?: boolean` to `BuildSelection`, `TeamOptimizeOptions`, and re-export `getPresetResonanceEnabled` / `setPresetResonanceEnabled` in `packages/engine/src/types.ts` and `packages/engine/src/index.ts`
- [x] T004 [US2] Update `getEffectiveResonanceData` in `packages/engine/src/teamData.ts` to return `{}` when master resonance is disabled (`resCond?.__masterOff === 'off' || resCond?.all === 'off'`), suppressing all elemental resonance nodes and `smallTeamEleCounts` buffs
- [x] T005 [US2] Update `presetTeamFingerprint`, `hydratePresetTeam`, `hydrateTeamIntoDb`, `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam` in `packages/engine/src/session.ts` and `runSolver` in `packages/engine/src/solver.ts` to propagate `resonanceEnabled` consistently
- [x] T006 [US2] Add engine tests in `packages/engine/test/buff-coverage.test.ts` covering `official/skirk-freeze` acceptance (15.0% CR drop, total reduction, breakdown absence when OFF, bit-for-bit restoration when ON) and Pyro/Hydro/Cryo/Geo/Dendro suppression across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`

---

## Phase 3: User Story 1 - Team-Level "Elemental Resonance" Switch in Buffs & Passives & Optimize Flow Wiring (Priority: P1)

**Goal**: Expose the team-level `"Elemental Resonance"` ON/OFF switch in `ConditionalTogglePanel` and wire `activeResonanceEnabled` into Current build evaluation, single optimize, weapon compare, and team optimize in `apps/web/src/app/optimize/page.tsx`.

**Independent Test**: Render `ConditionalTogglePanel` in `apps/web/test/ConditionalTogglePanel.test.tsx` and verify the `"Elemental Resonance"` switch (`role="switch"`, `aria-checked`) toggles ON/OFF, persists per preset in `OptimizerSettings`, preserves existing per-trigger conditionals, and resets via `"Reset All to Defaults"`.

- [x] T007 [US1] Render the team-level `"Elemental Resonance"` switch (`data-testid="resonance-master-toggle"`, `role="switch"`, `aria-checked`) in `apps/web/src/components/ConditionalTogglePanel.tsx` and add styling in `apps/web/src/app/globals.css`
- [x] T008 [US1] Wire `activeResonanceEnabled` through Current build evaluation, Top-N build evaluation, Weapon Comparison build evaluation, and Team Optimization in `apps/web/src/app/optimize/page.tsx`
- [x] T009 [US1] Add unit tests in `apps/web/test/ConditionalTogglePanel.test.tsx` verifying the `"Elemental Resonance"` switch rendering, ON/OFF toggling, per-preset persistence, preservation of per-member/trigger conditionals, and `"Reset All to Defaults"` integration

---

## Phase 4: Polish & Full Verification

- [x] T010 Run full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) and verify zero golden fixture diffs at default settings
