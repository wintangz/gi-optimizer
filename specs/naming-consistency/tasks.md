# Tasks: Naming Consistency (`naming-consistency`)

**Input**: Design documents from `/specs/naming-consistency/`

## Phase 1: Destination & Entry-Point Naming
- [x] T001 Unify `/teams` label (`Custom Teams`) and `/optimize` entry-point label (`Optimize`) across `apps/web/src/components/Nav.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/teams/page.tsx`.

## Phase 2: Artifact Set Full Display Names & Preset-Kind Badge
- [x] T002 Use `meta.setDisplayName` in `apps/web/src/components/ArtifactSetFilter.tsx`, `apps/web/src/components/TilePickers.tsx` (`ArtifactSetTilePicker`), and `apps/web/src/components/Identifier.tsx` (`ArtifactBadge`).
- [x] T003 Replace `.tile-picker-subcaption` with `.tile-picker-kind-badge` in `PresetTilePicker` (`apps/web/src/components/TilePickers.tsx` and `apps/web/src/app/globals.css`).

## Phase 3: Regression Tests & Verification
- [x] T004 Update and add unit tests in `apps/web/test/TilePickers.test.tsx`, `apps/web/test/ArtifactSetFilter.test.tsx`, `apps/web/test/Identifier.test.tsx`, and `apps/web/test/teams-deferred-start.test.tsx`.
