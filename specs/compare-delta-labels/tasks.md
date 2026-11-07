# Tasks: Compare Delta Labels (`compare-delta-labels`)

**Input**: Design documents from `/specs/compare-delta-labels/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Foundational & User Story 1 - Unambiguous Weapon vs. Build Delta Labels (Priority: P1) 🎯 MVP

**Goal**: Distinguish weapon-row deltas (`vs. leader`) from top-build card deltas (`vs. weapon best`) in `WeaponComparisonList`.

**Independent Test**: Render `WeaponComparisonList` in `apps/web/test/OptimizeViews.test.tsx` and verify both visible labels, `data-delta-scope`, and `title` attributes.

- [x] T001 [US1] Update `weapon-compare-delta-${wKey}` and `weapon-compare-build-delta-${wKey}-${bIdx}` in `apps/web/src/components/OptimizeViews.tsx` to include `vs. leader` and `vs. weapon best` labels, `data-delta-scope`, and descriptive `title` attributes.
- [x] T002 [US1] Update existing assertion and add a dedicated `compare-delta-labels` test in `apps/web/test/OptimizeViews.test.tsx`.
