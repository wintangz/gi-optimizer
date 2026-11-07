# Tasks: Responsive and Small Fixes (`responsive-and-small-fixes`)

**Input**: Design documents from `/specs/responsive-and-small-fixes/`

## Phase 1: Responsive Grids, Control Heights & Dropzone Styling
- [x] T001 Update `apps/web/src/app/globals.css` to collapse `.formula-factors-grid` and `.tile-picker-pieces` at `@media (max-width: 640px)`, raise `.tile-picker-piece-btn` and small repeated-use controls to `min-height: 32px`, and style `.gi-dropzone.is-drag-over`.

## Phase 2: SaveIcon, Dropzone Interaction & Zero-Match Empty States
- [x] T002 Add `SaveIcon` in `apps/web/src/components/SvgIcons.tsx` and use it on the Save button in `apps/web/src/app/teams/page.tsx`.
- [x] T003 Make `.gi-dropzone` clickable as a whole with drag-over state and add zero-match empty rows in `apps/web/src/app/import/page.tsx`.
- [x] T004 Add zero-match empty state messages in `WeaponTilePicker`, `CharacterTilePicker`, and `ArtifactSetTilePicker` (`apps/web/src/components/TilePickers.tsx`).

## Phase 3: Regression Tests & Verification
- [x] T005 Add unit tests in `apps/web/test/TilePickers.test.tsx`, `apps/web/test/ImportPage.test.tsx`, and `apps/web/test/teams-deferred-start.test.tsx`.
