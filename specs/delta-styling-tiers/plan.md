# Implementation Plan: Delta Styling Tiers (`delta-styling-tiers`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/delta-styling-tiers/spec.md)

## Summary

Reserve the red `error` class for actual errors (such as `"No build meets constraints"`) and style negative relative deltas with the neutral `muted` class across all result surfaces: `formatRelativeDelta` (build rows, damage instance `vs. Current` cells, team summary and member rows), `formatCoreStatComparison` (core stat comparison tables), `WeaponComparisonList` (weapon rows and top-build cards), and `BuildComparisonBars`.

## Technical Context

**Language/Version**: TypeScript 5.6 / React 18.3 / Next.js 14.2
**Primary Dependencies**: `@gi/web` (`OptimizeViews.tsx`, `Identifier.tsx`)
**Storage**: N/A (presentation only)
**Testing**: Vitest (`apps/web/test/OptimizeViews.test.tsx`, `apps/web/test/Identifier.test.tsx`)
**Target Platform**: Browser (Static Next.js web export)
**Performance Goals**: Zero runtime overhead.
**Constraints**: Presentation only; no change to computed numbers, rankings, or stored data; golden fixtures byte-identical.

## Constitution Check

- **Golden Fixture Reproduction**: Pass (no solver or formula changes).
- **Vendored Reference Isolation**: Pass (`vendor/genshin-optimizer` untouched).
- **Browser-Safe Solver Boundaries**: Pass (UI presentation only).
- **Minimal-Diff Discipline**: Pass (localized to delta class assignments in `OptimizeViews.tsx` and `Identifier.tsx`).

## Project Structure

### Documentation (this feature)

```text
specs/delta-styling-tiers/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/src/components/
├── OptimizeViews.tsx
└── Identifier.tsx
apps/web/test/
├── OptimizeViews.test.tsx
└── Identifier.test.tsx
```
