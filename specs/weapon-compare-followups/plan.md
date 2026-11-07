# Implementation Plan: Weapon Comparison Follow-ups (`weapon-compare-followups`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Pill-Badge Styling for `Current Baseline`**:
   - Update `.comp-baseline-tag` in `apps/web/src/app/globals.css` to share the pill-badge rules (`.comp-baseline-tag, .comp-owned-tag, .comp-sim-tag`) with rounded corners (`border-radius: 999px`), border (`1px solid rgba(122, 162, 255, 0.45)`), padding (`0.12rem 0.42rem`), and vertical centering (`display: inline-flex; align-items: center; align-self: center; line-height: 1.2`).
   - Remove the `.comp-best-tag` class from `Current Baseline` badges in `WeaponComparisonPanel` and `WeaponComparisonList` (`apps/web/src/components/OptimizeViews.tsx`) so it renders as a pill badge matching `Owned` rather than bare uppercase text.

2. **Top 5 Builds per Weapon in Engine & UI**:
   - Export `WEAPON_COMPARE_TOP_N = 5` and `WeaponCompareBuildEntry` in `packages/engine/src/types.ts` and `packages/engine/src/index.ts`, and add `topBuilds?: WeaponCompareBuildEntry[]` to `WeaponCompareRowResult`.
   - Update `compareWeapons` and `rankWeaponCompareRows` in `packages/engine/src/session.ts` to always pass `{ ...settings, topN: WEAPON_COMPARE_TOP_N }` to `session.optimize(...)`, evaluate each returned build (up to 5), and populate `topBuilds` sorted by `total` descending with 1-based `rank`.
   - Update `startWeaponComparison` in `apps/web/src/app/optimize/page.tsx` and `rankWeaponComparisonRows` / `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` so each expanded weapon row renders its ranked top builds (up to 5, or fewer if fewer are feasible), each showing its rank, total damage, artifact pieces, final stats, and expandable details.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 16 (static export)
- **Primary Dependencies**: `@gi/engine`, `@gi/presets`, `@gi/good`
- **Testing**: Vitest (`packages/engine/test/weapon-compare.test.ts`, `apps/web/test/OptimizeViews.test.tsx`)
- **Constraints**: Never modify `vendor/genshin-optimizer`; preserve single-character optimize results and golden fixtures byte-identical.
