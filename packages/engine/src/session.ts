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

export interface HydratedPresetTeam {
  teamId: string
  targetTeamCharId: string
}

export interface HydratedTeam extends HydratedPresetTeam {
  db: ArtCharDatabase
}

const dbPresetCache = new WeakMap<
  object,
  { fingerprint: string; hydrated: HydratedPresetTeam }
>()

function presetTeamFingerprint(preset: Preset): string {
  return JSON.stringify({
    id: preset.id,
    target: preset.target,
    team: preset.team,
    enemy: preset.enemy,
    teamConditional: preset.teamConditional,
    rotation: preset.rotation,
  })
}

/**
 * Hydrates a preset's team, teamChars, and buildTcs into an already-imported
 * `ArtCharDatabase` WITHOUT calling `db.importGOOD` or mutating equipped locations.
 * Caches `{ teamId, targetTeamCharId }` on `db` when the preset fingerprint is unchanged.
 */
export function hydratePresetTeam(
  db: ArtCharDatabase,
  preset: Preset
): HydratedPresetTeam {
  const fingerprint = presetTeamFingerprint(preset)
  const cached = dbPresetCache.get(db as object)
  if (
    cached &&
    cached.fingerprint === fingerprint &&
    db.teams.get(cached.hydrated.teamId) &&
    db.teamChars.get(cached.hydrated.targetTeamCharId)
  ) {
    return cached.hydrated
  }

  db.teams.clear()
  db.teamChars.clear()
  db.buildTcs.clear()

  const targetCharKey = preset.target as CharacterKey

  if (!db.chars.get(targetCharKey)) {
    db.chars.getWithInitWeapon(targetCharKey)
  }

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

    // Supporting teammates with `build.type === 'tc'` use their BuildTc stats exclusively,
    // but GO's TeamData requires the character key to exist in `db.chars`.
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

  const hydrated: HydratedPresetTeam = { teamId, targetTeamCharId }
  dbPresetCache.set(db as object, { fingerprint, hydrated })
  return hydrated
}

/**
 * Creates a standalone `ArtCharDatabase` from `goodData`, hydrates `preset` into it,
 * and optionally mutates equipped weapon/artifact locations for GO `.json` export.
 */
export function hydrateTeamIntoDb(
  goodData: object,
  preset: Preset,
  selection?: BuildSelection
): HydratedTeam {
  const db = new ArtCharDatabase(1, new SandboxStorage())
  db.importGOOD(goodData as never, false, false, false)

  const { teamId, targetTeamCharId } = hydratePresetTeam(db, preset)
  const targetCharKey = preset.target as CharacterKey

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
      const { teamId, targetTeamCharId } = hydratePresetTeam(baseDb, preset)
      const targetKey = preset.target as CharacterKey

      let overrideArts: ICachedArtifact[] | undefined
      if (selection?.artifactIds) {
        overrideArts = allArtifactSlotKeys
          .map((slot) => {
            const id = selection.artifactIds[slot as ArtifactSlot]
            return id ? baseDb.arts.get(id) : undefined
          })
          .filter(notEmpty)
      }

      let overrideWeapon: ICachedWeapon | undefined
      if (selection?.weaponId) {
        overrideWeapon = baseDb.weapons.get(selection.weaponId)
      }

      const bundle = getTeamData(
        baseDb,
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

      const calc = uiDataForTeam(bundle.teamData, baseDb.gender, targetKey)
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
      const { teamId, targetTeamCharId } = hydratePresetTeam(baseDb, preset)
      const overrideWeapon = opts?.weaponId
        ? baseDb.weapons.get(opts.weaponId)
        : undefined
      return runSolver(baseDb, teamId, targetTeamCharId, preset, settings, {
        overrideWeapon,
        onProgress: opts?.onProgress,
        signal: opts?.signal,
      })
    },

    listTargets(characterKey: string) {
      return listTargetsForCharacter(characterKey)
    },

    listConditionals(characterKey: string) {
      return listConditionalsForCharacter(characterKey)
    },

    exportGODatabase(preset: Preset, selection?: BuildSelection): object {
      const { db } = hydrateTeamIntoDb(goodObj, preset, selection)
      return db.exportGOOD()
    },
  }
}
