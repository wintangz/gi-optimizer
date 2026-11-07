import {
  createBlankUserPreset,
  createDefaultTcTeammate,
  getBundledPreset,
  type Preset,
} from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  DEFAULT_OPTIMIZER_SETTINGS,
  getDefaultTargetArtifactSetConditionals,
} from '../src'

function makeReducedGood(
  fullGood: Record<string, any>,
  perSlot = 3
): Record<string, any> {
  const counts: Record<string, number> = {
    flower: 0,
    plume: 0,
    sands: 0,
    goblet: 0,
    circlet: 0,
  }
  const artifacts: any[] = []
  for (const art of fullGood.artifacts ?? []) {
    if (
      art.location === 'Furina' ||
      art.location === 'Mavuika' ||
      art.location === 'RaidenShogun' ||
      (counts[art.slotKey] !== undefined && counts[art.slotKey]! < perSlot)
    ) {
      artifacts.push(art)
      counts[art.slotKey] = (counts[art.slotKey] ?? 0) + 1
    }
  }
  return {
    ...fullGood,
    artifacts,
  }
}

describe('Buff Coverage Fixes (buff-coverage-fixes)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const smallGood = makeReducedGood(fullGood, 3)
  const session = createSession(smallGood)

  it('proves Bennett burst conditional on vs off changes an official preset total', () => {
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const tcAllModes = {
      Citlali: 'tc' as const,
      Xilonen: 'tc' as const,
      Bennett: 'tc' as const,
    }
    const withBennettOnPreset: Preset = structuredClone(mavuikaOfficial)
    const bennettOn = withBennettOnPreset.team.find(
      (m) => m.key === 'Bennett'
    )!
    bennettOn.conditional = {
      ...bennettOn.conditional,
      Bennett: { activeInArea: 'activeInArea' },
    }
    const withBennettOn = session.evaluate(withBennettOnPreset, {
      artifactIds: session.currentBuild(withBennettOnPreset).artifactIds,
      memberBuildModes: tcAllModes,
    })

    const withoutBennettPreset: Preset = structuredClone(mavuikaOfficial)
    const bennettOff = withoutBennettPreset.team.find(
      (m) => m.key === 'Bennett'
    )!
    bennettOff.conditional = {
      ...bennettOff.conditional,
      Bennett: {},
    }

    const withBennettOff = session.evaluate(withoutBennettPreset, {
      artifactIds: session.currentBuild(withoutBennettPreset).artifactIds,
      memberBuildModes: tcAllModes,
    })
    expect(withBennettOn.stats.atk!).toBeGreaterThan(withBennettOff.stats.atk!)
    expect(withBennettOn.total).toBeGreaterThan(withBennettOff.total)
  })

  it('activates Citlali R5 Thrilling Tales of Dragon Slayers (Heritage=on) in official/mavuika-melt-hypercarry and increases total vs before', () => {
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const tcAllModes = {
      Citlali: 'tc' as const,
      Xilonen: 'tc' as const,
      Bennett: 'tc' as const,
    }
    const citlali = mavuikaOfficial.team.find((m) => m.key === 'Citlali')!
    expect(citlali.conditional.ThrillingTalesOfDragonSlayers).toEqual({
      Heritage: 'on',
    })

    const withTtds = session.evaluate(mavuikaOfficial, {
      artifactIds: session.currentBuild(mavuikaOfficial).artifactIds,
      memberBuildModes: tcAllModes,
    })

    const withoutTtdsPreset: Preset = structuredClone(mavuikaOfficial)
    const citlaliNoTtds = withoutTtdsPreset.team.find(
      (m) => m.key === 'Citlali'
    )!
    delete citlaliNoTtds.conditional.ThrillingTalesOfDragonSlayers

    const withoutTtds = session.evaluate(withoutTtdsPreset, {
      artifactIds: session.currentBuild(withoutTtdsPreset).artifactIds,
      memberBuildModes: tcAllModes,
    })
    // R5 TTDS grants +48% ATK of Mavuika's Base ATK (399.83467 * 0.48 = 191.9206416)
    expect(withTtds.stats.atk! - withoutTtds.stats.atk!).toBeCloseTo(
      191.9206416,
      3
    )
    expect(withTtds.total).toBeGreaterThan(withoutTtds.total)
  })

  it('activates Archaic Petra 4pc DMG buff in official/furina-salon-subdps (hydro) and official/mavuika-melt-hypercarry (pyro)', () => {
    // 1. official/furina-salon-subdps (Zhongli wears 4pc ArchaicPetra -> +35% Hydro DMG)
    const furinaOfficial = getBundledPreset('official/furina-salon-subdps')!
    const furinaTcModes = {
      Neuvillette: 'tc' as const,
      KaedeharaKazuha: 'tc' as const,
      Zhongli: 'tc' as const,
    }
    const zhongli = furinaOfficial.team.find((m) => m.key === 'Zhongli')!
    expect(zhongli.conditional.ArchaicPetra?.ele).toBe('hydro')

    const furinaWithPetra = session.evaluate(furinaOfficial, {
      artifactIds: session.currentBuild(furinaOfficial).artifactIds,
      memberBuildModes: furinaTcModes,
    })
    const furinaWithoutPetraPreset: Preset = structuredClone(furinaOfficial)
    const zhongliNoPetra = furinaWithoutPetraPreset.team.find(
      (m) => m.key === 'Zhongli'
    )!
    delete zhongliNoPetra.conditional.ArchaicPetra

    const furinaWithoutPetra = session.evaluate(furinaWithoutPetraPreset, {
      artifactIds: session.currentBuild(furinaWithoutPetraPreset).artifactIds,
      memberBuildModes: furinaTcModes,
    })
    expect(
      furinaWithPetra.stats.hydro_dmg_! - furinaWithoutPetra.stats.hydro_dmg_!
    ).toBeCloseTo(0.35, 5)
    expect(furinaWithPetra.total).toBeCloseTo(674788.7013106729, 2)
    expect(furinaWithoutPetra.total).toBeCloseTo(593801.9048674193, 2)
    expect(furinaWithPetra.total).toBeGreaterThan(furinaWithoutPetra.total)

    // 2. official/mavuika-melt-hypercarry (Xilonen wears 4pc ArchaicPetra -> +35% Pyro DMG)
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const mavuikaTcModes = {
      Citlali: 'tc' as const,
      Xilonen: 'tc' as const,
      Bennett: 'tc' as const,
    }
    const xilonen = mavuikaOfficial.team.find((m) => m.key === 'Xilonen')!
    expect(xilonen.conditional.ArchaicPetra?.ele).toBe('pyro')

    const mavuikaWithPetra = session.evaluate(mavuikaOfficial, {
      artifactIds: session.currentBuild(mavuikaOfficial).artifactIds,
      memberBuildModes: mavuikaTcModes,
    })
    const mavuikaWithoutPetraPreset: Preset = structuredClone(mavuikaOfficial)
    const xilonenNoPetra = mavuikaWithoutPetraPreset.team.find(
      (m) => m.key === 'Xilonen'
    )!
    delete xilonenNoPetra.conditional.ArchaicPetra

    const mavuikaWithoutPetra = session.evaluate(mavuikaWithoutPetraPreset, {
      artifactIds: session.currentBuild(mavuikaWithoutPetraPreset).artifactIds,
      memberBuildModes: mavuikaTcModes,
    })
    expect(
      mavuikaWithPetra.stats.pyro_dmg_! - mavuikaWithoutPetra.stats.pyro_dmg_!
    ).toBeCloseTo(0.35, 5)
    expect(mavuikaWithPetra.total).toBeCloseTo(89389.76243736036, 2)
    expect(mavuikaWithPetra.total).toBeGreaterThan(mavuikaWithoutPetra.total)
  })

  it('auto-populates conditional-gated weapon passives on owned targets during weapon swap (evaluate and optimize) while respecting explicit overrides', async () => {
    const furinaOfficial = getBundledPreset('official/furina-salon-subdps')!
    // Add an owned Wolf-Fang R5 sword to the inventory
    const wolfFangWeapon = {
      id: 'owned_wolffang_r5',
      key: 'WolfFang',
      level: 90,
      ascension: 6,
      refinement: 5,
      location: '',
      lock: true,
    }
    const sessionWithWeapon = createSession({
      ...smallGood,
      weapons: [...(smallGood.weapons ?? []), wolfFangWeapon],
    })

    // Evaluate with swapped owned weapon (no explicit WolfFang conditional in preset -> auto-populates max stacks)
    const evalAuto = sessionWithWeapon.evaluate(furinaOfficial, {
      weaponId: 'owned_wolffang_r5',
      artifactIds: sessionWithWeapon.currentBuild(furinaOfficial).artifactIds,
    })

    // Explicitly author WolfFang conditional as off/empty -> must NOT override explicit authored entry
    const presetWithOffWolfFang: Preset = structuredClone(furinaOfficial)
    presetWithOffWolfFang.team[0]!.conditional = {
      ...presetWithOffWolfFang.team[0]!.conditional,
      WolfFang: { skillCritRate: 'off', burstCritRate: 'off' },
    }
    const evalExplicitOff = sessionWithWeapon.evaluate(presetWithOffWolfFang, {
      weaponId: 'owned_wolffang_r5',
      artifactIds: sessionWithWeapon.currentBuild(furinaOfficial).artifactIds,
    })

    // Wolf-Fang R5 passive grants +16% Skill/Burst CRIT Rate at 4 stacks -> higher rotation total
    expect(evalAuto.total).toBeGreaterThan(evalExplicitOff.total)

    // Optimize path with weaponId also applies the weapon's conditional passive identically
    const optAuto = await sessionWithWeapon.optimize(
      furinaOfficial,
      {
        ...DEFAULT_OPTIMIZER_SETTINGS,
        topN: 1,
      },
      { weaponId: 'owned_wolffang_r5' }
    )
    expect(optAuto.builds.length).toBe(1)
    const reEvalOpt = sessionWithWeapon.evaluate(
      furinaOfficial,
      optAuto.builds[0]!
    )
    expect(
      Math.abs(optAuto.builds[0]!.total - reEvalOpt.total) / reEvalOpt.total
    ).toBeLessThanOrEqual(1e-5)
  })

  it('defaults target boolean artifact-set conditionals to on (and leaves stack conditionals untouched) identically in evaluate and optimize', async () => {
    const defaultSetConds = getDefaultTargetArtifactSetConditionals()
    // GoldenTroupe and ObsidianCodex have single-state boolean conditionals
    expect(defaultSetConds.GoldenTroupe).toEqual({ set4: 'on' })
    expect(defaultSetConds.ObsidianCodex).toEqual({
      '2NightsoulBlessing': 'on',
      '4NightsoulConsume': 'on',
    })
    // MarechausseeHunter has 3 stacks ('1', '2', '3'), so it must NOT be defaulted
    expect(defaultSetConds.MarechausseeHunter).toBeUndefined()

    // Create a custom Furina preset that does NOT author GoldenTroupe in target.conditional
    const customFurina = structuredClone(
      getBundledPreset('official/furina-salon-subdps')!
    )
    customFurina.id = 'user/furina-unauthored-gt'
    customFurina.source = 'user'
    delete customFurina.team[0]!.conditional.GoldenTroupe

    // Evaluate with GoldenTroupe unauthored (defaults to set4: 'on') vs explicitly set to 'off'
    const evalDefaultOn = session.evaluate(customFurina)

    const customFurinaExplicitOff = structuredClone(customFurina)
    customFurinaExplicitOff.team[0]!.conditional.GoldenTroupe = {
      set4: 'off',
    }
    const evalExplicitOff = session.evaluate(customFurinaExplicitOff)

    // Furina's equipped build in Van GOOD has 4pc GoldenTroupe, so defaulting offField='on' grants +25% Skill DMG
    expect(evalDefaultOn.total).toBeGreaterThan(evalExplicitOff.total)

    // Optimize agrees with evaluate on the unauthored preset
    const optRes = await session.optimize(customFurina, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    expect(optRes.builds.length).toBe(1)
    const evalBest = session.evaluate(customFurina, optRes.builds[0]!)
    expect(
      Math.abs(optRes.builds[0]!.total - evalBest.total) / evalBest.total
    ).toBeLessThanOrEqual(1e-5)
  })

  it('defaults teamConditional.resonance to on for double-element custom teams and moves total vs resonance off', () => {
    // Build a double-Hydro custom team without specifying teamConditional.resonance
    const doubleHydroCustom = createBlankUserPreset(
      'Furina',
      'Double Hydro Custom',
      ['skill', 'usherDmg']
    )
    doubleHydroCustom.team.push(
      createDefaultTcTeammate('Neuvillette'),
      createDefaultTcTeammate('KaedeharaKazuha'),
      createDefaultTcTeammate('Zhongli')
    )
    doubleHydroCustom.teamConditional = { resonance: {}, reaction: {} }

    const withAutoResonance = session.evaluate(doubleHydroCustom)

    const withResonanceOff: Preset = structuredClone(doubleHydroCustom)
    withResonanceOff.teamConditional = {
      resonance: { Hydro: 'off', hydro: 'off' },
      reaction: {},
    }
    const withoutResonance = session.evaluate(withResonanceOff)

    // Hydro resonance grants +25% HP -> higher HP and higher Furina skill damage
    expect(withAutoResonance.stats.hp!).toBeGreaterThan(
      withoutResonance.stats.hp!
    )
    expect(withAutoResonance.total).toBeGreaterThan(withoutResonance.total)

    // Also verify default TC teammate NoblesseOblige set4='on' moves total on an ATK-scaling target
    const mavuikaCustom = createBlankUserPreset(
      'Mavuika',
      'Mavuika Custom TC Support',
      ['burst', 'skillDmg']
    )
    const tcTeammate = createDefaultTcTeammate('Bennett')
    expect(tcTeammate.conditional.NoblesseOblige).toEqual({ set4: 'on' })
    mavuikaCustom.team.push(tcTeammate)

    const evalWithNoblesse = session.evaluate(mavuikaCustom)
    const mavuikaNoNoblesse = structuredClone(mavuikaCustom)
    mavuikaNoNoblesse.team[1]!.conditional = {}
    const evalWithoutNoblesse = session.evaluate(mavuikaNoNoblesse)

    expect(evalWithNoblesse.stats.atk!).toBeGreaterThan(
      evalWithoutNoblesse.stats.atk!
    )
    expect(evalWithNoblesse.total).toBeGreaterThan(evalWithoutNoblesse.total)
  })
})
