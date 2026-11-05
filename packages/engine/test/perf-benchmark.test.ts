import { countBuilds } from '@genshin-optimizer/gi/solver'
import { compactArtifacts } from '@genshin-optimizer/gi/solver-tc'
import { getBundledPreset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  DEFAULT_OPTIMIZER_SETTINGS,
  filterArtifactsForOptimizer,
  listConditionalsForCharacter,
  listTargetsForCharacter,
  type OptimizeProgress,
} from '../src/index'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { SandboxStorage } from '@genshin-optimizer/common/database'

describe('Baseline & Multi-Worker Solver Performance Measurements', () => {
  it('measures cold load, preset switch, and multi-worker GOSolver timings on Van_2025-07-16_19-59-13.json', async () => {
    const goodPath = resolve(
      GO_ROOT,
      'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'
    )
    const good = JSON.parse(readFileSync(goodPath, 'utf8'))

    const furinaAkasha = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const furinaOfficial = getBundledPreset('official/furina-salon-subdps')!
    const hutaoPreset = getBundledPreset('akasha/hutao-double-hydro-homa-c1')!

    // (a) Cold load of /optimize with ~1,000-artifact GOOD already imported
    const t0 = performance.now()
    const session = createSession(good)
    const tSessionHydrated = performance.now()
    const currSel = session.currentBuild(furinaAkasha)
    const evalCold = session.evaluate(furinaAkasha, currSel)
    const tColdDone = performance.now()

    // (b) Switching presets on /optimize
    const tSwitch0 = performance.now()
    const hutaoSel = session.currentBuild(hutaoPreset)
    const evalSwitch = session.evaluate(hutaoPreset, hutaoSel)
    const tSwitchDone = performance.now()

    // (c) Current-build evaluation on same preset
    const tEval0 = performance.now()
    const evalCurr = session.evaluate(furinaAkasha, currSel)
    const tEvalDone = performance.now()

    // Compute raw Cartesian countBuilds(split) on full Van account for Furina
    const rawDb = new ArtCharDatabase(1, new SandboxStorage())
    rawDb.importGOOD(good as never, false, false, false)
    const unfilteredSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: true,
      setFilterMode: 'all' as const,
      topN: 5,
    }
    const rawFilteredArts = filterArtifactsForOptimizer(
      rawDb,
      furinaOfficial.target,
      unfilteredSettings
    )
    const rawSplit = compactArtifacts(
      rawFilteredArts,
      unfilteredSettings.mainStatAssumptionLevel,
      false
    )
    const rawCartesianTotal = countBuilds(rawSplit)

    // (d1) Full-account optimization: include-only 1-set (GoldenTroupe 2pc+4pc)
    let oneSetUpfrontTotal = 0
    const tOneSet0 = performance.now()
    const oneSetRes = await session.optimize(
      furinaOfficial,
      {
        ...DEFAULT_OPTIMIZER_SETTINGS,
        includeEquippedOnOthers: true,
        setFilterMode: 'include',
        setFilterSelection: { GoldenTroupe: [2, 4] },
        topN: 5,
      },
      {
        onProgress: (p: OptimizeProgress) => {
          if (oneSetUpfrontTotal === 0) oneSetUpfrontTotal = p.total
        },
      }
    )
    const tOneSetDone = performance.now()

    // (d2) Full-account optimization: unfiltered (setFilterMode: 'all')
    let unfilteredUpfrontTotal = 0
    const tUnfiltered0 = performance.now()
    const unfilteredRes = await session.optimize(
      furinaOfficial,
      unfilteredSettings,
      {
        onProgress: (p: OptimizeProgress) => {
          if (unfilteredUpfrontTotal === 0) unfilteredUpfrontTotal = p.total
        },
      }
    )
    const tUnfilteredDone = performance.now()

    // (e) Catalog 4-member team cold & repeat
    const teamKeys = ['Furina', 'Neuvillette', 'KaedeharaKazuha', 'Baizhu']
    const tCatCold0 = performance.now()
    for (const k of teamKeys) {
      listTargetsForCharacter(k)
      listConditionalsForCharacter(k)
    }
    const tCatColdDone = performance.now()

    const tCatWarm0 = performance.now()
    for (const k of teamKeys) {
      listTargetsForCharacter(k)
      listConditionalsForCharacter(k)
    }
    const tCatWarmDone = performance.now()

    const switchPresetMs = Number((tSwitchDone - tSwitch0).toFixed(2))
    const currentBuildEvalMs = Number((tEvalDone - tEval0).toFixed(2))
    const catalog4MembersWarmMs = Number((tCatWarmDone - tCatWarm0).toFixed(2))
    const oneSetOptimizeMs = Number((tOneSetDone - tOneSet0).toFixed(2))
    const unfilteredOptimizeMs = Number(
      (tUnfilteredDone - tUnfiltered0).toFixed(2)
    )

    console.log(
      'PERF_SUMMARY_JSON:' +
        JSON.stringify({
          sessionCreateMs: Number((tSessionHydrated - t0).toFixed(2)),
          coldOptimizeLoadMs: Number((tColdDone - t0).toFixed(2)),
          switchPresetMs,
          currentBuildEvalMs,
          catalog4MembersColdMs: Number((tCatColdDone - tCatCold0).toFixed(2)),
          catalog4MembersWarmMs,
          rawCartesianTotal,
          oneSetGoldenTroupe: {
            upfrontTotal: oneSetUpfrontTotal,
            tested: oneSetRes.tested,
            skipped: oneSetRes.skipped,
            topBuildTotal: Number(oneSetRes.builds[0]?.total.toFixed(2)),
            topBuildArtifactIds: oneSetRes.builds[0]?.artifactIds,
            durationMs: oneSetOptimizeMs,
          },
          unfilteredAllSets: {
            upfrontTotal: unfilteredUpfrontTotal,
            tested: unfilteredRes.tested,
            skipped: unfilteredRes.skipped,
            topBuildTotal: Number(unfilteredRes.builds[0]?.total.toFixed(2)),
            topBuildArtifactIds: unfilteredRes.builds[0]?.artifactIds,
            durationMs: unfilteredOptimizeMs,
          },
        })
    )

    expect(evalCold.total).toBeGreaterThan(0)
    expect(evalSwitch.total).toBeGreaterThan(0)
    expect(evalCurr.total).toBe(evalCold.total)
    expect(oneSetRes.builds.length).toBeGreaterThan(0)
    expect(unfilteredRes.builds.length).toBeGreaterThan(0)
    expect(oneSetRes.tested + oneSetRes.skipped).toBe(oneSetUpfrontTotal)
    expect(unfilteredRes.tested + unfilteredRes.skipped).toBe(
      unfilteredUpfrontTotal
    )
    expect(unfilteredUpfrontTotal).toBeLessThanOrEqual(rawCartesianTotal)
    expect(switchPresetMs).toBeLessThan(250)
    expect(currentBuildEvalMs).toBeLessThan(250)
    expect(catalog4MembersWarmMs).toBeLessThan(5)
  }, 120_000)
})
