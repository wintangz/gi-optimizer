# Data Model: Optimize Experience UI (`optimize-experience-ui`)

## 1. Settings Migration (`packages/presets/src/settings.ts`)

```ts
export function migrateOptimizerSettings(
  raw?: Partial<OptimizerSettings>
): OptimizerSettings
```
- Merges `DEFAULT_OPTIMIZER_SETTINGS` with `raw`.
- If `typeof raw?.erFloor === 'number' && Number.isFinite(raw.erFloor) && raw.erFloor > 0`:
  - If `!constraints.some((c) => c.stat === 'enerRech_')`, prepends `{ stat: 'enerRech_', min: raw.erFloor }`.
- Deletes `erFloor` from the returned object so `constraints` is the single source of truth.

## 2. Comparison Row Model (`apps/web/src/components/OptimizeViews.tsx`)

```ts
export interface ComparisonRowItem {
  id: string
  kind: 'current' | 'optimized'
  rank?: number
  isBest?: boolean
  total: number
  artifactIds: Partial<Record<ArtifactSlot, string>>
  evaluation?: RotationResult | null
  selection: BuildSelection
}
```
