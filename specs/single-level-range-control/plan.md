# Implementation Plan: Single Artifact Level Range Control & Draft-Text Numeric Editing (`single-level-range-control`)

**Branch**: `single-level-range-control` | **Date**: 2026-11-08 | **Spec**: `specs/single-level-range-control/spec.md`

## Summary

1. Remove the duplicate `Artifact Level Range (Min / Max)` `<label>` block from `apps/web/src/app/optimize/page.tsx` so `SolverPoolFiltersPanel` holds the single level range control.
2. Refactor numeric inputs in `SolverPoolFiltersPanel` (`pool-filter-level-low`, `pool-filter-level-high`, `pool-filter-min-rv`) and `WeaponComparisonPanel` (`weapon-compare-level-${cand.weaponKey}`) in `apps/web/src/components/OptimizeViews.tsx` to use the same draft-text editing pattern as `ConstraintsCard`: hold raw text in component state while focused, allow clearing to `""` while editing, and clamp + commit on `onBlur`.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`apps/web/test/OptimizeViews.test.tsx`, `apps/web/test/official-owned-first-ui.test.tsx`)

## Project Structure

- `apps/web/src/app/optimize/page.tsx`: Remove duplicate `Artifact Level Min` / `Artifact Level Max` inputs from `.gi-setup-grid`.
- `apps/web/src/components/OptimizeViews.tsx`: Add draft-text state and `onFocus`/`onChange`/`onBlur`/`onKeyDown` handlers to `SolverPoolFiltersPanel` and `WeaponComparisonPanel`.
- `apps/web/test/OptimizeViews.test.tsx` & `apps/web/test/official-owned-first-ui.test.tsx`: Add unit and integration tests for single level range control and draft-text numeric editing.
