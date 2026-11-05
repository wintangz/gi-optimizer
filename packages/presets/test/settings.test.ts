import { describe, expect, it } from 'vitest'
import {
  ALL_ARTIFACT_SET_KEYS,
  clearSets,
  DEFAULT_OPTIMIZER_SETTINGS,
  invertSets,
  resolveArtSetExclusion,
  resolveEffectiveSetFilter,
  selectAllSets,
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
