# Tasks: Build Details Deduplication & Row Expand Affordance

- [x] **T001**: Implement and export `formatRotationRowLabel(label: string): string` in `apps/web/src/components/OptimizeViews.tsx` and apply it in `PresetRotationSummary`, `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList`.
- [x] **T002**: Replace `<button className="comp-inline-breakdown-btn">` on damage and stat rows in `OptimizeViews.tsx` with a plain rotating `<span className="comp-row-chevron">` and add `.comp-row-chevron` styling in `apps/web/src/app/globals.css`.
- [x] **T003**: Update existing breakdown toggle tests and add regression tests for `formatRotationRowLabel` and `.comp-row-chevron` in `apps/web/test/OptimizeViews.test.tsx`, verify suite passes, and commit as `feat: build-details-dedupe`.
