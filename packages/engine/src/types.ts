import {
  DEFAULT_OPTIMIZER_SETTINGS,
  STAT_CONSTRAINT_KEYS,
  getPresetConditionalOverrides,
  getPresetMemberBuildModes,
  hasMemberConditionalOverrides,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resetMemberConditionalOverrides,
  resolvePresetMemberBuildMode,
  setMemberConditionalOverride,
  setPresetMemberBuildMode,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type Preset,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type SetFilterMode,
  type SetPieceCount,
  type StatConstraint,
  type StatConstraintKey,
} from '@gi/presets'

export {
  DEFAULT_OPTIMIZER_SETTINGS,
  STAT_CONSTRAINT_KEYS,
  getPresetConditionalOverrides,
  getPresetMemberBuildModes,
  hasMemberConditionalOverrides,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resetMemberConditionalOverrides,
  resolvePresetMemberBuildMode,
  setMemberConditionalOverride,
  setPresetMemberBuildMode,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type PresetMemberConditionalOverrides,
  type ResolvedMemberBuild,
  type SetFilterMode,
  type SetPieceCount,
  type StatConstraint,
  type StatConstraintKey,
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
}

export interface InstanceResult {
  label: string
  path: string[]
  count: number
  perHit: number
  subtotal: number
}

export interface RotationResult {
  total: number
  instances: InstanceResult[]
  stats: Record<string, number>
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
      onProgress?: (p: WeaponCompareProgress) => void
      signal?: AbortSignal
      maxWorkers?: number
    }
  ): Promise<WeaponCompareResult>
  listTargets(characterKey: string): TargetDescriptor[]
  listConditionals(characterKey: string): ConditionalDescriptor[]
  exportGODatabase(preset: Preset, selection?: BuildSelection): object
}
