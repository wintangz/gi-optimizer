import { describe, expect, it } from 'vitest'
import {
  allAdditive,
  allAmplifying,
  allElements,
  allInputPremodKeys,
  allModStats,
  allMoves,
  allNonModStats,
  allTransformative,
} from '@genshin-optimizer/gi/wr-types'
import {
  allEleDmgKeys,
  allEleEnemyResKeys,
  allEleResKeys,
  crittableTransformativeReactions,
  hitMoves,
  transformativeReactions,
} from '@genshin-optimizer/gi/keymap'
import { getBundledPreset, type Preset } from '@gi/presets'
import {
  ALL_ADDITIONAL_BUFF_KEYS,
  ALL_EXTRACTED_STAT_KEYS,
  ALL_REAL_STAT_KEYS,
  EXCLUDED_GO_STAT_KEYS,
  OTHER_REAL_STAT_KEYS,
  REAL_STAT_KEYS_BY_GROUP,
  RES_REAL_STAT_KEYS,
  STAT_LABELS,
  createSession,
  formatBuffSourceAttribution,
  formatSignedBuffValue,
  getStatLabel,
} from '../src'

describe('full-stat-display — permanent GO stat universe guard & acceptance spread', () => {
  it('permanent guard: derives the full qualified stat universe from vendored GO wr-types & keymap and asserts every key is mapped or explicitly excluded with a reason', () => {
    // Derive the universe from vendored GO wr-types and keymap at test time
    const wrUniverse = new Set<string>([
      ...allInputPremodKeys,
      ...allModStats,
      ...allNonModStats,
    ])

    // Cross-check families from @genshin-optimizer/gi/keymap and @genshin-optimizer/gi/wr-types
    const keymapFamilies = [
      ...allEleDmgKeys,
      ...allEleResKeys,
      ...allEleEnemyResKeys,
      ...allElements.flatMap((ele) => [
        `${ele}_dmg_`,
        `${ele}_res_`,
        `${ele}_enemyRes_`,
        `${ele}_dmgInc`,
        `${ele}_critRate_`,
        `${ele}_critDMG_`,
      ]),
      ...([...allMoves, 'plunging'] as const).flatMap((m) => [
        `${m}_dmg_`,
        `${m}_dmgInc`,
        `${m}_critRate_`,
        `${m}_critDMG_`,
      ]),
      ...Object.keys(hitMoves).flatMap((m) => [
        `${m}_dmg_`,
        `${m}_dmgInc`,
        `${m}_critRate_`,
        `${m}_critDMG_`,
      ]),
      ...allTransformative.flatMap((r) => [`${r}_dmg_`, `${r}_dmgInc`]),
      ...Object.keys(transformativeReactions).flatMap((r) => [
        `${r}_dmg_`,
        `${r}_dmgInc`,
      ]),
      ...allAmplifying.map((r) => `${r}_dmg_`),
      ...allAdditive.map((r) => `${r}_dmg_`),
      ...crittableTransformativeReactions.flatMap((r) => [
        `${r}_critRate_`,
        `${r}_critDMG_`,
      ]),
    ]
    for (const k of keymapFamilies) {
      wrUniverse.add(k)
    }

    const realSet = new Set<string>(ALL_REAL_STAT_KEYS)
    const buffSet = new Set<string>(ALL_ADDITIONAL_BUFF_KEYS)
    const excludedKeys = Object.keys(EXCLUDED_GO_STAT_KEYS)
    const excludedSet = new Set<string>(excludedKeys)

    // 1. Every group in REAL_STAT_KEYS_BY_GROUP partitions ALL_REAL_STAT_KEYS cleanly
    const groupedRealKeys = Object.values(REAL_STAT_KEYS_BY_GROUP).flat()
    expect(groupedRealKeys.length).toBe(ALL_REAL_STAT_KEYS.length)
    expect(new Set(groupedRealKeys).size).toBe(ALL_REAL_STAT_KEYS.length)

    // 2. Real Stats, Additional Buffs, and Excluded keys are mutually disjoint
    for (const k of realSet) {
      expect(buffSet.has(k), `Key '${k}' is in both Real and Buff sets`).toBe(
        false
      )
      expect(
        excludedSet.has(k),
        `Key '${k}' is in both Real and Excluded sets`
      ).toBe(false)
    }
    for (const k of buffSet) {
      expect(
        excludedSet.has(k),
        `Key '${k}' is in both Buff and Excluded sets`
      ).toBe(false)
    }

    // 3. Every excluded key must have a non-empty one-line reason
    for (const [k, reason] of Object.entries(EXCLUDED_GO_STAT_KEYS)) {
      expect(typeof reason).toBe('string')
      expect(reason.trim().length).toBeGreaterThan(10)
      expect(reason.includes('\n')).toBe(false)
      expect(wrUniverse.has(k)).toBe(true)
    }

    // 4. Every key in the vendored GO stat universe MUST be in Real, Buff, or Excluded
    const unmappedKeys: string[] = []
    for (const key of wrUniverse) {
      if (!realSet.has(key) && !buffSet.has(key) && !excludedSet.has(key)) {
        unmappedKeys.push(key)
      }
    }
    expect(
      unmappedKeys,
      `Unmapped GO stat keys detected: ${unmappedKeys.join(', ')}`
    ).toEqual([])

    // 5. Every extracted key must exist in the GO universe and have a human-readable label
    for (const key of ALL_EXTRACTED_STAT_KEYS) {
      expect(
        wrUniverse.has(key),
        `Extracted key '${key}' not found in GO wrUniverse`
      ).toBe(true)
      const label = STAT_LABELS[key]
      expect(
        typeof label === 'string' && label.trim().length > 0,
        `Missing STAT_LABELS entry for '${key}'`
      ).toBe(true)
      expect(getStatLabel(key)).toBe(label)
    }
  })

  it('acceptance (a): official/zibai-lunar-crystallize in empty-account context extracts Zibai Geo CRIT Rate +10% & Geo CRIT DMG +30% attributed to Illuga, removes them when a1AfterSkillBurst is off, and extracts Geo resonance', () => {
    const preset = getBundledPreset('official/zibai-lunar-crystallize')
    expect(preset).toBeDefined()
    const session = createSession({})

    const res = session.evaluate(preset!)
    const zibaiMember = res.memberStats?.Zibai
    expect(zibaiMember).toBeDefined()

    // 1. Geo CRIT Rate +10% and Geo CRIT DMG +30% attributed to Illuga
    expect(res.stats.geo_critRate_).toBeCloseTo(0.1, 6)
    expect(res.stats.geo_critDMG_).toBeCloseTo(0.3, 6)
    expect(zibaiMember!.final.geo_critRate_).toBeCloseTo(0.1, 6)
    expect(zibaiMember!.final.geo_critDMG_).toBeCloseTo(0.3, 6)

    const geoCrBreakdown = res.statBreakdowns?.geo_critRate_
    const geoCdBreakdown = res.statBreakdowns?.geo_critDMG_
    expect(geoCrBreakdown).toBeDefined()
    expect(geoCdBreakdown).toBeDefined()
    expect(formatBuffSourceAttribution(geoCrBreakdown)).toBe('Illuga')
    expect(formatBuffSourceAttribution(geoCdBreakdown)).toBe('Illuga')
    expect(
      formatSignedBuffValue('geo_critRate_', res.stats.geo_critRate_!)
    ).toBe('+10%')
    expect(
      formatSignedBuffValue('geo_critDMG_', res.stats.geo_critDMG_!)
    ).toBe('+30%')

    // Member breakdowns on Zibai also carry the same attribution
    expect(
      formatBuffSourceAttribution(zibaiMember!.statBreakdowns?.geo_critRate_)
    ).toBe('Illuga')
    expect(
      formatBuffSourceAttribution(zibaiMember!.statBreakdowns?.geo_critDMG_)
    ).toBe('Illuga')

    // 2. Geo Resonance visible in Zibai's stats:
    // - Enduring Rock: shield_ +15% (Other) and all_dmg_ +15% (DMG%)
    // - Enduring Rock hit: geo_enemyRes_ -20% attributed to Elemental Resonance (plus Linnea -30% = -50% total)
    expect(res.stats.all_dmg_).toBeGreaterThanOrEqual(0.15 - 1e-6)
    expect(res.stats.shield_).toBeGreaterThanOrEqual(0.15 - 1e-6)
    expect(
      res.statBreakdowns?.all_dmg_?.contributors.some(
        (c) => c.category === 'resonance' && Math.abs(c.value - 0.15) < 1e-6
      )
    ).toBe(true)
    expect(
      res.statBreakdowns?.shield_?.contributors.some(
        (c) => c.category === 'resonance' && Math.abs(c.value - 0.15) < 1e-6
      )
    ).toBe(true)
    expect(res.stats.geo_enemyRes_).toBeCloseTo(-0.5, 6)
    expect(
      res.statBreakdowns?.geo_enemyRes_?.contributors.some(
        (c) => c.category === 'resonance' && Math.abs(c.value - -0.2) < 1e-6
      )
    ).toBe(true)
    expect(
      formatBuffSourceAttribution(res.statBreakdowns?.geo_enemyRes_)
    ).toContain('Elemental Resonance')
    expect(
      formatBuffSourceAttribution(res.statBreakdowns?.geo_enemyRes_)
    ).toContain('Linnea')
    // Inactive enemy elements have 0 net modifier (enemy 10% base RES is not leaked as a fake buff)
    expect(res.stats.pyro_enemyRes_).toBeCloseTo(0, 6)
    expect(res.statBreakdowns?.pyro_enemyRes_?.contributors).toEqual([])

    // 3. Turning off Illuga's a1AfterSkillBurst removes Geo CRIT Rate +10% and Geo CRIT DMG +30%
    const resIllugaOff = session.evaluate(preset!, {
      memberConditionals: {
        Illuga: {
          Illuga: {
            a1AfterSkillBurst: 'off',
          },
        },
      },
    })
    expect(resIllugaOff.stats.geo_critRate_).toBeCloseTo(0, 6)
    expect(resIllugaOff.stats.geo_critDMG_).toBeCloseTo(0, 6)
    expect(resIllugaOff.memberStats?.Zibai?.final.geo_critRate_).toBeCloseTo(
      0,
      6
    )
    expect(resIllugaOff.memberStats?.Zibai?.final.geo_critDMG_).toBeCloseTo(
      0,
      6
    )
  })

  it('acceptance (b): Shenhe cryo_dmgInc, Yun Jin normal_dmgInc, and Nahida C2 reaction CRIT appear for the affected member with source attribution', () => {
    const session = createSession({})

    // (b1) Shenhe Cryo flat DMG increase (cryo_dmgInc) on Ayaka
    const shenhePreset: Preset = {
      id: 'test/shenhe-cryo-dmginc',
      name: 'Shenhe Cryo Quill Test',
      source: 'official',
      target: 'KamisatoAyaka',
      team: [
        {
          key: 'KamisatoAyaka',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 10, skill: 10, burst: 10 },
              },
              weapon: {
                key: 'MistsplitterReforged',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'atk_',
                  goblet: 'cryo_dmg_',
                  circlet: 'critDMG_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'Shenhe',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 6, skill: 10, burst: 10 },
              },
              weapon: {
                key: 'CalamityQueller',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'atk_',
                  goblet: 'atk_',
                  circlet: 'atk_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {
            Shenhe: {
              quill: 'quill',
            },
          },
        },
      ],
      rotation: {
        name: 'Ayaka Skill',
        targets: [{ path: ['skill', 'press'], count: 1 }],
      },
    }

    const shenheRes = session.evaluate(shenhePreset)
    expect(shenheRes.stats.cryo_dmgInc).toBeGreaterThan(500)
    expect(
      shenheRes.memberStats?.KamisatoAyaka?.final.cryo_dmgInc
    ).toBeCloseTo(shenheRes.stats.cryo_dmgInc!, 5)
    expect(
      formatBuffSourceAttribution(shenheRes.statBreakdowns?.cryo_dmgInc)
    ).toBe('Shenhe')

    // (b2) Yun Jin Normal-attack flat DMG increase (normal_dmgInc) on Yoimiya
    const yunjinPreset: Preset = {
      id: 'test/yunjin-normal-dmginc',
      name: 'Yun Jin Normal DMG Inc Test',
      source: 'user',
      target: 'Yoimiya',
      team: [
        {
          key: 'Yoimiya',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 10, skill: 10, burst: 8 },
              },
              weapon: {
                key: 'ThunderingPulse',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'atk_',
                  goblet: 'pyro_dmg_',
                  circlet: 'critRate_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'YunJin',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 6, skill: 9, burst: 10 },
              },
              weapon: {
                key: 'FavoniusLance',
                level: 90,
                ascension: 6,
                refinement: 5,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'def_',
                  goblet: 'def_',
                  circlet: 'def_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {
            YunJin: {
              skill: 'on',
            },
          },
        },
      ],
      rotation: {
        name: 'Yoimiya N1',
        targets: [{ path: ['normal', '0'], count: 1 }],
      },
    }

    const yunjinRes = session.evaluate(yunjinPreset)
    expect(yunjinRes.stats.normal_dmgInc).toBeGreaterThan(400)
    expect(yunjinRes.memberStats?.Yoimiya?.final.normal_dmgInc).toBeCloseTo(
      yunjinRes.stats.normal_dmgInc!,
      5
    )
    expect(
      formatBuffSourceAttribution(yunjinRes.statBreakdowns?.normal_dmgInc)
    ).toBe('Yun Jin')

    // (b3) Nahida C2 reaction CRIT on Alhaitham
    const nahidaC2Preset: Preset = {
      id: 'test/nahida-c2-reaction-crit',
      name: 'Nahida C2 Reaction CRIT Test',
      source: 'user',
      target: 'Alhaitham',
      team: [
        {
          key: 'Alhaitham',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 10, skill: 10, burst: 10 },
              },
              weapon: {
                key: 'LightOfFoliarIncision',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'eleMas',
                  goblet: 'dendro_dmg_',
                  circlet: 'critRate_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'Nahida',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 2,
                talent: { auto: 6, skill: 10, burst: 10 },
              },
              weapon: {
                key: 'AThousandFloatingDreams',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'eleMas',
                  goblet: 'eleMas',
                  circlet: 'eleMas',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {
            Nahida: {
              c2Bloom: 'on',
            },
          },
        },
      ],
      rotation: {
        name: 'Alhaitham Skill',
        targets: [{ path: ['skill', 'rushDmg'], count: 1 }],
      },
    }

    const nahidaRes = session.evaluate(nahidaC2Preset)
    for (const rx of ['burning', 'bloom', 'hyperbloom', 'burgeon'] as const) {
      expect(nahidaRes.stats[`${rx}_critRate_`]).toBeCloseTo(0.2, 6)
      expect(nahidaRes.stats[`${rx}_critDMG_`]).toBeCloseTo(1.0, 6)
      expect(
        formatBuffSourceAttribution(
          nahidaRes.statBreakdowns?.[`${rx}_critRate_`]
        )
      ).toBe('Nahida')
      expect(
        formatBuffSourceAttribution(
          nahidaRes.statBreakdowns?.[`${rx}_critDMG_`]
        )
      ).toBe('Nahida')
    }
    expect(nahidaRes.stats.lunarbloom_critRate_).toBeCloseTo(0.1, 6)
    expect(nahidaRes.stats.lunarbloom_critDMG_).toBeCloseTo(0.2, 6)
    expect(
      formatBuffSourceAttribution(
        nahidaRes.statBreakdowns?.lunarbloom_critRate_
      )
    ).toBe('Nahida')
  })

  it('acceptance (c): RES% and Healing Bonus rows are extracted whenever non-zero', () => {
    const session = createSession({
      format: 'GOOD',
      version: 2,
      source: 'test',
      characters: [
        {
          key: 'Bennett',
          level: 90,
          ascension: 6,
          constellation: 5,
          talent: { auto: 6, skill: 9, burst: 10 },
        },
      ],
      weapons: [
        {
          id: 'w_bennett',
          key: 'AquilaFavonia',
          level: 90,
          ascension: 6,
          refinement: 1,
          location: 'Bennett',
          lock: false,
        },
      ],
      artifacts: [
        {
          id: 'art_hb_circlet',
          setKey: 'MaidenBeloved',
          slotKey: 'circlet',
          level: 20,
          rarity: 5,
          mainStatKey: 'heal_',
          location: 'Bennett',
          lock: false,
          substats: [],
        },
        {
          id: 'art_mb_flower',
          setKey: 'MaidenBeloved',
          slotKey: 'flower',
          level: 20,
          rarity: 5,
          mainStatKey: 'hp',
          location: 'Bennett',
          lock: false,
          substats: [],
        },
      ],
    })
    const resAndHealPreset: Preset = {
      id: 'test/res-and-heal',
      name: 'RES% and Healing Bonus Test',
      source: 'official',
      target: 'Bennett',
      team: [
        {
          key: 'Bennett',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 5,
                talent: { auto: 6, skill: 9, burst: 10 },
              },
              weapon: {
                key: 'AquilaFavonia',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: { MaidenBeloved: 2 },
                mainStats: {
                  sands: 'enerRech_',
                  goblet: 'hp_',
                  circlet: 'heal_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'Furina',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 6, skill: 10, burst: 10 },
              },
              weapon: {
                key: 'FavoniusSword',
                level: 90,
                ascension: 6,
                refinement: 5,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'hp_',
                  goblet: 'hp_',
                  circlet: 'critRate_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'KaedeharaKazuha',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 6, skill: 9, burst: 9 },
              },
              weapon: {
                key: 'IronSting',
                level: 90,
                ascension: 6,
                refinement: 5,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'eleMas',
                  goblet: 'eleMas',
                  circlet: 'eleMas',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
        {
          key: 'Xilonen',
          build: {
            type: 'tc',
            tc: {
              character: {
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 6, skill: 10, burst: 9 },
              },
              weapon: {
                key: 'PeakPatrolSong',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifacts: {
                sets: {},
                mainStats: {
                  sands: 'def_',
                  goblet: 'def_',
                  circlet: 'def_',
                },
                substats: {
                  type: 'max',
                  rolls: {},
                },
              },
            },
          },
          conditional: {},
        },
      ],
      teamConditional: {
        resonance: {
          ProtectiveCanopy: 'on',
        },
      },
      rotation: {
        name: 'Bennett Burst',
        targets: [{ path: ['burst', 'dmg'], count: 1 }],
      },
    }

    const res = session.evaluate(resAndHealPreset)
    expect(OTHER_REAL_STAT_KEYS).toContain('heal_')
    expect(res.stats.heal_).toBeGreaterThan(0.5)
    expect(res.memberStats?.Bennett?.final.heal_).toBeCloseTo(
      res.stats.heal_!,
      6
    )

    // 4-element Protective Canopy grants +15% to all 7 elemental RES% stats
    for (const eleResKey of RES_REAL_STAT_KEYS.filter(
      (k) => k !== 'physical_res_'
    )) {
      expect(res.stats[eleResKey]).toBeCloseTo(0.15, 6)
      expect(
        formatBuffSourceAttribution(res.statBreakdowns?.[eleResKey])
      ).toContain('Elemental Resonance')
    }
  })
})
