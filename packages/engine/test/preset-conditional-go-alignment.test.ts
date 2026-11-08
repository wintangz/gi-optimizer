import {
  getBundledPreset,
  listBundledPresets,
  type MemberBuildMode,
  type Preset,
} from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  listConditionalsForCharacter,
  validatePresetConditionalsAgainstGO,
} from '../src'

describe('Preset Conditional GO Alignment & Permanent Catalogue Guard (preset-conditional-go-alignment)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(fullGood)

  it('validates every bundled preset (akasha + official) against the authoritative GO conditional catalogue with zero unknown keys or values', () => {
    const presets = listBundledPresets()
    expect(presets).toHaveLength(33)

    for (const preset of presets) {
      const issues = validatePresetConditionalsAgainstGO(preset)
      expect(
        issues,
        `Preset ${preset.id} has invalid GO conditionals: ${JSON.stringify(issues, null, 2)}`
      ).toEqual([])
    }
  })

  it('exposes all 7 elemental react_<ele> and nightsoul_<ele> conditionals for ScrollOfTheHeroOfCinderCity in the GO catalogue', () => {
    const citlaliConds = listConditionalsForCharacter('Citlali')
    const scrollConds = citlaliConds.filter(
      (c) => c.sheet === 'ScrollOfTheHeroOfCinderCity'
    )
    const keys = new Set(scrollConds.map((c) => c.key))
    for (const ele of [
      'anemo',
      'geo',
      'electro',
      'hydro',
      'pyro',
      'cryo',
      'dendro',
    ]) {
      expect(keys.has(`react_${ele}`)).toBe(true)
      expect(keys.has(`nightsoul_${ele}`)).toBe(true)
      const reactDesc = scrollConds.find((c) => c.key === `react_${ele}`)
      const nsDesc = scrollConds.find((c) => c.key === `nightsoul_${ele}`)
      expect(reactDesc?.states.map((s) => s.key)).toEqual([ele])
      expect(nsDesc?.states.map((s) => s.key)).toEqual([ele])
    }
  })

  it('fails the permanent guard when any unknown sheet, unknown conditional key, or invalid conditional value is present in member.conditional or teamConditional', () => {
    const basePreset = getBundledPreset('official/furina-salon-subdps')!

    // 1. Dead key GoldenTroupe.offField
    const deadGoldenTroupe: Preset = structuredClone(basePreset)
    deadGoldenTroupe.team[0]!.conditional.GoldenTroupe = { offField: 'on' }
    const gtIssues = validatePresetConditionalsAgainstGO(deadGoldenTroupe)
    expect(gtIssues).toHaveLength(1)
    expect(gtIssues[0]!.path).toBe('team.0.conditional.GoldenTroupe.offField')
    expect(gtIssues[0]!.message).toContain("Unknown GO conditional key 'offField'")

    // 2. Dead key ArchaicPetra.ele
    const deadPetra: Preset = structuredClone(basePreset)
    deadPetra.team[3]!.conditional.ArchaicPetra = { ele: 'hydro' }
    const petraIssues = validatePresetConditionalsAgainstGO(deadPetra)
    expect(petraIssues).toHaveLength(1)
    expect(petraIssues[0]!.path).toBe('team.3.conditional.ArchaicPetra.ele')

    // 3. Invalid value Bennett.activeInArea = 'active' and Neuvillette.a4Hp = '80'
    const deadValues: Preset = structuredClone(
      getBundledPreset('official/mavuika-melt-hypercarry')!
    )
    deadValues.team[3]!.conditional.Bennett = { activeInArea: 'active' }
    const valIssues = validatePresetConditionalsAgainstGO(deadValues)
    expect(valIssues).toHaveLength(1)
    expect(valIssues[0]!.path).toBe('team.3.conditional.Bennett.activeInArea')
    expect(valIssues[0]!.message).toContain(
      "Invalid GO conditional state value 'active'"
    )

    // 4. Unknown sheet key
    const unknownSheet: Preset = structuredClone(basePreset)
    unknownSheet.team[0]!.conditional.NonExistentSheet = { set4: 'on' }
    const sheetIssues = validatePresetConditionalsAgainstGO(unknownSheet)
    expect(sheetIssues).toHaveLength(1)
    expect(sheetIssues[0]!.path).toBe(
      'team.0.conditional.NonExistentSheet'
    )

    // 5. Non-GO teamConditional.resonance ('Hydro') and teamConditional.reaction ('melt')
    const badTeamCond: Preset = structuredClone(basePreset)
    badTeamCond.teamConditional = {
      resonance: { Hydro: 'on' },
      reaction: { melt: 'on' },
    }
    const teamCondIssues = validatePresetConditionalsAgainstGO(badTeamCond)
    expect(teamCondIssues).toHaveLength(2)
    expect(teamCondIssues.map((i) => i.path)).toEqual([
      'teamConditional.resonance.Hydro',
      'teamConditional.reaction.melt',
    ])

    // 6. Valid GO teamConditional.resonance and teamConditional.reaction pass
    const validTeamCond: Preset = structuredClone(basePreset)
    validTeamCond.teamConditional = {
      resonance: { ShatteringIce: 'on', EnduringRock: 'on' },
      reaction: { superconduct: 'on', polestarStacks: '5' },
    }
    expect(validatePresetConditionalsAgainstGO(validTeamCond)).toEqual([])
  })

  it('verifies aligned conditionals actively contribute to GO calculation totals', () => {
    // 1. Furina GoldenTroupe.set4 = 'on' vs 'off' on akasha/furina-salon-pjc-c0
    const furinaPjc = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const evalPjcOn = session.evaluate(furinaPjc)
    const evalPjcNoGt = session.evaluate(furinaPjc, {
      artifactIds: session.currentBuild(furinaPjc).artifactIds,
      memberConditionals: {
        Furina: { GoldenTroupe: { set4: 'off' } },
      },
    })
    expect(evalPjcOn.total).toBeGreaterThan(evalPjcNoGt.total)

    // 2. Mavuika Melt (simulated TC teammates): ScrollOfTheHeroOfCinderCity (react_pyro + nightsoul_pyro = +40% Pyro DMG)
    const mavuikaMelt = getBundledPreset('official/mavuika-melt-hypercarry')!
    const tcModes: Record<string, MemberBuildMode> = {
      Citlali: 'tc',
      Xilonen: 'tc',
      Bennett: 'tc',
    }
    const evalMavFull = session.evaluate(mavuikaMelt, {
      artifactIds: session.currentBuild(mavuikaMelt).artifactIds,
      memberBuildModes: tcModes,
    })
    const evalMavNoScroll = session.evaluate(mavuikaMelt, {
      artifactIds: session.currentBuild(mavuikaMelt).artifactIds,
      memberBuildModes: tcModes,
      memberConditionals: {
        Citlali: {
          ScrollOfTheHeroOfCinderCity: {
            react_pyro: 'off',
            nightsoul_pyro: 'off',
          },
        },
      },
    })
    expect(
      evalMavFull.stats.pyro_dmg_! - evalMavNoScroll.stats.pyro_dmg_!
    ).toBeCloseTo(0.4, 5)
    expect(evalMavFull.total).toBeGreaterThan(evalMavNoScroll.total)
  })
})
