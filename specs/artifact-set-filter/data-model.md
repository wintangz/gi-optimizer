# Data Model & Contracts: Multi-Select Artifact Set Filter (`artifact-set-filter`)

## 1. Optimizer Settings & Set-Filter Translation Contract (`packages/presets/src/settings.ts`)

Re-exported from `packages/presets/src/index.ts` (`@gi/presets`) and `packages/engine/src/types.ts` / `packages/engine/src/index.ts` (`@gi/engine`).

```ts
import { ALL_ARTIFACT_SET_KEYS } from './names'

export type SetPieceCount = 2 | 4
export type SetFilterMode = 'all' | 'exclude' | 'include'
export type ArtSetExclusionMap = Record<string, SetPieceCount[]>

export interface OptimizerSettings {
  erFloor?: number
  includeEquippedOnOthers: boolean
  excludedCharacters: string[]
  lockedOnly?: boolean
  mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20
  levelLow: number
  levelHigh: number
  /** Legacy / direct GO artSetExclusion map. */
  setExclusion?: ArtSetExclusionMap
  /** First-class set filter mode ('all' | 'exclude' | 'include'). */
  setFilterMode?: SetFilterMode
  /**
   * Selected sets and their chosen piece counts ([2], [4], or [2, 4]).
   * - In 'exclude' mode: piece counts to exclude for each checked set.
   * - In 'include' mode: piece counts to allow for each checked set.
   */
  setFilterSelection?: ArtSetExclusionMap
  topN: number
}

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  includeEquippedOnOthers: true,
  excludedCharacters: [],
  lockedOnly: false,
  mainStatAssumptionLevel: 0,
  levelLow: 0,
  levelHigh: 20,
  setExclusion: {},
  setFilterMode: 'all',
  setFilterSelection: {},
  topN: 5,
}
```

### Pure Translation Function: `resolveArtSetExclusion`

```ts
/**
 * Normalizes a piece-count array to sorted unique (2 | 4)[]:
 * [] | [2] | [4] | [2, 4].
 */
export function normalizePieceCounts(
  pieces: readonly number[] | undefined
): SetPieceCount[]

/**
 * Translates OptimizerSettings (setFilterMode, setFilterSelection, setExclusion)
 * into Genshin Optimizer's ArtSetExclusion map (`Record<string, (2 | 4)[]>`).
 *
 * Rules:
 * 1. Effective mode resolution:
 *    - If `settings.setFilterMode` is `'exclude'` or `'include'`, use it.
 *    - If `settings.setFilterMode` is `'all'`:
 *      - If `settings.setFilterSelection` is undefined and `settings.setExclusion` has keys
 *        (legacy caller that spread DEFAULT_OPTIMIZER_SETTINGS and set `setExclusion`),
 *        normalize and return `settings.setExclusion`.
 *      - Otherwise return `{}`.
 *    - If `settings.setFilterMode` is `undefined`:
 *      - Normalize and return `settings.setExclusion ?? {}`.
 * 2. Mode === 'exclude':
 *    - Source map is `settings.setFilterSelection ?? settings.setExclusion ?? {}`.
 *    - Each key with normalized non-empty pieces (`[2]`, `[4]`, or `[2, 4]`) is copied to output.
 * 3. Mode === 'include' ("Only these sets"):
 *    - Source map is `settings.setFilterSelection ?? {}`.
 *    - For each `setKey` in `allSetKeys` (defaults to `ALL_ARTIFACT_SET_KEYS`):
 *      - Let `allowed = normalizePieceCounts(source[setKey])`.
 *      - If `allowed.length === 0` (unselected): output[setKey] = `[2, 4]`.
 *      - If `allowed` is `[4]` (4pc only allowed): output[setKey] = `[2]`.
 *      - If `allowed` is `[2]` (2pc only allowed): output[setKey] = `[4]`.
 *      - If `allowed` is `[2, 4]` (both allowed): `setKey` is omitted from output.
 */
export function resolveArtSetExclusion(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys?: readonly string[]
): ArtSetExclusionMap
```

### Summary Helper: `summarizeArtSetFilter`

```ts
export interface ArtSetFilterSummary {
  mode: SetFilterMode
  totalSets: number
  selectedCount: number
  allowedCount: number
  text: string
}

/**
 * Computes human-readable summary statistics and label for the current set filter:
 * - 'all':     "All 54 artifact sets allowed" (allowedCount = totalSets)
 * - 'exclude': "51 of 54 sets allowed (3 excluded)" (or "All 54 artifact sets allowed (0 excluded)")
 * - 'include': "Only 3 of 54 sets allowed" (allowedCount = selectedCount)
 */
export function summarizeArtSetFilter(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys?: readonly string[]
): ArtSetFilterSummary
```

## 2. Solver Boundary Consumption (`packages/engine/src/solver.ts`)

In `runSolver` (`packages/engine/src/solver.ts`):

```ts
import { ALL_ARTIFACT_SET_KEYS, resolveArtSetExclusion } from '@gi/presets'
// ...
const exclusion = resolveArtSetExclusion(
  settings,
  ALL_ARTIFACT_SET_KEYS
) as ArtSetExclusion
```

## 3. UI Component Contract (`apps/web/src/components/ArtifactSetFilter.tsx`)

```ts
import type { OptimizerSettings, SetPieceCount } from '@gi/presets'

export interface ArtifactSetFilterProps {
  settings: OptimizerSettings
  onChange: (next: OptimizerSettings) => void
  /** Optional override of available artifact set keys (defaults to ALL_ARTIFACT_SET_KEYS). */
  allSetKeys?: readonly string[]
}

export function ArtifactSetFilter(props: ArtifactSetFilterProps): JSX.Element
```

### Bulk Action Pure Helpers (exported from `ArtifactSetFilter.tsx` or `packages/presets/src/settings.ts` for direct unit testing)

- `selectAllSets(current: ArtSetExclusionMap, targetKeys: readonly string[], defaultPieces?: SetPieceCount[]): ArtSetExclusionMap`
  - Ensures every `key` in `targetKeys` is present in the returned selection map (preserving existing `current[key]` if non-empty, otherwise setting `defaultPieces ?? [2, 4]`).
- `clearSets(current: ArtSetExclusionMap, targetKeys: readonly string[]): ArtSetExclusionMap`
  - Removes every `key` in `targetKeys` from the selection map while preserving selections outside `targetKeys`.
- `invertSets(current: ArtSetExclusionMap, targetKeys: readonly string[], defaultPieces?: SetPieceCount[]): ArtSetExclusionMap`
  - For each `key` in `targetKeys`: if currently selected, removes it; if unselected, adds it with `defaultPieces ?? [2, 4]`.

## 4. Validation Rules & Invariants

1. **Piece Count Normalization**: Every value in `setFilterSelection` and `resolveArtSetExclusion` output is strictly one of `[2]`, `[4]`, or `[2, 4]`. Empty arrays are never emitted in `ArtSetExclusionMap`.
2. **Include-Mode Completeness**: When `setFilterMode === 'include'` and `K` sets are selected with `[2, 4]` out of `N = allSetKeys.length`, `Object.keys(resolveArtSetExclusion(settings, allSetKeys)).length` is exactly `N - K`, and every unselected key maps to `[2, 4]`.
3. **Visual Identifier Compliance**: Every set card in `ArtifactSetFilter` renders `<ArtifactBadge setKey={setKey} compact />` — never plain text alone.
