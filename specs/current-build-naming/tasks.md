# Tasks: Current Build Naming (`current-build-naming`)

**Input**: Design documents from `/specs/current-build-naming/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Foundational & User Story 1 - Unified "Current" Naming (Priority: P1) 🎯 MVP

**Goal**: Unify all visible current-build pills, delta chips, and weapon badges on `"Current"` with `title="Your currently equipped build"`.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonPanel`, and `WeaponComparisonList` in `apps/web/test/OptimizeViews.test.tsx` and assert `"Current"` label text and tooltips.

- [x] T001 [US1] Update `BuildComparisonList`, `WeaponComparisonPanel`, and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx`, plus `BuildComparisonBars` in `apps/web/src/components/Identifier.tsx`, to render `"Current"` with `title="Your currently equipped build"`.
- [x] T002 [US1] Update existing badge text assertions and add a dedicated `current-build-naming` test in `apps/web/test/OptimizeViews.test.tsx`.
