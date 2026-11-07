# Feature Specification: Responsive and Small Fixes (`responsive-and-small-fixes`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Implemented

## Overview

Fix responsive grid squeezing on narrow screens, raise small repeated-use button targets to a usable height, make the import dropzone clickable as a whole with a visible drag-over state, distinguish the Teams editor's Save icon from Export JSON's download icon, and display `"no matches"` empty states on zero-match searches in tile pickers and import tables.

## User Scenarios & Testing

### User Story 1 — Responsive Grids & Usable Touch/Click Target Heights (Priority: P1)
As a user on narrow viewports (`~640px` and below) or interacting with piece-count and buff controls, I want 3-column grids (`.formula-factors-grid`, `.tile-picker-pieces`) to collapse to fewer columns and small repeated-use controls (`Both`/`2pc`/`4pc` `.tile-picker-piece-btn`) to have a usable `~32px` height.

**Independent Test**: Verify `.tile-picker-piece-btn` has `min-height: 32px` and `@media (max-width: 640px)` collapses `.formula-factors-grid` and `.tile-picker-pieces` in `apps/web/src/app/globals.css`.

### User Story 2 — Whole-Dropzone Click & Drag-Over State, Distinct Save Icon, and Zero-Match Empty States (Priority: P1)
As a user importing files, saving custom teams, or searching pickers and import tables:
- Clicking anywhere on `.gi-dropzone` opens the file picker, and dragging a file over it shows a visible drag-over state (`is-drag-over`, `data-drag-over="true"`).
- The Teams editor's `Save` button uses `SaveIcon` (`data-gi-icon="SaveIcon"`), distinct from `Export JSON`'s `DownloadIcon` (`data-gi-icon="DownloadIcon"`).
- Searching with zero matches in `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, or the import character/weapon/artifact tables displays a clear `"no matches"` message.

**Independent Test**: Unit-test dropzone click and drag events in `ImportPage.test.tsx`, zero-match searches in `TilePickers.test.tsx` and `ImportPage.test.tsx`, and `SaveIcon` vs `DownloadIcon` in `teams-deferred-start.test.tsx`.

## Functional Requirements

- **FR-001**: `.formula-factors-grid` and `.tile-picker-pieces` MUST collapse to fewer columns at `@media (max-width: 640px)`.
- **FR-002**: `.tile-picker-piece-btn` (`Both`/`2pc`/`4pc`) and small repeated-use controls MUST have a usable height (`min-height: 32px`).
- **FR-003**: `.gi-dropzone` in `apps/web/src/app/import/page.tsx` MUST be clickable as a whole and render a visible drag-over state (`is-drag-over`, `data-drag-over="true"`).
- **FR-004**: The `Save` button in `apps/web/src/app/teams/page.tsx` MUST render `SaveIcon` (`data-gi-icon="SaveIcon"`), distinct from `Export JSON`'s `DownloadIcon`.
- **FR-005**: Zero-match searches in `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, and the import tables in `apps/web/src/app/import/page.tsx` MUST render a `"no matches"` empty state message.
