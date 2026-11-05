import { SandboxStorage } from '@genshin-optimizer/common/database'
import { allElementWithPhyKeys, type CharacterKey } from '@genshin-optimizer/gi/consts'
import {
  ArtCharDatabase,
  type CustomMultiTarget,
  type LoadoutDatum,
} from '@genshin-optimizer/gi/db'
import { getTeamDataCalc } from '@genshin-optimizer/gi/ui/useTeamData'
import { input } from '@genshin-optimizer/gi/wr'
import { listBundledPresets, type Preset } from '@gi/presets'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'

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
  const db = new ArtCharDatabase(1, new SandboxStorage())
  db.importGOOD(goodData as never, false, false, false)

  const targetKey = preset.target as CharacterKey
  if (!db.chars.get(targetKey)) {
    db.chars.getWithInitWeapon(targetKey)
  }

  const customMultiTargets: CustomMultiTarget[] = [
    {
      name: preset.rotation.name || preset.name,
      targets: preset.rotation.targets.map((rt) => ({
        weight: rt.count,
        path: rt.path[0] === preset.target ? rt.path.slice(1) : rt.path,
        hitMode: rt.hitMode ?? 'avgHit',
        reaction: rt.reaction,
        infusionAura: rt.infusionAura,
        bonusStats: (rt.bonusStats ?? {}) as never,
        description: rt.label ?? '',
      })),
    },
    ...preset.rotation.targets.map((rt, i) => ({
      name: rt.label || `Target ${i + 1}`,
      targets: [
        {
          weight: 1,
          path: rt.path[0] === preset.target ? rt.path.slice(1) : rt.path,
          hitMode: rt.hitMode ?? 'avgHit',
          reaction: rt.reaction,
          infusionAura: rt.infusionAura,
          bonusStats: (rt.bonusStats ?? {}) as never,
          description: rt.label ?? '',
        },
      ],
    })),
  ]

  const loadoutData: Array<LoadoutDatum | undefined> = [
    undefined,
    undefined,
    undefined,
    undefined,
  ]
  let targetTeamCharId = ''

  for (let i = 0; i < preset.team.length; i++) {
    const member = preset.team[i]!
    const mKey = member.key as CharacterKey
    const isTarget = i === 0
    if (!db.chars.get(mKey)) {
      db.chars.getWithInitWeapon(mKey)
    }
    const tcId = db.teamChars.new(mKey, {
      name: `${preset.name} — ${mKey}`,
      conditional: member.conditional as never,
      bonusStats: member.bonusStats as never,
      infusionAura: (member.infusionAura ?? '') as never,
      hitMode: member.hitMode ?? 'avgHit',
      reaction: member.reaction as never,
      customMultiTargets: isTarget ? customMultiTargets : [],
    })
    if (isTarget) targetTeamCharId = tcId

    if (!isTarget && member.build.type === 'tc') {
      const buildTcId = db.buildTcs.new({
        characterKey: mKey,
        name: `${preset.name} (${mKey} TC)`,
        character: member.build.tc.character as never,
        weapon: member.build.tc.weapon as never,
        artifact: member.build.tc.artifact as never,
      })
      loadoutData[i] = {
        teamCharId: tcId,
        buildType: 'tc',
        buildId: '',
        buildTcId,
        compare: false,
        compareType: 'equipped',
        compareBuildId: '',
        compareBuildTcId: '',
      }
    } else {
      loadoutData[i] = {
        teamCharId: tcId,
        buildType: 'equipped',
        buildId: '',
        buildTcId: '',
        compare: false,
        compareType: 'equipped',
        compareBuildId: '',
        compareBuildTcId: '',
      }
    }
  }

  const enemyOverride: Record<string, number> = {
    enemyLevel: preset.enemy?.level ?? 100,
  }
  for (const [k, v] of Object.entries(preset.enemy?.overrides ?? {})) {
    if (k.endsWith('_res_') && !k.endsWith('_enemyRes_')) {
      enemyOverride[`${k.slice(0, -5)}_enemyRes_`] = v
    } else {
      enemyOverride[k] = v
    }
  }

  const teamId = db.teams.new({
    name: preset.name,
    enemyOverride: enemyOverride as never,
    conditional: {
      resonance: preset.teamConditional?.resonance ?? {},
      reaction: preset.teamConditional?.reaction ?? {},
    },
    loadoutData,
  })

  const teamCalc = getTeamDataCalc(db, teamId, 'F', targetTeamCharId, 0)
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

export function captureAllGoldenFixtures() {
  mkdirSync(GOLDEN_DIR, { recursive: true })
  const good = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )

  const presets = listBundledPresets()
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

