import { SandboxStorage } from '@genshin-optimizer/common/database'
import { notEmpty } from '@genshin-optimizer/common/util'
import {
  allArtifactSlotKeys,
  allElementWithPhyKeys,
  charKeyToLocCharKey,
  type CharacterKey,
  type WeaponKey,
} from '@genshin-optimizer/gi/consts'
import {
  ArtCharDatabase,
  type CustomMultiTarget,
  type CustomTarget,
  type ICachedArtifact,
  type ICachedWeapon,
  type LoadoutDatum,
} from '@genshin-optimizer/gi/db'
import { getWeaponStat } from '@genshin-optimizer/gi/stats'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import { input } from '@genshin-optimizer/gi/wr'
import type { Preset, RotationTarget, TcCharacter } from '@gi/presets'
import {
  listConditionalsForCharacter,
  listTargetsForCharacter,
} from './catalog'
import { runSolver } from './solver'
import { getTeamData, getTeamDataCalc } from './teamData'
import type {
  ArtifactSlot,
  BuildSelection,
  EngineSession,
  InstanceResult,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
  RotationResult,
  SimulatedWeaponSpec,
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

export function buildSimulatedCachedWeapon(
  spec: SimulatedWeaponSpec
): ICachedWeapon {
  const rarity = getWeaponStat(spec.key as WeaponKey)?.rarity ?? 5
  const isLowRarity = rarity <= 2
  const maxLvl = isLowRarity ? 70 : 90
  const maxAsc = isLowRarity ? 4 : 6
  const level = Math.max(1, Math.min(maxLvl, Math.round(spec.level ?? maxLvl)))
  const ascension = Math.max(
    0,
    Math.min(maxAsc, Math.round(spec.ascension ?? maxAsc))
  ) as 0 | 1 | 2 | 3 | 4 | 5 | 6
  const refinement = isLowRarity
    ? 1
    : (Math.max(1, Math.min(5, Math.round(spec.refinement || 1))) as
        | 1
        | 2
        | 3
        | 4
        | 5)

  return {
    id: `akasha_sim_${spec.key}_r${refinement}`,
    key: spec.key as WeaponKey,
    level,
    ascension,
    refinement,
    location: '',
    lock: false,
  }
}

export function resolveFixedTargetOverrides(
  preset: Preset,
  weaponOverride?: SimulatedWeaponSpec
): {
  isFixedTarget: boolean
  overrideChar?: TcCharacter
  overrideWeapon?: ICachedWeapon
  effectiveWeaponSpec?: SimulatedWeaponSpec
} {
  const targetMember = preset.team[0]
  if (targetMember?.build.type === 'fixed') {
    const wSpec: SimulatedWeaponSpec = weaponOverride ?? {
      key: targetMember.build.weapon.key,
      level: targetMember.build.weapon.level,
      ascension: targetMember.build.weapon.ascension,
      refinement: targetMember.build.weapon.refinement,
    }
    return {
      isFixedTarget: true,
      overrideChar: targetMember.build.character,
      overrideWeapon: buildSimulatedCachedWeapon(wSpec),
      effectiveWeaponSpec: wSpec,
    }
  }
  if (weaponOverride) {
    return {
      isFixedTarget: false,
      overrideWeapon: buildSimulatedCachedWeapon(weaponOverride),
      effectiveWeaponSpec: weaponOverride,
    }
  }
  return { isFixedTarget: false }
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

function presetTeamFingerprint(
  preset: Preset,
  activeWeaponKey?: string
): string {
  return JSON.stringify({
    id: preset.id,
    target: preset.target,
    team: preset.team,
    enemy: preset.enemy,
    teamConditional: preset.teamConditional,
    rotation: preset.rotation,
    activeWeaponKey: activeWeaponKey ?? '',
  })
}

/**
 * Hydrates a preset's team, teamChars, and buildTcs into an already-imported
 * `ArtCharDatabase` WITHOUT calling `db.importGOOD` or mutating equipped locations.
 * Caches `{ teamId, targetTeamCharId }` on `db` when the preset fingerprint is unchanged.
 */
export function hydratePresetTeam(
  db: ArtCharDatabase,
  preset: Preset,
  activeWeaponKey?: string
): HydratedPresetTeam {
  const targetMember = preset.team[0]
  const resolvedWeaponKey =
    activeWeaponKey ??
    (targetMember?.build.type === 'fixed'
      ? targetMember.build.weapon.key
      : undefined)

  const fingerprint = presetTeamFingerprint(preset, resolvedWeaponKey)
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
    // and fixed Akasha targets use `overrideChar` + `overrideWeapon`,
    // but GO's TeamData requires the character key to exist in `db.chars`.
    if (!db.chars.get(mKey)) {
      db.chars.getWithInitWeapon(mKey)
    }

    let memberConditional = member.conditional
    if (
      isTarget &&
      member.build.type === 'fixed' &&
      resolvedWeaponKey &&
      !member.conditional[resolvedWeaponKey]
    ) {
      // Auto-populate GO weapon conditionals for a user-selected simulated weapon
      // when that weapon has conditional states not explicitly authored in the preset.
      const weaponConds = listConditionalsForCharacter(mKey).filter(
        (c) => c.sheet === resolvedWeaponKey && c.states.length > 0
      )
      if (weaponConds.length > 0) {
        const sheetStates: Record<string, string> = {}
        for (const wc of weaponConds) {
          const maxState = wc.states[wc.states.length - 1]
          if (maxState) {
            sheetStates[wc.key] = maxState.key
          }
        }
        memberConditional = {
          ...member.conditional,
          [resolvedWeaponKey]: sheetStates,
        }
      }
    }

    const tcId = db.teamChars.new(mKey, {
      name: `${preset.name} — ${mKey}`,
      description: preset.description ?? '',
      conditional: memberConditional as never,
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

  const { isFixedTarget, overrideChar, overrideWeapon, effectiveWeaponSpec } =
    resolveFixedTargetOverrides(preset, selection?.weaponOverride)

  const { teamId, targetTeamCharId } = hydratePresetTeam(
    db,
    preset,
    effectiveWeaponSpec?.key
  )
  const targetCharKey = preset.target as CharacterKey
  const locKey = charKeyToLocCharKey(targetCharKey)

  if (isFixedTarget && overrideChar && overrideWeapon) {
    // Write the fixed character spec and simulated weapon into the exported DB
    // so "Verify in GO" exports and round-trips with exact Akasha fixed stats.
    db.chars.set(targetCharKey, {
      key: targetCharKey,
      level: overrideChar.level,
      ascension: overrideChar.ascension as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      constellation: overrideChar.constellation,
      talent: { ...overrideChar.talent },
    })
    const existingEquippedId = db.chars.get(targetCharKey)?.equippedWeapon
    if (existingEquippedId && db.weapons.get(existingEquippedId)) {
      db.weapons.set(existingEquippedId, { location: '' })
    }
    db.weapons.new({
      key: overrideWeapon.key,
      level: overrideWeapon.level,
      ascension: overrideWeapon.ascension,
      refinement: overrideWeapon.refinement,
      location: locKey,
      lock: false,
    })
  }

  if (selection) {
    if (!isFixedTarget && selection.weaponId) {
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
      const artifactIds: Partial<Record<ArtifactSlot, string>> = {}
      if (char) {
        for (const slot of allArtifactSlotKeys) {
          const id = char.equippedArtifacts[slot]
          if (id && baseDb.arts.get(id)) {
            artifactIds[slot as ArtifactSlot] = id
          }
        }
      }

      const targetMember = preset.team[0]
      if (targetMember?.build.type === 'fixed') {
        return {
          weaponOverride: {
            key: targetMember.build.weapon.key,
            level: targetMember.build.weapon.level,
            ascension: targetMember.build.weapon.ascension,
            refinement: targetMember.build.weapon.refinement,
          },
          artifactIds,
        }
      }

      return {
        weaponId: char?.equippedWeapon || undefined,
        artifactIds,
      }
    },

    evaluate(preset: Preset, selection?: BuildSelection): RotationResult {
      const {
        isFixedTarget,
        overrideChar,
        overrideWeapon: fixedOrSimWeapon,
        effectiveWeaponSpec,
      } = resolveFixedTargetOverrides(preset, selection?.weaponOverride)

      const { teamId, targetTeamCharId } = hydratePresetTeam(
        baseDb,
        preset,
        effectiveWeaponSpec?.key
      )
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

      let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
      if (!isFixedTarget && !overrideWeapon && selection?.weaponId) {
        overrideWeapon = baseDb.weapons.get(selection.weaponId)
      }

      const bundle = getTeamData(
        baseDb,
        teamId,
        targetTeamCharId,
        0,
        overrideArts,
        overrideWeapon,
        overrideChar
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
        weaponOverride?: SimulatedWeaponSpec
        onProgress?: (p: OptimizeProgress) => void
        signal?: AbortSignal
        maxWorkers?: number
      }
    ): Promise<OptimizeResult> {
      const {
        isFixedTarget,
        overrideChar,
        overrideWeapon: fixedOrSimWeapon,
        effectiveWeaponSpec,
      } = resolveFixedTargetOverrides(preset, opts?.weaponOverride)

      const { teamId, targetTeamCharId } = hydratePresetTeam(
        baseDb,
        preset,
        effectiveWeaponSpec?.key
      )

      let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
      if (!isFixedTarget && !overrideWeapon && opts?.weaponId) {
        overrideWeapon = baseDb.weapons.get(opts.weaponId)
      }

      return runSolver(baseDb, teamId, targetTeamCharId, preset, settings, {
        overrideWeapon,
        overrideChar,
        weaponOverrideSpec: isFixedTarget ? effectiveWeaponSpec : opts?.weaponOverride,
        onProgress: opts?.onProgress,
        signal: opts?.signal,
        maxWorkers: opts?.maxWorkers,
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
