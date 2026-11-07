# Tasks: Build Stat Diffs (`build-stat-diffs`)

**Input**: Design documents from `/specs/build-stat-diffs/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Core Stat Diff Formatter & Shared Section Component

- [x] T001 Implement `formatCoreStatComparison` and `BuildStatComparisonSection` in `apps/web/src/components/OptimizeViews.tsx`
- [x] T002 Wire `BuildStatComparisonSection` into `BuildComparisonList` and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx`, and pass `currentBuild` to `WeaponComparisonList` in `apps/web/src/app/optimize/page.tsx`
- [x] T003 Add CSS rules for the stat comparison table in `apps/web/src/app/globals.css`

## Phase 2: Unit Tests & Full Verification

- [x] T004 Add unit tests in `apps/web/test/OptimizeViews.test.tsx` for core stat diffs (increases, decreases, unchanged) and plain stats (Current build row and no-baseline cases) in both `BuildComparisonList` and `WeaponComparisonList`
- [x] T005 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
