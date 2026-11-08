# Data Model: Master Elemental Resonance Toggle (`resonance-master-toggle`)

## Entities & Types

### 1. `OptimizerSettings` (`packages/presets/src/settings.ts`)

```ts
export interface OptimizerSettings {
  // ...existing fields...
  /**
   * Per-preset master Elemental Resonance on/off override (`[presetId] => boolean`).
   * Defaults to `true` (ON) when omitted or undefined. When `false` (OFF), all elemental
   * resonances are suppressed for the preset without mutating bundled preset data or
   * individual trigger conditional overrides.
   */
  resonanceEnabledByPreset?: Record<string, boolean>
  /**
   * Optional run-level master Elemental Resonance override (`true` = ON, `false` = OFF).
   * Used when `resonanceEnabledByPreset[presetId]` is not set.
   */
  resonanceEnabled?: boolean
}
```

### 2. Helper Functions (`packages/presets/src/settings.ts`)

- `getPresetResonanceEnabled(settings, presetId): boolean`
  - Checks `settings?.resonanceEnabledByPreset?.[presetId]`.
  - If `presetId` contains `'__member_'`, falls back to `settings?.resonanceEnabledByPreset?.[rootPresetId]`.
  - Falls back to `settings?.resonanceEnabled` if boolean, else `true`.
- `setPresetResonanceEnabled(settings, presetId, enabled): OptimizerSettings`
  - Returns a new `OptimizerSettings` with `resonanceEnabledByPreset[presetId] = enabled`.
- `resetMemberConditionalOverrides(settings, presetId, characterKey?)`:
  - When `characterKey` is omitted (resetting all Buffs & Passives overrides for `presetId`), also removes `presetId` from `resonanceEnabledByPreset`.

### 3. `BuildSelection` (`packages/engine/src/types.ts`)

```ts
export interface BuildSelection {
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  artifactIds: Partial<Record<ArtifactSlot, string>>
  memberBuildModes?: Record<string, MemberBuildMode>
  memberConditionals?: PresetMemberConditionalOverrides
  /** Optional master Elemental Resonance on/off override (default: true). */
  resonanceEnabled?: boolean
}
```
