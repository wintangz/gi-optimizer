import { notEmpty } from '@genshin-optimizer/common/util'
import {
  allArtifactSlotKeys,
  charKeyToLocCharKey,
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
  pruneAll,
  pruneExclusion,
  type OptProblemInput,
} from '@genshin-optimizer/gi/solver'
import { compactArtifacts } from '@genshin-optimizer/gi/solver-tc'
import { BNBSplitWorker } from '@genshin-optimizer/gi/solver/BNBSplitWorker'
import { ComputeWorker } from '@genshin-optimizer/gi/solver/ComputeWorker'
import { DefaultSplitWorker } from '@genshin-optimizer/gi/solver/DefaultSplitWorker'
import { getTeamData } from '@genshin-optimizer/gi/ui/useTeamData'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import {
  dynamicData,
  input,
  mergeData,
  optimize,
  type NumNode,
} from '@genshin-optimizer/gi/wr'
import type { Preset } from '@gi/presets'
import type {
  ArtifactSlot,
  BuildSelection,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
} from './types'

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
    onProgress?: (p: OptimizeProgress) => void
    signal?: AbortSignal
  }
): Promise<OptimizeResult> {
  const startTime = performance.now()
  if (opts?.signal?.aborted) {
    throw new DOMException('Optimization aborted', 'AbortError')
  }

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
    opts?.overrideWeapon
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
    const erMin = settings.erFloor > 10 ? settings.erFloor / 100 : settings.erFloor
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
  const exclusion = (settings.setExclusion ?? {}) as ArtSetExclusion
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

  // Run GO's exact preprocess pass (pruneExclusion + optimize + pruneAll)
  const activeConstraints = problem.constraints.filter(
    (x: { value: NumNode; min: number }) => x.min > Number.NEGATIVE_INFINITY
  )
  let nodes: NumNode[] = [
    ...activeConstraints.map((x: { value: NumNode; min: number }) => x.value),
    problem.optimizationTarget,
  ]
  const mins: number[] = [
    ...activeConstraints.map((x: { value: NumNode; min: number }) => x.min),
    Number.NEGATIVE_INFINITY,
  ]

  nodes = pruneExclusion(nodes, exclusion)
  nodes = optimize(nodes, {}, (_: unknown) => false)
  let arts = problem.arts
  ;({ nodes, arts } = pruneAll(nodes, mins, arts, topN, exclusion, {
    reaffine: true,
    pruneArtRange: true,
    pruneNodeRange: true,
    pruneOrder: true,
  }))
  nodes = optimize(nodes, {}, (_: unknown) => false)
  const finalOptTarget = nodes.pop()!
  const setup = {
    command: 'setup' as const,
    arts,
    optTarget: finalOptTarget,
    topN,
    constraints: nodes.map((value: NumNode, i: number) => ({
      value,
      min: mins[i]!,
    })),
  }

  let tested = 0
  let skipped = 0
  let total = 0

  let splitWorker: BNBSplitWorker | DefaultSplitWorker
  let computeWorker: ComputeWorker

  const handleInterim = (interim: {
    tested: number
    skipped: number
    buildValues?: number[]
  }) => {
    tested += interim.tested
    skipped += interim.skipped
    if (interim.buildValues && interim.buildValues.length >= topN) {
      const threshold =
        interim.buildValues[topN - 1] ?? Number.NEGATIVE_INFINITY
      splitWorker.setThreshold(threshold)
      computeWorker.setThreshold(threshold)
    }
  }

  try {
    splitWorker = new BNBSplitWorker(setup, handleInterim)
  } catch {
    splitWorker = new DefaultSplitWorker(setup, handleInterim)
  }
  computeWorker = new ComputeWorker(setup, handleInterim)

  const allSets = new Set(
    (Object.values(arts.values) as Array<Array<{ set?: string }>>)
      .flatMap((x) => x.map((a) => a.set))
      .filter(notEmpty)
  )

  opts?.onProgress?.({ tested, skipped, total })

  const maxIterateSize = 16_000
  let stepCounter = 0

  for (const perm of filterFeasiblePerm(artSetPerm(exclusion, allSets), arts)) {
    total += countBuilds(filterArts(arts, perm))
    for (const filter of splitWorker.split(perm, maxIterateSize)) {
      if (opts?.signal?.aborted) {
        throw new DOMException('Optimization aborted', 'AbortError')
      }
      computeWorker.compute(filter)
      stepCounter++
      if (stepCounter % 4 === 0) {
        opts?.onProgress?.({ tested, skipped, total })
        await new Promise((r) => setTimeout(r, 0))
      }
    }
  }

  computeWorker.refresh(true)
  opts?.onProgress?.({ tested, skipped, total })

  const repeat = preset.rotation.repeat ?? 1
  const equippedWeaponId =
    opts?.overrideWeapon?.id ??
    db.chars.get(targetKey)?.equippedWeapon

  const builds = computeWorker.builds.map(
    (b: { value: number; artifactIds: string[] }) => {
      const artifactIds: Partial<Record<ArtifactSlot, string>> = {}
      for (const id of b.artifactIds) {
        const cached = db.arts.get(id)
        if (cached && allArtifactSlotKeys.includes(cached.slotKey)) {
          artifactIds[cached.slotKey as ArtifactSlot] = id
        }
      }
      return {
        weaponId: equippedWeaponId,
        artifactIds,
        total: b.value * repeat,
      }
    }
  )

  return {
    builds,
    tested,
    skipped,
    durationMs: performance.now() - startTime,
  }
}
