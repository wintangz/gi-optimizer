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
  prod,
  type NumNode,
} from '@genshin-optimizer/gi/wr'
import {
  ALL_ARTIFACT_SET_KEYS,
  computeArtifactRollValue,
  isActiveStatConstraint,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resolveArtSetExclusion,
  type MainStatFilterSlotKey,
  type Preset,
  type TcCharacter,
} from '@gi/presets'
import { getTeamData } from './teamData'
import type {
  ArtifactSlot,
  MemberBuildMode,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
  PresetMemberConditionalOverrides,
  SimulatedWeaponSpec,
} from './types'

declare module '@genshin-optimizer/gi/solver' {
  export const GOSolver: any
  export const mergeBuilds: any
}

declare module '@genshin-optimizer/gi/wr' {
  export const prod: any
}

// Cache preprocessed Setup payloads per OptProblemInput so computing `upfrontTotal`
// before `new GOSolver(problem, status, numWorkers)` does not run `pruneAll` twice.
const preprocessCache = new WeakMap<object, any>()

export type SolverConstraintInput = {
  value: NumNode
  min: number
  max?: number
}

export type ExtendedOptProblemInput = Omit<OptProblemInput, 'constraints'> & {
  constraints: SolverConstraintInput[]
}

function buildProblemSetup(problem: ExtendedOptProblemInput): any {
  const cached = preprocessCache.get(problem as object)
  if (cached) return cached

  const expandedConstraints: Array<{ value: NumNode; min: number }> = []
  let hasMaxConstraint = false
  let hasContradiction = false

  for (const x of problem.constraints) {
    const hasMin = x.min !== undefined && x.min > Number.NEGATIVE_INFINITY
    const hasMax = x.max !== undefined && x.max < Number.POSITIVE_INFINITY
    if (hasMin && hasMax && x.min > x.max!) {
      hasContradiction = true
    }
    if (hasMin) {
      expandedConstraints.push({ value: x.value, min: x.min })
    }
    if (hasMax) {
      hasMaxConstraint = true
      expandedConstraints.push({ value: prod(-1, x.value), min: -x.max! })
    }
  }

  let nodes: NumNode[] = [
    ...expandedConstraints.map((x) => x.value),
    problem.optimizationTarget,
  ]
  const minimums: number[] = [
    ...expandedConstraints.map((x) => x.min),
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
  if (hasContradiction) {
    arts = {
      base: arts.base,
      values: {
        flower: [],
        plume: [],
        sands: [],
        goblet: [],
        circlet: [],
      },
    }
  } else {
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
        pruneOrder: !hasMaxConstraint,
      }
    ))
  }
  nodes = optimize(nodes, {}, (_: unknown) => false)

  if (plotBase) plotBase = nodes.pop()
  const optTarget = nodes.pop()!

  const setup = {
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
  return setup
}

// Patch GOSolver.prototype once so that:
// 1. `preprocess(problem)` reuses the cached Setup from `computeUpfrontTotal(problem)`.
// 2. `trackBuildsPerSecond()` cleans up its 1000ms interval immediately if `solver.cancel()`
//    rejects `this.cancelled` mid-run.
function ensureGOSolverPatched(): void {
  const proto = GOSolver?.prototype as Record<string, any> | undefined
  if (!proto || proto.__giPatched) return

  if (typeof proto.preprocess === 'function') {
    proto.preprocess = function (problem: ExtendedOptProblemInput) {
      return buildProblemSetup(problem)
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
export function computeUpfrontTotal(
  problem: OptProblemInput | ExtendedOptProblemInput
): number {
  ensureGOSolverPatched()
  const setup = buildProblemSetup(problem as ExtendedOptProblemInput)

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

  const minRarity =
    typeof settings.minRarity === 'number' && settings.minRarity > 1
      ? settings.minRarity
      : 1

  const slotMainAllowlists = new Map<string, Set<string>>()
  if (settings.mainStatKeys) {
    for (const slot of ['flower', 'plume', 'sands', 'goblet', 'circlet'] as const) {
      const allowed = settings.mainStatKeys[slot as MainStatFilterSlotKey]
      if (Array.isArray(allowed) && allowed.length > 0) {
        slotMainAllowlists.set(slot, new Set(allowed))
      }
    }
  }

  const reqSubs = Array.isArray(settings.requiredSubstats)
    ? settings.requiredSubstats.filter(Boolean)
    : []
  const reqSubsMode = settings.requiredSubstatsMode === 'any' ? 'any' : 'all'

  const minRv =
    typeof settings.minRv === 'number' &&
    Number.isFinite(settings.minRv) &&
    settings.minRv > 0
      ? settings.minRv
      : 0

  return allArts.filter((art: ICachedArtifact) => {
    if (art.level < settings.levelLow) return false
    if (art.level > settings.levelHigh) return false
    if (minRarity > 1 && art.rarity < minRarity) return false
    if (settings.lockedOnly && !art.lock) return false

    if (art.location && art.location !== targetLoc) {
      if (!settings.includeEquippedOnOthers) return false
      if (excludedLocs.has(art.location)) return false
    }

    if (slotMainAllowlists.size > 0) {
      const allowedForSlot = slotMainAllowlists.get(art.slotKey)
      if (allowedForSlot && !allowedForSlot.has(art.mainStatKey)) {
        return false
      }
    }

    if (reqSubs.length > 0) {
      const presentSubKeys = new Set<string>()
      for (const sub of art.substats ?? []) {
        if (sub && sub.key && sub.value > 0) {
          presentSubKeys.add(sub.key)
        }
      }
      if (reqSubsMode === 'any') {
        if (!reqSubs.some((k) => presentSubKeys.has(k))) return false
      } else {
        if (!reqSubs.every((k) => presentSubKeys.has(k))) return false
      }
    }

    if (minRv > 0) {
      const rv = computeArtifactRollValue(art)
      if (rv.totalRv + 1e-6 < minRv && rv.totalRvRounded < minRv) {
        return false
      }
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
    memberBuildModes?: Record<string, MemberBuildMode>
    memberConditionals?: PresetMemberConditionalOverrides
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
  const constraintBounds: Array<{ min: number; max: number }> = []

  // Migrate any legacy erFloor on load so `constraints` is the single source of truth.
  const effectiveSettings = migrateOptimizerSettings(settings)

  for (const c of effectiveSettings.constraints ?? []) {
    if (!isActiveStatConstraint(c)) continue
    const statNode = (input.total as Record<string, NumNode | undefined>)[
      c.stat
    ]
    if (!statNode) continue
    const normMin = normalizeStatConstraintValue(c.stat, c.min)
    const normMax = normalizeStatConstraintValue(c.stat, c.max)
    unoptimizedNodes.push(statNode)
    constraintBounds.push({
      min: normMin ?? Number.NEGATIVE_INFINITY,
      max: normMax ?? Number.POSITIVE_INFINITY,
    })
  }

  unoptimizedNodes.push(targetNode)

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

  const problem: ExtendedOptProblemInput = {
    arts: split,
    optimizationTarget: optTargetNode,
    exclusion,
    constraints: compiledNodes.map((value: NumNode, i: number) => ({
      value,
      min: constraintBounds[i]!.min,
      max: constraintBounds[i]!.max,
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
  const equippedWeaponId =
    isFixedTarget || opts?.weaponOverrideSpec
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
        ...(opts?.memberBuildModes &&
        Object.keys(opts.memberBuildModes).length > 0
          ? { memberBuildModes: { ...opts.memberBuildModes } }
          : {}),
        ...(opts?.memberConditionals &&
        Object.keys(opts.memberConditionals).length > 0
          ? { memberConditionals: opts.memberConditionals }
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
