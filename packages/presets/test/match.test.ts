import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  getBundledPreset,
  getPresetBadge,
  listBundledPresets,
  matchAccount,
  type Preset,
  validatePreset,
} from '../src'

const sampleGood = JSON.parse(
  readFileSync(resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'), 'utf8')
)

describe('matchAccount & bundled presets', () => {
  it('validates all bundled Akasha and Official presets and verifies Akasha target builds are fixed', () => {
    const all = listBundledPresets()
    expect(all.length).toBeGreaterThanOrEqual(11)
    for (const p of all) {
      const res = validatePreset(p)
      expect(res.ok, `${p.id}: ${JSON.stringify(res.issues)}`).toBe(true)
      if (p.source === 'akasha') {
        expect(p.team[0]?.build.type).toBe('fixed')
        if (p.team[0]?.build.type === 'fixed') {
          expect(p.team[0].build.character.level).toBe(90)
          expect(p.team[0].build.character.ascension).toBe(6)
          expect(p.team[0].build.character.talent).toEqual({
            auto: 10,
            skill: 10,
            burst: 10,
          })
          expect(p.team[0].build.weapon.level).toBe(90)
          expect(p.team[0].build.weapon.ascension).toBe(6)
        }
      } else {
        expect(p.team[0]?.build.type).toBe('owned')
      }
    }
  })

  it('bypasses account gating for all Akasha presets even when characters and weapons are empty (akasha-artifact-only-mode)', () => {
    const akashaPresets = listBundledPresets({ source: 'akasha' })
    expect(akashaPresets).toHaveLength(24)
    for (const preset of akashaPresets) {
      const reportEmpty = matchAccount(preset, { characters: [], weapons: [] })
      expect(reportEmpty.canRun).toBe(true)
      expect(reportEmpty.parts).toEqual([])

      const reportSample = matchAccount(preset, sampleGood)
      expect(reportSample.canRun).toBe(true)
      expect(reportSample.parts).toEqual([])
    }
  })

  it('rejects Akasha presets whose team[0].build.type is owned', () => {
    const akasha = structuredClone(getBundledPreset('akasha/furina-salon-pjc-c0')!)
    ;(akasha.team[0] as any).build = { type: 'owned' }
    const res = validatePreset(akasha)
    expect(res.ok).toBe(false)
    expect(res.issues.some((i) => i.message.includes('fixed'))).toBe(true)
  })

  it('enforces matchAccount on non-Akasha presets when constellation and weapon do not match', () => {
    const officialBase = getBundledPreset('official/furina-salon-subdps')!
    const strictPreset: Preset = {
      ...structuredClone(officialBase),
      id: 'user/furina-splendor-c2-strict',
      source: 'user',
      team: [
        {
          ...structuredClone(officialBase.team[0]!),
          build: { type: 'owned' },
          requirement: {
            constellation: 2,
            weapon: { key: 'SplendorOfTranquilWaters', refinement: 1 },
          },
        },
        ...structuredClone(officialBase.team.slice(1)),
      ],
    }

    const report = matchAccount(strictPreset, sampleGood)
    expect(report.canRun).toBe(false)
    const consPart = report.parts.find((p) => p.part === 'constellation')!
    expect(consPart.ok).toBe(false)
    expect(consPart.message).toBe('Preset needs Furina C2 — you have C0.')
    const weapPart = report.parts.find((p) => p.part === 'weapon')!
    expect(weapPart.ok).toBe(false)
    expect(weapPart.message).toContain('Preset needs Splendor of Tranquil Waters R1')
    expect(weapPart.message).toContain('Primordial Jade Cutter R1')
  })

  it('offers owned weapon candidate on non-Akasha presets when target has a different weapon equipped', () => {
    const officialBase = getBundledPreset('official/neuvillette-hypercarry')!
    const protoAmberPreset: Preset = {
      ...structuredClone(officialBase),
      id: 'user/neuvillette-protoamber-strict',
      source: 'user',
      team: [
        {
          ...structuredClone(officialBase.team[0]!),
          build: { type: 'owned' },
          requirement: {
            constellation: 0,
            weapon: { key: 'PrototypeAmber', refinement: 5 },
          },
        },
        ...structuredClone(officialBase.team.slice(1)),
      ],
    }

    const report1 = matchAccount(protoAmberPreset, sampleGood)
    expect(report1.canRun).toBe(false)
    const weapPart = report1.parts.find((p) => p.part === 'weapon')!
    expect(weapPart.ok).toBe(false)
    expect(weapPart.message).toContain('select it to continue')
    expect(weapPart.candidates?.length).toBeGreaterThan(0)

    const candidateId = weapPart.candidates![0]!.id
    const report2 = matchAccount(protoAmberPreset, sampleGood, { selectedWeaponId: candidateId })
    expect(report2.canRun).toBe(true)
    expect(report2.selectedWeaponId).toBe(candidateId)
  })

  it('reports missing character plainly on Official/User presets without checking further parts', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const report = matchAccount(preset, { characters: [], weapons: [] })
    expect(report.canRun).toBe(false)
    expect(report.parts).toHaveLength(1)
    expect(report.parts[0]?.part).toBe('owned')
    expect(report.parts[0]?.message).toBe(
      'Preset needs Furina — Furina is not in your imported account.'
    )
  })

  it('passes all Official presets against the sample GOOD file regardless of equipped weapon', () => {
    const officials = listBundledPresets({ source: 'official' })
    expect(officials).toHaveLength(13)
    for (const p of officials) {
      const hasTargetInSample = sampleGood.characters.some(
        (c: { key: string }) => c.key === p.target
      )
      const account = hasTargetInSample
        ? sampleGood
        : {
            ...sampleGood,
            characters: [
              ...sampleGood.characters,
              {
                key: p.target,
                level: 90,
                ascension: 6,
                constellation: 0,
                talent: { auto: 9, skill: 9, burst: 9 },
              },
            ],
          }
      const report = matchAccount(p, account)
      expect(report.canRun, p.id).toBe(true)
      const badge = getPresetBadge(p)
      expect(badge.kind).toBe('official')
      expect(badge.label).toBe('Official')
    }
  })

  it('drops weapon names and refinements from all bundled preset display names while keeping case descriptors and akasha provenance notes (preset-names-drop-weapon)', () => {
    expect(getBundledPreset('akasha/furina-salon-pjc-c0')?.name).toBe(
      'Furina — Salon Solitaire (Avg 200 Fanfare)'
    )
    expect(getBundledPreset('akasha/furina-splendor-c2')?.name).toBe(
      'Furina — Salon Solitaire C2'
    )
    expect(getBundledPreset('akasha/hutao-double-hydro-homa-c1')?.name).toBe(
      'Hu Tao — Double Hydro Vaporize Combo (C1)'
    )
    expect(
      getBundledPreset('akasha/neuvillette-hypercarry-protoamber-c0')?.name
    ).toBe('Neuvillette — Hypercarry Double Hydro')
    expect(
      getBundledPreset('akasha/raiden-hypercarry-scarlet-c0')?.name
    ).toBe('Raiden Shogun — Hypercarry (Sara C6 + Kazuha + Bennett)')

    const forbiddenWeaponPatterns = [
      /\bR[1-5]\b/,
      /Primordial Jade Cutter/i,
      /PJC\b/i,
      /Splendor/i,
      /Staff of Homa/i,
      /\bHoma\b/i,
      /Prototype Amber/i,
      /Scarlet Sands/i,
    ]

    for (const p of listBundledPresets()) {
      for (const pat of forbiddenWeaponPatterns) {
        expect(p.name, `${p.id} name "${p.name}" matched ${pat}`).not.toMatch(
          pat
        )
      }
      if (p.source === 'akasha') {
        expect(p.akasha?.notes.length).toBeGreaterThan(20)
      }
    }
  })
})
