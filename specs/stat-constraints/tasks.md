# Tasks: Final Stat Constraints (`stat-constraints`)

**Input**: Design documents from `/specs/stat-constraints/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Settings Schema & Normalization (`@gi/presets`)

- [x] T001 [P] [US1] Define `STAT_CONSTRAINT_KEYS`, `StatConstraintKey`, `StatConstraint`, `isPercentStatConstraintKey`, `normalizeStatConstraintValue`, and `isActiveStatConstraint` in `packages/presets/src/settings.ts`, and add `constraints?: StatConstraint[]` to `OptimizerSettings` (`DEFAULT_OPTIMIZER_SETTINGS.constraints = []`)
- [x] T002 [P] [US1] Re-export `STAT_CONSTRAINT_KEYS`, `StatConstraintKey`, `StatConstraint`, `isPercentStatConstraintKey`, `normalizeStatConstraintValue`, and `isActiveStatConstraint` from `packages/presets/src/index.ts`, `packages/engine/src/types.ts`, and `packages/engine/src/index.ts`

---

## Phase 2: Solver Min/Max Constraints & Upfront Total (`@gi/engine`)

- [x] T003 [US2] Update `packages/engine/scripts/build-engine.mjs` `onLoad` for `libs/gi/solver/src/common.ts` so `reaffine` only schedules `pruneOrder` when `forced.pruneOrder` was enabled
- [x] T004 [US2] Extend `runSolver` and `computeUpfrontTotal` in `packages/engine/src/solver.ts` to build `{ value, min, max }` entries from `settings.constraints` (alongside `settings.erFloor`), expand `max` bounds via `prod(-1, value) >= -max`, disable `pruneOrder` when a `max` constraint is active, and rebuild `@gi/engine` (`node packages/engine/scripts/build-engine.mjs`)

---

## Phase 3: `/optimize` Constraints Editor UI & Empty State (`@gi/web`)

- [x] T005 [US3] Add `heal_` to `DISPLAY_STATS`, render the stat constraints editor (`[stat select] [min input] [max input] [remove button]` + `+ Add Constraint` button) next to the ER floor control, and update the empty-result banner in `apps/web/src/app/optimize/page.tsx`

---

## Phase 4: Verification & Tests

- [x] T006 [P] [US1] Add unit tests in `packages/presets/test/settings.test.ts` for `STAT_CONSTRAINT_KEYS`, `normalizeStatConstraintValue`, `isActiveStatConstraint`, and `DEFAULT_OPTIMIZER_SETTINGS`
- [x] T007 [US2] Add solver tests in `packages/engine/test/optimizer.test.ts` verifying: min constraint, max constraint, min+max band, impossible band (`builds: []`), `erFloor` unchanged, `erFloor` + constraint together, and `tested + skipped === total`
