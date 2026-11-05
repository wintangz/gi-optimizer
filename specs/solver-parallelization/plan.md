# Implementation Plan: Multi-Worker Solver Parallelization & Fixed Progress Totals (`solver-parallelization`)

**Branch**: `solver-parallelization` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/solver-parallelization/spec.md`

## Summary

Replace the hand-rolled single-threaded branch-and-bound loop in `packages/engine/src/solver.ts` with Genshin Optimizer's multi-worker `GOSolver` (`@genshin-optimizer/gi/solver`), matching `docs/architecture.md` (`new GOSolver(problem, status, maxWorkers).solve()`):
1. **Multi-Core `GOSolver` Integration**: Construct `OptProblemInput` (`arts: split`, `optimizationTarget`, `exclusion`, `constraints`, `topN`), determine worker count from hardware concurrency (`Math.max(1, Math.min(opts?.maxWorkers ?? hardwareConcurrency, 8))`), run `await solver.solve()`, and merge top builds across workers via `mergeBuilds(results.map((x) => x.builds), topN)`. Forward `opts?.maxWorkers` from `session.optimize` in `packages/engine/src/session.ts` while keeping `EngineSession.optimize`, `EngineSession.evaluate`, and `workerClient` public signatures unchanged.
2. **Prebuilt `BackgroundWorker` for Browser & Node/Vitest**: Prebuild GO's `vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/BackgroundWorker.ts` into `apps/web/public/workers/BackgroundWorker.js` (for browser nested Web Workers) and `packages/engine/dist/BackgroundWorker.mjs` (for Node/Vitest `worker_threads` via a lightweight W3C `Worker` shim in `packages/engine/src/nodeWorkerShim.ts`), rewriting `new URL('./BackgroundWorker.ts', import.meta.url)` at bundle/transform time without modifying `vendor/genshin-optimizer`.
3. **Fixed Upfront Total & Throttled (~4 Hz) Progress**: Compute the exact post-`pruneAll` feasible build count (`upfrontTotal`) before `solver.solve()` begins so `OptimizeProgress.total` is known and unchanging from `0%` to `100%`, remove the per-4-chunk `setTimeout(0)` yields and progress posts from the hot path, and report progress on a `250 ms` interval plus initial and final reports.
4. **Prompt Cancellation & Deterministic Worker Cleanup**: Wire `AbortSignal` to call `solver.cancel(AbortError)` immediately on abort, and invoke `solver.cancel()` + `clearInterval` inside `finally` after `solver.solve()` (also cleaning up `GOSolver`'s internal `trackBuildsPerSecond` timer on mid-run abort) so zero orphaned `BackgroundWorker` instances or timers remain.
5. **Correctness Gates & Full-Account Benchmarks**: Verify exhaustive-search equality, ER-floor constraints, Akasha isolation, and golden fixtures, plus add a full-account equivalence check and before/after wall-time + total-count benchmark on `Van_2025-07-16_19-59-13.json` (`official/furina-salon-subdps`, unfiltered and single-4pc-set filtered).

## Technical Context

**Language/Version**: TypeScript 5 strict
**Primary Dependencies**: pnpm workspace, Next.js 16 App Router static export (`apps/web`, frontend only), `@genshin-optimizer/gi/solver` (`GOSolver`, `BackgroundWorker`, `mergeBuilds`, `pruneAll`, `pruneExclusion`, `artSetPerm`, `filterFeasiblePerm`, `filterArts`, `countBuilds`) via vendored source (`vendor/genshin-optimizer`), IndexedDB via `idb`
**Storage**: Browser IndexedDB via `idb` (unchanged)
**Testing**: Vitest (`packages/engine/test/optimizer.test.ts`, `packages/engine/test/perf-benchmark.test.ts`, `packages/engine/test/golden.test.ts`, `packages/engine/test/akasha-isolation.test.ts`), Playwright for UI smoke tests
**Target Platform**: Browser client-side Web Workers (`optimizer.worker.js` spawning `BackgroundWorker.js` sub-workers) and Node.js >= 22 (`node:worker_threads` spawning `BackgroundWorker.mjs` in Vitest)
**Project Type**: Monorepo (`packages/engine` + `apps/web`)
**Performance Goals**: Multi-core parallel speedup across `min(hardwareConcurrency, 8)` workers; zero `setTimeout(0)` yields in the compute loop; progress throttled to ~4 Hz (250 ms); invariant upfront `total` from first to last progress report; zero leaked workers after completion or cancellation
**Constraints**: Frontend-only static export (no server, no API routes); `vendor/genshin-optimizer` is strictly read-only; GO formula fidelity within <= 0.1% relative error against golden fixtures; ER never enters the damage objective
**Scale/Scope**: 1,157-artifact GO sample account (`Van_2025-07-16_19-59-13.json`, `2.08B` raw Cartesian product / `~1.05B` post-`pruneAll` unfiltered builds)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client (NON-NEGOTIABLE)**: PASS — All optimization runs client-side in Web Workers (`optimizer.worker.js` coordinating `BackgroundWorker.js` instances). No server or API routes are introduced.
- **II. GO Formula Fidelity (NON-NEGOTIABLE)**: PASS — Uses GO's unmodified `GOSolver`, `BackgroundWorker`, `BNBSplitWorker`, `DefaultSplitWorker`, `ComputeWorker`, `pruneAll`, `pruneExclusion`, and `mergeBuilds` directly from `vendor/genshin-optimizer` without editing the submodule.
- **III. Import Is GOOD Only**: PASS — Unchanged.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — Unchanged.
- **V. Single-Character, Akasha-Style Objective**: PASS — Maximizes single target character rotation sum; ER floor remains an optional hard constraint (`input.total.enerRech_`) and never enters the objective.

## Project Structure

### Documentation (this feature)

```text
specs/solver-parallelization/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 root-cause analysis, build-count math, and worker bundling decisions
├── data-model.md        # Phase 1 solver problem, status, build count, and worker lifecycle models
├── tasks.md             # Phase 2 dependency-ordered implementation tasks
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
packages/engine/
├── scripts/
│   └── build-engine.mjs                # Bundles BackgroundWorker into apps/web/public/workers/BackgroundWorker.js and packages/engine/dist/BackgroundWorker.mjs, and rewrites GOSolver worker URL
├── src/
│   ├── solver.ts                       # Replaces hand-rolled loop with GOSolver + upfrontTotal + 250ms progress + AbortSignal/finally cleanup
│   ├── nodeWorkerShim.ts               # Lightweight W3C Worker polyfill over node:worker_threads for Node/Vitest execution of GOSolver
│   └── session.ts                      # Forwards opts?.maxWorkers from session.optimize() to runSolver()
└── test/
    ├── optimizer.test.ts               # Unit tests: exhaustive equality, fixed upfront total, 250ms throttle, AbortSignal & worker cleanup, full-account equivalence
    └── perf-benchmark.test.ts          # Full-account benchmark on Van_2025-07-16_19-59-13.json (unfiltered & 1-set filtered wall time + total count)

apps/web/
└── public/
    └── workers/
        └── BackgroundWorker.js         # Prebuilt browser worker bundle spawned by GOSolver
```

**Structure Decision**: Update `packages/engine/src/solver.ts` and `packages/engine/src/session.ts`, add `packages/engine/src/nodeWorkerShim.ts` for Node/Vitest `worker_threads` compatibility, update/add the prebuild target in `packages/engine/scripts/build-engine.mjs` to emit `apps/web/public/workers/BackgroundWorker.js` and `packages/engine/dist/BackgroundWorker.mjs`, and expand `packages/engine/test/optimizer.test.ts` and `packages/engine/test/perf-benchmark.test.ts`.

## Complexity Tracking

No Constitution violations.
