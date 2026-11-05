# Data Model & Contracts: Bundle Isolation & Animated Loading Feedback (`loading-and-bundle`)

## 1. Static Metadata Contract (`statMeta.gen.ts`)

Located in `packages/presets/src/statMeta.gen.ts` and `packages/good/src/statMeta.gen.ts` (generated from `@genshin-optimizer/gi/stats` by `packages/presets/scripts/generate-stat-meta.ts` and verified in unit tests):

```ts
export type StatMetaElement =
  | 'pyro'
  | 'hydro'
  | 'electro'
  | 'cryo'
  | 'anemo'
  | 'geo'
  | 'dendro'

export type StatMetaWeaponType =
  | 'sword'
  | 'claymore'
  | 'polearm'
  | 'bow'
  | 'catalyst'

export interface CharStatMeta {
  ele: StatMetaElement
  rarity: 4 | 5
  weaponType: StatMetaWeaponType
}

export interface WeaponStatMeta {
  weaponType: StatMetaWeaponType
  rarity: 1 | 2 | 3 | 4 | 5
}

export interface ArtSetStatMeta {
  rarities: readonly number[]
}

export const CHAR_STAT_META: Readonly<Record<string, CharStatMeta>>
export const WEAPON_STAT_META: Readonly<Record<string, WeaponStatMeta>>
export const ART_SET_STAT_META: Readonly<Record<string, ArtSetStatMeta>>

export function getCharStatMeta(charKey: string): CharStatMeta | undefined
export function getWeaponStatMeta(weaponKey: string): WeaponStatMeta | undefined
export function getArtSetStatMeta(setKey: string): ArtSetStatMeta | undefined
```

### Validation & Invariants
- `getCharStatMeta('Traveler')` normalizes to `'TravelerAnemo'` (`{ ele: 'anemo', rarity: 5, weaponType: 'sword' }`).
- Every key in `allCharacterKeys` from `@genshin-optimizer/gi/consts` is present in `CHAR_STAT_META` and matches `getCharEle(ck)` and `getCharStat(ck)` (`rarity`, `weaponType`) from `@genshin-optimizer/gi/stats`.
- Every key in `allWeaponKeys` is present in `WEAPON_STAT_META` and matches `getWeaponStat(wk)` (`weaponType`, `rarity`).
- Every key in `allArtifactSetKeys` is present in `ART_SET_STAT_META` and matches `getArtSetStat(sk).rarities`.

---

## 2. Pure Optimizer Settings Contract (`packages/presets/src/settings.ts`)

Re-exported from both `@gi/presets` and `@gi/engine`:

```ts
export type SetFilterMode = 'all' | 'exclude' | 'include'

export interface OptimizerSettings {
  erFloor?: number
  includeEquippedOnOthers: boolean
  excludedCharacters: string[]
  lockedOnly?: boolean
  mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20
  levelLow: number
  levelHigh: number
  setExclusion?: Record<string, (2 | 4)[]>
  setFilterMode?: SetFilterMode
  setFilterSelection?: Record<string, (2 | 4)[]>
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

export function resolveArtSetExclusion(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys?: readonly string[]
): Record<string, (2 | 4)[]>

export interface ArtSetFilterSummary {
  mode: SetFilterMode
  totalSets: number
  allowedSets: number
  selectedSets: number
  label: string
}

export function summarizeArtSetFilter(
  settings: Pick<
    OptimizerSettings,
    'setFilterMode' | 'setFilterSelection' | 'setExclusion'
  >,
  allSetKeys?: readonly string[]
): ArtSetFilterSummary
```

---

## 3. Shared Loading Primitives Contract (`apps/web/src/components/Loading.tsx`)

```ts
export interface SpinnerProps {
  /** Accessible status text displayed beside the animated ring (e.g. "Loading optimizer engine…", "Evaluating…", "Parsing GOOD file…"). */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  inline?: boolean
}

export interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  count?: number
  gap?: string | number
  className?: string
  style?: React.CSSProperties
}

export interface ResultsSkeletonProps {
  /** Status label shown in the skeleton header (defaults to "Evaluating…"). */
  label?: string
}

export interface ProgressBarProps {
  tested: number
  skipped?: number
  total: number
  label?: string
}
```

### Accessibility & State Transitions
- `Spinner`: Renders `role="status"` and `aria-live="polite"`, with an SVG circle animated via `.gi-spinner` (`@keyframes gi-spin`).
- `SkeletonBlock`: Renders `count` (default `1`) `.gi-skeleton` divs (`@keyframes gi-pulse`, `aria-hidden="true"`).
- `ResultsSkeleton`: Renders `role="status"` and `aria-busy="true"` with a header `<Spinner label={label} />`, 3 summary card skeletons, a 5-row per-instance breakdown table skeleton, and a 5-slot artifact loadout comparison skeleton.
- `ProgressBar`:
  - Computes `processed = Math.max(0, tested + (skipped ?? 0))`.
  - When `total > 0`: determinate mode with `percent = Math.min(100, Math.round((processed / total) * 100))`, `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={percent}`, and smooth width transition + shimmer overlay.
  - When `total <= 0`: indeterminate mode (`aria-valuenow` omitted) with an animated sliding shimmer bar while permutation counts initialize.
