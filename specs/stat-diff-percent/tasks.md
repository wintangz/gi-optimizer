# Tasks: Relative Percentage Diffs for Core Flat Stats

- [x] **T001**: Update `formatCoreStatComparison` and `BuildStatComparisonSection` in `apps/web/src/components/OptimizeViews.tsx` to display relative percentage change for flat stats (`HP`, `ATK`, `DEF`, `EM`) by default with raw signed delta on `title` tooltip (`data-raw-diff`), falling back to raw integer delta when Current is `0`.
- [x] **T002**: Update existing stat diff assertions and add regression tests for flat-stat relative percentage diffs, hover tooltips, and `0`-baseline fallback in `apps/web/test/OptimizeViews.test.tsx`.
- [x] **T003**: Run full verification (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), commit as `feat: stat-diff-percent`, and push to `origin/main`.
