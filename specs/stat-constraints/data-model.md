# Data Model: Final Stat Constraints (`stat-constraints`)

## 1. Stat Constraint Types (`packages/presets/src/settings.ts`)

```ts
export const STAT_CONSTRAINT_KEYS = [
  'hp',
  'atk',
  'def',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
  'heal_',
  'pyro_dmg_',
  'hydro_dmg_',
  'electro_dmg_',
  'cryo_dmg_',
  'anemo_dmg_',
  'geo_dmg_',
  'dendro_dmg_',
  'physical_dmg_',
] as const

export type StatConstraintKey = (typeof STAT_CONSTRAINT_KEYS)[number]

export interface StatConstraint {
  stat: StatConstraintKey
  min?: number
  max?: number
}
```

## 2. `OptimizerSettings` Extension (`packages/presets/src/settings.ts`)

```ts
export interface OptimizerSettings {
  erFloor?: number
  constraints?: StatConstraint[]
  includeEquippedOnOthers: boolean
  excludedCharacters: string[]
  lockedOnly?: boolean
  mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20
  levelLow: number
  levelHigh: number
  setExclusion?: ArtSetExclusionMap
  setFilterMode?: SetFilterMode
  setFilterSelection?: ArtSetExclusionMap
  topN: number
}
```

## 3. Solver Problem Constraint (`packages/engine/src/solver.ts`)

```ts
export interface SolverProblemConstraint {
  value: NumNode
  min: number
  max?: number
}
```
- Expanded during `computeUpfrontTotal` / `GOSolver.preprocess` into lower-bound `Setup.constraints` entries (`{ value: c.value, min: c.min }` for `min > -Infinity` and `{ value: prod(-1, c.value), min: -c.max }` for `max < +Infinity`).
