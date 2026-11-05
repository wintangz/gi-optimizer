# Data Model & Contracts: Single-Character Optimizer (`single-character-optimizer`)

## Engine Contract (`packages/engine/src/index.ts`)

```ts
export type ArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'

export interface BuildSelection {
  weaponId?: string
  artifactIds: Partial<Record<ArtifactSlot, string>>
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

export interface OptimizerSettings {
  erFloor?: number
  includeEquippedOnOthers: boolean
  excludedCharacters: string[]
  lockedOnly?: boolean
  mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20
  levelLow: number
  levelHigh: number
  setExclusion?: Record<string, (2 | 4)[]>
  topN: number
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
      onProgress?: (p: OptimizeProgress) => void
      signal?: AbortSignal
      maxWorkers?: number
    }
  ): Promise<OptimizeResult>
  listTargets(characterKey: string): TargetDescriptor[]
  listConditionals(characterKey: string): ConditionalDescriptor[]
  exportGODatabase(preset: Preset, selection?: BuildSelection): object
}

export function createSession(good: unknown): EngineSession
```
