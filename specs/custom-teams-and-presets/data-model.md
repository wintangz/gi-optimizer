# Data Model & Contracts: Custom Teams and Presets (`custom-teams-and-presets`)

## User Preset API (`packages/presets/src/userPreset.ts`)

```ts
export interface PresetImportIssue {
  path: string
  message: string
}

export type ParsePresetImportResult =
  | {
      ok: true
      preset: Preset
      convertedFromSource?: 'akasha' | 'official'
    }
  | {
      ok: false
      issues: PresetImportIssue[]
    }

export function generateUserPresetId(name: string): string
export function defaultTcBuildForCharacter(characterKey: string): TcBuild
export function createBlankUserPreset(target: string, name?: string): Preset
export function forkPresetToUser(source: Preset, newName?: string): Preset
export function serializePresetJson(preset: Preset): string
export function parsePresetJson(rawText: string): ParsePresetImportResult
```

