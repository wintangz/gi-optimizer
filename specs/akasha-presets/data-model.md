# Data Model & Contracts: Akasha Presets (`akasha-presets`)

## 1. Preset Team Member Build Discriminated Union (`packages/presets/src/schema.ts`)

```ts
/**
 * 'owned' -> target character (team[0]): uses the user's scanned GOOD character
 *            (level, constellation, talents), selected weapon, and evaluated artifacts.
 * 'tc'    -> supporting teammate (team[1..3] in Akasha & Official presets):
 *            simulated/assumed GO BuildTc fixed by the preset; never checked against
 *            or read from the user's GOOD account.
 */
export type TeamMemberBuild =
  | { type: 'owned' }
  | { type: 'tc'; tc: TcBuild }
```

### Invariants
1. `preset.team[0].key === preset.target` and `preset.team[0].build.type === 'owned'`.
2. For `preset.source === 'akasha'`, every supporting teammate (`preset.team[1..3]`) MUST have `build.type === 'tc'`.
3. `forkPresetToUser(sourcePreset, newName?)` MUST preserve `member.build` (`type === 'tc'` and all nested `tc.character`, `tc.weapon`, `tc.artifact` fields) verbatim on every teammate (`team[1..3]`).

## 2. Matcher Contract (`packages/presets/src/match.ts`)

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

/**
 * Evaluates ONLY team members with `build.type === 'owned'` (the target character).
 * Teammates with `build.type === 'tc'` are simulated preset builds and are never inspected.
 */
export function matchAccount(
  preset: Preset,
  account: { characters?: any[]; weapons?: any[] },
  opts?: { selectedWeaponId?: string }
): MatchReport
```

## 3. Registry Contract (`packages/presets/src/registry.ts`)

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

## 4. UI Presentation Contracts (`/presets`, `/optimize`, `/teams`)

- **Team Member Role Labelling**:
  - `team[0]` (`build.type === 'owned'`): `"Your Character · Target"`
  - `team[1..3]` (`build.type === 'tc'`): `SIM` badge + dashed border/ring + `"Simulated / Assumed Preset Build (Not Your Account)"`
- **Compatibility Check Copy**:
  - Section title on `/presets` and `/optimize`: `"Target Character & Weapon Check"`
  - Empty GOOD prompt on `/presets` and `/optimize`: `"Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset."`
