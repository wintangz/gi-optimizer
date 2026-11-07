import type { IdentifierSlotKey } from '@gi/presets/src/metadata'

export {
  ELEMENT_COLORS,
  formatRarityStars,
  getArtifactMeta,
  getArtifactSetShortName,
  getCharacterInitials,
  getCharacterMeta,
  getElementColor,
  getRarityColor,
  getSetHue,
  getWeaponMeta,
  listWeaponsForType,
  RARITY_COLORS,
  shortStatLabel,
  type ArtifactMeta,
  type CharacterMeta,
  type ColorTokens,
  type IdentifierElement,
  type IdentifierRarity,
  type IdentifierSlotKey,
  type IdentifierWeaponType,
  type WeaponMeta,
} from '@gi/presets/src/metadata'

export const CLOUDINARY_GENSHIN_BASE_URL =
  'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'

/** Standard app dark surface colour (--surface in globals.css) used for weapon & artifact tiles/chips. */
export const ITEM_DARK_SURFACE_BG = '#151821'

export function getCdnIconUrl(key: string): string {
  return `${CLOUDINARY_GENSHIN_BASE_URL}/${key}.png`
}

export function getCdnArtifactIconUrl(
  setKey: string,
  slotKey: IdentifierSlotKey
): string {
  return `${CLOUDINARY_GENSHIN_BASE_URL}/${setKey}-${slotKey}.png`
}


