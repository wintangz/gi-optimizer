import { describe, expect, it } from 'vitest'
import {
  createBlankUserPreset,
  defaultTcBuildForCharacter,
  forkPresetToUser,
  getBundledPreset,
   getPresetBadge,
  parsePresetJson,
  serializePresetJson,
} from '../src'

describe('userPreset helpers', () => {
  it('creates a valid blank user preset with Custom badge and no verification badge', () => {
    const p = createBlankUserPreset('Furina', 'My Furina Setup')
    expect(p.source).toBe('user')
    expect(p.id).toMatch(/^user\/my-furina-setup-[a-z0-9]{6}$/)
    expect(p.author).toBe('You')
    expect(p.akasha).toBeUndefined()
    const badge = getPresetBadge(p)
    expect(badge.label).toBe('Custom — use at your own risk')
    expect(badge.verified).toBe(false)
  })

  it('falls back to a safe id when name has only non-Latin characters', () => {
    const p = createBlankUserPreset('HuTao', '胡桃蒸発編成')
    expect(p.id).toMatch(/^user\/custom-[a-z0-9]{6}$/)
    expect(p.name).toBe('胡桃蒸発編成')
  })

  it('forks an Akasha or Official preset into a user preset while preserving simulated tc teammate builds', () => {
    const akasha = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const forked = forkPresetToUser(akasha)
    expect(forked.source).toBe('user')
    expect(forked.id).toMatch(/^user\//)
    expect(forked.akasha).toBeUndefined()
    expect(forked.name).toContain('(copy)')
    expect(forked.team.slice(1)).toEqual(akasha.team.slice(1))
    expect(forked.rotation).toEqual(akasha.rotation)

    // Verify team[0] is converted from 'fixed' to 'owned' and every teammate (team[1..3]) stays 'tc' with identical stats
    expect(akasha.team[0]?.build.type).toBe('fixed')
    expect(forked.team[0]?.build.type).toBe('owned')
    for (let i = 1; i < forked.team.length; i++) {
      const m = forked.team[i]!
      const origM = akasha.team[i]!
      expect(m.build.type).toBe('tc')
      if (m.build.type === 'tc' && origM.build.type === 'tc') {
        expect(m.build.tc).toEqual(origM.build.tc)
      }
    }

    const official = getBundledPreset('official/neuvillette-hypercarry')!
    const forkedOfficial = forkPresetToUser(official)
    expect(forkedOfficial.team[0]?.build.type).toBe('owned')
    for (let i = 1; i < forkedOfficial.team.length; i++) {
      const m = forkedOfficial.team[i]!
      const origM = official.team[i]!
      expect(m.build.type).toBe('tc')
      if (m.build.type === 'tc' && origM.build.type === 'tc') {
        expect(m.build.tc).toEqual(origM.build.tc)
      }
    }
  })

  it('round-trips export and import of a user preset and converts non-user presets on import', () => {
    const orig = createBlankUserPreset('Neuvillette', 'Neuv Solo')
    const json = serializePresetJson(orig)
    const imported = parsePresetJson(json)
    expect(imported.ok).toBe(true)
    if (imported.ok) {
      expect(imported.preset).toEqual(orig)
      expect(imported.convertedFromSource).toBeUndefined()
    }

    // Importing an Akasha JSON converts it to a user copy
    const akasha = getBundledPreset('akasha/hutao-double-hydro-homa-c1')!
    const importedAkasha = parsePresetJson(JSON.stringify(akasha))
    expect(importedAkasha.ok).toBe(true)
    if (importedAkasha.ok) {
      expect(importedAkasha.convertedFromSource).toBe('akasha')
      expect(importedAkasha.preset.source).toBe('user')
      expect(importedAkasha.preset.akasha).toBeUndefined()
    }
  })

  it('reports plain schema errors on bad JSON imports', () => {
    const badJson = parsePresetJson('{ bad json')
    expect(badJson.ok).toBe(false)
    if (!badJson.ok) {
      expect(badJson.issues[0]?.message).toContain('not valid JSON')
    }

    const badSchema = parsePresetJson(
      JSON.stringify({
        schema: 'gi-optimizer/preset@1',
        id: 'user/test',
        name: '',
        source: 'user',
        author: 'You',
        target: 'Furina',
        team: [],
        rotation: { targets: [] },
      })
    )
    expect(badSchema.ok).toBe(false)
    if (!badSchema.ok) {
      expect(badSchema.issues.length).toBeGreaterThan(0)
    }
  })

  it('creates a valid default TC build matching the character weapon type', () => {
    const tc = defaultTcBuildForCharacter('HuTao')
    expect(tc.weapon.key).toBe('FavoniusLance')
    expect(tc.character.level).toBe(90)
  })
})

