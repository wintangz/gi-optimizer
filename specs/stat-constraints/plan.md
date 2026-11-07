# Implementation Plan: Final Stat Constraints (`stat-constraints`)

**Feature**: `stat-constraints` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add final-stat min/max constraints (`constraints?: StatConstraint[]`) to `OptimizerSettings`, carry `min` and `max` bounds through solver problem setup, `computeUpfrontTotal`, and `GOSolver` workers while preserving `tested + skipped === total` and `erFloor` backwards compatibility, and add a stat constraints editor next to the ER floor control on `/optimize`.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict), React 19, Next.js 15 static export
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/web`, `@genshin-optimizer/gi/solver`, `@genshin-optimizer/gi/wr`
**Testing**: Vitest (`packages/presets/test/settings.test.ts`, `packages/engine/test/optimizer.test.ts`, `apps/web/test/`)
**Constraints**: Zero edits inside `vendor/genshin-optimizer`; zero changes to damage formulas, GO sheets, presets, or preset schema; ER never enters the objective.

## Constitution Check

- **I. Spec-Driven Development**: `spec.md`, `research.md`, `data-model.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` completed.
- **II. Upstream Fidelity**: Mirrors GO's `prod(-1, node)` with `-max` constraint encoding (`libs/gi/pando-solver/src/index.ts`) and `input.total[stat]` nodes.
- **III. Verification**: Unit and solver integration tests for min, max, min+max band, impossible band, `erFloor` unchanged, and `erFloor` + constraints together.

## Project Structure

```text
packages/presets/
├── src/settings.ts                       # STAT_CONSTRAINT_KEYS, StatConstraint, normalizeStatConstraintValue
└── test/settings.test.ts                 # Unit tests for stat constraint helpers & settings persistence

packages/engine/
├── scripts/build-engine.mjs              # Guard pruneOrder in common.ts when forced.pruneOrder is false
├── src/
│   ├── solver.ts                         # Carry min & max through problem.constraints & computeUpfrontTotal
│   └── types.ts                          # Re-export StatConstraint, StatConstraintKey, STAT_CONSTRAINT_KEYS
└── test/optimizer.test.ts                # Solver tests for min, max, band, impossible, erFloor + constraint

apps/web/
└── src/app/optimize/page.tsx             # Constraints editor UI next to ER floor + empty state message
```
