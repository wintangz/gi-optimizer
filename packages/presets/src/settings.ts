import { ALL_ARTIFACT_SET_KEYS } from './names'
import type { PresetSource } from './schema'

export type SetPieceCount = 2 | 4
export type SetFilterMode = 'all' | 'exclude' | 'include'
export type ArtSetExclusionMap = Record<string, SetPieceCount[]>

export type MainStatFilterSlotKey =
  | 'flower'
  | 'plume'
  | 'sands'
  | 'goblet'
  | 'circlet'

export type MainStatAllowlistMap = Partial<
  Record<MainStatFilterSlotKey, string[]>
>

export type RequiredSubstatsMode = 'any' | 'all'

export const VARIABLE_MAIN_STAT_SLOTS = ['sands', 'goblet', 'circlet'] as const
export type VariableMainStatSlotKey = (typeof VARIABLE_MAIN_STAT_SLOTS)[number]

export type MemberBuildMode = 'owned' | 'tc'
export type MemberBuildModesMap = Record<string, MemberBuildMode>

export type MemberConditionalsMap = Record<string, Record<string, string>>
export type PresetMemberConditionalOverrides = Record<
  string,
  MemberConditionalsMap
>

export interface ResolvedMemberBuild {
  characterKey: string
  /** Effective build mode ('owned' uses the user's GOOD character/weapon/artifacts; 'tc' uses the preset's simulated build). */
  mode: MemberBuildMode
  /** Whether the character is present in the user's imported GOOD characters array. */
  ownedInGood: boolean
  /** True when an official preset member runs as 'tc' because the user does not own the character in GOOD. */
  forcedSimulated: boolean
}

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
  /** Per-slot allowed main stat keys; empty array or omitted = unrestricted. */
  mainStatKeys?: MainStatAllowlistMap
  /** Required substat keys that candidate artifacts must contain; empty array = unrestricted. */
  requiredSubstats?: string[]
  /** Whether candidate artifacts must have 'any' or 'all' of `requiredSubstats`. */
  requiredSubstatsMode?: RequiredSubstatsMode
  /** Minimum artifact rarity (1..5); 1 = unrestricted. */
  minRarity?: 1 | 2 | 3 | 4 | 5
  /** Minimum artifact Roll Value percentage (0 = unrestricted). */
  minRv?: number
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
  /**
   * Per-preset, per-member build mode choice ('owned' | 'tc') for official preset teammates.
   * Keyed by `[presetId][characterKey]`.
   */
  memberBuildModes?: Record<string, MemberBuildModesMap>
  /**
   * Per-preset, per-member conditional overrides (`[presetId][characterKey][sheetKey][condKey]`).
   * A value of `'off'` explicitly disables the conditional; any other string sets the conditional state.
   */
  memberConditionalOverrides?: Record<string, PresetMemberConditionalOverrides>
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
  mainStatKeys: {},
  requiredSubstats: [],
  requiredSubstatsMode: 'all',
  minRarity: 1,
  minRv: 0,
  setExclusion: {},
  setFilterMode: 'all',
  setFilterSelection: {},
  memberBuildModes: {},
  memberConditionalOverrides: {},
  topN: 5,
}

export function resolvePresetMemberBuildMode(opts: {
  presetSource: PresetSource
  isTarget: boolean
  memberBuildType: 'owned' | 'fixed' | 'tc'
  characterKey: string
  ownedCharKeys: ReadonlySet<string> | readonly string[]
  overrideMode?: MemberBuildMode
}): ResolvedMemberBuild {
  const {
    presetSource,
    isTarget,
    memberBuildType,
    characterKey,
    ownedCharKeys,
    overrideMode,
  } = opts
  const ownedInGood = Array.isArray(ownedCharKeys)
    ? ownedCharKeys.includes(characterKey)
    : (ownedCharKeys as ReadonlySet<string>).has(characterKey)

  if (isTarget) {
    return {
      characterKey,
      mode: memberBuildType === 'owned' ? 'owned' : 'tc',
      ownedInGood,
      forcedSimulated: false,
    }
  }

  if (presetSource === 'official') {
    if (!ownedInGood) {
      return {
        characterKey,
        mode: 'tc',
        ownedInGood: false,
        forcedSimulated: true,
      }
    }
    const mode: MemberBuildMode = overrideMode === 'tc' ? 'tc' : 'owned'
    return {
      characterKey,
      mode,
      ownedInGood: true,
      forcedSimulated: false,
    }
  }

  return {
    characterKey,
    mode: memberBuildType === 'owned' ? 'owned' : 'tc',
    ownedInGood,
    forcedSimulated: false,
  }
}

export function getPresetMemberBuildModes(
  settings: Pick<OptimizerSettings, 'memberBuildModes'> | undefined,
  presetId: string
): MemberBuildModesMap {
  return settings?.memberBuildModes?.[presetId] ?? {}
}

export function setPresetMemberBuildMode(
  settings: OptimizerSettings,
  presetId: string,
  characterKey: string,
  mode: MemberBuildMode
): OptimizerSettings {
  const currentForPreset = settings.memberBuildModes?.[presetId] ?? {}
  return {
    ...settings,
    memberBuildModes: {
      ...(settings.memberBuildModes ?? {}),
      [presetId]: {
        ...currentForPreset,
        [characterKey]: mode,
      },
    },
  }
}

export function getPresetConditionalOverrides(
  settings: Pick<OptimizerSettings, 'memberConditionalOverrides'> | undefined,
  presetId: string
): PresetMemberConditionalOverrides {
  return settings?.memberConditionalOverrides?.[presetId] ?? {}
}

export function setMemberConditionalOverride(
  settings: OptimizerSettings,
  presetId: string,
  characterKey: string,
  sheetKey: string,
  condKey: string,
  value: string
): OptimizerSettings {
  const currentPresetMap = settings.memberConditionalOverrides?.[presetId] ?? {}
  const currentMemberMap = currentPresetMap[characterKey] ?? {}
  const currentSheetMap = currentMemberMap[sheetKey] ?? {}
  return {
    ...settings,
    memberConditionalOverrides: {
      ...(settings.memberConditionalOverrides ?? {}),
      [presetId]: {
        ...currentPresetMap,
        [characterKey]: {
          ...currentMemberMap,
          [sheetKey]: {
            ...currentSheetMap,
            [condKey]: value,
          },
        },
      },
    },
  }
}

export function resetMemberConditionalOverrides(
  settings: OptimizerSettings,
  presetId: string,
  characterKey?: string
): OptimizerSettings {
  const currentAll = { ...(settings.memberConditionalOverrides ?? {}) }
  if (!characterKey) {
    delete currentAll[presetId]
    return {
      ...settings,
      memberConditionalOverrides: currentAll,
    }
  }
  const currentPresetMap = { ...(currentAll[presetId] ?? {}) }
  delete currentPresetMap[characterKey]
  if (Object.keys(currentPresetMap).length === 0) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = currentPresetMap
  }
  return {
    ...settings,
    memberConditionalOverrides: currentAll,
  }
}

export function hasMemberConditionalOverrides(
  settings: Pick<OptimizerSettings, 'memberConditionalOverrides'> | undefined,
  presetId: string,
  characterKey?: string
): boolean {
  const presetMap = settings?.memberConditionalOverrides?.[presetId]
  if (!presetMap) return false
  if (characterKey) {
    const memberMap = presetMap[characterKey]
    if (!memberMap) return false
    return Object.values(memberMap).some(
      (sheetMap) => sheetMap && Object.keys(sheetMap).length > 0
    )
  }
  return Object.values(presetMap).some(
    (memberMap) =>
      memberMap &&
      Object.values(memberMap).some(
        (sheetMap) => sheetMap && Object.keys(sheetMap).length > 0
      )
  )
}

export const CONDITIONAL_KEY_ALIASES: Record<string, Record<string, string>> = {
  ArchaicPetra: {
    element: 'ele',
    ele: 'element',
  },
}

export function readEffectiveConditionalValue(
  effectiveMap: MemberConditionalsMap | undefined,
  sheet: string,
  condKey: string
): string {
  const sheetMap = effectiveMap?.[sheet]
  if (!sheetMap) return 'off'

  const direct = sheetMap[condKey]
  if (direct !== undefined) {
    if (!direct || direct === 'off') return 'off'
    return direct
  }

  const aliasKey = CONDITIONAL_KEY_ALIASES[sheet]?.[condKey]
  if (aliasKey) {
    const aliasVal = sheetMap[aliasKey]
    if (aliasVal && aliasVal !== 'off') {
      return aliasVal
    }
  }

  return 'off'
}

export function applyMemberConditionalOverrides(
  baseConditionals: MemberConditionalsMap,
  memberOverrides?: MemberConditionalsMap
): MemberConditionalsMap {
  if (!memberOverrides) return baseConditionals
  const hasAnyOverride = Object.values(memberOverrides).some(
    (sheetMap) => sheetMap && Object.keys(sheetMap).length > 0
  )
  if (!hasAnyOverride) return baseConditionals

  const out: MemberConditionalsMap = {}
  for (const [sKey, sMap] of Object.entries(baseConditionals)) {
    if (sMap) {
      out[sKey] = { ...sMap }
    }
  }

  for (const [sheetKey, sheetOverrides] of Object.entries(memberOverrides)) {
    if (!sheetOverrides) continue
    const targetSheet = { ...(out[sheetKey] ?? {}) }
    for (const [condKey, rawVal] of Object.entries(sheetOverrides)) {
      const aliasKey = CONDITIONAL_KEY_ALIASES[sheetKey]?.[condKey]
      if (!rawVal || rawVal === 'off') {
        delete targetSheet[condKey]
        if (aliasKey) {
          delete targetSheet[aliasKey]
        }
      } else {
        targetSheet[condKey] = rawVal
        if (aliasKey && targetSheet[aliasKey] !== undefined) {
          targetSheet[aliasKey] = rawVal
        }
      }
    }
    if (Object.keys(targetSheet).length === 0) {
      delete out[sheetKey]
    } else {
      out[sheetKey] = targetSheet
    }
  }

  return out
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
  merged.mainStatKeys = merged.mainStatKeys ?? {}
  merged.requiredSubstats = Array.isArray(merged.requiredSubstats)
    ? [...merged.requiredSubstats]
    : []
  merged.requiredSubstatsMode =
    merged.requiredSubstatsMode === 'any' ? 'any' : 'all'
  merged.minRarity =
    typeof merged.minRarity === 'number' &&
    merged.minRarity >= 1 &&
    merged.minRarity <= 5
      ? (Math.round(merged.minRarity) as 1 | 2 | 3 | 4 | 5)
      : 1
  merged.minRv =
    typeof merged.minRv === 'number' &&
    Number.isFinite(merged.minRv) &&
    merged.minRv > 0
      ? merged.minRv
      : 0
  return merged
}

export interface SolverPoolFilterSummary {
  activeCount: number
  isUnrestricted: boolean
  text: string
}

export function summarizeSolverPoolFilters(
  settings: Partial<OptimizerSettings> | undefined
): SolverPoolFilterSummary {
  if (!settings) {
    return {
      activeCount: 0,
      isUnrestricted: true,
      text: 'All pieces allowed',
    }
  }

  let activeCount = 0
  const mainStatKeys = settings.mainStatKeys ?? {}
  for (const slot of ['flower', 'plume', 'sands', 'goblet', 'circlet'] as const) {
    const allowed = mainStatKeys[slot]
    if (Array.isArray(allowed) && allowed.length > 0) {
      activeCount += 1
    }
  }

  if (
    Array.isArray(settings.requiredSubstats) &&
    settings.requiredSubstats.length > 0
  ) {
    activeCount += 1
  }

  const levelLow = settings.levelLow ?? 0
  const levelHigh = settings.levelHigh ?? 20
  if (levelLow > 0 || levelHigh < 20) {
    activeCount += 1
  }

  if ((settings.minRarity ?? 1) > 1) {
    activeCount += 1
  }

  if (
    typeof settings.minRv === 'number' &&
    Number.isFinite(settings.minRv) &&
    settings.minRv > 0
  ) {
    activeCount += 1
  }

  if (activeCount === 0) {
    return {
      activeCount: 0,
      isUnrestricted: true,
      text: 'All pieces allowed',
    }
  }

  return {
    activeCount,
    isUnrestricted: false,
    text: `${activeCount} pool ${activeCount === 1 ? 'filter' : 'filters'} active`,
  }
}

export function resetSolverPoolFilters(
  settings: OptimizerSettings
): OptimizerSettings {
  return {
    ...settings,
    levelLow: 0,
    levelHigh: 20,
    mainStatKeys: {},
    requiredSubstats: [],
    requiredSubstatsMode: 'all',
    minRarity: 1,
    minRv: 0,
  }
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

/**
 * Resolves which team member owns a rotation target row (via `rt.member` or a 3-segment
 * `rt.path` starting with a member's character key) and returns the normalized 2-segment
 * `[section, targetKey]` path for that member's GO sheet.
 */
export function resolveRotationTargetOwner(
  rt: { member?: string; path: readonly string[] },
  preset: { target: string; team: ReadonlyArray<{ key: string }> }
): {
  memberKey: string
  normPath: [string, string]
} {
  const teamKeys = new Set(preset.team.map((m) => m.key))
  if (rt.member && teamKeys.has(rt.member)) {
    const normPath: [string, string] =
      rt.path.length >= 3 && rt.path[0] === rt.member
        ? [rt.path[1] ?? '', rt.path[2] ?? '']
        : [rt.path[0] ?? '', rt.path[1] ?? '']
    return { memberKey: rt.member, normPath }
  }
  if (rt.path.length >= 3 && teamKeys.has(rt.path[0]!)) {
    return {
      memberKey: rt.path[0]!,
      normPath: [rt.path[1] ?? '', rt.path[2] ?? ''],
    }
  }
  const normPath: [string, string] =
    rt.path[0] === preset.target
      ? [rt.path[1] ?? '', rt.path[2] ?? '']
      : [rt.path[0] ?? '', rt.path[1] ?? '']
  return { memberKey: preset.target, normPath }
}
