import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  DEFAULT_OPTIMIZER_SETTINGS,
  listConditionalsForCharacter,
  listTargetsForCharacter,
} from '../src/index'
import { getBundledPreset } from '@gi/presets'

describe('Baseline Performance Measurements', () => {
  it('measures baseline timings on Van_2025-07-16_19-59-13.json', async () => {
    const goodPath = resolve(
      GO_ROOT,
      'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'
    )
    const good = JSON.parse(readFileSync(goodPath, 'utf8'))

    const furinaPreset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const hutaoPreset = getBundledPreset('akasha/hutao-double-hydro-homa-c1')!

    // (a) Cold load of /optimize with ~1,000-artifact GOOD already imported:
    // Previously /optimize synchronously ran createSession(good) + currentBuild + evaluate(preset, currentSelection) on the main thread
    const t0 = performance.now()
    const session = createSession(good)
    const tSessionHydrated = performance.now()
    const currSel = session.currentBuild(furinaPreset)
    const evalCold = session.evaluate(furinaPreset, currSel)
    const tColdDone = performance.now()

    // (b) Switching presets on /optimize:
    // Previously re-ran currentBuild + session.evaluate(newPreset, sel) which called hydrateTeamIntoDb -> new ArtCharDatabase + importGOOD
    const tSwitch0 = performance.now()
    const hutaoSel = session.currentBuild(hutaoPreset)
    const evalSwitch = session.evaluate(hutaoPreset, hutaoSel)
    const tSwitchDone = performance.now()

    // (c) Current-build evaluation on same preset:
    const tEval0 = performance.now()
    const evalCurr = session.evaluate(furinaPreset, currSel)
    const tEvalDone = performance.now()

    // (d) Full optimisation run on the same file:
    const tOpt0 = performance.now()
    const optRes = await session.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: false,
    })
    const tOptDone = performance.now()

    // (e) Catalog 4-member team cold & repeat (previously uncached)
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

    console.log(
      'PERF_SUMMARY_JSON:' +
        JSON.stringify({
          sessionCreateMs: Number((tSessionHydrated - t0).toFixed(2)),
          coldOptimizeLoadMs: Number((tColdDone - t0).toFixed(2)),
          switchPresetMs,
          currentBuildEvalMs,
          fullOptimizeMs: Number((tOptDone - tOpt0).toFixed(2)),
          catalog4MembersColdMs: Number((tCatColdDone - tCatCold0).toFixed(2)),
          catalog4MembersWarmMs,
          tested: optRes.tested,
          skipped: optRes.skipped,
        })
    )

    expect(evalCold.total).toBeGreaterThan(0)
    expect(evalSwitch.total).toBeGreaterThan(0)
    expect(evalCurr.total).toBe(evalCold.total)
    expect(optRes.builds.length).toBeGreaterThan(0)
    expect(switchPresetMs).toBeLessThan(250)
    expect(currentBuildEvalMs).toBeLessThan(250)
    expect(catalog4MembersWarmMs).toBeLessThan(5)
  }, 60_000)
})

