# Tasks: Deep Artifact Pool Filters (`solver-filters-deep`)

**Input**: Design documents from `/specs/solver-filters-deep/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Settings Schema & Engine Pool Filtering

- [x] T001 Extend `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `migrateOptimizerSettings`, and `summarizeSolverPoolFilters` in `packages/presets/src/settings.ts`
- [x] T002 Update `filterArtifactsForOptimizer` in `packages/engine/src/solver.ts` to enforce `minRarity`, `mainStatKeys`, `requiredSubstats` (`'any'` / `'all'`), and `minRv` (using `computeArtifactRollValue`)

## Phase 2: Web UI (`SolverPoolFiltersPanel`)

- [x] T003 Add `SolverPoolFiltersPanel` in `apps/web/src/components/OptimizeViews.tsx`, style classes in `apps/web/src/app/globals.css`, and render next to `ArtifactSetFilter` in `apps/web/src/app/optimize/page.tsx`

## Phase 3: Tests & Verification

- [x] T004 Add unit and integration tests in `packages/presets/test/settings.test.ts`, `packages/engine/test/optimizer.test.ts` (including `compareWeapons`), and `apps/web/test/OptimizeViews.test.tsx`
- [x] T005 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`
