import { getBundledPreset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { createSession, DEFAULT_OPTIMIZER_SETTINGS } from '../src'

describe('Akasha Preset Teammate Isolation Regression (akasha-presets)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )

  // Keep a small deterministic pool of Furina's + unequipped artifacts so optimization runs quickly
  const slotCounts: Record<string, number> = {}
  const baseArtifacts = (fullGood.artifacts as any[]).filter((a) => {
    if (a.location === 'Furina') return true
    if (a.location === '') {
      const c = slotCounts[a.slotKey] ?? 0
      if (c < 2) {
        slotCounts[a.slotKey] = c + 1
        return true
      }
    }
    return false
  })

  it('evaluates and optimises an Akasha preset to identical results when teammates in GOOD are missing, mutated, or have different gear', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const targetKey = preset.target // 'Furina'

    const furinaChar = (fullGood.characters as any[]).find(
      (c) => c.key === targetKey
    )!
    const furinaWeapons = (fullGood.weapons as any[]).filter(
      (w) => w.location === targetKey || w.key === 'PrimordialJadeCutter'
    )
    const otherWeapons = (fullGood.weapons as any[]).filter(
      (w) => w.location !== targetKey && w.key !== 'PrimordialJadeCutter'
    )

    // GOOD file A: full character roster and weapons, plus some extra teammate-equipped artifacts
    const goodA = {
      format: 'GOOD',
      version: 3,
      source: 'TeammateIsolationFull',
      characters: structuredClone(fullGood.characters),
      weapons: [
        ...structuredClone(furinaWeapons),
        ...structuredClone(otherWeapons),
      ],
      artifacts: [
        ...structuredClone(baseArtifacts),
        {
          id: 'teammate_art_kazuha',
          setKey: 'ViridescentVenerer',
          slotKey: 'flower',
          level: 20,
          rarity: 5,
          mainStatKey: 'hp',
          location: 'KaedeharaKazuha',
          lock: true,
          substats: [
            { key: 'eleMas', value: 100 },
            { key: 'enerRech_', value: 20 },
          ],
        },
      ],
    }

    // GOOD file B:
    // 1. Delete all teammates (Neuvillette, KaedeharaKazuha, Baizhu) and every non-Furina character from `characters`
    // 2. Delete all teammate weapons (keep only Furina's weapons)
    // 3. Remove the teammate-equipped artifacts (with includeEquippedOnOthers: false, only Furina + unequipped pool is eligible)
    const goodB = {
      format: 'GOOD',
      version: 3,
      source: 'TeammateIsolationTest',
      characters: [structuredClone(furinaChar)],
      weapons: structuredClone(furinaWeapons),
      artifacts: structuredClone(baseArtifacts),
    }

    // GOOD file C: teammates exist in GOOD but with completely different levels (Lv. 1 C0, talent 1/1/1) and 1★ weapons
    const goodC = {
      format: 'GOOD',
      version: 3,
      source: 'TeammateMutatedTest',
      characters: [
        structuredClone(furinaChar),
        {
          key: 'Neuvillette',
          level: 1,
          ascension: 0,
          constellation: 0,
          talent: { auto: 1, skill: 1, burst: 1 },
        },
        {
          key: 'KaedeharaKazuha',
          level: 1,
          ascension: 0,
          constellation: 6,
          talent: { auto: 1, skill: 1, burst: 1 },
        },
        {
          key: 'Baizhu',
          level: 1,
          ascension: 0,
          constellation: 0,
          talent: { auto: 1, skill: 1, burst: 1 },
        },
      ],
      weapons: [
        ...structuredClone(furinaWeapons),
        {
          id: 'dull_kazuha',
          key: 'DullBlade',
          level: 1,
          ascension: 0,
          refinement: 1,
          location: 'KaedeharaKazuha',
          lock: false,
        },
      ],
      artifacts: structuredClone(baseArtifacts),
    }

    const sessionA = createSession(goodA)
    const sessionB = createSession(goodB)
    const sessionC = createSession(goodC)

    const evalA = sessionA.evaluate(preset)
    const evalB = sessionB.evaluate(preset)
    const evalC = sessionC.evaluate(preset)

    expect(evalB.total).toBe(evalA.total)
    expect(evalC.total).toBe(evalA.total)
    expect(evalB.instances).toEqual(evalA.instances)
    expect(evalC.instances).toEqual(evalA.instances)
    expect(evalB.stats).toEqual(evalA.stats)
    expect(evalC.stats).toEqual(evalA.stats)

    const optSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: false,
      topN: 3,
    }

    const optA = await sessionA.optimize(preset, optSettings)
    const optB = await sessionB.optimize(preset, optSettings)
    const optC = await sessionC.optimize(preset, optSettings)

    expect(optB.builds).toEqual(optA.builds)
    expect(optC.builds).toEqual(optA.builds)
    expect(optB.tested).toBe(optA.tested)
    expect(optB.skipped).toBe(optA.skipped)
  })
})

