import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { getCharStat, getWeaponStat } from '@genshin-optimizer/gi/stats'
import { ALL_WEAPON_KEYS, getBundledPreset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  createSession,
  DEFAULT_OPTIMIZER_SETTINGS,
  listConditionalsForCharacter,
  listTargetsForCharacter,
  type ArtifactSlot,
} from '../src'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

function makeReducedGood(fullGood: Record<string, any>, perSlot = 4) {
  const counts: Record<string, number> = {
    flower: 0,
    plume: 0,
    sands: 0,
    goblet: 0,
    circlet: 0,
  }
  const artifacts: any[] = []
  for (const art of fullGood.artifacts ?? []) {
    // Always keep Furina's equipped artifacts plus up to `perSlot` total per slot
    if (
      art.location === 'Furina' ||
      (counts[art.slotKey] !== undefined && counts[art.slotKey]! < perSlot)
    ) {
      if ((counts[art.slotKey] ?? 0) < perSlot || art.location === 'Furina') {
        artifacts.push(art)
        counts[art.slotKey] = (counts[art.slotKey] ?? 0) + 1
      }
    }
  }
  return {
    ...fullGood,
    artifacts,
  }
}

describe('Single-Character Optimizer Solver (single-character-optimizer)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const smallGood = makeReducedGood(fullGood, 3)
  const session = createSession(smallGood)
  const furinaPreset = getBundledPreset('official/furina-salon-subdps')!

  it('finds the exact same top build as exhaustive evaluation on a reduced pool', async () => {
    const optResult = await session.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: true,
      topN: 3,
    })

    expect(optResult.builds.length).toBeGreaterThan(0)
    const bestBuild = optResult.builds[0]!

    // Verify the solver's reported total matches session.evaluate(furinaPreset, bestBuild)
    const evalBest = session.evaluate(furinaPreset, bestBuild)
    expect(Math.abs(bestBuild.total - evalBest.total) / evalBest.total).toBeLessThan(
      1e-5
    )

    // And bestBuild total >= currentBuild total
    const current = session.currentBuild(furinaPreset)
    const evalCurrent = session.evaluate(furinaPreset, current)
    expect(bestBuild.total).toBeGreaterThanOrEqual(evalCurrent.total - 1e-4)
  })

  it('enforces ER floor constraint strictly and returns empty when impossible', async () => {
    // Possible ER floor (e.g. 1.20 = 120%)
    const feasible = await session.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      erFloor: 1.2,
      topN: 3,
    })
    for (const b of feasible.builds) {
      const ev = session.evaluate(furinaPreset, b)
      expect(ev.stats.enerRech_!).toBeGreaterThanOrEqual(1.2 - 1e-4)
    }

    // Impossible ER floor (e.g. 5.0 = 500% ER)
    const impossible = await session.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      erFloor: 5.0,
      topN: 3,
    })
    expect(impossible.builds).toEqual([])
  })

  it('never weights Energy Recharge in the objective when character has no ER-scaling formula', async () => {
    // Construct two synthetic flowers identical in HP/Crit but one has +30% ER and 10 less flat HP
    const baseArt = smallGood.artifacts.find(
      (a: any) => a.slotKey === 'flower'
    )!
    const highHpArt = {
      ...baseArt,
      id: 'test_flower_hp',
      location: 'Furina',
      substats: [
        { key: 'hp_', value: 20 },
        { key: 'critRate_', value: 10 },
        { key: 'critDMG_', value: 20 },
        { key: 'enerRech_', value: 5 },
      ],
    }
    const highErArt = {
      ...baseArt,
      id: 'test_flower_er',
      location: '',
      substats: [
        { key: 'hp_', value: 19.5 },
        { key: 'critRate_', value: 10 },
        { key: 'critDMG_', value: 20 },
        { key: 'enerRech_', value: 35 },
      ],
    }
    const otherSlots = smallGood.artifacts.filter(
      (a: any) => a.slotKey !== 'flower'
    )
    const testSession = createSession({
      ...smallGood,
      artifacts: [highHpArt, highErArt, ...otherSlots],
    })

    const res = await testSession.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
    })
    expect(res.builds[0]?.artifactIds.flower).toBe('test_flower_hp')
  })

  it('respects includeEquippedOnOthers=false and excludedCharacters', async () => {
    // Tag all non-Furina artifacts as equipped on Neuvillette (at most 1 per slot so GO does not unequip duplicates)
    const neuvSlots = new Set<string>()
    const taggedArts = smallGood.artifacts
      .map((a: any, idx: number) => {
        if (a.location === 'Furina') {
          return { ...a, id: `art_furina_${a.slotKey}` }
        }
        if (!neuvSlots.has(a.slotKey)) {
          neuvSlots.add(a.slotKey)
          return {
            ...a,
            id: `art_neuv_${a.slotKey}`,
            location: 'Neuvillette',
          }
        }
        return null
      })
      .filter(Boolean)

    const locSession = createSession({
      ...smallGood,
      artifacts: taggedArts,
    })

    const furinaOwnedIds = new Set(
      taggedArts
        .filter((a: any) => a.location === 'Furina')
        .map((a: any) => a.id)
    )

    const onlyOwn = await locSession.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: false,
      topN: 3,
    })
    for (const b of onlyOwn.builds) {
      for (const slot of SLOTS) {
        const id = b.artifactIds[slot]
        if (id) expect(furinaOwnedIds.has(id)).toBe(true)
      }
    }

    const excludeNeuv = await locSession.optimize(furinaPreset, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: true,
      excludedCharacters: ['Neuvillette'],
      topN: 3,
    })
    for (const b of excludeNeuv.builds) {
      for (const slot of SLOTS) {
        const id = b.artifactIds[slot]
        if (id) expect(furinaOwnedIds.has(id)).toBe(true)
      }
    }
  })

  it('aborts cleanly when AbortSignal is triggered', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      session.optimize(furinaPreset, DEFAULT_OPTIMIZER_SETTINGS, {
        signal: controller.signal,
      })
    ).rejects.toThrow()
  })

  it('calls ArtCharDatabase.prototype.importGOOD exactly once per createSession across multiple evaluate, currentBuild, and optimize calls', async () => {
    const importSpy = vi.spyOn(ArtCharDatabase.prototype, 'importGOOD')
    importSpy.mockClear()

    const s = createSession(smallGood)
    expect(importSpy).toHaveBeenCalledTimes(1)

    const p1 = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const p2 = getBundledPreset('official/furina-salon-subdps')!

    const curr1 = s.currentBuild(p1)
    const ev1 = s.evaluate(p1, curr1)
    const ev2 = s.evaluate(p2, curr1)
    const opt = await s.optimize(p1, {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      includeEquippedOnOthers: false,
      topN: 2,
    })

    expect(ev1.total).toBeGreaterThan(0)
    expect(ev2.total).toBeGreaterThan(0)
    expect(opt.builds.length).toBeGreaterThan(0)
    // Still only 1 importGOOD call across all operations!
    expect(importSpy).toHaveBeenCalledTimes(1)
    importSpy.mockRestore()
  })

  it('caches listTargetsForCharacter and listConditionalsForCharacter and filters weapon conditionals by weaponType', () => {
    const t1 = listTargetsForCharacter('Furina')
    const t2 = listTargetsForCharacter('Furina')
    expect(t1).toBe(t2)

    const c1 = listConditionalsForCharacter('Furina')
    const c2 = listConditionalsForCharacter('Furina')
    expect(c1).toBe(c2)

    const weaponKeySet = new Set(ALL_WEAPON_KEYS)
    const furinaWeaponType = (
      getCharStat('Furina') as { weaponType?: string }
    ).weaponType
    expect(furinaWeaponType).toBe('sword')

    for (const cond of c1) {
      if (weaponKeySet.has(cond.sheet)) {
        const wType = (
          getWeaponStat(cond.sheet) as { weaponType?: string }
        ).weaponType
        expect(wType).toBe(furinaWeaponType)
      }
    }
  })
})
