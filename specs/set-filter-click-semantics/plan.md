# Implementation Plan: Artifact Set Filter Click Semantics

**Branch**: `main` (`specs/set-filter-click-semantics`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Preserve Mode on Set / Piece / Bulk Interactions (`apps/web/src/components/ArtifactSetFilter.tsx`)**:
   - In `handleToggleSet`, `handlePieceChange`, `handleSelectAll`, and `handleInvert`, pass `mode` directly to `commitFilter(mode, nextSel)` instead of `mode === 'all' ? 'exclude' : mode`.
2. **Clarify Summary Text in `"All sets"` Mode (`packages/presets/src/settings.ts`)**:
   - In `summarizeArtSetFilter`, when `mode === 'all'`:
     - If `selectedCount === 0`, return `text = "All ${totalSets} artifact sets allowed"`.
     - If `selectedCount > 0`, return `text = "All ${totalSets} artifact sets allowed (${selectedCount} selected — choose Exclude selected or Only these sets to apply)"`.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`pnpm --filter @gi/presets test` and `pnpm --filter @gi/web test`)
