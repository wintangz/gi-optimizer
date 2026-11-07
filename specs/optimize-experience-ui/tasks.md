# Tasks: Optimize Experience UI (`optimize-experience-ui`)

- [x] T001 [P] [US1] Implement and export `migrateOptimizerSettings` in `packages/presets/src/settings.ts`, `packages/engine/src/types.ts`, and `packages/engine/src/index.ts`
- [x] T002 [US1] Update `runSolver` in `packages/engine/src/solver.ts` to read constraints exclusively from `migrateOptimizerSettings(settings).constraints` and rebuild `@gi/engine`
- [x] T003 [US1] Update `useOptimizerSettings` in `apps/web/src/lib/storage/useGood.ts` to apply `migrateOptimizerSettings` on load
- [x] T004 [US1] [US2] [US3] Create `apps/web/src/components/OptimizeViews.tsx` (`ConstraintsCard` and `BuildComparisonList`) and add card/control/comparison styles in `apps/web/src/app/globals.css`
- [x] T005 [US1] [US2] [US3] Update `apps/web/src/app/optimize/page.tsx` to use **Setup**, **Constraints**, and **Results** card sections, evaluate all `topN` builds for the comparison list, and remove the standalone ER floor input and old two-bar summary
- [x] T006 [US1] [US2] Add migration tests in `packages/presets/test/settings.test.ts`, solver equivalence test in `packages/engine/test/optimizer.test.ts`, and component tests in `apps/web/test/OptimizeViews.test.tsx`
