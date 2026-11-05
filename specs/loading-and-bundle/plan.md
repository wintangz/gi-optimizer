# Implementation Plan: Bundle Isolation & Animated Loading Feedback (`loading-and-bundle`)

**Branch**: `loading-and-bundle` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/loading-and-bundle/spec.md`

## Summary

Eliminate `@gi/engine` and `@genshin-optimizer/gi/stats` (`allStat_gen.json`, 2.4 MB / ~430 kB gzipped) from the shared and per-page initial JS bundles of `/`, `/import`, and `/presets`, and add animated loading feedback across all routes (`loading.tsx` skeletons, shared `Spinner`, `SkeletonBlock`, `ResultsSkeleton`, and `ProgressBar` components). Specifically:
1. Extract `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `SetFilterMode`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` into a pure module `packages/presets/src/settings.ts` (re-exported from `@gi/presets` and `@gi/engine`) and update `apps/web/src/lib/storage/{useGood,db}.ts` to import from `@gi/presets`.
2. Replace runtime `@genshin-optimizer/gi/stats` imports in `packages/presets/src/{metadata,validate,userPreset}.ts` and `packages/good/src/parseGood.ts` with a compact generated static metadata module (`statMeta.gen.ts`, ~8–12 KB) verified against `@genshin-optimizer/gi/stats` in unit tests.
3. Add CSS keyframe animations in `apps/web/src/app/globals.css`, shared loading primitives in `apps/web/src/components/Loading.tsx`, route-level `loading.tsx` skeletons on `/`, `/import`, `/presets`, `/optimize`, and `/teams`, evaluation results skeletons and real `tested / total` progress bar on `/optimize`, and labelled animated spinners across `/import`, `/presets`, `/optimize`, and `/teams`.

## Technical Context

**Language/Version**: TypeScript 5 strict

**Primary Dependencies**: pnpm workspace, Next.js 16 App Router static export (`apps/web`, frontend only), React 19, Zod 4 (`@gi/presets`), IndexedDB via `idb`, GO engine via vendored source (`vendor/genshin-optimizer`)

**Storage**: Browser IndexedDB (`idb`) via `apps/web/src/lib/storage/db.ts` (`good`, `presets`, `settings` stores)

**Testing**: Vitest (unit & component tests across `packages/*` and `apps/web`), Playwright for UI smoke tests

**Target Platform**: Modern browsers (static export, client-side + Web Worker execution)

**Project Type**: Monorepo web application (`apps/web` + `packages/good`, `packages/presets`, `packages/engine`)

**Performance Goals**: Cut shared First Load JS and `/`, `/import`, `/presets` First Load JS by >60% (from 541–573 kB baseline to <160 kB) by removing `allStat_gen.json` (~430 kB gzipped) and `@gi/engine` from synchronous page bundles; provide immediate 60fps CSS-animated visual feedback on every asynchronous wait

**Constraints**: Static export (`output: "export"`), no server code, no API routes, zero edits to `vendor/genshin-optimizer`, zero new npm dependencies

**Scale/Scope**: 3 workspace packages (`@gi/good`, `@gi/presets`, `@gi/engine`) + all 5 routes in `apps/web` (`/`, `/import`, `/presets`, `/optimize`, `/teams`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client (NON-NEGOTIABLE)**: PASS — All route `loading.tsx` files, `Loading.tsx` components, and bundle optimizations are strictly client/static frontend code; no server routes or actions exist.
- **II. GO Formula Fidelity (NON-NEGOTIABLE)**: PASS — Damage calculations in `@gi/engine` continue to use the unmodified vendored GO engine in the Web Worker; `statMeta.gen.ts` is generated directly from `@genshin-optimizer/gi/stats` and verified for 100% parity against `@genshin-optimizer/gi/stats` in unit tests.
- **III. Import Is GOOD Only**: PASS — `parseGood.ts` continues to validate GOOD v1–v3 only and reports identical plain-language issues using `statMeta.gen.ts`.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — Unchanged.
- **V. Single-Character, Akasha-Style Objective**: PASS — Unchanged; `OptimizerSettings` and `DEFAULT_OPTIMIZER_SETTINGS` preserve ER as an optional floor constraint only.

## Project Structure

### Documentation (this feature)

```text
specs/loading-and-bundle/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── research.md          # Phase 0 architecture & bundle root-cause decisions
├── data-model.md        # Phase 1 contracts for statMeta, settings, and Loading components
├── plan.md              # This implementation plan
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
packages/good/
├── src/
│   ├── statMeta.gen.ts          # Compact static char/weapon/artifact metadata (~8-12 KB)
│   ├── parseGood.ts             # Uses ./statMeta.gen instead of @genshin-optimizer/gi/stats
│   └── index.ts                 # Re-exports statMeta.gen
└── test/
    └── statMeta.test.ts         # Verifies parity with @genshin-optimizer/gi/stats & no runtime gi/stats imports

packages/presets/
├── scripts/
│   └── generate-stat-meta.ts    # Generates statMeta.gen.ts from @genshin-optimizer/gi/stats
├── src/
│   ├── statMeta.gen.ts          # Compact static char/weapon/artifact metadata (~8-12 KB)
│   ├── settings.ts              # Pure OptimizerSettings, DEFAULT_OPTIMIZER_SETTINGS, SetFilterMode, resolveArtSetExclusion
│   ├── metadata.ts              # Uses ./statMeta.gen instead of @genshin-optimizer/gi/stats
│   ├── validate.ts              # Uses ./statMeta.gen instead of @genshin-optimizer/gi/stats
│   ├── userPreset.ts            # Uses ./statMeta.gen instead of @genshin-optimizer/gi/stats
│   └── index.ts                 # Re-exports ./settings and ./statMeta.gen
└── test/
    └── statMeta.test.ts         # Verifies statMeta parity & pure settings exports

packages/engine/
└── src/
    ├── types.ts                 # Re-exports OptimizerSettings, DEFAULT_OPTIMIZER_SETTINGS, SetFilterMode, resolveArtSetExclusion from @gi/presets
    ├── solver.ts                # Uses resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)
    └── index.ts                 # Re-exports settings types/helpers for backward compatibility

apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css          # Keyframes (gi-spin, gi-pulse, gi-progress-shimmer) & loading classes
│   │   ├── loading.tsx          # Root route skeleton
│   │   ├── import/
│   │   │   ├── loading.tsx      # /import route skeleton
│   │   │   └── page.tsx         # Animated Spinner ("Parsing GOOD file…") + storage skeleton
│   │   ├── presets/
│   │   │   ├── loading.tsx      # /presets route skeleton
│   │   │   └── page.tsx         # Animated skeleton while IndexedDB presets/account hydrate
│   │   ├── optimize/
│   │   │   ├── loading.tsx      # /optimize route skeleton
│   │   │   └── page.tsx         # Engine init/eval Spinner, ResultsSkeleton, ProgressBar (tested / total)
│   │   └── teams/
│   │       ├── loading.tsx      # /teams route skeleton
│   │       └── page.tsx         # Catalog & live rotation preview Spinner / skeleton
│   ├── components/
│   │   └── Loading.tsx          # Shared Spinner, SkeletonBlock, ResultsSkeleton, ProgressBar
│   └── lib/
│       ├── engine/
│       │   └── workerClient.ts  # Adds isEngineSessionHydrated(datasetKey) helper; imports OptimizerSettings from @gi/presets
│       └── storage/
│           ├── db.ts            # Imports OptimizerSettings from @gi/presets (zero @gi/engine import)
│           └── useGood.ts       # Imports DEFAULT_OPTIMIZER_SETTINGS & OptimizerSettings from @gi/presets
└── test/
    └── loading-and-bundle.test.tsx  # Component tests for Loading primitives + bundle import isolation guard
```

**Structure Decision**: Existing monorepo layout (`packages/good`, `packages/presets`, `packages/engine`, `apps/web`). Pure settings and static metadata live in `packages/presets` and `packages/good` so `apps/web` routes never pull `@gi/engine` or `@genshin-optimizer/gi/stats` into synchronous page bundles.

## Complexity Tracking

No Constitution violations. Zero new external dependencies.
