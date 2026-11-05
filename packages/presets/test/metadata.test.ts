import { describe, expect, it } from 'vitest'
import {
  ALL_ARTIFACT_SET_KEYS,
  ALL_CHARACTER_KEYS,
  ALL_WEAPON_KEYS,
  getArtifactMeta,
  getCharacterInitials,
  getCharacterMeta,
  getSetHue,
  getWeaponMeta,
  type IdentifierSlotKey,
} from '../src/index'

describe('Visual Identifier Metadata Lookup (visual-identifiers)', () => {
  it('resolves valid element, 2-letter uppercase initials, and weaponType for all character keys', () => {
    for (const ck of ALL_CHARACTER_KEYS) {
      const meta = getCharacterMeta(ck)
      expect(meta.key).toBe(ck)
      expect(meta.displayName.length).toBeGreaterThan(0)
      expect(meta.initials).toMatch(/^[A-Z0-9]{2}$/)
      expect([
        'pyro',
        'hydro',
        'electro',
        'cryo',
        'anemo',
        'geo',
        'dendro',
      ]).toContain(meta.element)
      expect(['sword', 'claymore', 'polearm', 'bow', 'catalyst']).toContain(
        meta.weaponType
      )
      expect(meta.elementColor.fg).toMatch(/^#/)
    }

    expect(getCharacterInitials('Furina')).toBe('FU')
    expect(getCharacterInitials('HuTao')).toBe('HT')
    expect(getCharacterInitials('RaidenShogun')).toBe('RS')
    expect(getCharacterInitials('TravelerAnemo')).toBe('TA')
    expect(getCharacterInitials('TravelerPyro')).toBe('TP')
    expect(getCharacterInitials('Traveler')).toBe('TR')

    // Unknown fallback
    const fallback = getCharacterMeta('UnknownFutureChar')
    expect(fallback.initials).toBe('UF')
  })

  it('resolves weaponType, glyph, and rarity (1..5) for all weapon keys', () => {
    for (const wk of ALL_WEAPON_KEYS) {
      const meta = getWeaponMeta(wk)
      expect(meta.key).toBe(wk)
      expect(meta.displayName.length).toBeGreaterThan(0)
      expect(['sword', 'claymore', 'polearm', 'bow', 'catalyst']).toContain(
        meta.weaponType
      )
      expect(meta.glyph.length).toBeGreaterThan(0)
      expect(meta.rarity).toBeGreaterThanOrEqual(1)
      expect(meta.rarity).toBeLessThanOrEqual(5)
      expect(meta.rarityColor.border).toMatch(/^#/)
    }

    const splendor = getWeaponMeta('SplendorOfTranquilWaters')
    expect(splendor.weaponType).toBe('sword')
    expect(splendor.rarity).toBe(5)

    const homa = getWeaponMeta('StaffOfHoma')
    expect(homa.weaponType).toBe('polearm')
    expect(homa.rarity).toBe(5)
  })

  it('resolves deterministic set hue, rarity, and slot glyphs for all artifact sets and slots', () => {
    const slots: IdentifierSlotKey[] = [
      'flower',
      'plume',
      'sands',
      'goblet',
      'circlet',
    ]
    for (const sk of ALL_ARTIFACT_SET_KEYS) {
      const setMeta = getArtifactMeta({ setKey: sk })
      expect(setMeta.setKey).toBe(sk)
      expect(setMeta.hue).toBeGreaterThanOrEqual(0)
      expect(setMeta.hue).toBeLessThanOrEqual(359)
      expect(getSetHue(sk)).toBe(setMeta.hue)
      expect(setMeta.rarity).toBeGreaterThanOrEqual(1)
      expect(setMeta.rarity).toBeLessThanOrEqual(5)
    }

    for (const slotKey of slots) {
      const slotMeta = getArtifactMeta({
        setKey: 'GoldenTroupe',
        slotKey,
        rarity: 5,
      })
      expect(slotMeta.slotKey).toBe(slotKey)
      expect(slotMeta.glyph.length).toBeGreaterThan(0)
      expect(slotMeta.rarity).toBe(5)
    }
  })
})

