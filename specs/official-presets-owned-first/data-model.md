# Data Model: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

## 1. `@gi/presets` Settings & Resolution Types (`packages/presets/src/settings.ts`)

```ts
export type MemberBuildMode = 'owned' | 'tc'
export type MemberBuildModesMap = Record<string, MemberBuildMode>

export interface ResolvedMemberBuild {
  characterKey: string
  mode: MemberBuildMode
  ownedInGood: boolean
  forcedSimulated: boolean
}
```

- `OptimizerSettings.memberBuildModes?: Record<string, MemberBuildModesMap>`:
  Maps `presetId -> { [characterKey]: 'owned' | 'tc' }`. Persisted in `localStorage` under `gi_optimizer_settings_v1`.

## 2. `@gi/engine` Selection & Session Options (`packages/engine/src/types.ts`)

- `BuildSelection.memberBuildModes?: Record<string, 'owned' | 'tc'>`:
  Optional per-character build mode map for non-target members (`i > 0`) of official presets during `session.evaluate(preset, selection)` and `session.exportGODatabase(preset, selection)`.
- `EngineSession.optimize(preset, settings, opts)`:
  `opts.memberBuildModes?: Record<string, 'owned' | 'tc'>` (falling back to `settings.memberBuildModes?.[preset.id]`).
