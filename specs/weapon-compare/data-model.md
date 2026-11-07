# Data Model: Weapon Comparison Mode (`weapon-compare`)

## Engine Types (`packages/engine/src/types.ts`)

```ts
export interface WeaponCompareCandidate {
  weaponKey: string
  level: number
  ascension: number
  refinement: number
  isOwned?: boolean
  ownedWeaponId?: string
  isEquippedBaseline?: boolean
}

export interface WeaponCompareRowResult {
  candidate: WeaponCompareCandidate
  status: 'ok' | 'unmet'
  rank: number | null
  total: number | null
  percentBehindLeader: number | null
  bestBuild: (BuildSelection & { total: number }) | null
  evaluation: RotationResult | null
  tested: number
  skipped: number
  durationMs: number
}

export interface WeaponCompareProgress {
  weaponIndex: number
  totalWeapons: number
  weaponKey: string
  solverProgress: OptimizeProgress
  completedRows: WeaponCompareRowResult[]
}

export interface WeaponCompareResult {
  rows: WeaponCompareRowResult[]
  leaderTotal: number | null
  cancelled: boolean
}
```
