# Implementation Plan: Optimize Experience UI (`optimize-experience-ui`)

**Branch**: `optimize-experience-ui` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

1. Add `migrateOptimizerSettings` in `packages/presets/src/settings.ts` and re-export through `@gi/presets` and `@gi/engine`.
2. Update `packages/engine/src/solver.ts` so `runSolver` migrates incoming settings via `migrateOptimizerSettings` and reads constraints solely from `migrated.constraints`.
3. Update `apps/web/src/lib/storage/useGood.ts` (`useOptimizerSettings`) to migrate loaded settings via `migrateOptimizerSettings` and persist the migrated shape.
4. Create `apps/web/src/components/OptimizeViews.tsx` containing `<ConstraintsCard>` (stat-chip rows, `%` unit badges, stat-chip picker grid with already-added stats disabled, one-line empty state) and `<BuildComparisonList>` (`Current` pinned row + `#1..#N` ranked build rows with big total, `%` delta vs current, proportional bar, 5 `ArtifactBadge`s, 7 `StatChip`s, best-row highlight, and expandable per-instance rotation breakdown).
5. Refactor `apps/web/src/app/optimize/page.tsx` and `apps/web/src/app/globals.css` into polished **Setup**, **Constraints**, and **Results** card sections.
6. Add unit, solver, and component tests in `packages/presets/test/settings.test.ts`, `packages/engine/test/optimizer.test.ts`, and `apps/web/test/OptimizeViews.test.tsx`.
