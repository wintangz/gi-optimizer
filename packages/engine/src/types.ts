import {
  DEFAULT_OPTIMIZER_SETTINGS,
  ELEMENT_TO_RESONANCE_KEY,
  FAST_MODE_STAT_KEYS,
  GO_RESONANCE_CATALOG,
  RESONANCE_EFFECT_KEYS,
  RESONANCE_KEY_TO_ELEMENT,
  STAT_CONSTRAINT_KEYS,
  cloneMemberConditionalsMap,
  getPresetConditionalOverrides,
  getPresetFastMode,
  getPresetMemberBuildModes,
  getPresetResonanceEffects,
  getPresetResonanceEnabled,
  getPresetWeaponCompareCandidates,
  hasDisabledResonanceEffects,
  hasMemberConditionalOverrides,
  hasMemberFastMode,
  hasPresetFastMode,
  isActiveStatConstraint,
  isFastModeStatKey,
  isPercentStatConstraintKey,
  isPresetResonanceEffectEnabled,
  listTriggeredResonances,
  migrateOptimizerSettings,
  normalizeFastModeStats,
  normalizeResonanceEffectKey,
  normalizeResonanceEffectsMap,
  normalizeStatConstraintValue,
  resetMemberConditionalOverrides,
  resetPresetMemberFastMode,
  resetPresetWeaponCompareCandidates,
  resolveCandidateMemberConditionals,
  resolveEffectiveFastMode,
  resolvePresetMemberBuildMode,
  seedCandidateTargetConditionals,
  setMemberConditionalOverride,
  setPresetMemberBuildMode,
  setPresetMemberFastMode,
  setPresetMemberFastModeStat,
  setPresetResonanceEffectEnabled,
  setPresetResonanceEnabled,
  setPresetWeaponCompareCandidates,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type FastModeStatKey,
  type FastModeStats,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type Preset,
  type PresetFastModeMap,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type ResonanceEffectKey,
  type ResonanceEffectsStateMap,
  type SetFilterMode,
  type SetPieceCount,
  type StatConstraint,
  type StatConstraintKey,
  type TriggeredResonanceDescriptor,
  type WeaponCompareCandidateSpec,
} from '@gi/presets'

export {
  DEFAULT_OPTIMIZER_SETTINGS,
  ELEMENT_TO_RESONANCE_KEY,
  FAST_MODE_STAT_KEYS,
  GO_RESONANCE_CATALOG,
  RESONANCE_EFFECT_KEYS,
  RESONANCE_KEY_TO_ELEMENT,
  STAT_CONSTRAINT_KEYS,
  cloneMemberConditionalsMap,
  getPresetConditionalOverrides,
  getPresetFastMode,
  getPresetMemberBuildModes,
  getPresetResonanceEffects,
  getPresetResonanceEnabled,
  getPresetWeaponCompareCandidates,
  hasDisabledResonanceEffects,
  hasMemberConditionalOverrides,
  hasMemberFastMode,
  hasPresetFastMode,
  isActiveStatConstraint,
  isFastModeStatKey,
  isPercentStatConstraintKey,
  isPresetResonanceEffectEnabled,
  listTriggeredResonances,
  migrateOptimizerSettings,
  normalizeFastModeStats,
  normalizeResonanceEffectKey,
  normalizeResonanceEffectsMap,
  normalizeStatConstraintValue,
  resetMemberConditionalOverrides,
  resetPresetMemberFastMode,
  resetPresetWeaponCompareCandidates,
  resolveCandidateMemberConditionals,
  resolveEffectiveFastMode,
  resolvePresetMemberBuildMode,
  seedCandidateTargetConditionals,
  setMemberConditionalOverride,
  setPresetMemberBuildMode,
  setPresetMemberFastMode,
  setPresetMemberFastModeStat,
  setPresetResonanceEffectEnabled,
  setPresetResonanceEnabled,
  setPresetWeaponCompareCandidates,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type FastModeStatKey,
  type FastModeStats,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type PresetFastModeMap,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type ResonanceEffectKey,
  type ResonanceEffectsStateMap,
  type SetFilterMode,
  type SetPieceCount,
  type StatConstraint,
  type StatConstraintKey,
  type TriggeredResonanceDescriptor,
  type WeaponCompareCandidateSpec,
}

export type ArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'

export interface SimulatedWeaponSpec {
  key: string
  level?: number
  ascension?: number
  refinement: number
}

export interface BuildSelection {
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  artifactIds: Partial<Record<ArtifactSlot, string>>
  /** Optional per-member build mode overrides ('owned' | 'tc') for official preset teammates. */
  memberBuildModes?: Record<string, MemberBuildMode>
  /** Optional per-member conditional overrides (`[characterKey][sheetKey][condKey]`). */
  memberConditionals?: PresetMemberConditionalOverrides
  /** Optional master Elemental Resonance override (`true` = enabled, `false` = disabled). */
  resonanceEnabled?: boolean
  /** Optional per-effect Elemental Resonance overrides (`[resonanceKey]: boolean`). */
  resonanceEffects?: ResonanceEffectsStateMap
  /** Optional per-teammate Fast Mode virtual 6th artifact stat lines (`[characterKey][statKey]`). */
  fastMode?: PresetFastModeMap
}

export type BreakdownSourceCategory =
  | 'character'
  | 'weapon'
  | 'artifactSet'
  | 'teamBuff'
  | 'resonance'
  | 'enemy'

export interface BreakdownContributor {
  label: string
  category: BreakdownSourceCategory
  sourceKey?: string
  value: number
  unit: '' | '%'
  percentValue?: number
  note?: string
}

export interface DamageFactorGroup {
  key:
    | 'baseDamage'
    | 'dmgBonus'
    | 'crit'
    | 'reaction'
    | 'enemyDef'
    | 'enemyRes'
  label: string
  value: number
  unit: '' | '%' | '×'
  formulaSummary?: string
  contributors: BreakdownContributor[]
}

export interface DamageRowBreakdown {
  element: string
  move: string
  hitMode: string
  reaction?: string
  baseDmg: number
  dmgInc: number
  basePlusFlat: number
  dmgBonus: number
  dmgBonusMulti: number
  critRate: number
  critDMG: number
  critMulti: number
  ampMulti: number
  defMulti: number
  resMulti: number
  outerMulti: number
  reconciledPerHit: number
  reconciledSubtotal: number
  factors: DamageFactorGroup[]
}

export interface StatBreakdown {
  statKey: string
  total: number
  unit: '' | '%'
  base: number
  baseContributors: BreakdownContributor[]
  percentContributors: BreakdownContributor[]
  flatContributors: BreakdownContributor[]
  contributors: BreakdownContributor[]
  reconciledTotal: number
}

export interface InstanceResult {
  member?: string
  label: string
  path: string[]
  count: number
  perHit: number
  subtotal: number
  breakdown?: DamageRowBreakdown
}

export interface MemberStatSummary {
  base: Record<string, number>
  final: Record<string, number>
  statBreakdowns?: Record<string, StatBreakdown>
}

export interface FullDamageFormulaEntry {
  /** Formula key within its section (e.g. '0', 'dmg', 'high', 'overloaded'). */
  key: string
  /** Section key in GO sheet display (e.g. 'normal', 'charged', 'plunging', 'skill', 'burst', 'reaction'). */
  sectionKey: string
  /** Full 2-tuple GO display path: `[sectionKey, key]`. */
  path: [string, string]
  /** Human-readable formula label (e.g. '1-Hit DMG', 'High Plunge DMG', 'Overloaded DMG'). */
  label: string
  /** Evaluated per-hit / formula damage value under this build. */
  value: number
  /** Resolved damage element or variant (e.g. 'electro', 'pyro', 'physical', 'heal', 'lunarcrystallize'). */
  element: string
  /** Resolved move category (e.g. 'normal', 'charged', 'plunging_impact', 'skill', 'burst', 'reaction'). */
  move: string
  /** Effective hit mode ('avgHit' | 'critHit' | 'hit'). */
  hitMode: string
  /** Active amplifying/additive reaction on the hit, if any. */
  reaction?: string
  /** Multiplicative factor breakdown reconcilable with `value`. */
  breakdown: DamageRowBreakdown
}

export interface FullDamageSection {
  /** Section key in GO sheet order (e.g. 'normal', 'charged', 'plunging', 'skill', 'burst', 'passive1', 'constellation6', 'reaction'). */
  sectionKey: string
  /** Human-readable section title (e.g. 'Normal Attack', 'Elemental Burst', 'Transformative Reactions'). */
  label: string
  /** Active (non-empty) flat damage/formula entries in sheet definition order. */
  formulas: FullDamageFormulaEntry[]
}

export interface RotationResult {
  total: number
  instances: InstanceResult[]
  stats: Record<string, number>
  statBreakdowns?: Record<string, StatBreakdown>
  memberStats?: Record<string, MemberStatSummary>
  /** Complete character damage formula list grouped by talent/source section in sheet order. */
  fullDamage?: FullDamageSection[]
}

export interface OptimizeProgress {
  tested: number
  skipped: number
  total: number
}

export interface OptimizeResult {
  builds: Array<BuildSelection & { total: number }>
  tested: number
  skipped: number
  durationMs: number
}

export interface WeaponCompareCandidate {
  /** Weapon key from GO consts (e.g. 'SplendorOfTranquilWaters', 'FavoniusSword') */
  weaponKey: string
  /** Weapon level (1..90, or 1..70 for 1★–2★) */
  level: number
  /** Weapon ascension (0..6, or 0..4 for 1★–2★) */
  ascension: number
  /** Weapon refinement (1..5, or 1 for 1★–2★) */
  refinement: number
  /** Whether this weapon is owned in the user's GOOD inventory */
  isOwned?: boolean
  /** Owned weapon ID in GOOD if owned */
  ownedWeaponId?: string
  /** Whether this weapon is currently equipped on the target character in GOOD */
  isEquippedBaseline?: boolean
  /**
   * Independent copy of the target character's (`preset.target` / slot 0) conditional
   * overrides for this candidate: candidate weapon passives, target character/constellation
   * passives, and target artifact-set conditionals.
   */
  targetConditionals?: MemberConditionalsMap
  /**
   * Snapshot of the target character's effective conditional overrides at the time this
   * candidate was added or seeded, used to detect and explain "Setup differs" in the UI.
   */
  seededTargetConditionals?: MemberConditionalsMap
}

export const WEAPON_COMPARE_TOP_N = 5

export interface WeaponCompareBuildEntry {
  /** 1-based rank of this build for the weapon (1..5) */
  rank: number
  /** Build selection (including weaponOverride and artifactIds) with total rotation damage */
  selection: BuildSelection & { total: number }
  /** Full rotation evaluation (instances + final stats) for this build */
  evaluation: RotationResult
}

export interface WeaponCompareRowResult {
  /** Candidate weapon specification used for this run */
  candidate: WeaponCompareCandidate
  /** Status of this weapon's optimization run */
  status: 'ok' | 'unmet'
  /** 1-based rank among feasible ('ok') weapons, or null if 'unmet' */
  rank: number | null
  /** Best total rotation damage, or null if 'unmet' */
  total: number | null
  /** Percentage behind the #1 leader (0 for leader, positive number e.g. 5.4 for 5.4% behind), or null if 'unmet' */
  percentBehindLeader: number | null
  /** Best build selection (including weaponOverride and artifactIds), or null if 'unmet' */
  bestBuild: (BuildSelection & { total: number }) | null
  /** Full rotation evaluation (instances + final stats) for the best build, or null if 'unmet' */
  evaluation: RotationResult | null
  /** Ranked top builds (up to WEAPON_COMPARE_TOP_N = 5) for this weapon, or [] if 'unmet' */
  topBuilds?: WeaponCompareBuildEntry[]
  /** Number of builds tested for this weapon */
  tested: number
  /** Number of builds pruned/skipped for this weapon */
  skipped: number
  /** Solver duration in ms for this weapon */
  durationMs: number
}

export interface WeaponCompareProgress {
  /** 0-based index of the weapon currently being optimized */
  weaponIndex: number
  /** Total number of weapons in the comparison */
  totalWeapons: number
  /** Weapon key currently being optimized */
  weaponKey: string
  /** Current weapon's solver progress */
  solverProgress: OptimizeProgress
  /** Completed weapon rows so far (in completion order) */
  completedRows: WeaponCompareRowResult[]
}

export interface WeaponCompareResult {
  /** Ranked rows: all 'ok' rows sorted by total descending (#1 first), followed by 'unmet' rows in selection order */
  rows: WeaponCompareRowResult[]
  /** Total damage of the #1 ranked weapon, or null if no weapon had a feasible build */
  leaderTotal: number | null
  /** Whether the comparison was cancelled mid-run (rows contain all weapons that finished before cancellation) */
  cancelled: boolean
}

export interface TeamMemberOptimizeResult {
  /** Team member's character key */
  memberKey: string
  /** 0-based index in `preset.team` */
  memberIndex: number
  /** True when the member has 0 rotation rows and keeps their current/simulated gear without running the solver */
  skippedSolver: boolean
  /** Number of rotation target rows attributed to this member */
  rotationRowCount: number
  /** Chosen build selection (or current/simulated build if skippedSolver is true) */
  selection: BuildSelection
  /** Current baseline build selection for this member */
  currentSelection: BuildSelection
  /** Member's rotation subtotal under the optimized team builds (0 if skippedSolver is true) */
  subtotal: number
  /** Member's rotation subtotal under the current baseline team builds (0 if skippedSolver is true) */
  currentSubtotal: number
  /** Full rotation evaluation for this member's rows under the optimized team builds, or null if 0 rows */
  evaluation: RotationResult | null
  /** Full rotation evaluation for this member's rows under the current baseline team builds, or null if 0 rows */
  currentEvaluation: RotationResult | null
  /** Solver builds tested for this member (0 if skippedSolver is true) */
  tested: number
  /** Solver builds pruned/skipped for this member (0 if skippedSolver is true) */
  skipped: number
  /** Solver duration in ms for this member */
  durationMs: number
}

export interface TeamOptimizeProgress {
  /** 0-based index of the team member currently being solved */
  memberIndex: number
  /** Total number of members in the team */
  totalMembers: number
  /** Character key of the member currently being solved */
  memberKey: string
  /** Current member's solver progress */
  solverProgress: OptimizeProgress
}

export interface TeamOptimizeOptions {
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  memberBuildModes?: Record<string, MemberBuildMode>
  memberConditionals?: PresetMemberConditionalOverrides
  resonanceEnabled?: boolean
  resonanceEffects?: ResonanceEffectsStateMap
  onProgress?: (p: TeamOptimizeProgress) => void
  signal?: AbortSignal
  maxWorkers?: number
}

export interface TeamOptimizeResult {
  /** Per-member optimization results in team order (`0..preset.team.length - 1`) */
  members: TeamMemberOptimizeResult[]
  /** Combined team rotation damage across all members with rotation rows */
  teamTotal: number
  /** Combined current baseline team rotation damage across all members with rotation rows */
  currentTeamTotal: number
  /** Total builds tested across all solved team members */
  tested: number
  /** Total builds pruned/skipped across all solved team members */
  skipped: number
  /** Total wall-clock duration in ms */
  durationMs: number
}

export interface TargetDescriptor {
  path: string[]
  name: string
  section: string
}

export type ConditionalSourceCategory =
  | 'weapon'
  | 'artifact'
  | 'character'
  | 'constellation'

export interface ConditionalStateDescriptor {
  key: string
  name: string
}

export interface ConditionalDescriptor {
  sheet: string
  key: string
  name: string
  states: ConditionalStateDescriptor[]
  canShow: boolean
  isTeamBuff?: boolean
  category?: ConditionalSourceCategory
  section?: string
}

export interface EngineSession {
  evaluate(preset: Preset, selection?: BuildSelection): RotationResult
  currentBuild(preset: Preset): BuildSelection
  optimize(
    preset: Preset,
    settings: OptimizerSettings,
    opts?: {
      weaponId?: string
      weaponOverride?: SimulatedWeaponSpec
      memberBuildModes?: Record<string, MemberBuildMode>
      memberConditionals?: PresetMemberConditionalOverrides
      resonanceEnabled?: boolean
      resonanceEffects?: ResonanceEffectsStateMap
      fastMode?: PresetFastModeMap
      onProgress?: (p: OptimizeProgress) => void
      signal?: AbortSignal
      maxWorkers?: number
    }
  ): Promise<OptimizeResult>
  compareWeapons(
    preset: Preset,
    settings: OptimizerSettings,
    candidates: readonly WeaponCompareCandidate[],
    opts?: {
      memberBuildModes?: Record<string, MemberBuildMode>
      memberConditionals?: PresetMemberConditionalOverrides
      resonanceEnabled?: boolean
      resonanceEffects?: ResonanceEffectsStateMap
      fastMode?: PresetFastModeMap
      onProgress?: (p: WeaponCompareProgress) => void
      signal?: AbortSignal
      maxWorkers?: number
    }
  ): Promise<WeaponCompareResult>
  optimizeTeam(
    preset: Preset,
    settings: OptimizerSettings,
    opts?: TeamOptimizeOptions
  ): Promise<TeamOptimizeResult>
  listTargets(characterKey: string): TargetDescriptor[]
  listConditionals(characterKey: string): ConditionalDescriptor[]
  exportGODatabase(preset: Preset, selection?: BuildSelection): object
}
