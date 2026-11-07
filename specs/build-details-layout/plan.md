# Implementation Plan: Build Details Layout (`build-details-layout`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Damage Table Layout**: Add `.comp-damage-table`, `.comp-dmg-col-name`, `.comp-dmg-col-compact`, `.comp-dmg-col-hits`, and `.comp-dmg-col-num` in `apps/web/src/components/OptimizeViews.tsx` and `apps/web/src/app/globals.css` so Per-Hit DMG, Subtotal DMG, and vs. Current form a compact, right-aligned numeric cluster while Reaction/Hit Mode/Hits stay compact and Damage Instance takes the remaining width.
2. **Core Stat Comparison Subheader Spacing**: Update `.comp-details-subheader` and add `.comp-details-subhint` in `apps/web/src/components/OptimizeViews.tsx` and `apps/web/src/app/globals.css` so the hint sits on its own spaced line below the heading.
3. **Artifacts Heading, Legend & 5-Column Card Grid**:
   - Update `ArtifactPieceRow` in `apps/web/src/components/Identifier.tsx` to render as a compact `.artifact-piece-card` holding the slot icon, set name + level, RV badge, main stat, compact icon+value substat lines (`.artifact-substat-line` rather than pill chips), and owner/lock badges with descriptive tooltips (`Equipped on <Character> in imported GOOD data`, `Locked in imported GOOD data`).
   - Add `BuildArtifactsSection` (with `"Artifacts"` heading, one-line legend, and `.comp-details-pieces` 5-column responsive grid) in `apps/web/src/components/OptimizeViews.tsx` and style the 5 → 3 → 2 → 1 responsive grid in `apps/web/src/app/globals.css`.

## Technical Context

- **Language/Version**: TypeScript 5.8 (strict), React 19, Next.js 16
- **Primary Dependencies**: `@gi/web`
- **Testing**: Vitest (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`)

## Project Structure

- `apps/web/src/components/Identifier.tsx`: Update `ArtifactPieceRow` to compact card layout with icon+value substat text and owner/lock tooltips.
- `apps/web/src/components/OptimizeViews.tsx`: Add `.comp-damage-table` column classes, spaced `.comp-details-subhint`, and `"Artifacts"` heading + legend around `.comp-details-pieces`.
- `apps/web/src/app/globals.css`: Add CSS rules for `.comp-damage-table`, `.comp-details-subheader` / `.comp-details-subhint`, `.comp-details-pieces` 5-column responsive grid, and `.artifact-piece-card` / `.artifact-substat-line`.
- `apps/web/test/OptimizeViews.test.tsx` & `apps/web/test/Identifier.test.tsx`: Add regression tests for `build-details-layout`.
