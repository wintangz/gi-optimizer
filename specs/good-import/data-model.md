# Data Model & Contracts: GOOD Import (`good-import`)

## Entities (`packages/good/src/types.ts`)

```ts
export type IssueSeverity = 'fatal' | 'error' | 'warning' | 'info'

export interface ParseIssue {
  severity: IssueSeverity
  /** JSON path like "artifacts[12].substats[2].key" or "root" or "line 4, col 12" */
  path: string
  message: string
  suggestion?: string
}

export interface SectionCounts {
  read: number
  imported: number
  skipped: number
  adjusted: number
}

export interface GoodSummary {
  characters: SectionCounts
  weapons: SectionCounts
  artifacts: SectionCounts
  issueCounts: Record<IssueSeverity, number>
}

export interface ISubstat {
  key: string
  value: number
}

export interface IArtifact {
  id: string
  setKey: string
  slotKey: 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'
  level: number
  rarity: number
  mainStatKey: string
  location: string
  lock: boolean
  substats: ISubstat[]
}

export interface IWeapon {
  id: string
  key: string
  level: number
  ascension: number
  refinement: number
  location: string
  lock: boolean
}

export interface ICharacter {
  key: string
  level: number
  ascension: number
  constellation: number
  talent: { auto: number; skill: number; burst: number }
}

export interface IGOOD {
  format: 'GOOD'
  version: number
  source: string
  characters: ICharacter[]
  weapons: IWeapon[]
  artifacts: IArtifact[]
}

export interface ParseGoodResult {
  ok: boolean
  good?: IGOOD
  summary: GoodSummary
  issues: ParseIssue[]
}
```

## Storage Contract (`apps/web/src/lib/storage/db.ts`)

```ts
export interface StoredGoodRecord {
  good: IGOOD
  importedAt: string
  fileName?: string
  source: string
  summary: GoodSummary
}

export function loadGood(): Promise<StoredGoodRecord | undefined>
export function saveGood(record: StoredGoodRecord): Promise<void>
export function clearGood(): Promise<void>
export function listUserPresets(): Promise<Preset[]>
export function saveUserPreset(preset: Preset): Promise<void>
export function deleteUserPreset(id: string): Promise<void>
export function loadSettings(): Promise<OptimizerSettings | undefined>
export function saveSettings(settings: OptimizerSettings): Promise<void>
```
