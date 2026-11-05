# Implementation Plan: Single-Character Optimizer (`single-character-optimizer`)

**Branch**: `single-character-optimizer` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Implement `@gi/engine` (`packages/engine`) wrapping the vendored Genshin Optimizer database, team calculation (`getTeamData`, `uiDataForTeam`), custom multi-target rotation evaluator, and artifact solver, plus golden fixtures for sample characters (Furina, Neuvillette, Hu Tao Vaporize, Raiden Shogun) verified against GO's unmodified `getTeamDataCalc`, and the `/optimize` page in `apps/web` with preset selection, weapon override, GO-style optimizer settings, Web Worker execution with live progress/cancel, current-vs-optimized build comparison, and "Verify in GO" export.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@genshin-optimizer/gi/*` & `@genshin-optimizer/common/*` (vendored at `vendor/genshin-optimizer`), `@gi/presets`, `@gi/good`, React 19, Next.js 16 (webpack static export)
**Storage**: Browser IndexedDB (`settings` store for `OptimizerSettings`, `good` store for imported account)
**Testing**: Vitest (`packages/engine/test/*.test.ts` including golden fixture parity tests ≤0.1% relative error)
**Target Platform**: Browser client-side + Web Worker
**Project Type**: Monorepo package (`packages/engine`) + web route (`apps/web/src/app/optimize`)
**Performance Goals**: Optimize ~1,000 artifacts in <60 s; progress updates ≥1/s; cancel within <2 s
**Constraints**: ER never enters objective; single character only; relative error vs GO ≤ 1e-3

## Constitution Check

- **I. Frontend-Only Client**: PASS — runs entirely in browser / Web Worker; static export verified.
- **II. GO Formula Fidelity**: PASS — calls GO's own `ArtCharDatabase`, `getTeamData`, `uiDataForTeam`, and `optimize` nodes; verified by golden fixtures.
- **III. Import Is GOOD Only**: PASS — consumes GOOD from `@gi/good`.
- **IV. Presets Are Plain JSON**: PASS — consumes `Preset` from `@gi/presets` and blocks when `matchAccount` fails.
- **V. Single-Character, Akasha-Style Objective**: PASS — sums target's rotation damage instances (`CustomMultiTarget` × `repeat`), excludes ER from objective, treats ER floor and artifact pool rules as user `OptimizerSettings`.

## Project Structure

```text
packages/engine/
├── package.json
├── tsconfig.json
├── vitest.config.mts
├── scripts/
│   └── capture-golden.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── session.ts
│   ├── solver.ts
│   └── catalog.ts
└── test/
    ├── golden/
    │   ├── furina.json
    │   ├── neuvillette.json
    │   ├── hutao.json
    │   └── raiden.json
    ├── golden.test.ts
    └── optimizer.test.ts

apps/web/src/
├── workers/
│   └── optimizer.worker.ts
└── app/optimize/
    └── page.tsx
```
