import { getBundledPreset, type OptimizerSettings } from '@gi/presets'
import { describe, expect, it } from 'vitest'
import {
  compareWeapons,
  createSession,
  DEFAULT_OPTIMIZER_SETTINGS,
  resolveDefaultWeaponCompareCandidate,
  WEAPON_COMPARE_TOP_N,
} from '../src'

describe('Weapon Comparison Mode (weapon-compare)', () => {
  const deterministicGood = {
    format: 'GOOD',
    version: 3,
    source: 'WeaponCompareTest',
    characters: [
      {
        key: 'Furina',
        level: 90,
        ascension: 6,
        constellation: 0,
        talent: { auto: 6, skill: 10, burst: 10 },
      },
    ],
    weapons: [
      {
        id: 'w_fav_equipped',
        key: 'FavoniusSword',
        level: 80,
        ascension: 5,
        refinement: 4,
        location: 'Furina',
        lock: true,
      },
      {
        id: 'w_fleuve_inv',
        key: 'FleuveCendreFerryman',
        level: 90,
        ascension: 6,
        refinement: 5,
        location: '',
        lock: true,
      },
    ],
    artifacts: [
      // Set A: High-damage Golden Troupe 4p + CRIT DMG circlet with modest ER (+40% ER total -> 140% ER with 0%-ER weapon, 201.3% ER with Lv.90 Favonius Sword)
      {
        id: 'gt_flower_strong',
        setKey: 'GoldenTroupe',
        slotKey: 'flower',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 14.0 },
          { key: 'critDMG_', value: 28.0 },
          { key: 'hp_', value: 15.0 },
          { key: 'enerRech_', value: 10.0 },
        ],
      },
      {
        id: 'gt_plume_strong',
        setKey: 'GoldenTroupe',
        slotKey: 'plume',
        level: 20,
        rarity: 5,
        mainStatKey: 'atk',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 14.0 },
          { key: 'critDMG_', value: 28.0 },
          { key: 'hp_', value: 15.0 },
          { key: 'enerRech_', value: 10.0 },
        ],
      },
      {
        id: 'gt_sands_hp_strong',
        setKey: 'GoldenTroupe',
        slotKey: 'sands',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 14.0 },
          { key: 'critDMG_', value: 28.0 },
          { key: 'enerRech_', value: 10.0 },
          { key: 'hp', value: 500 },
        ],
      },
      {
        id: 'gt_goblet_hydro_strong',
        setKey: 'GoldenTroupe',
        slotKey: 'goblet',
        level: 20,
        rarity: 5,
        mainStatKey: 'hydro_dmg_',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 14.0 },
          { key: 'critDMG_', value: 28.0 },
          { key: 'hp_', value: 15.0 },
          { key: 'enerRech_', value: 10.0 },
        ],
      },
      {
        id: 'mh_circlet_cr_strong',
        setKey: 'MarechausseeHunter',
        slotKey: 'circlet',
        level: 20,
        rarity: 5,
        mainStatKey: 'critRate_',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critDMG_', value: 30.0 },
          { key: 'hp_', value: 15.0 },
          { key: 'hp', value: 500 },
          { key: 'def', value: 20 },
        ],
      },

      // Set B: High-ER off-set pieces with weak offensive stats (provides +105.8% ER total -> 205.8% ER even with a 0%-ER weapon, but loses 4p Golden Troupe, HP% Sands, Hydro Goblet, and CRIT substats)
      {
        id: 'er_flower_weak',
        setKey: 'WanderersTroupe',
        slotKey: 'flower',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp',
        location: '',
        lock: false,
        substats: [
          { key: 'enerRech_', value: 22.0 },
          { key: 'def', value: 60 },
          { key: 'atk', value: 30 },
          { key: 'def_', value: 10.0 },
        ],
      },
      {
        id: 'er_plume_weak',
        setKey: 'GladiatorsFinale',
        slotKey: 'plume',
        level: 20,
        rarity: 5,
        mainStatKey: 'atk',
        location: '',
        lock: false,
        substats: [
          { key: 'enerRech_', value: 22.0 },
          { key: 'def', value: 60 },
          { key: 'hp', value: 500 },
          { key: 'def_', value: 10.0 },
        ],
      },
      {
        id: 'er_sands_weak',
        setKey: 'NoblesseOblige',
        slotKey: 'sands',
        level: 20,
        rarity: 5,
        mainStatKey: 'enerRech_', // +51.8% ER main stat
        location: '',
        lock: false,
        substats: [
          { key: 'def', value: 80 },
          { key: 'atk', value: 40 },
          { key: 'def_', value: 12.0 },
          { key: 'eleMas', value: 20 },
        ],
      },
      {
        id: 'er_goblet_weak',
        setKey: 'BloodstainedChivalry',
        slotKey: 'goblet',
        level: 20,
        rarity: 5,
        mainStatKey: 'def_',
        location: '',
        lock: false,
        substats: [
          { key: 'enerRech_', value: 10.0 },
          { key: 'def', value: 60 },
          { key: 'atk', value: 30 },
          { key: 'eleMas', value: 20 },
        ],
      },
    ],
  }

  it('(1) resolveDefaultWeaponCompareCandidate defaults owned weapons to the user’s GOOD copy (marking equipped weapon as baseline) and unowned weapons to Lv.90/A6/R1', () => {
    const equippedFav = resolveDefaultWeaponCompareCandidate(
      'FavoniusSword',
      'Furina',
      deterministicGood
    )
    expect(equippedFav).toEqual({
      weaponKey: 'FavoniusSword',
      level: 80,
      ascension: 5,
      refinement: 4,
      isOwned: true,
      ownedWeaponId: 'w_fav_equipped',
      isEquippedBaseline: true,
    })

    const ownedInventory = resolveDefaultWeaponCompareCandidate(
      'FleuveCendreFerryman',
      'Furina',
      deterministicGood
    )
    expect(ownedInventory).toEqual({
      weaponKey: 'FleuveCendreFerryman',
      level: 90,
      ascension: 6,
      refinement: 5,
      isOwned: true,
      ownedWeaponId: 'w_fleuve_inv',
      isEquippedBaseline: false,
    })

    const unownedFiveStar = resolveDefaultWeaponCompareCandidate(
      'SplendorOfTranquilWaters',
      'Furina',
      deterministicGood
    )
    expect(unownedFiveStar).toEqual({
      weaponKey: 'SplendorOfTranquilWaters',
      level: 90,
      ascension: 6,
      refinement: 1,
      isOwned: false,
      isEquippedBaseline: false,
    })

    const unownedOneStar = resolveDefaultWeaponCompareCandidate(
      'DullBlade',
      'Furina',
      deterministicGood
    )
    expect(unownedOneStar).toEqual({
      weaponKey: 'DullBlade',
      level: 70,
      ascension: 4,
      refinement: 1,
      isOwned: false,
      isEquippedBaseline: false,
    })
  })

  it('(2) enforces shared stat constraints on every returned build and flips ranking when an ER >= 200% constraint forces a CRIT weapon to sacrifice damage artifacts while an ER weapon gets ER from its substat', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const session = createSession(deterministicGood)

    const candidates = [
      {
        weaponKey: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
        isOwned: false,
        isEquippedBaseline: false,
      },
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        ownedWeaponId: 'w_fav_equipped',
        isEquippedBaseline: true,
      },
    ]

    // A. Unconstrained comparison: SplendorOfTranquilWaters wins #1 easily
    const unconstrainedSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      constraints: [],
      topN: 3,
    }
    const unconstrainedRes = await session.compareWeapons(
      preset,
      unconstrainedSettings,
      candidates,
      { maxWorkers: 1 }
    )

    expect(unconstrainedRes.cancelled).toBe(false)
    expect(unconstrainedRes.rows).toHaveLength(2)
    expect(unconstrainedRes.rows[0]!.candidate.weaponKey).toBe(
      'SplendorOfTranquilWaters'
    )
    expect(unconstrainedRes.rows[0]!.rank).toBe(1)
    expect(unconstrainedRes.rows[0]!.percentBehindLeader).toBe(0)
    expect(unconstrainedRes.rows[1]!.candidate.weaponKey).toBe('FavoniusSword')
    expect(unconstrainedRes.rows[1]!.rank).toBe(2)
    expect(unconstrainedRes.rows[1]!.percentBehindLeader).toBeGreaterThan(10)

    // B. Constrained comparison (ER >= 200%):
    // - Every returned build satisfies ER >= 200% (stats.enerRech_ >= 2.0)
    // - FavoniusSword (+61.3% ER) keeps the strong 4p Golden Troupe HP/Hydro/CRIT build (~201.3% ER)
    // - SplendorOfTranquilWaters (0% ER) must equip the weak high-ER off-pieces (~205.8% ER)
    // -> FavoniusSword wins #1 and SplendorOfTranquilWaters loses (#2)!
    const erConstrainedSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      constraints: [{ stat: 'enerRech_', min: 200 }],
      topN: 3,
    }
    const constrainedRes = await session.compareWeapons(
      preset,
      erConstrainedSettings,
      candidates,
      { maxWorkers: 1 }
    )

    expect(constrainedRes.cancelled).toBe(false)
    expect(constrainedRes.rows).toHaveLength(2)
    for (const row of constrainedRes.rows) {
      expect(row.status).toBe('ok')
      expect(row.evaluation).not.toBeNull()
      const finalErPct = (row.evaluation!.stats.enerRech_ ?? 0) * 100
      expect(finalErPct).toBeGreaterThanOrEqual(200 - 1e-4)
    }

    // Ranking flipped: FavoniusSword is now #1, SplendorOfTranquilWaters is #2
    expect(constrainedRes.rows[0]!.candidate.weaponKey).toBe('FavoniusSword')
    expect(constrainedRes.rows[0]!.rank).toBe(1)
    expect(constrainedRes.rows[0]!.percentBehindLeader).toBe(0)
    expect(constrainedRes.rows[0]!.candidate.isEquippedBaseline).toBe(true)

    expect(constrainedRes.rows[1]!.candidate.weaponKey).toBe(
      'SplendorOfTranquilWaters'
    )
    expect(constrainedRes.rows[1]!.rank).toBe(2)
    expect(constrainedRes.rows[1]!.percentBehindLeader).toBeGreaterThan(20)
    expect(constrainedRes.rows[0]!.total!).toBeGreaterThan(
      constrainedRes.rows[1]!.total!
    )
  })

  it('(3) reports status="unmet" when a weapon has no build meeting constraints without failing the comparison, supports mid-run cancellation keeping completed weapons, and does not mutate preset or settings', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const presetSnapshot = structuredClone(preset)
    const session = createSession(deterministicGood)

    const candidates = [
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        isEquippedBaseline: true,
      },
      {
        weaponKey: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
        isOwned: false,
        isEquippedBaseline: false,
      },
    ]

    // With ER >= 240%, FavoniusSword (+61.3% ER + 105.8% artifact ER = 267.1% ER) has a valid build,
    // while SplendorOfTranquilWaters (max 205.8% ER) has no build meeting constraints.
    const highErSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      constraints: [{ stat: 'enerRech_', min: 240 }],
      topN: 3,
    }
    const settingsSnapshot = structuredClone(highErSettings)

    const res = await compareWeapons(
      session,
      preset,
      highErSettings,
      candidates,
      { maxWorkers: 1 }
    )

    expect(res.cancelled).toBe(false)
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]!.candidate.weaponKey).toBe('FavoniusSword')
    expect(res.rows[0]!.status).toBe('ok')
    expect(res.rows[0]!.rank).toBe(1)
    expect((res.rows[0]!.evaluation!.stats.enerRech_ ?? 0) * 100).toBeGreaterThanOrEqual(
      240 - 1e-4
    )

    expect(res.rows[1]!.candidate.weaponKey).toBe('SplendorOfTranquilWaters')
    expect(res.rows[1]!.status).toBe('unmet')
    expect(res.rows[1]!.rank).toBeNull()
    expect(res.rows[1]!.total).toBeNull()
    expect(res.rows[1]!.bestBuild).toBeNull()
    expect(res.rows[1]!.evaluation).toBeNull()

    // Preset and settings are completely untouched
    expect(preset).toEqual(presetSnapshot)
    expect(highErSettings).toEqual(settingsSnapshot)

    // Mid-run cancellation after first weapon finishes keeps the first weapon's result
    const abortController = new AbortController()
    const cancelRes = await compareWeapons(
      session,
      preset,
      DEFAULT_OPTIMIZER_SETTINGS,
      candidates,
      {
        maxWorkers: 1,
        signal: abortController.signal,
        onProgress: (p) => {
          if (p.weaponIndex === 1) {
            abortController.abort()
          }
        },
      }
    )

    expect(cancelRes.cancelled).toBe(true)
    expect(cancelRes.rows).toHaveLength(1)
    expect(cancelRes.rows[0]!.candidate.weaponKey).toBe('FavoniusSword')
    expect(cancelRes.rows[0]!.status).toBe('ok')
    expect(cancelRes.rows[0]!.rank).toBe(1)
  })

  it('(4) always fetches up to WEAPON_COMPARE_TOP_N (5) ranked builds per weapon in topBuilds regardless of settings.topN, and returns fewer when fewer are feasible (weapon-compare-followups)', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const session = createSession(deterministicGood)

    const candidates = [
      {
        weaponKey: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
        isOwned: false,
        isEquippedBaseline: false,
      },
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        ownedWeaponId: 'w_fav_equipped',
        isEquippedBaseline: true,
      },
    ]

    // Pass topN: 1 in settings — compareWeapons must still fetch up to 5 builds per weapon
    const singleTopNSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      constraints: [],
      topN: 1,
    }

    const res = await session.compareWeapons(
      preset,
      singleTopNSettings,
      candidates,
      { maxWorkers: 1 }
    )

    expect(WEAPON_COMPARE_TOP_N).toBe(5)
    expect(res.rows).toHaveLength(2)

    for (const row of res.rows) {
      expect(row.status).toBe('ok')
      expect(row.topBuilds).toBeDefined()
      // Inventory has 2 flowers * 2 plumes * 2 sands * 2 goblets * 1 circlet = 16 combinations -> 5 top builds returned
      expect(row.topBuilds).toHaveLength(5)
      expect(row.topBuilds![0]!.rank).toBe(1)
      expect(row.topBuilds![0]!.selection).toEqual(row.bestBuild)
      expect(row.topBuilds![0]!.evaluation.total).toBe(row.total)

      for (let i = 0; i < row.topBuilds!.length; i++) {
        const entry = row.topBuilds![i]!
        expect(entry.rank).toBe(i + 1)
        expect(entry.selection.total).toBe(entry.evaluation.total)
        expect(Object.keys(entry.selection.artifactIds)).toHaveLength(5)
        expect(entry.evaluation.stats.hp).toBeGreaterThan(0)
        if (i > 0) {
          expect(row.topBuilds![i - 1]!.evaluation.total).toBeGreaterThanOrEqual(
            entry.evaluation.total
          )
        }
      }
    }

    // Under ER >= 260%, FavoniusSword has only 2 feasible builds (er_flower_weak + er_plume_weak + er_sands_weak + either goblet + circlet = 267.1% ER)
    // and SplendorOfTranquilWaters has 0 feasible builds ('unmet')
    const strictErRes = await session.compareWeapons(
      preset,
      {
        ...DEFAULT_OPTIMIZER_SETTINGS,
        constraints: [{ stat: 'enerRech_', min: 260 }],
        topN: 1,
      },
      candidates,
      { maxWorkers: 1 }
    )

    const favRow = strictErRes.rows.find(
      (r) => r.candidate.weaponKey === 'FavoniusSword'
    )!
    expect(favRow.status).toBe('ok')
    expect(favRow.topBuilds).toHaveLength(2)
    expect(favRow.topBuilds![0]!.rank).toBe(1)
    expect(favRow.topBuilds![1]!.rank).toBe(2)
    expect(favRow.topBuilds![0]!.evaluation.total).toBeGreaterThanOrEqual(
      favRow.topBuilds![1]!.evaluation.total
    )

    const splendorRow = strictErRes.rows.find(
      (r) => r.candidate.weaponKey === 'SplendorOfTranquilWaters'
    )!
    expect(splendorRow.status).toBe('ok' === splendorRow.status ? 'ok' : 'unmet')
    expect(splendorRow.status).toBe('unmet')
    expect(splendorRow.topBuilds).toEqual([])
  })

  it('(5) applies each candidate’s own targetConditionals (weapon passive, target character/constellation, and artifact-set conditionals) independently while keeping Candidates 1 & 3 bit-identical when Candidate 2 is modified (weapon-compare-effects-setup)', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const session = createSession(deterministicGood)

    const baseCandidates = [
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        ownedWeaponId: 'w_fav_equipped',
        isEquippedBaseline: true,
        targetConditionals: {},
        seededTargetConditionals: {},
      },
      {
        weaponKey: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
        isOwned: false,
        isEquippedBaseline: false,
        targetConditionals: {},
        seededTargetConditionals: {},
      },
      {
        weaponKey: 'FleuveCendreFerryman',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        ownedWeaponId: 'w_fleuve_inv',
        isEquippedBaseline: false,
        targetConditionals: {},
        seededTargetConditionals: {},
      },
    ]

    const baselineRes = await session.compareWeapons(
      preset,
      DEFAULT_OPTIMIZER_SETTINGS,
      baseCandidates,
      { maxWorkers: 1 }
    )

    const getRow = (res: typeof baselineRes, key: string) =>
      res.rows.find((r) => r.candidate.weaponKey === key)!

    const baseCand1 = getRow(baselineRes, 'FavoniusSword')
    const baseCand2 = getRow(baselineRes, 'SplendorOfTranquilWaters')
    const baseCand3 = getRow(baselineRes, 'FleuveCendreFerryman')

    expect(baseCand1.status).toBe('ok')
    expect(baseCand2.status).toBe('ok')
    expect(baseCand3.status).toBe('ok')

    // Step A: Configure Candidate 2's weapon passive stacks only (SplendorOfTranquilWaters.selfHpChange = '1' instead of max '3')
    const cand2WeaponChanged = baseCandidates.map((c, idx) =>
      idx === 1
        ? {
            ...c,
            targetConditionals: {
              SplendorOfTranquilWaters: { selfHpChange: '1' },
            },
          }
        : c
    )
    const weaponOnlyRes = await session.compareWeapons(
      preset,
      DEFAULT_OPTIMIZER_SETTINGS,
      cand2WeaponChanged,
      { maxWorkers: 1 }
    )
    const wepCand1 = getRow(weaponOnlyRes, 'FavoniusSword')
    const wepCand2 = getRow(weaponOnlyRes, 'SplendorOfTranquilWaters')
    const wepCand3 = getRow(weaponOnlyRes, 'FleuveCendreFerryman')

    expect(wepCand1.total).toBe(baseCand1.total)
    expect(wepCand3.total).toBe(baseCand3.total)
    expect(wepCand2.total!).toBeLessThan(baseCand2.total!)

    // Step B: Configure Candidate 2's weapon passive stacks AND artifact-set conditional (GoldenTroupe.set4 = 'off')
    const cand2BothChanged = baseCandidates.map((c, idx) =>
      idx === 1
        ? {
            ...c,
            targetConditionals: {
              SplendorOfTranquilWaters: { selfHpChange: '1' },
              GoldenTroupe: { set4: 'off' },
            },
          }
        : c
    )
    const bothChangedRes = await session.compareWeapons(
      preset,
      DEFAULT_OPTIMIZER_SETTINGS,
      cand2BothChanged,
      { maxWorkers: 1 }
    )
    const bothCand1 = getRow(bothChangedRes, 'FavoniusSword')
    const bothCand2 = getRow(bothChangedRes, 'SplendorOfTranquilWaters')
    const bothCand3 = getRow(bothChangedRes, 'FleuveCendreFerryman')

    // Acceptance check: Candidates 1 and 3 return bit-identical totals; Candidate 2 reflects both changes
    expect(bothCand1.total).toBe(baseCand1.total)
    expect(bothCand1.topBuilds!.map((b) => b.evaluation.total)).toEqual(
      baseCand1.topBuilds!.map((b) => b.evaluation.total)
    )
    expect(bothCand3.total).toBe(baseCand3.total)
    expect(bothCand3.topBuilds!.map((b) => b.evaluation.total)).toEqual(
      baseCand3.topBuilds!.map((b) => b.evaluation.total)
    )
    expect(bothCand2.total!).toBeLessThan(wepCand2.total!)
    expect(bothCand2.total!).toBeLessThan(baseCand2.total!)
  })
})
