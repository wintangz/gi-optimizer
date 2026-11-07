# Implementation Plan: Optimize Filter Panels Matched Pair Alignment (`optimize-panels-alignment`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Align the Protected Characters panel and the Artifact Set Filter panel on `/optimize` into a matched side-by-side pair with identical top edges, equal heights, aligned header and search row baselines, equal-Y scrollable tile grids, consistent borders/padding, and vertical stacking on narrow viewports.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15 (static export)
- **Primary Dependencies**: `@gi/presets`, `@gi/good` (unchanged)
- **Testing**: Vitest (`apps/web/test/`)
- **Constraints**: Layout-only change; zero behaviour changes; never touch `vendor/genshin-optimizer`.

## Project Structure

- `apps/web/src/app/globals.css`: Add `.opt-filter-pair`, `.opt-filter-panel`, `.opt-filter-panel-header`, `.opt-filter-panel-title`, `.opt-filter-panel-summary`, `.opt-filter-panel-subbar`, `.opt-filter-mode-group`, `.opt-filter-panel-toolbar`, and responsive `@media (max-width: 860px)` stacking rules.
- `apps/web/src/components/ArtifactSetFilter.tsx`: Use `.opt-filter-panel`, `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, and `.tile-picker-toolbar` while preserving all existing test IDs, ARIA labels, and behaviour.
- `apps/web/src/app/optimize/page.tsx`: Render Protected Characters inside `.opt-filter-panel` (`data-testid="protected-characters-panel"`) with `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, and `CharacterTilePicker` (`searchable={true}`) inside `.opt-filter-pair` (`data-testid="optimize-filter-panels-pair"`).
- `apps/web/test/ArtifactSetFilter.test.tsx` & `apps/web/test/official-owned-first-ui.test.tsx`: Add layout alignment assertions for the matched pair.
