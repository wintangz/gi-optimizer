import { SandboxStorage } from '@genshin-optimizer/common/database'
import { notEmpty } from '@genshin-optimizer/common/util'
import {
  allArtifactSlotKeys,
  allElementWithPhyKeys,
  charKeyToLocCharKey,
  type CharacterKey,
} from '@genshin-optimizer/gi/consts'
import {
  ArtCharDatabase,
  type CustomMultiTarget,
  type CustomTarget,
  type ICachedArtifact,
  type ICachedWeapon,
  type LoadoutDatum,
} from '@genshin-optimizer/gi/db'
import { getTeamData } from '@genshin-optimizer/gi/ui/useTeamData'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import { input } from '@genshin-optimizer/gi/wr'
import type { Preset, RotationTarget } from '@gi/presets'
import {
  listConditionalsForCharacter,
  listTargetsForCharacter,
} from './catalog'
import { runSolver } from './solver'
import type {
  ArtifactSlot,
  BuildSelection,
  EngineSession,
  InstanceResult,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
  RotationResult,
} from './types'

export function normalizeTargetPath(
  path: string[],
  targetCharKey: string
): string[] {
  if (path.length >= 3 && path[0] === targetCharKey) {
    return path.slice(1)
  }
  return path
}

function toCustomTarget(
  rt: RotationTarget,
  targetCharKey: string,
  weightOverride?: number
): CustomTarget {
  return {
    weight: weightOverride ?? rt.count,
    path: normalizeTargetPath(rt.path, targetCharKey),
    hitMode: rt.hitMode ?? 'avgHit',
    reaction: rt.reaction,
    infusionAura: rt.infusionAura,
    bonusStats: (rt.bonusStats ?? {}) as CustomTarget['bonusStats'],
    description: rt.label ?? '',
  }
}

export function buildCustomMultiTargetsForPreset(
  preset: Preset
): CustomMultiTarget[] {
  const targetKey = preset.target
  const combined: CustomMultiTarget = {
    name: preset.rotation.name || preset.name || 'Preset Rotation',
    description: preset.description || undefined,
    targets: preset.rotation.targets.map((rt) =>
      toCustomTarget(rt, targetKey)
    ),
  }

  // Create one single-target CustomMultiTarget per rotation row (with weight = 1)
  // at indices 1..K so GO evaluates each row's exact perHit (including per-row
  // reaction, hitMode, infusionAura, bonusStats).
  const perInstance: CustomMultiTarget[] = preset.rotation.targets.map(
    (rt, idx) => ({
      name: rt.label || `Target ${idx + 1}`,
      description: undefined,
      targets: [toCustomTarget(rt, targetKey, 1)],
    })
  )

  return [combined, ...perInstance]
}

export interface HydratedTeam {
  db: ArtCharDatabase
  teamId: string
  targetTeamCharId: string
}

export function hydrateTeamIntoDb(
  goodData: object,
  preset: Preset,
  selection?: BuildSelection
): HydratedTeam {
  const db = new ArtCharDatabase(1, new SandboxStorage())
  db.importGOOD(goodData as never, false, false, false)

  // Clear any pre-existing teams, teamChars, or buildTcs imported from the raw GOOD file
  // so the hydrated preset team is the sole team at index 0 for clean GO export/verification.
  db.teams.clear()
  db.teamChars.clear()
  db.buildTcs.clear()

  const targetCharKey = preset.target as CharacterKey

  // Ensure target character exists in db
  if (!db.chars.get(targetCharKey)) {
    db.chars.getWithInitWeapon(targetCharKey)
  }

  // If selection is provided and we are exporting or evaluating, we can also
  // apply selection directly or pass via overrideArt/overrideWeapon
  const loadoutData: Array<LoadoutDatum | undefined> = [
    undefined,
    undefined,
    undefined,
    undefined,
  ]
  let targetTeamCharId = ''

  for (let i = 0; i < Math.min(4, preset.team.length); i++) {
    const member = preset.team[i]!
    const mKey = member.key as CharacterKey
    const isTarget = i === 0

    if (!db.chars.get(mKey)) {
      db.chars.getWithInitWeapon(mKey)
    }

    const tcId = db.teamChars.new(mKey, {
      name: `${preset.name} — ${mKey}`,
      description: preset.description ?? '',
      conditional: member.conditional as never,
      bonusStats: member.bonusStats as never,
      infusionAura: (member.infusionAura ?? '') as never,
      hitMode: member.hitMode ?? 'avgHit',
      reaction: member.reaction as never,
      customMultiTargets: isTarget
        ? buildCustomMultiTargetsForPreset(preset)
        : [],
    })

    if (isTarget) {
      targetTeamCharId = tcId
    }

    if (!isTarget && member.build.type === 'tc') {
      const tc = member.build.tc
      const buildTcId = db.buildTcs.new({
        characterKey: mKey,
        name: `${preset.name} (${mKey} TC)`,
        description: 'Assumed preset teammate build',
        character: tc.character as never,
        weapon: tc.weapon as never,
        artifact: tc.artifact as never,
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

  // Normalize enemy overrides: support both `pyro_enemyRes_` and `pyro_res_` keys
  const enemyOverride: Record<string, number> = {
    enemyLevel: preset.enemy?.level ?? 100,
  }
  for (const [k, v] of Object.entries(preset.enemy?.overrides ?? {})) {
    if (k.endsWith('_res_') && !k.endsWith('_enemyRes_')) {
      const ele = k.slice(0, -5)
      enemyOverride[`${ele}_enemyRes_`] = v
    } else {
      enemyOverride[k] = v
    }
  }

  const teamId = db.teams.new({
    name: preset.name,
    description: preset.description ?? '',
    enemyOverride: enemyOverride as never,
    conditional: {
      resonance: preset.teamConditional?.resonance ?? {},
      reaction: preset.teamConditional?.reaction ?? {},
    },
    loadoutData,
  })

  // If selection is supplied and we want the exported DB to have it equipped on the target
  if (selection) {
    const locKey = charKeyToLocCharKey(targetCharKey)
    if (selection.weaponId) {
      const w = db.weapons.get(selection.weaponId)
      if (w) {
        db.weapons.set(selection.weaponId, { location: locKey })
      }
    }
    if (selection.artifactIds) {
      for (const slot of allArtifactSlotKeys) {
        const chosenId = selection.artifactIds[slot as ArtifactSlot]
        if (chosenId && db.arts.get(chosenId)) {
          db.arts.set(chosenId, { location: locKey })
        }
      }
    }
  }

  return { db, teamId, targetTeamCharId }
}

export function createSession(good: unknown): EngineSession {
  const goodObj =
    typeof good === 'object' && good !== null ? (good as object) : {}
  const baseDb = new ArtCharDatabase(1, new SandboxStorage())
  baseDb.importGOOD(goodObj as never, false, false, false)

  return {
    currentBuild(preset: Preset): BuildSelection {
      const targetKey = preset.target as CharacterKey
      const char = baseDb.chars.get(targetKey)
      if (!char) {
        return { artifactIds: {} }
      }
      const artifactIds: Partial<Record<ArtifactSlot, string>> = {}
      for (const slot of allArtifactSlotKeys) {
        const id = char.equippedArtifacts[slot]
        if (id) {
          artifactIds[slot as ArtifactSlot] = id
        }
      }
      return {
        weaponId: char.equippedWeapon || undefined,
        artifactIds,
      }
    },

    evaluate(preset: Preset, selection?: BuildSelection): RotationResult {
      const { db, teamId, targetTeamCharId } = hydrateTeamIntoDb(
        goodObj,
        preset
      )
      const targetKey = preset.target as CharacterKey

      let overrideArts: ICachedArtifact[] | undefined
      if (selection?.artifactIds) {
        overrideArts = allArtifactSlotKeys
          .map((slot) => {
            const id = selection.artifactIds[slot as ArtifactSlot]
            return id ? db.arts.get(id) : undefined
          })
          .filter(notEmpty)
      }

      let overrideWeapon: ICachedWeapon | undefined
      if (selection?.weaponId) {
        overrideWeapon = db.weapons.get(selection.weaponId)
      }

      const bundle = getTeamData(
        db,
        teamId,
        targetTeamCharId,
        0,
        overrideArts,
        overrideWeapon
      )
      if (!bundle) {
        throw new Error(
          `Failed to build GO TeamData for preset '${preset.id}' (target: ${preset.target}).`
        )
      }

      const calc = uiDataForTeam(bundle.teamData, db.gender, targetKey)
      const targetUiData = calc[targetKey]?.target
      if (!targetUiData) {
        throw new Error(
          `Failed to evaluate UIData for target '${preset.target}' in preset '${preset.id}'.`
        )
      }

      const display = targetUiData.getDisplay()
      const customDisplay = display['custom'] ?? {}
      const repeat = preset.rotation.repeat ?? 1

      const instances: InstanceResult[] = preset.rotation.targets.map(
        (rt, idx) => {
          const normPath = normalizeTargetPath(rt.path, preset.target)
          const secNode = display[normPath[0]!]?.[normPath[1]!]
          if (!secNode) {
            throw new Error(
              `Unresolvable rotation target path '${rt.path.join('.')}' for character '${preset.target}'.`
            )
          }
          const customPerHitNode = customDisplay[String(idx + 1)]
          const perHit = customPerHitNode
            ? customPerHitNode.value
            : secNode.value
          const subtotal = perHit * rt.count * repeat
          return {
            label: rt.label || normPath.join('.'),
            path: rt.path,
            count: rt.count,
            perHit,
            subtotal,
          }
        }
      )

      const customTotalNode = customDisplay['0']
      const total = customTotalNode
        ? customTotalNode.value * repeat
        : instances.reduce((acc, inst) => acc + inst.subtotal, 0)

      const stats: Record<string, number> = {
        hp: targetUiData.get(input.total.hp).value,
        atk: targetUiData.get(input.total.atk).value,
        def: targetUiData.get(input.total.def).value,
        eleMas: targetUiData.get(input.total.eleMas).value,
        critRate_: targetUiData.get(input.total.critRate_).value,
        critDMG_: targetUiData.get(input.total.critDMG_).value,
        enerRech_: targetUiData.get(input.total.enerRech_).value,
        heal_: targetUiData.get(input.total.heal_).value,
      }
      for (const ele of allElementWithPhyKeys) {
        const k = `${ele}_dmg_` as const
        stats[k] = targetUiData.get(input.total[k]).value
      }

      return {
        total,
        instances,
        stats,
      }
    },

    async optimize(
      preset: Preset,
      settings: OptimizerSettings,
      opts?: {
        weaponId?: string
        onProgress?: (p: OptimizeProgress) => void
        signal?: AbortSignal
        maxWorkers?: number
      }
    ): Promise<OptimizeResult> {
      const { db, teamId, targetTeamCharId } = hydrateTeamIntoDb(
        goodObj,
        preset
      )
      const overrideWeapon = opts?.weaponId
        ? db.weapons.get(opts.weaponId)
        : undefined
      return runSolver(db, teamId, targetTeamCharId, preset, settings, {
        overrideWeapon,
        onProgress: opts?.onProgress,
        signal: opts?.signal,
      })
    },

    listTargets(characterKey: string) {
      return listTargetsForCharacter(characterKey, baseDb)
    },

    listConditionals(characterKey: string) {
      return listConditionalsForCharacter(characterKey, baseDb)
    },

    exportGODatabase(preset: Preset, selection?: BuildSelection): object {
      const { db } = hydrateTeamIntoDb(goodObj, preset, selection)
      return db.exportGOOD()
    },
  }
}
