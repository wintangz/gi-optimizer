import {
  getBundledPreset,
  parsePresetJson,
  resolveRotationTargetOwner,
  type Preset,
} from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { createSession, DEFAULT_OPTIMIZER_SETTINGS } from '../src'

describe('Team-Wide Optimization Mode (team-wide-optimization)', () => {
  const sampleGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(sampleGood)

  it('resolves rotation row owners from both 3-segment paths and explicit member fields', () => {
    const basePreset = getBundledPreset('official/neuvillette-hypercarry')!
    const multiPreset: Preset = {
      ...basePreset,
      rotation: {
        ...basePreset.rotation,
        targets: [
          {
            path: ['charged', 'judgmentDmg'],
            count: 8,
            label: 'Equitable Judgment Tick',
            hitMode: 'avgHit',
            bonusStats: {},
          },
          {
            path: ['Furina', 'skill', 'chevalDmg'],
            count: 6,
            label: 'Surintendante Chevalmarin',
            hitMode: 'avgHit',
            bonusStats: {},
          },
          {
            member: 'Furina',
            path: ['skill', 'crabDmg'],
            count: 2,
            label: 'Mademoiselle Crabaletta',
            hitMode: 'avgHit',
            bonusStats: {},
          },
        ],
      },
    }

    const r0 = resolveRotationTargetOwner(
      multiPreset.rotation.targets[0]!,
      multiPreset
    )
    expect(r0).toEqual({
      memberKey: 'Neuvillette',
      normPath: ['charged', 'judgmentDmg'],
    })

    const r1 = resolveRotationTargetOwner(
      multiPreset.rotation.targets[1]!,
      multiPreset
    )
    expect(r1).toEqual({
      memberKey: 'Furina',
      normPath: ['skill', 'chevalDmg'],
    })

    const r2 = resolveRotationTargetOwner(
      multiPreset.rotation.targets[2]!,
      multiPreset
    )
    expect(r2).toEqual({
      memberKey: 'Furina',
      normPath: ['skill', 'crabDmg'],
    })

    // Also validates round-trip through parsePresetJson
    const parsed = parsePresetJson(JSON.stringify(multiPreset))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.preset.rotation.targets[2]?.member).toBe('Furina')
    }
  })

  it('evaluates multi-member rotation rows against each owning member in session.evaluate()', () => {
    const basePreset = getBundledPreset('official/neuvillette-hypercarry')!
    const multiPreset: Preset = {
      ...basePreset,
      rotation: {
        ...basePreset.rotation,
        targets: [
          ...basePreset.rotation.targets,
          {
            member: 'Furina',
            path: ['skill', 'chevalDmg'],
            count: 6,
            label: 'Furina Chevalmarin',
            hitMode: 'avgHit',
            bonusStats: {},
          },
          {
            path: ['Furina', 'skill', 'crabDmg'],
            count: 2,
            label: 'Furina Crabaletta',
            hitMode: 'avgHit',
            bonusStats: {},
          },
        ],
      },
    }

    const singleEval = session.evaluate(basePreset)
    const multiEval = session.evaluate(multiPreset)

    expect(multiEval.instances.length).toBe(
      basePreset.rotation.targets.length + 2
    )
    const furinaRows = multiEval.instances.slice(
      basePreset.rotation.targets.length
    )
    expect(furinaRows[0]?.member).toBe('Furina')
    expect(furinaRows[0]?.perHit).toBeGreaterThan(0)
    expect(furinaRows[1]?.member).toBe('Furina')
    expect(furinaRows[1]?.perHit).toBeGreaterThan(0)

    const expectedTotal = multiEval.instances.reduce(
      (acc, inst) => acc + inst.subtotal,
      0
    )
    expect(Math.abs(multiEval.total - expectedTotal)).toBeLessThan(1e-6)
    expect(multiEval.total).toBeGreaterThan(singleEval.total)
  })

  it('solves artifacts across the team in order with strictly disjoint 5-piece builds and skips 0-row members', async () => {
    const basePreset = getBundledPreset('official/neuvillette-hypercarry')!
    // Team order: [Neuvillette, Furina, KaedeharaKazuha, Xilonen]
    // Give Neuvillette (slot 0) and Furina (slot 1) rotation rows; Kazuha (slot 2) and Xilonen (slot 3) have 0 rows.
    const teamPreset: Preset = {
      ...basePreset,
      rotation: {
        ...basePreset.rotation,
        targets: [
          ...basePreset.rotation.targets,
          {
            member: 'Furina',
            path: ['skill', 'chevalDmg'],
            count: 6,
            label: 'Surintendante Chevalmarin',
            hitMode: 'avgHit',
            bonusStats: {},
          },
          {
            member: 'Furina',
            path: ['skill', 'usherDmg'],
            count: 4,
            label: 'Gentilhomme Usher',
            hitMode: 'avgHit',
            bonusStats: {},
          },
          {
            member: 'Furina',
            path: ['skill', 'crabDmg'],
            count: 2,
            label: 'Mademoiselle Crabaletta',
            hitMode: 'avgHit',
            bonusStats: {},
          },
        ],
      },
    }

    // Use a fast filtered pool where Neuvillette and Furina
    // would otherwise compete for the exact same Hydro goblet / Crit circlet off-pieces.
    const fastSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      topN: 1,
      levelLow: 20,
      levelHigh: 20,
      minRarity: 5 as const,
      minRv: 600,
      includeEquippedOnOthers: true,
    }

    const teamRes = await session.optimizeTeam(teamPreset, fastSettings, {
      maxWorkers: 2,
    })

    expect(teamRes.members.length).toBe(4)

    const neuvMember = teamRes.members[0]!
    const furinaMember = teamRes.members[1]!
    const kazuhaMember = teamRes.members[2]!
    const zhongliMember = teamRes.members[3]!

    // 1. Neuvillette & Furina ran the solver and produced positive subtotals
    expect(neuvMember.memberKey).toBe('Neuvillette')
    expect(neuvMember.skippedSolver).toBe(false)
    expect(neuvMember.subtotal).toBeGreaterThan(0)
    expect(neuvMember.tested).toBeGreaterThan(0)

    expect(furinaMember.memberKey).toBe('Furina')
    expect(furinaMember.skippedSolver).toBe(false)
    expect(furinaMember.subtotal).toBeGreaterThan(0)
    expect(furinaMember.tested).toBeGreaterThan(0)

    // 2. Kazuha & Zhongli have 0 rotation rows -> skippedSolver: true, tested: 0
    expect(kazuhaMember.memberKey).toBe('KaedeharaKazuha')
    expect(kazuhaMember.skippedSolver).toBe(true)
    expect(kazuhaMember.rotationRowCount).toBe(0)
    expect(kazuhaMember.tested).toBe(0)
    expect(kazuhaMember.subtotal).toBe(0)

    expect(zhongliMember.memberKey).toBe('Zhongli')
    expect(zhongliMember.skippedSolver).toBe(true)
    expect(zhongliMember.rotationRowCount).toBe(0)
    expect(zhongliMember.tested).toBe(0)
    expect(zhongliMember.subtotal).toBe(0)

    // 3. Disjoint artifact check: no artifact ID is equipped on both Neuvillette and Furina
    const neuvArtIds = Object.values(neuvMember.selection.artifactIds).filter(
      (id): id is string => Boolean(id)
    )
    const furinaArtIds = Object.values(
      furinaMember.selection.artifactIds
    ).filter((id): id is string => Boolean(id))
    expect(neuvArtIds.length).toBe(5)
    expect(furinaArtIds.length).toBe(5)

    const neuvSet = new Set(neuvArtIds)
    for (const fId of furinaArtIds) {
      expect(neuvSet.has(fId)).toBe(false)
    }

    // 4. Combined teamTotal equals sum of member subtotals
    expect(
      Math.abs(teamRes.teamTotal - (neuvMember.subtotal + furinaMember.subtotal))
    ).toBeLessThan(1e-6)

    // 5. Single-target optimization on basePreset matches Neuvillette's step-0 build
    const singleOpt = await session.optimize(basePreset, fastSettings, {
      maxWorkers: 2,
    })
    expect(singleOpt.builds[0]?.artifactIds).toEqual(
      neuvMember.selection.artifactIds
    )
  })
})
