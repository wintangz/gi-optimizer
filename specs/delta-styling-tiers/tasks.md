# Tasks: Delta Styling Tiers (`delta-styling-tiers`)

**Input**: Design documents from `/specs/delta-styling-tiers/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Foundational & User Story 1 - Neutral/Muted Styling for Negative Deltas (Priority: P1) 🎯 MVP

**Goal**: Style negative relative deltas with `muted` (and positive deltas with `ok`), reserving `error` for actual errors.

**Independent Test**: Verify `formatRelativeDelta`, `formatCoreStatComparison`, `BuildComparisonList`, `WeaponComparisonList`, `TeamOptimizationList`, and `BuildComparisonBars` in unit tests.

- [x] T001 [US1] Update `formatCoreStatComparison`, `formatRelativeDelta`, and `WeaponComparisonList` delta classes in `apps/web/src/components/OptimizeViews.tsx` so negative deltas return/render `'muted'` instead of `'error'`.
- [x] T002 [US1] Update `BuildComparisonBars` delta class in `apps/web/src/components/Identifier.tsx` so negative/zero deltas render `'muted'` instead of `'error'`.
- [x] T003 [US1] Update existing negative stat diff class assertions and add a dedicated `delta-styling-tiers` test covering build rows, weapon rows, team member rows, stat diffs, and `BuildComparisonBars` in `apps/web/test/OptimizeViews.test.tsx` and `apps/web/test/Identifier.test.tsx`.
