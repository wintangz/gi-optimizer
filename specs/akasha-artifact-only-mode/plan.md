# Implementation Plan: Akasha Artifact-Only Mode (`akasha-artifact-only-mode`)

**Branch**: `akasha-artifact-only-mode` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/akasha-artifact-only-mode/spec.md`

## Summary

Convert Akasha presets (`source === 'akasha'`) to operate like akasha.cv itself:
1. Remove the account-matching gate for Akasha presets (`matchAccount` returns `{ presetId: preset.id, canRun: true, parts: [] }`).
2. Model the Akasha target character (`team[0].build`) as a fixed simulated build `{ type: 'fixed', character: { level, ascension, constellation, talent }, weapon: { key, level, ascension, refinement } }` across `packages/presets/src/schema.ts`, `packages/presets/src/validate.ts`, and all 5 bundled Akasha presets (`packages/presets/data/akasha/*.json`), while keeping `team[0].build.type === 'owned'` for `official` and `user` presets and converting `team[0].build` to `{ type: 'owned' }` when an Akasha preset is forked or imported into a user preset (`forkPresetToUser`, `parsePresetJson`).
3. Provide a free-choice Weapon (`listWeaponsForType(weaponType)`) + Refinement (`R1`–`R5`) selector on `/presets` and `/optimize` defaulting to `team[0].build.weapon`, and apply the chosen weapon (`BuildSelection.weaponOverride` / `opts.weaponOverride`) and fixed character (`team[0].build.character`) via GO's native `overrideWeapon` and `overrideChar` arguments on `getTeamData` / `getTeamDataCalc` (with weapon sheet conditionals auto-activated when not explicitly overridden in the preset).
4. Use only imported GOOD artifacts for optimization and for optional current-build comparison (showing the optimized result without a current-build comparison column when `Object.keys(currentBuild.artifactIds).length === 0`).
5. Re-capture the 5 Akasha golden fixtures (`packages/engine/scripts/capture-golden.ts`) under the fixed-build model and add unit/regression tests covering target-character invariance, unowned-target evaluation/optimization, and unowned weapon + refinement selection.

## Technical Context

**Language/Version**: TypeScript 5 strict, pnpm workspace
**Primary Dependencies**: `zod`, `@genshin-optimizer/gi/*` (vendored GO source), React 19, Next.js 16 App Router (static export)
**Storage**: Bundled JSON (`packages/presets/data/akasha/*.json`) + IndexedDB via `idb`
**Testing**: Vitest (`packages/presets/test/*.test.ts`, `packages/engine/test/*.test.ts`), Playwright for UI smoke
**Target Platform**: Browser client-side only (Next.js static export, Web Worker for engine/solver)
**Project Type**: Monorepo (`packages/presets`, `packages/engine`, `apps/web`)
**Performance Goals**: Instant (`<10ms`) weapon catalog lookup and account matching; zero overhead added to GO solver
**Constraints**: No server, no API routes; 100% GO formula fidelity (≤ 0.1% relative error on all golden fixtures); zero influence of user's GOOD target character stats or weapon ownership on Akasha preset numbers
**Scale/Scope**: 5 bundled Akasha presets, 6 Official presets, ~200 GO weapons across 5 weapon types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — all changes are in `packages/presets`, `packages/engine`, and static client pages in `apps/web`.
- **II. GO Formula Fidelity**: PASS — uses GO's unmodified `getTeamData` and `getTeamDataCalc` (`overrideWeapon`, `overrideChar`) and re-captures the 5 Akasha golden fixtures directly from `getTeamDataCalc`.
- **III. Import Is GOOD Only**: PASS — only GOOD artifacts are consumed.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — `gi-optimizer/preset@1` schema is extended with `build.type === 'fixed'` for Akasha targets; no damage claims in presets.
- **V. Single-Character, Akasha-Style Objective**: PASS — single target character (`team[0]`) rotation total; ER never weighted in objective.

## Project Structure

### Documentation (this feature)

```text
specs/akasha-artifact-only-mode/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & GO API grounding
├── data-model.md        # Schema, engine, and metadata contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Actionable implementation tasks
```

### Source Code (repository root)

```text
packages/presets/
├── data/akasha/*.json          # 5 bundled Akasha presets updated to team[0].build = { type: 'fixed', ... }
├── src/
│   ├── schema.ts               # fixedBuildSchema + source-specific team[0].build superRefine
│   ├── validate.ts             # fixed target weapon-type check & Akasha validation rules
│   ├── match.ts                # Akasha bypass (canRun: true, parts: [])
│   ├── metadata.ts             # listWeaponsForType(weaponType)
│   └── userPreset.ts           # forkPresetToUser & parsePresetJson convert fixed -> owned on team[0]
└── test/
    ├── schema.test.ts          # Schema tests for fixed vs owned team[0].build
    ├── match.test.ts           # Akasha bypass + Official/User matchAccount tests
    ├── metadata.test.ts        # listWeaponsForType tests
    └── userPreset.test.ts      # Fork/import conversion tests (team[0] -> owned, team[1..3] -> tc)

packages/engine/
├── scripts/
│   └── capture-golden.ts       # Pass overrideWeapon & overrideChar to getTeamDataCalc for fixed builds
├── src/
│   ├── types.ts                # SimulatedWeaponSpec, BuildSelection.weaponOverride, optimize opts.weaponOverride
│   ├── session.ts              # Fixed target char & simulated weapon + weapon sheet conditionals in evaluate/optimize/exportGODatabase
│   └── solver.ts               # Pass overrideChar & overrideWeapon into getTeamData and tag builds with weaponOverride
└── test/
    ├── golden/*.json           # Re-captured Akasha golden fixtures
    ├── golden.test.ts          # Golden parity & exportGODatabase round-trip
    └── akasha-isolation.test.ts # Tests (1) target stat/cons/weapon invariance, (2) missing target char in GOOD, (3) unowned weapon & R1 vs R5 choice

apps/web/src/
├── workers/optimizer.worker.ts # Forward weaponOverride in WorkerOptimizeRequest
├── lib/engine/workerClient.ts  # Forward weaponOverride in optimizePresetInWorker
└── app/
    ├── presets/page.tsx        # Akasha fixed-build summary + free Weapon & R1-R5 selector
    └── optimize/page.tsx       # Akasha free Weapon & R1-R5 selector + optional current-build display when unequipped/unowned
```

**Structure Decision**: Existing monorepo packages (`packages/presets`, `packages/engine`, `apps/web`). No new dependencies or packages added.
