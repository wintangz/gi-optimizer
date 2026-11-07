# Implementation Plan: Deep Artifact Pool Filters (`solver-filters-deep`)

**Branch**: `solver-filters-deep` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

1. Extend `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, and `migrateOptimizerSettings` in `packages/presets/src/settings.ts` with `mainStatKeys`, `requiredSubstats`, `requiredSubstatsMode`, `minRarity`, and `minRv`, plus a `summarizeSolverPoolFilters` helper.
2. Update `filterArtifactsForOptimizer` in `packages/engine/src/solver.ts` to filter candidate artifacts by `minRarity`, per-slot `mainStatKeys`, `requiredSubstats` (`'any'` or `'all'`), and `minRv` (via `computeArtifactRollValue` from `@gi/presets`).
3. Add `SolverPoolFiltersPanel` in `apps/web/src/components/OptimizeViews.tsx` and render it in the Setup section of `apps/web/src/app/optimize/page.tsx` next to `ArtifactSetFilter`.
4. Add unit and integration tests in `packages/presets/test/settings.test.ts`, `packages/engine/test/optimizer.test.ts`, and `apps/web/test/OptimizeViews.test.tsx`.

## Technical Context

- **Language/Version**: TypeScript 5.8, React 19, Next.js 16 (`output: 'export'`)
- **Dependencies**: `@gi/good` (`computeArtifactRollValue`, `ART_SLOT_MAIN_KEYS`, `ALL_SUBSTAT_KEYS`), `@gi/presets`, `@gi/engine`
- **Testing**: Vitest (`pnpm test`)
- **Constraints**: Unrestricted defaults must produce byte-identical solver results; filters apply to both `session.optimize` and `session.compareWeapons`.

## Project Structure

```text
packages/presets/
├── src/
│   └── settings.ts
└── test/
    └── settings.test.ts

packages/engine/
├── src/
│   └── solver.ts
└── test/
    └── optimizer.test.ts

apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   └── optimize/page.tsx
│   └── components/
│       └── OptimizeViews.tsx
└── test/
    └── OptimizeViews.test.tsx
```
