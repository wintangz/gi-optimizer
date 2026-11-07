# Tasks: User-Facing Language (`user-facing-language`)

**Input**: Design documents from `/specs/user-facing-language/`

## Phase 1: Human-Readable Conditional Labels & Rotation Labels
- [x] T001 Export `formatHumanConditionalEntry` in `apps/web/src/components/ConditionalTogglePanel.tsx` and update `Active Conditionals` in `apps/web/src/app/presets/page.tsx` and `apps/web/src/app/teams/page.tsx`.
- [x] T002 Remove `GO Formula Path` column from `apps/web/src/app/presets/page.tsx`, update `formatRotationRowLabel` in `apps/web/src/components/OptimizeViews.tsx` to humanize raw path fallbacks, and drop `(skill.0)` suffixes from visible formula `<option>` text in `apps/web/src/app/teams/page.tsx`.

## Phase 2: Plain Import Diagnostics, Provenance & Team Result Labels
- [x] T003 Add `formatParseIssuePlain` in `apps/web/src/components/OptimizeViews.tsx` and render plain-word import diagnostics in `apps/web/src/app/import/page.tsx`.
- [x] T004 Remove `(Unverified Setup Bundle)` warning text from `apps/web/src/app/teams/page.tsx`, shorten Akasha provenance link label in `apps/web/src/app/presets/page.tsx`, and update `TeamOptimizationList` banner and member pills in `apps/web/src/components/OptimizeViews.tsx`.

## Phase 3: Regression Tests & Verification
- [x] T005 Update and add unit tests in `apps/web/test/OptimizeViews.test.tsx`, `apps/web/test/ImportPage.test.tsx`, and `apps/web/test/teams-deferred-start.test.tsx`.
