import {
  DEFAULT_OPTIMIZER_SETTINGS,
  getBundledPreset,
  getPresetConditionalOverrides,
  hasMemberConditionalOverrides,
  listBundledPresets,
  migrateOptimizerSettings,
  readEffectiveConditionalValue,
  resetMemberConditionalOverrides,
  setMemberConditionalOverride,
} from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  listConditionalsForCharacter,
  resolveEffectiveTeamConditionals,
} from '../src'

describe('Conditional Toggle Panel Engine & Settings (conditional-toggle-panel)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(fullGood)

  it('categorizes catalog conditionals into weapon, artifact, character, and constellation', () => {
    const furinaConds = listConditionalsForCharacter('Furina')
    const categories = new Set(furinaConds.map((c) => c.category))
    expect(categories.has('weapon')).toBe(true)
    expect(categories.has('artifact')).toBe(true)
    expect(categories.has('character')).toBe(true)
    expect(categories.has('constellation')).toBe(true)

    // Furina's burst Fanfare (burstFanfare) is a character conditional; C2 overstack (c2Overstack) and C6 (c6) are constellation conditionals
    const burstFanfare = furinaConds.find(
      (c) => c.sheet === 'Furina' && c.key === 'burstFanfare'
    )
    const c2Overstack = furinaConds.find(
      (c) => c.sheet === 'Furina' && c.key === 'c2Overstack'
    )
    const c6 = furinaConds.find((c) => c.sheet === 'Furina' && c.key === 'c6')
    expect(burstFanfare?.category).toBe('character')
    expect(c2Overstack?.category).toBe('constellation')
    expect(c6?.category).toBe('constellation')
  })

  it('(a) default panel state reproduces current totals for bundled official and bundled Akasha presets', async () => {
    const allBundled = listBundledPresets()
    expect(allBundled.length).toBeGreaterThanOrEqual(11)

    for (const preset of allBundled) {
      const baselineEval = session.evaluate(preset)
      const currentArtIds = session.currentBuild(preset).artifactIds
      const resolved = resolveEffectiveTeamConditionals({
        preset,
        goodData: fullGood,
      })

      // Passing empty overrides or the derived default panel state reproduces the exact baseline total
      const evalWithEmptyOverrides = session.evaluate(preset, {
        artifactIds: currentArtIds,
        memberConditionals: {},
      })
      expect(evalWithEmptyOverrides.total).toBe(baselineEval.total)
      expect(evalWithEmptyOverrides.stats).toEqual(baselineEval.stats)

      const evalWithDefaultPanelState = session.evaluate(preset, {
        artifactIds: currentArtIds,
        memberConditionals: resolved.defaultsByMember,
      })
      expect(evalWithDefaultPanelState.total).toBe(baselineEval.total)
      expect(evalWithDefaultPanelState.stats).toEqual(baselineEval.stats)
    }

    // Also verify solver optimization parity on both a bundled official preset and a bundled Akasha preset
    const smallGood = {
      ...fullGood,
      artifacts: fullGood.artifacts.filter(
        (a: { location?: string }) =>
          a.location === 'Furina' || a.location === 'HuTao'
      ),
    }
    const smallSession = createSession(smallGood)

    const officialPreset = getBundledPreset('official/furina-salon-subdps')!
    const officialResolved = resolveEffectiveTeamConditionals({
      preset: officialPreset,
      goodData: smallGood,
    })
    const optOfficialBaseline = await smallSession.optimize(officialPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    const optOfficialPanelDefault = await smallSession.optimize(
      officialPreset,
      {
        ...DEFAULT_OPTIMIZER_SETTINGS,
        topN: 1,
        memberConditionalOverrides: {
          [officialPreset.id]: officialResolved.defaultsByMember,
        },
      }
    )
    expect(optOfficialPanelDefault.builds[0]!.total).toBe(
      optOfficialBaseline.builds[0]!.total
    )

    const akashaPreset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const akashaResolved = resolveEffectiveTeamConditionals({
      preset: akashaPreset,
      goodData: smallGood,
    })
    const optAkashaBaseline = await smallSession.optimize(akashaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    const optAkashaPanelDefault = await smallSession.optimize(akashaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
      memberConditionalOverrides: {
        [akashaPreset.id]: akashaResolved.defaultsByMember,
      },
    })
    expect(optAkashaPanelDefault.builds[0]!.total).toBe(
      optAkashaBaseline.builds[0]!.total
    )
  })

  it('(b) flipping a named weapon conditional off changes the target total in the expected direction for both evaluate and optimize', async () => {
    // 1. Target weapon conditional: Furina with SplendorOfTranquilWaters on official/furina-salon-subdps
    const furinaOfficial = getBundledPreset('official/furina-salon-subdps')!
    const splendorSpec = {
      key: 'SplendorOfTranquilWaters',
      level: 90,
      ascension: 6,
      refinement: 1,
    }
    const furinaResolved = resolveEffectiveTeamConditionals({
      preset: furinaOfficial,
      goodData: fullGood,
      activeTargetWeaponKey: 'SplendorOfTranquilWaters',
    })
    // By default, SplendorOfTranquilWaters conditionals (teamHpChange='2', selfHpChange='3') are auto-populated on Furina
    expect(
      readEffectiveConditionalValue(
        furinaResolved.effectiveByMember.Furina,
        'SplendorOfTranquilWaters',
        'teamHpChange'
      )
    ).toBe('2')
    expect(
      readEffectiveConditionalValue(
        furinaResolved.effectiveByMember.Furina,
        'SplendorOfTranquilWaters',
        'selfHpChange'
      )
    ).toBe('3')

    const furinaCurrent = session.currentBuild(furinaOfficial)
    const baselineFurinaEval = session.evaluate(furinaOfficial, {
      ...furinaCurrent,
      weaponOverride: splendorSpec,
    })

    // Flip SplendorOfTranquilWaters.teamHpChange off -> HP and total rotation damage decrease
    const evalNoSplendorHp = session.evaluate(furinaOfficial, {
      ...furinaCurrent,
      weaponOverride: splendorSpec,
      memberConditionals: {
        Furina: {
          SplendorOfTranquilWaters: {
            teamHpChange: 'off',
          },
        },
      },
    })
    expect(evalNoSplendorHp.stats.hp!).toBeLessThan(baselineFurinaEval.stats.hp!)
    expect(evalNoSplendorHp.total).toBeLessThan(baselineFurinaEval.total)

    // Flip SplendorOfTranquilWaters.selfHpChange off -> rotation damage decreases further
    const evalNoSplendorBoth = session.evaluate(furinaOfficial, {
      ...furinaCurrent,
      weaponOverride: splendorSpec,
      memberConditionals: {
        Furina: {
          SplendorOfTranquilWaters: {
            teamHpChange: 'off',
            selfHpChange: 'off',
          },
        },
      },
    })
    expect(evalNoSplendorBoth.total).toBeLessThan(evalNoSplendorHp.total)

    // 2. Teammate weapon conditional: Citlali's ThrillingTalesOfDragonSlayers (Heritage) on official/mavuika-melt-hypercarry
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const mavuikaBaseline = session.evaluate(mavuikaOfficial)
    const mavuikaCurrent = session.currentBuild(mavuikaOfficial)
    const evalCitlaliTtdsOff = session.evaluate(mavuikaOfficial, {
      ...mavuikaCurrent,
      memberConditionals: {
        Citlali: {
          ThrillingTalesOfDragonSlayers: {
            Heritage: 'off',
          },
        },
      },
    })
    expect(
      mavuikaBaseline.stats.atk! - evalCitlaliTtdsOff.stats.atk!
    ).toBeCloseTo(95.9603208, 3)
    expect(evalCitlaliTtdsOff.total).toBeLessThan(mavuikaBaseline.total)

    // 3. Akasha preset: Hu Tao with StaffOfHoma (RecklessCinnabar)
    const hutaoAkasha = getBundledPreset('akasha/hutao-double-hydro-homa-c1')!
    const hutaoBaseline = session.evaluate(hutaoAkasha)
    const evalHomaOff = session.evaluate(hutaoAkasha, {
      artifactIds: session.currentBuild(hutaoAkasha).artifactIds,
      memberConditionals: {
        HuTao: {
          StaffOfHoma: {
            RecklessCinnabar: 'off',
          },
        },
      },
    })
    expect(evalHomaOff.stats.atk!).toBeLessThan(hutaoBaseline.stats.atk!)
    expect(evalHomaOff.total).toBeLessThan(hutaoBaseline.total)

    // 4. Optimizer solver (`session.optimize`) scores candidates under the user's toggle state,
    // including weapon passives and the target's own artifact set conditionals (e.g. GoldenTroupe.set4)
    const smallGood = {
      ...fullGood,
      artifacts: fullGood.artifacts.filter(
        (a: { location?: string }) => a.location === 'Furina'
      ),
    }
    const smallSession = createSession(smallGood)
    const optDefault = await smallSession.optimize(
      furinaOfficial,
      {
        ...DEFAULT_OPTIMIZER_SETTINGS,
        topN: 1,
      },
      { weaponOverride: splendorSpec }
    )

    const settingsSplendorOff = setMemberConditionalOverride(
      DEFAULT_OPTIMIZER_SETTINGS,
      furinaOfficial.id,
      'Furina',
      'SplendorOfTranquilWaters',
      'teamHpChange',
      'off'
    )
    const optSplendorOff = await smallSession.optimize(
      furinaOfficial,
      {
        ...settingsSplendorOff,
        topN: 1,
      },
      { weaponOverride: splendorSpec }
    )
    expect(optSplendorOff.builds[0]!.total).toBeCloseTo(
      evalNoSplendorHp.total,
      2
    )
    expect(optSplendorOff.builds[0]!.total).toBeLessThan(
      optDefault.builds[0]!.total
    )

    // Flipping target's own set conditional (GoldenTroupe.set4 = 'off') lowers solver score,
    // and flipping target's burstFanfare off also lowers solver score
    const settingsGoldenTroupeOff = setMemberConditionalOverride(
      DEFAULT_OPTIMIZER_SETTINGS,
      furinaOfficial.id,
      'Furina',
      'GoldenTroupe',
      'set4',
      'off'
    )
    const optGoldenTroupeOff = await smallSession.optimize(
      furinaOfficial,
      {
        ...settingsGoldenTroupeOff,
        topN: 1,
      },
      { weaponOverride: splendorSpec }
    )
    expect(optGoldenTroupeOff.builds[0]!.total).toBeLessThan(
      optDefault.builds[0]!.total
    )

    const settingsFanfareOff = setMemberConditionalOverride(
      DEFAULT_OPTIMIZER_SETTINGS,
      furinaOfficial.id,
      'Furina',
      'Furina',
      'burstFanfare',
      'off'
    )
    const optFanfareOff = await smallSession.optimize(
      furinaOfficial,
      {
        ...settingsFanfareOff,
        topN: 1,
      },
      { weaponOverride: splendorSpec }
    )
    expect(optFanfareOff.builds[0]!.total).toBeLessThan(
      optDefault.builds[0]!.total
    )
  })

  it('(c) an override survives a settings save/load round-trip and (d) reset restores the default total', async () => {
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const baselineEval = session.evaluate(mavuikaOfficial)
    const currentSel = session.currentBuild(mavuikaOfficial)

    // Apply override via settings helper (turn off Citlali's ThrillingTalesOfDragonSlayers.Heritage)
    let settings = setMemberConditionalOverride(
      DEFAULT_OPTIMIZER_SETTINGS,
      mavuikaOfficial.id,
      'Citlali',
      'ThrillingTalesOfDragonSlayers',
      'Heritage',
      'off'
    )
    settings = setMemberConditionalOverride(
      settings,
      mavuikaOfficial.id,
      'Bennett',
      'NoblesseOblige',
      'set4',
      'off'
    )
    expect(hasMemberConditionalOverrides(settings, mavuikaOfficial.id)).toBe(
      true
    )
    expect(
      hasMemberConditionalOverrides(settings, mavuikaOfficial.id, 'Citlali')
    ).toBe(true)

    // Simulate localStorage save/load round-trip via JSON serialization + migrateOptimizerSettings
    const rawJson = JSON.stringify(settings)
    const reloaded = migrateOptimizerSettings(JSON.parse(rawJson))

    expect(hasMemberConditionalOverrides(reloaded, mavuikaOfficial.id)).toBe(
      true
    )
    const persistedOverrides = getPresetConditionalOverrides(
      reloaded,
      mavuikaOfficial.id
    )
    expect(persistedOverrides).toEqual({
      Citlali: {
        ThrillingTalesOfDragonSlayers: {
          Heritage: 'off',
        },
      },
      Bennett: {
        NoblesseOblige: {
          set4: 'off',
        },
      },
    })

    const evalOverridden = session.evaluate(mavuikaOfficial, {
      ...currentSel,
      memberConditionals: persistedOverrides,
    })
    expect(evalOverridden.total).toBeLessThan(baselineEval.total)

    // (d) Reset Citlali and Bennett overrides -> restores Mavuika's exact default total!
    const afterCitlaliReset = resetMemberConditionalOverrides(
      reloaded,
      mavuikaOfficial.id,
      'Citlali'
    )
    expect(
      hasMemberConditionalOverrides(
        afterCitlaliReset,
        mavuikaOfficial.id,
        'Citlali'
      )
    ).toBe(false)
    expect(
      hasMemberConditionalOverrides(
        afterCitlaliReset,
        mavuikaOfficial.id,
        'Bennett'
      )
    ).toBe(true)

    const afterAllReset = resetMemberConditionalOverrides(
      afterCitlaliReset,
      mavuikaOfficial.id,
      'Bennett'
    )
    expect(hasMemberConditionalOverrides(afterAllReset, mavuikaOfficial.id)).toBe(
      false
    )
    expect(
      getPresetConditionalOverrides(afterAllReset, mavuikaOfficial.id)
    ).toEqual({})

    const evalAfterReset = session.evaluate(mavuikaOfficial, {
      ...currentSel,
      memberConditionals: getPresetConditionalOverrides(
        afterAllReset,
        mavuikaOfficial.id
      ),
    })
    expect(evalAfterReset.total).toBe(baselineEval.total)
    expect(evalAfterReset.stats).toEqual(baselineEval.stats)
  })
})
