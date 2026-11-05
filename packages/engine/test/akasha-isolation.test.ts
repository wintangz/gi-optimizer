import { getBundledPreset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { createSession, DEFAULT_OPTIMIZER_SETTINGS } from '../src'

describe('Akasha Artifact-Only Mode & Teammate Isolation (akasha-artifact-only-mode & akasha-presets)', () => {
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

  it('(1) two GOOD files with identical artifacts but different target-character constellation/level/talents/weapon ownership give IDENTICAL Akasha results for the same chosen weapon', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const targetKey = preset.target // 'Furina'

    // GOOD file 1: Furina Lv. 1,Asc 0, C0, talent 1/1/1, Dull Blade R1
    const goodLowChar = {
      format: 'GOOD',
      version: 3,
      source: 'LowFurinaTest',
      characters: [
        {
          key: targetKey,
          level: 1,
          ascension: 0,
          constellation: 0,
          talent: { auto: 1, skill: 1, burst: 1 },
        },
      ],
      weapons: [
        {
          id: 'w_dull',
          key: 'DullBlade',
          level: 1,
          ascension: 0,
          refinement: 1,
          location: targetKey,
          lock: false,
        },
      ],
      artifacts: structuredClone(baseArtifacts),
    }

    // GOOD file 2: Furina Lv. 90, Asc 6, C6, talent 10/10/10, Key of Khaj-Nisut R5
    const goodMaxChar = {
      format: 'GOOD',
      version: 3,
      source: 'MaxFurinaTest',
      characters: [
        {
          key: targetKey,
          level: 90,
          ascension: 6,
          constellation: 6,
          talent: { auto: 10, skill: 10, burst: 10 },
        },
      ],
      weapons: [
        {
          id: 'w_key',
          key: 'KeyOfKhajNisut',
          level: 90,
          ascension: 6,
          refinement: 5,
          location: targetKey,
          lock: true,
        },
      ],
      artifacts: structuredClone(baseArtifacts),
    }

    const sessionLow = createSession(goodLowChar)
    const sessionMax = createSession(goodMaxChar)

    // Evaluate with default Akasha weapon (PJC R1)
    const evalLowDefault = sessionLow.evaluate(preset)
    const evalMaxDefault = sessionMax.evaluate(preset)

    expect(evalLowDefault.total).toBeGreaterThan(0)
    expect(evalMaxDefault.total).toBe(evalLowDefault.total)
    expect(evalMaxDefault.instances).toEqual(evalLowDefault.instances)
    expect(evalMaxDefault.stats).toEqual(evalLowDefault.stats)

    // Evaluate with an explicit chosen weapon (HarbingerOfDawn R5)
    const chosenWeapon = { key: 'HarbingerOfDawn', refinement: 5 }
    const evalLowChosen = sessionLow.evaluate(preset, {
      artifactIds: sessionLow.currentBuild(preset).artifactIds,
      weaponOverride: chosenWeapon,
    })
    const evalMaxChosen = sessionMax.evaluate(preset, {
      artifactIds: sessionMax.currentBuild(preset).artifactIds,
      weaponOverride: chosenWeapon,
    })
    expect(evalMaxChosen.total).toBe(evalLowChosen.total)
    expect(evalMaxChosen.instances).toEqual(evalLowChosen.instances)
    expect(evalMaxChosen.stats).toEqual(evalLowChosen.stats)

    // Optimize with the same chosen weapon
    const optSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: false,
      topN: 3,
    }
    const optLow = await sessionLow.optimize(preset, optSettings, {
      weaponOverride: chosenWeapon,
    })
    const optMax = await sessionMax.optimize(preset, optSettings, {
      weaponOverride: chosenWeapon,
    })

    expect(optMax.builds).toEqual(optLow.builds)
    expect(optMax.tested).toBe(optLow.tested)
  })

  it('(2) a GOOD file where the target character does not exist at all still optimises an Akasha preset identically', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!

    // Convert artifacts so none reference Furina at all (all unequipped), and characters/weapons are completely empty
    const unequippedArtifacts = structuredClone(baseArtifacts).map((a) => ({
      ...a,
      location: '',
    }))

    const goodNoChars = {
      format: 'GOOD',
      version: 3,
      source: 'ArtifactOnlyGood',
      characters: [],
      weapons: [],
      artifacts: unequippedArtifacts,
    }

    const goodWithFurina = {
      format: 'GOOD',
      version: 3,
      source: 'OwnedFurinaGood',
      characters: [
        {
          key: 'Furina',
          level: 70,
          ascension: 4,
          constellation: 3,
          talent: { auto: 6, skill: 8, burst: 8 },
        },
      ],
      weapons: [],
      artifacts: structuredClone(unequippedArtifacts),
    }

    const sessionNoChars = createSession(goodNoChars)
    const sessionWithFurina = createSession(goodWithFurina)

    // Current build on unowned character has 0 equipped artifacts
    const curBuild = sessionNoChars.currentBuild(preset)
    expect(Object.keys(curBuild.artifactIds)).toHaveLength(0)
    expect(curBuild.weaponOverride?.key).toBe('PrimordialJadeCutter')

    const optSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: true,
      topN: 3,
    }

    const optNoChars = await sessionNoChars.optimize(preset, optSettings)
    const optWithFurina = await sessionWithFurina.optimize(preset, optSettings)

    expect(optNoChars.builds.length).toBeGreaterThan(0)
    expect(optNoChars.builds[0]!.total).toBeGreaterThan(0)
    expect(optNoChars.builds).toEqual(optWithFurina.builds)

    // Evaluating the top build on the character-less session matches the build's reported total
    const topBuild = optNoChars.builds[0]!
    const evaluatedTop = sessionNoChars.evaluate(preset, {
      artifactIds: topBuild.artifactIds,
    })
    expect(evaluatedTop.total).toBeCloseTo(topBuild.total, 4)
  })

  it('(3) choosing a weapon the user does not own changes the result appropriately vs another weapon and R5 > R1', async () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const goodArtifactsOnly = {
      format: 'GOOD',
      version: 3,
      source: 'WeaponOverrideTest',
      characters: [],
      weapons: [], // User owns zero weapons
      artifacts: structuredClone(baseArtifacts),
    }

    const session = createSession(goodArtifactsOnly)
    const firstBuild = await session.optimize(preset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    const artifactIds = firstBuild.builds[0]!.artifactIds

    const evalDullR1 = session.evaluate(preset, {
      artifactIds,
      weaponOverride: { key: 'DullBlade', refinement: 1 },
    })
    const evalPjcR1 = session.evaluate(preset, {
      artifactIds,
      weaponOverride: { key: 'PrimordialJadeCutter', refinement: 1 },
    })
    const evalPjcR5 = session.evaluate(preset, {
      artifactIds,
      weaponOverride: { key: 'PrimordialJadeCutter', refinement: 5 },
    })
    const evalSplendorR1 = session.evaluate(preset, {
      artifactIds,
      weaponOverride: { key: 'SplendorOfTranquilWaters', refinement: 1 },
    })
    const evalSplendorR5 = session.evaluate(preset, {
      artifactIds,
      weaponOverride: { key: 'SplendorOfTranquilWaters', refinement: 5 },
    })

    // 5★ weapons outperform 1★ Dull Blade
    expect(evalPjcR1.total).toBeGreaterThan(evalDullR1.total)
    expect(evalSplendorR1.total).toBeGreaterThan(evalDullR1.total)

    // R5 outperforms R1 on both PJC and Splendor (proving weapon conditionals are active!)
    expect(evalPjcR5.total).toBeGreaterThan(evalPjcR1.total)
    expect(evalSplendorR5.total).toBeGreaterThan(evalSplendorR1.total)

    // PJC vs Splendor produce distinct totals and stats
    expect(evalSplendorR1.total).not.toBe(evalPjcR1.total)
    expect(evalSplendorR1.stats.critDMG_).toBeGreaterThan(
      evalPjcR1.stats.critDMG_!
    )
    expect(evalPjcR1.stats.critRate_).toBeGreaterThan(
      evalSplendorR1.stats.critRate_!
    )
  })

  it('(4) evaluates and optimises an Akasha preset to identical results when teammates in GOOD are missing, mutated, or have different gear', async () => {
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

    const goodB = {
      format: 'GOOD',
      version: 3,
      source: 'TeammateIsolationTest',
      characters: [structuredClone(furinaChar)],
      weapons: structuredClone(furinaWeapons),
      artifacts: structuredClone(baseArtifacts),
    }

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
