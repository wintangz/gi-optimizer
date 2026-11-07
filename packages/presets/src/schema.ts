/**
 * Preset JSON schema — the ONE shared contract for `akasha-presets`,
 * `official-presets`, `custom-teams-and-presets` and `single-character-optimizer`.
 *
 * A preset is a setup bundle that maps 1:1 onto Genshin Optimizer (GO) concepts:
 *   - team            -> GO Team.loadoutData (+ TeamCharacter per member)
 *   - member.build    -> GO LoadoutDatum.buildType ('equipped' | 'tc' BuildTc)
 *   - conditional     -> GO TeamCharacter.conditional (char / weapon / artifact sheets)
 *   - teamConditional -> GO Team.conditional (resonance / reaction)
 *   - enemy           -> GO Team.enemyOverride
 *   - rotation        -> GO CustomMultiTarget on the target's TeamCharacter
 * A preset makes NO damage claim. Numbers come from the user's artifacts at run time.
 * Energy Recharge is never part of the objective; ER floors are user settings.
 */
import {
  ALL_ARTIFACT_SET_KEYS,
  ALL_CHARACTER_KEYS,
  ALL_MAIN_STAT_KEYS,
  ALL_SUBSTAT_KEYS,
  ALL_WEAPON_KEYS,
} from '@gi/good'

export const PRESET_SCHEMA_ID = 'gi-optimizer/preset@1' as const

export interface SchemaIssue {
  code: string
  path: Array<string | number>
  message: string
}

export class SchemaError extends Error {
  readonly issues: SchemaIssue[]
  constructor(issues: SchemaIssue[]) {
    super(
      issues
        .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
        .join('; ')
    )
    this.name = 'SchemaError'
    this.issues = issues
  }
}

export type SafeParseResult<T> =
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: SchemaError }

export interface SchemaValidator<TOut, TIn = TOut> {
  parse(input: unknown): TOut
  safeParse(input: unknown): SafeParseResult<TOut>
  readonly _output: TOut
  readonly _input: TIn
}

export type PresetSource = 'akasha' | 'official' | 'user'
export type HitModeKey = 'hit' | 'avgHit' | 'critHit' | 'global'
export type ReactionKey = 'vaporize' | 'melt' | 'spread' | 'aggravate'
export type InfusionAuraKey = 'pyro' | 'cryo' | 'hydro' | 'electro'

export interface MemberRequirement {
  /** Exact constellation (number) or allowed inclusive range. Omit = any. */
  constellation?: number | { min: number; max: number }
  /** Required weapon key; refinement exact or range. Omit = any weapon. */
  weapon?: {
    key: string
    refinement?: number | { min: number; max: number }
  }
  minLevel?: number
  minTalent?: {
    auto?: number
    skill?: number
    burst?: number
  }
}

export interface TcCharacter {
  level: number
  ascension: number
  constellation: number
  talent: {
    auto: number
    skill: number
    burst: number
  }
}

export interface TcWeapon {
  key: string
  level: number
  ascension: number
  refinement: number
}

export interface TcArtifactSlot {
  statKey: string
  level: number
  rarity: number
}

export interface TcBuild {
  character: TcCharacter
  weapon: TcWeapon
  artifact: {
    slots: {
      flower: TcArtifactSlot
      plume: TcArtifactSlot
      sands: TcArtifactSlot
      goblet: TcArtifactSlot
      circlet: TcArtifactSlot
    }
    /** Substat totals in GO display units, `type` as in GO BuildTc ('max' | 'mid' | 'min'). */
    substats: {
      type: 'max' | 'mid' | 'min'
      rarity: number
      stats: Record<string, number>
    }
    sets: Record<string, 1 | 2 | 4>
  }
}

export interface FixedBuild {
  type: 'fixed'
  character: TcCharacter
  weapon: TcWeapon
}

export interface TeamMember {
  key: string
  build:
    | { type: 'owned' }
    | FixedBuild
    | { type: 'tc'; tc: TcBuild }
  requirement: MemberRequirement
  conditional: Record<string, Record<string, string>>
  bonusStats: Record<string, number>
  infusionAura?: InfusionAuraKey
  hitMode: HitModeKey
  reaction?: ReactionKey
}

export interface TeamMemberInput {
  key: string
  build:
    | { type: 'owned' }
    | FixedBuild
    | { type: 'tc'; tc: TcBuild }
  requirement?: MemberRequirement
  conditional?: Record<string, Record<string, string>>
  bonusStats?: Record<string, number>
  infusionAura?: InfusionAuraKey
  hitMode?: HitModeKey
  reaction?: ReactionKey
}

export interface RotationTarget {
  member?: string
  path: string[]
  count: number
  label: string
  hitMode: HitModeKey
  reaction?: ReactionKey
  infusionAura?: InfusionAuraKey
  bonusStats: Record<string, number>
}

export interface RotationTargetInput {
  member?: string
  path: string[]
  count: number
  label?: string
  hitMode?: HitModeKey
  reaction?: ReactionKey
  infusionAura?: InfusionAuraKey
  bonusStats?: Record<string, number>
}

export interface AkashaMetadata {
  calculationId: string
  leaderboardUrl: string
  label: string
  retrievedAt: string
  notes: string
}

export interface AkashaMetadataInput {
  calculationId: string
  leaderboardUrl: string
  label: string
  retrievedAt: string
  notes?: string
}

export interface Preset {
  schema: typeof PRESET_SCHEMA_ID
  id: string
  name: string
  description: string
  source: PresetSource
  author: string
  akasha?: AkashaMetadata
  target: string
  team: TeamMember[]
  enemy: {
    level: number
    overrides: Record<string, number>
  }
  teamConditional: {
    resonance: Record<string, string>
    reaction: Record<string, string>
  }
  rotation: {
    name: string
    repeat: number
    targets: RotationTarget[]
  }
}

export interface PresetInput {
  schema: typeof PRESET_SCHEMA_ID
  id: string
  name: string
  description?: string
  source: PresetSource
  author: string
  akasha?: AkashaMetadataInput
  target: string
  team: TeamMemberInput[]
  enemy?: {
    level?: number
    overrides?: Record<string, number>
  }
  teamConditional?: {
    resonance?: Record<string, string>
    reaction?: Record<string, string>
  }
  rotation: {
    name?: string
    repeat?: number
    targets: RotationTargetInput[]
  }
}

const CHAR_SET = new Set<string>(ALL_CHARACTER_KEYS)
const WEAPON_SET = new Set<string>(ALL_WEAPON_KEYS)
const ART_SET_SET = new Set<string>(ALL_ARTIFACT_SET_KEYS)
const MAIN_STAT_SET = new Set<string>(ALL_MAIN_STAT_KEYS)
const SUBSTAT_SET = new Set<string>(ALL_SUBSTAT_KEYS)
void ART_SET_SET
void SUBSTAT_SET

const HIT_MODES = new Set<string>(['hit', 'avgHit', 'critHit', 'global'])
const REACTIONS = new Set<string>(['vaporize', 'melt', 'spread', 'aggravate'])
const INFUSION_AURAS = new Set<string>(['pyro', 'cryo', 'hydro', 'electro'])
const SOURCES = new Set<string>(['akasha', 'official', 'user'])
const SUBSTAT_TYPES = new Set<string>(['max', 'mid', 'min'])
const PRESET_ID_REGEX = /^(akasha|official|user)\/[a-z0-9][a-z0-9-]*$/

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function checkIntRange(
  val: unknown,
  min: number,
  max: number,
  path: Array<string | number>,
  issues: SchemaIssue[],
  label = 'integer'
): number | undefined {
  if (typeof val !== 'number' || !Number.isInteger(val)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: `Expected ${label} (${min}..${max})`,
    })
    return undefined
  }
  if (val < min || val > max) {
    issues.push({
      code: 'out_of_range',
      path,
      message: `Expected ${label} between ${min} and ${max}, got ${val}`,
    })
    return undefined
  }
  return val
}

function validateNumberRecord(
  val: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): Record<string, number> | undefined {
  if (!isPlainObject(val)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected an object mapping keys to numbers',
    })
    return undefined
  }
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(val)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      issues.push({
        code: 'invalid_type',
        path: [...path, k],
        message: 'Expected a finite number',
      })
    } else {
      out[k] = v
    }
  }
  return out
}

function validateStringRecord(
  val: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): Record<string, string> | undefined {
  if (!isPlainObject(val)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected an object mapping keys to strings',
    })
    return undefined
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(val)) {
    if (typeof v !== 'string') {
      issues.push({
        code: 'invalid_type',
        path: [...path, k],
        message: 'Expected a string',
      })
    } else {
      out[k] = v
    }
  }
  return out
}

function validateConditionalRecord(
  val: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): Record<string, Record<string, string>> | undefined {
  if (!isPlainObject(val)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected conditional values object',
    })
    return undefined
  }
  const out: Record<string, Record<string, string>> = {}
  for (const [sheet, inner] of Object.entries(val)) {
    const sub = validateStringRecord(inner, [...path, sheet], issues)
    if (sub) out[sheet] = sub
  }
  return out
}

function validateIntOrRange(
  val: unknown,
  min: number,
  max: number,
  path: Array<string | number>,
  issues: SchemaIssue[]
): number | { min: number; max: number } | undefined {
  if (typeof val === 'number') {
    return checkIntRange(val, min, max, path, issues)
  }
  if (isPlainObject(val)) {
    const rMin = checkIntRange(val.min, min, max, [...path, 'min'], issues)
    const rMax = checkIntRange(val.max, min, max, [...path, 'max'], issues)
    if (rMin !== undefined && rMax !== undefined) {
      return { min: rMin, max: rMax }
    }
    return undefined
  }
  issues.push({
    code: 'invalid_union',
    path,
    message: `Expected integer (${min}..${max}) or { min, max } range`,
  })
  return undefined
}

function parseMemberRequirement(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): MemberRequirement | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected member requirement object',
    })
    return undefined
  }
  const out: MemberRequirement = {}
  if (input.constellation !== undefined) {
    const c = validateIntOrRange(
      input.constellation,
      0,
      6,
      [...path, 'constellation'],
      issues
    )
    if (c !== undefined) out.constellation = c
  }
  if (input.weapon !== undefined) {
    if (!isPlainObject(input.weapon)) {
      issues.push({
        code: 'invalid_type',
        path: [...path, 'weapon'],
        message: 'Expected weapon requirement object',
      })
    } else {
      const wKey = input.weapon.key
      if (typeof wKey !== 'string' || !WEAPON_SET.has(wKey)) {
        issues.push({
          code: 'invalid_enum_value',
          path: [...path, 'weapon', 'key'],
          message: `Invalid weapon key '${String(wKey)}'`,
        })
      } else {
        const wOut: { key: string; refinement?: number | { min: number; max: number } } = {
          key: wKey,
        }
        if (input.weapon.refinement !== undefined) {
          const r = validateIntOrRange(
            input.weapon.refinement,
            1,
            5,
            [...path, 'weapon', 'refinement'],
            issues
          )
          if (r !== undefined) wOut.refinement = r
        }
        out.weapon = wOut
      }
    }
  }
  if (input.minLevel !== undefined) {
    const ml = checkIntRange(
      input.minLevel,
      1,
      100,
      [...path, 'minLevel'],
      issues
    )
    if (ml !== undefined) out.minLevel = ml
  }
  if (input.minTalent !== undefined) {
    if (!isPlainObject(input.minTalent)) {
      issues.push({
        code: 'invalid_type',
        path: [...path, 'minTalent'],
        message: 'Expected minTalent object',
      })
    } else {
      const mt: { auto?: number; skill?: number; burst?: number } = {}
      for (const k of ['auto', 'skill', 'burst'] as const) {
        if (input.minTalent[k] !== undefined) {
          const v = checkIntRange(
            input.minTalent[k],
            1,
            15,
            [...path, 'minTalent', k],
            issues
          )
          if (v !== undefined) mt[k] = v
        }
      }
      out.minTalent = mt
    }
  }
  return out
}

function parseTcCharacter(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): TcCharacter | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected character object',
    })
    return undefined
  }
  const level = checkIntRange(input.level, 1, 100, [...path, 'level'], issues)
  const ascension = checkIntRange(
    input.ascension,
    0,
    6,
    [...path, 'ascension'],
    issues
  )
  const constellation = checkIntRange(
    input.constellation,
    0,
    6,
    [...path, 'constellation'],
    issues
  )
  let talent: { auto: number; skill: number; burst: number } | undefined
  if (!isPlainObject(input.talent)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'talent'],
      message: 'Expected talent object',
    })
  } else {
    const auto = checkIntRange(
      input.talent.auto,
      1,
      15,
      [...path, 'talent', 'auto'],
      issues
    )
    const skill = checkIntRange(
      input.talent.skill,
      1,
      15,
      [...path, 'talent', 'skill'],
      issues
    )
    const burst = checkIntRange(
      input.talent.burst,
      1,
      15,
      [...path, 'talent', 'burst'],
      issues
    )
    if (auto !== undefined && skill !== undefined && burst !== undefined) {
      talent = { auto, skill, burst }
    }
  }
  if (
    level === undefined ||
    ascension === undefined ||
    constellation === undefined ||
    !talent
  ) {
    return undefined
  }
  return { level, ascension, constellation, talent }
}

function parseTcWeapon(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): TcWeapon | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected weapon object',
    })
    return undefined
  }
  const key = input.key
  let validKey: string | undefined
  if (typeof key !== 'string' || !WEAPON_SET.has(key)) {
    issues.push({
      code: 'invalid_enum_value',
      path: [...path, 'key'],
      message: `Invalid weapon key '${String(key)}'`,
    })
  } else {
    validKey = key
  }
  const level = checkIntRange(input.level, 1, 90, [...path, 'level'], issues)
  const ascension = checkIntRange(
    input.ascension,
    0,
    6,
    [...path, 'ascension'],
    issues
  )
  const refinement = checkIntRange(
    input.refinement,
    1,
    5,
    [...path, 'refinement'],
    issues
  )
  if (
    !validKey ||
    level === undefined ||
    ascension === undefined ||
    refinement === undefined
  ) {
    return undefined
  }
  return { key: validKey, level, ascension, refinement }
}

function parseTcArtifactSlot(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): TcArtifactSlot | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected artifact slot object',
    })
    return undefined
  }
  const statKey = input.statKey
  let validStatKey: string | undefined
  if (typeof statKey !== 'string' || !MAIN_STAT_SET.has(statKey)) {
    issues.push({
      code: 'invalid_enum_value',
      path: [...path, 'statKey'],
      message: `Invalid main stat key '${String(statKey)}'`,
    })
  } else {
    validStatKey = statKey
  }
  const level = checkIntRange(input.level, 0, 20, [...path, 'level'], issues)
  const rarity = checkIntRange(input.rarity, 1, 5, [...path, 'rarity'], issues)
  if (!validStatKey || level === undefined || rarity === undefined) {
    return undefined
  }
  return { statKey: validStatKey, level, rarity }
}

function parseTcBuild(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): TcBuild | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected tc build object',
    })
    return undefined
  }
  const character = parseTcCharacter(
    input.character,
    [...path, 'character'],
    issues
  )
  const weapon = parseTcWeapon(input.weapon, [...path, 'weapon'], issues)
  if (!isPlainObject(input.artifact)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'artifact'],
      message: 'Expected artifact object',
    })
    return undefined
  }
  const art = input.artifact
  const artPath = [...path, 'artifact']
  let slots: TcBuild['artifact']['slots'] | undefined
  if (!isPlainObject(art.slots)) {
    issues.push({
      code: 'invalid_type',
      path: [...artPath, 'slots'],
      message: 'Expected artifact slots object',
    })
  } else {
    const flower = parseTcArtifactSlot(
      art.slots.flower,
      [...artPath, 'slots', 'flower'],
      issues
    )
    const plume = parseTcArtifactSlot(
      art.slots.plume,
      [...artPath, 'slots', 'plume'],
      issues
    )
    const sands = parseTcArtifactSlot(
      art.slots.sands,
      [...artPath, 'slots', 'sands'],
      issues
    )
    const goblet = parseTcArtifactSlot(
      art.slots.goblet,
      [...artPath, 'slots', 'goblet'],
      issues
    )
    const circlet = parseTcArtifactSlot(
      art.slots.circlet,
      [...artPath, 'slots', 'circlet'],
      issues
    )
    if (flower && plume && sands && goblet && circlet) {
      slots = { flower, plume, sands, goblet, circlet }
    }
  }

  let substats: TcBuild['artifact']['substats'] | undefined
  if (!isPlainObject(art.substats)) {
    issues.push({
      code: 'invalid_type',
      path: [...artPath, 'substats'],
      message: 'Expected artifact substats object',
    })
  } else {
    const sType = art.substats.type
    let validType: 'max' | 'mid' | 'min' | undefined
    if (typeof sType !== 'string' || !SUBSTAT_TYPES.has(sType)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...artPath, 'substats', 'type'],
        message: "Expected substats.type to be 'max', 'mid', or 'min'",
      })
    } else {
      validType = sType as 'max' | 'mid' | 'min'
    }
    const rarity = checkIntRange(
      art.substats.rarity,
      1,
      5,
      [...artPath, 'substats', 'rarity'],
      issues
    )
    const stats = validateNumberRecord(
      art.substats.stats,
      [...artPath, 'substats', 'stats'],
      issues
    )
    if (validType && rarity !== undefined && stats) {
      substats = { type: validType, rarity, stats }
    }
  }

  let sets: Record<string, 1 | 2 | 4> | undefined
  if (!isPlainObject(art.sets)) {
    issues.push({
      code: 'invalid_type',
      path: [...artPath, 'sets'],
      message: 'Expected artifact sets object',
    })
  } else {
    sets = {}
    for (const [sk, sv] of Object.entries(art.sets)) {
      if (sv !== 1 && sv !== 2 && sv !== 4) {
        issues.push({
          code: 'invalid_literal',
          path: [...artPath, 'sets', sk],
          message: 'Expected artifact set count to be 1, 2, or 4',
        })
      } else {
        sets[sk] = sv
      }
    }
  }

  if (!character || !weapon || !slots || !substats || !sets) {
    return undefined
  }
  return {
    character,
    weapon,
    artifact: { slots, substats, sets },
  }
}

function parseFixedBuild(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): FixedBuild | undefined {
  if (!isPlainObject(input) || input.type !== 'fixed') {
    issues.push({
      code: 'invalid_literal',
      path: [...path, 'type'],
      message: "Expected build.type 'fixed'",
    })
    return undefined
  }
  const character = parseTcCharacter(
    input.character,
    [...path, 'character'],
    issues
  )
  const weapon = parseTcWeapon(input.weapon, [...path, 'weapon'], issues)
  if (!character || !weapon) return undefined
  return { type: 'fixed', character, weapon }
}

function parseTeamMember(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): TeamMember | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected team member object',
    })
    return undefined
  }
  const key = input.key
  let validKey: string | undefined
  if (typeof key !== 'string' || !CHAR_SET.has(key)) {
    issues.push({
      code: 'invalid_enum_value',
      path: [...path, 'key'],
      message: `Invalid character key '${String(key)}'`,
    })
  } else {
    validKey = key
  }

  let build: TeamMember['build'] | undefined
  if (!isPlainObject(input.build)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'build'],
      message: 'Expected member build object',
    })
  } else if (input.build.type === 'owned') {
    build = { type: 'owned' }
  } else if (input.build.type === 'fixed') {
    const fb = parseFixedBuild(input.build, [...path, 'build'], issues)
    if (fb) build = fb
  } else if (input.build.type === 'tc') {
    const tc = parseTcBuild(input.build.tc, [...path, 'build', 'tc'], issues)
    if (tc) build = { type: 'tc', tc }
  } else {
    issues.push({
      code: 'invalid_union_discriminator',
      path: [...path, 'build', 'type'],
      message: "Expected build.type to be 'owned', 'fixed', or 'tc'",
    })
  }

  const requirement =
    input.requirement === undefined
      ? {}
      : parseMemberRequirement(
          input.requirement,
          [...path, 'requirement'],
          issues
        )

  const conditional =
    input.conditional === undefined
      ? {}
      : validateConditionalRecord(
          input.conditional,
          [...path, 'conditional'],
          issues
        )

  const bonusStats =
    input.bonusStats === undefined
      ? {}
      : validateNumberRecord(input.bonusStats, [...path, 'bonusStats'], issues)

  let infusionAura: InfusionAuraKey | undefined
  if (input.infusionAura !== undefined) {
    if (
      typeof input.infusionAura !== 'string' ||
      !INFUSION_AURAS.has(input.infusionAura)
    ) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'infusionAura'],
        message: `Invalid infusionAura '${String(input.infusionAura)}'`,
      })
    } else {
      infusionAura = input.infusionAura as InfusionAuraKey
    }
  }

  let hitMode: HitModeKey = 'avgHit'
  if (input.hitMode !== undefined) {
    if (typeof input.hitMode !== 'string' || !HIT_MODES.has(input.hitMode)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'hitMode'],
        message: `Invalid hitMode '${String(input.hitMode)}'`,
      })
    } else {
      hitMode = input.hitMode as HitModeKey
    }
  }

  let reaction: ReactionKey | undefined
  if (input.reaction !== undefined) {
    if (typeof input.reaction !== 'string' || !REACTIONS.has(input.reaction)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'reaction'],
        message: `Invalid reaction '${String(input.reaction)}'`,
      })
    } else {
      reaction = input.reaction as ReactionKey
    }
  }

  if (
    !validKey ||
    !build ||
    !requirement ||
    !conditional ||
    !bonusStats
  ) {
    return undefined
  }

  const out: TeamMember = {
    key: validKey,
    build,
    requirement,
    conditional,
    bonusStats,
    hitMode,
  }
  if (infusionAura !== undefined) out.infusionAura = infusionAura
  if (reaction !== undefined) out.reaction = reaction
  return out
}

function parseRotationTarget(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): RotationTarget | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected rotation target object',
    })
    return undefined
  }
  let targetPath: string[] | undefined
  if (!Array.isArray(input.path)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'path'],
      message: 'Expected path array of strings',
    })
  } else {
    const strArr: string[] = []
    for (let i = 0; i < input.path.length; i++) {
      const seg = input.path[i]
      if (typeof seg !== 'string') {
        issues.push({
          code: 'invalid_type',
          path: [...path, 'path', i],
          message: 'Expected string segment in path',
        })
      } else {
        strArr.push(seg)
      }
    }
    if (input.path.length < 2) {
      issues.push({
        code: 'too_small',
        path: [...path, 'path'],
        message: 'Rotation target path must have at least 2 segments',
      })
    } else if (strArr[0] === 'custom') {
      issues.push({
        code: 'custom',
        path: [...path, 'path'],
        message: 'path cannot start with "custom"',
      })
    } else {
      targetPath = strArr
    }
  }

  let count: number | undefined
  if (
    typeof input.count !== 'number' ||
    !Number.isFinite(input.count) ||
    input.count <= 0
  ) {
    issues.push({
      code: 'too_small',
      path: [...path, 'count'],
      message: 'Expected positive number for count',
    })
  } else {
    count = input.count
  }

  let label = ''
  if (input.label !== undefined) {
    if (typeof input.label !== 'string') {
      issues.push({
        code: 'invalid_type',
        path: [...path, 'label'],
        message: 'Expected string for label',
      })
    } else {
      label = input.label
    }
  }

  let hitMode: HitModeKey = 'avgHit'
  if (input.hitMode !== undefined) {
    if (typeof input.hitMode !== 'string' || !HIT_MODES.has(input.hitMode)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'hitMode'],
        message: `Invalid hitMode '${String(input.hitMode)}'`,
      })
    } else {
      hitMode = input.hitMode as HitModeKey
    }
  }

  let reaction: ReactionKey | undefined
  if (input.reaction !== undefined) {
    if (typeof input.reaction !== 'string' || !REACTIONS.has(input.reaction)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'reaction'],
        message: `Invalid reaction '${String(input.reaction)}'`,
      })
    } else {
      reaction = input.reaction as ReactionKey
    }
  }

  let infusionAura: InfusionAuraKey | undefined
  if (input.infusionAura !== undefined) {
    if (
      typeof input.infusionAura !== 'string' ||
      !INFUSION_AURAS.has(input.infusionAura)
    ) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'infusionAura'],
        message: `Invalid infusionAura '${String(input.infusionAura)}'`,
      })
    } else {
      infusionAura = input.infusionAura as InfusionAuraKey
    }
  }

  let member: string | undefined
  if (input.member !== undefined) {
    if (typeof input.member !== 'string' || !CHAR_SET.has(input.member)) {
      issues.push({
        code: 'invalid_enum_value',
        path: [...path, 'member'],
        message: `Invalid rotation target member key '${String(input.member)}'`,
      })
    } else {
      member = input.member
    }
  }

  const bonusStats =
    input.bonusStats === undefined
      ? {}
      : validateNumberRecord(input.bonusStats, [...path, 'bonusStats'], issues)

  if (!targetPath || count === undefined || !bonusStats) {
    return undefined
  }

  const out: RotationTarget = {
    path: targetPath,
    count,
    label,
    hitMode,
    bonusStats,
  }
  if (member !== undefined) out.member = member
  if (reaction !== undefined) out.reaction = reaction
  if (infusionAura !== undefined) out.infusionAura = infusionAura
  return out
}

function parsePresetSource(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): PresetSource | undefined {
  if (typeof input !== 'string' || !SOURCES.has(input)) {
    issues.push({
      code: 'invalid_enum_value',
      path,
      message: "Expected source to be 'akasha', 'official', or 'user'",
    })
    return undefined
  }
  return input as PresetSource
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return Boolean(u.protocol && u.host)
  } catch {
    return false
  }
}

export function normalizeEnemyOverrides(
  overrides: Record<string, number> | undefined
): Record<string, number> {
  if (!overrides) return {}
  const normalized: Record<string, number> = {}
  for (const [k, v] of Object.entries(overrides)) {
    if (k.endsWith('_res_') && !k.endsWith('_enemyRes_')) {
      const ele = k.slice(0, -5)
      if (normalized[`${ele}_enemyRes_`] === undefined) {
        normalized[`${ele}_enemyRes_`] = v
      }
    } else {
      normalized[k] = v
    }
  }
  return normalized
}

function parsePreset(
  input: unknown,
  path: Array<string | number>,
  issues: SchemaIssue[]
): Preset | undefined {
  if (!isPlainObject(input)) {
    issues.push({
      code: 'invalid_type',
      path,
      message: 'Expected preset object',
    })
    return undefined
  }

  if (input.schema !== PRESET_SCHEMA_ID) {
    issues.push({
      code: 'invalid_literal',
      path: [...path, 'schema'],
      message: `Expected schema '${PRESET_SCHEMA_ID}'`,
    })
  }

  let id: string | undefined
  if (typeof input.id !== 'string' || !PRESET_ID_REGEX.test(input.id)) {
    issues.push({
      code: 'invalid_string',
      path: [...path, 'id'],
      message: 'Invalid preset id format',
    })
  } else {
    id = input.id
  }

  let name: string | undefined
  if (
    typeof input.name !== 'string' ||
    input.name.length < 1 ||
    input.name.length > 200
  ) {
    issues.push({
      code: 'invalid_string',
      path: [...path, 'name'],
      message: 'Preset name must be between 1 and 200 characters',
    })
  } else {
    name = input.name
  }

  let description = ''
  if (input.description !== undefined) {
    if (
      typeof input.description !== 'string' ||
      input.description.length > 4000
    ) {
      issues.push({
        code: 'invalid_string',
        path: [...path, 'description'],
        message: 'Preset description must be a string up to 4000 characters',
      })
    } else {
      description = input.description
    }
  }

  const source = parsePresetSource(input.source, [...path, 'source'], issues)

  let author: string | undefined
  if (typeof input.author !== 'string' || input.author.length < 1) {
    issues.push({
      code: 'invalid_string',
      path: [...path, 'author'],
      message: 'Preset author must be a non-empty string',
    })
  } else {
    author = input.author
  }

  let akasha: AkashaMetadata | undefined
  if (input.akasha !== undefined) {
    const akPath = [...path, 'akasha']
    if (!isPlainObject(input.akasha)) {
      issues.push({
        code: 'invalid_type',
        path: akPath,
        message: 'Expected akasha metadata object',
      })
    } else {
      const calcId = input.akasha.calculationId
      const url = input.akasha.leaderboardUrl
      const label = input.akasha.label
      const retrievedAt = input.akasha.retrievedAt
      const notes = input.akasha.notes === undefined ? '' : input.akasha.notes

      if (typeof calcId !== 'string' || calcId.length < 1) {
        issues.push({
          code: 'invalid_string',
          path: [...akPath, 'calculationId'],
          message: 'calculationId must be a non-empty string',
        })
      }
      if (typeof url !== 'string' || !isValidUrl(url)) {
        issues.push({
          code: 'invalid_string',
          path: [...akPath, 'leaderboardUrl'],
          message: 'leaderboardUrl must be a valid URL',
        })
      }
      if (typeof label !== 'string' || label.length < 1) {
        issues.push({
          code: 'invalid_string',
          path: [...akPath, 'label'],
          message: 'label must be a non-empty string',
        })
      }
      if (typeof retrievedAt !== 'string') {
        issues.push({
          code: 'invalid_type',
          path: [...akPath, 'retrievedAt'],
          message: 'retrievedAt must be a string',
        })
      }
      if (typeof notes !== 'string') {
        issues.push({
          code: 'invalid_type',
          path: [...akPath, 'notes'],
          message: 'notes must be a string',
        })
      }
      if (
        typeof calcId === 'string' &&
        calcId.length >= 1 &&
        typeof url === 'string' &&
        isValidUrl(url) &&
        typeof label === 'string' &&
        label.length >= 1 &&
        typeof retrievedAt === 'string' &&
        typeof notes === 'string'
      ) {
        akasha = {
          calculationId: calcId,
          leaderboardUrl: url,
          label,
          retrievedAt,
          notes,
        }
      }
    }
  }

  let target: string | undefined
  if (typeof input.target !== 'string' || !CHAR_SET.has(input.target)) {
    issues.push({
      code: 'invalid_enum_value',
      path: [...path, 'target'],
      message: `Invalid target character key '${String(input.target)}'`,
    })
  } else {
    target = input.target
  }

  let team: TeamMember[] | undefined
  if (!Array.isArray(input.team)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'team'],
      message: 'Expected team array',
    })
  } else {
    if (input.team.length < 1 || input.team.length > 4) {
      issues.push({
        code: 'out_of_range',
        path: [...path, 'team'],
        message: 'Team must contain between 1 and 4 members',
      })
    }
    const members: TeamMember[] = []
    for (let i = 0; i < input.team.length; i++) {
      const m = parseTeamMember(input.team[i], [...path, 'team', i], issues)
      if (m) members.push(m)
    }
    if (
      input.team.length >= 1 &&
      input.team.length <= 4 &&
      members.length === input.team.length
    ) {
      team = members
    }
  }

  let enemy: { level: number; overrides: Record<string, number> } | undefined = {
    level: 100,
    overrides: {},
  }
  if (input.enemy !== undefined) {
    if (!isPlainObject(input.enemy)) {
      issues.push({
        code: 'invalid_type',
        path: [...path, 'enemy'],
        message: 'Expected enemy object',
      })
      enemy = undefined
    } else {
      const eLevel =
        input.enemy.level === undefined
          ? 100
          : checkIntRange(
              input.enemy.level,
              1,
              200,
              [...path, 'enemy', 'level'],
              issues
            )
      const eOverrides =
        input.enemy.overrides === undefined
          ? {}
          : validateNumberRecord(
              input.enemy.overrides,
              [...path, 'enemy', 'overrides'],
              issues
            )
      if (eLevel !== undefined && eOverrides !== undefined) {
        enemy = {
          level: eLevel,
          overrides: normalizeEnemyOverrides(eOverrides),
        }
      } else {
        enemy = undefined
      }
    }
  }

  let teamConditional:
    | { resonance: Record<string, string>; reaction: Record<string, string> }
    | undefined = { resonance: {}, reaction: {} }
  if (input.teamConditional !== undefined) {
    if (!isPlainObject(input.teamConditional)) {
      issues.push({
        code: 'invalid_type',
        path: [...path, 'teamConditional'],
        message: 'Expected teamConditional object',
      })
      teamConditional = undefined
    } else {
      const res =
        input.teamConditional.resonance === undefined
          ? {}
          : validateStringRecord(
              input.teamConditional.resonance,
              [...path, 'teamConditional', 'resonance'],
              issues
            )
      const reac =
        input.teamConditional.reaction === undefined
          ? {}
          : validateStringRecord(
              input.teamConditional.reaction,
              [...path, 'teamConditional', 'reaction'],
              issues
            )
      if (res && reac) {
        teamConditional = { resonance: res, reaction: reac }
      } else {
        teamConditional = undefined
      }
    }
  }

  let rotation:
    | { name: string; repeat: number; targets: RotationTarget[] }
    | undefined
  if (!isPlainObject(input.rotation)) {
    issues.push({
      code: 'invalid_type',
      path: [...path, 'rotation'],
      message: 'Expected rotation object',
    })
  } else {
    const rotPath = [...path, 'rotation']
    let rName = 'Rotation'
    if (input.rotation.name !== undefined) {
      if (typeof input.rotation.name !== 'string') {
        issues.push({
          code: 'invalid_type',
          path: [...rotPath, 'name'],
          message: 'Expected string for rotation.name',
        })
      } else {
        rName = input.rotation.name
      }
    }
    let rRepeat: number | undefined = 1
    if (input.rotation.repeat !== undefined) {
      if (
        typeof input.rotation.repeat !== 'number' ||
        !Number.isInteger(input.rotation.repeat) ||
        input.rotation.repeat < 1
      ) {
        issues.push({
          code: 'too_small',
          path: [...rotPath, 'repeat'],
          message: 'Expected integer >= 1 for rotation.repeat',
        })
        rRepeat = undefined
      } else {
        rRepeat = input.rotation.repeat
      }
    }

    let rTargets: RotationTarget[] | undefined
    if (!Array.isArray(input.rotation.targets)) {
      issues.push({
        code: 'invalid_type',
        path: [...rotPath, 'targets'],
        message: 'Expected rotation.targets array',
      })
    } else {
      if (input.rotation.targets.length < 1) {
        issues.push({
          code: 'too_small',
          path: [...rotPath, 'targets'],
          message: 'rotation.targets must contain at least 1 target',
        })
      }
      const parsedTargets: RotationTarget[] = []
      for (let i = 0; i < input.rotation.targets.length; i++) {
        const rt = parseRotationTarget(
          input.rotation.targets[i],
          [...rotPath, 'targets', i],
          issues
        )
        if (rt) parsedTargets.push(rt)
      }
      if (
        input.rotation.targets.length >= 1 &&
        parsedTargets.length === input.rotation.targets.length
      ) {
        rTargets = parsedTargets
      }
    }

    if (rRepeat !== undefined && rTargets) {
      rotation = { name: rName, repeat: rRepeat, targets: rTargets }
    }
  }

  if (
    issues.length > 0 ||
    !id ||
    !name ||
    !source ||
    !author ||
    !target ||
    !team ||
    !enemy ||
    !teamConditional ||
    !rotation
  ) {
    return undefined
  }

  const p: Preset = {
    schema: PRESET_SCHEMA_ID,
    id,
    name,
    description,
    source,
    author,
    target,
    team,
    enemy,
    teamConditional,
    rotation,
  }
  if (akasha !== undefined) {
    p.akasha = akasha
  }

  // Cross-field domain refinements (matching original superRefine rules)
  if (p.team[0]?.key !== p.target) {
    issues.push({
      code: 'custom',
      path: [...path, 'team', 0, 'key'],
      message: 'team[0] must be the target character',
    })
  }
  if (p.source === 'akasha') {
    if (p.team[0]?.build.type !== 'fixed') {
      issues.push({
        code: 'custom',
        path: [...path, 'team', 0, 'build'],
        message: "akasha target member must use build.type 'fixed'",
      })
    }
  } else {
    if (p.team[0]?.build.type !== 'owned') {
      issues.push({
        code: 'custom',
        path: [...path, 'team', 0, 'build'],
        message: "target member must use build.type 'owned'",
      })
    }
  }
  if (new Set(p.team.map((m) => m.key)).size !== p.team.length) {
    issues.push({
      code: 'custom',
      path: [...path, 'team'],
      message: 'duplicate team member',
    })
  }
  if ((p.source === 'akasha') !== !!p.akasha) {
    issues.push({
      code: 'custom',
      path: [...path, 'akasha'],
      message:
        "akasha metadata is required for source 'akasha' and forbidden otherwise",
    })
  }
  if (!p.id.startsWith(`${p.source}/`)) {
    issues.push({
      code: 'custom',
      path: [...path, 'id'],
      message: 'id prefix must match source',
    })
  }

  if (issues.length > 0) {
    return undefined
  }
  return p
}

function makeValidator<TOut, TIn = TOut>(
  fn: (
    input: unknown,
    path: Array<string | number>,
    issues: SchemaIssue[]
  ) => TOut | undefined
): SchemaValidator<TOut, TIn> {
  return {
    _output: undefined as unknown as TOut,
    _input: undefined as unknown as TIn,
    safeParse(input: unknown): SafeParseResult<TOut> {
      const issues: SchemaIssue[] = []
      const data = fn(input, [], issues)
      if (issues.length > 0 || data === undefined) {
        return {
          success: false,
          error: new SchemaError(
            issues.length > 0
              ? issues
              : [{ code: 'custom', path: [], message: 'Validation failed' }]
          ),
        }
      }
      return { success: true, data }
    },
    parse(input: unknown): TOut {
      const res = this.safeParse(input)
      if (!res.success) {
        throw res.error
      }
      return res.data
    },
  }
}

export const memberRequirementSchema: SchemaValidator<MemberRequirement> =
  makeValidator(parseMemberRequirement)
export const tcCharacterSchema: SchemaValidator<TcCharacter> =
  makeValidator(parseTcCharacter)
export const tcWeaponSchema: SchemaValidator<TcWeapon> =
  makeValidator(parseTcWeapon)
export const tcBuildSchema: SchemaValidator<TcBuild> =
  makeValidator(parseTcBuild)
export const fixedBuildSchema: SchemaValidator<FixedBuild> =
  makeValidator(parseFixedBuild)
export const teamMemberSchema: SchemaValidator<TeamMember, TeamMemberInput> =
  makeValidator(parseTeamMember)
export const rotationTargetSchema: SchemaValidator<
  RotationTarget,
  RotationTargetInput
> = makeValidator(parseRotationTarget)
export const presetSourceSchema: SchemaValidator<PresetSource> =
  makeValidator(parsePresetSource)
export const presetSchema: SchemaValidator<Preset, PresetInput> =
  makeValidator(parsePreset)

export { resolveRotationTargetOwner } from './settings'
