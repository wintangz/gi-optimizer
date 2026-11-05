import {
  ART_SET_STAT_META,
  CHAR_STAT_META,
  WEAPON_STAT_META,
} from '@gi/good'
import { ALL_WEAPON_KEYS, displayName } from './names'

export type IdentifierElement =
  | 'pyro'
  | 'hydro'
  | 'electro'
  | 'cryo'
  | 'anemo'
  | 'geo'
  | 'dendro'

export type IdentifierWeaponType =
  | 'sword'
  | 'claymore'
  | 'polearm'
  | 'bow'
  | 'catalyst'

export type IdentifierSlotKey =
  | 'flower'
  | 'plume'
  | 'sands'
  | 'goblet'
  | 'circlet'

export type IdentifierRarity = 1 | 2 | 3 | 4 | 5

export interface ColorTokens {
  fg: string
  bg: string
  border: string
}

export interface CharacterMeta {
  key: string
  displayName: string
  /** Deterministic 2-letter uppercase initials (e.g. "FU", "HT", "TA"). */
  initials: string
  element: IdentifierElement
  elementColor: ColorTokens
  rarity: 4 | 5
  weaponType: IdentifierWeaponType
}

export interface WeaponMeta {
  key: string
  displayName: string
  weaponType: IdentifierWeaponType
  weaponTypeLabel: string
  /** Concise Unicode symbol fallback for the weapon class. */
  glyph: string
  rarity: IdentifierRarity
  rarityColor: ColorTokens
}

export interface ArtifactMeta {
  setKey: string
  setDisplayName: string
  slotKey?: IdentifierSlotKey
  slotDisplayName: string
  /** Concise Unicode symbol fallback for the artifact slot or set emblem. */
  glyph: string
  rarity: IdentifierRarity
  rarityColor: ColorTokens
  /** Deterministic hue in [0, 359] computed from setKey. */
  hue: number
  /** Deterministic set fill/border colors incorporating set hue and rarity. */
  setColor: ColorTokens
}

const ELEMENT_COLORS: Record<IdentifierElement, ColorTokens> = {
  pyro: { fg: '#ef7938', bg: '#3b2016', border: '#ef7938' },
  hydro: { fg: '#3b9dff', bg: '#142a42', border: '#3b9dff' },
  electro: { fg: '#b57cff', bg: '#2b1d42', border: '#b57cff' },
  cryo: { fg: '#73d8e8', bg: '#16333b', border: '#73d8e8' },
  anemo: { fg: '#5cd4b0', bg: '#15352d', border: '#5cd4b0' },
  geo: { fg: '#e8b84b', bg: '#382c14', border: '#e8b84b' },
  dendro: { fg: '#88d64c', bg: '#203515', border: '#88d64c' },
}

const RARITY_COLORS: Record<IdentifierRarity, ColorTokens> = {
  5: { fg: '#f3b755', bg: '#382914', border: '#e8ad4f' },
  4: { fg: '#c297ff', bg: '#291c3d', border: '#b485f2' },
  3: { fg: '#6cc0ff', bg: '#162b3d', border: '#66b5f0' },
  2: { fg: '#68dfa4', bg: '#153024', border: '#5ecf98' },
  1: { fg: '#aeb5c7', bg: '#232630', border: '#a0a7ba' },
}

const WEAPON_TYPE_GLYPHS: Record<IdentifierWeaponType, string> = {
  sword: '⚔',
  claymore: '🗡',
  polearm: '🔱',
  bow: '🏹',
  catalyst: '✦',
}

const WEAPON_TYPE_LABELS: Record<IdentifierWeaponType, string> = {
  sword: 'Sword',
  claymore: 'Claymore',
  polearm: 'Polearm',
  bow: 'Bow',
  catalyst: 'Catalyst',
}

const SLOT_GLYPHS: Record<IdentifierSlotKey, string> = {
  flower: '✿',
  plume: '🪶',
  sands: '⏳',
  goblet: '🏆',
  circlet: '👑',
}

const SLOT_LABELS: Record<IdentifierSlotKey, string> = {
  flower: 'Flower of Life',
  plume: 'Plume of Death',
  sands: 'Sands of Eon',
  goblet: 'Goblet of Eonothem',
  circlet: 'Circlet of Logos',
}

export function getElementColor(element: IdentifierElement): ColorTokens {
  return ELEMENT_COLORS[element] ?? ELEMENT_COLORS.anemo
}

export function getRarityColor(rarity: number): ColorTokens {
  const clamped = Math.max(1, Math.min(5, Math.round(rarity || 4))) as IdentifierRarity
  return RARITY_COLORS[clamped]
}

export function getSetHue(setKey: string): number {
  let hash = 2166136261
  for (let i = 0; i < setKey.length; i++) {
    hash ^= setKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % 360
}

export function getCharacterInitials(
  characterKey: string,
  nameOverride?: string
): string {
  if (characterKey === 'Traveler') return 'TR'
  if (characterKey.startsWith('Traveler')) {
    const elePart = characterKey.slice('Traveler'.length)
    const eleInitial = elePart.charAt(0).toUpperCase() || 'R'
    return `T${eleInitial}`
  }

  const label = (nameOverride ?? displayName(characterKey))
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .trim()
  if (!label) return 'CH'

  const words = label.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase()
  }
  const single = words[0]!
  if (single.length >= 2) {
    return single.slice(0, 2).toUpperCase()
  }
  return `${single.toUpperCase()}X`
}

export function getCharacterMeta(characterKey: string): CharacterMeta {
  const normalizedKey =
    characterKey.startsWith('Traveler') ? 'Traveler' : characterKey
  const name = displayName(characterKey) || characterKey || 'Unknown'
  const initials = getCharacterInitials(characterKey, name)

  let element: IdentifierElement = 'anemo'
  let rarity: 4 | 5 = 5
  let weaponType: IdentifierWeaponType = 'sword'

  if (characterKey.startsWith('TravelerAnemo')) element = 'anemo'
  else if (characterKey.startsWith('TravelerGeo')) element = 'geo'
  else if (characterKey.startsWith('TravelerElectro')) element = 'electro'
  else if (characterKey.startsWith('TravelerDendro')) element = 'dendro'
  else if (characterKey.startsWith('TravelerHydro')) element = 'hydro'
  else if (characterKey.startsWith('TravelerPyro')) element = 'pyro'
  else if (characterKey.startsWith('TravelerCryo')) element = 'cryo'

  const stat = CHAR_STAT_META[normalizedKey]
  if (stat) {
    if (
      !characterKey.startsWith('Traveler') &&
      stat.ele &&
      stat.ele in ELEMENT_COLORS
    ) {
      element = stat.ele as IdentifierElement
    }
    rarity = stat.rarity === 4 ? 4 : 5
    if (stat.weaponType && stat.weaponType in WEAPON_TYPE_GLYPHS) {
      weaponType = stat.weaponType as IdentifierWeaponType
    }
  }

  return {
    key: characterKey,
    displayName: name,
    initials,
    element,
    elementColor: getElementColor(element),
    rarity,
    weaponType,
  }
}

export function getWeaponMeta(
  weaponKey: string,
  rarityOverride?: number
): WeaponMeta {
  const name = displayName(weaponKey) || weaponKey || 'Unknown Weapon'
  let weaponType: IdentifierWeaponType = 'sword'
  let rarity: IdentifierRarity = 4

  const stat = WEAPON_STAT_META[weaponKey]
  if (stat) {
    if (stat.weaponType && stat.weaponType in WEAPON_TYPE_GLYPHS) {
      weaponType = stat.weaponType as IdentifierWeaponType
    }
    if (stat.rarity && stat.rarity >= 1 && stat.rarity <= 5) {
      rarity = stat.rarity as IdentifierRarity
    }
  }

  if (
    rarityOverride !== undefined &&
    rarityOverride >= 1 &&
    rarityOverride <= 5
  ) {
    rarity = Math.round(rarityOverride) as IdentifierRarity
  }

  return {
    key: weaponKey,
    displayName: name,
    weaponType,
    weaponTypeLabel: WEAPON_TYPE_LABELS[weaponType],
    glyph: WEAPON_TYPE_GLYPHS[weaponType],
    rarity,
    rarityColor: getRarityColor(rarity),
  }
}

export function listWeaponsForType(
  weaponType: IdentifierWeaponType
): WeaponMeta[] {
  return ALL_WEAPON_KEYS.map((key) => getWeaponMeta(key))
    .filter((w) => w.weaponType === weaponType)
    .sort(
      (a, b) =>
        b.rarity - a.rarity || a.displayName.localeCompare(b.displayName)
    )
}

export function getArtifactMeta(opts: {
  setKey: string
  slotKey?: IdentifierSlotKey
  rarity?: number
}): ArtifactMeta {
  const { setKey, slotKey } = opts
  const setDisplayName = displayName(setKey) || setKey || 'Artifact Set'
  const slotDisplayName = slotKey ? SLOT_LABELS[slotKey] ?? slotKey : 'Artifact Set'
  const glyph = slotKey ? SLOT_GLYPHS[slotKey] ?? '◈' : '◈'

  let rarity: IdentifierRarity = 5
  if (opts.rarity !== undefined && opts.rarity >= 1 && opts.rarity <= 5) {
    rarity = Math.round(opts.rarity) as IdentifierRarity
  } else {
    const artStat = ART_SET_STAT_META[setKey]
    if (artStat?.rarities && artStat.rarities.length > 0) {
      const maxR = Math.max(...artStat.rarities)
      if (maxR >= 1 && maxR <= 5) {
        rarity = maxR as IdentifierRarity
      }
    }
  }

  const rarityColor = getRarityColor(rarity)
  const hue = getSetHue(setKey)
  const setColor: ColorTokens = {
    fg: `hsl(${hue}, 82%, 76%)`,
    bg: `hsl(${hue}, 45%, 22%)`,
    border: rarityColor.border,
  }

  return {
    setKey,
    setDisplayName,
    slotKey,
    slotDisplayName,
    glyph,
    rarity,
    rarityColor,
    hue,
    setColor,
  }
}

