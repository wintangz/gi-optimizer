# Tasks: Team Result Status (`team-result-status`)

**Input**: Design documents from `/specs/team-result-status/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Foundational & User Story 1 - Outcome-Driven Member Status Styling (Priority: P1) 🎯 MVP

**Goal**: Ensure `TeamOptimizationList` applies `is-best` / `comp-rank-best` / `ok` only when `sign === '+'` and neutral/muted styling when `sign === '0'` or `'-'`.

**Independent Test**: Render `TeamOptimizationList` with improved (`+`), unchanged (`0`), and decreased (`-`) members in `apps/web/test/OptimizeViews.test.tsx`.

- [x] T001 [US1] Update `TeamOptimizationList` in `apps/web/src/components/OptimizeViews.tsx` and `.is-best` rules in `apps/web/src/app/globals.css` so member rows and the team banner follow their actual delta sign.
- [x] T002 [US1] Add regression test in `apps/web/test/OptimizeViews.test.tsx` verifying improved (`+`), unchanged (`0`), and decreased (`-`) member status styling in `TeamOptimizationList`.
