import { describe, expect, it } from 'vitest'
import {
  ALL_ARTIFACT_SET_KEYS,
  clearSets,
  createDefaultTcTeammate,
  DEFAULT_OPTIMIZER_SETTINGS,
  DEFAULT_TC_TEAMMATE_CONDITIONAL,
  FAST_MODE_STAT_KEYS,
  getBundledPreset,
  getPresetFastMode,
  getPresetResonanceEffects,
  getPresetResonanceEnabled,
  getPresetWeaponCompareCandidates,
  GO_RESONANCE_CATALOG,
  hasDisabledResonanceEffects,
  hasMemberFastMode,
  hasPresetFastMode,
  invertSets,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  isPresetResonanceEffectEnabled,
  listTriggeredResonances,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resetMemberConditionalOverrides,
  resetPresetMemberFastMode,
  resetPresetWeaponCompareCandidates,
  resetSolverPoolFilters,
  resolveArtSetExclusion,
  resolveCandidateMemberConditionals,
  resolveEffectiveFastMode,
  resolveEffectiveSetFilter,
  seedCandidateTargetConditionals,
  selectAllSets,
  setMemberConditionalOverride,
  setPresetMemberFastMode,
  setPresetMemberFastModeStat,
  setPresetResonanceEffectEnabled,
  setPresetResonanceEnabled,
  setPresetWeaponCompareCandidates,
  STAT_CONSTRAINT_KEYS,
  summarizeArtSetFilter,
  summarizeSolverPoolFilters,
  type OptimizerSettings,
  type WeaponCompareCandidateSpec,
} from '../src/index'

describe('Artifact Set Filter Translation & Helpers (artifact-set-filter)', () => {
  it('returns an empty ArtSetExclusion map in "all" mode even when setFilterSelection has entries', () => {
    const settings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      setFilterMode: 'all',
      setFilterSelection: {
        GoldenTroupe: [2, 4],
        MarechausseeHunter: [4],
      },
    }
    const exclusion = resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)
    expect(exclusion).toEqual({})

    const summary = summarizeArtSetFilter(settings, ALL_ARTIFACT_SET_KEYS)
    expect(summary.mode).toBe('all')
    expect(summary.allowedCount).toBe(ALL_ARTIFACT_SET_KEYS.length)
    expect(summary.totalSets).toBe(ALL_ARTIFACT_SET_KEYS.length)
    expect(summary.selectedCount).toBe(2)
    expect(summary.text).toBe(
      `All ${ALL_ARTIFACT_SET_KEYS.length} artifact sets allowed (2 selected — choose Exclude selected or Only these sets to apply)`
    )
  })

  it('passes selected sets through with normalized piece counts in "exclude" mode', () => {
    const settings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      setFilterMode: 'exclude',
      setFilterSelection: {
        GladiatorsFinale: [4, 2],
        WanderersTroupe: [4],
        ViridescentVenerer: [2],
      },
    }
    const exclusion = resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)
    expect(exclusion).toEqual({
      GladiatorsFinale: [2, 4],
      WanderersTroupe: [4],
      ViridescentVenerer: [2],
    })

    const summary = summarizeArtSetFilter(settings, ALL_ARTIFACT_SET_KEYS)
    expect(summary.mode).toBe('exclude')
    // Only GladiatorsFinale is fully excluded ([2, 4]); WanderersTroupe ([4]) and ViridescentVenerer ([2]) still allow 2pc or 4pc
    expect(summary.allowedCount).toBe(ALL_ARTIFACT_SET_KEYS.length - 1)
    expect(summary.selectedCount).toBe(3)
  })

  it('translates "include" mode with 3 sets allowed into excluding every other set in ALL_ARTIFACT_SET_KEYS', () => {
    const settings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      setFilterMode: 'include',
      setFilterSelection: {
        GoldenTroupe: [2, 4], // Both 2pc and 4pc allowed -> not in exclusion map
        MarechausseeHunter: [4], // Only 4pc allowed -> 2pc excluded ([2])
        HeartOfDepth: [2], // Only 2pc allowed -> 4pc excluded ([4])
      },
    }
    const exclusion = resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)

    // GoldenTroupe allows both [2, 4], so it has zero exclusion
    expect(exclusion.GoldenTroupe).toBeUndefined()
    // MarechausseeHunter allows [4] only, so [2] is excluded
    expect(exclusion.MarechausseeHunter).toEqual([2])
    // HeartOfDepth allows [2] only, so [4] is excluded
    expect(exclusion.HeartOfDepth).toEqual([4])

    // Every other set in ALL_ARTIFACT_SET_KEYS must be excluded at [2, 4]
    const otherSets = ALL_ARTIFACT_SET_KEYS.filter(
      (sk) =>
        sk !== 'GoldenTroupe' &&
        sk !== 'MarechausseeHunter' &&
        sk !== 'HeartOfDepth'
    )
    expect(otherSets.length).toBe(ALL_ARTIFACT_SET_KEYS.length - 3)
    for (const sk of otherSets) {
      expect(exclusion[sk]).toEqual([2, 4])
    }

    const summary = summarizeArtSetFilter(settings, ALL_ARTIFACT_SET_KEYS)
    expect(summary.mode).toBe('include')
    expect(summary.allowedCount).toBe(3)
    expect(summary.selectedCount).toBe(3)
  })

  it('excludes all sets when "include" mode has an empty selection', () => {
    const settings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      setFilterMode: 'include',
      setFilterSelection: {},
    }
    const exclusion = resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)
    expect(Object.keys(exclusion)).toHaveLength(ALL_ARTIFACT_SET_KEYS.length)
    for (const sk of ALL_ARTIFACT_SET_KEYS) {
      expect(exclusion[sk]).toEqual([2, 4])
    }

    const summary = summarizeArtSetFilter(settings, ALL_ARTIFACT_SET_KEYS)
    expect(summary.allowedCount).toBe(0)
  })

  it('migrates legacy setExclusion records when setFilterMode is omitted', () => {
    const legacySettings: OptimizerSettings = {
      includeEquippedOnOthers: false,
      excludedCharacters: [],
      mainStatAssumptionLevel: 0,
      levelLow: 0,
      levelHigh: 20,
      erFloor: 1.2,
      setExclusion: {
        EmblemOfSeveredFate: [4],
        NoblesseOblige: [2, 4],
      },
      topN: 5,
    }
    const resolved = resolveEffectiveSetFilter(legacySettings)
    expect(resolved.mode).toBe('exclude')
    expect(resolved.selection).toEqual({
      EmblemOfSeveredFate: [4],
      NoblesseOblige: [2, 4],
    })
    expect(resolveArtSetExclusion(legacySettings, ALL_ARTIFACT_SET_KEYS)).toEqual({
      EmblemOfSeveredFate: [4],
      NoblesseOblige: [2, 4],
    })
  })

  it('supports bulk actions selectAllSets, clearSets, and invertSets', () => {
    const subset = ['GoldenTroupe', 'MarechausseeHunter', 'EmblemOfSeveredFate']
    const allSelected = selectAllSets({}, subset)
    expect(allSelected).toEqual({
      GoldenTroupe: [2, 4],
      MarechausseeHunter: [2, 4],
      EmblemOfSeveredFate: [2, 4],
    })

    const invertedFromOne = invertSets(
      { GoldenTroupe: [4] },
      subset
    )
    expect(invertedFromOne).toEqual({
      MarechausseeHunter: [2, 4],
      EmblemOfSeveredFate: [2, 4],
    })

    expect(clearSets(allSelected, subset)).toEqual({})
  })
})

describe('Stat Constraints Settings & Normalization (stat-constraints)', () => {
  it('exposes all 16 final stat constraint keys', () => {
    expect(STAT_CONSTRAINT_KEYS).toEqual([
      'hp',
      'atk',
      'def',
      'eleMas',
      'enerRech_',
      'critRate_',
      'critDMG_',
      'heal_',
      'pyro_dmg_',
      'hydro_dmg_',
      'electro_dmg_',
      'cryo_dmg_',
      'anemo_dmg_',
      'geo_dmg_',
      'dendro_dmg_',
      'physical_dmg_',
    ])
    expect(DEFAULT_OPTIMIZER_SETTINGS.constraints).toEqual([])
  })

  it('normalizes display percentage values and preserves flat stats', () => {
    expect(isPercentStatConstraintKey('hp')).toBe(false)
    expect(isPercentStatConstraintKey('eleMas')).toBe(false)
    expect(isPercentStatConstraintKey('enerRech_')).toBe(true)
    expect(isPercentStatConstraintKey('critRate_')).toBe(true)
    expect(isPercentStatConstraintKey('pyro_dmg_')).toBe(true)

    expect(normalizeStatConstraintValue('hp', 30000)).toBe(30000)
    expect(normalizeStatConstraintValue('atk', 2000)).toBe(2000)
    expect(normalizeStatConstraintValue('eleMas', 200)).toBe(200)
    expect(normalizeStatConstraintValue('enerRech_', 160)).toBeCloseTo(1.6)
    expect(normalizeStatConstraintValue('enerRech_', 1.6)).toBeCloseTo(1.6)
    expect(normalizeStatConstraintValue('critRate_', 60)).toBeCloseTo(0.6)
    expect(normalizeStatConstraintValue('critRate_', 0.6)).toBeCloseTo(0.6)
    expect(normalizeStatConstraintValue('critDMG_', 180)).toBeCloseTo(1.8)
    expect(normalizeStatConstraintValue('hydro_dmg_', 46.6)).toBeCloseTo(0.466)
    expect(normalizeStatConstraintValue('hp', undefined)).toBeUndefined()
  })

  it('validates active stat constraints require at least one finite bound', () => {
    expect(isActiveStatConstraint(undefined)).toBe(false)
    expect(isActiveStatConstraint({ stat: 'hp' })).toBe(false)
    expect(isActiveStatConstraint({ stat: 'hp', min: 30000 })).toBe(true)
    expect(isActiveStatConstraint({ stat: 'critRate_', max: 75 })).toBe(true)
    expect(
      isActiveStatConstraint({ stat: 'atk', min: 1500, max: 2500 })
    ).toBe(true)
  })

  it('migrates legacy erFloor into a constraints entry { stat: "enerRech_", min: <that floor> } and never duplicates when enerRech_ constraint already exists (optimize-experience-ui)', () => {
    // Decimal legacy erFloor (1.6 -> { stat: 'enerRech_', min: 1.6 })
    const migratedDecimal = migrateOptimizerSettings({
      ...DEFAULT_OPTIMIZER_SETTINGS,
      erFloor: 1.6,
    })
    expect(migratedDecimal.erFloor).toBeUndefined()
    expect(migratedDecimal.constraints).toEqual([
      { stat: 'enerRech_', min: 1.6 },
    ])
    expect(
      normalizeStatConstraintValue(
        'enerRech_',
        migratedDecimal.constraints?.[0]?.min
      )
    ).toBeCloseTo(1.6)

    // Display-unit legacy erFloor (160 -> { stat: 'enerRech_', min: 160 })
    const migratedDisplay = migrateOptimizerSettings({
      ...DEFAULT_OPTIMIZER_SETTINGS,
      erFloor: 160,
    })
    expect(migratedDisplay.erFloor).toBeUndefined()
    expect(migratedDisplay.constraints).toEqual([
      { stat: 'enerRech_', min: 160 },
    ])
    expect(
      normalizeStatConstraintValue(
        'enerRech_',
        migratedDisplay.constraints?.[0]?.min
      )
    ).toBeCloseTo(1.6)

    // Does NOT duplicate if an enerRech_ constraint already exists
    const alreadyConstrained = migrateOptimizerSettings({
      ...DEFAULT_OPTIMIZER_SETTINGS,
      erFloor: 1.6,
      constraints: [
        { stat: 'enerRech_', min: 180 },
        { stat: 'critRate_', min: 70 },
      ],
    })
    expect(alreadyConstrained.erFloor).toBeUndefined()
    expect(alreadyConstrained.constraints).toEqual([
      { stat: 'enerRech_', min: 180 },
      { stat: 'critRate_', min: 70 },
    ])
  })
})

describe('Default TC Teammate Template (buff-coverage-fixes)', () => {
  it('populates NoblesseOblige set4=on in member.conditional for default TC teammates', () => {
    const member = createDefaultTcTeammate('Bennett')
    expect(member.key).toBe('Bennett')
    expect(member.build.type).toBe('tc')
    if (member.build.type === 'tc') {
      expect(member.build.tc.artifact.sets).toEqual({ NoblesseOblige: 4 })
    }
    expect(member.conditional).toEqual(DEFAULT_TC_TEAMMATE_CONDITIONAL)
    expect(member.conditional).toEqual({
      NoblesseOblige: { set4: 'on' },
    })
  })
})

describe('Deep Artifact Pool Filters Settings (solver-filters-deep)', () => {
  it('defaults all deep pool filters to unrestricted and summarizes active count accurately', () => {
    const defSummary = summarizeSolverPoolFilters(DEFAULT_OPTIMIZER_SETTINGS)
    expect(defSummary).toEqual({
      activeCount: 0,
      isUnrestricted: true,
      text: 'All pieces allowed',
    })

    const filtered = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      mainStatKeys: {
        sands: ['enerRech_'],
        circlet: ['critRate_', 'critDMG_'],
      },
      requiredSubstats: ['critRate_', 'critDMG_'],
      requiredSubstatsMode: 'any' as const,
      levelLow: 16,
      minRarity: 5 as const,
      minRv: 450,
    }
    const filteredSummary = summarizeSolverPoolFilters(filtered)
    expect(filteredSummary.isUnrestricted).toBe(false)
    // sands + circlet (2) + requiredSubstats (1) + levelLow (1) + minRarity (1) + minRv (1) = 6
    expect(filteredSummary.activeCount).toBe(6)
    expect(filteredSummary.text).toBe('6 pool filters active')

    const reset = resetSolverPoolFilters(filtered)
    expect(summarizeSolverPoolFilters(reset).isUnrestricted).toBe(true)
    expect(reset.mainStatKeys).toEqual({})
    expect(reset.requiredSubstats).toEqual([])
    expect(reset.requiredSubstatsMode).toBe('all')
    expect(reset.levelLow).toBe(0)
    expect(reset.levelHigh).toBe(20)
    expect(reset.minRarity).toBe(1)
    expect(reset.minRv).toBe(0)
  })
})

describe('Master Elemental Resonance Toggle Settings (resonance-master-toggle)', () => {
  it('defaults to ON (true), persists per preset, falls back from member sub-preset IDs, and resets on full preset conditional reset', () => {
    const presetA = 'official/skirk-freeze'
    const presetB = 'official/mavuika-melt'

    expect(getPresetResonanceEnabled(undefined, presetA)).toBe(true)
    expect(getPresetResonanceEnabled(DEFAULT_OPTIMIZER_SETTINGS, presetA)).toBe(
      true
    )

    // Toggle presetA OFF -> presetA is false, sub-preset ID for presetA is false, presetB stays true
    const offA = setPresetResonanceEnabled(
      DEFAULT_OPTIMIZER_SETTINGS,
      presetA,
      false
    )
    expect(getPresetResonanceEnabled(offA, presetA)).toBe(false)
    expect(
      getPresetResonanceEnabled(offA, `${presetA}__member_Escoffier`)
    ).toBe(false)
    expect(getPresetResonanceEnabled(offA, presetB)).toBe(true)

    // Per-member conditional reset does not alter team-level resonance
    const withCondAndResOff = setMemberConditionalOverride(
      offA,
      presetA,
      'Skirk',
      'Skirk',
      'burstVoidAbsorb',
      'off'
    )
    const afterMemberReset = resetMemberConditionalOverrides(
      withCondAndResOff,
      presetA,
      'Skirk'
    )
    expect(getPresetResonanceEnabled(afterMemberReset, presetA)).toBe(false)

    // Full preset conditional reset restores resonance to ON (true)
    const afterFullReset = resetMemberConditionalOverrides(
      afterMemberReset,
      presetA
    )
    expect(getPresetResonanceEnabled(afterFullReset, presetA)).toBe(true)

    // Toggle back ON explicitly
    const onAgain = setPresetResonanceEnabled(offA, presetA, true)
    expect(getPresetResonanceEnabled(onAgain, presetA)).toBe(true)
  })
})

describe('Fast Mode Per-Preset Settings & Resolution (fast-mode)', () => {
  it('supports all 10 artifact stat keys, positive/negative values, per-member reset, and never applies to target', () => {
    expect(FAST_MODE_STAT_KEYS).toEqual([
      'hp',
      'hp_',
      'atk',
      'atk_',
      'def',
      'def_',
      'eleMas',
      'enerRech_',
      'critRate_',
      'critDMG_',
    ])

    const presetId = 'official/neuvillette-hypercarry'
    const mockPreset = {
      id: presetId,
      target: 'Neuvillette',
      team: [
        {
          key: 'Neuvillette',
          build: { type: 'owned' as const },
          requirement: {},
          conditional: {},
          bonusStats: {},
          hitMode: 'avgHit' as const,
          // Even if someone forces fastMode onto target object in memory, resolveEffectiveFastMode ignores slot 0 / target
          fastMode: { hp_: 50 },
        },
        {
          key: 'Furina',
          build: { type: 'owned' as const },
          requirement: {},
          conditional: {},
          bonusStats: {},
          hitMode: 'avgHit' as const,
        },
        {
          key: 'KaedeharaKazuha',
          build: { type: 'owned' as const },
          requirement: {},
          conditional: {},
          bonusStats: {},
          hitMode: 'avgHit' as const,
          fastMode: { eleMas: 40 },
        },
      ],
    }

    // Without settings overrides, resolves Kazuha's preset fastMode and ignores Neuvillette (target)
    expect(
      resolveEffectiveFastMode(mockPreset, DEFAULT_OPTIMIZER_SETTINGS)
    ).toEqual({
      KaedeharaKazuha: { eleMas: 40 },
    })
    expect(hasPresetFastMode(mockPreset, DEFAULT_OPTIMIZER_SETTINGS)).toBe(true)

    // Layer settings overrides for Furina (+20% HP, -10% ER) and target Neuvillette (ignored)
    let next = setPresetMemberFastModeStat(
      DEFAULT_OPTIMIZER_SETTINGS,
      presetId,
      'Furina',
      'hp_',
      20
    )
    next = setPresetMemberFastModeStat(
      next,
      presetId,
      'Furina',
      'enerRech_',
      -10
    )
    next = setPresetMemberFastModeStat(
      next,
      presetId,
      'Neuvillette',
      'critDMG_',
      80
    )

    expect(getPresetFastMode(next, presetId).Furina).toEqual({
      hp_: 20,
      enerRech_: -10,
    })
    expect(hasMemberFastMode(getPresetFastMode(next, presetId).Furina)).toBe(
      true
    )

    // Resolved effective Fast Mode includes Furina and Kazuha, never target Neuvillette
    expect(resolveEffectiveFastMode(mockPreset, next)).toEqual({
      Furina: { hp_: 20, enerRech_: -10 },
      KaedeharaKazuha: { eleMas: 40 },
    })

    // Setting a stat to 0 removes that stat key
    next = setPresetMemberFastModeStat(next, presetId, 'Furina', 'hp_', 0)
    expect(getPresetFastMode(next, presetId).Furina).toEqual({
      enerRech_: -10,
    })

    // Per-member reset clears Furina
    next = resetPresetMemberFastMode(next, presetId, 'Furina')
    expect(getPresetFastMode(next, presetId).Furina).toBeUndefined()

    // Full preset reset clears all settings entries for presetId
    next = setPresetMemberFastMode(next, presetId, 'KaedeharaKazuha', {
      eleMas: 80,
    })
    expect(getPresetFastMode(next, presetId).KaedeharaKazuha).toEqual({
      eleMas: 80,
    })
    next = resetPresetMemberFastMode(next, presetId)
    expect(getPresetFastMode(next, presetId)).toEqual({})
  })
})

describe('Weapon Compare Candidate Effect Setup & Persistence (weapon-compare-effects-setup)', () => {
  it('seeds candidate targetConditionals from panel overrides while stripping other weapons and keeping independent copies', () => {
    const targetOverrides = {
      Furina: { burstFanfare: '300' },
      GoldenTroupe: { set4: 'off' },
      SplendorOfTranquilWaters: { selfHpChange: '1' },
      KeyOfKhajNisut: { afterSkill: '2' },
    }

    const seededSplendor = seedCandidateTargetConditionals(
      targetOverrides,
      'SplendorOfTranquilWaters'
    )
    expect(seededSplendor).toEqual({
      Furina: { burstFanfare: '300' },
      GoldenTroupe: { set4: 'off' },
      SplendorOfTranquilWaters: { selfHpChange: '1' },
    })

    const seededFavonius = seedCandidateTargetConditionals(
      targetOverrides,
      'FavoniusSword'
    )
    expect(seededFavonius).toEqual({
      Furina: { burstFanfare: '300' },
      GoldenTroupe: { set4: 'off' },
    })

    // Mutating seededSplendor does not mutate targetOverrides or seededFavonius
    seededSplendor.GoldenTroupe!.set4 = 'on'
    expect(targetOverrides.GoldenTroupe.set4).toBe('off')
    expect(seededFavonius.GoldenTroupe?.set4).toBe('off')
  })

  it('resolves candidate memberConditionals by replacing target entry while keeping non-target teammate conditionals', () => {
    const sharedMemberConditionals = {
      Furina: {
        GoldenTroupe: { set4: 'on' },
      },
      KaedeharaKazuha: {
        ViridescentVenerer: { swirlHydro: 'hydro' },
      },
    }

    // When targetConditionals is undefined, falls back to sharedMemberConditionals
    expect(
      resolveCandidateMemberConditionals(
        'Furina',
        { targetConditionals: undefined },
        sharedMemberConditionals
      )
    ).toBe(sharedMemberConditionals)

    // When targetConditionals is defined, replaces Furina entry while preserving Kazuha
    const resolved = resolveCandidateMemberConditionals(
      'Furina',
      {
        targetConditionals: {
          SplendorOfTranquilWaters: { selfHpChange: '1' },
          GoldenTroupe: { set4: 'off' },
        },
      },
      sharedMemberConditionals
    )
    expect(resolved).toEqual({
      Furina: {
        SplendorOfTranquilWaters: { selfHpChange: '1' },
        GoldenTroupe: { set4: 'off' },
      },
      KaedeharaKazuha: {
        ViridescentVenerer: { swirlHydro: 'hydro' },
      },
    })
  })

  it('persists and resets per-preset weapon compare candidates with independent targetConditionals', () => {
    const presetId = 'official/furina-sub-dps'
    expect(
      getPresetWeaponCompareCandidates(DEFAULT_OPTIMIZER_SETTINGS, presetId)
    ).toBeUndefined()

    const candidates: WeaponCompareCandidateSpec[] = [
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        isEquippedBaseline: true,
        targetConditionals: { GoldenTroupe: { set4: 'on' } },
        seededTargetConditionals: { GoldenTroupe: { set4: 'on' } },
      },
      {
        weaponKey: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
        isOwned: false,
        targetConditionals: {
          SplendorOfTranquilWaters: { selfHpChange: '1' },
          GoldenTroupe: { set4: 'off' },
        },
        seededTargetConditionals: { GoldenTroupe: { set4: 'on' } },
      },
    ]

    const saved = setPresetWeaponCompareCandidates(
      DEFAULT_OPTIMIZER_SETTINGS,
      presetId,
      candidates
    )
    const loaded = getPresetWeaponCompareCandidates(saved, presetId)
    expect(loaded).toEqual(candidates)

    // Deep clone verification
    loaded![1]!.targetConditionals!.GoldenTroupe!.set4 = 'on'
    expect(
      getPresetWeaponCompareCandidates(saved, presetId)?.[1]?.targetConditionals
        ?.GoldenTroupe?.set4
    ).toBe('off')

    const reset = resetPresetWeaponCompareCandidates(saved, presetId)
    expect(
      getPresetWeaponCompareCandidates(reset, presetId)
    ).toBeUndefined()
  })
})

describe('Per-Effect Elemental Resonance Derivation & Settings (resonance-effects)', () => {
  it('derives ShatteringIce from official/skirk-freeze with vendored GO name and Frozen condition description', () => {
    const preset = getBundledPreset('official/skirk-freeze')!
    const triggered = listTriggeredResonances(preset)
    expect(triggered.map((r) => r.key)).toContain('ShatteringIce')
    const shatteringIce = triggered.find((r) => r.key === 'ShatteringIce')!
    expect(shatteringIce.name).toBe('Shattering Ice')
    expect(shatteringIce.plainSummary).toContain('+15% CRIT Rate')
    expect(shatteringIce.plainSummary).toContain('Frozen')
    expect(shatteringIce.desc).toContain('Frozen')
    expect(shatteringIce.desc).toContain(
      'Increases CRIT Rate against opponents that are Frozen or affected by Cryo by 15%'
    )
  })

  it('derives dual resonances when a team has two element pairs and ProtectiveCanopy when all 4 elements are distinct', () => {
    const dualPyroHydro = listTriggeredResonances([
      { key: 'Mavuika' },
      { key: 'Bennett' },
      { key: 'Furina' },
      { key: 'Yelan' },
    ])
    expect(dualPyroHydro.map((r) => r.key)).toEqual([
      'FerventFlames',
      'SoothingWater',
    ])
    expect(dualPyroHydro[0]!.name).toBe(GO_RESONANCE_CATALOG.FerventFlames.name)
    expect(dualPyroHydro[1]!.name).toBe(GO_RESONANCE_CATALOG.SoothingWater.name)

    const canopyTeam = listTriggeredResonances([
      { key: 'Mavuika' },
      { key: 'Citlali' },
      { key: 'Xilonen' },
      { key: 'Furina' },
    ])
    expect(canopyTeam.map((r) => r.key)).toEqual(['ProtectiveCanopy'])
    expect(canopyTeam[0]!.name).toBe('Protective Canopy')

    const smallNonCanopyTeam = listTriggeredResonances([
      { key: 'Mavuika' },
      { key: 'Citlali' },
      { key: 'Xilonen' },
    ])
    expect(smallNonCanopyTeam).toEqual([])
  })

  it('persists, migrates, and resets per-effect resonance overrides per preset without modifying bundled presets', () => {
    const preset = getBundledPreset('official/skirk-freeze')!
    const presetId = preset.id

    expect(getPresetResonanceEffects(DEFAULT_OPTIMIZER_SETTINGS, presetId)).toEqual({})
    expect(
      isPresetResonanceEffectEnabled(
        DEFAULT_OPTIMIZER_SETTINGS,
        presetId,
        'ShatteringIce'
      )
    ).toBe(true)
    expect(hasDisabledResonanceEffects(undefined, preset)).toBe(false)

    // Turn off ShatteringIce only
    const withIceOff = setPresetResonanceEffectEnabled(
      DEFAULT_OPTIMIZER_SETTINGS,
      presetId,
      'ShatteringIce',
      false
    )
    expect(getPresetResonanceEffects(withIceOff, presetId)).toEqual({
      ShatteringIce: false,
    })
    expect(
      isPresetResonanceEffectEnabled(withIceOff, presetId, 'ShatteringIce')
    ).toBe(false)
    // SoothingWater remains enabled
    expect(
      isPresetResonanceEffectEnabled(withIceOff, presetId, 'SoothingWater')
    ).toBe(true)
    expect(hasDisabledResonanceEffects(getPresetResonanceEffects(withIceOff, presetId), preset)).toBe(true)

    // Sub-preset ID (__member_) inherits parent preset per-effect overrides
    expect(
      getPresetResonanceEffects(withIceOff, `${presetId}__member_Furina`)
    ).toEqual({
      ShatteringIce: false,
    })

    // Non-triggered resonance disabled in map does not count as disabled for a preset that doesn't trigger it
    const withPyroOff = setPresetResonanceEffectEnabled(
      DEFAULT_OPTIMIZER_SETTINGS,
      presetId,
      'FerventFlames',
      false
    )
    expect(
      hasDisabledResonanceEffects(
        getPresetResonanceEffects(withPyroOff, presetId),
        preset
      )
    ).toBe(false)

    // Turning Master ON acts as an all-on control, clearing per-effect false entries for that preset
    const masterTurnedOn = setPresetResonanceEnabled(withIceOff, presetId, true)
    expect(getPresetResonanceEffects(masterTurnedOn, presetId)).toEqual({})
    expect(
      isPresetResonanceEffectEnabled(masterTurnedOn, presetId, 'ShatteringIce')
    ).toBe(true)

    // resetMemberConditionalOverrides clears both master and per-effect resonance overrides
    const withBothOverrides = setPresetResonanceEffectEnabled(
      setPresetResonanceEnabled(DEFAULT_OPTIMIZER_SETTINGS, presetId, false),
      presetId,
      'ShatteringIce',
      false
    )
    const afterReset = resetMemberConditionalOverrides(
      withBothOverrides,
      presetId
    )
    expect(getPresetResonanceEnabled(afterReset, presetId)).toBe(true)
    expect(getPresetResonanceEffects(afterReset, presetId)).toEqual({})

    // Migration preserves valid boolean entries
    const migrated = migrateOptimizerSettings({
      resonanceEffectsByPreset: {
        [presetId]: {
          ShatteringIce: false,
          SoothingWater: true,
        },
      },
    })
    expect(getPresetResonanceEffects(migrated, presetId)).toEqual({
      ShatteringIce: false,
      SoothingWater: true,
    })
  })
})

