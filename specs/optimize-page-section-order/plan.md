# Implementation Plan: Optimize Page Section Order (`optimize-page-section-order`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

Reorder and regroup the sections in `apps/web/src/app/optimize/page.tsx` into the four logical top-to-bottom groups:
1. **Team & Buffing Settings**: `setup-card` (preset selector, `preset-team-roster` with owned/sim toggles, `PresetRotationSummary`) followed by `ConditionalTogglePanel` (`conditional-toggle-panel`).
2. **Weapon Selection**: `weapon-selection-card` containing `optimize-weapon-mode-bar` (single/compare/team mode switch), `WeaponComparisonPanel` (when in compare mode), target weapon picker (`akasha-weapon-picker-box` / `official-target-weapon-picker`), and target character/weapon check (`preset-match-box`).
3. **Artifact Settings**: `artifact-settings-card` containing artifact pool settings, `optimize-filter-panels-pair` (`protected-characters-panel` + `ArtifactSetFilter`), and `SolverPoolFiltersPanel`, followed by `ConstraintsCard` (`constraints-card`).
4. **Optimize Action & Results**: `results-card` containing the Optimize / Compare Weapons / Optimize Team button and results lists.

## Technical Context

- **Language/Version**: TypeScript 5.8 (strict), React 19, Next.js 16 (static export)
- **Primary Dependencies**: `@gi/web`
- **Testing**: Vitest (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`)

## Project Structure

- `apps/web/src/app/optimize/page.tsx`: Reorder/regroup JSX sections into the 4 top-to-bottom groups without altering state, hooks, defaults, persistence, or results rendering.
- `apps/web/test/official-owned-first-ui.test.tsx`: Add regression test asserting the top-to-bottom DOM order of the sections on `/optimize`.
