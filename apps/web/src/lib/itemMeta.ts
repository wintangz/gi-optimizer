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

export function getCdnIconUrl(key: string): string {
  return `${CLOUDINARY_GENSHIN_BASE_URL}/${key}.png`
}


