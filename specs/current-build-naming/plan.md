# Implementation Plan: Current Build Naming (`current-build-naming`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/current-build-naming/spec.md)

## Summary

Unify all visible labels for the user's currently equipped build/weapon on `"Current"` (replacing `"Baseline"` in `BuildComparisonList` and `"Current Baseline"` in `WeaponComparisonPanel` and `WeaponComparisonList`, plus `"Current Build"` in `BuildComparisonBars`), with `title="Your currently equipped build"` on each indicator.

## Technical Context

**Language/Version**: TypeScript 5.6 / React 18.3 / Next.js 14.2
**Primary Dependencies**: `@gi/web` (`OptimizeViews.tsx`, `Identifier.tsx`)
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
specs/current-build-naming/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/src/components/
├── Identifier.tsx
└── OptimizeViews.tsx
apps/web/test/
└── OptimizeViews.test.tsx
```
