# Tasks: Weapon Comparison Follow-ups (`weapon-compare-followups`)

**Input**: Design documents from `/specs/weapon-compare-followups/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Engine Top-5 Builds per Weapon

- [x] T001 Define `WEAPON_COMPARE_TOP_N = 5` and `WeaponCompareBuildEntry` in `packages/engine/src/types.ts` and re-export from `packages/engine/src/index.ts`
- [x] T002 Update `compareWeapons` and `rankWeaponCompareRows` in `packages/engine/src/session.ts` to always solve with `topN: WEAPON_COMPARE_TOP_N` (5) independent of `settings.topN`, evaluate all returned builds, and populate `topBuilds` on each `WeaponCompareRowResult`

## Phase 2: Pill-Badge Styling & Expanded Top-5 Builds UI

- [x] T003 Update `.comp-baseline-tag` in `apps/web/src/app/globals.css` and `WeaponComparisonPanel` / `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` so `Current Baseline` has the same pill-badge treatment and vertical alignment as `Owned`
- [x] T004 Update `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` and `startWeaponComparison` in `apps/web/src/app/optimize/page.tsx` to fetch, evaluate, and render up to 5 ranked builds per expanded weapon row (each with pieces, final stats, total, and details)

## Phase 3: Verification

- [x] T005 Add regression tests in `packages/engine/test/weapon-compare.test.ts` and `apps/web/test/OptimizeViews.test.tsx`, then run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
