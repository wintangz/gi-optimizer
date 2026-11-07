# Tasks: Single Artifact Level Range Control & Draft-Text Numeric Editing

- [x] **T001**: Remove the duplicate `Artifact Level Range (Min / Max)` inputs from `apps/web/src/app/optimize/page.tsx`.
- [x] **T002**: Implement draft-text numeric editing (no clamping while typing, clearable while editing, commit and clamp on blur) for `pool-filter-level-low`, `pool-filter-level-high`, and `pool-filter-min-rv` in `SolverPoolFiltersPanel` and `weapon-compare-level-*` in `WeaponComparisonPanel` (`apps/web/src/components/OptimizeViews.tsx`).
- [x] **T003**: Add regression tests in `apps/web/test/OptimizeViews.test.tsx` and `apps/web/test/official-owned-first-ui.test.tsx`.
- [x] **T004**: Run tests and commit as `feat: single-level-range-control`.
