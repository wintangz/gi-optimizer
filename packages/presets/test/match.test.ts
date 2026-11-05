import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  getBundledPreset,
  getPresetBadge,
  listBundledPresets,
  matchAccount,
  validatePreset,
} from '../src'

const sampleGood = JSON.parse(
  readFileSync(resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'), 'utf8')
)

describe('matchAccount & bundled presets', () => {
  it('validates all bundled Akasha and Official presets', () => {
    const all = listBundledPresets()
    expect(all.length).toBeGreaterThanOrEqual(11)
    for (const p of all) {
      const res = validatePreset(p)
      expect(res.ok, `${p.id}: ${JSON.stringify(res.issues)}`).toBe(true)
    }
  })

  it('passes matchAccount for Furina C0 + PJC R1 on the sample GOOD file', () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const report = matchAccount(preset, sampleGood)
    expect(report.canRun).toBe(true)
    expect(report.parts.every((p) => p.ok)).toBe(true)
  })

  it('fails matchAccount plainly when constellation and weapon do not match (Furina C2 + Splendor)', () => {
    const preset = getBundledPreset('akasha/furina-splendor-c2')!
    const report = matchAccount(preset, sampleGood)
    expect(report.canRun).toBe(false)
    const consPart = report.parts.find((p) => p.part === 'constellation')!
    expect(consPart.ok).toBe(false)
    expect(consPart.message).toBe('Preset needs Furina C2 — you have C0.')
    const weapPart = report.parts.find((p) => p.part === 'weapon')!
    expect(weapPart.ok).toBe(false)
    expect(weapPart.message).toContain('Preset needs Splendor of Tranquil Waters R1')
    expect(weapPart.message).toContain('Primordial Jade Cutter R1')
  })

  it('offers owned weapon candidate when target has a different weapon equipped (Neuvillette + Prototype Amber R5 on Charlotte)', () => {
    const preset = getBundledPreset('akasha/neuvillette-hypercarry-protoamber-c0')!
    const report1 = matchAccount(preset, sampleGood)
    expect(report1.canRun).toBe(false)
    const weapPart = report1.parts.find((p) => p.part === 'weapon')!
    expect(weapPart.ok).toBe(false)
    expect(weapPart.message).toContain('select it to continue')
    expect(weapPart.candidates?.length).toBeGreaterThan(0)

    const candidateId = weapPart.candidates![0]!.id
    const report2 = matchAccount(preset, sampleGood, { selectedWeaponId: candidateId })
    expect(report2.canRun).toBe(true)
    expect(report2.selectedWeaponId).toBe(candidateId)
  })

  it('reports missing character plainly without checking further parts', () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const report = matchAccount(preset, { characters: [], weapons: [] })
    expect(report.canRun).toBe(false)
    expect(report.parts).toHaveLength(1)
    expect(report.parts[0]?.part).toBe('owned')
    expect(report.parts[0]?.message).toBe(
      'Preset needs Furina — Furina is not in your imported account.'
    )
  })

  it('passes all 6 Official presets against the sample GOOD file regardless of equipped weapon', () => {
    const officials = listBundledPresets({ source: 'official' })
    expect(officials).toHaveLength(6)
    for (const p of officials) {
      const report = matchAccount(p, sampleGood)
      expect(report.canRun, p.id).toBe(true)
      const badge = getPresetBadge(p)
      expect(badge.kind).toBe('official')
      expect(badge.label).toBe('Official')
    }
  })
})

