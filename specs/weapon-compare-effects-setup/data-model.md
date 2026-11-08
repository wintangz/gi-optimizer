# Data Model: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

## 1. Per-Candidate Spec (`@gi/presets` & `@gi/engine`)

```ts
export interface WeaponCompareCandidateSpec {
  /** Weapon key from GO consts (e.g. 'SplendorOfTranquilWaters', 'FavoniusSword') */
  weaponKey: string
  /** Weapon level (1..90, or 1..70 for 1★–2★) */
  level: number
  /** Weapon ascension (0..6, or 0..4 for 1★–2★) */
  ascension: number
  /** Weapon refinement (1..5, or 1 for 1★–2★) */
  refinement: number
  /** Whether this weapon is owned in the user's GOOD inventory */
  isOwned?: boolean
  /** Owned weapon ID in GOOD if owned */
  ownedWeaponId?: string
  /** Whether this weapon is currently equipped on the target character in GOOD */
  isEquippedBaseline?: boolean
  /**
   * Per-candidate target conditional overrides (`Record<sheetKey, Record<condKey, stateValue>>`)
   * covering the candidate weapon's passive conditionals, target character/constellation
   * conditionals, and target artifact-set conditionals.
   */
  targetConditionals?: MemberConditionalsMap
  /**
   * Snapshot of the target conditional overrides seeded from the Buffs & Passives panel
   * when the candidate was added.
   */
  seededTargetConditionals?: MemberConditionalsMap
}
```

`WeaponCompareCandidate` in `@gi/engine` is unified with `WeaponCompareCandidateSpec`.

## 2. `OptimizerSettings` Extension (`@gi/presets`)

```ts
export interface OptimizerSettings {
  // ... existing fields ...
  /**
   * Per-preset weapon comparison candidate list (including per-candidate `targetConditionals`
   * and `seededTargetConditionals`), keyed by `[presetId]`.
   */
  weaponCompareCandidatesByPreset?: Record<string, WeaponCompareCandidateSpec[]>
}
```

### Settings Helpers (`packages/presets/src/settings.ts`)

- `getPresetWeaponCompareCandidates(settings, presetId): WeaponCompareCandidateSpec[] | undefined`
- `setPresetWeaponCompareCandidates(settings, presetId, candidates): OptimizerSettings`
- `resetPresetWeaponCompareCandidates(settings, presetId): OptimizerSettings`
- `seedCandidateTargetConditionals(targetOverrides, candidateWeaponKey, allWeaponKeys?): MemberConditionalsMap`
- `resolveCandidateMemberConditionals(targetCharKey, candidate, sharedMemberConditionals?): PresetMemberConditionalOverrides | undefined`

## 3. UI Diff Model (`apps/web/src/components/ConditionalTogglePanel.tsx`)

```ts
export interface CandidateEffectDiff {
  sheet: string
  key: string
  sheetName: string
  condLabel: string
  currentValue: string
  seededValue: string
  currentStateLabel: string
  seededStateLabel: string
  summary: string
}
```
