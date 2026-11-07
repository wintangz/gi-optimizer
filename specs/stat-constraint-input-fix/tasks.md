# Tasks: Stat Constraint Min/Max Input Editing Fix (`stat-constraint-input-fix`)

- [x] T001 Remove ratio-guessing from `formatDisplayBoundValue` and implement raw-text draft state while focused in `ConstraintsCard` (`apps/web/src/components/OptimizeViews.tsx`)
- [x] T002 Add regression test in `apps/web/test/OptimizeViews.test.tsx` verifying typing `"1"` commits `1` (not `100`) and clearing a bound unsets it
- [x] T003 Run `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @gi/web test`, then commit as `"feat: stat-constraint-input-fix"`
