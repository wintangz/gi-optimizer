# Tasks: GO-Style Formula & Stat Breakdown (`formula-breakdown`)

**Input**: Design documents from `/specs/formula-breakdown/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Engine Calc Graph Breakdown Extraction

- [x] T001 Tag `effectiveResonanceData` with `inferInfoMut(effectiveResonanceData, 'Resonance' as never)` in `packages/engine/src/teamData.ts`
- [x] T002 Define `BreakdownSourceCategory`, `BreakdownContributor`, `DamageFactorGroup`, `DamageRowBreakdown`, and `StatBreakdown` in `packages/engine/src/types.ts` and implement `extractDamageRowBreakdown` & `extractStatBreakdowns` in `packages/engine/src/breakdown.ts`
- [x] T003 Attach `breakdown` on `InstanceResult` and `statBreakdowns` on `RotationResult` in `packages/engine/src/session.ts` and export breakdown types/helpers from `packages/engine/src/index.ts`

## Phase 2: Expandable Damage Row & Final Stat Breakdown UI

- [x] T004 Update `BuildStatComparisonSection`, `BuildComparisonList`, and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` (and `apps/web/src/app/globals.css`) so any rotation damage row and any core stat row can expand into its breakdown

## Phase 3: Acceptance & UI Tests

- [x] T005 Add acceptance tests in `packages/engine/test/breakdown.test.ts` verifying that every damage row and every core stat reconciles with displayed numbers within rounding, and add UI tests in `apps/web/test/OptimizeViews.test.tsx`
- [x] T006 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`
