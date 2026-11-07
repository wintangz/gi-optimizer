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
import { getCharStat, getWeaponStat } from '@genshin-optimizer/gi/stats'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import { input } from '@genshin-optimizer/gi/wr'
import {
  applyMemberConditionalOverrides,
  readEffectiveConditionalValue,
  resolvePresetMemberBuildMode,
  type MemberBuildMode,
  type MemberConditionalsMap,
  type Preset,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type RotationTarget,
  type TcCharacter,
} from '@gi/presets'
import {
  getDefaultTargetArtifactSetConditionals,
  listConditionalsForCharacter,
  listTargetsForCharacter,
  listWeaponConditionals,
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
  WeaponCompareCandidate,
  WeaponCompareProgress,
  WeaponCompareResult,
  WeaponCompareRowResult,
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

const dbImportedCharKeys = new WeakMap<object, ReadonlySet<string>>()

function extractGoodCharKeys(good: unknown): Set<string> {
  const goodObj =
    typeof good === 'object' && good !== null
      ? (good as { characters?: Array<{ key?: string }> })
      : {}
  return new Set<string>(
    Array.isArray(goodObj.characters)
      ? goodObj.characters
          .map((c) => c?.key)
          .filter((k): k is string => Boolean(k))
      : []
  )
}

export { applyMemberConditionalOverrides, readEffectiveConditionalValue }

export interface HydratePresetTeamOptions {
  ownedCharKeys?: ReadonlySet<string>
  memberBuildModes?: Record<string, MemberBuildMode>
  memberConditionals?: PresetMemberConditionalOverrides
}

export function computeDefaultMemberConditionals(opts: {
  preset: Preset
  memberIndex: number
  resolvedMemberMode: MemberBuildMode
  activeTargetWeaponKey?: string
  memberOwnedWeaponKey?: string
}): MemberConditionalsMap {
  const {
    preset,
    memberIndex,
    resolvedMemberMode,
    activeTargetWeaponKey,
    memberOwnedWeaponKey,
  } = opts
  const member = preset.team[memberIndex]
  if (!member) return {}
  const isTarget = memberIndex === 0
  const isOfficialOwnedMember =
    !isTarget && preset.source === 'official' && resolvedMemberMode === 'owned'

  let memberConditional: MemberConditionalsMap

  if (isOfficialOwnedMember) {
    // Preset-authored conditionals describe the simulated ('tc') build only.
    // An owned member gets the same conditional derivation an owned target gets today:
    // worn artifact-set conditionals + weapon conditionals from the member's actual build in db.
    memberConditional = {}
    const defaultArtSetConds = getDefaultTargetArtifactSetConditionals()
    for (const [setKey, defaultStates] of Object.entries(defaultArtSetConds)) {
      memberConditional[setKey] = { ...defaultStates }
    }

    if (memberOwnedWeaponKey) {
      const weaponConds = listWeaponConditionals(memberOwnedWeaponKey)
      if (weaponConds.length > 0) {
        const sheetStates: Record<string, string> = {}
        for (const wc of weaponConds) {
          const maxState = wc.states[wc.states.length - 1]
          if (maxState) {
            sheetStates[wc.key] = maxState.key
          }
        }
        memberConditional[memberOwnedWeaponKey] = sheetStates
      }
    }
  } else {
    memberConditional = {}
    for (const [sKey, sMap] of Object.entries(member.conditional ?? {})) {
      if (sMap) {
        memberConditional[sKey] = { ...sMap }
      }
    }

    // Target boolean artifact-set conditionals default to 'on' for every set
    // unless the preset explicitly authors an entry for that set.
    if (isTarget) {
      const defaultArtSetConds = getDefaultTargetArtifactSetConditionals()
      for (const [setKey, defaultStates] of Object.entries(
        defaultArtSetConds
      )) {
        if (!member.conditional[setKey]) {
          memberConditional[setKey] = { ...defaultStates }
        }
      }
    }

    // Auto-populate GO weapon conditionals at their max state when the target
    // ('fixed' or 'owned') has an explicit weapon choice and the preset's
    // conditional map has no entry for that weapon's sheet.
    if (
      isTarget &&
      (member.build.type === 'fixed' || member.build.type === 'owned') &&
      activeTargetWeaponKey &&
      !member.conditional[activeTargetWeaponKey]
    ) {
      const weaponConds = listWeaponConditionals(activeTargetWeaponKey)
      if (weaponConds.length > 0) {
        const sheetStates: Record<string, string> = {}
        for (const wc of weaponConds) {
          const maxState = wc.states[wc.states.length - 1]
          if (maxState) {
            sheetStates[wc.key] = maxState.key
          }
        }
        memberConditional = {
          ...memberConditional,
          [activeTargetWeaponKey]: sheetStates,
        }
      }
    }

    // Bridge legacy ArchaicPetra `ele` -> GO's `element` conditional key when authored as `ele`.
    if (
      memberConditional.ArchaicPetra?.ele &&
      !memberConditional.ArchaicPetra.element
    ) {
      memberConditional = {
        ...memberConditional,
        ArchaicPetra: {
          ...memberConditional.ArchaicPetra,
          element: memberConditional.ArchaicPetra.ele,
        },
      }
    }
  }

  return memberConditional
}

export function resolveEffectiveTeamConditionals(opts: {
  preset: Preset
  goodData?: unknown
  activeTargetWeaponKey?: string
  memberBuildModes?: Record<string, MemberBuildMode>
  memberConditionals?: PresetMemberConditionalOverrides
}): {
  defaultsByMember: Record<string, MemberConditionalsMap>
  effectiveByMember: Record<string, MemberConditionalsMap>
  activeWeaponKeyByMember: Record<string, string | undefined>
  activeArtSetsByMember: Record<string, Record<string, number>>
  resolvedBuildByMember: Record<string, ResolvedMemberBuild>
} {
  const {
    preset,
    goodData,
    activeTargetWeaponKey,
    memberBuildModes,
    memberConditionals,
  } = opts
  const ownedCharKeys = extractGoodCharKeys(goodData)
  const goodObj =
    typeof goodData === 'object' && goodData !== null
      ? (goodData as {
          weapons?: Array<{ key?: string; location?: string }>
          artifacts?: Array<{ setKey?: string; location?: string }>
        })
      : {}
  const weaponsList = Array.isArray(goodObj.weapons) ? goodObj.weapons : []
  const artifactsList = Array.isArray(goodObj.artifacts)
    ? goodObj.artifacts
    : []

  const defaultsByMember: Record<string, MemberConditionalsMap> = {}
  const effectiveByMember: Record<string, MemberConditionalsMap> = {}
  const activeWeaponKeyByMember: Record<string, string | undefined> = {}
  const activeArtSetsByMember: Record<string, Record<string, number>> = {}
  const resolvedBuildByMember: Record<string, ResolvedMemberBuild> = {}

  const targetMember = preset.team[0]
  const resolvedTargetWepKey =
    activeTargetWeaponKey ??
    (targetMember?.build.type === 'fixed'
      ? targetMember.build.weapon.key
      : undefined)

  for (let i = 0; i < Math.min(4, preset.team.length); i++) {
    const member = preset.team[i]!
    const mKey = member.key
    const isTarget = i === 0
    const locKey = charKeyToLocCharKey(mKey as CharacterKey)
    const resolvedMember = resolvePresetMemberBuildMode({
      presetSource: preset.source,
      isTarget,
      memberBuildType: member.build.type,
      characterKey: mKey,
      ownedCharKeys,
      overrideMode: memberBuildModes?.[mKey],
    })
    resolvedBuildByMember[mKey] = resolvedMember

    const equippedWeaponInGood = weaponsList.find(
      (w) => w?.location === locKey && w.key
    )?.key

    let memberWeaponKey: string | undefined
    const artSetCounts: Record<string, number> = {}

    if (isTarget) {
      memberWeaponKey = resolvedTargetWepKey ?? equippedWeaponInGood
      for (const art of artifactsList) {
        if (art?.location === locKey && art.setKey) {
          artSetCounts[art.setKey] = (artSetCounts[art.setKey] ?? 0) + 1
        }
      }
    } else if (resolvedMember.mode === 'owned') {
      memberWeaponKey = equippedWeaponInGood
      for (const art of artifactsList) {
        if (art?.location === locKey && art.setKey) {
          artSetCounts[art.setKey] = (artSetCounts[art.setKey] ?? 0) + 1
        }
      }
    } else if (member.build.type === 'tc') {
      memberWeaponKey = member.build.tc.weapon.key
      for (const [setKey, count] of Object.entries(
        member.build.tc.artifact.sets ?? {}
      )) {
        if (typeof count === 'number' && count > 0) {
          artSetCounts[setKey] = count
        }
      }
    } else if (member.build.type === 'fixed') {
      memberWeaponKey = member.build.weapon.key
    }

    activeWeaponKeyByMember[mKey] = memberWeaponKey
    activeArtSetsByMember[mKey] = artSetCounts

    const defaultMap = computeDefaultMemberConditionals({
      preset,
      memberIndex: i,
      resolvedMemberMode: resolvedMember.mode,
      activeTargetWeaponKey: resolvedTargetWepKey,
      memberOwnedWeaponKey: equippedWeaponInGood,
    })
    defaultsByMember[mKey] = defaultMap
    effectiveByMember[mKey] = applyMemberConditionalOverrides(
      defaultMap,
      memberConditionals?.[mKey]
    )
  }

  return {
    defaultsByMember,
    effectiveByMember,
    activeWeaponKeyByMember,
    activeArtSetsByMember,
    resolvedBuildByMember,
  }
}

function presetTeamFingerprint(
  preset: Preset,
  activeWeaponKey: string | undefined,
  effectiveMemberModes: MemberBuildMode[],
  memberConditionals?: PresetMemberConditionalOverrides
): string {
  return JSON.stringify({
    id: preset.id,
    source: preset.source,
    target: preset.target,
    team: preset.team,
    enemy: preset.enemy,
    teamConditional: preset.teamConditional,
    rotation: preset.rotation,
    activeWeaponKey: activeWeaponKey ?? '',
    effectiveMemberModes,
    memberConditionals: memberConditionals ?? {},
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
  activeWeaponKey?: string,
  opts?: HydratePresetTeamOptions
): HydratedPresetTeam {
  let ownedCharKeys =
    opts?.ownedCharKeys ?? dbImportedCharKeys.get(db as object)
  if (!ownedCharKeys) {
    ownedCharKeys = new Set<string>(db.chars.keys as string[])
    dbImportedCharKeys.set(db as object, ownedCharKeys)
  }

  const targetMember = preset.team[0]
  const resolvedWeaponKey =
    activeWeaponKey ??
    (targetMember?.build.type === 'fixed'
      ? targetMember.build.weapon.key
      : undefined)

  const resolvedMembers = preset.team
    .slice(0, 4)
    .map((member, idx) =>
      resolvePresetMemberBuildMode({
        presetSource: preset.source,
        isTarget: idx === 0,
        memberBuildType: member.build.type,
        characterKey: member.key,
        ownedCharKeys,
        overrideMode: opts?.memberBuildModes?.[member.key],
      })
    )

  const fingerprint = presetTeamFingerprint(
    preset,
    resolvedWeaponKey,
    resolvedMembers.map((m) => m.mode),
    opts?.memberConditionals
  )
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
    const resolvedMember = resolvedMembers[i]!

    // Supporting teammates with `build.type === 'tc'` use their BuildTc stats exclusively,
    // and fixed Akasha targets use `overrideChar` + `overrideWeapon`,
    // but GO's TeamData requires the character key to exist in `db.chars`.
    if (!db.chars.get(mKey)) {
      db.chars.getWithInitWeapon(mKey)
    }

    const charInDb = db.chars.get(mKey)
    const equippedWeaponKey = charInDb?.equippedWeapon
      ? db.weapons.get(charInDb.equippedWeapon)?.key
      : undefined

    const defaultMemberConditional = computeDefaultMemberConditionals({
      preset,
      memberIndex: i,
      resolvedMemberMode: resolvedMember.mode,
      activeTargetWeaponKey: resolvedWeaponKey,
      memberOwnedWeaponKey: equippedWeaponKey,
    })

    const memberConditional = applyMemberConditionalOverrides(
      defaultMemberConditional,
      opts?.memberConditionals?.[mKey]
    )

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

    if (!isTarget && resolvedMember.mode === 'tc' && member.build.type === 'tc') {
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

  // Fill teamConditional.resonance with 'on' for any element appearing 2+ times
  // in the team when the preset does not specify it.
  const rawResonance = preset.teamConditional?.resonance ?? {}
  const effectiveResonance: Record<string, string> = { ...rawResonance }
  const eleCounts: Record<string, number> = {}
  for (let i = 0; i < Math.min(4, preset.team.length); i++) {
    const mKey = preset.team[i]!.key as CharacterKey
    const ele = (getCharStat(mKey) as { ele?: string } | undefined)?.ele
    if (ele) {
      eleCounts[ele] = (eleCounts[ele] ?? 0) + 1
    }
  }
  for (const [ele, count] of Object.entries(eleCounts)) {
    if (count >= 2) {
      const capEle = ele.charAt(0).toUpperCase() + ele.slice(1)
      const authoredVal = rawResonance[capEle] ?? rawResonance[ele]
      if (authoredVal === undefined) {
        effectiveResonance[capEle] = 'on'
        effectiveResonance[ele] = 'on'
      }
      const activeVal = effectiveResonance[capEle] ?? effectiveResonance[ele]
      if (activeVal === 'on') {
        if (ele === 'cryo') {
          effectiveResonance.ShatteringIce ??= 'on'
        } else if (ele === 'geo') {
          effectiveResonance.EnduringRock ??= 'on'
          effectiveResonance.EnduringRockHit ??= 'on'
        } else if (ele === 'dendro') {
          effectiveResonance.SprawlingCanopy2ele ??= 'on'
          effectiveResonance.SprawlingCanopy3ele ??= 'on'
        }
      }
    }
  }

  const teamId = db.teams.new({
    name: preset.name,
    description: preset.description ?? '',
    enemyOverride: enemyOverride as never,
    conditional: {
      resonance: effectiveResonance,
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
  const goodCharKeys = extractGoodCharKeys(goodData)
  const db = new ArtCharDatabase(1, new SandboxStorage())
  db.importGOOD(goodData as never, false, false, false)
  dbImportedCharKeys.set(db as object, goodCharKeys)

  const { isFixedTarget, overrideChar, overrideWeapon, effectiveWeaponSpec } =
    resolveFixedTargetOverrides(preset, selection?.weaponOverride)

  const selectedWeaponKey =
    effectiveWeaponSpec?.key ??
    (!isFixedTarget && selection?.weaponId
      ? db.weapons.get(selection.weaponId)?.key
      : undefined)

  const { teamId, targetTeamCharId } = hydratePresetTeam(
    db,
    preset,
    selectedWeaponKey,
    {
      ownedCharKeys: goodCharKeys,
      memberBuildModes: selection?.memberBuildModes,
      memberConditionals: selection?.memberConditionals,
    }
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
    if (!isFixedTarget && overrideWeapon) {
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
    } else if (!isFixedTarget && selection.weaponId) {
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

export function resolveDefaultWeaponCompareCandidate(
  weaponKey: string,
  targetCharKey: string,
  goodData?: unknown
): WeaponCompareCandidate {
  const rarity = getWeaponStat(weaponKey as WeaponKey)?.rarity ?? 5
  const isLowRarity = rarity <= 2
  const maxLvl = isLowRarity ? 70 : 90
  const maxAsc = isLowRarity ? 4 : 6

  const goodObj =
    typeof goodData === 'object' && goodData !== null
      ? (goodData as {
          weapons?: Array<{
            id?: string
            key?: string
            level?: number
            ascension?: number
            refinement?: number
            location?: string
          }>
        })
      : {}
  const weapons = Array.isArray(goodObj.weapons) ? goodObj.weapons : []

  const equippedOnTarget = weapons.find(
    (w) => w?.key === weaponKey && w?.location === targetCharKey
  )
  const ownedCopies = weapons
    .filter((w) => w?.key === weaponKey)
    .sort((a, b) => {
      const lvlDiff = (b.level ?? 1) - (a.level ?? 1)
      if (lvlDiff !== 0) return lvlDiff
      const refDiff = (b.refinement ?? 1) - (a.refinement ?? 1)
      if (refDiff !== 0) return refDiff
      return (b.ascension ?? 0) - (a.ascension ?? 0)
    })

  const match = equippedOnTarget ?? ownedCopies[0]
  if (match) {
    const level = Math.max(1, Math.min(maxLvl, Math.round(match.level ?? maxLvl)))
    const ascension = Math.max(
      0,
      Math.min(maxAsc, Math.round(match.ascension ?? maxAsc))
    )
    const refinement = isLowRarity
      ? 1
      : Math.max(1, Math.min(5, Math.round(match.refinement ?? 1)))
    return {
      weaponKey,
      level,
      ascension,
      refinement,
      isOwned: true,
      ownedWeaponId: match.id,
      isEquippedBaseline: match.location === targetCharKey,
    }
  }

  return {
    weaponKey,
    level: maxLvl,
    ascension: maxAsc,
    refinement: 1,
    isOwned: false,
    isEquippedBaseline: false,
  }
}

export function rankWeaponCompareRows(
  completedRows: readonly WeaponCompareRowResult[],
  cancelled = false
): WeaponCompareResult {
  const okRows = completedRows
    .filter((r) => r.status === 'ok' && r.total !== null)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))

  const unmetRows = completedRows.filter((r) => r.status !== 'ok')

  const leaderTotal =
    okRows.length > 0 && okRows[0]!.total !== null ? okRows[0]!.total : null

  const rankedOk: WeaponCompareRowResult[] = okRows.map((row, idx) => {
    const rowTotal = row.total ?? 0
    const pctBehind =
      leaderTotal !== null && leaderTotal > 0
        ? idx === 0
          ? 0
          : Math.max(0, ((leaderTotal - rowTotal) / leaderTotal) * 100)
        : 0
    return {
      ...row,
      rank: idx + 1,
      percentBehindLeader: pctBehind,
    }
  })

  const rankedUnmet: WeaponCompareRowResult[] = unmetRows.map((row) => ({
    ...row,
    rank: null,
    total: null,
    percentBehindLeader: null,
    bestBuild: null,
    evaluation: null,
  }))

  return {
    rows: [...rankedOk, ...rankedUnmet],
    leaderTotal,
    cancelled,
  }
}

export async function compareWeapons(
  session: Pick<EngineSession, 'optimize' | 'evaluate'>,
  preset: Preset,
  settings: OptimizerSettings,
  candidates: readonly WeaponCompareCandidate[],
  opts?: {
    memberBuildModes?: Record<string, MemberBuildMode>
    memberConditionals?: PresetMemberConditionalOverrides
    onProgress?: (p: WeaponCompareProgress) => void
    signal?: AbortSignal
    maxWorkers?: number
  }
): Promise<WeaponCompareResult> {
  const completedRows: WeaponCompareRowResult[] = []
  let cancelled = false

  const effectiveMemberBuildModes =
    opts?.memberBuildModes ?? settings.memberBuildModes?.[preset.id]
  const effectiveMemberConditionals =
    opts?.memberConditionals ?? settings.memberConditionalOverrides?.[preset.id]

  for (let i = 0; i < candidates.length; i++) {
    if (opts?.signal?.aborted) {
      cancelled = true
      break
    }

    const candidate = candidates[i]!
    const weaponOverride: SimulatedWeaponSpec = {
      key: candidate.weaponKey,
      level: candidate.level,
      ascension: candidate.ascension,
      refinement: candidate.refinement,
    }

    let optRes: OptimizeResult
    try {
      optRes = await session.optimize(preset, settings, {
        weaponOverride,
        memberBuildModes: effectiveMemberBuildModes,
        memberConditionals: effectiveMemberConditionals,
        signal: opts?.signal,
        maxWorkers: opts?.maxWorkers,
        onProgress: (solverProgress) => {
          opts?.onProgress?.({
            weaponIndex: i,
            totalWeapons: candidates.length,
            weaponKey: candidate.weaponKey,
            solverProgress,
            completedRows: [...completedRows],
          })
        },
      })
    } catch (err) {
      if (
        opts?.signal?.aborted ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        cancelled = true
        break
      }
      throw err
    }

    if (opts?.signal?.aborted) {
      cancelled = true
      break
    }

    const best = optRes.builds[0]
    if (!best) {
      completedRows.push({
        candidate: { ...candidate },
        status: 'unmet',
        rank: null,
        total: null,
        percentBehindLeader: null,
        bestBuild: null,
        evaluation: null,
        tested: optRes.tested,
        skipped: optRes.skipped,
        durationMs: optRes.durationMs,
      })
      continue
    }

    const selectionForEval: BuildSelection = {
      ...best,
      weaponOverride,
      ...(effectiveMemberBuildModes &&
      Object.keys(effectiveMemberBuildModes).length > 0
        ? { memberBuildModes: effectiveMemberBuildModes }
        : {}),
      ...(effectiveMemberConditionals &&
      Object.keys(effectiveMemberConditionals).length > 0
        ? { memberConditionals: effectiveMemberConditionals }
        : {}),
    }
    const evaluation = session.evaluate(preset, selectionForEval)

    completedRows.push({
      candidate: { ...candidate },
      status: 'ok',
      rank: null,
      total: evaluation.total,
      percentBehindLeader: null,
      bestBuild: {
        ...selectionForEval,
        total: evaluation.total,
      },
      evaluation,
      tested: optRes.tested,
      skipped: optRes.skipped,
      durationMs: optRes.durationMs,
    })
  }

  return rankWeaponCompareRows(completedRows, cancelled)
}

export function createSession(good: unknown): EngineSession {
  const goodObj =
    typeof good === 'object' && good !== null
      ? (good as {
          characters?: Array<{ key?: string }>
          weapons?: Array<{ key?: string; location?: string }>
        })
      : {}
  const goodCharKeys = extractGoodCharKeys(goodObj)
  const goodEquippedWeaponByChar = new Set<string>(
    Array.isArray(goodObj.weapons)
      ? goodObj.weapons
          .map((w) => w?.location)
          .filter((loc): loc is string => Boolean(loc))
      : []
  )
  const baseDb = new ArtCharDatabase(1, new SandboxStorage())
  baseDb.importGOOD(goodObj as never, false, false, false)
  dbImportedCharKeys.set(baseDb as object, goodCharKeys)

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
        const hasExplicitGoodWeapon =
          goodCharKeys.has(targetKey) && goodEquippedWeaponByChar.has(targetKey)
        const equippedId = hasExplicitGoodWeapon
          ? char?.equippedWeapon
          : undefined
        const equippedWeapon = equippedId
          ? baseDb.weapons.get(equippedId)
          : undefined
        if (equippedWeapon) {
          const rarity =
            getWeaponStat(equippedWeapon.key as WeaponKey)?.rarity ?? 5
          const isLowRarity = rarity <= 2
          return {
            weaponOverride: {
              key: equippedWeapon.key,
              level: isLowRarity ? 70 : 90,
              ascension: isLowRarity ? 4 : 6,
              refinement: isLowRarity ? 1 : equippedWeapon.refinement,
            },
            artifactIds,
          }
        }
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

      let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
      if (!isFixedTarget && !overrideWeapon && selection?.weaponId) {
        overrideWeapon = baseDb.weapons.get(selection.weaponId)
      }

      const { teamId, targetTeamCharId } = hydratePresetTeam(
        baseDb,
        preset,
        effectiveWeaponSpec?.key ?? overrideWeapon?.key,
        {
          ownedCharKeys: goodCharKeys,
          memberBuildModes: selection?.memberBuildModes,
          memberConditionals: selection?.memberConditionals,
        }
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
        memberBuildModes?: Record<string, MemberBuildMode>
        memberConditionals?: PresetMemberConditionalOverrides
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

      let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
      if (!isFixedTarget && !overrideWeapon && opts?.weaponId) {
        overrideWeapon = baseDb.weapons.get(opts.weaponId)
      }

      const effectiveMemberBuildModes =
        opts?.memberBuildModes ?? settings.memberBuildModes?.[preset.id]
      const effectiveMemberConditionals =
        opts?.memberConditionals ??
        settings.memberConditionalOverrides?.[preset.id]

      const { teamId, targetTeamCharId } = hydratePresetTeam(
        baseDb,
        preset,
        effectiveWeaponSpec?.key ?? overrideWeapon?.key,
        {
          ownedCharKeys: goodCharKeys,
          memberBuildModes: effectiveMemberBuildModes,
          memberConditionals: effectiveMemberConditionals,
        }
      )

      return runSolver(baseDb, teamId, targetTeamCharId, preset, settings, {
        overrideWeapon,
        overrideChar,
        weaponOverrideSpec: isFixedTarget ? effectiveWeaponSpec : opts?.weaponOverride,
        memberBuildModes: effectiveMemberBuildModes,
        memberConditionals: effectiveMemberConditionals,
        onProgress: opts?.onProgress,
        signal: opts?.signal,
        maxWorkers: opts?.maxWorkers,
      })
    },

    async compareWeapons(
      preset: Preset,
      settings: OptimizerSettings,
      candidates: readonly WeaponCompareCandidate[],
      opts?: {
        memberBuildModes?: Record<string, MemberBuildMode>
        memberConditionals?: PresetMemberConditionalOverrides
        onProgress?: (p: WeaponCompareProgress) => void
        signal?: AbortSignal
        maxWorkers?: number
      }
    ): Promise<WeaponCompareResult> {
      return compareWeapons(
        {
          optimize: (p, s, o) => this.optimize(p, s, o),
          evaluate: (p, sel) => this.evaluate(p, sel),
        },
        preset,
        settings,
        candidates,
        opts
      )
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
