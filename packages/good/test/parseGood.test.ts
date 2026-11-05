import { SandboxStorage } from '@genshin-optimizer/common/database'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { parseGood } from '../src/parseGood'

const samplePath = resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json')
const sampleText = readFileSync(samplePath, 'utf8')

describe('parseGood', () => {
  it('parses the GO sample GOOD file with exact counts and 0 fatal/error issues', () => {
    const res = parseGood(sampleText)
    expect(res.ok).toBe(true)
    expect(res.summary.issueCounts.fatal).toBe(0)
    expect(res.summary.issueCounts.error).toBe(0)
    expect(res.summary.characters.imported).toBe(81)
    expect(res.summary.weapons.imported).toBe(191)
    expect(res.summary.artifacts.imported).toBe(1157)
    // GO-only sections reported as info
    expect(res.issues.some((i) => i.severity === 'info' && i.message.includes('Ignored Genshin Optimizer'))).toBe(true)

    // Parity with GO ArtCharDatabase.importGOOD
    const db = new ArtCharDatabase(1, new SandboxStorage())
    db.importGOOD(res.good as never, false, false, false)
    expect(db.chars.keys.length).toBe(81)
    expect(db.weapons.keys.length).toBe(191)
    expect(db.arts.keys.length).toBe(1157)
  })

  it('reports line and column on invalid JSON', () => {
    const bad = '{\n  "format": "GOOD",\n  "version": \n}'
    const res = parseGood(bad)
    expect(res.ok).toBe(false)
    expect(res.issues[0]?.severity).toBe('fatal')
    expect(res.issues[0]?.path).toMatch(/line \d+, col \d+/)
  })

  it('strips UTF-8 BOM silently and warns on trailing garbage', () => {
    const text = '\uFEFF' + JSON.stringify({
      format: 'GOOD',
      version: 2,
      source: 'Irminsul',
      characters: [{ key: 'Furina', level: 90, ascension: 6, constellation: 0, talent: { auto: 1, skill: 10, burst: 10 } }],
    }) + '\n// scanner log line'
    const res = parseGood(text)
    expect(res.ok).toBe(true)
    expect(res.summary.characters.imported).toBe(1)
    expect(res.issues.some((i) => i.severity === 'warning' && i.message.includes('trailing'))).toBe(true)
  })

  it('rejects Enka.Network / UID showcase JSON plainly', () => {
    const enka = JSON.stringify({ playerInfo: { nickname: 'Test' }, avatarInfoList: [], uid: '800000000' })
    const res = parseGood(enka)
    expect(res.ok).toBe(false)
    expect(res.issues[0]?.severity).toBe('fatal')
    expect(res.issues[0]?.message).toMatch(/showcase data/i)
  })

  it('suggests critRate_ when substat key is critRate and skips the bad artifact', () => {
    const doc = {
      format: 'GOOD',
      version: 2,
      source: 'Scanner',
      characters: [{ key: 'Furina', level: 90, ascension: 6, constellation: 0, talent: { auto: 1, skill: 9, burst: 9 } }],
      artifacts: [
        {
          setKey: 'GoldenTroupe',
          slotKey: 'flower',
          level: 20,
          rarity: 5,
          mainStatKey: 'hp',
          location: 'Furina',
          lock: true,
          substats: [{ key: 'critRate', value: 10.5 }],
        },
      ],
    }
    const res = parseGood(doc)
    expect(res.ok).toBe(true)
    expect(res.summary.artifacts.skipped).toBe(1)
    const err = res.issues.find((i) => i.path === 'artifacts[0].substats[0].key')
    expect(err?.severity).toBe('error')
    expect(err?.message).toContain("did you mean 'critRate_'?")
  })

  it('skips unknown character/weapon/set keys with a warning and imports remaining items', () => {
    const doc = {
      format: 'GOOD',
      version: 3,
      source: 'Irminsul',
      characters: [
        { key: 'FutureArchon2099', level: 90, ascension: 6, constellation: 0, talent: { auto: 10, skill: 10, burst: 10 } },
        { key: 'Furina', level: 90, ascension: 6, constellation: 0, talent: { auto: 1, skill: 10, burst: 10 } },
      ],
    }
    const res = parseGood(doc)
    expect(res.ok).toBe(true)
    expect(res.summary.characters.imported).toBe(1)
    expect(res.summary.characters.skipped).toBe(1)
    expect(res.issues.some((i) => i.path === 'characters[0].key' && i.severity === 'warning')).toBe(true)
  })

  it('clamps out-of-range talent levels and reassigns duplicate IDs with warnings', () => {
    const doc = {
      format: 'GOOD',
      version: 2,
      source: 'Irminsul',
      characters: [
        { key: 'Furina', level: 90, ascension: 6, constellation: 3, talent: { auto: 1, skill: 13, burst: 13 } },
      ],
      weapons: [
        { id: 'dup_w', key: 'FesteringDesire', level: 90, ascension: 6, refinement: 7, location: 'Furina', lock: true },
        { id: 'dup_w', key: 'FavoniusSword', level: 90, ascension: 6, refinement: 5, location: '', lock: false },
      ],
    }
    const res = parseGood(doc)
    expect(res.ok).toBe(true)
    expect(res.good?.characters[0]?.talent.skill).toBe(10)
    expect(res.good?.weapons[0]?.refinement).toBe(5)
    expect(res.good?.weapons[0]?.id).toBe('dup_w')
    expect(res.good?.weapons[1]?.id).not.toBe('dup_w')
  })
})

