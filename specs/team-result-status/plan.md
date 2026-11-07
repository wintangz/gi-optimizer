# Implementation Plan: Team Result Status (`team-result-status`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/team-result-status/spec.md)

## Summary

Update `TeamOptimizationList` in `apps/web/src/components/OptimizeViews.tsx` (and `.is-best` selectors in `apps/web/src/app/globals.css`) so member rows and the team summary banner only receive `is-best` / `comp-rank-best` and `ok` styling when their relative delta is positive (`sign === '+'`), and receive neutral/muted styling when unchanged (`sign === '0'`) or below baseline (`sign === '-'`).

## Technical Context

**Language/Version**: TypeScript 5.6 / React 18.3 / Next.js 14.2
**Primary Dependencies**: `@gi/web` (`OptimizeViews.tsx`, `globals.css`)
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
specs/team-result-status/
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
└── components/OptimizeViews.tsx
apps/web/test/
└── OptimizeViews.test.tsx
```
