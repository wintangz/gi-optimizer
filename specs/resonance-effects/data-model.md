# Data Model: Per-Effect Elemental Resonance Controls (`resonance-effects`)

## Entities & Types

### 1. Resonance Keys & Descriptors (`packages/presets/src/settings.ts`)

```ts
export const RESONANCE_EFFECT_KEYS = [
  'ProtectiveCanopy',
  'FerventFlames',
  'SoothingWater',
  'ShatteringIce',
  'HighVoltage',
  'ImpetuousWinds',
  'EnduringRock',
  'SprawlingGreenery',
] as const

export type ResonanceEffectKey = (typeof RESONANCE_EFFECT_KEYS)[number]

export type ResonanceEffectsStateMap = Partial<
  Record<ResonanceEffectKey, boolean>
>

export interface TriggeredResonanceDescriptor {
  key: ResonanceEffectKey
  element: IdentifierElement | 'all'
  /** Exact name from vendored GO elementalResonance_gen.json (e.g. "Shattering Ice", "Soothing Water"). */
  name: string
  /** Exact description from vendored GO elementalResonance_gen.json. */
  desc: string
  /** Plain-language summary line stating what the resonance gives and any secondary condition. */
  plainSummary: string
  /** Secondary trigger condition text when applicable (Cryo Frozen/Cryo, Geo shield/Moondrifts, Dendro reactions). */
  conditionText?: string
  /** GO teamConditional.resonance keys associated with this resonance's secondary triggers, if any. */
  triggerConditionalKeys: readonly string[]
}
```

### 2. `OptimizerSettings` (`packages/presets/src/settings.ts`)

```ts
export interface OptimizerSettings {
  // ...existing fields...
  resonanceEnabledByPreset?: Record<string, boolean>
  resonanceEnabled?: boolean
  /**
   * Per-preset, per-effect Elemental Resonance on/off overrides (`[presetId][effectKey] => boolean`).
   * Defaults to `true` (ON) for every effect when omitted. Applied only while that resonance is
   * triggered by the team composition.
   */
  resonanceEffectsByPreset?: Record<string, ResonanceEffectsStateMap>
  /**
   * Optional run-level per-effect Elemental Resonance overrides (`[effectKey] => boolean`).
   */
  resonanceEffects?: ResonanceEffectsStateMap
}
```

### 3. `BuildSelection` (`packages/engine/src/types.ts`)

```ts
export interface BuildSelection {
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  artifactIds: Partial<Record<ArtifactSlot, string>>
  memberBuildModes?: Record<string, MemberBuildMode>
  memberConditionals?: PresetMemberConditionalOverrides
  resonanceEnabled?: boolean
  /** Optional per-effect Elemental Resonance overrides (`false` disables that specific resonance). */
  resonanceEffects?: ResonanceEffectsStateMap
  fastMode?: PresetFastModeMap
}
```
