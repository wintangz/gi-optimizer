# Tasks: Proportional Result Bars (`proportional-result-bars`)

**Input**: Design documents from `/specs/proportional-result-bars/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Foundational & User Story 1 - True Proportional Bar Widths (Priority: P1) 🎯 MVP

**Goal**: Remove the `4%` floor from all result comparison bars so bar widths and tooltips reflect true proportions.

**Independent Test**: Verify sub-4% (`0.5%`) bar widths and tooltips in `OptimizeViews.test.tsx` and `Identifier.test.tsx`.

- [x] T001 [US1] Replace `Math.max(4, ...)` with `Math.max(0, ...)` in `BuildComparisonList` and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx`, and add `min-width: 2px` to `.comp-row-bar-fill` in `apps/web/src/app/globals.css`.
- [x] T002 [US1] Replace `Math.max(4, ...)` with `Math.max(0, ...)` in `BuildComparisonBars` in `apps/web/src/components/Identifier.tsx`.
- [x] T003 [US1] Add regression tests for true proportional bar widths (`0.5%` of leader) in `apps/web/test/OptimizeViews.test.tsx` and `apps/web/test/Identifier.test.tsx`.
