# Data Model & Contracts: Visual Identifiers (`visual-identifiers`)

## 1. Item Metadata Lookup Contract (`packages/presets/src/metadata.ts` & `apps/web/src/lib/itemMeta.ts`)

```ts
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

export function getCharacterInitials(characterKey: string, nameOverride?: string): string
export function getElementColor(element: IdentifierElement): ColorTokens
export function getRarityColor(rarity: number): ColorTokens
export function getSetHue(setKey: string): number

export function getCharacterMeta(characterKey: string): CharacterMeta
export function getWeaponMeta(weaponKey: string, rarityOverride?: number): WeaponMeta
export function getArtifactMeta(opts: {
  setKey: string
  slotKey?: IdentifierSlotKey
  rarity?: number
}): ArtifactMeta
```

## 2. Shared React Identifier Components (`apps/web/src/components/Identifier.tsx`)

```ts
import type { ReactNode } from 'react'
import type { IdentifierSlotKey } from '@gi/presets'

export type CharacterRoleTag = 'target' | 'owned' | 'none'

export interface CharacterBadgeProps {
  characterKey: string
  /**
   * When true (`member.build.type === 'tc'`), renders a dashed outer ring around the
   * avatar circle + a prominent "SIM" / "SIM · Fixed Preset Build" pill badge.
   */
  simulated?: boolean
  /**
   * Ownership badge shown in team rosters when not simulated:
   * - 'target' -> "YOURS · TARGET" (or "TARGET" when compact)
   * - 'owned'  -> "YOUR BUILD" (or "YOURS" when compact)
   * - 'none'   -> no ownership pill (e.g. raw inventory table rows)
   */
  role?: CharacterRoleTag
  /** Renders compact pill tags and slightly smaller avatar (e.g. preset list cards, chips). */
  compact?: boolean
  /** Optional secondary text rendered beside or beneath the display name (e.g. "Lv. 90 C0"). */
  subtitle?: ReactNode
}

export interface WeaponBadgeProps {
  weaponKey: string
  rarityOverride?: number
  compact?: boolean
  /** Optional refinement/level/location metadata shown next to the weapon name. */
  subtitle?: ReactNode
}

export interface ArtifactBadgeProps {
  setKey: string
  slotKey?: IdentifierSlotKey
  rarity?: number
  compact?: boolean
  /** When true, displays only the slot label as primary text (for slot-only cells) while keeping set/rarity styling. */
  slotOnly?: boolean
  /** Optional level, main stat, substats, or location metadata. */
  subtitle?: ReactNode
}

export type ItemIdentifierProps =
  | ({ kind: 'character' } & CharacterBadgeProps)
  | ({ kind: 'weapon' } & WeaponBadgeProps)
  | ({ kind: 'artifact' } & ArtifactBadgeProps)

export function CharacterBadge(props: CharacterBadgeProps): JSX.Element
export function WeaponBadge(props: WeaponBadgeProps): JSX.Element
export function ArtifactBadge(props: ArtifactBadgeProps): JSX.Element
export function ItemIdentifier(props: ItemIdentifierProps): JSX.Element
```

## 3. Validation Rules & Invariants

- **Deterministic Initials**: `getCharacterInitials(key)` returns a 2-character uppercase string `[A-Z0-9]{2}` for every `key` in `ALL_CHARACTER_KEYS` (and any unknown fallback string).
- **Simulated Precedence**: If `simulated={true}` is passed to `CharacterBadge`, it always renders the dashed avatar ring and `"SIM"` / `"SIM · Fixed Preset Build"` pill tag regardless of `role`.
- **Weapon Type Coverage**: Every `key` in `ALL_WEAPON_KEYS` maps to one of `'sword' | 'claymore' | 'polearm' | 'bow' | 'catalyst'` and a rarity in `1..5` via `getWeaponStat(key)`.
- **Artifact Set Coverage**: Every `key` in `ALL_ARTIFACT_SET_KEYS` maps to a deterministic hue in `0..359` and a valid max rarity in `1..5` via `getArtSetStat(key).rarities`.
