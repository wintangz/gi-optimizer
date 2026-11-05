# Tasks: Multi-Worker Solver Parallelization & Fixed Progress Totals (`solver-parallelization`)

**Input**: Design documents from `/specs/solver-parallelization/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

**Tests**: Included as required by the feature specification (exhaustive-search equality, ER-floor, Akasha isolation, golden fixtures, full-account equivalence, worker cleanup, fixed upfront total, and full-account wall-time benchmarks).

**Organization**: Tasks are grouped by user story to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup & Prebuilt `BackgroundWorker` Infrastructure

**Purpose**: Ensure GO's `BackgroundWorker.ts` (`vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/BackgroundWorker.ts`) is prebuilt for both browser Web Workers and Node/Vitest worker threads without modifying `vendor/genshin-optimizer`.

- [x] T001 Bundle `vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/BackgroundWorker.ts` into `apps/web/public/workers/BackgroundWorker.js` (browser nested Web Worker) and `packages/engine/dist/BackgroundWorker.mjs` (Node/Vitest worker thread, including `node:worker_threads` `parentPort` message/postMessage bridge when running inside a Node worker thread), and rewrite `new URL('./BackgroundWorker.ts', import.meta.url)` in `GOSolver.ts` during bundling in `packages/engine/scripts/build-engine.mjs`
- [x] T002 [P] Create a lightweight W3C-compatible `Worker` polyfill backed by `node:worker_threads` in `packages/engine/src/nodeWorkerShim.ts` (installed when `typeof globalThis.Worker === 'undefined'` or when `GOSolver` spawns `./BackgroundWorker.ts` in Node/Vitest) that resolves `./BackgroundWorker.ts` / `./BackgroundWorker.mjs` to `packages/engine/dist/BackgroundWorker.mjs`, dispatches `{ data }` to `worker.onmessage`, forwards `error` events to `worker.onerror`, and implements `worker.terminate()`

---

## Phase 2: Foundational Prerequisites

**Purpose**: Wire `maxWorkers` option forwarding and hardware concurrency detection before replacing the solve loop.

- [x] T003 Forward `maxWorkers: opts?.maxWorkers` from `session.optimize(preset, settings, opts)` into `runSolver(...)` in `packages/engine/src/session.ts` while keeping `EngineSession.optimize`, `EngineSession.evaluate`, and `apps/web/src/lib/engine/workerClient.ts` public signatures unchanged

**Checkpoint**: `BackgroundWorker` bundles and Node worker shim are ready; `session.optimize` forwards `maxWorkers`.

---

## Phase 3: User Story 1 - Multi-Core Parallel Build Optimization via `GOSolver` (Priority: P1) 🎯 MVP

**Goal**: Replace the hand-rolled single-threaded `BNBSplitWorker`/`DefaultSplitWorker`/`ComputeWorker` loop in `packages/engine/src/solver.ts` with GO's `GOSolver` coordinator (`new GOSolver(problem, status, maxWorkers).solve()`) and `mergeBuilds`.

**Independent Test**: Run `pnpm --filter @gi/engine test` to verify that `GOSolver` spawns parallel background workers, matches exhaustive search on reduced pools, passes ER-floor, Akasha isolation, and golden fixture suites, and returns the exact same top build and rotation total as the reference single-threaded solver on `Van_2025-07-16_19-59-13.json` for both unfiltered and single-4pc-set filtered presets.

### Tests for User Story 1

- [x] T004 [P] [US1] Add a full-account equivalence test in `packages/engine/test/optimizer.test.ts` on `vendor/genshin-optimizer/libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json` with `official/furina-salon-subdps` verifying that the `GOSolver`-backed solver returns the exact same top build (`artifactIds` and `total` within relative error `<= 1e-6`) as the reference single-threaded solver for (a) an unfiltered preset (`setFilterMode: 'all'`) and (b) an include-one-set filtered preset (`setFilterMode: 'include'`, `setFilterSelection: { GoldenTroupe: [2, 4] }`)

### Implementation for User Story 1

- [x] T005 [US1] Replace the hand-rolled single-threaded solve loop in `packages/engine/src/solver.ts` with GO's `GOSolver` (`@genshin-optimizer/gi/solver`): construct `problem: OptProblemInput` (`arts: split`, `optimizationTarget: optTargetNode`, `exclusion`, `constraints`, `topN`), compute `numWorkers = Math.max(1, Math.floor(opts?.maxWorkers ?? Math.min(hardwareConcurrency, 8)))` (using `navigator.hardwareConcurrency` or `os.availableParallelism()`, fallback `4`), run `const results = await solver.solve()`, and merge top builds via `mergeBuilds(results.map((x) => x.builds), topN)` scaled by `preset.rotation.repeat ?? 1`

**Checkpoint**: `GOSolver` executes optimization across multiple workers and passes all equivalence, ER-floor, Akasha isolation, and golden fixture tests.

---

## Phase 4: User Story 2 - Fixed Upfront Progress Total & Throttled Progress Reporting (Priority: P1)

**Goal**: Eliminate the mid-run growing `total` bug (`1.29B -> 2.08B`) and remove per-4-chunk `setTimeout(0)` yields by computing the exact post-`pruneAll` feasible build count (`upfrontTotal`) before `solver.solve()` and emitting throttled progress updates every ~250 ms (~4 Hz) plus initial and final reports.

**Independent Test**: Run `session.optimize()` with an `onProgress` spy in `packages/engine/test/optimizer.test.ts` and verify that (1) every progress event from initial (`tested: 0, skipped: 0`) to final (`tested + skipped === total`) reports the exact same fixed `total`, and (2) intermediate progress events are throttled to ~250 ms intervals.

### Tests for User Story 2

- [x] T006 [P] [US2] Add unit tests in `packages/engine/test/optimizer.test.ts` verifying that (a) `onProgress` is called with a strictly constant `total > 0` from the very first progress callback to the final callback (zero mid-run growth), (b) final `tested + skipped === total`, and (c) relationship between raw Cartesian product `countBuilds(split)` and post-`pruneAll` feasible `total` holds (`0 < total <= countBuilds(split)`)

### Implementation for User Story 2

- [x] T007 [US2] Implement `computeUpfrontTotal(problem: OptProblemInput): number` (computing `sum over filterFeasiblePerm(artSetPerm(exclusion, allSets), prunedArts) of countBuilds(filterArts(prunedArts, perm))` after `pruneExclusion` + `optimize` + `pruneAll`, with JSDoc documenting the exact mathematical relationship between raw Cartesian `countBuilds(split)` and post-`pruneAll` feasible `total`) and wire 250 ms throttled `setInterval` progress reporting (plus initial and final reports, and immediate `{ builds: [], tested: 0, skipped: 0, durationMs }` return when `upfrontTotal === 0`) in `packages/engine/src/solver.ts`

**Checkpoint**: Progress `total` is fixed from the start of every optimization run and progress callbacks are throttled to ~4 Hz with zero `setTimeout(0)` yields in the hot path.

---

## Phase 5: User Story 3 - Prompt Cancellation & Zero Orphaned Background Workers (Priority: P2)

**Goal**: Ensure `opts?.signal` (`AbortSignal`) immediately cancels all `GOSolver` workers (`solver.cancel(AbortError)`), and ensure `solver.cancel()` and `clearInterval` always execute in `finally` (including stopping `GOSolver`'s internal `trackBuildsPerSecond` timer on mid-run abort) so zero orphaned `BackgroundWorker` instances or timers remain.

**Independent Test**: Run mid-run abort, pre-aborted signal, and normal completion tests in `packages/engine/test/optimizer.test.ts` spying on `Worker.prototype.terminate` / active worker count to verify that `0` workers remain alive after completion or cancellation.

### Tests for User Story 3

- [x] T008 [P] [US3] Add worker-lifecycle and mid-run `AbortSignal` cancellation tests in `packages/engine/test/optimizer.test.ts` verifying that (a) aborting `signal` mid-solve rejects with `AbortError` and terminates all spawned `BackgroundWorker` instances, and (b) normal completion also terminates all spawned `BackgroundWorker` instances (`activeWorkers === 0`)

### Implementation for User Story 3

- [x] T009 [US3] Wire `opts?.signal` abort listener (`solver.cancel(new DOMException('Optimization aborted', 'AbortError'))`), `try / finally` cleanup (`clearInterval(progressTimer)`, `signal.removeEventListener('abort', onAbort)`, `solver.cancel()`), and `GOSolver` `trackBuildsPerSecond` interval cleanup on cancellation in `packages/engine/src/solver.ts`

**Checkpoint**: All 3 user stories are complete and independently verified.

---

## Phase 6: Polish, Full-Account Benchmark & Cross-Cutting Verification

**Purpose**: Record before/after full-account wall times and build counts in Vitest and production browser build with real Web Workers.

- [x] T010 Update `packages/engine/test/perf-benchmark.test.ts` to benchmark `session.optimize` on `vendor/genshin-optimizer/libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json` with `official/furina-salon-subdps` for both (a) unfiltered (`setFilterMode: 'all'`) and (b) include-only 1-set (`setFilterMode: 'include'`, `setFilterSelection: { GoldenTroupe: [2, 4] }`), logging raw Cartesian `countBuilds(split)`, post-`pruneAll` `total`, `tested`, `skipped`, top build total, and wall time (`durationMs`)
- [x] T011 Run `node packages/engine/scripts/build-engine.mjs`, `pnpm -r test`, `pnpm -r typecheck`, and `pnpm --filter @gi/web build`, and verify in the production-built web app with real Web Workers on `Van_2025-07-16_19-59-13.json` (`official/furina-salon-subdps`) that both unfiltered and single-4pc-set filtered optimizations complete with fixed upfront `total`, parallel `BackgroundWorker.js` execution, and zero console/worker errors

---

## Dependencies on Other Features

- **`trim-go-runtime` (`docs/architecture.md` line 134)**: Defines `packages/engine/scripts/build-engine.mjs` which prebuilds `apps/web/public/workers/optimizer.worker.js` and `packages/engine/dist/index.mjs`. Task `T001` extends (or creates, if not yet present) `packages/engine/scripts/build-engine.mjs` to also emit `apps/web/public/workers/BackgroundWorker.js` and `packages/engine/dist/BackgroundWorker.mjs` and rewrite the `BackgroundWorker.ts` URL in `GOSolver`.
- **`artifact-set-filter` (`docs/architecture.md` lines 81–82, 131)**: Provides `resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)` consumed by `runSolver` in `packages/engine/src/solver.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup: T001–T002)**: Can start immediately. T001 and T002 can run in parallel.
- **Phase 2 (Foundational: T003)**: Depends on Phase 1; updates `packages/engine/src/session.ts`.
- **Phase 3 (US1: T004–T005)**: Depends on Phase 1 and Phase 2.
- **Phase 4 (US2: T006–T007)**: Integrates with US1 in `packages/engine/src/solver.ts` and `packages/engine/test/optimizer.test.ts`.
- **Phase 5 (US3: T008–T009)**: Integrates with US1/US2 in `packages/engine/src/solver.ts` and `packages/engine/test/optimizer.test.ts`.
- **Phase 6 (Polish & Benchmark: T010–T011)**: Depends on Phases 3–5 completion.

### Parallel Opportunities

- `T001` (`packages/engine/scripts/build-engine.mjs`), `T002` (`packages/engine/src/nodeWorkerShim.ts`), and `T003` (`packages/engine/src/session.ts`) touch separate files and can be developed in parallel.
- Test authoring tasks `T004`, `T006`, `T008` in `packages/engine/test/optimizer.test.ts` can be authored alongside `T010` in `packages/engine/test/perf-benchmark.test.ts`.

---

## Parallel Example: Setup & Foundational

```bash
# Run in parallel across separate files:
Task T001: "Bundle BackgroundWorker.ts into apps/web/public/workers/BackgroundWorker.js and packages/engine/dist/BackgroundWorker.mjs in packages/engine/scripts/build-engine.mjs"
Task T002: "Create Node W3C Worker polyfill over node:worker_threads in packages/engine/src/nodeWorkerShim.ts"
Task T003: "Forward opts?.maxWorkers in packages/engine/src/session.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1 (`T001`, `T002`) and Phase 2 (`T003`) so `GOSolver` can spawn real `BackgroundWorker` instances in both Node/Vitest and the browser.
2. Complete Phase 3 (`T004`, `T005`) and Phase 4 (`T006`, `T007`) in `packages/engine/src/solver.ts` so `GOSolver` runs in parallel with a fixed upfront `total` and 250 ms throttled progress.
3. Complete Phase 5 (`T008`, `T009`) to enforce `AbortSignal` cancellation and zero leaked workers in `finally`.
4. Complete Phase 6 (`T010`, `T011`) to record before/after benchmarks in Vitest and production browser workers.
