# Phase 1 Data Model & Worker Protocol: Multi-Worker Solver Parallelization (`solver-parallelization`)

**Feature**: `solver-parallelization` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## 1. Entities & Runtime State

### 1.1 `OptProblemInput` (GO Solver Input)
Defined by `@genshin-optimizer/gi/solver` (`vendor/genshin-optimizer/libs/gi/solver/src/type.ts`):

| Field | Type | Constraints / Source |
|---|---|---|
| `arts` | `ArtifactsBySlot` | Produced by `compactArtifacts(filteredArts, settings.mainStatAssumptionLevel, false)` |
| `optimizationTarget` | `OptNode` | Compiled custom multi-target rotation sum node (`workerData.display.custom['0']`), optimized via `optimize(unoptimizedNodes, workerData, ({ path: [p] }) => p !== 'dyn')` |
| `exclusion` | `ArtSetExclusion` | Resolved from `resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)` |
| `constraints` | `Array<{ value: OptNode; min: number }>` | Optional ER floor (`input.total.enerRech_ >= erMin` where `erMin = settings.erFloor > 10 ? settings.erFloor / 100 : settings.erFloor`); empty when `erFloor` is undefined or `<= 0` |
| `topN` | `number` | `Math.max(1, settings.topN \|\| 5)` |
| `plotBase` | `OptNode \| undefined` | `undefined` (not used in preset optimizer) |

---

### 1.2 `GOSolverStatus` (Mutable Coordinator Status Record)
Passed into `new GOSolver(problem, status, maxWorkers)` and mutated in-place by `GOSolver`:

| Field | Type | Lifecycle |
|---|---|---|
| `tested` | `number` | Initialized to `0`; incremented by `GOSolver.interim(r)` as workers evaluate leaf chunks |
| `failed` | `number` | Initialized to `0`; incremented by `GOSolver.interim(r)` for builds failing constraints |
| `skipped` | `number` | Initialized to `0`; incremented by `GOSolver.interim(r)` when branch-and-bound prunes subtrees |
| `total` | `number` | Set to `Number.NaN` by `GOSolver` constructor, then set to `r.count` when `{ command: 'count' }` completes; mirrored by `upfrontTotal` computed synchronously on post-`pruneAll` artifacts so `OptimizeProgress.total` is known and fixed at `t = 0` |
| `testedPerSecond` | `number` | Initialized to `0`; updated every 1000 ms by `GOSolver.trackBuildsPerSecond()` |
| `skippedPerSecond` | `number` | Initialized to `0`; updated every 1000 ms by `GOSolver.trackBuildsPerSecond()` |

---

### 1.3 Build Count Model: Raw vs. Post-`pruneAll` Feasible Total

| Metric | Formula | Meaning | Behavior During Run |
|---|---|---|---|
| `rawTotal` | `countBuilds(split)` | $\prod_{s \in \text{slots}} |\text{split.values}[s]|$ before dominance pruning or set-filter permutation filtering | Diagnostic / benchmark reference only |
| `upfrontTotal` (`OptimizeProgress.total`) | $\sum_{\text{perm} \in \text{filterFeasiblePerm}(\text{artSetPerm}(\text{exclusion}, \text{allSets}), \text{prunedArts})} \text{countBuilds}(\text{filterArts}(\text{prunedArts}, \text{perm}))$ | Exact number of candidate builds in the post-`pruneAll` (`pruneOrder` + `pruneArtRange` + `pruneNodeRange` + `reaffine`) search space | **Fixed and invariant** from the initial progress event (`tested = 0, skipped = 0`) through the final progress event (`tested + skipped = total`) |

---

### 1.4 `RunSolverOptions` (`packages/engine/src/solver.ts`)

| Field | Type | Validation / Default |
|---|---|---|
| `overrideWeapon` | `ICachedWeapon \| undefined` | Optional weapon instance or simulated weapon override |
| `overrideChar` | `TcCharacter \| undefined` | Optional fixed character stats (`akasha` artifact-only mode) |
| `weaponOverrideSpec` | `SimulatedWeaponSpec \| undefined` | echoed onto returned `BuildSelection.weaponOverride` |
| `onProgress` | `((p: OptimizeProgress) => void) \| undefined` | Called once at start, every `250 ms` while running, and once at completion |
| `signal` | `AbortSignal \| undefined` | When aborted, triggers `solver.cancel(AbortError)` and rejects with `DOMException('Optimization aborted', 'AbortError')` |
| `maxWorkers` | `number \| undefined` | Default `Math.max(1, Math.min(hardwareConcurrency, 8))` (`hardwareConcurrency` from `navigator.hardwareConcurrency` or `os.availableParallelism()`, fallback `4`); explicit value clamped to `>= 1` |

---

## 2. Worker Hierarchy & Lifecycle State Machine

```text
Browser UI Thread (apps/web)
  └── workerClient.ts ──(postMessage: optimize / progress / result / cancel)──►
        optimizer.worker.js (1 persistent session worker)
          └── runSolver() ──► new GOSolver(problem, status, maxWorkers)
                ├── BackgroundWorker.js #1  (BNBSplitWorker + ComputeWorker)
                ├── BackgroundWorker.js #2  (BNBSplitWorker + ComputeWorker)
                ├── ...
                └── BackgroundWorker.js #N  (N = min(hardwareConcurrency, 8))
```

In Node / Vitest (`packages/engine/test/*.test.ts`):
```text
Vitest Main Thread
  └── session.optimize() ──► runSolver() ──► new GOSolver(problem, status, maxWorkers)
        ├── node:worker_threads Worker #1 (packages/engine/dist/BackgroundWorker.mjs)
        ├── ...
        └── node:worker_threads Worker #N
```

### State Transitions for a Solver Run
1. **Pre-Flight Check**:
   - If `opts?.signal?.aborted` is true → throw `DOMException('Optimization aborted', 'AbortError')` immediately (0 workers spawned).
2. **Preprocess & Upfront Total Calculation**:
   - Build `problem: OptProblemInput`.
   - Compute `upfrontTotal` over `prunedArts` (`pruneExclusion` + `optimize` + `pruneAll` + `filterFeasiblePerm`).
   - Emit initial progress: `onProgress?.({ tested: 0, skipped: 0, total: upfrontTotal })`.
   - If `upfrontTotal === 0`, return `{ builds: [], tested: 0, skipped: 0, durationMs }` immediately without spawning workers.
3. **Coordinator Spawn & Parallel Execution**:
   - Instantiate `solver = new GOSolver(problem, status, numWorkers)`.
   - Attach `abort` listener to `opts?.signal` → `solver.cancel(abortError)`.
   - Start `progressTimer = setInterval(..., 250)` reporting `{ tested: status.tested, skipped: status.skipped, total: upfrontTotal }`.
   - Await `results = await solver.solve()`.
4. **Teardown (`finally` block — guaranteed on resolve, reject, or abort)**:
   - `clearInterval(progressTimer)`
   - `opts?.signal?.removeEventListener('abort', onAbort)`
   - `solver.cancel()` → terminates all `N` `BackgroundWorker` instances and stops `GOSolver`'s internal `trackBuildsPerSecond` interval.
5. **Finalize & Return**:
   - Emit final progress: `onProgress?.({ tested: status.tested, skipped: status.skipped, total: upfrontTotal })`.
   - Merge top builds via `mergeBuilds(results.map((r) => r.builds), topN)`, multiply each build's `value` by `preset.rotation.repeat ?? 1`, map `artifactIds` to `Record<ArtifactSlot, string>`, and return `OptimizeResult`.
