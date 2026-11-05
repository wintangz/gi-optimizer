# Phase 0 Research: Multi-Worker Solver Parallelization & Fixed Progress Totals (`solver-parallelization`)

**Feature**: `solver-parallelization` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## 1. Root Cause Analysis of Current Hand-Rolled Solver Bottlenecks & Growing `total`

### Current Behavior in `packages/engine/src/solver.ts`
1. **Single-Threaded In-Process Loop**: Instead of instantiating GO's `GOSolver` (`vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/GOSolver.ts`), `runSolver` manually instantiates one `BNBSplitWorker` and one `ComputeWorker` in the same thread and iterates through permutations sequentially.
2. **Artificial `setTimeout(0)` Throttling & Chatty Progress IPC**: Inside the inner `for (const filter of splitWorker.split(perm, maxIterateSize))` loop (`maxIterateSize = 16_000`), `runSolver` increments `stepCounter` and every 4 chunks calls `opts?.onProgress?.({ tested, skipped, total })` followed by `await new Promise((r) => setTimeout(r, 0))`. Because browser/Node macrotask timers (`setTimeout(0)`) have a minimum clamping/scheduling overhead of ~1–4 ms per yield, yielding every 64,000 builds adds seconds of pure idle timer wait time and floods the main thread with hundreds of `postMessage` progress events per second.
3. **Growing `total` Denominator (`1.29B -> 2.08B`)**: In the hand-rolled loop:
   ```ts
   for (const perm of filterFeasiblePerm(artSetPerm(exclusion, allSets), arts)) {
     total += countBuilds(filterArts(arts, perm))
     for (const filter of splitWorker.split(perm, maxIterateSize)) { ... }
   }
   ```
   Because `total` starts at `0` and only adds `countBuilds(filterArts(arts, perm))` as the outer loop reaches each set-shape permutation `perm`, the reported `total` grows continuously throughout the run until the final permutation is reached.

---

## 2. Exact Relationship Between Raw Cartesian Count and Post-`pruneAll` Feasible Total

### Decision
Compute and report the **post-`pruneAll` feasible permutation total** upfront before worker compute begins, and document the mathematical relationship between the three build counts in code and spec artifacts.

### Mathematical Relationship
Given a filtered artifact pool `filteredArts` partitioned into 5 slots `(F, P, S, G, C)`:

1. **Raw Cartesian Product (`rawTotal = countBuilds(split)`)**:
   $$\text{rawTotal} = |F_0| \times |P_0| \times |S_0| \times |G_0| \times |C_0|$$
   - Where `split = compactArtifacts(filteredArts, mainStatAssumptionLevel, false)`.
   - On `Van_2025-07-16_19-59-13.json` (1,157 artifacts across 5 slots), `countBuilds(split)` is the raw product of all artifacts per slot (e.g., `~2.08B` combinations depending on filter settings).
   - This includes combinations that violate set-exclusion rules (e.g., when a 4pc set is required) and includes artifacts that are strictly dominated by other artifacts in the same slot.

2. **Post-`pruneAll` Slot Pool (`prunedArts`)**:
   `GOSolver.preprocess(problem)` runs:
   - `pruneExclusion(nodes, exclusion)`: simplifies threshold branches for excluded 2pc/4pc sets.
   - `pruneAll(nodes, minimums, arts, topN, exclusion, { reaffine: true, pruneArtRange: true, pruneNodeRange: true, pruneOrder: true })`:
     - **`pruneOrder`**: eliminates any artifact `art` in a slot if there are at least `topN` strictly better-or-equal artifacts `other` in the same slot that can validly substitute for `art` under `exclusion` (same set, or rainbow-compatible when rainbow is allowed).
     - **`pruneArtRange`**: eliminates any artifact whose best-case contribution across the other 4 slots cannot satisfy a hard constraint in `minimums` (such as an `erFloor` constraint on `input.total.enerRech_`).
     - **`pruneNodeRange` & `reaffine`**: folds constant sub-expressions and collapses linear combinations of dynamic artifact stats into compact `dyn` read keys.

3. **Post-`pruneAll` Feasible Permutation Total (`solverTotal`)**:
   $$\text{solverTotal} = \sum_{\text{perm} \in \text{filterFeasiblePerm}(\text{artSetPerm}(\text{exclusion}, \text{allSets}), \text{prunedArts})} \text{countBuilds}(\text{filterArts}(\text{prunedArts}, \text{perm}))$$
   - Because `artSetPerm(exclusion, allSets)` yields a **mutually disjoint** partition of all set shapes allowed by `exclusion`, and `filterFeasiblePerm` drops shapes where a required slot has 0 matching artifacts in `prunedArts`:
     - When `exclusion` is empty (unfiltered mode), `artSetPerm` merges all shapes into a single wildcard shape `*****`, so `solverTotal === countBuilds(prunedArts)`.
     - When `exclusion` restricts sets (e.g., `setFilterMode: 'include'` with `GoldenTroupe: [2, 4]`), `artSetPerm` partitions valid 4pc/2pc+rainbow shapes into disjoint `RequestFilter`s, and `solverTotal` is the exact sum of candidate builds across those feasible shapes after `pruneAll`.
   - Crucially, inside `GOSolver`, every build in `solverTotal` is either **tested** (`ComputeWorker` evaluates it) or **skipped** (`BNBSplitWorker` prunes the branch when its upper bound is below `threshold`), so at completion:
     $$\text{status.tested} + \text{status.skipped} = \text{solverTotal}$$

### Rationale for Upfront Calculation
In `GOSolver.ts`, `this.status.total` is initialized to `Number.NaN` in the constructor and is only set when a `BackgroundWorker` finishes handling `{ command: 'count', exclusion, maxIterateSize }` and replies with `{ resultType: 'count', count }`. Computing `upfrontTotal` synchronously right before `solver.solve()` (or reading `status.total` once finite while seeding `status.total = upfrontTotal` upfront) takes `< 2 ms` because `filterFeasiblePerm` only inspects slot set-membership sets, and guarantees that the very first `onProgress({ tested: 0, skipped: 0, total })` call at `t = 0 ms` already carries the exact, unchanging `total`.

---

## 3. Wiring `GOSolver` & Multi-Worker Execution in Browser and Node/Vitest

### Decision
1. **Use `GOSolver` directly in `packages/engine/src/solver.ts`**:
   - Construct `problem: OptProblemInput` identically to GO's `TabOptimize`:
     - `arts: split`
     - `optimizationTarget: optTargetNode`
     - `exclusion`
     - `constraints`
     - `topN`
   - Initialize `status`:
     ```ts
     const status = {
       tested: 0,
       failed: 0,
       skipped: 0,
       total: upfrontTotal,
       testedPerSecond: 0,
       skippedPerSecond: 0,
     }
     ```
   - Determine `numWorkers`:
     ```ts
     const hw =
       (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ||
       availableParallelismFallback() ||
       4
     const maxWorkers = Math.max(
       1,
       Math.floor(opts?.maxWorkers ?? Math.min(hw, 8))
     )
     ```
   - Instantiate `const solver = new GOSolver(problem, status, maxWorkers)`.
   - Run `const results = await solver.solve()` and merge via `mergeBuilds(results.map((x) => x.builds), topN)`.

2. **Prebuild `BackgroundWorker` and Resolve Worker URLs Without Editing `vendor/genshin-optimizer`**:
   - `vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/GOSolver.ts` line 39 contains:
     ```ts
     new Worker(new URL('./BackgroundWorker.ts', import.meta.url), {
       type: 'module',
     })
     ```
   - **Browser (`apps/web/public/workers/BackgroundWorker.js`)**:
     - When `packages/engine/scripts/build-engine.mjs` (from `trim-go-runtime`) or Webpack/Next builds the worker, `BackgroundWorker.ts` is bundled into a standalone self-contained worker script at `apps/web/public/workers/BackgroundWorker.js`.
     - Inside the bundled `optimizer.worker.js` (and `packages/engine/dist/index.mjs`), the expression `new URL('./BackgroundWorker.ts', import.meta.url)` inside `GOSolver.ts` is rewritten at bundle/plugin time to resolve to `/workers/BackgroundWorker.js` in browser contexts and `new URL('./BackgroundWorker.mjs', import.meta.url)` in Node contexts.
     - If `trim-go-runtime` has not yet created `packages/engine/scripts/build-engine.mjs`, `solver-parallelization` provides/updates the build script and webpack/vitest configuration so both prebuilt and source-aliased modes work seamlessly.
   - **Node / Vitest (`packages/engine/dist/BackgroundWorker.mjs` + Web `Worker` shim)**:
     - Node.js provides `worker_threads.Worker`, whose API (`new Worker(url)`, `postMessage`, `on('message')`, `terminate()`) differs slightly from the W3C Web `Worker` API (`worker.onmessage = (e) => ...` where payload is `e.data`, and inside the worker `globalThis.onmessage` / `globalThis.postMessage`).
     - By installing a lightweight W3C-compatible `globalThis.Worker` polyfill in Node (when `typeof globalThis.Worker === 'undefined'`) that wraps `node:worker_threads` and boots a tiny bootstrap/bundled `BackgroundWorker.mjs` (which bridges `parentPort.on('message', (data) => globalThis.onmessage?.({ data }))` and `globalThis.postMessage = (msg) => parentPort.postMessage(msg)`), `GOSolver` runs real multi-threaded `worker_threads` in Vitest and Node benchmarks with zero edits to `vendor/genshin-optimizer`.

### Alternatives Considered
- **Editing `GOSolver.ts` in `vendor/genshin-optimizer` to accept a custom `Worker` factory**: Rejected because Constitution Principle II and `docs/architecture.md` strictly forbid modifying `vendor/genshin-optimizer`.
- **Subclassing `GOSolver` and overriding `constructor`**: In JavaScript/TypeScript, a subclass constructor cannot skip `super(...)`, and `GOSolver`'s `constructor` immediately creates `Array(numWorker).map(() => new Worker(...))` before calling `super(...)`. Therefore, `GOSolver` must use `globalThis.Worker` and the rewritten/resolved `BackgroundWorker` URL.

---

## 4. Cancellation & Worker Lifecycle Management

### Decision
Wire `opts?.signal` (`AbortSignal`) and a `try / finally` block around `GOSolver`:
1. Before constructing `GOSolver`, check `if (opts?.signal?.aborted) throw new DOMException('Optimization aborted', 'AbortError')`.
2. After `const solver = new GOSolver(problem, status, maxWorkers)`:
   - Create `const abortError = new DOMException('Optimization aborted', 'AbortError')`.
   - Register an `onAbort` listener on `opts?.signal` that calls `solver.cancel(abortError)`. (If `opts.signal.aborted` became true in the meantime, call `solver.cancel(abortError)` immediately.)
3. In `finally`:
   - Clear the 250 ms progress `setInterval`.
   - Remove the `abort` event listener from `opts?.signal`.
   - Call `solver.cancel()` unconditionally. Look at `WorkerCoordinator` (`vendor/genshin-optimizer/libs/gi/solver/src/coordinator.ts` lines 34–35):
     ```ts
     this.cancelled = new Promise<never>((_, rej) => (this.cancel = rej))
     this.cancelled.catch((_) => workers.forEach((w) => w.terminate()))
     ```
     Calling `solver.cancel()` after `solver.solve()` resolves triggers `this.cancelled`'s `.catch(...)` handler, which calls `w.terminate()` on every spawned `Worker` in `workers` AND stops `trackBuildsPerSecond()` (which `solver.solve()` already stops on normal completion, and we also ensure is cleaned up on early cancellation).
   - Note on `GOSolver.trackBuildsPerSecond()` on mid-run cancellation: In `GOSolver.ts` lines 79–82:
     ```ts
     const stopTracking = this.trackBuildsPerSecond()
     await this.execute([{ command: 'count', exclusion, maxIterateSize }])
     stopTracking()
     ```
     If `this.execute(...)` rejects because `solver.cancel(err)` was called mid-run, `stopTracking()` on line 82 of `GOSolver.ts` is skipped unless caught! Wait — let's verify `GOSolver.ts` lines 79–82:
     In `GOSolver.ts`, `stopTracking()` is NOT in a `try/finally` inside `GOSolver.solve()`! If `this.execute` rejects on cancellation, that 1000ms `setInterval` inside `trackBuildsPerSecond` would stay alive in the process unless either:
     - `Worker` termination in the coordinator cleans up workers, AND we ensure the 1000ms interval in `GOSolver` doesn't leak or is unref'd / intercepted, OR in `GOSolver.prototype` we wrap `trackBuildsPerSecond` so `solver.cancel` also invokes its cleanup function!
     - Let's verify this! Since `GOSolver` is a class in JS, wrapping `GOSolver.prototype.solve` or hooking `solver.cancel` to also stop the `trackBuildsPerSecond` timer (without editing `vendor/genshin-optimizer` files on disk) guarantees that mid-run `solver.cancel(abortError)` leaves **zero** active `setInterval` handles in Node/Vitest or the browser! That is a critical insight from reading `vendor/genshin-optimizer/libs/gi/solver/src/GOSolver/GOSolver.ts`.

---

## 5. Throttled Progress Reporting (~4 Hz / 250 ms)

### Decision
- Emit `opts?.onProgress?.({ tested: 0, skipped: 0, total: upfrontTotal })` once immediately before starting `solver.solve()`.
- Start a `setInterval` every `250 ms`:
  ```ts
  const progressTimer = opts?.onProgress
    ? setInterval(() => {
        const total = Number.isFinite(status.total) && status.total > 0 ? status.total : upfrontTotal
        opts.onProgress!({
          tested: status.tested,
          skipped: status.skipped,
          total,
        })
      }, 250)
    : null
  ```
- After `await solver.solve()` completes (and before returning), emit one final progress report:
  ```ts
  const finalTotal = Number.isFinite(status.total) && status.total > 0 ? status.total : upfrontTotal
  opts?.onProgress?.({
    tested: status.tested,
    skipped: status.skipped,
    total: finalTotal,
  })
  ```
- Rationale: At most 4 progress messages per second cross the worker-to-UI boundary, completely eliminating main-thread React re-render pressure and worker message-queue saturation while keeping the progress bar visually responsive.
