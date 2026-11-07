import { describe, expect, it } from 'vitest'
import {
  ALL_ARTIFACT_SET_KEYS,
  clearSets,
  createDefaultTcTeammate,
  DEFAULT_OPTIMIZER_SETTINGS,
  DEFAULT_TC_TEAMMATE_CONDITIONAL,
  invertSets,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resolveArtSetExclusion,
  resolveEffectiveSetFilter,
  selectAllSets,
  STAT_CONSTRAINT_KEYS,
  summarizeArtSetFilter,
  type OptimizerSettings,
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
        migratedDecimal.constraints[0]?.min
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
        migratedDisplay.constraints[0]?.min
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
