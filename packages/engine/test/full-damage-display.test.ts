import { getBundledPreset, type Preset } from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  DEFAULT_OPTIMIZER_SETTINGS,
  createSession,
  installNodeWorkerShim,
} from '../src'

installNodeWorkerShim()

function makeReducedGood(fullGood: Record<string, any>, perSlot = 3) {
  const counts: Record<string, number> = {
    flower: 0,
    plume: 0,
    sands: 0,
    goblet: 0,
    circlet: 0,
  }
  const artifacts: any[] = []
  for (const art of fullGood.artifacts ?? []) {
    if (
      art.location === 'RaidenShogun' ||
      art.location === 'Furina' ||
      (counts[art.slotKey] !== undefined && counts[art.slotKey]! < perSlot)
    ) {
      artifacts.push(art)
      if (!art.location) {
        counts[art.slotKey] = (counts[art.slotKey] ?? 0) + 1
      }
    }
  }
  return {
    ...fullGood,
    artifacts,
  }
}

describe('Full Damage Display (full-damage-display)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const sampleGood = makeReducedGood(fullGood, 3)
  const session = createSession(sampleGood)

  it('optimizes a narrow-rotation preset (burst-focused Raiden) and verifies Full Damage includes non-rotation formulas matching direct engine evaluations', async () => {
    const preset = getBundledPreset('official/raiden-hypercarry')!
    expect(preset).toBeDefined()

    // Rotation only includes burst hits (Musou no Hitotachi + Musou Isshin)
    const rotationPaths = new Set(
      preset.rotation.targets.map((rt) => rt.path.join('.'))
    )
    expect(rotationPaths.has('normal.0')).toBe(false)
    expect(rotationPaths.has('charged.dmg')).toBe(false)
    expect(rotationPaths.has('plunging.high')).toBe(false)

    const optRes = await session.optimize(preset, DEFAULT_OPTIMIZER_SETTINGS)
    expect(optRes.builds.length).toBeGreaterThan(0)
    const bestBuild = optRes.builds[0]!

    const bestEval = session.evaluate(preset, bestBuild)
    expect(bestEval.fullDamage).toBeDefined()
    const fullDamage = bestEval.fullDamage!
    expect(fullDamage.length).toBeGreaterThan(0)

    // Verify section ordering matches GO sheet order: normal -> charged -> plunging -> skill -> burst -> ... -> reaction
    const sectionKeys = fullDamage.map((s) => s.sectionKey)
    const normalIdx = sectionKeys.indexOf('normal')
    const chargedIdx = sectionKeys.indexOf('charged')
    const plungingIdx = sectionKeys.indexOf('plunging')
    const skillIdx = sectionKeys.indexOf('skill')
    const burstIdx = sectionKeys.indexOf('burst')
    const reactionIdx = sectionKeys.indexOf('reaction')

    expect(normalIdx).toBeGreaterThanOrEqual(0)
    expect(chargedIdx).toBeGreaterThan(normalIdx)
    expect(plungingIdx).toBeGreaterThan(chargedIdx)
    expect(skillIdx).toBeGreaterThan(plungingIdx)
    expect(burstIdx).toBeGreaterThan(skillIdx)
    expect(reactionIdx).toBeGreaterThan(burstIdx)

    // Verify non-rotation formulas (normal.0, normal.1, charged.dmg, plunging.high, reaction.overloaded) exist with real values
    const entryByPath = new Map(
      fullDamage.flatMap((sec) =>
        sec.formulas.map((f) => [f.path.join('.'), f] as const)
      )
    )
    expect(entryByPath.get('normal.0')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('normal.1')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('charged.dmg')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('plunging.high')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('skill.dmg')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('reaction.overloaded')?.value).toBeGreaterThan(100)

    // Percentage stat buff nodes in dmgFormulas (skill.skillEye_, passive2.passive2ElecDmgBonus, burst.energyGen) must not be in Full Damage
    expect(entryByPath.has('skill.skillEye_')).toBe(false)
    expect(entryByPath.has('passive2.passive2ElecDmgBonus')).toBe(false)
    expect(entryByPath.has('burst.energyGen')).toBe(false)

    // Every formula in fullDamage must match a direct single-target engine evaluation of that formula for bestBuild
    const targetMember = preset.team[0]!
    for (const sec of fullDamage) {
      for (const entry of sec.formulas) {
        const singleTargetPreset: Preset = {
          ...preset,
          rotation: {
            name: `Direct ${entry.path.join('.')}`,
            repeat: 1,
            targets: [
              {
                path: entry.path,
                count: 1,
                hitMode: targetMember.hitMode ?? 'avgHit',
                reaction: targetMember.reaction,
                infusionAura: targetMember.infusionAura,
              },
            ],
          },
        }
        const directEval = session.evaluate(singleTargetPreset, bestBuild)
        expect(Math.abs(entry.value - directEval.total)).toBeLessThan(1e-5)
        expect(
          Math.abs(entry.breakdown.reconciledPerHit - entry.value)
        ).toBeLessThan(1e-2)
        expect(entry.breakdown.factors.length).toBeGreaterThanOrEqual(6)
      }
    }
  })

  it('optimizes official/furina-salon-subdps (skill-only rotation) and verifies Full Damage includes normal, charged, plunging, burst, and reaction formulas matching direct evaluations', async () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const optRes = await session.optimize(preset, DEFAULT_OPTIMIZER_SETTINGS)
    expect(optRes.builds.length).toBeGreaterThan(0)
    const bestBuild = optRes.builds[0]!

    const bestEval = session.evaluate(preset, bestBuild)
    const fullDamage = bestEval.fullDamage!
    const entryByPath = new Map(
      fullDamage.flatMap((sec) =>
        sec.formulas.map((f) => [f.path.join('.'), f] as const)
      )
    )

    // Furina's rotation only includes skill hits (usherDmg, chevalDmg, crabDmg),
    // but Full Damage includes normal, charged, plunging, burst, passive1.heal, and Hydro reactions!
    expect(entryByPath.get('normal.0')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('charged.dmg')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('plunging.high')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('burst.skillDmg')?.value).toBeGreaterThan(1000)
    expect(entryByPath.get('passive1.heal')?.value).toBeGreaterThan(100)
    expect(entryByPath.get('reaction.electrocharged')?.value).toBeGreaterThan(
      100
    )
    expect(entryByPath.get('reaction.bloom')?.value).toBeGreaterThan(100)

    // Percentage stat buff passive2.member_dmg_ is excluded
    expect(entryByPath.has('passive2.member_dmg_')).toBe(false)

    const targetMember = preset.team[0]!
    for (const sec of fullDamage) {
      for (const entry of sec.formulas) {
        const singleTargetPreset: Preset = {
          ...preset,
          rotation: {
            name: `Direct ${entry.path.join('.')}`,
            repeat: 1,
            targets: [
              {
                path: entry.path,
                count: 1,
                hitMode: targetMember.hitMode ?? 'avgHit',
                reaction: targetMember.reaction,
                infusionAura: targetMember.infusionAura,
              },
            ],
          },
        }
        const directEval = session.evaluate(singleTargetPreset, bestBuild)
        expect(Math.abs(entry.value - directEval.total)).toBeLessThan(1e-5)
        expect(
          Math.abs(entry.breakdown.reconciledPerHit - entry.value)
        ).toBeLessThan(1e-2)
      }
    }
  })

  it('handles untriggerable formulas as GO does (omitting isEmpty nodes and including them when triggered by infusion or constellation)', () => {
    const basePreset = getBundledPreset('official/furina-salon-subdps')!
    const currentSel = session.currentBuild(basePreset)
    const baseEval = session.evaluate(basePreset, currentSel)
    const basePaths = new Set(
      baseEval.fullDamage!.flatMap((sec) =>
        sec.formulas.map((f) => f.path.join('.'))
      )
    )

    // Without Pyro infusion, Hydro Furina cannot trigger Pyro infusion reactions (overloaded, burning, burgeon) or Cryo superconduct
    expect(basePaths.has('reaction.overloaded')).toBe(false)
    expect(basePaths.has('reaction.burning')).toBe(false)
    expect(basePaths.has('reaction.burgeon')).toBe(false)
    expect(basePaths.has('reaction.superconduct')).toBe(false)
    // At C0 (in sampleGood), Furina's C6 heal is isEmpty and omitted
    expect(basePaths.has('constellation6.heal')).toBe(false)

    // With Pyro infusionAura active (e.g. Bennett C6), Pyro infusion reactions become triggerable (isEmpty === false)
    const pyroInfusedPreset: Preset = {
      ...basePreset,
      team: basePreset.team.map((m, idx) =>
        idx === 0 ? { ...m, infusionAura: 'pyro' } : m
      ),
    }
    const infusedEval = session.evaluate(pyroInfusedPreset, currentSel)
    const infusedPaths = new Map(
      infusedEval.fullDamage!.flatMap((sec) =>
        sec.formulas.map((f) => [f.path.join('.'), f.value] as const)
      )
    )
    expect(infusedPaths.get('reaction.overloaded')).toBeGreaterThan(100)
    expect(infusedPaths.get('reaction.burning')).toBeGreaterThan(100)
    expect(infusedPaths.get('reaction.burgeon')).toBeGreaterThan(100)
  })
})
