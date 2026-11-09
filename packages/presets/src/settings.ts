import elementalResonanceGenEn from '../../../vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en/elementalResonance_gen.json'
import elementalResonanceEn from '../../../vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/elementalResonance.json'
import sheetEn from '../../../vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/sheet.json'
import { getCharacterMeta, type IdentifierElement } from './metadata'
import { ALL_ARTIFACT_SET_KEYS, ALL_WEAPON_KEYS } from './names'
import {
  FAST_MODE_STAT_KEYS,
  isFastModeStatKey,
  normalizeFastModeStats,
  type FastModeStatKey,
  type FastModeStats,
  type Preset,
  type PresetFastModeMap,
  type PresetSource,
} from './schema'

export {
  FAST_MODE_STAT_KEYS,
  isFastModeStatKey,
  normalizeFastModeStats,
  type FastModeStatKey,
  type FastModeStats,
  type PresetFastModeMap,
}

export const RESONANCE_EFFECT_KEYS = [
  'ProtectiveCanopy',
  'FerventFlames',
  'SoothingWater',
  'ShatteringIce',
  'HighVoltage',
  'ImpetuousWinds',
  'EnduringRock',
  'SprawlingGreenery',
] as const

export type ResonanceEffectKey = (typeof RESONANCE_EFFECT_KEYS)[number]

export type ResonanceEffectsStateMap = Partial<
  Record<ResonanceEffectKey, boolean>
>

export interface TriggeredResonanceDescriptor {
  key: ResonanceEffectKey
  element: IdentifierElement | 'all'
  /** Exact name from vendored GO elementalResonance_gen.json (e.g. "Shattering Ice", "Soothing Water"). */
  name: string
  /** Exact description from vendored GO elementalResonance_gen.json. */
  desc: string
  /** Plain-language summary line stating what the resonance gives and any secondary condition. */
  plainSummary: string
  /** Secondary trigger condition text when applicable (Cryo Frozen/Cryo, Geo shield/Moondrifts, Dendro reactions). */
  conditionText?: string
  /** GO teamConditional.resonance keys associated with this resonance's secondary triggers, if any. */
  triggerConditionalKeys: readonly string[]
}

function stripGoTags(raw: string): string {
  return raw.replace(/<\/?[a-z]+>/gi, '').trim()
}

export const ELEMENT_TO_RESONANCE_KEY: Record<
  IdentifierElement,
  ResonanceEffectKey
> = {
  pyro: 'FerventFlames',
  hydro: 'SoothingWater',
  cryo: 'ShatteringIce',
  electro: 'HighVoltage',
  anemo: 'ImpetuousWinds',
  geo: 'EnduringRock',
  dendro: 'SprawlingGreenery',
}

export const RESONANCE_KEY_TO_ELEMENT: Record<
  ResonanceEffectKey,
  IdentifierElement | 'all'
> = {
  ProtectiveCanopy: 'all',
  FerventFlames: 'pyro',
  SoothingWater: 'hydro',
  ShatteringIce: 'cryo',
  HighVoltage: 'electro',
  ImpetuousWinds: 'anemo',
  EnduringRock: 'geo',
  SprawlingGreenery: 'dendro',
}

const RESONANCE_KEY_ALIASES: Record<string, ResonanceEffectKey> = {
  ProtectiveCanopy: 'ProtectiveCanopy',
  protectivecanopy: 'ProtectiveCanopy',
  all: 'ProtectiveCanopy',
  FerventFlames: 'FerventFlames',
  ferventflames: 'FerventFlames',
  Pyro: 'FerventFlames',
  pyro: 'FerventFlames',
  SoothingWater: 'SoothingWater',
  SoothingWaters: 'SoothingWater',
  soothingwater: 'SoothingWater',
  soothingwaters: 'SoothingWater',
  Hydro: 'SoothingWater',
  hydro: 'SoothingWater',
  ShatteringIce: 'ShatteringIce',
  shatteringice: 'ShatteringIce',
  Cryo: 'ShatteringIce',
  cryo: 'ShatteringIce',
  HighVoltage: 'HighVoltage',
  highvoltage: 'HighVoltage',
  Electro: 'HighVoltage',
  electro: 'HighVoltage',
  ImpetuousWinds: 'ImpetuousWinds',
  impetuouswinds: 'ImpetuousWinds',
  Anemo: 'ImpetuousWinds',
  anemo: 'ImpetuousWinds',
  EnduringRock: 'EnduringRock',
  enduringrock: 'EnduringRock',
  Geo: 'EnduringRock',
  geo: 'EnduringRock',
  SprawlingGreenery: 'SprawlingGreenery',
  SprawlingCanopy: 'SprawlingGreenery',
  sprawlinggreenery: 'SprawlingGreenery',
  sprawlingcanopy: 'SprawlingGreenery',
  Dendro: 'SprawlingGreenery',
  dendro: 'SprawlingGreenery',
}

export function normalizeResonanceEffectKey(
  rawKey: string | undefined | null
): ResonanceEffectKey | undefined {
  if (!rawKey) return undefined
  return (
    RESONANCE_KEY_ALIASES[rawKey] ?? RESONANCE_KEY_ALIASES[rawKey.toLowerCase()]
  )
}

export const GO_RESONANCE_CATALOG: Record<
  ResonanceEffectKey,
  TriggeredResonanceDescriptor
> = {
  ProtectiveCanopy: {
    key: 'ProtectiveCanopy',
    element: 'all',
    name: elementalResonanceGenEn.ProtectiveCanopy.name,
    desc: elementalResonanceGenEn.ProtectiveCanopy.desc,
    plainSummary: '+15% All Elemental RES, +15% Physical RES',
    triggerConditionalKeys: [],
  },
  FerventFlames: {
    key: 'FerventFlames',
    element: 'pyro',
    name: elementalResonanceGenEn.FerventFlames.name,
    desc: elementalResonanceGenEn.FerventFlames.desc,
    plainSummary: '+25% ATK',
    triggerConditionalKeys: [],
  },
  SoothingWater: {
    key: 'SoothingWater',
    element: 'hydro',
    name: elementalResonanceGenEn.SoothingWater.name,
    desc: elementalResonanceGenEn.SoothingWater.desc,
    plainSummary: '+25% Max HP',
    triggerConditionalKeys: [],
  },
  ShatteringIce: {
    key: 'ShatteringIce',
    element: 'cryo',
    name: elementalResonanceGenEn.ShatteringIce.name,
    desc: elementalResonanceGenEn.ShatteringIce.desc,
    plainSummary: '+15% CRIT Rate against Frozen or Cryo-affected enemies',
    conditionText: stripGoTags(sheetEn.enemyAffected.frozenOrCryo),
    triggerConditionalKeys: ['ShatteringIce'],
  },
  HighVoltage: {
    key: 'HighVoltage',
    element: 'electro',
    name: elementalResonanceGenEn.HighVoltage.name,
    desc: elementalResonanceGenEn.HighVoltage.desc,
    plainSummary:
      '100% chance to generate 1 Electro Elemental Particle on Electro reactions (CD: 5s)',
    triggerConditionalKeys: [],
  },
  ImpetuousWinds: {
    key: 'ImpetuousWinds',
    element: 'anemo',
    name: elementalResonanceGenEn.ImpetuousWinds.name,
    desc: elementalResonanceGenEn.ImpetuousWinds.desc,
    plainSummary: '-15% Stamina Consumption, +10% Movement SPD, -5% Skill CD',
    triggerConditionalKeys: [],
  },
  EnduringRock: {
    key: 'EnduringRock',
    element: 'geo',
    name: elementalResonanceGenEn.EnduringRock.name,
    desc: elementalResonanceGenEn.EnduringRock.desc,
    plainSummary:
      '+15% Shield Strength; +15% DMG dealt and -20% enemy Geo RES (15s) while shielded or near Lunar-Crystallize Moondrifts',
    conditionText: `${stripGoTags(elementalResonanceEn.EnduringRock.baseCond)} · ${stripGoTags(elementalResonanceEn.EnduringRock.hitCond)}`,
    triggerConditionalKeys: ['EnduringRock', 'EnduringRockHit'],
  },
  SprawlingGreenery: {
    key: 'SprawlingGreenery',
    element: 'dendro',
    name: elementalResonanceGenEn.SprawlingGreenery.name,
    desc: elementalResonanceGenEn.SprawlingGreenery.desc,
    plainSummary:
      '+50 EM base; +30 EM after Burning/Quicken/Bloom/Lunar-Bloom (6s); +20 EM after Aggravate/Spread/Hyperbloom/Burgeon (6s)',
    conditionText: `${stripGoTags(elementalResonanceEn.SprawlingGreenery.cond2ele)} · ${stripGoTags(elementalResonanceEn.SprawlingGreenery.cond3ele)}`,
    triggerConditionalKeys: ['SprawlingCanopy2ele', 'SprawlingCanopy3ele'],
  },
}

/**
 * Derives the ordered list of elemental resonances triggered by a team composition
 * (matching Genshin Optimizer's `resonanceSheets` order and trigger rules).
 */
export function listTriggeredResonances(
  teamOrPreset:
    | Pick<Preset, 'team'>
    | ReadonlyArray<
        { key?: string; characterKey?: string } | string | undefined
      >
): TriggeredResonanceDescriptor[] {
  const rawMembers = Array.isArray(teamOrPreset)
    ? teamOrPreset
    : (teamOrPreset as Pick<Preset, 'team'>)?.team ?? []
  const activeCharKeys: string[] = []
  for (let i = 0; i < Math.min(4, rawMembers.length); i++) {
    const item = rawMembers[i]
    const k =
      typeof item === 'string'
        ? item
        : item?.key ?? (item as { characterKey?: string } | undefined)?.characterKey
    if (k && typeof k === 'string') {
      activeCharKeys.push(k)
    }
  }
  if (activeCharKeys.length === 0) return []

  const eleCounts: Partial<Record<IdentifierElement, number>> = {}
  for (const ck of activeCharKeys) {
    const ele = getCharacterMeta(ck).element
    if (ele) {
      eleCounts[ele] = (eleCounts[ele] ?? 0) + 1
    }
  }

  const triggered: TriggeredResonanceDescriptor[] = []
  const distinctElements = Object.keys(eleCounts).length
  if (activeCharKeys.length >= 4 && distinctElements >= 4) {
    triggered.push(GO_RESONANCE_CATALOG.ProtectiveCanopy)
  }

  for (const resKey of RESONANCE_EFFECT_KEYS) {
    if (resKey === 'ProtectiveCanopy') continue
    const desc = GO_RESONANCE_CATALOG[resKey]
    if (desc.element !== 'all' && (eleCounts[desc.element] ?? 0) >= 2) {
      triggered.push(desc)
    }
  }

  return triggered
}

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

export const CONSTELLATION_VALUES = [0, 1, 2, 3, 4, 5, 6] as const
export type ConstellationValue = (typeof CONSTELLATION_VALUES)[number]
export type MemberConstellationOverridesMap = Partial<
  Record<string, ConstellationValue>
>
export type ConstellationSourceKind = 'case' | 'preset' | 'your account'

export interface ResolvedMemberConstellation {
  value: ConstellationValue
  defaultValue: ConstellationValue
  source: ConstellationSourceKind
  isOverridden: boolean
}

export interface WeaponCompareCandidateSpec {
  weaponKey: string
  level: number
  ascension: number
  refinement: number
  isOwned?: boolean
  ownedWeaponId?: string
  isEquippedBaseline?: boolean
  /**
   * Independent copy of the target character's (`preset.target` / slot 0) conditional
   * overrides for this candidate: candidate weapon passives, target character/constellation
   * passives, and target artifact-set conditionals.
   */
  targetConditionals?: MemberConditionalsMap
  /**
   * Snapshot of the target character's effective conditional overrides at the time this
   * candidate was added or seeded, used to detect and explain "Setup differs" in the UI.
   */
  seededTargetConditionals?: MemberConditionalsMap
}

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
  /**
   * Per-preset, per-member constellation overrides (`[presetId][characterKey] => 0..6`).
   */
  memberConstellationOverrides?: Record<string, MemberConstellationOverridesMap>
  /**
   * Per-preset master Elemental Resonance on/off override (`[presetId] => boolean`).
   * Defaults to `true` (ON) when omitted or undefined. When `false` (OFF), all elemental
   * resonances are suppressed for the preset without mutating bundled preset data or
   * individual trigger conditional overrides.
   */
  resonanceEnabledByPreset?: Record<string, boolean>
  /**
   * Optional run-level master Elemental Resonance override (`true` = ON, `false` = OFF).
   * Used when `resonanceEnabledByPreset[presetId]` is not set.
   */
  resonanceEnabled?: boolean
  /**
   * Per-preset, per-effect Elemental Resonance on/off overrides (`[presetId][effectKey] => boolean`).
   * Defaults to `true` (ON) for every effect when omitted. Applied only while that resonance is
   * triggered by the team composition.
   */
  resonanceEffectsByPreset?: Record<string, ResonanceEffectsStateMap>
  /**
   * Optional run-level per-effect Elemental Resonance overrides (`[effectKey] => boolean`).
   */
  resonanceEffects?: ResonanceEffectsStateMap
  /**
   * Per-preset Fast Mode virtual 6th artifact stat lines keyed by
   * `[presetId][characterKey][statKey]`.
   */
  fastModeByPreset?: Record<string, PresetFastModeMap>
  /**
   * Per-preset weapon comparison candidate list (`[presetId] => WeaponCompareCandidateSpec[]`),
   * persisting each candidate's weapon investment and per-candidate `targetConditionals` /
   * `seededTargetConditionals` setup.
   */
  weaponCompareCandidatesByPreset?: Record<string, WeaponCompareCandidateSpec[]>
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
  memberConstellationOverrides: {},
  resonanceEnabledByPreset: {},
  resonanceEffectsByPreset: {},
  fastModeByPreset: {},
  weaponCompareCandidatesByPreset: {},
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
    if (memberBuildType === 'fixed') {
      return {
        characterKey,
        mode: 'tc',
        ownedInGood,
        forcedSimulated: false,
      }
    }
    const defaultTargetMode: MemberBuildMode =
      memberBuildType === 'owned' ? 'owned' : 'tc'
    const mode: MemberBuildMode =
      overrideMode === 'tc'
        ? 'tc'
        : overrideMode === 'owned' && ownedInGood
          ? 'owned'
          : defaultTargetMode
    return {
      characterKey,
      mode,
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

export function getPresetResonanceEnabled(
  settings:
    | Pick<OptimizerSettings, 'resonanceEnabledByPreset' | 'resonanceEnabled'>
    | undefined,
  presetId: string
): boolean {
  const map = settings?.resonanceEnabledByPreset
  if (map) {
    const direct = map[presetId]
    if (typeof direct === 'boolean') {
      return direct
    }
    const subIdx = presetId.indexOf('__member_')
    if (subIdx > 0) {
      const rootPresetId = presetId.slice(0, subIdx)
      const rootVal = map[rootPresetId]
      if (typeof rootVal === 'boolean') {
        return rootVal
      }
    }
  }
  if (typeof settings?.resonanceEnabled === 'boolean') {
    return settings.resonanceEnabled
  }
  return true
}

export function setPresetResonanceEnabled(
  settings: OptimizerSettings,
  presetId: string,
  enabled: boolean
): OptimizerSettings {
  const nextSettings: OptimizerSettings = {
    ...settings,
    resonanceEnabledByPreset: {
      ...(settings.resonanceEnabledByPreset ?? {}),
      [presetId]: enabled,
    },
  }
  if (enabled && settings.resonanceEffectsByPreset?.[presetId]) {
    const currentEffectsAll = { ...settings.resonanceEffectsByPreset }
    delete currentEffectsAll[presetId]
    nextSettings.resonanceEffectsByPreset = currentEffectsAll
  }
  return nextSettings
}

export function normalizeResonanceEffectsMap(
  raw: Record<string, boolean | undefined> | undefined
): ResonanceEffectsStateMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: ResonanceEffectsStateMap = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'boolean') continue
    const normKey = normalizeResonanceEffectKey(k)
    if (normKey) {
      out[normKey] = v
    }
  }
  return out
}

export function getPresetResonanceEffects(
  settings:
    | Pick<OptimizerSettings, 'resonanceEffectsByPreset' | 'resonanceEffects'>
    | undefined,
  presetId: string
): ResonanceEffectsStateMap {
  const baseRunEffects = normalizeResonanceEffectsMap(
    settings?.resonanceEffects
  )
  const map = settings?.resonanceEffectsByPreset
  if (!map) return baseRunEffects
  let presetEffects = map[presetId]
  if (!presetEffects) {
    const subIdx = presetId.indexOf('__member_')
    if (subIdx > 0) {
      const rootPresetId = presetId.slice(0, subIdx)
      presetEffects = map[rootPresetId]
    }
  }
  if (!presetEffects) return baseRunEffects
  return {
    ...baseRunEffects,
    ...normalizeResonanceEffectsMap(presetEffects),
  }
}

export function hasDisabledResonanceEffects(
  effects: ResonanceEffectsStateMap | undefined,
  teamOrPreset?:
    | Pick<Preset, 'team'>
    | ReadonlyArray<{ key: string } | string | undefined>
): boolean {
  if (!effects) return false
  const norm = normalizeResonanceEffectsMap(effects)
  if (teamOrPreset) {
    const triggered = listTriggeredResonances(teamOrPreset)
    return triggered.some((t) => norm[t.key] === false)
  }
  return Object.values(norm).some((v) => v === false)
}

export function isPresetResonanceEffectEnabled(
  settings:
    | Pick<
        OptimizerSettings,
        | 'resonanceEnabledByPreset'
        | 'resonanceEnabled'
        | 'resonanceEffectsByPreset'
        | 'resonanceEffects'
      >
    | undefined,
  presetId: string,
  effectKey: string
): boolean {
  if (!getPresetResonanceEnabled(settings, presetId)) {
    return false
  }
  const normKey = normalizeResonanceEffectKey(effectKey)
  if (!normKey) return true
  const effects = getPresetResonanceEffects(settings, presetId)
  return effects[normKey] !== false
}

export function setPresetResonanceEffectEnabled(
  settings: OptimizerSettings,
  presetId: string,
  effectKey: string,
  enabled: boolean
): OptimizerSettings {
  const normKey = normalizeResonanceEffectKey(effectKey)
  if (!normKey) return settings
  const currentAll = { ...(settings.resonanceEffectsByPreset ?? {}) }
  const currentPresetMap: ResonanceEffectsStateMap = {
    ...(currentAll[presetId] ?? {}),
  }
  if (enabled) {
    delete currentPresetMap[normKey]
  } else {
    currentPresetMap[normKey] = false
  }
  if (Object.keys(currentPresetMap).length === 0) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = currentPresetMap
  }
  return {
    ...settings,
    resonanceEffectsByPreset: currentAll,
  }
}

export function getPresetFastMode(
  settings: Pick<OptimizerSettings, 'fastModeByPreset'> | undefined,
  presetId: string
): PresetFastModeMap {
  const map = settings?.fastModeByPreset
  if (!map) return {}
  if (map[presetId]) return map[presetId]
  const subIdx = presetId.indexOf('__member_')
  if (subIdx > 0) {
    const rootPresetId = presetId.slice(0, subIdx)
    if (map[rootPresetId]) return map[rootPresetId]
  }
  return {}
}

export function hasMemberFastMode(stats: FastModeStats | undefined): boolean {
  const norm = normalizeFastModeStats(stats)
  return norm !== undefined && Object.keys(norm).length > 0
}

export function resolveEffectiveFastMode(
  preset: Pick<Preset, 'id' | 'target' | 'team'>,
  settingsOrOverride?: Pick<OptimizerSettings, 'fastModeByPreset'> | PresetFastModeMap
): PresetFastModeMap {
  let overrideByMember: PresetFastModeMap = {}
  if (settingsOrOverride && typeof settingsOrOverride === 'object') {
    if ('fastModeByPreset' in settingsOrOverride) {
      overrideByMember = getPresetFastMode(
        settingsOrOverride as Pick<OptimizerSettings, 'fastModeByPreset'>,
        preset.id
      )
    } else {
      overrideByMember = settingsOrOverride as PresetFastModeMap
    }
  }

  const out: PresetFastModeMap = {}
  for (let i = 1; i < Math.min(4, preset.team.length); i++) {
    const member = preset.team[i]!
    const mKey = member.key
    if (!mKey || mKey === preset.target) continue
    const baseStats = member.fastMode
    const overrideStats = overrideByMember?.[mKey]
    const merged: FastModeStats = {
      ...(baseStats ?? {}),
      ...(overrideStats ?? {}),
    }
    const norm = normalizeFastModeStats(merged)
    if (norm) {
      out[mKey] = norm
    }
  }
  return out
}

export function hasPresetFastMode(
  preset: Pick<Preset, 'id' | 'target' | 'team'>,
  settingsOrOverride?: Pick<OptimizerSettings, 'fastModeByPreset'> | PresetFastModeMap
): boolean {
  const effective = resolveEffectiveFastMode(preset, settingsOrOverride)
  return Object.keys(effective).length > 0
}

export function setPresetMemberFastMode(
  settings: OptimizerSettings,
  presetId: string,
  characterKey: string,
  stats: FastModeStats | undefined
): OptimizerSettings {
  const currentAll = { ...(settings.fastModeByPreset ?? {}) }
  const currentPresetMap = { ...(currentAll[presetId] ?? {}) }
  const norm = normalizeFastModeStats(stats)
  if (!norm) {
    delete currentPresetMap[characterKey]
  } else {
    currentPresetMap[characterKey] = norm
  }
  if (Object.keys(currentPresetMap).length === 0) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = currentPresetMap
  }
  return {
    ...settings,
    fastModeByPreset: currentAll,
  }
}

export function setPresetMemberFastModeStat(
  settings: OptimizerSettings,
  presetId: string,
  characterKey: string,
  statKey: FastModeStatKey,
  value: number | undefined | null
): OptimizerSettings {
  if (!FAST_MODE_STAT_KEYS.includes(statKey)) return settings
  const currentMemberStats: FastModeStats = {
    ...(settings.fastModeByPreset?.[presetId]?.[characterKey] ?? {}),
  }
  if (
    value === undefined ||
    value === null ||
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value === 0
  ) {
    delete currentMemberStats[statKey]
  } else {
    currentMemberStats[statKey] = value
  }
  return setPresetMemberFastMode(
    settings,
    presetId,
    characterKey,
    currentMemberStats
  )
}

export function resetPresetMemberFastMode(
  settings: OptimizerSettings,
  presetId: string,
  characterKey?: string
): OptimizerSettings {
  const currentAll = { ...(settings.fastModeByPreset ?? {}) }
  if (!characterKey) {
    delete currentAll[presetId]
    return {
      ...settings,
      fastModeByPreset: currentAll,
    }
  }
  return setPresetMemberFastMode(settings, presetId, characterKey, undefined)
}

export function resetMemberConditionalOverrides(
  settings: OptimizerSettings,
  presetId: string,
  characterKey?: string
): OptimizerSettings {
  const currentAll = { ...(settings.memberConditionalOverrides ?? {}) }
  if (!characterKey) {
    delete currentAll[presetId]
    let nextSettings: OptimizerSettings = {
      ...settings,
      memberConditionalOverrides: currentAll,
    }
    if (settings.resonanceEnabledByPreset?.[presetId] !== undefined) {
      const currentRes = { ...settings.resonanceEnabledByPreset }
      delete currentRes[presetId]
      nextSettings = {
        ...nextSettings,
        resonanceEnabledByPreset: currentRes,
      }
    }
    if (settings.resonanceEffectsByPreset?.[presetId] !== undefined) {
      const currentResEffects = { ...settings.resonanceEffectsByPreset }
      delete currentResEffects[presetId]
      nextSettings = {
        ...nextSettings,
        resonanceEffectsByPreset: currentResEffects,
      }
    }
    return nextSettings
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

export function normalizeConstellationValue(
  val: unknown
): ConstellationValue | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return undefined
  }
  const rounded = Math.round(val)
  if (rounded < 0 || rounded > 6) {
    return Math.max(0, Math.min(6, rounded)) as ConstellationValue
  }
  return rounded as ConstellationValue
}

export function getPresetConstellationOverrides(
  settings: Pick<OptimizerSettings, 'memberConstellationOverrides'> | undefined,
  presetId: string
): MemberConstellationOverridesMap {
  const map = settings?.memberConstellationOverrides
  if (!map) return {}
  let rawPresetMap = map[presetId]
  if (!rawPresetMap) {
    const subIdx = presetId.indexOf('__member_')
    if (subIdx > 0) {
      const rootPresetId = presetId.slice(0, subIdx)
      rawPresetMap = map[rootPresetId]
    }
  }
  if (!rawPresetMap || typeof rawPresetMap !== 'object') return {}
  const out: MemberConstellationOverridesMap = {}
  for (const [charKey, rawVal] of Object.entries(rawPresetMap)) {
    const norm = normalizeConstellationValue(rawVal)
    if (norm !== undefined) {
      out[charKey] = norm
    }
  }
  return out
}

export function setMemberConstellationOverride(
  settings: OptimizerSettings,
  presetId: string,
  characterKey: string,
  constellation: number | undefined | null,
  defaultConstellation?: number
): OptimizerSettings {
  const currentAll = { ...(settings.memberConstellationOverrides ?? {}) }
  const currentPresetMap: MemberConstellationOverridesMap = {
    ...(currentAll[presetId] ?? {}),
  }
  const norm = normalizeConstellationValue(constellation)
  const normDefault = normalizeConstellationValue(defaultConstellation)
  if (
    norm === undefined ||
    (normDefault !== undefined && norm === normDefault)
  ) {
    delete currentPresetMap[characterKey]
  } else {
    currentPresetMap[characterKey] = norm
  }
  if (Object.keys(currentPresetMap).length === 0) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = currentPresetMap
  }
  return {
    ...settings,
    memberConstellationOverrides: currentAll,
  }
}

export function resetMemberConstellationOverrides(
  settings: OptimizerSettings,
  presetId: string,
  characterKey?: string
): OptimizerSettings {
  const currentAll = { ...(settings.memberConstellationOverrides ?? {}) }
  if (!characterKey) {
    delete currentAll[presetId]
    return {
      ...settings,
      memberConstellationOverrides: currentAll,
    }
  }
  const currentPresetMap: MemberConstellationOverridesMap = {
    ...(currentAll[presetId] ?? {}),
  }
  delete currentPresetMap[characterKey]
  if (Object.keys(currentPresetMap).length === 0) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = currentPresetMap
  }
  return {
    ...settings,
    memberConstellationOverrides: currentAll,
  }
}

export function hasMemberConstellationOverride(
  settings: Pick<OptimizerSettings, 'memberConstellationOverrides'> | undefined,
  presetId: string,
  characterKey?: string
): boolean {
  const presetMap = getPresetConstellationOverrides(settings, presetId)
  if (characterKey) {
    return presetMap[characterKey] !== undefined
  }
  return Object.keys(presetMap).length > 0
}

export function resolvePresetMemberConstellation(opts: {
  preset: Pick<Preset, 'source' | 'team'>
  memberIndex: number
  resolvedMode: MemberBuildMode
  goodCharacterConstellation?: number
  overrideConstellation?: number
}): ResolvedMemberConstellation {
  const {
    preset,
    memberIndex,
    resolvedMode,
    goodCharacterConstellation,
    overrideConstellation,
  } = opts
  const member = preset.team[memberIndex]
  const rawSpecConst =
    member?.build?.type === 'fixed'
      ? member.build.character.constellation
      : member?.build?.type === 'tc'
        ? member.build.tc.character.constellation
        : typeof member?.requirement?.constellation === 'number'
          ? member.requirement.constellation
          : member?.requirement?.constellation?.min
  const specConst = normalizeConstellationValue(rawSpecConst) ?? 0
  const goodConst = normalizeConstellationValue(goodCharacterConstellation)
  const isFixedOrCase =
    member?.build?.type === 'fixed' || preset.source === 'akasha'

  let defaultValue: ConstellationValue = specConst
  let source: ConstellationSourceKind = isFixedOrCase ? 'case' : 'preset'

  if (
    !isFixedOrCase &&
    resolvedMode === 'owned' &&
    goodConst !== undefined
  ) {
    defaultValue = goodConst
    source = 'your account'
  }

  const normOverride = normalizeConstellationValue(overrideConstellation)
  const isOverridden =
    normOverride !== undefined && normOverride !== defaultValue
  const value: ConstellationValue = normOverride ?? defaultValue

  return {
    value,
    defaultValue,
    source,
    isOverridden,
  }
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

const ALL_WEAPON_KEYS_SET = new Set<string>(ALL_WEAPON_KEYS)

export function cloneMemberConditionalsMap(
  map: MemberConditionalsMap | undefined
): MemberConditionalsMap {
  if (!map) return {}
  const out: MemberConditionalsMap = {}
  for (const [sheetKey, sheetMap] of Object.entries(map)) {
    if (sheetMap && typeof sheetMap === 'object') {
      out[sheetKey] = { ...sheetMap }
    }
  }
  return out
}

/**
 * Seeds a weapon comparison candidate's `targetConditionals` from the target character's
 * current effective conditional overrides, stripping any sheet overrides belonging to
 * weapons other than `weaponKey`.
 */
export function seedCandidateTargetConditionals(
  targetOverrides: MemberConditionalsMap | undefined,
  weaponKey: string,
  otherWeaponKeysToStrip: ReadonlySet<string> = ALL_WEAPON_KEYS_SET
): MemberConditionalsMap {
  if (!targetOverrides) return {}
  const out: MemberConditionalsMap = {}
  for (const [sheetKey, sheetMap] of Object.entries(targetOverrides)) {
    if (!sheetMap || typeof sheetMap !== 'object') continue
    if (otherWeaponKeysToStrip.has(sheetKey) && sheetKey !== weaponKey) {
      continue
    }
    const copy = { ...sheetMap }
    if (Object.keys(copy).length > 0) {
      out[sheetKey] = copy
    }
  }
  return out
}

/**
 * Resolves the per-member conditional overrides map for a single weapon comparison candidate:
 * replaces the target character's entry (`[targetCharKey]`) with `candidate.targetConditionals`
 * when defined while preserving all non-target teammate conditional overrides from
 * `sharedMemberConditionals`.
 */
export function resolveCandidateMemberConditionals(
  targetCharKey: string,
  candidate: Pick<WeaponCompareCandidateSpec, 'targetConditionals'>,
  sharedMemberConditionals?: Record<string, MemberConditionalsMap>
): Record<string, MemberConditionalsMap> | undefined {
  if (candidate.targetConditionals === undefined) {
    return sharedMemberConditionals
  }
  const out: Record<string, MemberConditionalsMap> = {}
  if (sharedMemberConditionals) {
    for (const [memberKey, memberMap] of Object.entries(
      sharedMemberConditionals
    )) {
      if (memberKey === targetCharKey) continue
      if (memberMap) {
        out[memberKey] = cloneMemberConditionalsMap(memberMap)
      }
    }
  }
  out[targetCharKey] = cloneMemberConditionalsMap(candidate.targetConditionals)
  return out
}

function cloneWeaponCompareCandidateSpec(
  cand: WeaponCompareCandidateSpec
): WeaponCompareCandidateSpec {
  return {
    ...cand,
    ...(cand.targetConditionals !== undefined
      ? {
          targetConditionals: cloneMemberConditionalsMap(
            cand.targetConditionals
          ),
        }
      : {}),
    ...(cand.seededTargetConditionals !== undefined
      ? {
          seededTargetConditionals: cloneMemberConditionalsMap(
            cand.seededTargetConditionals
          ),
        }
      : {}),
  }
}

export function getPresetWeaponCompareCandidates(
  settings: Pick<OptimizerSettings, 'weaponCompareCandidatesByPreset'> | undefined,
  presetId: string
): WeaponCompareCandidateSpec[] | undefined {
  const list = settings?.weaponCompareCandidatesByPreset?.[presetId]
  if (!Array.isArray(list)) return undefined
  return list.map(cloneWeaponCompareCandidateSpec)
}

export function setPresetWeaponCompareCandidates(
  settings: OptimizerSettings,
  presetId: string,
  candidates: WeaponCompareCandidateSpec[] | undefined
): OptimizerSettings {
  const currentAll = { ...(settings.weaponCompareCandidatesByPreset ?? {}) }
  if (!candidates) {
    delete currentAll[presetId]
  } else {
    currentAll[presetId] = candidates.map(cloneWeaponCompareCandidateSpec)
  }
  return {
    ...settings,
    weaponCompareCandidatesByPreset: currentAll,
  }
}

export function resetPresetWeaponCompareCandidates(
  settings: OptimizerSettings,
  presetId: string
): OptimizerSettings {
  return setPresetWeaponCompareCandidates(settings, presetId, undefined)
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
    const text =
      selectedCount > 0
        ? `All ${totalSets} artifact sets allowed (${selectedCount} selected — choose Exclude selected or Only these sets to apply)`
        : `All ${totalSets} artifact sets allowed`
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
