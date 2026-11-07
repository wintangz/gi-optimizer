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
  resolveRotationTargetOwner,
  type MemberBuildMode,
  type MemberConditionalsMap,
  type Preset,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type RotationTarget,
  type TcCharacter,
  type TeamMember,
} from '@gi/presets'
import {
  extractDamageRowBreakdown,
  extractStatBreakdowns,
} from './breakdown'
import {
  getDefaultTargetArtifactSetConditionals,
  listConditionalsForCharacter,
  listTargetsForCharacter,
  listWeaponConditionals,
} from './catalog'
import { runSolver } from './solver'
import { getTeamData, getTeamDataCalc } from './teamData'
import {
  WEAPON_COMPARE_TOP_N,
  type ArtifactSlot,
  type BuildSelection,
  type EngineSession,
  type InstanceResult,
  type OptimizeProgress,
  type OptimizeResult,
  type OptimizerSettings,
  type RotationResult,
  type SimulatedWeaponSpec,
  type TeamMemberOptimizeResult,
  type TeamOptimizeOptions,
  type TeamOptimizeResult,
  type WeaponCompareBuildEntry,
  type WeaponCompareCandidate,
  type WeaponCompareProgress,
  type WeaponCompareResult,
  type WeaponCompareRowResult,
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
  preset: Preset,
  memberKey: string = preset.target
): CustomMultiTarget[] {
  const targetRows = preset.rotation.targets.filter(
    (rt) => resolveRotationTargetOwner(rt, preset).memberKey === memberKey
  )
  const combined: CustomMultiTarget = {
    name: preset.rotation.name || preset.name || 'Preset Rotation',
    description: preset.description || undefined,
    targets: targetRows.map((rt) =>
      toCustomTarget(
        {
          ...rt,
          path: resolveRotationTargetOwner(rt, preset).normPath,
        },
        memberKey
      )
    ),
  }

  // Create one single-target CustomMultiTarget per rotation row (with weight = 1)
  // at indices 1..K so GO evaluates each row's exact perHit (including per-row
  // reaction, hitMode, infusionAura, bonusStats).
  const perInstance: CustomMultiTarget[] = targetRows.map((rt, idx) => ({
    name: rt.label || `Target ${idx + 1}`,
    description: undefined,
    targets: [
      toCustomTarget(
        {
          ...rt,
          path: resolveRotationTargetOwner(rt, preset).normPath,
        },
        memberKey,
        1
      ),
    ],
  }))

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
  weaponOverride?: SimulatedWeaponSpec,
  memberBuildModes?: Record<string, MemberBuildMode>,
  ownedCharKeys?: ReadonlySet<string>
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
  if (targetMember?.build.type === 'tc') {
    const resolvedMode = resolvePresetMemberBuildMode({
      presetSource: preset.source,
      isTarget: true,
      memberBuildType: targetMember.build.type,
      characterKey: targetMember.key,
      ownedCharKeys: ownedCharKeys ?? new Set(),
      overrideMode: memberBuildModes?.[targetMember.key],
    }).mode
    if (resolvedMode === 'tc') {
      const wSpec: SimulatedWeaponSpec = weaponOverride ?? {
        key: targetMember.build.tc.weapon.key,
        level: targetMember.build.tc.weapon.level,
        ascension: targetMember.build.tc.weapon.ascension,
        refinement: targetMember.build.tc.weapon.refinement,
      }
      return {
        isFixedTarget: true,
        overrideChar: targetMember.build.tc.character,
        overrideWeapon: buildSimulatedCachedWeapon(wSpec),
        effectiveWeaponSpec: wSpec,
      }
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
    !isTarget &&
    preset.source === 'official' &&
    member.build.type === 'tc' &&
    resolvedMemberMode === 'owned'

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
    // ('fixed', 'owned', or 'tc') has an explicit weapon choice and the preset's
    // conditional map has no entry for that weapon's sheet.
    if (
      isTarget &&
      (member.build.type === 'fixed' ||
        member.build.type === 'owned' ||
        member.build.type === 'tc') &&
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
  const resolvedTargetMode = targetMember
    ? resolvePresetMemberBuildMode({
        presetSource: preset.source,
        isTarget: true,
        memberBuildType: targetMember.build.type,
        characterKey: targetMember.key,
        ownedCharKeys,
        overrideMode: memberBuildModes?.[targetMember.key],
      }).mode
    : 'owned'
  const resolvedTargetWepKey =
    activeTargetWeaponKey ??
    (targetMember?.build.type === 'fixed'
      ? targetMember.build.weapon.key
      : targetMember?.build.type === 'tc' && resolvedTargetMode === 'tc'
        ? targetMember.build.tc.weapon.key
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
  const resolvedWeaponKey =
    activeWeaponKey ??
    (targetMember?.build.type === 'fixed'
      ? targetMember.build.weapon.key
      : targetMember?.build.type === 'tc' && resolvedMembers[0]?.mode === 'tc'
        ? targetMember.build.tc.weapon.key
        : undefined)

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
    resolveFixedTargetOverrides(
      preset,
      selection?.weaponOverride,
      selection?.memberBuildModes,
      goodCharKeys
    )

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
    const normalizedTopBuilds: WeaponCompareBuildEntry[] =
      row.topBuilds && row.topBuilds.length > 0
        ? row.topBuilds
            .slice(0, WEAPON_COMPARE_TOP_N)
            .map((entry, bIdx) => ({
              ...entry,
              rank: bIdx + 1,
            }))
        : row.bestBuild && row.evaluation
          ? [
              {
                rank: 1,
                selection: row.bestBuild,
                evaluation: row.evaluation,
              },
            ]
          : []
    return {
      ...row,
      rank: idx + 1,
      percentBehindLeader: pctBehind,
      topBuilds: normalizedTopBuilds,
    }
  })

  const rankedUnmet: WeaponCompareRowResult[] = unmetRows.map((row) => ({
    ...row,
    rank: null,
    total: null,
    percentBehindLeader: null,
    bestBuild: null,
    evaluation: null,
    topBuilds: [],
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

  const compareSettings: OptimizerSettings = {
    ...settings,
    topN: WEAPON_COMPARE_TOP_N,
  }

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
      optRes = await session.optimize(preset, compareSettings, {
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

    const candidateBuilds = optRes.builds.slice(0, WEAPON_COMPARE_TOP_N)
    if (candidateBuilds.length === 0) {
      completedRows.push({
        candidate: { ...candidate },
        status: 'unmet',
        rank: null,
        total: null,
        percentBehindLeader: null,
        bestBuild: null,
        evaluation: null,
        topBuilds: [],
        tested: optRes.tested,
        skipped: optRes.skipped,
        durationMs: optRes.durationMs,
      })
      continue
    }

    const topBuilds: WeaponCompareBuildEntry[] = candidateBuilds
      .map((b) => {
        const selectionForEval: BuildSelection = {
          ...b,
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
        return {
          rank: 0,
          selection: {
            ...selectionForEval,
            total: evaluation.total,
          },
          evaluation,
        }
      })
      .sort((a, b) => b.evaluation.total - a.evaluation.total)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }))

    const topEntry = topBuilds[0]!

    completedRows.push({
      candidate: { ...candidate },
      status: 'ok',
      rank: null,
      total: topEntry.evaluation.total,
      percentBehindLeader: null,
      bestBuild: topEntry.selection,
      evaluation: topEntry.evaluation,
      topBuilds,
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

  const currentMemberBuild = (
    preset: Preset,
    memberKey: string,
    effectiveMemberBuildModes?: Record<string, MemberBuildMode>
  ): BuildSelection => {
    const mKey = memberKey as CharacterKey
    const char = baseDb.chars.get(mKey)
    const artifactIds: Partial<Record<ArtifactSlot, string>> = {}
    if (char) {
      for (const slot of allArtifactSlotKeys) {
        const id = char.equippedArtifacts[slot]
        if (id && baseDb.arts.get(id)) {
          artifactIds[slot as ArtifactSlot] = id
        }
      }
    }

    const memberIdx = preset.team.findIndex((m) => m.key === memberKey)
    const member = memberIdx >= 0 ? preset.team[memberIdx] : preset.team[0]
    const isTarget = memberIdx <= 0

    if (member?.build.type === 'fixed') {
      const hasExplicitGoodWeapon =
        goodCharKeys.has(mKey) && goodEquippedWeaponByChar.has(mKey)
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
          key: member.build.weapon.key,
          level: member.build.weapon.level,
          ascension: member.build.weapon.ascension,
          refinement: member.build.weapon.refinement,
        },
        artifactIds,
      }
    }

    if (member?.build.type === 'tc') {
      const resolvedMode = resolvePresetMemberBuildMode({
        presetSource: preset.source,
        isTarget,
        memberBuildType: member.build.type,
        characterKey: memberKey,
        ownedCharKeys: goodCharKeys,
        overrideMode: effectiveMemberBuildModes?.[memberKey],
      }).mode
      const hasOwnedWep =
        goodCharKeys.has(mKey) && goodEquippedWeaponByChar.has(mKey)
      if (resolvedMode === 'owned' && hasOwnedWep) {
        return {
          weaponId: char?.equippedWeapon || undefined,
          artifactIds,
        }
      }
      return {
        weaponOverride: {
          key: member.build.tc.weapon.key,
          level: member.build.tc.weapon.level,
          ascension: member.build.tc.weapon.ascension,
          refinement: member.build.tc.weapon.refinement,
        },
        artifactIds,
      }
    }

    return {
      weaponId: char?.equippedWeapon || undefined,
      artifactIds,
    }
  }

  const buildMemberSubPreset = (
    preset: Preset,
    memberKey: string,
    memberRows: RotationTarget[],
    effectiveMemberBuildModes?: Record<string, MemberBuildMode>
  ): Preset => {
    const memberIdx = preset.team.findIndex((m) => m.key === memberKey)
    const normalizedTargets: RotationTarget[] = memberRows.map((rt) => ({
      ...rt,
      member: memberKey,
      path: resolveRotationTargetOwner(rt, preset).normPath,
    }))

    if (memberIdx <= 0) {
      return {
        ...preset,
        rotation: {
          ...preset.rotation,
          targets: normalizedTargets,
        },
      }
    }

    const member = preset.team[memberIdx]!
    const resolvedMode = resolvePresetMemberBuildMode({
      presetSource: preset.source,
      isTarget: false,
      memberBuildType: member.build.type,
      characterKey: memberKey,
      ownedCharKeys: goodCharKeys,
      overrideMode: effectiveMemberBuildModes?.[memberKey],
    }).mode

    let promotedBuild: TeamMember['build'] = member.build
    if (member.build.type === 'tc') {
      const hasOwnedWep =
        goodCharKeys.has(memberKey) && goodEquippedWeaponByChar.has(memberKey)
      if (resolvedMode === 'owned' && hasOwnedWep) {
        promotedBuild = { type: 'owned' }
      } else {
        promotedBuild = {
          type: 'fixed',
          character: member.build.tc.character,
          weapon: member.build.tc.weapon,
        }
      }
    }

    const promotedMember: TeamMember = {
      ...member,
      build: promotedBuild,
    }

    const otherMembers: TeamMember[] = preset.team
      .filter((_, idx) => idx !== memberIdx)
      .map((m, idx) => {
        if (idx === 0 && m.build.type === 'fixed' && !goodCharKeys.has(m.key)) {
          return {
            ...m,
            build: {
              type: 'tc',
              tc: {
                character: m.build.character,
                weapon: m.build.weapon,
                artifact: {
                  slots: {
                    flower: { statKey: 'hp', level: 20, rarity: 5 },
                    plume: { statKey: 'atk', level: 20, rarity: 5 },
                    sands: { statKey: 'atk_', level: 20, rarity: 5 },
                    goblet: { statKey: 'atk_', level: 20, rarity: 5 },
                    circlet: { statKey: 'critRate_', level: 20, rarity: 5 },
                  },
                  substats: { type: 'max', rarity: 5, stats: {} },
                  sets: {},
                },
              },
            },
          }
        }
        return m
      })

    return {
      ...preset,
      id: `${preset.id}__member_${memberKey}`,
      target: memberKey,
      team: [promotedMember, ...otherMembers],
      rotation: {
        ...preset.rotation,
        targets: normalizedTargets,
      },
    }
  }

  return {
    currentBuild(preset: Preset): BuildSelection {
      return currentMemberBuild(preset, preset.target)
    },

    evaluate(preset: Preset, selection?: BuildSelection): RotationResult {
      const hasNonTargetRows = preset.rotation.targets.some(
        (rt) => resolveRotationTargetOwner(rt, preset).memberKey !== preset.target
      )

      if (hasNonTargetRows) {
        const rowsByMember = new Map<
          string,
          Array<{ origIdx: number; rt: RotationTarget }>
        >()
        preset.rotation.targets.forEach((rt, origIdx) => {
          const { memberKey } = resolveRotationTargetOwner(rt, preset)
          const bucket = rowsByMember.get(memberKey) ?? []
          bucket.push({ origIdx, rt })
          rowsByMember.set(memberKey, bucket)
        })

        const instancesByOrigIdx: InstanceResult[] = new Array(
          preset.rotation.targets.length
        )
        let primaryStats: Record<string, number> = {}
        let primaryStatBreakdowns: RotationResult['statBreakdowns']

        // Ensure primary target is evaluated even if it has 0 rows so stats are populated
        if (!rowsByMember.has(preset.target)) {
          const firstRow = preset.rotation.targets[0]
          if (firstRow) {
            const targetSub = buildMemberSubPreset(
              preset,
              preset.target,
              [],
              selection?.memberBuildModes
            )
            try {
              const targetEval = this.evaluate(targetSub, selection)
              primaryStats = targetEval.stats
              primaryStatBreakdowns = targetEval.statBreakdowns
            } catch {
              primaryStats = {}
            }
          }
        }

        for (const [memberKey, indexedRows] of rowsByMember.entries()) {
          const subPreset = buildMemberSubPreset(
            preset,
            memberKey,
            indexedRows.map((x) => x.rt),
            selection?.memberBuildModes
          )
          const memberSel: BuildSelection | undefined =
            memberKey === preset.target
              ? selection
              : {
                  ...currentMemberBuild(
                    preset,
                    memberKey,
                    selection?.memberBuildModes
                  ),
                  ...(selection?.memberBuildModes
                    ? { memberBuildModes: selection.memberBuildModes }
                    : {}),
                  ...(selection?.memberConditionals
                    ? { memberConditionals: selection.memberConditionals }
                    : {}),
                }
          const subEval = this.evaluate(subPreset, memberSel)
          if (memberKey === preset.target) {
            primaryStats = subEval.stats
            primaryStatBreakdowns = subEval.statBreakdowns
          }
          indexedRows.forEach(({ origIdx, rt }, localIdx) => {
            const inst = subEval.instances[localIdx]
            if (inst) {
              instancesByOrigIdx[origIdx] = {
                ...inst,
                path: rt.path,
                member: memberKey,
              }
            }
          })
        }

        const instances = instancesByOrigIdx.filter(Boolean)
        const total = instances.reduce((acc, inst) => acc + inst.subtotal, 0)
        return {
          total,
          instances,
          stats: primaryStats,
          ...(primaryStatBreakdowns
            ? { statBreakdowns: primaryStatBreakdowns }
            : {}),
        }
      }
      const {
        isFixedTarget,
        overrideChar,
        overrideWeapon: fixedOrSimWeapon,
        effectiveWeaponSpec,
      } = resolveFixedTargetOverrides(
        preset,
        selection?.weaponOverride,
        selection?.memberBuildModes,
        goodCharKeys
      )

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
      const teamKeys = Object.keys(bundle.teamData) as CharacterKey[]
      const resolvedTargetWeaponKey =
        effectiveWeaponSpec?.key ??
        overrideWeapon?.key ??
        bundle.teamBundle[targetKey]?.weapon?.key

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
          const breakdown = extractDamageRowBreakdown({
            preset,
            rt,
            idx,
            perHit,
            subtotal,
            targetUiData,
            calc,
            targetKey,
            teamKeys,
            targetWeaponKey: resolvedTargetWeaponKey,
          })
          return {
            ...(rt.member ? { member: rt.member } : {}),
            label: rt.label || normPath.join('.'),
            path: rt.path,
            count: rt.count,
            perHit,
            subtotal,
            breakdown,
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

      const statBreakdowns = extractStatBreakdowns(
        targetUiData,
        calc,
        targetKey,
        teamKeys,
        resolvedTargetWeaponKey
      )

      return {
        total,
        instances,
        stats,
        statBreakdowns,
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
      const effectiveMemberBuildModes =
        opts?.memberBuildModes ?? settings.memberBuildModes?.[preset.id]
      const effectiveMemberConditionals =
        opts?.memberConditionals ??
        settings.memberConditionalOverrides?.[preset.id]

      const {
        isFixedTarget,
        overrideChar,
        overrideWeapon: fixedOrSimWeapon,
        effectiveWeaponSpec,
      } = resolveFixedTargetOverrides(
        preset,
        opts?.weaponOverride,
        effectiveMemberBuildModes,
        goodCharKeys
      )

      let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
      if (!isFixedTarget && !overrideWeapon && opts?.weaponId) {
        overrideWeapon = baseDb.weapons.get(opts.weaponId)
      }

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

    async optimizeTeam(
      preset: Preset,
      settings: OptimizerSettings,
      opts?: TeamOptimizeOptions
    ): Promise<TeamOptimizeResult> {
      const startTime = performance.now()
      const assignedArtifactIds = new Set<string>()
      const members: TeamMemberOptimizeResult[] = []
      let totalTested = 0
      let totalSkipped = 0

      const effectiveMemberBuildModes =
        opts?.memberBuildModes ?? settings.memberBuildModes?.[preset.id]
      const effectiveMemberConditionals =
        opts?.memberConditionals ??
        settings.memberConditionalOverrides?.[preset.id]

      const totalMembers = Math.min(4, preset.team.length)

      for (let memberIndex = 0; memberIndex < totalMembers; memberIndex++) {
        if (opts?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        const member = preset.team[memberIndex]!
        const memberKey = member.key
        const memberRows = preset.rotation.targets.filter(
          (rt) => resolveRotationTargetOwner(rt, preset).memberKey === memberKey
        )

        const baseCurrentSelection = currentMemberBuild(
          preset,
          memberKey,
          effectiveMemberBuildModes
        )
        const currentSelection: BuildSelection =
          memberIndex === 0 && opts?.weaponOverride
            ? {
                ...baseCurrentSelection,
                weaponId: undefined,
                weaponOverride: opts.weaponOverride,
              }
            : memberIndex === 0 && opts?.weaponId
              ? {
                  ...baseCurrentSelection,
                  weaponId: opts.weaponId,
                }
              : baseCurrentSelection

        if (memberRows.length === 0) {
          members.push({
            memberKey,
            memberIndex,
            skippedSolver: true,
            rotationRowCount: 0,
            selection: currentSelection,
            currentSelection,
            subtotal: 0,
            currentSubtotal: 0,
            evaluation: null,
            currentEvaluation: null,
            tested: 0,
            skipped: 0,
            durationMs: 0,
          })
          continue
        }

        const memberPreset = buildMemberSubPreset(
          preset,
          memberKey,
          memberRows,
          effectiveMemberBuildModes
        )

        const {
          isFixedTarget,
          overrideChar,
          overrideWeapon: fixedOrSimWeapon,
          effectiveWeaponSpec,
        } = resolveFixedTargetOverrides(
          memberPreset,
          memberIndex === 0 ? opts?.weaponOverride : undefined,
          effectiveMemberBuildModes,
          goodCharKeys
        )

        let overrideWeapon: ICachedWeapon | undefined = fixedOrSimWeapon
        if (
          memberIndex === 0 &&
          !isFixedTarget &&
          !overrideWeapon &&
          opts?.weaponId
        ) {
          overrideWeapon = baseDb.weapons.get(opts.weaponId)
        }

        const { teamId, targetTeamCharId } = hydratePresetTeam(
          baseDb,
          memberPreset,
          effectiveWeaponSpec?.key ?? overrideWeapon?.key,
          {
            ownedCharKeys: goodCharKeys,
            memberBuildModes: effectiveMemberBuildModes,
            memberConditionals: effectiveMemberConditionals,
          }
        )

        const memberSettings: OptimizerSettings =
          memberIndex === 0
            ? {
                ...settings,
                topN: Math.max(1, settings.topN ?? 1),
              }
            : {
                ...settings,
                topN: 1,
                constraints: [],
                setExclusion: {},
                mainStatKeys: undefined,
                requiredSubstats: [],
              }

        const optRes = await runSolver(
          baseDb,
          teamId,
          targetTeamCharId,
          memberPreset,
          memberSettings,
          {
            overrideWeapon,
            overrideChar,
            weaponOverrideSpec: isFixedTarget
              ? effectiveWeaponSpec
              : memberIndex === 0
                ? opts?.weaponOverride
                : undefined,
            memberBuildModes: effectiveMemberBuildModes,
            memberConditionals: effectiveMemberConditionals,
            excludedArtifactIds: assignedArtifactIds,
            onProgress: (solverProgress) => {
              opts?.onProgress?.({
                memberIndex,
                totalMembers,
                memberKey,
                solverProgress,
              })
            },
            signal: opts?.signal,
            maxWorkers: opts?.maxWorkers,
          }
        )

        totalTested += optRes.tested
        totalSkipped += optRes.skipped

        const bestBuild = optRes.builds[0]
        const chosenSelection: BuildSelection = bestBuild
          ? {
              ...bestBuild,
              ...(effectiveMemberBuildModes &&
              Object.keys(effectiveMemberBuildModes).length > 0
                ? { memberBuildModes: effectiveMemberBuildModes }
                : {}),
              ...(effectiveMemberConditionals &&
              Object.keys(effectiveMemberConditionals).length > 0
                ? { memberConditionals: effectiveMemberConditionals }
                : {}),
            }
          : {
              ...currentSelection,
              ...(effectiveMemberBuildModes &&
              Object.keys(effectiveMemberBuildModes).length > 0
                ? { memberBuildModes: effectiveMemberBuildModes }
                : {}),
              ...(effectiveMemberConditionals &&
              Object.keys(effectiveMemberConditionals).length > 0
                ? { memberConditionals: effectiveMemberConditionals }
                : {}),
            }

        for (const artId of Object.values(chosenSelection.artifactIds)) {
          if (artId) {
            assignedArtifactIds.add(artId)
          }
        }

        const evaluation = this.evaluate(memberPreset, chosenSelection)
        const currentEvaluation = this.evaluate(memberPreset, {
          ...currentSelection,
          ...(effectiveMemberBuildModes &&
          Object.keys(effectiveMemberBuildModes).length > 0
            ? { memberBuildModes: effectiveMemberBuildModes }
            : {}),
          ...(effectiveMemberConditionals &&
          Object.keys(effectiveMemberConditionals).length > 0
            ? { memberConditionals: effectiveMemberConditionals }
            : {}),
        })

        members.push({
          memberKey,
          memberIndex,
          skippedSolver: false,
          rotationRowCount: memberRows.length,
          selection: chosenSelection,
          currentSelection,
          subtotal: evaluation.total,
          currentSubtotal: currentEvaluation.total,
          evaluation,
          currentEvaluation,
          tested: optRes.tested,
          skipped: optRes.skipped,
          durationMs: optRes.durationMs,
        })
      }

      const teamTotal = members.reduce((acc, m) => acc + m.subtotal, 0)
      const currentTeamTotal = members.reduce(
        (acc, m) => acc + m.currentSubtotal,
        0
      )
      const durationMs = Math.max(0, performance.now() - startTime)

      return {
        members,
        teamTotal,
        currentTeamTotal,
        tested: totalTested,
        skipped: totalSkipped,
        durationMs,
      }
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
