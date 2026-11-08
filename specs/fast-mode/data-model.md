# Data Model: Fast Mode (Per-Teammate Virtual 6th Artifact)

## Entities

### 1. `FastModeStatKey` & `FastModeStats` (`packages/presets/src/schema.ts`)

```ts
export const FAST_MODE_STAT_KEYS = ALL_SUBSTAT_KEYS
// ['hp', 'hp_', 'atk', 'atk_', 'def', 'def_', 'eleMas', 'enerRech_', 'critRate_', 'critDMG_']

export type FastModeStatKey = (typeof FAST_MODE_STAT_KEYS)[number]

export type FastModeStats = Partial<Record<FastModeStatKey, number>>

export type PresetFastModeMap = Record<string, FastModeStats>
```

**Validation Rules**:
- Keys must belong to `FAST_MODE_STAT_KEYS`.
- Values must be finite numbers (`typeof v === 'number' && Number.isFinite(v)`).
- Zero values (`Math.abs(v) < 1e-9` or `v === 0`) are stripped upon normalization so an empty or all-zero virtual piece normalizes to `undefined` / `{}`.
- Percentage keys (`hp_`, `atk_`, `def_`, `enerRech_`, `critRate_`, `critDMG_`) are stored in human percentage points (e.g. `20` = `+20%`, `-10` = `-10%`).
- Flat keys (`hp`, `atk`, `def`, `eleMas`) are stored as raw numbers (e.g. `40` = `+40`, `-100` = `-100`).

### 2. `TeamMember.fastMode` (`packages/presets/src/schema.ts`)

```ts
export interface TeamMember {
  // ...existing fields
  /** Optional Fast Mode virtual 6th artifact stat lines (non-target members only). */
  fastMode?: FastModeStats
}
```

**Validation Rules**:
- In `parseTeamMember`: if `fastMode` is provided, validate that it is a plain object with valid `FastModeStatKey` keys and finite numeric values; omit the property when empty.
- In `parsePreset`: strip `fastMode` from `team[0]` (the optimization target) so the target can never hold a virtual piece.

### 3. `OptimizerSettings.fastModeByPreset` (`packages/presets/src/settings.ts`)

```ts
export interface OptimizerSettings {
  // ...existing fields
  /**
   * Per-preset Fast Mode virtual 6th artifact stat lines keyed by
   * `[presetId][characterKey][statKey]`.
   */
  fastModeByPreset?: Record<string, PresetFastModeMap>
}
```

### 4. `MemberStatSummary` & `RotationResult.memberStats` (`packages/engine/src/types.ts`)

```ts
export interface MemberStatSummary {
  base: Record<string, number>
  final: Record<string, number>
}

export interface RotationResult {
  total: number
  instances: InstanceResult[]
  stats: Record<string, number>
  statBreakdowns?: Partial<Record<BreakdownStatKey, StatBreakdown>>
  memberStats?: Record<string, MemberStatSummary>
}
```
