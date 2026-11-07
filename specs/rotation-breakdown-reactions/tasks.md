# Tasks: Rotation Breakdown Reactions & Hit Mode (`rotation-breakdown-reactions`)

**Input**: Design documents from `/specs/rotation-breakdown-reactions/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Shared Reaction & Hit Mode Badges and Breakdown Integration

- [x] T001 Add `RotationReactionBadge`, `RotationHitModeBadge`, `REACTION_ELEMENT_MAP`, and `formatHitModeLabel` in `apps/web/src/components/Identifier.tsx` and style classes in `apps/web/src/app/globals.css`
- [x] T002 Update `BuildComparisonList` and `WeaponComparisonList` breakdown tables and add `PresetRotationSummary` in `apps/web/src/components/OptimizeViews.tsx`
- [x] T003 Render `PresetRotationSummary` in `apps/web/src/app/optimize/page.tsx` and update rotation tables in `apps/web/src/app/presets/page.tsx` and `apps/web/src/app/teams/page.tsx`

## Phase 2: Unit Tests & Verification

- [x] T004 Add unit tests in `apps/web/test/OptimizeViews.test.tsx` verifying reaction chips, `"No reaction"` muted markers, and hit mode badges in `BuildComparisonList` (Current and optimized), `WeaponComparisonList`, and `PresetRotationSummary` independent of label text
- [x] T005 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`
