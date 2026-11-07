# Implementation Plan: Proportional Result Bars (`proportional-result-bars`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/proportional-result-bars/spec.md)

## Summary

Replace the `Math.max(4, Math.min(100, ...))` percentage floor with `Math.max(0, Math.min(100, ...))` across `BuildComparisonList`, `WeaponComparisonList` (weapon rows and top-build rows) in `apps/web/src/components/OptimizeViews.tsx`, and `BuildComparisonBars` in `apps/web/src/components/Identifier.tsx`, so result bar widths and tooltips show the true proportion of the leader.

## Technical Context

**Language/Version**: TypeScript 5.6 / React 18.3 / Next.js 14.2
**Primary Dependencies**: `@gi/web` (`OptimizeViews.tsx`, `Identifier.tsx`, `globals.css`)
**Storage**: N/A (presentation only)
**Testing**: Vitest (`apps/web/test/OptimizeViews.test.tsx`, `apps/web/test/Identifier.test.tsx`)
**Target Platform**: Browser (Static Next.js web export)
**Performance Goals**: Zero runtime overhead.
**Constraints**: Presentation only; no change to computed numbers, rankings, or stored data; golden fixtures byte-identical.

## Constitution Check

- **Golden Fixture Reproduction**: Pass.
- **Vendored Reference Isolation**: Pass.
- **Browser-Safe Solver Boundaries**: Pass.
- **Minimal-Diff Discipline**: Pass.

## Project Structure

### Documentation (this feature)

```text
specs/proportional-result-bars/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/src/
├── app/globals.css
└── components/
    ├── Identifier.tsx
    └── OptimizeViews.tsx
apps/web/test/
├── Identifier.test.tsx
└── OptimizeViews.test.tsx
```
