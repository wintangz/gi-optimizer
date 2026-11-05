# Implementation Plan: Engine & Web Performance Optimization (`performance`)

**Branch**: `performance` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/performance/spec.md`

## Summary

Eliminate redundant GOOD database imports, synchronous main-thread engine execution, uncached sheet scans, and up-front solver permutation materialization across `@gi/engine` and `apps/web`. Specifically:
1. Remove top-level runtime imports of `@gi/engine` from `/optimize` and `/teams` so pages render immediately, delegating all engine calls to a persistent Web Worker client (`apps/web/src/lib/engine/workerClient.ts` + `apps/web/src/workers/optimizer.worker.ts`).
2. Restructure `packages/engine/src/session.ts` so `createSession(good)` imports `good` into ONE `ArtCharDatabase` instance once per session, `hydratePresetTeam(db, preset)` updates only `db.teams`/`db.teamChars`/`db.buildTcs` without re-importing GOOD, `evaluate()` and `optimize()` reuse that `db` with non-mutating `overrideArts`/`overrideWeapon`, and only `exportGODatabase()` creates a mutated export clone.
3. Cache `listTargetsForCharacter` and `listConditionalsForCharacter` in module-level `Map`s in `packages/engine/src/catalog.ts`, precomputing global artifact-set, weapon-by-`weaponType`, resonance, and reaction conditionals once per process and filtering weapons to `allStats.char.data[cKey].weaponType`, plus debouncing `/teams` live rotation previews by 150 ms.
4. Remove the up-front `Array.from(filterFeasiblePerm(...))` + `countBuilds` pass in `packages/engine/src/solver.ts`, iterating lazily during the split/compute loop.
5. Add a reproducible benchmark test (`packages/engine/test/perf-benchmark.test.ts`) on the 1,157-artifact `Van_2025-07-16_19-59-13.json` GOOD file.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@genshin-optimizer/gi/*` & `@genshin-optimizer/common/*` (vendored at `vendor/genshin-optimizer`), `@gi/engine`, `@gi/presets`, `@gi/good`, React 19, Next.js 16 App Router (static export)
**Storage**: Browser IndexedDB via `idb` (`good`, `presets`, `settings` stores)
**Testing**: Vitest (`packages/engine/test/*.test.ts` including golden fixture tests and `perf-benchmark.test.ts`), Playwright for UI smoke tests
**Target Platform**: Browser client-side + Web Worker (Next.js static export)
**Project Type**: Monorepo (`packages/engine` + `apps/web`)
**Performance Goals**: Warm preset switch / `session.evaluate` ≤ 50 ms on 1,157-artifact GOOD file; cached 4-member team catalog lookup ≤ 5 ms; zero synchronous `@gi/engine` runtime imports on `/optimize` and `/teams`; full optimization < 60 s
**Constraints**: Frontend-only static export (no server/API routes); GO formula fidelity within ≤ 0.1% relative error against golden fixtures; ER never enters the damage objective
**Scale/Scope**: ~1,157 artifacts, 81 characters (`Van_2025-07-16_19-59-13.json`), 40+ artifact sets, 180+ weapons

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — `apps/web` remains a static Next.js export with all calculation and optimization running client-side in `optimizer.worker.ts`.
- **II. GO Formula Fidelity**: PASS — uses GO's unmodified `ArtCharDatabase`, `getTeamData`, `uiDataForTeam`, `BNBSplitWorker`, and `ComputeWorker`; preserves 100% golden fixture parity (`packages/engine/test/golden.test.ts`).
- **III. Import Is GOOD Only**: PASS — consumes the existing `IGOOD` record from IndexedDB.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — unchanged preset schema and account matching rules.
- **V. Single-Character, Akasha-Style Objective**: PASS — single target character rotation sum; ER never enters the objective.

## Project Structure

### Documentation (this feature)

```text
specs/performance/
├── plan.md              # Implementation plan
├── research.md          # Phase 0 architecture & performance research decisions
├── data-model.md        # Phase 1 session cache, catalog cache, and worker protocol models
├── tasks.md             # Phase 2 actionable task list
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
packages/engine/
├── src/
│   ├── index.ts         # Exports hydratePresetTeam alongside existing engine API
│   ├── session.ts       # Single ArtCharDatabase per session + hydratePresetTeam(db, preset)
│   ├── catalog.ts       # Module-level target/conditional Map caches + weaponType filtering
│   └── solver.ts        # Lazy filterFeasiblePerm iteration without up-front countBuilds pass
└── test/
    ├── golden.test.ts          # Existing GO golden parity suite (must stay green)
    ├── optimizer.test.ts       # Existing solver & session unit tests
    └── perf-benchmark.test.ts  # New reproducible benchmark on 1,157-artifact GOOD dataset

apps/web/src/
├── lib/engine/
│   └── workerClient.ts         # Persistent singleton Web Worker client (init/evaluate/optimize/catalog/exportGO/cancel)
├── workers/
│   └── optimizer.worker.ts     # Stateful worker holding single EngineSession per active GOOD dataset
└── app/
    ├── optimize/
    │   └── page.tsx            # Type-only @gi/engine imports; off-main-thread evaluate/optimize/exportGO via workerClient
    └── teams/
        └── page.tsx            # Type-only @gi/engine imports; cached catalog + 150ms debounced preview via workerClient
```

**Structure Decision**: Modify existing `packages/engine/src/{session,catalog,solver,index}.ts` and `apps/web/src/{workers/optimizer.worker.ts,app/optimize/page.tsx,app/teams/page.tsx}`, and add `apps/web/src/lib/engine/workerClient.ts` plus `packages/engine/test/perf-benchmark.test.ts`. No new packages or external dependencies are required.

## Complexity Tracking

No Constitution violations.
