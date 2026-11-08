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
  listTriggeredResonances,
  resolveDefaultWeaponCompareCandidate,
  setPresetMemberFastModeStat,
  setPresetResonanceEffectEnabled,
  setPresetResonanceEnabled,
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
    expect(zhongli.conditional.ArchaicPetra?.element).toBe('hydro')

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
    expect(furinaWithPetra.total).toBeGreaterThan(furinaWithoutPetra.total)

    // 2. official/mavuika-melt-hypercarry (Xilonen wears 4pc ArchaicPetra -> +35% Pyro DMG)
    const mavuikaOfficial = getBundledPreset('official/mavuika-melt-hypercarry')!
    const mavuikaTcModes = {
      Citlali: 'tc' as const,
      Xilonen: 'tc' as const,
      Bennett: 'tc' as const,
    }
    const xilonen = mavuikaOfficial.team.find((m) => m.key === 'Xilonen')!
    expect(xilonen.conditional.ArchaicPetra?.element).toBe('pyro')

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

  it('supports master Elemental Resonance toggle on official/skirk-freeze across evaluate, optimize, compareWeapons, and optimizeTeam', async () => {
    const skirkPreset = getBundledPreset('official/skirk-freeze')!
    const baseSelection = session.currentBuild(skirkPreset)

    // 1. Default (ON): Cryo resonance grants +15% CRIT Rate vs Frozen and appears in breakdown
    const evalDefault = session.evaluate(skirkPreset, baseSelection)
    const defaultCritContributors =
      evalDefault.statBreakdowns?.critRate_?.contributors ?? []
    expect(
      defaultCritContributors.some(
        (c) => c.category === 'resonance' && c.label === 'Elemental Resonance'
      )
    ).toBe(true)
    const defaultHasResonanceInFactors = evalDefault.instances.some((inst) =>
      (inst.breakdown?.factors ?? []).some((fg) =>
        fg.contributors.some((c) => c.category === 'resonance')
      )
    )
    expect(defaultHasResonanceInFactors).toBe(true)

    // 2. Toggled OFF: drops target CRIT Rate by 0.15 (15.0%), reduces rotation total, and removes all resonance contributors
    const evalOff = session.evaluate(skirkPreset, {
      ...baseSelection,
      resonanceEnabled: false,
    })
    expect(evalDefault.stats.critRate_! - evalOff.stats.critRate_!).toBeCloseTo(
      0.15,
      6
    )
    expect(evalOff.total).toBeLessThan(evalDefault.total)

    for (const sb of Object.values(evalOff.statBreakdowns ?? {})) {
      expect(sb.contributors.some((c) => c.category === 'resonance')).toBe(
        false
      )
    }
    for (const inst of evalOff.instances) {
      for (const fg of inst.breakdown?.factors ?? []) {
        expect(fg.contributors.some((c) => c.category === 'resonance')).toBe(
          false
        )
      }
    }

    // 3. Toggled back ON: restores original CRIT Rate and rotation total bit-for-bit
    const evalBackOn = session.evaluate(skirkPreset, {
      ...baseSelection,
      resonanceEnabled: true,
    })
    expect(evalBackOn.stats.critRate_).toBe(evalDefault.stats.critRate_)
    expect(evalBackOn.total).toBe(evalDefault.total)

    // 4. Consistency across optimize, compareWeapons, and optimizeTeam via OptimizerSettings
    const settingsOff = setPresetResonanceEnabled(
      { ...DEFAULT_OPTIMIZER_SETTINGS, topN: 1 },
      skirkPreset.id,
      false
    )
    const settingsOn = setPresetResonanceEnabled(
      settingsOff,
      skirkPreset.id,
      true
    )

    const optDefault = await session.optimize(skirkPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    const optOff = await session.optimize(skirkPreset, settingsOff)
    const optBackOn = await session.optimize(skirkPreset, settingsOn)

    expect(optOff.builds[0]!.resonanceEnabled).toBe(false)
    expect(optOff.builds[0]!.total).toBeLessThan(optDefault.builds[0]!.total)
    const reEvalOptOff = session.evaluate(skirkPreset, optOff.builds[0]!)
    expect(
      Math.abs(optOff.builds[0]!.total - reEvalOptOff.total) /
        reEvalOptOff.total
    ).toBeLessThanOrEqual(1e-5)
    expect(optBackOn.builds[0]!.total).toBe(optDefault.builds[0]!.total)

    const candidate = resolveDefaultWeaponCompareCandidate(
      'Azurelight',
      'Skirk',
      smallGood
    )
    const cmpOff = await session.compareWeapons(skirkPreset, settingsOff, [
      candidate,
    ])
    const cmpOn = await session.compareWeapons(skirkPreset, settingsOn, [
      candidate,
    ])
    expect(cmpOff.leaderTotal!).toBeLessThan(cmpOn.leaderTotal!)
    expect(cmpOff.rows[0]!.bestBuild?.resonanceEnabled).toBe(false)

    const teamOff = await session.optimizeTeam(skirkPreset, settingsOff)
    const teamOn = await session.optimizeTeam(skirkPreset, settingsOn)
    expect(teamOff.teamTotal).toBeLessThan(teamOn.teamTotal)
    expect(teamOff.currentTeamTotal).toBeLessThan(teamOn.currentTeamTotal)
    expect(teamOff.members[0]!.currentEvaluation?.total).toBe(evalOff.total)
    expect(teamOn.members[0]!.currentEvaluation?.total).toBe(evalDefault.total)
  })

  it('suppresses Pyro, Hydro, Geo, and Dendro resonances when resonanceEnabled is false even with explicit teamConditional triggers', () => {
    // Pyro + Hydro (2 Pyro + 2 Hydro)
    const pyroHydroPreset = createBlankUserPreset(
      'Mavuika',
      'Pyro Hydro Resonance Test',
      ['burst', 'skillDmg']
    )
    pyroHydroPreset.team.push(
      createDefaultTcTeammate('Bennett'),
      createDefaultTcTeammate('Furina'),
      createDefaultTcTeammate('Neuvillette')
    )
    pyroHydroPreset.teamConditional = {
      resonance: { Pyro: 'on', pyro: 'on', Hydro: 'on', hydro: 'on' },
      reaction: {},
    }
    const phOn = session.evaluate(pyroHydroPreset)
    const phOff = session.evaluate(pyroHydroPreset, {
      artifactIds: session.currentBuild(pyroHydroPreset).artifactIds,
      resonanceEnabled: false,
    })
    expect(phOn.stats.atk!).toBeGreaterThan(phOff.stats.atk!)
    expect(phOn.stats.hp!).toBeGreaterThan(phOff.stats.hp!)

    // Geo + Dendro (2 Geo + 2 Dendro)
    const geoDendroPreset = createBlankUserPreset(
      'Navia',
      'Geo Dendro Resonance Test',
      ['skill', 'totalShardDmg']
    )
    geoDendroPreset.team.push(
      createDefaultTcTeammate('Zhongli'),
      createDefaultTcTeammate('Nahida'),
      createDefaultTcTeammate('Alhaitham')
    )
    geoDendroPreset.teamConditional = {
      resonance: {
        Geo: 'on',
        geo: 'on',
        EnduringRock: 'on',
        EnduringRockHit: 'on',
        Dendro: 'on',
        dendro: 'on',
        SprawlingCanopy2ele: 'on',
        SprawlingCanopy3ele: 'on',
      },
      reaction: {},
    }
    const gdOn = session.evaluate(geoDendroPreset)
    const gdOff = session.evaluate(geoDendroPreset, {
      artifactIds: session.currentBuild(geoDendroPreset).artifactIds,
      resonanceEnabled: false,
    })
    expect(gdOn.stats.eleMas! - gdOff.stats.eleMas!).toBeCloseTo(100, 5)
    expect(gdOn.total).toBeGreaterThan(gdOff.total)
  })

  it('Fast Mode acceptance: adding +40 EM to a Kazuha teammate changes target total by the exact same amount as a real +40 EM artifact change (both TC and Owned builds)', () => {
    const neuvPreset = getBundledPreset('official/neuvillette-hypercarry')!
    expect(neuvPreset).toBeDefined()
    const baseSel = session.currentBuild(neuvPreset)

    // 1. Simulated (TC) Kazuha teammate: Fast Mode +40 EM vs manual TC +40 EM substat
    const tcModes = { KaedeharaKazuha: 'tc' as const }
    const baselineTc = session.evaluate(neuvPreset, {
      ...baseSel,
      memberBuildModes: tcModes,
    })
    const fastModeTc = session.evaluate(neuvPreset, {
      ...baseSel,
      memberBuildModes: tcModes,
      fastMode: {
        KaedeharaKazuha: { eleMas: 40 },
      },
    })

    const manualTcPreset: Preset = {
      ...neuvPreset,
      team: neuvPreset.team.map((m) => {
        if (m.key === 'KaedeharaKazuha' && m.build.type === 'tc') {
          return {
            ...m,
            build: {
              type: 'tc',
              tc: {
                ...m.build.tc,
                artifact: {
                  ...m.build.tc.artifact,
                  substats: {
                    ...m.build.tc.artifact.substats,
                    stats: {
                      ...m.build.tc.artifact.substats.stats,
                      eleMas:
                        (m.build.tc.artifact.substats.stats.eleMas ?? 0) + 40,
                    },
                  },
                },
              },
            },
          }
        }
        return m
      }),
    }
    const manualTc = session.evaluate(manualTcPreset, {
      ...baseSel,
      memberBuildModes: tcModes,
    })

    // Base EM stays identical; Final EM increases by +40; Target Hydro DMG% increases by 40 * 0.04% = 1.6%
    expect(fastModeTc.memberStats?.KaedeharaKazuha?.base.eleMas).toBeCloseTo(
      baselineTc.memberStats!.KaedeharaKazuha!.base.eleMas!,
      6
    )
    expect(
      fastModeTc.memberStats!.KaedeharaKazuha!.final.eleMas! -
        baselineTc.memberStats!.KaedeharaKazuha!.final.eleMas!
    ).toBeCloseTo(40, 6)
    expect(
      fastModeTc.stats.hydro_dmg_! - baselineTc.stats.hydro_dmg_!
    ).toBeCloseTo(40 * 0.0004, 6)

    // Exact rotation total & per-instance parity against manual +40 EM TC build
    expect(fastModeTc.total).toBeGreaterThan(baselineTc.total)
    expect(fastModeTc.total).toBe(manualTc.total)
    expect(
      fastModeTc.total - baselineTc.total
    ).toBe(manualTc.total - baselineTc.total)

    // 2. Owned Kazuha teammate: Fast Mode +40 EM vs real GOOD artifact +40 EM substat change
    const ownedModes = { KaedeharaKazuha: 'owned' as const }
    const kazuhaSwirlCond = {
      KaedeharaKazuha: {
        KaedeharaKazuha: { swirlhydro: 'hydro' },
      },
    }
    const baseOwnedGood = structuredClone(smallGood)
    baseOwnedGood.artifacts.push(
      {
        id: 'kazuha_test_flower',
        setKey: 'ViridescentVenerer',
        slotKey: 'flower',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp',
        location: 'KaedeharaKazuha',
        lock: false,
        substats: [{ key: 'eleMas', value: 25 }],
      },
      {
        id: 'kazuha_test_plume',
        setKey: 'WanderersTroupe',
        slotKey: 'plume',
        level: 20,
        rarity: 5,
        mainStatKey: 'atk',
        location: 'KaedeharaKazuha',
        lock: false,
        substats: [{ key: 'eleMas', value: 25 }],
      },
      {
        id: 'kazuha_test_sands',
        setKey: 'GladiatorsFinale',
        slotKey: 'sands',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: 'KaedeharaKazuha',
        lock: false,
        substats: [],
      }
    )
    const baseOwnedSession = createSession(baseOwnedGood)
    const baseOwnedSel = baseOwnedSession.currentBuild(neuvPreset)
    const baselineOwned = baseOwnedSession.evaluate(neuvPreset, {
      ...baseOwnedSel,
      memberBuildModes: ownedModes,
      memberConditionals: kazuhaSwirlCond,
    })
    const fastModeOwned = baseOwnedSession.evaluate(neuvPreset, {
      ...baseOwnedSel,
      memberBuildModes: ownedModes,
      memberConditionals: kazuhaSwirlCond,
      fastMode: {
        KaedeharaKazuha: { eleMas: 40 },
      },
    })

    // Clone baseOwnedGood and add +40 EM across KaedeharaKazuha's equipped artifacts (25+25+0 = 50 -> 30+30+30 = 90)
    const manualOwnedGood = structuredClone(baseOwnedGood)
    const kazuhaFlower = manualOwnedGood.artifacts.find(
      (a: any) => a.id === 'kazuha_test_flower'
    )
    const kazuhaPlume = manualOwnedGood.artifacts.find(
      (a: any) => a.id === 'kazuha_test_plume'
    )
    const kazuhaSands = manualOwnedGood.artifacts.find(
      (a: any) => a.id === 'kazuha_test_sands'
    )
    kazuhaFlower.substats = [{ key: 'eleMas', value: 30 }]
    kazuhaPlume.substats = [{ key: 'eleMas', value: 30 }]
    kazuhaSands.substats = [{ key: 'eleMas', value: 30 }]

    const manualOwnedSession = createSession(manualOwnedGood)
    const manualOwnedSel = manualOwnedSession.currentBuild(neuvPreset)
    const manualOwned = manualOwnedSession.evaluate(neuvPreset, {
      ...manualOwnedSel,
      memberBuildModes: ownedModes,
      memberConditionals: kazuhaSwirlCond,
    })

    expect(
      fastModeOwned.memberStats!.KaedeharaKazuha!.final.eleMas! -
        baselineOwned.memberStats!.KaedeharaKazuha!.final.eleMas!
    ).toBeCloseTo(40, 6)
    expect(fastModeOwned.total).toBeGreaterThan(baselineOwned.total)
    expect(fastModeOwned.total).toBe(manualOwned.total)
    expect(
      fastModeOwned.total - baselineOwned.total
    ).toBe(manualOwned.total - baselineOwned.total)
  })

  it('supports negative Fast Mode values, percentage stats, target immunity, single/compare optimize, and suppresses Fast Mode in optimizeTeam', async () => {
    const skirkPreset = getBundledPreset('official/skirk-freeze')!
    const tcModes = { Shenhe: 'tc' as const }
    const baseSel = {
      ...session.currentBuild(skirkPreset),
      memberBuildModes: tcModes,
    }
    const evalBase = session.evaluate(skirkPreset, baseSel)

    // 1. Target immunity: Fast Mode on slot 0 (Skirk) has zero effect
    const evalTargetAttempt = session.evaluate(skirkPreset, {
      ...baseSel,
      fastMode: {
        Skirk: { atk_: 100, critDMG_: 200 },
      },
    })
    expect(evalTargetAttempt.total).toBe(evalBase.total)
    expect(evalTargetAttempt.stats.atk).toBe(evalBase.stats.atk)

    // 2. Percentage & negative stats on non-target teammate (Shenhe atk_ +30% vs -30%)
    const evalShenhePlus = session.evaluate(skirkPreset, {
      ...baseSel,
      fastMode: {
        Shenhe: { atk_: 30 },
      },
    })
    const evalShenheMinus = session.evaluate(skirkPreset, {
      ...baseSel,
      fastMode: {
        Shenhe: { atk_: -30 },
      },
    })
    // Base ATK on Shenhe is unchanged; Final ATK increases by Base ATK * 0.30
    const shenheBaseAtk = evalBase.memberStats!.Shenhe!.base.atk!
    expect(evalShenhePlus.memberStats!.Shenhe!.base.atk).toBe(shenheBaseAtk)
    expect(
      evalShenhePlus.memberStats!.Shenhe!.final.atk! -
        evalBase.memberStats!.Shenhe!.final.atk!
    ).toBeCloseTo(shenheBaseAtk * 0.3, 4)
    expect(evalShenhePlus.total).toBeGreaterThan(evalBase.total)
    expect(evalShenheMinus.total).toBeLessThan(evalBase.total)

    // 3. Single optimize & weapon-compare honor Fast Mode; optimizeTeam suppresses Fast Mode
    const baseSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
      memberBuildModes: {
        [skirkPreset.id]: tcModes,
      },
    }
    const fastSettings = setPresetMemberFastModeStat(
      baseSettings,
      skirkPreset.id,
      'Shenhe',
      'atk_',
      40
    )

    const optBase = await session.optimize(skirkPreset, baseSettings)
    const optFast = await session.optimize(skirkPreset, fastSettings)
    expect(optFast.builds[0]!.fastMode).toEqual({
      Shenhe: { atk_: 40 },
    })
    expect(optFast.builds[0]!.total).toBeGreaterThan(optBase.builds[0]!.total)
    const reEvalFast = session.evaluate(skirkPreset, optFast.builds[0]!)
    expect(
      Math.abs(optFast.builds[0]!.total - reEvalFast.total) / reEvalFast.total
    ).toBeLessThanOrEqual(1e-5)

    const candidate = resolveDefaultWeaponCompareCandidate(
      'Azurelight',
      'Skirk',
      smallGood
    )
    const cmpBase = await session.compareWeapons(skirkPreset, baseSettings, [
      candidate,
    ])
    const cmpFast = await session.compareWeapons(skirkPreset, fastSettings, [
      candidate,
    ])
    expect(cmpFast.leaderTotal!).toBeGreaterThan(cmpBase.leaderTotal!)

    // optimizeTeam ignores both settings.fastModeByPreset and user preset member.fastMode
    const presetWithSavedFastMode: Preset = {
      ...skirkPreset,
      team: skirkPreset.team.map((m, idx) =>
        idx === 0 ? m : { ...m, fastMode: { atk_: 80 } }
      ),
    }
    const teamBase = await session.optimizeTeam(skirkPreset, baseSettings)
    const teamWithFast = await session.optimizeTeam(
      presetWithSavedFastMode,
      fastSettings
    )
    expect(teamWithFast.teamTotal).toBe(teamBase.teamTotal)
    expect(teamWithFast.currentTeamTotal).toBe(teamBase.currentTeamTotal)
  })

  it('toggles Shattering Ice on official/skirk-freeze: drops target CRIT Rate by 15.0% and lowers total, restoring bit-for-bit when re-enabled across all evaluation and optimization paths (resonance-effects)', async () => {
    const skirkPreset = getBundledPreset('official/skirk-freeze')!
    const triggered = listTriggeredResonances(skirkPreset)
    const shatteringIce = triggered.find((r) => r.key === 'ShatteringIce')
    expect(shatteringIce).toBeDefined()
    expect(shatteringIce!.name).toBe('Shattering Ice')
    expect(shatteringIce!.plainSummary).toContain('+15% CRIT Rate')
    expect(shatteringIce!.plainSummary).toContain('Frozen')

    const baseSel = session.currentBuild(skirkPreset)
    const evalOn = session.evaluate(skirkPreset, baseSel)
    const evalIceOff = session.evaluate(skirkPreset, {
      ...baseSel,
      resonanceEffects: { ShatteringIce: false },
    })
    const evalRestored = session.evaluate(skirkPreset, {
      ...baseSel,
      resonanceEffects: { ShatteringIce: true },
    })

    // Switching only ShatteringIce off drops Skirk's CRIT Rate by exactly 15.0% (0.15) and lowers total
    expect(evalOn.stats.critRate_! - evalIceOff.stats.critRate_!).toBeCloseTo(
      0.15,
      6
    )
    expect(evalIceOff.total).toBeLessThan(evalOn.total)
    // Switching it back restores the original total and stats bit-for-bit
    expect(evalRestored.total).toBe(evalOn.total)
    expect(evalRestored.stats.critRate_).toBe(evalOn.stats.critRate_)

    // Non-triggered resonance in resonanceEffects has zero effect
    const evalUntriggeredOff = session.evaluate(skirkPreset, {
      ...baseSel,
      resonanceEffects: { FerventFlames: false },
    })
    expect(evalUntriggeredOff.total).toBe(evalOn.total)
    expect(evalUntriggeredOff.stats.critRate_).toBe(evalOn.stats.critRate_)

    // Single optimize, weapon compare, and optimizeTeam honor ShatteringIce per-effect toggle
    const baseSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    }
    const iceOffSettings = setPresetResonanceEffectEnabled(
      baseSettings,
      skirkPreset.id,
      'ShatteringIce',
      false
    )
    const iceRestoredSettings = setPresetResonanceEffectEnabled(
      iceOffSettings,
      skirkPreset.id,
      'ShatteringIce',
      true
    )

    const optOn = await session.optimize(skirkPreset, baseSettings)
    const optIceOff = await session.optimize(skirkPreset, iceOffSettings)
    const optRestored = await session.optimize(skirkPreset, iceRestoredSettings)
    expect(optIceOff.builds[0]!.total).toBeLessThan(optOn.builds[0]!.total)
    expect(optIceOff.builds[0]!.resonanceEffects).toEqual({
      ShatteringIce: false,
    })
    expect(optRestored.builds[0]!.total).toBe(optOn.builds[0]!.total)

    const candidate = resolveDefaultWeaponCompareCandidate(
      'Azurelight',
      'Skirk',
      smallGood
    )
    const cmpOn = await session.compareWeapons(skirkPreset, baseSettings, [
      candidate,
    ])
    const cmpIceOff = await session.compareWeapons(
      skirkPreset,
      iceOffSettings,
      [candidate]
    )
    const cmpRestored = await session.compareWeapons(
      skirkPreset,
      iceRestoredSettings,
      [candidate]
    )
    expect(cmpIceOff.leaderTotal!).toBeLessThan(cmpOn.leaderTotal!)
    expect(cmpIceOff.rows[0]!.bestBuild!.resonanceEffects).toEqual({
      ShatteringIce: false,
    })
    expect(cmpRestored.leaderTotal!).toBe(cmpOn.leaderTotal!)

    const teamOn = await session.optimizeTeam(skirkPreset, baseSettings)
    const teamIceOff = await session.optimizeTeam(skirkPreset, iceOffSettings)
    const teamRestored = await session.optimizeTeam(
      skirkPreset,
      iceRestoredSettings
    )
    expect(teamIceOff.teamTotal).toBeLessThan(teamOn.teamTotal)
    expect(teamIceOff.currentTeamTotal).toBeLessThan(teamOn.currentTeamTotal)
    expect(teamRestored.teamTotal).toBe(teamOn.teamTotal)
    expect(teamRestored.currentTeamTotal).toBe(teamOn.currentTeamTotal)
  })

  it('independently toggles dual resonances on a team triggering two resonances without affecting the other resonance contribution (resonance-effects)', () => {
    // Skirk (Cryo), Furina (Hydro), Escoffier (Cryo), Yelan (Hydro)
    // triggers both SoothingWater (+25% HP) and ShatteringIce (+15% CRIT Rate vs Frozen)
    const baseSkirkPreset = getBundledPreset('official/skirk-freeze')!
    const dualFreezePreset: Preset = {
      ...baseSkirkPreset,
      team: [
        baseSkirkPreset.team[0]!, // Skirk (Cryo)
        baseSkirkPreset.team[1]!, // Furina (Hydro)
        baseSkirkPreset.team[2]!, // Escoffier (Cryo)
        createDefaultTcTeammate('Yelan'), // Yelan (Hydro)
      ],
    }
    const triggeredFreeze = listTriggeredResonances(dualFreezePreset)
    expect(triggeredFreeze.map((r) => r.key)).toEqual([
      'SoothingWater',
      'ShatteringIce',
    ])

    const baseSel = session.currentBuild(dualFreezePreset)
    const evalBothOn = session.evaluate(dualFreezePreset, baseSel)
    const evalOnlyIceOff = session.evaluate(dualFreezePreset, {
      ...baseSel,
      resonanceEffects: { ShatteringIce: false, SoothingWater: true },
    })
    const evalOnlyWaterOff = session.evaluate(dualFreezePreset, {
      ...baseSel,
      resonanceEffects: { ShatteringIce: true, SoothingWater: false },
    })
    const evalBothOff = session.evaluate(dualFreezePreset, {
      ...baseSel,
      resonanceEffects: { ShatteringIce: false, SoothingWater: false },
    })

    // 1. Turning ShatteringIce OFF drops CRIT Rate by 15%, while SoothingWater's +25% HP contribution on Furina/Yelan/Skirk is 100% unchanged!
    expect(
      evalBothOn.stats.critRate_! - evalOnlyIceOff.stats.critRate_!
    ).toBeCloseTo(0.15, 6)
    expect(evalOnlyIceOff.stats.hp).toBe(evalBothOn.stats.hp)
    expect(evalOnlyIceOff.memberStats!.Furina!.final.hp).toBe(
      evalBothOn.memberStats!.Furina!.final.hp
    )

    // 2. Turning SoothingWater OFF removes +25% HP, while ShatteringIce's +15% CRIT Rate contribution is 100% unchanged!
    const skirkBaseHp = evalBothOn.memberStats!.Skirk!.base.hp!
    const furinaBaseHp = evalBothOn.memberStats!.Furina!.base.hp!
    expect(evalOnlyWaterOff.stats.critRate_).toBe(evalBothOn.stats.critRate_)
    expect(evalBothOn.stats.hp! - evalOnlyWaterOff.stats.hp!).toBeCloseTo(
      skirkBaseHp * 0.25,
      3
    )
    expect(
      evalBothOn.memberStats!.Furina!.final.hp! -
        evalOnlyWaterOff.memberStats!.Furina!.final.hp!
    ).toBeCloseTo(furinaBaseHp * 0.25, 3)

    // 3. Turning both OFF equals Master OFF
    const evalMasterOff = session.evaluate(dualFreezePreset, {
      ...baseSel,
      resonanceEnabled: false,
    })
    expect(evalBothOff.total).toBe(evalMasterOff.total)
    expect(evalBothOff.stats.critRate_).toBe(evalMasterOff.stats.critRate_)
    expect(evalBothOff.stats.hp).toBe(evalMasterOff.stats.hp)

    // Also verify a dual Pyro + Hydro team (FerventFlames +25% ATK + SoothingWater +25% HP)
    const arlePreset = getBundledPreset('official/arlecchino-vaporize')!
    const dualPyroHydroPreset: Preset = {
      ...arlePreset,
      team: [
        arlePreset.team[0]!, // Arlecchino (Pyro)
        arlePreset.team[1]!, // Yelan (Hydro)
        arlePreset.team[2]!, // Bennett (Pyro)
        createDefaultTcTeammate('Furina'), // Furina (Hydro)
      ],
    }
    expect(listTriggeredResonances(dualPyroHydroPreset).map((r) => r.key)).toEqual([
      'FerventFlames',
      'SoothingWater',
    ])
    const arleSel = session.currentBuild(dualPyroHydroPreset)
    const arleBothOn = session.evaluate(dualPyroHydroPreset, arleSel)
    const arlePyroOff = session.evaluate(dualPyroHydroPreset, {
      ...arleSel,
      resonanceEffects: { FerventFlames: false },
    })
    const arleHydroOff = session.evaluate(dualPyroHydroPreset, {
      ...arleSel,
      resonanceEffects: { SoothingWater: false },
    })
    const arleBaseAtk = arleBothOn.memberStats!.Arlecchino!.base.atk!
    const arleBaseHp = arleBothOn.memberStats!.Arlecchino!.base.hp!

    // Pyro off removes 25% ATK while keeping 25% HP unchanged
    expect(arleBothOn.stats.atk! - arlePyroOff.stats.atk!).toBeCloseTo(
      arleBaseAtk * 0.25,
      3
    )
    expect(arlePyroOff.stats.hp).toBe(arleBothOn.stats.hp)

    // Hydro off removes 25% HP while keeping 25% ATK unchanged
    expect(arleBothOn.stats.hp! - arleHydroOff.stats.hp!).toBeCloseTo(
      arleBaseHp * 0.25,
      3
    )
    expect(arleHydroOff.stats.atk).toBe(arleBothOn.stats.atk)
  })
})

