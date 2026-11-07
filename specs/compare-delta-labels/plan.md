# Implementation Plan: Compare Delta Labels (`compare-delta-labels`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/compare-delta-labels/spec.md)

## Summary

In `WeaponComparisonList` (`apps/web/src/components/OptimizeViews.tsx`), label weapon-row delta chips (`weapon-compare-delta-${wKey}`) as `${behindText} vs. leader` (`data-delta-scope="leader"`) and expanded top-build delta chips (`weapon-compare-build-delta-${wKey}-${bIdx}`) as `${buildBehindText} vs. weapon best` (`data-delta-scope="weapon-best"`), with explicit tooltips on both.

## Technical Context

**Language/Version**: TypeScript 5.6 / React 18.3 / Next.js 14.2
**Primary Dependencies**: `@gi/web` (`OptimizeViews.tsx`)
**Storage**: N/A (presentation only)
**Testing**: Vitest (`apps/web/test/OptimizeViews.test.tsx`)
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
specs/compare-delta-labels/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/src/components/
└── OptimizeViews.tsx
apps/web/test/
└── OptimizeViews.test.tsx
```
