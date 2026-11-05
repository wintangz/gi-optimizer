# Implementation Plan: Multi-Select Artifact Set Filter (`artifact-set-filter`)

**Branch**: `artifact-set-filter` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/artifact-set-filter/spec.md`

## Summary

Replace the one-set-at-a-time artifact set exclusion dropdown on `/optimize` with a multi-select `ArtifactSetFilter` panel (`apps/web/src/components/ArtifactSetFilter.tsx`) supporting three first-class modes (`'all' | 'exclude' | 'include'`), per-set piece-count granularity (`[2]`, `[4]`, `[2, 4]`), a searchable checkbox grid with visual `ArtifactBadge` identifiers, bulk actions (**Select all**, **Clear**, **Invert**), a live allowed-sets summary line, and IndexedDB persistence via `OptimizerSettings`. At the solver boundary (`packages/engine/src/solver.ts`), translate `(setFilterMode, setFilterSelection, setExclusion)` into Genshin Optimizer's `ArtSetExclusion` (`Record<string, (2 | 4)[]>`) via the pure helper `resolveArtSetExclusion(settings, allSetKeys)` in `packages/presets/src/settings.ts`.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@genshin-optimizer/gi/solver`, React 19, Next.js 16 (App Router, static export), `idb`
**Storage**: Browser IndexedDB (`gi-optimizer-db` -> `settings` object store, key `'optimizer'`, via `useOptimizerSettings`)
**Testing**: Vitest (`packages/presets/test/settings.test.ts`, `packages/engine/test/optimizer.test.ts`, `apps/web/test/ArtifactSetFilter.test.tsx`)
**Target Platform**: Browser static web client (`apps/web`) + Node test runner (`packages/presets`, `packages/engine`)
**Project Type**: Monorepo pnpm workspace (`packages/presets`, `packages/engine`, `apps/web`)
**Performance Goals**: O(N) set-filter translation (`N = 54` artifact sets, < 0.1 ms); zero impact on initial bundle size of non-optimizer routes
**Constraints**: Pure engine-free settings module in `packages/presets/src/settings.ts`; `EngineSession.optimize` signature unchanged; every set rendered with `ArtifactBadge`
**Scale/Scope**: All `ALL_ARTIFACT_SET_KEYS` (~54 sets) across 3 filter modes and 3 piece-count configurations (`[2]`, `[4]`, `[2, 4]`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — `ArtifactSetFilter` is a client component persisted in browser IndexedDB (`settings` store); no server or API routes.
- **II. GO Formula Fidelity**: PASS — `resolveArtSetExclusion` produces GO's native `ArtSetExclusion` (`Record<string, (2 | 4)[]>`) consumed directly by vendored `pruneExclusion` and `artSetPerm` in `vendor/genshin-optimizer/libs/gi/solver/src/common.ts`.
- **III. Import Is GOOD Only**: PASS — Does not touch import format.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — Artifact set filters are user `OptimizerSettings`, never baked into preset JSON.
- **V. Single-Character, Akasha-Style Objective**: PASS — User constraint alongside ER floor and artifact pool rules; does not alter the damage objective.

## Project Structure

### Documentation (this feature)

```text
specs/artifact-set-filter/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & GO ArtSetExclusion mapping decisions
├── data-model.md        # Phase 1 TypeScript interfaces & translation rules
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   ├── settings.ts      # Pure OptimizerSettings, SetFilterMode, DEFAULT_OPTIMIZER_SETTINGS, resolveArtSetExclusion, summarizeArtSetFilter, bulk helpers
│   └── index.ts         # Re-exports ./settings
└── test/
    └── settings.test.ts # Comprehensive unit tests for resolveArtSetExclusion, summarizeArtSetFilter, and bulk helpers

packages/engine/
├── src/
│   ├── types.ts         # Re-exports SetFilterMode, OptimizerSettings, DEFAULT_OPTIMIZER_SETTINGS from @gi/presets
│   └── solver.ts        # Calls resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS) at solver boundary
└── test/
    └── optimizer.test.ts # Solver integration tests for 'include' and 'exclude' set filter modes

apps/web/
├── src/
│   ├── components/
│   │   └── ArtifactSetFilter.tsx # Searchable multi-select set filter panel with mode toggle, bulk actions, piece-count selector, and ArtifactBadge grid
│   └── app/
│       └── optimize/
│           └── page.tsx          # Replaces single-select exclude dropdown with <ArtifactSetFilter />
└── test/
    └── ArtifactSetFilter.test.tsx # Component unit tests for modes, summary line, search, bulk actions, piece counts, and ArtifactBadge rendering
```

**Structure Decision**: Place the pure settings types, defaults, bulk selection helpers, summary formatter, and `resolveArtSetExclusion` in `packages/presets/src/settings.ts` (re-exported by `@gi/presets` and `@gi/engine`) so both `packages/engine/src/solver.ts` and `apps/web` share one engine-free source of truth. Place the UI component in `apps/web/src/components/ArtifactSetFilter.tsx` and wire it into `apps/web/src/app/optimize/page.tsx`.

## Complexity Tracking

No constitution violations. No new third-party dependencies required.
