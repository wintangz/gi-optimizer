# Implementation Plan: Responsive and Small Fixes (`responsive-and-small-fixes`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/responsive-and-small-fixes/spec.md)

## Summary

1. **Responsive Grids & Control Heights (`apps/web/src/app/globals.css`)**:
   - Raise `.tile-picker-piece-btn`, `.gi-buff-switch`, `.gi-buff-select`, and `.constraint-picker-chip` to `min-height: 32px`.
   - Collapse `.formula-factors-grid` and `.tile-picker-pieces` at `@media (max-width: 640px)`.
   - Style `.gi-dropzone` with `cursor: pointer` and `.gi-dropzone.is-drag-over` with a distinct border/fill highlight.
2. **Distinct `SaveIcon` (`apps/web/src/components/SvgIcons.tsx`, `apps/web/src/app/teams/page.tsx`)**:
   - Add `SaveIcon` (`data-gi-icon="SaveIcon"`) in `SvgIcons.tsx` and use it on the `Save` button (`data-testid="teams-save-btn"`) in `teams/page.tsx`.
3. **Clickable Dropzone with Drag-Over State & Import Table Empty States (`apps/web/src/app/import/page.tsx`)**:
   - Track `isDragOver` state on `.gi-dropzone` (`data-testid="import-dropzone"`, `data-drag-over`), wire whole-dropzone `onClick` / `onKeyDown` to `fileInputRef.current?.click()`, and stop propagation on the inner button.
   - Render `"No characters match …"`, `"No weapons match …"`, and `"No artifacts match the active filters."` rows when filtered import tables have 0 rows.
4. **Tile Picker Zero-Match Empty States (`apps/web/src/components/TilePickers.tsx`)**:
   - Render `data-testid="weapon-picker-empty"`, `data-testid="character-picker-empty"`, and `data-testid="artifact-set-picker-empty"` messages when `filtered.length === 0`.
