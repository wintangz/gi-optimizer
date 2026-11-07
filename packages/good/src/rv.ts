/**
 * Shared Artifact Roll Value (RV) implementation aligned with Genshin Optimizer
 * (`vendor/genshin-optimizer/libs/gi/util/src/artifact/artifact.ts` and `artifactMeta.ts`).
 *
 * Roll tables are extracted verbatim from
 * `vendor/genshin-optimizer/libs/gi/stats/Data/Artifacts/artifact_sub.json`
 * (converted to GOOD display units: percentage substats multiplied by 100) and
 * `artSubstatRollData` from `@genshin-optimizer/gi/consts`.
 */
import { ALL_SUBSTAT_KEYS } from './statMeta.gen'
import type { ISubstat } from './types'

export type ArtifactRarity = 1 | 2 | 3 | 4 | 5
export type SubstatKey = (typeof ALL_SUBSTAT_KEYS)[number]

export const ART_SUBSTAT_ROLL_DATA: Readonly<
  Record<ArtifactRarity, { low: number; high: number; numUpgrades: number }>
> = {
  1: { low: 0, high: 0, numUpgrades: 1 },
  2: { low: 0, high: 1, numUpgrades: 2 },
  3: { low: 1, high: 2, numUpgrades: 3 },
  4: { low: 2, high: 3, numUpgrades: 4 },
  5: { low: 3, high: 4, numUpgrades: 5 },
}

/**
 * Substat roll tiers in GOOD display units (percentage substats in %, flat substats in flat units),
 * matching `getSubstatValuesPercent` in `@genshin-optimizer/gi/util`.
 */
export const ART_SUBSTAT_ROLL_TABLE: Readonly<
  Record<ArtifactRarity, Readonly<Record<SubstatKey, readonly number[]>>>
> = {
  1: {
    hp: [23.9, 29.88],
    hp_: [1.17, 1.46],
    atk: [1.56, 1.95],
    atk_: [1.17, 1.46],
    def: [1.85, 2.31],
    def_: [1.46, 1.82],
    critRate_: [0.78, 0.97],
    critDMG_: [1.55, 1.94],
    eleMas: [4.66, 5.83],
    enerRech_: [1.3, 1.62],
  },
  2: {
    hp: [50.19, 60.95, 71.7],
    hp_: [1.63, 1.98, 2.33],
    atk: [3.27, 3.97, 4.67],
    atk_: [1.63, 1.98, 2.33],
    def: [3.89, 4.72, 5.56],
    def_: [2.04, 2.48, 2.91],
    critRate_: [1.09, 1.32, 1.55],
    critDMG_: [2.18, 2.64, 3.11],
    eleMas: [6.53, 7.93, 9.33],
    enerRech_: [1.81, 2.2, 2.59],
  },
  3: {
    hp: [100.38, 114.72, 129.06, 143.4],
    hp_: [2.45, 2.8, 3.15, 3.5],
    atk: [6.54, 7.47, 8.4, 9.34],
    atk_: [2.45, 2.8, 3.15, 3.5],
    def: [7.78, 8.89, 10, 11.11],
    def_: [3.06, 3.5, 3.93, 4.37],
    critRate_: [1.63, 1.86, 2.1, 2.33],
    critDMG_: [3.26, 3.73, 4.2, 4.66],
    eleMas: [9.79, 11.19, 12.59, 13.99],
    enerRech_: [2.72, 3.11, 3.5, 3.89],
  },
  4: {
    hp: [167.3, 191.2, 215.1, 239],
    hp_: [3.26, 3.73, 4.2, 4.66],
    atk: [10.89, 12.45, 14, 15.56],
    atk_: [3.26, 3.73, 4.2, 4.66],
    def: [12.96, 14.82, 16.67, 18.52],
    def_: [4.08, 4.66, 5.25, 5.83],
    critRate_: [2.18, 2.49, 2.8, 3.11],
    critDMG_: [4.35, 4.97, 5.6, 6.22],
    eleMas: [13.06, 14.92, 16.79, 18.65],
    enerRech_: [3.63, 4.14, 4.66, 5.18],
  },
  5: {
    hp: [209.13, 239, 268.88, 298.75],
    hp_: [4.08, 4.66, 5.25, 5.83],
    atk: [13.62, 15.56, 17.51, 19.45],
    atk_: [4.08, 4.66, 5.25, 5.83],
    def: [16.2, 18.52, 20.83, 23.15],
    def_: [5.1, 5.83, 6.56, 7.29],
    critRate_: [2.72, 3.11, 3.5, 3.89],
    critDMG_: [5.44, 6.22, 6.99, 7.77],
    eleMas: [16.32, 18.65, 20.98, 23.31],
    enerRech_: [4.53, 5.18, 5.83, 6.48],
  },
}

const VALID_SUBSTAT_SET = new Set<string>(ALL_SUBSTAT_KEYS)

export function isSubstatKey(key: string): key is SubstatKey {
  return VALID_SUBSTAT_SET.has(key)
}

export function clampArtifactRarity(rarity: number | undefined): ArtifactRarity {
  const r = Math.round(rarity || 5)
  if (r <= 1) return 1
  if (r === 2) return 2
  if (r === 3) return 3
  if (r === 4) return 4
  return 5
}

/**
 * Formats a substat value in GOOD display units to the lookup string GO uses
 * (`artDisplayValue`: 1 decimal place for `%` stats, integer for flat stats).
 */
export function formatSubstatLookupValue(
  substatKey: string,
  value: number
): string {
  if (substatKey.endsWith('_')) {
    return (Math.round(value * 10) / 10).toFixed(1)
  }
  return Math.round(value).toFixed(0)
}

/**
 * Returns the maximum single-roll value for `substatKey` in GOOD display units
 * (`getSubstatValue(substatKey, rarity, 'max', true)` in GO).
 * Defaults to `rarity = 5`, which GO uses as the reference denominator for RV.
 */
export function getSubstatMaxRoll(
  substatKey: SubstatKey,
  rarity: ArtifactRarity = 5
): number {
  const tiers = ART_SUBSTAT_ROLL_TABLE[rarity][substatKey]
  return tiers[tiers.length - 1]!
}

const rollCombinationCache = new Map<string, Map<string, number[][]>>()

function getRollLookupTable(
  rarity: ArtifactRarity,
  substatKey: SubstatKey
): Map<string, number[][]> {
  const cacheKey = `${rarity}:${substatKey}`
  const existing = rollCombinationCache.get(cacheKey)
  if (existing) return existing

  const tiers = ART_SUBSTAT_ROLL_TABLE[rarity][substatKey]
  const maxRolls = 1 + ART_SUBSTAT_ROLL_DATA[rarity].numUpgrades
  const map = new Map<string, number[][]>()

  const current: number[] = []
  function dfs(startIdx: number, sum: number) {
    if (current.length > 0) {
      const displayStr = formatSubstatLookupValue(substatKey, sum)
      let bucket = map.get(displayStr)
      if (!bucket) {
        bucket = []
        map.set(displayStr, bucket)
      }
      bucket.push([...current])
    }
    if (current.length >= maxRolls) return
    for (let i = startIdx; i < tiers.length; i++) {
      const tierVal = tiers[i]!
      current.push(tierVal)
      dfs(i, sum + tierVal)
      current.pop()
    }
  }

  dfs(0, 0)
  rollCombinationCache.set(cacheKey, map)
  return map
}

/**
 * Returns all valid roll tier decompositions for `(substatKey, value, rarity)`
 * whose sum rounds to `formatSubstatLookupValue(substatKey, value)`, matching
 * `getSubstatRolls` in `@genshin-optimizer/gi/util`.
 */
export function getSubstatRolls(
  substatKey: SubstatKey,
  substatValue: number,
  rarity: ArtifactRarity = 5
): number[][] {
  if (!Number.isFinite(substatValue) || substatValue <= 0) return []
  const lookupKey = formatSubstatLookupValue(substatKey, substatValue)
  const table = getRollLookupTable(rarity, substatKey)
  return table.get(lookupKey) ?? []
}

export interface SubstatRollBreakdown {
  key: SubstatKey
  /** Display value stored on the artifact in GOOD (e.g. 10.5 for 10.5% CR, 299 for 299 HP). */
  value: number
  /** Accurate unrounded sum of matched roll tiers (or `value` if no exact tier tuple matches). */
  accurateValue: number
  /** Individual roll tier values in GOOD display units (e.g. [3.5, 3.5, 3.5]). */
  rolls: number[]
  /** Number of rolls into this substat. */
  rollCount: number
  /** 5★ max single-roll value for this substat in GOOD display units (GO reference denominator). */
  maxRoll: number
  /** Rarity-specific max single-roll value in GOOD display units. */
  rarityMaxRoll: number
  /** Efficiency ratio relative to 5★ max roll (1.0 = one 5★ max roll = 100% RV). */
  efficiency: number
  /** Roll Value percentage for this substat (efficiency * 100, e.g. 269.9 for 3×3.5 CR). */
  rv: number
}

export interface ArtifactRollValueResult {
  /** Sum of efficiency across substats (unit scale where 1.0 = 100% RV, max 9.0 on 5★). */
  totalEfficiency: number
  /** Total Roll Value percentage summed across the piece's substats (e.g. 540.0 for 540% RV). */
  totalRv: number
  /** Rounded integer RV percentage for compact badge display (e.g. 540). */
  totalRvRounded: number
  /** Total number of substat rolls across the piece. */
  totalRolls: number
  /** Per-substat roll breakdown in the same order as the piece's valid substats. */
  substats: SubstatRollBreakdown[]
}

export interface ComputeArtifactRollValueInput {
  rarity?: number
  level?: number
  substats: ReadonlyArray<{ key: string; value: number }>
  /** Optional filter of substat keys to include in total RV (defaults to all 10 substats). */
  substatFilter?: ReadonlySet<SubstatKey>
}

/**
 * Computes Genshin Optimizer Roll Value (RV) and per-substat roll breakdowns for an artifact piece.
 * Matches `getArtifactMeta` + `getArtifactEfficiency` in `@genshin-optimizer/gi/util`.
 */
export function computeArtifactRollValue(
  artifact: ComputeArtifactRollValueInput
): ArtifactRollValueResult {
  const rarity = clampArtifactRarity(artifact.rarity)
  const level = Math.max(0, Math.min(20, Math.round(artifact.level ?? 20)))

  const validSubstats: Array<{ key: SubstatKey; value: number }> = []
  for (const s of artifact.substats ?? []) {
    if (s && isSubstatKey(s.key) && Number.isFinite(s.value) && s.value > 0) {
      validSubstats.push({ key: s.key, value: s.value })
    }
  }

  const allPossibleRolls: Array<{ index: number; substatRolls: number[][] }> = []
  let totalUnambiguousRolls = 0

  const substats: SubstatRollBreakdown[] = validSubstats.map((sub, index) => {
    const { key, value } = sub
    const maxRoll = getSubstatMaxRoll(key, 5)
    const rarityMaxRoll = getSubstatMaxRoll(key, rarity)
    const possibleRolls = getSubstatRolls(key, value, rarity)

    if (possibleRolls.length > 0) {
      const possibleLengths = new Set(possibleRolls.map((r) => r.length))
      if (possibleLengths.size !== 1) {
        allPossibleRolls.push({ index, substatRolls: possibleRolls })
      } else {
        totalUnambiguousRolls += possibleRolls[0]!.length
      }

      const rolls = possibleRolls.reduce((best, curr) =>
        best.length < curr.length ? best : curr
      )
      const accurateValue = rolls.reduce((a, b) => a + b, 0)
      const efficiency = accurateValue / maxRoll
      return {
        key,
        value,
        accurateValue,
        rolls,
        rollCount: rolls.length,
        maxRoll,
        rarityMaxRoll,
        efficiency,
        rv: efficiency * 100,
      }
    }

    // Fallback when a synthetic test artifact uses a value not in the discrete tier table
    const efficiency = value / maxRoll
    const estRollCount = Math.max(1, Math.round(value / rarityMaxRoll))
    return {
      key,
      value,
      accurateValue: value,
      rolls: [value],
      rollCount: estRollCount,
      maxRoll,
      rarityMaxRoll,
      efficiency,
      rv: efficiency * 100,
    }
  })

  if (allPossibleRolls.length > 0) {
    const { low, high } = ART_SUBSTAT_ROLL_DATA[rarity]
    const lowerBound = low + Math.floor(level / 4)
    const upperBound = high + Math.floor(level / 4)
    let highestScore = Number.NEGATIVE_INFINITY

    const tryAllSubstats = (
      chosen: Array<{ index: number; roll: number[] }>,
      currentScore: number,
      total: number
    ) => {
      if (chosen.length === allPossibleRolls.length) {
        if (
          total <= upperBound &&
          total >= lowerBound &&
          highestScore < currentScore
        ) {
          highestScore = currentScore
          for (const { index, roll } of chosen) {
            const target = substats[index]!
            const accurateValue = roll.reduce((a, b) => a + b, 0)
            const efficiency = accurateValue / target.maxRoll
            target.rolls = roll
            target.rollCount = roll.length
            target.accurateValue = accurateValue
            target.efficiency = efficiency
            target.rv = efficiency * 100
          }
        }
        return
      }

      const { index, substatRolls } = allPossibleRolls[chosen.length]!
      for (const roll of substatRolls) {
        chosen.push({ index, roll })
        const newScore = Math.min(currentScore, -roll.length)
        if (newScore >= highestScore) {
          tryAllSubstats(chosen, newScore, total + roll.length)
        }
        chosen.pop()
      }
    }

    tryAllSubstats([], Number.POSITIVE_INFINITY, totalUnambiguousRolls)
  }

  const filter = artifact.substatFilter
  let totalEfficiency = 0
  let totalRolls = 0
  for (const s of substats) {
    totalRolls += s.rollCount
    if (!filter || filter.has(s.key)) {
      totalEfficiency += s.efficiency
    }
  }

  const totalRv = totalEfficiency * 100
  return {
    totalEfficiency,
    totalRv,
    totalRvRounded: Math.round(totalRv),
    totalRolls,
    substats,
  }
}

export type { ISubstat }
