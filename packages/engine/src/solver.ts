import './nodeWorkerShim'
import { notEmpty } from '@genshin-optimizer/common/util'
import {
  allArtifactSlotKeys,
  charKeyToLocCharKey,
  type ArtifactSetKey,
  type CharacterKey,
} from '@genshin-optimizer/gi/consts'
import type {
  ArtCharDatabase,
  ArtSetExclusion,
  ICachedArtifact,
  ICachedWeapon,
} from '@genshin-optimizer/gi/db'
import {
  artSetPerm,
  countBuilds,
  filterArts,
  filterFeasiblePerm,
  GOSolver,
  mergeBuilds,
  pruneAll,
  pruneExclusion,
  type OptProblemInput,
} from '@genshin-optimizer/gi/solver'
import { compactArtifacts } from '@genshin-optimizer/gi/solver-tc'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import {
  dynamicData,
  input,
  mergeData,
  optimize,
  type NumNode,
} from '@genshin-optimizer/gi/wr'
import {
  ALL_ARTIFACT_SET_KEYS,
  resolveArtSetExclusion,
  type Preset,
  type TcCharacter,
} from '@gi/presets'
import { getTeamData } from './teamData'
import type {
  ArtifactSlot,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
  SimulatedWeaponSpec,
} from './types'

declare module '@genshin-optimizer/gi/solver' {
  export const GOSolver: any
  export const mergeBuilds: any
}

// Cache preprocessed Setup payloads per OptProblemInput so computing `upfrontTotal`
// before `new GOSolver(problem, status, numWorkers)` does not run `pruneAll` twice.
const preprocessCache = new WeakMap<object, any>()

// Patch GOSolver.prototype once so that:
// 1. `preprocess(problem)` reuses the cached Setup from `computeUpfrontTotal(problem)`.
// 2. `trackBuildsPerSecond()` cleans up its 1000ms interval immediately if `solver.cancel()`
//    rejects `this.cancelled` mid-run.
function ensureGOSolverPatched(): void {
  const proto = GOSolver?.prototype as Record<string, any> | undefined
  if (!proto || proto.__giPatched) return

  const origPreprocess = proto.preprocess
  if (typeof origPreprocess === 'function') {
    proto.preprocess = function (problem: OptProblemInput) {
      const cached = preprocessCache.get(problem as object)
      if (cached) return cached
      const setup = origPreprocess.call(this, problem)
      preprocessCache.set(problem as object, setup)
      return setup
    }
  }

  const origTrackBps = proto.trackBuildsPerSecond
  if (typeof origTrackBps === 'function') {
    proto.trackBuildsPerSecond = function () {
      const stop = origTrackBps.call(this)
      this.cancelled?.catch(() => {
        stop()
      })
      return stop
    }
  }

  proto.interim = function (
    r: {
      tested: number
      failed: number
      skipped: number
      buildValues?: number[]
    },
    worker: unknown
  ) {
    this.status.tested += r.tested
    this.status.failed += r.failed
    this.status.skipped += r.skipped

    if (r.buildValues) {
      const { topN } = this
      const oldThreshold =
        this.buildValues[topN - 1]?.val ?? Number.NEGATIVE_INFINITY

      this.buildValues = this.buildValues.filter(
        ({ w }: { w: unknown }) => w !== worker
      )
      this.buildValues.push(
        ...r.buildValues.map((val: number) => ({ w: worker, val }))
      )
      this.buildValues
        .sort((a: { val: number }, b: { val: number }) => b.val - a.val)
        .splice(topN)

      const threshold =
        this.buildValues[topN - 1]?.val ?? Number.NEGATIVE_INFINITY
      if (oldThreshold !== threshold) {
        this.broadcast({ command: 'threshold', threshold })
      }
    }
  }

  proto.__giPatched = true
}

function getHardwareConcurrency(): number {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0
  ) {
    return navigator.hardwareConcurrency
  }
  const proc = (globalThis as any).process
  if (proc && typeof proc.getBuiltinModule === 'function') {
    const osMod = proc.getBuiltinModule('node:os') as
      | typeof import('node:os')
      | undefined
    const avail = osMod?.availableParallelism?.()
    if (typeof avail === 'number' && avail > 0) {
      return avail
    }
  }
  return 4
}

export function resolveMaxWorkers(explicitMaxWorkers?: number): number {
  if (
    typeof explicitMaxWorkers === 'number' &&
    Number.isFinite(explicitMaxWorkers)
  ) {
    return Math.max(1, Math.floor(explicitMaxWorkers))
  }
  return Math.max(1, Math.min(getHardwareConcurrency(), 8))
}

/**
 * Computes the exact post-`pruneAll` feasible build count (`upfrontTotal`) for a solver problem.
 *
 * Mathematical relationship between build counts:
 * 1. Raw Cartesian product (`rawTotal = countBuilds(problem.arts)`):
 *    $$\text{rawTotal} = |F_0| \times |P_0| \times |S_0| \times |G_0| \times |C_0|$$
 *    On `Van_2025-07-16_19-59-13.json` (1,157 artifacts), `rawTotal` is ~4.11B across all 5 slots
 *    (or `2,084,159,400` after `pruneOrder` dominance pruning).
 * 2. Post-`pruneAll` slot pool (`prunedArts`):
 *    `pruneExclusion` + `optimize` + `pruneAll` (`pruneOrder`, `pruneArtRange`, `pruneNodeRange`, `reaffine`)
 *    eliminates artifacts strictly dominated by `>= topN` same-set/rainbow-compatible alternatives in the same
 *    slot and artifacts that cannot reach hard constraints (such as `erFloor`).
 * 3. Post-`pruneAll` feasible permutation total (`upfrontTotal`):
 *    $$\text{upfrontTotal} = \sum_{\text{perm} \in \text{filterFeasiblePerm}(\text{artSetPerm}(\text{exclusion}, \text{allSets}), \text{prunedArts})} \text{countBuilds}(\text{filterArts}(\text{prunedArts}, \text{perm}))$$
 *    Every build in `upfrontTotal` is either `tested` (`ComputeWorker`) or `skipped` (`BNBSplitWorker`),
 *    so `status.tested + status.skipped === upfrontTotal` upon completion and `0 <= upfrontTotal <= rawTotal`.
 */
export function computeUpfrontTotal(problem: OptProblemInput): number {
  ensureGOSolverPatched()
  let setup = preprocessCache.get(problem as object)
  if (!setup) {
    const activeConstraints = problem.constraints.filter(
      (x: { value: NumNode; min: number }) => x.min > Number.NEGATIVE_INFINITY
    )
    let nodes: NumNode[] = [
      ...activeConstraints.map((x: { value: NumNode; min: number }) => x.value),
      problem.optimizationTarget,
    ]
    const minimums: number[] = [
      ...activeConstraints.map((x: { value: NumNode; min: number }) => x.min),
      Number.NEGATIVE_INFINITY,
    ]
    let plotBase = problem.plotBase
    if (plotBase) {
      nodes.push(plotBase)
      minimums.push(Number.NEGATIVE_INFINITY)
    }

    nodes = pruneExclusion(nodes, problem.exclusion)
    nodes = optimize(nodes, {}, (_: unknown) => false)
    let arts = problem.arts
    ;({ nodes, arts } = pruneAll(
      nodes,
      minimums,
      arts,
      problem.topN,
      problem.exclusion,
      {
        reaffine: true,
        pruneArtRange: true,
        pruneNodeRange: true,
        pruneOrder: true,
      }
    ))
    nodes = optimize(nodes, {}, (_: unknown) => false)

    if (plotBase) plotBase = nodes.pop()
    const optTarget = nodes.pop()!

    setup = {
      command: 'setup' as const,
      arts,
      optTarget,
      plotBase,
      topN: problem.topN,
      constraints: nodes.map((value: NumNode, i: number) => ({
        value,
        min: minimums[i]!,
      })),
    }
    preprocessCache.set(problem as object, setup)
  }

  const prunedArts = setup.arts
  const allSets = new Set<ArtifactSetKey>(
    (
      Object.values(prunedArts.values) as Array<
        Array<{ set?: ArtifactSetKey }>
      >
    )
      .flatMap((x) => x.map((a) => a.set))
      .filter(notEmpty)
  )

  let upfrontTotal = 0
  for (const perm of filterFeasiblePerm(
    artSetPerm(problem.exclusion, allSets),
    prunedArts
  )) {
    upfrontTotal += countBuilds(filterArts(prunedArts, perm))
  }
  return upfrontTotal
}

export function filterArtifactsForOptimizer(
  db: ArtCharDatabase,
  targetCharKey: string,
  settings: OptimizerSettings
): ICachedArtifact[] {
  const allArts = db.arts.values
  const targetLoc = charKeyToLocCharKey(targetCharKey as CharacterKey)
  const excludedLocs = new Set(
    (settings.excludedCharacters ?? []).map((ck) =>
      charKeyToLocCharKey(ck as CharacterKey)
    )
  )

  return allArts.filter((art: ICachedArtifact) => {
    if (art.level < settings.levelLow) return false
    if (art.level > settings.levelHigh) return false
    if (settings.lockedOnly && !art.lock) return false

    if (art.location && art.location !== targetLoc) {
      if (!settings.includeEquippedOnOthers) return false
      if (excludedLocs.has(art.location)) return false
    }
    return true
  })
}

export async function runSolver(
  db: ArtCharDatabase,
  teamId: string,
  targetTeamCharId: string,
  preset: Preset,
  settings: OptimizerSettings,
  opts?: {
    overrideWeapon?: ICachedWeapon
    overrideChar?: TcCharacter
    weaponOverrideSpec?: SimulatedWeaponSpec
    onProgress?: (p: OptimizeProgress) => void
    signal?: AbortSignal
    maxWorkers?: number
  }
): Promise<OptimizeResult> {
  const startTime = performance.now()
  if (opts?.signal?.aborted) {
    throw new DOMException('Optimization aborted', 'AbortError')
  }

  ensureGOSolverPatched()

  const targetKey = preset.target as CharacterKey
  const filteredArts = filterArtifactsForOptimizer(db, targetKey, settings)
  const split = compactArtifacts(
    filteredArts,
    settings.mainStatAssumptionLevel,
    false
  )

  const bundle = getTeamData(
    db,
    teamId,
    targetTeamCharId,
    settings.mainStatAssumptionLevel,
    [],
    opts?.overrideWeapon,
    opts?.overrideChar
  )
  if (!bundle) {
    return { builds: [], tested: 0, skipped: 0, durationMs: 0 }
  }

  const workerData = uiDataForTeam(bundle.teamData, db.gender, targetKey)[
    targetKey
  ]?.target.data[0]
  if (!workerData) {
    return { builds: [], tested: 0, skipped: 0, durationMs: 0 }
  }

  // Mark artifact fields as dynamic reads (`dyn.*`)
  Object.assign(workerData, mergeData([workerData, dynamicData]))

  const targetNode = workerData.display?.['custom']?.['0'] as
    | NumNode
    | undefined
  if (!targetNode) {
    return { builds: [], tested: 0, skipped: 0, durationMs: 0 }
  }

  const unoptimizedNodes: NumNode[] = []
  const minimums: number[] = []

  // Energy Recharge NEVER enters the objective (FR-003).
  // When an ER floor is specified by the user, enforce it as a hard constraint.
  if (settings.erFloor !== undefined && settings.erFloor > 0) {
    // Normalize: if user passed e.g. 160 for 160%, convert to 1.60; if 1.6, keep 1.6.
    const erMin =
      settings.erFloor > 10 ? settings.erFloor / 100 : settings.erFloor
    unoptimizedNodes.push(input.total.enerRech_)
    minimums.push(erMin)
  }

  unoptimizedNodes.push(targetNode)
  minimums.push(Number.NEGATIVE_INFINITY)

  const compiledNodes: NumNode[] = optimize(
    unoptimizedNodes,
    workerData,
    ({ path: [p] }: { path: readonly string[] }) => p !== 'dyn'
  )
  const optTargetNode = compiledNodes.pop()!
  const exclusion = resolveArtSetExclusion(
    settings,
    ALL_ARTIFACT_SET_KEYS
  ) as ArtSetExclusion
  if (
    settings.setFilterMode === 'include' &&
    !exclusion.rainbow &&
    settings.setFilterSelection &&
    Object.keys(settings.setFilterSelection).length > 0
  ) {
    exclusion.rainbow = [2, 4]
    for (const slotArts of Object.values(split.values) as Array<
      Array<{ set?: ArtifactSetKey }>
    >) {
      for (const art of slotArts) {
        if (!art.set) continue
        const ex = exclusion[art.set as keyof ArtSetExclusion]
        if (ex && ex.includes(2) && ex.includes(4)) {
          art.set = 'rainbow' as ArtifactSetKey
        }
      }
    }
  }
  const topN = Math.max(1, settings.topN || 5)

  const problem: OptProblemInput = {
    arts: split,
    optimizationTarget: optTargetNode,
    exclusion,
    constraints: compiledNodes.map((value: NumNode, i: number) => ({
      value,
      min: minimums[i]!,
    })),
    topN,
  }

  const upfrontTotal = computeUpfrontTotal(problem)
  opts?.onProgress?.({ tested: 0, skipped: 0, total: upfrontTotal })

  if (upfrontTotal === 0) {
    return {
      builds: [],
      tested: 0,
      skipped: 0,
      durationMs: performance.now() - startTime,
    }
  }

  if (opts?.signal?.aborted) {
    throw new DOMException('Optimization aborted', 'AbortError')
  }

  const status = {
    tested: 0,
    failed: 0,
    skipped: 0,
    total: upfrontTotal,
    testedPerSecond: 0,
    skippedPerSecond: 0,
  }

  const numWorkers = resolveMaxWorkers(opts?.maxWorkers)
  const solver = new GOSolver(problem, status, numWorkers)
  ;(solver as any).maxIterateSize = 64_000

  const makeAbortError = () =>
    new DOMException('Optimization aborted', 'AbortError')
  const onAbort = () => {
    solver.cancel(makeAbortError())
  }

  if (opts?.signal) {
    if (opts.signal.aborted) {
      solver.cancel(makeAbortError())
      throw makeAbortError()
    }
    opts.signal.addEventListener('abort', onAbort, { once: true })
  }

  const progressTimer = opts?.onProgress
    ? setInterval(() => {
        opts.onProgress!({
          tested: status.tested,
          skipped: status.skipped,
          total: upfrontTotal,
        })
      }, 250)
    : null

  let results: Array<{ builds: Array<{ value: number; artifactIds: string[] }> }>
  try {
    results = await solver.solve()
  } finally {
    if (progressTimer !== null) {
      clearInterval(progressTimer)
    }
    if (opts?.signal) {
      opts.signal.removeEventListener('abort', onAbort)
    }
    // Always terminate all BackgroundWorker instances
    solver.cancel()
  }

  if (opts?.signal?.aborted) {
    throw makeAbortError()
  }

  opts?.onProgress?.({
    tested: status.tested,
    skipped: status.skipped,
    total: upfrontTotal,
  })

  const mergedBuilds: Array<{ value: number; artifactIds: string[] }> =
    mergeBuilds(
      results.map((x) => x.builds),
      topN
    )

  const repeat = preset.rotation.repeat ?? 1
  const isFixedTarget = preset.team[0]?.build.type === 'fixed'
  const equippedWeaponId = isFixedTarget
    ? undefined
    : opts?.overrideWeapon?.id ?? db.chars.get(targetKey)?.equippedWeapon

  const builds = mergedBuilds.map(
    (b: { value: number; artifactIds: string[] }) => {
      const artifactIds: Partial<Record<ArtifactSlot, string>> = {}
      for (const id of b.artifactIds) {
        const cached = db.arts.get(id)
        if (cached && allArtifactSlotKeys.includes(cached.slotKey)) {
          artifactIds[cached.slotKey as ArtifactSlot] = id
        }
      }
      return {
        ...(equippedWeaponId ? { weaponId: equippedWeaponId } : {}),
        ...(opts?.weaponOverrideSpec
          ? { weaponOverride: opts.weaponOverrideSpec }
          : {}),
        artifactIds,
        total: b.value * repeat,
      }
    }
  )

  return {
    builds,
    tested: status.tested,
    skipped: status.skipped,
    durationMs: performance.now() - startTime,
  }
}
