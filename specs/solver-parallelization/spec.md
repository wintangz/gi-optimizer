# Feature Specification: Multi-Worker Solver Parallelization & Fixed Progress Totals (`solver-parallelization`)

**Feature**: `solver-parallelization`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Replace hand-rolled single-threaded solve loop in packages/engine/src/solver.ts with GO's GOSolver multi-worker coordinator across CPU cores; prebuild BackgroundWorker for browser and Node/Vitest; wire AbortSignal cancellation and finally cleanup; report throttled (~4 Hz) progress with a fixed upfront total build count; and verify equivalence and speedups via unit tests and full-account benchmarks."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Core Parallel Build Optimization via `GOSolver` (Priority: P1)

When a player runs an artifact optimization on `/optimize` (or when `session.optimize()` is invoked programmatically), the optimizer delegates the preprocessed problem to Genshin Optimizer's `GOSolver` coordinator, distributing branch-and-bound split and compute tasks across multiple background workers up to the device's available CPU concurrency instead of running single-threaded in one loop.

**Why this priority**: Full-account unfiltered optimizations over ~1,000+ artifacts evaluate millions of candidate combinations. Running single-threaded in one worker with per-4-chunk `setTimeout(0)` yields makes unfiltered runs artificially slow and diverges from the architectural contract (`new GOSolver(problem, status, maxWorkers).solve()`).

**Independent Test**: Run `session.optimize()` on both a reduced artifact pool (comparing against exhaustive search) and the full 1,157-artifact sample GOOD account (`Van_2025-07-16_19-59-13.json`) for unfiltered and single-set-filtered presets, verifying that `GOSolver` spawns parallel background workers and returns the exact same top-N builds and rotation damage totals as the reference solver in a fraction of the wall time.

**Acceptance Scenarios**:

1. **Given** an imported GOOD account and an active preset (owned or Akasha fixed target), **When** `session.optimize(preset, settings, opts)` is called, **Then** `runSolver` constructs `OptProblemInput` (`arts: split`, `optimizationTarget`, `exclusion` from `resolveArtSetExclusion`, `constraints` including ER floor when specified, `topN`), instantiates `new GOSolver(problem, status, numWorkers)`, awaits `solver.solve()`, and merges per-worker results via `mergeBuilds(results.map(x => x.builds), topN)` scaled by `preset.rotation.repeat`.
2. **Given** `opts.maxWorkers` is not explicitly provided, **When** `runSolver` determines the worker pool size, **Then** it defaults to `Math.max(1, Math.min(hardwareConcurrency, 8))` using `navigator.hardwareConcurrency` in the browser or `os.availableParallelism()` in Node, and respects an explicit `opts.maxWorkers` override when passed.
3. **Given** the 1,157-artifact sample GOOD file (`Van_2025-07-16_19-59-13.json`) and the official Furina preset (`official/furina-salon-subdps`), **When** `session.optimize` runs with `GOSolver` for both (a) an unfiltered artifact pool and (b) an include-only 1-set (`GoldenTroupe` 4pc) filtered pool, **Then** it returns the exact same top build and rotation total (within floating-point tolerance ≤ 1e-6) as the reference single-threaded solver.

---

### User Story 2 - Fixed Upfront Progress Total & Throttled Progress Reporting (Priority: P1)

While an optimization run is in progress, the player sees a stable `total` build count from the start of the run that never inflates mid-run, and progress updates (`tested`, `skipped`, `total`) are emitted at a smooth, throttled rate (~4 times per second, every ~250 ms) plus initial and final reports without stalling the compute workers on `setTimeout(0)` yields every 4 chunks.

**Why this priority**: In the previous hand-rolled loop, `total` was accumulated incrementally inside the outer `for (const perm of filterFeasiblePerm(...))` loop, causing the UI total to jump from e.g. `1.29B` to `2.08B` as the progress bar approached 100%, and `await new Promise(r => setTimeout(r, 0))` every 4 chunks throttled throughput by orders of magnitude.

**Independent Test**: Run `session.optimize()` with an `onProgress` callback and verify that (1) every progress emission after setup has the exact same positive `total` value (zero mid-run total growth), (2) intermediate progress callbacks are throttled to ~250 ms intervals rather than firing every 4 split chunks, and (3) the final progress emission reports `tested + skipped === total`.

**Acceptance Scenarios**:

1. **Given** an optimization run with `onProgress` provided, **When** preprocessing (`pruneExclusion`, `optimize`, `pruneAll`) completes, **Then** the true post-pruning feasible build count (`total = sum over filterFeasiblePerm(artSetPerm(exclusion, allSets), prunedArts) of countBuilds(filterArts(prunedArts, perm))`) is known upfront before `solver.solve()` dispatches compute work and remains constant across all progress reports.
2. **Given** an active `GOSolver` run, **When** workers report `interim` results (`tested`, `skipped`), **Then** `runSolver` emits `onProgress({ tested: status.tested, skipped: status.skipped, total })` immediately at run start, on a ~250 ms timer (at most ~4 times/second) during execution, and once unconditionally upon completion.
3. **Given** the solver's hot compute path inside `ComputeWorker`, **When** chunks of up to `maxIterateSize` are evaluated, **Then** no `await setTimeout(0)` or `postMessage` progress yield occurs every 4 sub-chunks.

---

### User Story 3 - Prompt Cancellation & Zero Orphaned Background Workers (Priority: P2)

When a player clicks "Cancel" during an optimization run (or starts a new optimization that aborts the previous one, or when a run finishes normally or errors), all spawned `BackgroundWorker` instances are terminated immediately and deterministically so zero orphaned threads remain running in the browser or Node process.

**Why this priority**: Spawning up to 8 `BackgroundWorker` threads per optimization run without deterministic `finally` cleanup and `AbortSignal` wiring would leak dozens of background threads and waste CPU/memory after cancellation or repeated runs.

**Independent Test**: Start an optimization run with an `AbortController`, abort it mid-run (and also test pre-aborted signals and normal completion), and verify that `solver.cancel()` is invoked in all paths (`try`/`finally`), all spawned `BackgroundWorker` instances have `.terminate()` called, the progress interval timer is cleared, and `optimize()` rejects with `AbortError` when aborted.

**Acceptance Scenarios**:

1. **Given** an optimization run in progress with `opts.signal`, **When** `signal.abort()` is triggered, **Then** the abort listener immediately calls `solver.cancel(new DOMException('Optimization aborted', 'AbortError'))`, terminating all `BackgroundWorker` instances and rejecting the `session.optimize` promise with an `AbortError`.
2. **Given** an optimization run that completes normally, throws a worker error, or is cancelled, **When** `runSolver` exits its `try { ... } finally { ... }` block, **Then** `clearInterval(progressTimer)` and `solver.cancel()` are always executed and any abort event listener on `opts.signal` is removed.
3. **Given** `opts.signal` is already aborted before `runSolver` spawns workers, **When** `runSolver` is called, **Then** it throws `AbortError` immediately without constructing `GOSolver` or spawning any `Worker` instances.

---

### Edge Cases

- **Empty feasible pool (`total === 0`)**: When an impossible ER floor (e.g. `500%`) or strict artifact filter prunes all artifacts in one or more slots during `pruneAll`, `total` is `0`, `onProgress` reports `{ tested: 0, skipped: 0, total: 0 }`, and `runSolver` returns `{ builds: [], tested: 0, skipped: 0, durationMs }` cleanly (or `GOSolver` completes immediately with `0` builds and terminates workers in `finally`).
- **Nested Workers in Browser vs. Node/Vitest**: In the browser, `optimizer.worker.js` runs inside a Web Worker and `GOSolver` spawns nested sub-workers (`new Worker('/workers/BackgroundWorker.js')`). In Node/Vitest where `globalThis.Worker` is not defined by default, a lightweight Web `Worker` polyfill backed by `node:worker_threads` pointing at the prebuilt `packages/engine/dist/BackgroundWorker.mjs` bundle enables `GOSolver` to run real parallel worker threads in unit tests and benchmarks without modifying `vendor/genshin-optimizer`.
- **Single-core or constrained environments**: If `navigator.hardwareConcurrency` or `os.availableParallelism()` is unavailable or returns `< 1`, worker count falls back safely to `4` (or `1` minimum when clamped), and `opts?.maxWorkers` is clamped to `Math.max(1, Math.floor(opts.maxWorkers))`.
- **Difference between raw Cartesian count and solver `total`**: Raw `countBuilds(compactArtifacts(filteredArts))` is the pre-pruning 5-slot product (`2.08B` on the 1,157-artifact sample account). After `GOSolver.preprocess` runs `pruneAll` (`pruneOrder` + `pruneArtRange` + `pruneNodeRange` + `reaffine`) and `filterFeasiblePerm(artSetPerm(exclusion, allSets), arts)`, strictly dominated artifacts and infeasible set permutations are eliminated before branch-and-bound begins, yielding the true solver search space `total` (e.g. `~1.05B` unfiltered, or `~410K` when filtered to a single 4pc set).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/engine/src/solver.ts` MUST replace the hand-rolled single-threaded `BNBSplitWorker`/`DefaultSplitWorker`/`ComputeWorker` loop with GO's `GOSolver` (`@genshin-optimizer/gi/solver`), passing `OptProblemInput` (`arts: split`, `optimizationTarget`, `exclusion`, `constraints`, `topN`), calling `await solver.solve()`, and merging worker results with `mergeBuilds(results.map((x) => x.builds), topN)`.
- **FR-002**: `packages/engine/src/session.ts` MUST forward `opts?.maxWorkers` from `session.optimize(preset, settings, opts)` into `runSolver`, and `runSolver` MUST determine worker count as `Math.max(1, Math.min(opts?.maxWorkers ?? defaultConcurrency, 8))` where `defaultConcurrency` reads `globalThis.navigator?.hardwareConcurrency` or Node's `os.availableParallelism()` (fallback `4`).
- **FR-003**: `packages/engine/scripts/build-engine.mjs` (or the engine build pipeline) MUST bundle GO's `vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/BackgroundWorker.ts` into both `apps/web/public/workers/BackgroundWorker.js` (for browser nested Web Workers) and `packages/engine/dist/BackgroundWorker.mjs` (for Node/Vitest worker threads), rewriting `new URL('./BackgroundWorker.ts', import.meta.url)` inside the bundled `GOSolver` (and providing a `node:worker_threads`-backed `Worker` shim in Node/Vitest) so `GOSolver` spawns real parallel workers in both environments without editing `vendor/genshin-optimizer`.
- **FR-004**: `runSolver` MUST compute the fixed upfront `total` build count on the post-`pruneAll` artifact pool (`sum over filterFeasiblePerm(artSetPerm(exclusion, allSets), prunedArts)` of `countBuilds(filterArts(prunedArts, perm))`) before worker execution begins, so `total` in `OptimizeProgress` is constant from the first progress report to the final report and never grows during a run.
- **FR-005**: `runSolver` MUST remove the per-4-chunk `await new Promise((r) => setTimeout(r, 0))` yield and per-4-chunk `onProgress` calls, and instead emit `opts?.onProgress({ tested: status.tested, skipped: status.skipped, total })` once before `solver.solve()`, on a throttled interval of ~250 ms (~4 Hz) while `solver.solve()` is running, and once upon completion.
- **FR-006**: `runSolver` MUST wire `opts?.signal` (`AbortSignal`) to call `solver.cancel(new DOMException('Optimization aborted', 'AbortError'))` immediately on abort, and MUST call `solver.cancel()` and `clearInterval` inside a `finally` block so zero `BackgroundWorker` instances or timers leak after completion, error, or cancellation.
- **FR-007**: `EngineSession.optimize`, `EngineSession.evaluate`, and `apps/web/src/lib/engine/workerClient.ts` public signatures MUST remain unchanged (`maxWorkers?: number` is already part of `EngineSession.optimize` in `docs/architecture.md` and `packages/engine/src/types.ts`).
- **FR-008**: All correctness gates MUST pass: (a) reduced-pool exhaustive-search equality test, (b) ER-floor constraint and ER-objective exclusion tests, (c) Akasha isolation tests (`packages/engine/test/akasha-isolation.test.ts`), (d) all GO golden fixture tests (`packages/engine/test/golden.test.ts`), and (e) a new full-account equivalence test verifying that `GOSolver` returns the exact same top build and rotation damage total as the reference single-threaded solver on `Van_2025-07-16_19-59-13.json` for both an unfiltered preset (`official/furina-salon-subdps`) and an include-one-set (`GoldenTroupe` 4pc) filtered preset.
- **FR-009**: A reproducible benchmark (`packages/engine/test/perf-benchmark.test.ts` and production browser verification) on `Van_2025-07-16_19-59-13.json` with `official/furina-salon-subdps` MUST record before/after wall time and before/after `total` build count for both (a) unfiltered optimization and (b) include-only one 4pc set (`GoldenTroupe`).

### Key Entities

- **`GOSolver` Coordinator**: GO's `WorkerCoordinator<WorkerCommand, WorkerResult>` subclass (`vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/GOSolver.ts`) that preprocesses `OptProblemInput`, broadcasts `Setup` to `numWorker` `BackgroundWorker` instances, coordinates `count` / `split` / `iterate` / `threshold` / `finalize` messages across workers, and updates `status` (`tested`, `skipped`, `failed`, `total`, `testedPerSecond`, `skippedPerSecond`).
- **`BackgroundWorker` Bundle**: Prebuilt worker entry script (`apps/web/public/workers/BackgroundWorker.js` for browsers and `packages/engine/dist/BackgroundWorker.mjs` for Node/Vitest) executing GO's unmodified `BackgroundWorker.ts` (`BNBSplitWorker`, `DefaultSplitWorker`, `ComputeWorker`).
- **Upfront Solver Total (`total`)**: The exact number of feasible candidate builds after `pruneAll` (`pruneOrder` + `pruneArtRange` + `pruneNodeRange` + `reaffine`) and `filterFeasiblePerm(artSetPerm(exclusion, allSets), prunedArts)`, reported invariantly on every `OptimizeProgress` event during a run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the 1,157-artifact GO sample account (`Van_2025-07-16_19-59-13.json`) with `official/furina-salon-subdps`, the `GOSolver`-backed optimizer returns the exact same top build (`artifactIds` and `total` within relative error ≤ 1e-6) as the reference single-threaded solver for both unfiltered and single-4pc-set-filtered runs.
- **SC-002**: Full-account unfiltered and single-4pc-set-filtered optimization wall times on `Van_2025-07-16_19-59-13.json` improve significantly with multi-worker `GOSolver` and removal of `setTimeout(0)` yields (e.g., single-set filtered optimization completes in < 1 second and unfiltered optimization achieves multi-core speedup with zero UI freezes).
- **SC-003**: Across 100% of `onProgress` callbacks emitted during an optimization run, `progress.total` equals the true post-`pruneAll` feasible build count from the very first progress update to the final update (`tested + skipped === total` on completion), with zero mid-run changes to `total`.
- **SC-004**: Cancelling an in-flight optimization or completing a run leaves `0` active `BackgroundWorker` instances or interval timers running.

## Assumptions

- **SP-A1 (Default Worker Cap)**: Default worker count is `Math.max(1, Math.min(hardwareConcurrency, 8))` where `hardwareConcurrency` is `navigator.hardwareConcurrency` in browser contexts or `os.availableParallelism()` in Node, falling back to `4` if neither is reported. Capping default workers at 8 prevents excessive memory duplication of `Setup` payloads on high-core-count desktops while still saturating typical 4–8 core client CPUs; callers can pass an explicit `opts.maxWorkers` to override.
- **SP-A2 (Upfront Total Computation vs. `GOSolver` `'count'` Command)**: `GOSolver.solve()` sends `{ command: 'count', exclusion, maxIterateSize }` to a `BackgroundWorker`, which iterates `filterFeasiblePerm`, enqueues `{ command: 'split', ... }` for every permutation, and only posts `{ resultType: 'count', count }` at the end of that loop (meaning `status.total` inside `GOSolver` remains `NaN` until all `split` commands have been queued, or `status.total` can be pre-populated synchronously right after `pruneAll` / via `status.total`). Precomputing `upfrontTotal` synchronously on the pruned `arts` pool (which has ≤ ~30–50 artifacts per slot after `pruneOrder` and takes < 2 ms) ensures the very first `onProgress` callback at `t = 0` already carries the exact, unchanging post-`pruneAll` total.
- **SP-A3 (Cross-Environment `BackgroundWorker` Resolution without Editing `vendor/genshin-optimizer`)**: Because `vendor/genshin-optimizer` is read-only (Constitution Principle II), `GOSolver.ts`'s `new Worker(new URL('./BackgroundWorker.ts', import.meta.url), { type: 'module' })` is resolved at bundle/transform time (in `packages/engine/scripts/build-engine.mjs` for prebuilt bundles and via a lightweight Vite/Vitest plugin or Node `Worker` shim in `packages/engine`) so browser workers load `/workers/BackgroundWorker.js` and Node/Vitest tests spawn `worker_threads` running `BackgroundWorker`.
- **SP-A4 (Relationship Between `performance` FR-009 and `solver-parallelization`)**: Feature `performance` (FR-009) previously removed an up-front `Array.from(filterFeasiblePerm)` pass on the *hand-rolled* loop, which caused `total` to accumulate incrementally during the run (`1.29B -> 2.08B`). This feature (`solver-parallelization`) supersedes that hand-rolled loop with GO's `GOSolver` and establishes a fixed upfront post-`pruneAll` `total` so the progress bar denominator never mutates mid-run.
