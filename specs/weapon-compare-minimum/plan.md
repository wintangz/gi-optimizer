# Implementation Plan: Weapon Compare Minimum Candidates (`weapon-compare-minimum`)

**Branch**: `weapon-compare-minimum` | **Date**: 2026-11-08 | **Spec**: `specs/weapon-compare-minimum/spec.md`

## Summary

1. In `apps/web/src/app/optimize/page.tsx`:
   - Guard `startWeaponComparison()` with `activeCompareCandidates.length < 2`.
   - Disable `data-testid="run-weapon-compare-btn"` when `!record?.good || !activePreset || activeCompareCandidates.length < 2` and set its `title` when `< 2` candidates are selected.
   - In the Results section (`weapon-compare-idle-card` and/or a visible note next to the button / in the Results card when `activeCompareCandidates.length < 2`), show the explicit reason why `Compare Weapons` is disabled (`Select at least 2 weapons above to run a comparison (1 selected — pick at least 1 more).` / `Select at least 2 weapons above to run a comparison.`).
2. In `WeaponComparisonPanel` (`apps/web/src/components/OptimizeViews.tsx`):
   - When `selectedCandidates.length === 1`, render a visible hint banner (`data-testid="weapon-compare-minimum-notice"`) stating that at least 2 weapons are required to compare (`Select at least 1 more weapon above to compare (minimum 2 weapons required).`), and show `1 selected (min 2)` in `weapon-compare-selected-count`.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`apps/web/test/official-owned-first-ui.test.tsx`, `apps/web/test/OptimizeViews.test.tsx`)
