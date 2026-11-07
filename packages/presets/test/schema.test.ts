import { describe, expect, it } from 'vitest'
import {
  fixedBuildSchema,
  memberRequirementSchema,
  presetSchema,
  presetSourceSchema,
  rotationTargetSchema,
  tcBuildSchema,
  tcCharacterSchema,
  tcWeaponSchema,
  teamMemberSchema,
} from '../src/schema'
import { defaultTcBuildForCharacter } from '../src/userPreset'

const minimal = {
  schema: 'gi-optimizer/preset@1',
  id: 'user/furina-test',
  name: 'Furina test',
  source: 'user',
  author: 'me',
  target: 'Furina',
  team: [{ key: 'Furina', build: { type: 'owned' } }],
  rotation: { targets: [{ path: ['Furina', 'skill', 'x'], count: 1 }] },
}

describe('presetSchema (zero-dependency validator)', () => {
  it('accepts a minimal user preset and hydrates all defaults without mutating input', () => {
    const frozen = Object.freeze({
      ...minimal,
      team: [Object.freeze({ key: 'Furina', build: Object.freeze({ type: 'owned' }) })],
      rotation: Object.freeze({
        targets: [Object.freeze({ path: ['Furina', 'skill', 'x'], count: 1 })],
      }),
    })
    const r = presetSchema.safeParse(frozen)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
    if (!r.success) return

    expect(r.data.description).toBe('')
    expect(r.data.enemy).toEqual({ level: 100, overrides: {} })
    expect(r.data.teamConditional).toEqual({ resonance: {}, reaction: {} })
    expect(r.data.rotation.name).toBe('Rotation')
    expect(r.data.rotation.repeat).toBe(1)
    expect(r.data.rotation.targets[0]?.label).toBe('')
    expect(r.data.rotation.targets[0]?.hitMode).toBe('avgHit')
    expect(r.data.rotation.targets[0]?.bonusStats).toEqual({})
    expect(r.data.team[0]?.requirement).toEqual({})
    expect(r.data.team[0]?.conditional).toEqual({})
    expect(r.data.team[0]?.bonusStats).toEqual({})
    expect(r.data.team[0]?.hitMode).toBe('avgHit')

    // .parse() returns identical data
    expect(presetSchema.parse(frozen)).toEqual(r.data)
  })

  it('validates enum constraints (characterKey, weaponKey, mainStatKey, hitMode, reaction, infusionAura)', () => {
    expect(
      presetSchema.safeParse({ ...minimal, target: 'NotAChar' }).success
    ).toBe(false)
    expect(
      teamMemberSchema.safeParse({
        key: 'Furina',
        build: { type: 'owned' },
        hitMode: 'invalidMode',
      }).success
    ).toBe(false)
    expect(
      teamMemberSchema.safeParse({
        key: 'Furina',
        build: { type: 'owned' },
        reaction: 'overload',
      }).success
    ).toBe(false)
    expect(
      teamMemberSchema.safeParse({
        key: 'Furina',
        build: { type: 'owned' },
        infusionAura: 'dendro',
      }).success
    ).toBe(false)
    expect(
      tcWeaponSchema.safeParse({
        key: 'NotAWeapon',
        level: 90,
        ascension: 6,
        refinement: 1,
      }).success
    ).toBe(false)

    const tc = defaultTcBuildForCharacter('Furina')
    expect(tcBuildSchema.safeParse(tc).success).toBe(true)
    const badSlot = structuredClone(tc)
    badSlot.artifact.slots.sands.statKey = 'invalid_stat'
    expect(tcBuildSchema.safeParse(badSlot).success).toBe(false)
  })

  it('validates integer bounds across character, weapon, artifact, enemy, and rotation', () => {
    expect(
      tcCharacterSchema.safeParse({
        level: 101,
        ascension: 6,
        constellation: 0,
        talent: { auto: 9, skill: 9, burst: 9 },
      }).success
    ).toBe(false)
    expect(
      tcCharacterSchema.safeParse({
        level: 90,
        ascension: 7,
        constellation: 0,
        talent: { auto: 9, skill: 9, burst: 9 },
      }).success
    ).toBe(false)
    expect(
      tcCharacterSchema.safeParse({
        level: 90,
        ascension: 6,
        constellation: 7,
        talent: { auto: 9, skill: 9, burst: 9 },
      }).success
    ).toBe(false)
    expect(
      tcCharacterSchema.safeParse({
        level: 90,
        ascension: 6,
        constellation: 0,
        talent: { auto: 16, skill: 9, burst: 9 },
      }).success
    ).toBe(false)
    expect(
      tcWeaponSchema.safeParse({
        key: 'FavoniusSword',
        level: 91,
        ascension: 6,
        refinement: 1,
      }).success
    ).toBe(false)
    expect(
      tcWeaponSchema.safeParse({
        key: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 6,
      }).success
    ).toBe(false)
    expect(
      presetSchema.safeParse({
        ...minimal,
        enemy: { level: 201, overrides: {} },
      }).success
    ).toBe(false)
    expect(
      presetSchema.safeParse({
        ...minimal,
        rotation: { repeat: 0, targets: minimal.rotation.targets },
      }).success
    ).toBe(false)
    expect(
      memberRequirementSchema.safeParse({
        constellation: { min: 0, max: 6 },
        weapon: { key: 'FavoniusSword', refinement: { min: 1, max: 5 } },
        minLevel: 90,
        minTalent: { skill: 8, burst: 8 },
      }).success
    ).toBe(true)
    expect(presetSourceSchema.safeParse('official').success).toBe(true)
    expect(presetSourceSchema.safeParse('other').success).toBe(false)
  })

  it('validates rotationTargetSchema path and count rules', () => {
    expect(
      rotationTargetSchema.safeParse({ path: ['Furina'], count: 1 }).success
    ).toBe(false)
    const customPath = rotationTargetSchema.safeParse({
      path: ['custom', '0'],
      count: 1,
    })
    expect(customPath.success).toBe(false)
    if (!customPath.success) {
      expect(customPath.error.issues[0]?.message).toContain(
        'path cannot start with "custom"'
      )
    }
    expect(
      rotationTargetSchema.safeParse({
        path: ['Furina', 'skill', 'dmg'],
        count: 0,
      }).success
    ).toBe(false)
  })

  it('enforces all cross-field domain refinements with exact issue paths and messages', () => {
    // 1. team[0] !== target
    const rTarget = presetSchema.safeParse({ ...minimal, target: 'Neuvillette' })
    expect(rTarget.success).toBe(false)
    if (!rTarget.success) {
      expect(rTarget.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['team', 0, 'key'],
          message: 'team[0] must be the target character',
        })
      )
    }

    // 2. akasha target must use build.type 'fixed' & akasha metadata required
    const rAkashaNoMeta = presetSchema.safeParse({
      ...minimal,
      id: 'akasha/x',
      source: 'akasha',
    })
    expect(rAkashaNoMeta.success).toBe(false)
    if (!rAkashaNoMeta.success) {
      expect(
        rAkashaNoMeta.error.issues.some((i) =>
          i.message.includes("akasha target member must use build.type 'fixed'")
        )
      ).toBe(true)
      expect(
        rAkashaNoMeta.error.issues.some((i) =>
          i.message.includes('akasha metadata is required')
        )
      ).toBe(true)
    }

    // 3. non-akasha target must use build.type 'owned'
    const fixedBuild = {
      type: 'fixed' as const,
      character: {
        level: 90,
        ascension: 6,
        constellation: 0,
        talent: { auto: 10, skill: 10, burst: 10 },
      },
      weapon: {
        key: 'SplendorOfTranquilWaters',
        level: 90,
        ascension: 6,
        refinement: 1,
      },
    }
    expect(fixedBuildSchema.safeParse(fixedBuild).success).toBe(true)

    const rUserFixed = presetSchema.safeParse({
      ...minimal,
      team: [{ key: 'Furina', build: fixedBuild }],
    })
    expect(rUserFixed.success).toBe(false)
    if (!rUserFixed.success) {
      expect(rUserFixed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['team', 0, 'build'],
          message: "target member must use build.type 'owned'",
        })
      )
    }

    // 4. duplicate team member
    const rDup = presetSchema.safeParse({
      ...minimal,
      team: [
        { key: 'Furina', build: { type: 'owned' } },
        { key: 'Furina', build: { type: 'owned' } },
      ],
    })
    expect(rDup.success).toBe(false)
    if (!rDup.success) {
      expect(rDup.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['team'],
          message: 'duplicate team member',
        })
      )
    }

    // 5. id prefix must match source
    const rPrefix = presetSchema.safeParse({
      ...minimal,
      id: 'official/furina-test',
      source: 'user',
    })
    expect(rPrefix.success).toBe(false)
    if (!rPrefix.success) {
      expect(rPrefix.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['id'],
          message: 'id prefix must match source',
        })
      )
    }

    // Throw on .parse() when invalid
    expect(() => presetSchema.parse({ ...minimal, target: 'Neuvillette' })).toThrow()
  })

  it('preserves enemy level and canonicalizes *_res_ override keys to *_enemyRes_', () => {
    const parsed = presetSchema.parse({
      ...minimal,
      enemy: {
        level: 95,
        overrides: {
          hydro_res_: 50,
          pyro_enemyRes_: -20,
        },
      },
    })
    expect(parsed.enemy).toEqual({
      level: 95,
      overrides: {
        hydro_enemyRes_: 50,
        pyro_enemyRes_: -20,
      },
    })
  })
})
