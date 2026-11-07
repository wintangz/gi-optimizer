import {
  DEFAULT_OPTIMIZER_SETTINGS,
  STAT_CONSTRAINT_KEYS,
  getPresetMemberBuildModes,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resolvePresetMemberBuildMode,
  setPresetMemberBuildMode,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type OptimizerSettings,
  type Preset,
  type ResolvedMemberBuild,
  type SetFilterMode,
  type SetPieceCount,
  type StatConstraint,
  type StatConstraintKey,
} from '@gi/presets'

export {
  DEFAULT_OPTIMIZER_SETTINGS,
  STAT_CONSTRAINT_KEYS,
  getPresetMemberBuildModes,
  isActiveStatConstraint,
  isPercentStatConstraintKey,
  migrateOptimizerSettings,
  normalizeStatConstraintValue,
  resolvePresetMemberBuildMode,
  setPresetMemberBuildMode,
  type ArtSetExclusionMap,
  type ArtSetFilterSummary,
  type MemberBuildMode,
  type MemberBuildModesMap,
  type OptimizerSettings,
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

export interface TargetDescriptor {
  path: string[]
  name: string
  section: string
}

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
      onProgress?: (p: OptimizeProgress) => void
      signal?: AbortSignal
      maxWorkers?: number
    }
  ): Promise<OptimizeResult>
  listTargets(characterKey: string): TargetDescriptor[]
  listConditionals(characterKey: string): ConditionalDescriptor[]
  exportGODatabase(preset: Preset, selection?: BuildSelection): object
}
