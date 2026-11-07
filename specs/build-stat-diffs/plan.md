# Implementation Plan: Build Stat Diffs (`build-stat-diffs`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add a core stat comparison section (`HP`, `ATK`, `DEF`, `EM`, `ER`, `CR`, `CD`) to the expanded Details of build comparison rows in both `BuildComparisonList` and `WeaponComparisonList`. When a Current build baseline exists and the row is not the Current build itself, render `current value → this build's value → signed difference` with green (`ok`), red (`error`), and grey (`muted`) styling. When the row IS the Current build or no Current baseline exists for the preset, render plain stats with no diff column.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router, static export)  
**Primary Dependencies**: `@gi/web`, `@gi/presets`, `@gi/engine`  
**Testing**: Vitest  
**Target Platform**: Web (Static Export)

## Planned Changes

1. **`apps/web/src/components/OptimizeViews.tsx`**:
   - Add and export `formatCoreStatComparison(statKey, buildRaw, currentRaw?)` to format flat (`hp`, `atk`, `def`, `eleMas`) and percentage (`enerRech_`, `critRate_`, `critDMG_`) values and compute signed differences (`+`, `-`, `0`) and CSS classes (`ok`, `error`, `muted`).
   - Add `BuildStatComparisonSection` component and render it in the expanded Details of `BuildComparisonList` and `WeaponComparisonList`.
   - Accept optional `currentBuild` prop on `WeaponComparisonListProps` (with fallback to the `isEquippedBaseline` row when `currentBuild` is omitted).
2. **`apps/web/src/app/optimize/page.tsx`**:
   - Pass `currentBuild` (`showCurrentComparison && currentSelection && currentEval ? { selection: currentSelection, evaluation: currentEval } : null`) to `WeaponComparisonList`, matching `BuildComparisonList`.
3. **`apps/web/src/app/globals.css`**:
   - Add compact styling for `.comp-stat-comparison`, `.comp-details-subheader`, `.comp-stat-diff-table`, `.comp-stat-num`, `.comp-stat-arrow`, and `.comp-stat-diff-delta`.
4. **`apps/web/test/OptimizeViews.test.tsx`**:
   - Add unit tests verifying `formatCoreStatComparison`, stat diff rendering (`current → build → signed diff` with `ok`/`error`/`muted`) in `BuildComparisonList` and `WeaponComparisonList`, and plain-stat rendering (no diff column) when expanding the `Current` row or when `currentBuild={null}`.
