# Research: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

## Decision 1: How Each Candidate Carries and Seeds Its Target Conditional State

- **Decision**:
  - Extend `WeaponCompareCandidate` (and `WeaponCompareCandidateSpec` in `@gi/presets`) with:
    - `targetConditionals?: MemberConditionalsMap`
    - `seededTargetConditionals?: MemberConditionalsMap`
  - When a candidate for `weaponKey` is added (or initially seeded), `seedCandidateTargetConditionals` snapshots the target's (`preset.target` / slot 0) current conditional overrides from the Buffs & Passives panel (`settings.memberConditionalOverrides?.[preset.id]?.[preset.target]`), filtering out any weapon-sheet overrides that belong to other weapons (`sheet !== weaponKey` when `sheet` is a weapon key), and stores a deep copy in both `targetConditionals` and `seededTargetConditionals`.
  - When rendering or evaluating a candidate for `weaponKey`:
    - The candidate's baseline default map `defaultMapForCandidate` is derived for `preset.target` with `activeTargetWeaponKey = candidate.weaponKey` (via `deriveDefaultMemberConditionalsInUi` in the UI and `computeDefaultMemberConditionals` in `@gi/engine`), which automatically populates `candidate.weaponKey`'s passive conditionals at their default max state (unless authored in `preset.team[0].conditional[candidate.weaponKey]`), plus the preset's authored target character/constellation/set conditionals and default `'on'` boolean artifact-set conditionals.
    - The candidate's effective target conditional map is `applyMemberConditionalOverrides(defaultMapForCandidate, candidate.targetConditionals)`.
    - The candidate's seeded effective target conditional map is `applyMemberConditionalOverrides(defaultMapForCandidate, candidate.seededTargetConditionals ?? fallbackPanelTargetOverrides)`.
- **Rationale**:
  - Storing `targetConditionals` as a `MemberConditionalsMap` on the candidate makes it 100% compatible with `hydratePresetTeam` and `applyMemberConditionalOverrides` in `@gi/engine`.
  - Storing `seededTargetConditionals` alongside `targetConditionals` ensures that after a candidate is added, its state is completely independent of both other candidates and later edits to the main panel, while still allowing exact comparison against the seeded panel state.
  - Falling back to `fallbackPanelTargetOverrides` when `seededTargetConditionals` is omitted allows programmatic callers and unit tests to pass `{ ...candidate, targetConditionals: { ... } }` and still get accurate `Setup differs` detection.

## Decision 2: Isolating Target Conditionals per Candidate While Keeping Teammate Conditionals Shared

- **Decision**:
  - Implement `resolveCandidateMemberConditionals(targetCharKey, candidate, sharedMemberConditionals)` in `@gi/presets` (and re-export in `@gi/engine`).
  - When `candidate.targetConditionals !== undefined`, `resolveCandidateMemberConditionals` constructs a `PresetMemberConditionalOverrides` map that copies all non-target member entries (`memberKey !== targetCharKey`) from `sharedMemberConditionals` and sets `[targetCharKey]: candidate.targetConditionals`.
  - When `candidate.targetConditionals === undefined`, it returns `sharedMemberConditionals` unchanged.
  - Both `compareWeapons` in `packages/engine/src/session.ts` and `startWeaponComparison` in `apps/web/src/app/optimize/page.tsx` use `resolveCandidateMemberConditionals` for each candidate's `optimize` call and top-build `evaluate` calls.
- **Rationale**:
  - Guarantees that teammate conditionals, elemental resonance, Fast Mode, stat constraints, and pool filters stay shared across all candidates, while each candidate's optimization and build evaluations use only that candidate's target conditional state.

## Decision 3: "Setup Differs" Detection and Human-Readable Tooltip Formatting

- **Decision**:
  - Implement `computeCandidateEffectDiffs` in `apps/web/src/components/ConditionalTogglePanel.tsx`:
    - Compares `effectiveMap` (from `candidate.targetConditionals`) against `seededEffectiveMap` (from `candidate.seededTargetConditionals ?? fallbackPanelTargetOverrides`) across all relevant target sheets (`candidate.weaponKey`, target character/constellation sheets, and artifact-set sheets).
    - For each conditional `(sheet, key)` where `readEffectiveConditionalValue(effectiveMap, sheet, key) !== readEffectiveConditionalValue(seededEffectiveMap, sheet, key)`, produces a human-readable diff entry using the same label source as `ConditionalTogglePanel` (`cleanConditionalLabel`, `formatStateOptionLabel`, `STATIC_GO_CONDITIONAL_LABELS`):
      e.g. `Splendor of Tranquil Waters — After HP changes: 1 Time (seeded: 3 Times)` or `Golden Troupe — Character is off-field: Off (seeded: Active (On))`.
  - When `diffs.length > 0`, render a visible `Setup differs` badge (`data-testid="weapon-compare-setup-differs-<weaponKey>"`) on the candidate row (and on the result row in `WeaponComparisonList`) with `title={formatCandidateEffectDiffsTooltip(diffs)}`.

## Decision 4: Persistence of Compare Candidates & Per-Candidate Effect State

- **Decision**:
  - Add `weaponCompareCandidatesByPreset?: Record<string, WeaponCompareCandidateSpec[]>` to `OptimizerSettings` in `packages/presets/src/settings.ts`, with helpers `getPresetWeaponCompareCandidates`, `setPresetWeaponCompareCandidates`, and `resetPresetWeaponCompareCandidates`.
  - In `apps/web/src/app/optimize/page.tsx`, read/write the preset's compare candidate list via `settings.weaponCompareCandidatesByPreset[activePreset.id]` (with local optimistic state synced through `updateSettings`), and provide a **Reset Compare Setup** action in `WeaponComparisonPanel` that resets the candidate list and all per-candidate effect states back to the default seeded candidates.
