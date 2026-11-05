import { SandboxStorage } from '@genshin-optimizer/common/database'
import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { listBundledPresets } from '@gi/presets'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import {
  captureAllGoldenFixtures,
  type GoldenFixture,
} from '../scripts/capture-golden'
import {
  createSession,
  listConditionalsForCharacter,
  listTargetsForCharacter,
} from '../src'
import { getTeamDataCalc } from '../src/teamData'

function relError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual)
  return Math.abs(actual - expected) / Math.abs(expected)
}

describe('GO Golden Fixture Parity & Export Round-Trip', () => {
  const sampleGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(sampleGood)
  const presets = listBundledPresets()

  beforeAll(() => {
    // Ensure golden fixtures are captured on disk
    const firstAkashaFile = resolve(
      __dirname,
      'golden',
      'akasha__furina-salon-pjc-c0.json'
    )
    const firstOfficialFile = resolve(
      __dirname,
      'golden',
      'official__alhaitham-quickbloom.json'
    )
    if (!existsSync(firstOfficialFile)) {
      captureAllGoldenFixtures()
    } else if (!existsSync(firstAkashaFile)) {
      captureAllGoldenFixtures({ source: 'akasha' })
    }
  }, 60_000)

  it.each(presets.map((p) => [p.id, p] as const))(
    'evaluates preset %s within <= 0.1% relative error of GO golden fixture',
    (_id, preset) => {
      const fileSlug = preset.id.replace(/\//g, '__') + '.json'
      const fixturePath = resolve(__dirname, 'golden', fileSlug)
      const golden = JSON.parse(
        readFileSync(fixturePath, 'utf8')
      ) as GoldenFixture

      const result = session.evaluate(preset)
      expect(result.total).toBeGreaterThan(0)
      expect(relError(result.total, golden.total)).toBeLessThanOrEqual(0.001)

      expect(result.instances).toHaveLength(golden.instances.length)
      for (let i = 0; i < result.instances.length; i++) {
        const inst = result.instances[i]!
        const goldInst = golden.instances[i]!
        expect(inst.perHit).toBeGreaterThan(0)
        expect(relError(inst.perHit, goldInst.perHit)).toBeLessThanOrEqual(
          0.001
        )
        expect(relError(inst.subtotal, goldInst.subtotal)).toBeLessThanOrEqual(
          0.001
        )
      }

      // Stats parity
      for (const k of ['hp', 'atk', 'def', 'eleMas', 'critRate_', 'critDMG_', 'enerRech_']) {
        expect(relError(result.stats[k]!, golden.stats[k]!)).toBeLessThanOrEqual(
          0.001
        )
      }
    }
  )

  it('round-trips exportGODatabase into a fresh ArtCharDatabase with identical rotation total', () => {
    for (const preset of presets.slice(0, 4)) {
      const evalResult = session.evaluate(preset)
      const exported = session.exportGODatabase(preset)

      const freshDb = new ArtCharDatabase(1, new SandboxStorage())
      freshDb.importGOOD(exported as never, false, false, false)

      const teamId = freshDb.teams.keys[0]!
      expect(teamId).toBeDefined()
      const activeTeamCharId = freshDb.teams.get(teamId)!.loadoutData[0]!.teamCharId
      const targetKey = preset.target as CharacterKey

      const calc = getTeamDataCalc(freshDb, teamId, 'F', activeTeamCharId, 0)
      const goTotal =
        calc![targetKey]!.target.getDisplay()['custom']!['0']!.value *
        (preset.rotation.repeat ?? 1)

      expect(relError(evalResult.total, goTotal)).toBeLessThanOrEqual(1e-6)
    }
  })

  it('lists targets and conditionals for bundled characters from GO sheets', () => {
    const furinaTargets = listTargetsForCharacter('Furina')
    expect(furinaTargets.length).toBeGreaterThan(5)
    expect(
      furinaTargets.some(
        (t) =>
          t.path[0] === 'skill' &&
          t.path[1] === 'usherDmg' &&
          t.name.length > 0
      )
    ).toBe(true)

    const furinaConds = listConditionalsForCharacter('Furina')
    expect(furinaConds.length).toBeGreaterThan(3)
    const fanfare = furinaConds.find(
      (c) => c.sheet === 'Furina' && c.key === 'burstFanfare'
    )
    expect(fanfare).toBeDefined()
    expect(fanfare!.name).toContain('Furina')
    expect(fanfare!.states.length).toBeGreaterThan(0)
    expect(fanfare!.states.every((s) => s.name.length > 0)).toBe(true)

    const hutaoTargets = listTargetsForCharacter('HuTao')
    expect(hutaoTargets.length).toBeGreaterThanOrEqual(18)
    const hutaoConds = listConditionalsForCharacter('HuTao')
    expect(hutaoConds.length).toBeGreaterThan(10)
    expect(
      hutaoConds.every(
        (c) =>
          typeof c.name === 'string' &&
          c.name.trim().length > 0 &&
          !c.name.includes('[object Object]')
      )
    ).toBe(true)
  })
})
