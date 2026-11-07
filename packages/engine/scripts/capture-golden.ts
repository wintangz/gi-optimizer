import { SandboxStorage } from '@genshin-optimizer/common/database'
import {
  allElementWithPhyKeys,
  type CharacterKey,
  type WeaponKey,
} from '@genshin-optimizer/gi/consts'
import {
  ArtCharDatabase,
  type ICachedWeapon,
} from '@genshin-optimizer/gi/db'
import { input } from '@genshin-optimizer/gi/wr'
import { listBundledPresets, type Preset } from '@gi/presets'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { hydratePresetTeam } from '../src/session'
import { getTeamDataCalc } from '../src/teamData'

const here = dirname(fileURLToPath(import.meta.url))
const GOLDEN_DIR = resolve(here, '../test/golden')

export interface GoldenFixture {
  presetId: string
  target: string
  total: number
  instances: Array<{
    label: string
    path: string[]
    count: number
    perHit: number
    subtotal: number
  }>
  stats: Record<string, number>
}

export function computeDirectGOGolden(
  goodData: object,
  preset: Preset
): GoldenFixture {
  const goodObj =
    typeof goodData === 'object' && goodData !== null
      ? (goodData as { characters?: Array<{ key?: string }> })
      : {}
  const ownedCharKeys = new Set<string>(
    Array.isArray(goodObj.characters)
      ? goodObj.characters
          .map((c) => c?.key)
          .filter((k): k is string => Boolean(k))
      : []
  )

  const db = new ArtCharDatabase(1, new SandboxStorage())
  db.importGOOD(goodData as never, false, false, false)

  const targetKey = preset.target as CharacterKey
  if (!db.chars.get(targetKey)) {
    db.chars.getWithInitWeapon(targetKey)
  }

  const { teamId, targetTeamCharId } = hydratePresetTeam(
    db,
    preset,
    undefined,
    {
      ownedCharKeys,
    }
  )

  const targetMember = preset.team[0]
  const overrideChar =
    targetMember?.build.type === 'fixed'
      ? targetMember.build.character
      : undefined
  const overrideWeapon: ICachedWeapon | undefined =
    targetMember?.build.type === 'fixed'
      ? {
          id: `akasha_sim_${targetMember.build.weapon.key}_r${targetMember.build.weapon.refinement}`,
          key: targetMember.build.weapon.key as WeaponKey,
          level: targetMember.build.weapon.level,
          ascension: targetMember.build.weapon.ascension as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          refinement: targetMember.build.weapon.refinement as 1 | 2 | 3 | 4 | 5,
          location: '',
          lock: false,
        }
      : undefined

  const teamCalc = getTeamDataCalc(
    db,
    teamId,
    'F',
    targetTeamCharId,
    0,
    undefined,
    overrideWeapon,
    overrideChar
  )
  const uiData = teamCalc?.[targetKey]?.target
  if (!uiData) {
    throw new Error(`GO getTeamDataCalc returned undefined for ${preset.id}`)
  }

  const disp = uiData.getDisplay()
  const custom = disp['custom'] ?? {}
  const repeat = preset.rotation.repeat ?? 1

  const instances = preset.rotation.targets.map((rt, i) => {
    const perHit = custom[String(i + 1)]!.value
    const subtotal = perHit * rt.count * repeat
    return {
      label: rt.label,
      path: rt.path,
      count: rt.count,
      perHit,
      subtotal,
    }
  })

  const total = custom['0']!.value * repeat
  const stats: Record<string, number> = {
    hp: uiData.get(input.total.hp).value,
    atk: uiData.get(input.total.atk).value,
    def: uiData.get(input.total.def).value,
    eleMas: uiData.get(input.total.eleMas).value,
    critRate_: uiData.get(input.total.critRate_).value,
    critDMG_: uiData.get(input.total.critDMG_).value,
    enerRech_: uiData.get(input.total.enerRech_).value,
    heal_: uiData.get(input.total.heal_).value,
  }
  for (const ele of allElementWithPhyKeys) {
    const k = `${ele}_dmg_` as const
    stats[k] = uiData.get(input.total[k]).value
  }

  return {
    presetId: preset.id,
    target: preset.target,
    total,
    instances,
    stats,
  }
}

export function captureAllGoldenFixtures(filter?: {
  source?: 'akasha' | 'official'
}) {
  mkdirSync(GOLDEN_DIR, { recursive: true })
  const good = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )

  const presets = listBundledPresets(filter)
  for (const preset of presets) {
    const fixture = computeDirectGOGolden(good, preset)
    const fileSlug = preset.id.replace(/\//g, '__') + '.json'
    writeFileSync(
      resolve(GOLDEN_DIR, fileSlug),
      JSON.stringify(fixture, null, 2) + '\n',
      'utf8'
    )
  }
  return presets.length
}

