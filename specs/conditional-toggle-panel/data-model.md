# Data Model: Team-Wide Conditional Buffs & Passives Toggle Panel (`conditional-toggle-panel`)

## 1. Enriched `ConditionalDescriptor` (`packages/engine/src/types.ts`)

```ts
export type ConditionalSourceCategory =
  | 'weapon'
  | 'artifact'
  | 'character'
  | 'constellation'

export interface ConditionalDescriptor {
  sheet: string
  key: string
  name: string
  states: ConditionalStateDescriptor[]
  canShow: boolean
  isTeamBuff?: boolean
  category?: ConditionalSourceCategory
  section?: string
}
```

## 2. Per-Member Conditional Overrides (`packages/presets/src/settings.ts`)

```ts
export type MemberConditionalsMap = Record<string, Record<string, string>>
export type PresetMemberConditionalOverrides = Record<
  string,
  MemberConditionalsMap
>
```

- `OptimizerSettings.memberConditionalOverrides?: Record<string, PresetMemberConditionalOverrides>`:
  Keyed by `[presetId][characterKey][sheetKey][condKey]`. Value is either an active state key (e.g. `'on'`, `'3'`, `'200'`, `'hydro'`) or `'off'` when explicitly disabled by the user.

## 3. Engine Selection & Optimize Options (`packages/engine/src/types.ts`)

- `BuildSelection.memberConditionals?: PresetMemberConditionalOverrides`
- `EngineSession.optimize` `opts.memberConditionals?: PresetMemberConditionalOverrides`
