import { ALL_ARTIFACT_SET_KEYS } from './names'

export type SetPieceCount = 2 | 4
export type SetFilterMode = 'all' | 'exclude' | 'include'
export type ArtSetExclusionMap = Record<string, SetPieceCount[]>

export const STAT_CONSTRAINT_KEYS = [
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
] as const

export type StatConstraintKey = (typeof STAT_CONSTRAINT_KEYS)[number]

export interface StatConstraint {
  stat: StatConstraintKey
  min?: number
  max?: number
}

export function isPercentStatConstraintKey(stat: string): boolean {
  return stat.endsWith('_')
}

/**
 * Normalizes a user-entered stat constraint value into Genshin Optimizer's internal
 * total node scale (decimals for percentage stats `_*`, raw numbers for flat stats).
 * Percentage stats entered in display units (e.g. `160` for 160% ER, `60` for 60% CR)
 * are divided by 100, while already-normalized decimal values (e.g. `1.6` ER, `0.6` CR)
 * are preserved.
 */
export function normalizeStatConstraintValue(
  stat: string,
  value: number | undefined
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  if (!isPercentStatConstraintKey(stat)) {
    return value
  }
  if (stat === 'enerRech_') {
    return value > 10 ? value / 100 : value
  }
  return value > 2 ? value / 100 : value
}

export function isActiveStatConstraint(c: StatConstraint | undefined): boolean {
  if (!c || !(STAT_CONSTRAINT_KEYS as readonly string[]).includes(c.stat)) {
    return false
  }
  const hasMin = typeof c.min === 'number' && Number.isFinite(c.min)
  const hasMax = typeof c.max === 'number' && Number.isFinite(c.max)
  return hasMin || hasMax
}

export interface OptimizerSettings {
  erFloor?: number
  constraints?: StatConstraint[]
  includeEquippedOnOthers: boolean
  excludedCharacters: string[]
  lockedOnly?: boolean
  mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20
  levelLow: number
  levelHigh: number
  /** Legacy / direct GO artSetExclusion map. */
  setExclusion?: ArtSetExclusionMap
  /** First-class set filter mode ('all' | 'exclude' | 'include'). */
  setFilterMode?: SetFilterMode
  /**
   * Selected sets and their chosen piece counts ([2], [4], or [2, 4]).
   * - In 'exclude' mode: piece counts to exclude for each checked set.
   * - In 'include' mode: piece counts to allow for each checked set.
   */
  setFilterSelection?: ArtSetExclusionMap
  topN: number
}

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  constraints: [],
  includeEquippedOnOthers: true,
  excludedCharacters: [],
  lockedOnly: false,
  mainStatAssumptionLevel: 0,
  levelLow: 0,
  levelHigh: 20,
  setExclusion: {},
  setFilterMode: 'all',
  setFilterSelection: {},
  topN: 5,
}

/**
 * Migrates a persisted or caller-supplied OptimizerSettings object so that a
 * legacy `erFloor` (when no `enerRech_` constraint is already present in
 * `constraints`) is converted into `{ stat: 'enerRech_', min: erFloor }`,
 * making `constraints` the single source of truth.
 */
export function migrateOptimizerSettings(
  raw?: Partial<OptimizerSettings>
): OptimizerSettings {
  const merged: OptimizerSettings = {
    ...DEFAULT_OPTIMIZER_SETTINGS,
    ...(raw ?? {}),
  }
  const existing = Array.isArray(merged.constraints)
    ? merged.constraints.map((c) => ({ ...c }))
    : []

  const legacyEr = merged.erFloor
  if (
    typeof legacyEr === 'number' &&
    Number.isFinite(legacyEr) &&
    legacyEr > 0
  ) {
    const hasErConstraint = existing.some((c) => c.stat === 'enerRech_')
    if (!hasErConstraint) {
      existing.unshift({
        stat: 'enerRech_',
        min: legacyEr,
      })
    }
  }

  delete merged.erFloor
  merged.constraints = existing
  return merged
}

export function normalizePieceCounts(
  pieces: readonly number[] | undefined
): SetPieceCount[] {
  if (!pieces || pieces.length === 0) return []
  const has2 = pieces.includes(2)
  const has4 = pieces.includes(4)
  if (has2 && has4) return [2, 4]
  if (has2) return [2]
  if (has4) return [4]
  return []
}

function normalizeExclusionMap(
  raw: Record<string, readonly number[]> | undefined
): ArtSetExclusionMap {
  const out: ArtSetExclusionMap = {}
  if (!raw) return out
  for (const [setKey, pieces] of Object.entries(raw)) {
    const norm = normalizePieceCounts(pieces)
    if (norm.length > 0) {
      out[setKey] = norm
    }
  }
  return out
}

export function resolveEffectiveSetFilter(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >
): { mode: SetFilterMode; selection: ArtSetExclusionMap } {
  const hasSelectionKeys =
    settings.setFilterSelection !== undefined &&
    Object.keys(settings.setFilterSelection).length > 0
  const hasLegacyKeys =
    settings.setExclusion !== undefined &&
    Object.keys(settings.setExclusion).length > 0

  if (settings.setFilterMode === 'include') {
    return {
      mode: 'include',
      selection: normalizeExclusionMap(settings.setFilterSelection),
    }
  }
  if (settings.setFilterMode === 'exclude') {
    return {
      mode: 'exclude',
      selection: normalizeExclusionMap(
        hasSelectionKeys ? settings.setFilterSelection : settings.setExclusion
      ),
    }
  }
  // If setFilterMode is undefined or 'all' (e.g. from spreading DEFAULT_OPTIMIZER_SETTINGS)
  // and caller passed legacy `setExclusion` without `setFilterSelection`, honor `setExclusion` as 'exclude'.
  if (!hasSelectionKeys && hasLegacyKeys) {
    return {
      mode: 'exclude',
      selection: normalizeExclusionMap(settings.setExclusion),
    }
  }
  return {
    mode: 'all',
    selection: normalizeExclusionMap(settings.setFilterSelection),
  }
}

/**
 * Translates OptimizerSettings (setFilterMode, setFilterSelection, setExclusion)
 * into Genshin Optimizer's ArtSetExclusion map (`Record<string, (2 | 4)[]>`).
 */
export function resolveArtSetExclusion(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys: readonly string[] = ALL_ARTIFACT_SET_KEYS
): ArtSetExclusionMap {
  const { mode, selection } = resolveEffectiveSetFilter(settings)

  if (mode === 'all') {
    return {}
  }

  if (mode === 'exclude') {
    return selection
  }

  // mode === 'include' ("Only these sets")
  const out: ArtSetExclusionMap = {}
  for (const setKey of allSetKeys) {
    const allowed = normalizePieceCounts(selection[setKey])
    if (allowed.length === 0) {
      out[setKey] = [2, 4]
    } else if (allowed.length === 1 && allowed[0] === 4) {
      out[setKey] = [2]
    } else if (allowed.length === 1 && allowed[0] === 2) {
      out[setKey] = [4]
    }
    // If allowed is [2, 4], omit from exclusion map so both 2pc and 4pc are allowed
  }
  return out
}

export interface ArtSetFilterSummary {
  mode: SetFilterMode
  totalSets: number
  selectedCount: number
  selectedSets: number
  allowedCount: number
  allowedSets: number
  text: string
  label: string
}

export function summarizeArtSetFilter(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys: readonly string[] = ALL_ARTIFACT_SET_KEYS
): ArtSetFilterSummary {
  const totalSets = allSetKeys.length
  const { mode, selection } = resolveEffectiveSetFilter(settings)
  const allSetKeySet = new Set(allSetKeys)
  const selectedKeys = Object.keys(selection).filter(
    (k) => allSetKeySet.has(k) && (selection[k]?.length ?? 0) > 0
  )
  const selectedCount = selectedKeys.length

  if (mode === 'all') {
    const text = `All ${totalSets} artifact sets allowed`
    return {
      mode: 'all',
      totalSets,
      selectedCount,
      selectedSets: selectedCount,
      allowedCount: totalSets,
      allowedSets: totalSets,
      text,
      label: text,
    }
  }

  if (mode === 'exclude') {
    const fullyExcludedCount = selectedKeys.filter((k) => {
      const p = selection[k]!
      return p.includes(2) && p.includes(4)
    }).length
    const allowedCount = Math.max(0, totalSets - fullyExcludedCount)
    const text = `${allowedCount} of ${totalSets} sets allowed (${selectedCount} excluded)`
    return {
      mode: 'exclude',
      totalSets,
      selectedCount,
      selectedSets: selectedCount,
      allowedCount,
      allowedSets: allowedCount,
      text,
      label: text,
    }
  }

  // mode === 'include'
  const allowedCount = selectedCount
  const text = `Only ${allowedCount} of ${totalSets} sets allowed`
  return {
    mode: 'include',
    totalSets,
    selectedCount,
    selectedSets: selectedCount,
    allowedCount,
    allowedSets: allowedCount,
    text,
    label: text,
  }
}

export function selectAllSets(
  current: ArtSetExclusionMap,
  targetKeys: readonly string[],
  defaultPieces: SetPieceCount[] = [2, 4]
): ArtSetExclusionMap {
  const next: ArtSetExclusionMap = { ...current }
  const normDefault = normalizePieceCounts(defaultPieces)
  const fallback: SetPieceCount[] = normDefault.length > 0 ? normDefault : [2, 4]
  for (const key of targetKeys) {
    const existing = normalizePieceCounts(next[key])
    next[key] = existing.length > 0 ? existing : [...fallback]
  }
  return next
}

export function clearSets(
  current: ArtSetExclusionMap,
  targetKeys: readonly string[]
): ArtSetExclusionMap {
  const next: ArtSetExclusionMap = { ...current }
  for (const key of targetKeys) {
    delete next[key]
  }
  return next
}

export function invertSets(
  current: ArtSetExclusionMap,
  targetKeys: readonly string[],
  defaultPieces: SetPieceCount[] = [2, 4]
): ArtSetExclusionMap {
  const next: ArtSetExclusionMap = { ...current }
  const normDefault = normalizePieceCounts(defaultPieces)
  const fallback: SetPieceCount[] = normDefault.length > 0 ? normDefault : [2, 4]
  for (const key of targetKeys) {
    const existing = normalizePieceCounts(next[key])
    if (existing.length > 0) {
      delete next[key]
    } else {
      next[key] = [...fallback]
    }
  }
  return next
}
