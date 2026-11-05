# Data Model & Contracts: Akasha Presets (`akasha-presets`)

## Matcher Contract (`packages/presets/src/match.ts`)

```ts
export type MatchPartKind =
  | 'owned'
  | 'constellation'
  | 'weapon'
  | 'refinement'
  | 'level'
  | 'talent.auto'
  | 'talent.skill'
  | 'talent.burst'

export interface WeaponCandidate {
  id: string
  key: string
  name: string
  level: number
  ascension: number
  refinement: number
  location: string
  qualifies: boolean
}

export interface MatchPartResult {
  characterKey: string
  part: MatchPartKind
  expected: string
  actual: string
  ok: boolean
  message: string
  candidates?: WeaponCandidate[]
}

export interface MatchReport {
  presetId: string
  canRun: boolean
  selectedWeaponId?: string
  parts: MatchPartResult[]
}

export function matchAccount(
  preset: Preset,
  account: { characters?: any[]; weapons?: any[] },
  opts?: { selectedWeaponId?: string }
): MatchReport
```

## Registry Contract (`packages/presets/src/registry.ts`)

```ts
export interface PresetBadge {
  kind: 'akasha' | 'official' | 'user'
  label: string
  verified: boolean
  warning?: string
}

export function getPresetBadge(preset: Preset): PresetBadge
export function listBundledPresets(): Preset[]
export function getBundledPreset(id: string): Preset | undefined
```
