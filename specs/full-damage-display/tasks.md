# Tasks: Full Damage Display (`full-damage-display`)

**Input**: Design documents from `/specs/full-damage-display/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Setup & Types (Foundational)

- [X] T001 Define `FullDamageFormulaEntry` and `FullDamageSection` interfaces and add `fullDamage?: FullDamageSection[]` to `RotationResult` in `packages/engine/src/types.ts` and export them from `packages/engine/src/index.ts`.

---

## Phase 2: User Story 1 - Engine Full Damage Extraction & Breakdown Parity (Priority: P1) 🎯 MVP

**Goal**: Compute the target character's complete damage formula list (`fullDamage`) in sheet order with per-formula `DamageRowBreakdown` for any evaluated build, omitting untriggerable (`isEmpty`) and `%`-unit stat nodes as GO does.

**Independent Test**: `packages/engine/test/full-damage-display.test.ts`

- [X] T002 [US1] Implement `findHitUiDataForFormula`, `extractFormulaBreakdown`, and `extractFullDamageSections` in `packages/engine/src/breakdown.ts` so every active flat formula in `targetUiData.getDisplay()` across `normal`, `charged`, `plunging`, `skill`, `burst`, passives, constellations, equipped weapon/artifact sections, `nicole`, and `reaction` is extracted in sheet order with a reconciled 6-factor `DamageRowBreakdown`.
- [X] T003 [US1] Update `session.evaluate()` in `packages/engine/src/session.ts` to populate `fullDamage` on `RotationResult` (including multi-member rotation fallback and team optimization evaluations) without affecting `GOSolver`.
- [X] T004 [US1] Add automated engine tests in `packages/engine/test/full-damage-display.test.ts` verifying: (a) narrow-rotation preset optimization (`official/raiden-hypercarry`, `official/furina-salon-subdps`) includes non-rotation formulas (`normal.*`, `charged.*`, `plunging.*`, `reaction.*`) in the best build's `fullDamage`, (b) every entry's `value` matches a direct `session.evaluate()` of a single-target rotation for that formula and build, (c) untriggerable formulas (`isEmpty === true`, e.g., non-infused reactions or locked constellations) are omitted and appear when triggered, and (d) every formula's `breakdown.reconciledPerHit` matches `entry.value`.

---

## Phase 3: User Story 2 - Web UI "Full Damage" Section in Build Details (Priority: P1)

**Goal**: Render an expandable `"Full Damage"` section grouped by talent source in sheet order inside `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList` in `apps/web/src/components/OptimizeViews.tsx`.

**Independent Test**: `apps/web/test/OptimizeViews.test.tsx`

- [X] T005 [US2] Implement `FullDamageSectionView` and integrate it into `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList` in `apps/web/src/components/OptimizeViews.tsx`, with expandable per-row `DamageRowBreakdownView` and `vs. Current` deltas.
- [X] T006 [US2] Add CSS rules for `.comp-full-damage-section` in `apps/web/src/app/globals.css` following `apps/web/DESIGN.md` (`>= 0.78rem` font floor, tabular numerals).
- [X] T007 [US2] Add component tests in `apps/web/test/OptimizeViews.test.tsx` verifying `"Full Damage"` section rendering, talent group ordering, `vs. Current` deltas, and inline `DamageRowBreakdownView` expansion on row click.

---

## Phase 4: Polish & Cross-Cutting Verification

- [X] T008 Build `@gi/engine`, run full `@gi/engine` and `@gi/web` test suites, run `pnpm --filter @gi/web build`, and run `npx impeccable detect --json apps/web/src` to verify zero regressions and zero P0/P1 issues.
