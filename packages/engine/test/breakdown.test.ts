import { getBundledPreset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { createSession } from '../src'

describe('GO Formula & Final Stat Breakdown Reconciliation (formula-breakdown)', () => {
  const sampleGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(sampleGood)

  it.each([
    'official/furina-salon-subdps',
    'official/mavuika-melt-hypercarry',
    'official/neuvillette-hypercarry',
    'akasha/furina-salon-pjc-c0',
  ] as const)(
    'reconciles every rotation damage row and every core final stat for %s within rounding',
    (presetId) => {
      const preset = getBundledPreset(presetId)!
      const current = session.currentBuild(preset)
      const evalResult = session.evaluate(preset, current)

      // 1. Every rotation damage row reconciles with perHit and subtotal
      expect(evalResult.instances.length).toBeGreaterThan(0)
      for (const inst of evalResult.instances) {
        expect(inst.breakdown).toBeDefined()
        const bd = inst.breakdown!
        expect(bd.factors.length).toBeGreaterThanOrEqual(6)

        // Product of factors matches perHit within rounding
        const productFromFactors =
          bd.outerMulti *
          (bd.baseDmg + bd.dmgInc) *
          bd.dmgBonusMulti *
          bd.critMulti *
          bd.ampMulti *
          bd.defMulti *
          bd.resMulti
        expect(Math.abs(productFromFactors - inst.perHit)).toBeLessThan(1e-2)
        expect(Math.abs(bd.reconciledPerHit - inst.perHit)).toBeLessThan(1e-2)
        expect(Math.abs(bd.reconciledSubtotal - inst.subtotal)).toBeLessThan(
          1e-1
        )

        // DMG% contributors sum to dmgBonus within rounding
        const dmgBonusGroup = bd.factors.find((f) => f.key === 'dmgBonus')!
        expect(dmgBonusGroup).toBeDefined()
        const dmgBonusSum = dmgBonusGroup.contributors.reduce(
          (s, c) => s + c.value,
          0
        )
        expect(Math.abs(dmgBonusSum - bd.dmgBonus)).toBeLessThan(1e-5)
      }

      // 2. Every core final stat reconciles with stats[statKey]
      expect(evalResult.statBreakdowns).toBeDefined()
      for (const statKey of [
        'hp',
        'atk',
        'def',
        'eleMas',
        'enerRech_',
        'critRate_',
        'critDMG_',
      ] as const) {
        const sb = evalResult.statBreakdowns![statKey]
        expect(sb).toBeDefined()
        expect(sb!.total).toBeCloseTo(evalResult.stats[statKey]!, 5)

        const contribSum = sb!.contributors.reduce((s, c) => s + c.value, 0)
        expect(Math.abs(contribSum - evalResult.stats[statKey]!)).toBeLessThan(
          1e-3
        )
        expect(
          Math.abs(sb!.reconciledTotal - evalResult.stats[statKey]!)
        ).toBeLessThan(1e-3)
        expect(sb!.contributors.length).toBeGreaterThan(0)
      }
    }
  )

  it('classifies contributors into character, weapon, artifactSet, teamBuff, resonance, and enemy categories', () => {
    const furinaPreset = getBundledPreset('official/furina-salon-subdps')!
    const current = session.currentBuild(furinaPreset)
    const evalResult = session.evaluate(furinaPreset, current)

    const hpBd = evalResult.statBreakdowns!.hp!
    const hpCategories = new Set(hpBd.contributors.map((c) => c.category))
    // Furina has Character Base HP ('character'), Hydro Resonance +25% HP ('resonance'), and Equipped Artifacts ('artifactSet')
    expect(hpCategories.has('character')).toBe(true)
    expect(hpCategories.has('resonance')).toBe(true)
    expect(hpCategories.has('artifactSet')).toBe(true)

    const mavuikaPreset = getBundledPreset('official/mavuika-melt-hypercarry')!
    const mavuikaEval = session.evaluate(mavuikaPreset, {
      ...session.currentBuild(mavuikaPreset),
      memberBuildModes: { Citlali: 'tc', Xilonen: 'tc', Bennett: 'tc' },
    })
    const atkBd = mavuikaEval.statBreakdowns!.atk!
    const atkCategories = new Set(atkBd.contributors.map((c) => c.category))
    // Mavuika has Character Base ATK ('character'), Weapon Base ATK ('weapon'), Pyro Resonance ('resonance'), and Bennett / TTDS / Noblesse ('teamBuff')
    expect(atkCategories.has('character')).toBe(true)
    expect(atkCategories.has('weapon')).toBe(true)
    expect(atkCategories.has('resonance')).toBe(true)
    expect(atkCategories.has('teamBuff')).toBe(true)

    const meltRowBd = mavuikaEval.instances[0]!.breakdown!
    const resFactor = meltRowBd.factors.find((f) => f.key === 'enemyRes')!
    const resCategories = new Set(resFactor.contributors.map((c) => c.category))
    expect(resCategories.has('enemy')).toBe(true)
    expect(resCategories.has('teamBuff')).toBe(true)
  })
})
