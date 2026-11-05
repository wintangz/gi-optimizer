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
  allAdditiveReactions,
  allAmpReactionKeys,
  allArtifactSetKeys,
  allCharacterKeys,
  allInfusionAuraElementKeys,
  allMainStatKeys,
  allMultiOptHitModeKeys,
  allSubstatKeys,
  allWeaponKeys,
} from '@genshin-optimizer/gi/consts'
import { z } from 'zod'

export const PRESET_SCHEMA_ID = 'gi-optimizer/preset@1' as const

const characterKey = z.enum(allCharacterKeys as unknown as [string, ...string[]])
const weaponKey = z.enum(allWeaponKeys as unknown as [string, ...string[]])
const artifactSetKey = z.enum(allArtifactSetKeys as unknown as [string, ...string[]])
const hitMode = z.enum(allMultiOptHitModeKeys as unknown as [string, ...string[]])
const reaction = z.enum([...allAmpReactionKeys, ...allAdditiveReactions] as unknown as [string, ...string[]])
const infusionAura = z.enum(allInfusionAuraElementKeys as unknown as [string, ...string[]])
const talentLevel = z.number().int().min(1).max(15)

/** GO `IConditionalValues`: sheetKey -> conditional name -> state ('on' or a stack/option key). */
const conditionalValues = z.record(z.string(), z.record(z.string(), z.string()))
/** GO `InputPremodKey` -> number (percent stats as GO display numbers, e.g. 20 for 20%). */
const bonusStats = z.record(z.string(), z.number())

/** Hard requirement the user's own character must satisfy (Akasha-style matching). */
export const memberRequirementSchema = z.object({
  /** Exact constellation (number) or allowed inclusive range. Omit = any. */
  constellation: z.union([z.number().int().min(0).max(6), z.object({ min: z.number().int().min(0).max(6), max: z.number().int().min(0).max(6) })]).optional(),
  /** Required weapon key; refinement exact or range. Omit = any weapon. */
  weapon: z.object({
    key: weaponKey,
    refinement: z.union([z.number().int().min(1).max(5), z.object({ min: z.number().int().min(1).max(5), max: z.number().int().min(1).max(5) })]).optional(),
  }).optional(),
  minLevel: z.number().int().min(1).max(100).optional(),
  minTalent: z.object({ auto: talentLevel, skill: talentLevel, burst: talentLevel }).partial().optional(),
})

/** GO BuildTc subset: an assumed (theorycraft) build — used for teammates whose stats are fixed by the preset. */
export const tcBuildSchema = z.object({
  character: z.object({
    level: z.number().int().min(1).max(100),
    ascension: z.number().int().min(0).max(6),
    constellation: z.number().int().min(0).max(6),
    talent: z.object({ auto: talentLevel, skill: talentLevel, burst: talentLevel }),
  }),
  weapon: z.object({
    key: weaponKey,
    level: z.number().int().min(1).max(90),
    ascension: z.number().int().min(0).max(6),
    refinement: z.number().int().min(1).max(5),
  }),
  artifact: z.object({
    slots: z.object({
      flower: z.object({ statKey: z.enum(allMainStatKeys as unknown as [string, ...string[]]), level: z.number().int().min(0).max(20), rarity: z.number().int().min(1).max(5) }),
      plume: z.object({ statKey: z.enum(allMainStatKeys as unknown as [string, ...string[]]), level: z.number().int().min(0).max(20), rarity: z.number().int().min(1).max(5) }),
      sands: z.object({ statKey: z.enum(allMainStatKeys as unknown as [string, ...string[]]), level: z.number().int().min(0).max(20), rarity: z.number().int().min(1).max(5) }),
      goblet: z.object({ statKey: z.enum(allMainStatKeys as unknown as [string, ...string[]]), level: z.number().int().min(0).max(20), rarity: z.number().int().min(1).max(5) }),
      circlet: z.object({ statKey: z.enum(allMainStatKeys as unknown as [string, ...string[]]), level: z.number().int().min(0).max(20), rarity: z.number().int().min(1).max(5) }),
    }),
    /** Substat totals in GO display units, `type` as in GO BuildTc ('max' | 'mid' | 'min'). */
    substats: z.object({
      type: z.enum(['max', 'mid', 'min']),
      rarity: z.number().int().min(1).max(5),
      stats: z.record(z.enum(allSubstatKeys as unknown as [string, ...string[]]), z.number()),
    }),
    sets: z.record(artifactSetKey, z.union([z.literal(1), z.literal(2), z.literal(4)])),
  }),
})

export const teamMemberSchema = z.object({
  key: characterKey,
  /**
   * 'owned'  -> the user's own scanned character (level/cons/talents from GOOD) with the
   *             weapon the user selects (default: equipped) and the artifacts being evaluated.
   *             Required for the target member.
   * 'tc'     -> fixed assumed build (GO theorycraft). The user does not need to own this unit.
   */
  build: z.discriminatedUnion('type', [
    z.object({ type: z.literal('owned') }),
    z.object({ type: z.literal('tc'), tc: tcBuildSchema }),
  ]),
  requirement: memberRequirementSchema.default({}),
  conditional: conditionalValues.default({}),
  bonusStats: bonusStats.default({}),
  infusionAura: infusionAura.optional(),
  hitMode: hitMode.default('avgHit'),
  reaction: reaction.optional(),
})

/** One damage instance in the rotation = one GO CustomTarget. */
export const rotationTargetSchema = z.object({
  /** GO display path, e.g. ["Furina", "skill", "salonMemberDmg1"] or ["Furina","normal","0"]. Must not start with "custom". */
  path: z.array(z.string()).min(2).refine((p) => p[0] !== 'custom', 'path cannot start with "custom"'),
  /** How many times this instance hits per rotation (GO CustomTarget.weight). */
  count: z.number().positive(),
  label: z.string().default(''),
  hitMode: hitMode.default('avgHit'),
  reaction: reaction.optional(),
  infusionAura: infusionAura.optional(),
  bonusStats: bonusStats.default({}),
})

export const presetSourceSchema = z.enum(['akasha', 'official', 'user'])

export const presetSchema = z.object({
  schema: z.literal(PRESET_SCHEMA_ID),
  /** Stable slug id, e.g. "akasha/furina-hp-c0", "official/neuvillette-hypercarry", "user/<uuid>". */
  id: z.string().regex(/^(akasha|official|user)\/[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(''),
  source: presetSourceSchema,
  author: z.string().min(1),
  /** Required iff source === 'akasha'. Ties the preset to one leaderboard calculation. */
  akasha: z.object({
    calculationId: z.string().min(1),
    leaderboardUrl: z.string().url(),
    label: z.string().min(1),
    retrievedAt: z.string(),
    notes: z.string().default(''),
  }).optional(),
  /** Character whose rotation damage is maximised. Must equal team[0].key and be build.type 'owned'. */
  target: characterKey,
  team: z.array(teamMemberSchema).min(1).max(4),
  enemy: z.object({
    level: z.number().int().min(1).max(200).default(100),
    /** GO enemyOverride keys, e.g. { pyro_res_: 10 } (percent, display units). */
    overrides: z.record(z.string(), z.number()).default({}),
  }).default({ level: 100, overrides: {} }),
  teamConditional: z.object({
    resonance: z.record(z.string(), z.string()).default({}),
    reaction: z.record(z.string(), z.string()).default({}),
  }).default({ resonance: {}, reaction: {} }),
  rotation: z.object({
    name: z.string().default('Rotation'),
    /** Number of rotations summed (Akasha "one (or more) rotations"). */
    repeat: z.number().int().min(1).default(1),
    targets: z.array(rotationTargetSchema).min(1),
  }),
}).superRefine((p, ctx) => {
  if (p.team[0]?.key !== p.target) ctx.addIssue({ code: 'custom', path: ['team', 0, 'key'], message: 'team[0] must be the target character' })
  if (p.team[0]?.build.type !== 'owned') ctx.addIssue({ code: 'custom', path: ['team', 0, 'build'], message: "target member must use build.type 'owned'" })
  if (new Set(p.team.map((m) => m.key)).size !== p.team.length) ctx.addIssue({ code: 'custom', path: ['team'], message: 'duplicate team member' })
  if ((p.source === 'akasha') !== !!p.akasha) ctx.addIssue({ code: 'custom', path: ['akasha'], message: "akasha metadata is required for source 'akasha' and forbidden otherwise" })
  if (!p.id.startsWith(`${p.source}/`)) ctx.addIssue({ code: 'custom', path: ['id'], message: 'id prefix must match source' })
})

export type Preset = z.infer<typeof presetSchema>
export type PresetInput = z.input<typeof presetSchema>
export type TeamMember = z.infer<typeof teamMemberSchema>
export type MemberRequirement = z.infer<typeof memberRequirementSchema>
export type RotationTarget = z.infer<typeof rotationTargetSchema>
export type TcBuild = z.infer<typeof tcBuildSchema>
export type PresetSource = z.infer<typeof presetSourceSchema>

