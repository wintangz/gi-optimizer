# Feature Specification: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

**Feature Branch**: `weapon-compare-effects-setup`  
**Created**: 2026-11-08  
**Status**: Draft  
**Input**: User description: "In weapon comparison, effect settings currently follow the single primary setup: only the main weapon's passive effects can be configured, and the target's character/artifact-set conditional overrides are shared across every candidate. But each candidate is a different hypothetical build — switching the weapon changes which conditionals and interactions apply — so effect state must be per-candidate:
- Each compare candidate carries its OWN copy of the target's full conditional state: the candidate weapon's passive conditionals, the target's character/constellation conditionals, and the target's artifact-set conditionals — editable per candidate in the compare UI (an "Effects" expander on each candidate row, using the same control types as the Buffs & Passives panel).
- A candidate's state is seeded from the target's current effective panel state when the candidate is added; after that it is fully independent — editing one candidate's toggles never touches another's.
- Teammate conditionals, resonance, stat constraints, and pool settings stay shared across candidates (they do not change when the target's weapon changes).
- Each candidate whose effect state differs from the seeded panel state shows a visible "setup differs" indicator; its tooltip lists exactly which settings differ and their values, so the candidates' contexts can be compared at a glance.
- The comparison run applies each candidate's own effect state to that candidate's optimization only. Acceptance: configure candidate 2's weapon stacks AND a set conditional, re-run — candidates 1 and 3 return bit-identical totals, candidate 2's total reflects both changes.
- Per-candidate effect state persists with the compare setup like the candidate list itself, and resets with it.
- Single-weapon optimize behaviour and all existing goldens unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Per-Candidate Target Effect State in Weapon Comparison Solver & Evaluator (Priority: P1)

When comparing multiple weapons on `/optimize`, each weapon candidate represents a distinct hypothetical target build where weapon passive stacks, artifact-set conditionals (e.g., Marechaussee Hunter vs. Golden Troupe), and target character/constellation conditionals may differ. The weapon comparison engine must apply each candidate's own target conditional state during that candidate's optimization and build evaluation, while keeping teammate conditionals, elemental resonance, Fast Mode, stat constraints, and artifact pool filters shared across all candidates.

**Why this priority**: Core calculation correctness for weapon comparison; without per-candidate target conditional isolation in the engine, per-candidate UI toggles cannot affect solver rankings or totals.

**Independent Test**: Run `session.compareWeapons` with 3 candidates; modify candidate 2's weapon passive stacks AND a target artifact-set conditional, re-run, and verify that candidates 1 and 3 return bit-identical totals while candidate 2's total reflects both changes.

**Acceptance Scenarios**:

1. **Given** a 3-weapon comparison setup where Candidate 1, Candidate 2, and Candidate 3 have seeded target conditionals, **When** Candidate 2's weapon passive stacks and a target artifact-set conditional are modified on Candidate 2 and the comparison is re-run, **Then** Candidates 1 and 3 produce bit-identical totals and builds as before, while Candidate 2's total reflects both conditional changes.
2. **Given** shared teammate conditionals, elemental resonance, Fast Mode, stat constraints, and pool filters, **When** `compareWeapons` runs across candidates with differing `targetConditionals`, **Then** every candidate shares the same non-target teammate conditionals, resonance, Fast Mode, constraints, and pool filters.
3. **Given** single-weapon optimization (`session.optimize`) or existing golden tests, **When** executed, **Then** single-weapon behavior and all existing golden fixtures remain byte-identical.

---

### User Story 2 - Per-Candidate "Effects" Expander & "Setup Differs" Indicator in Compare UI (Priority: P2)

In the Weapon Comparison panel (`WeaponComparisonPanel`), each selected candidate row provides an **Effects** expander that reveals the candidate weapon's passive conditionals, the target's artifact-set conditionals, and the target's character/constellation conditionals using the same switch and state-dropdown controls as the Buffs & Passives panel. When a candidate is added, its target conditional state is seeded from the target's current effective panel state; subsequent edits to any candidate (or to the main panel) are completely independent. Whenever a candidate's effect state differs from its seeded panel state, the candidate row displays a visible **Setup differs** indicator whose tooltip lists every differing conditional and its value.

**Why this priority**: Enables users to configure and audit per-candidate hypothetical effect setups directly on each weapon row without losing track of how candidates differ.

**Independent Test**: Render `WeaponComparisonPanel` with multiple candidates, expand a candidate's **Effects** section, toggle its weapon passive and an artifact-set conditional, and verify that (1) only that candidate's `targetConditionals` changes, (2) the **Setup differs** indicator appears on that candidate only, and (3) its tooltip lists the exact modified conditionals and their values.

**Acceptance Scenarios**:

1. **Given** a newly added weapon candidate in `WeaponComparisonPanel`, **When** it is added, **Then** its `targetConditionals` and `seededTargetConditionals` are seeded from the target's current effective Buffs & Passives panel state (plus the candidate weapon's default passive state), and no **Setup differs** badge is shown.
2. **Given** multiple selected weapon candidates, **When** the user expands Candidate 2's **Effects** panel and changes a weapon stack dropdown or a character/artifact-set switch, **Then** Candidate 1 and Candidate 3's effect states are untouched, and Candidate 2 displays a visible **Setup differs** badge whose tooltip lists the differing settings and their values.
3. **Given** a candidate whose effect state has been modified from its seeded state, **When** the user clicks **Reset Effects** inside that candidate's **Effects** expander, **Then** the candidate's effect state returns to its seeded state and the **Setup differs** badge disappears.

---

### User Story 3 - Persistence & Reset of Compare Setup with Per-Candidate Effects (Priority: P3)

The weapon compare candidate list — including each candidate's level, ascension, refinement, and per-candidate `targetConditionals` / `seededTargetConditionals` — persists per preset in `OptimizerSettings` alongside other per-preset optimizer settings, and resets cleanly when the compare setup for that preset is reset or cleared.

**Why this priority**: Ensures users do not lose their per-weapon effect configurations when switching presets or reloading the page, and can reset the compare setup cleanly.

**Independent Test**: Save a preset's weapon compare candidates with custom `targetConditionals` into `OptimizerSettings`, reload/read back via `getPresetWeaponCompareCandidates`, and verify `resetPresetWeaponCompareCandidates` clears both the candidate list and per-candidate effect states.

**Acceptance Scenarios**:

1. **Given** a preset with configured weapon compare candidates and per-candidate `targetConditionals`, **When** stored in `OptimizerSettings`, **Then** both the candidate list and each candidate's effect state are preserved across preset switches and settings reloads.
2. **Given** a preset with customized compare candidates and effect states, **When** the compare setup is reset (or a candidate is removed and re-added), **Then** the candidate's effect state resets with the compare setup.

---

### Edge Cases

- **Candidate weapon has no toggleable passive (e.g., Favonius Sword)**: The candidate's **Effects** expander still allows editing the target's artifact-set, character, and constellation conditionals while showing the standard empty message (`No toggleable passive on Favonius Sword.`) under Weapon Passive.
- **Target has no equipped 2pc/4pc set in GOOD (or is an Akasha preset)**: The candidate's **Effects** expander surfaces artifact-set conditionals from equipped sets, preset-authored target sets, sets with >=2 pieces in the imported GOOD inventory, and any overridden set so the user can always configure set conditionals for candidate builds.
- **Legacy callers passing `WeaponCompareCandidate` without `targetConditionals`**: `compareWeapons` falls back to the shared `memberConditionals` for the target when `candidate.targetConditionals` is `undefined`, maintaining full backward compatibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `WeaponCompareCandidate` MUST support optional `targetConditionals?: MemberConditionalsMap` and `seededTargetConditionals?: MemberConditionalsMap` representing the target character's (`preset.target`) conditional overrides and seeded baseline for that candidate.
- **FR-002**: When a weapon candidate is added to the comparison list (or initially seeded for a preset), its `targetConditionals` and `seededTargetConditionals` MUST be seeded from the target's current effective Buffs & Passives panel state (preserving target character, constellation, and artifact-set overrides from the panel, and using the candidate weapon's default max passive states unless already overridden for that weapon).
- **FR-003**: Each candidate row in `WeaponComparisonPanel` MUST provide an **Effects** expander (`data-testid="weapon-compare-effects-toggle-<weaponKey>"`) that reveals editable controls for:
  1. The candidate weapon's passive conditionals,
  2. The target's artifact-set conditionals,
  3. The target's character passives & talents conditionals, and
  4. The target's constellation conditionals,
  using the same switch and state-select control types and human-readable labels as `ConditionalTogglePanel`.
- **FR-004**: Editing any conditional inside a candidate's **Effects** expander MUST update only that candidate's `targetConditionals`, never mutating any other candidate's state or the main Buffs & Passives panel state.
- **FR-005**: Whenever a candidate's effective target conditional state differs from its seeded panel state, the candidate row MUST display a visible **Setup differs** indicator (`data-testid="weapon-compare-setup-differs-<weaponKey>"`) whose `title` tooltip lists each differing conditional's human-readable name and current vs. seeded state value.
- **FR-006**: `compareWeapons` (and the `/optimize` weapon comparison runner) MUST apply each candidate's `targetConditionals` to `preset.target` for that candidate's solver optimization and top-build evaluations only, while keeping non-target teammate conditionals, elemental resonance, Fast Mode, stat constraints, and artifact pool filters shared across all candidates.
- **FR-007**: `OptimizerSettings` MUST persist the per-preset weapon compare candidate list (including per-candidate `targetConditionals` and `seededTargetConditionals`) under `weaponCompareCandidatesByPreset?: Record<string, WeaponCompareCandidateSpec[]>`, and resetting the compare setup MUST clear both the candidate list and per-candidate effect states.
- **FR-008**: Single-weapon optimization (`session.optimize`) and all existing golden fixtures MUST remain unchanged.

### Key Entities

- **`WeaponCompareCandidateSpec` / `WeaponCompareCandidate`**: Candidate weapon entry (`weaponKey`, `level`, `ascension`, `refinement`, `isOwned`, `ownedWeaponId`, `isEquippedBaseline`, `targetConditionals`, `seededTargetConditionals`).
- **`CandidateEffectDiff`**: Structured description of a single conditional difference between a candidate's effective state and its seeded panel state (`sheet`, `key`, `label`, `currentLabel`, `seededLabel`, `summary`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a 3-candidate weapon comparison, modifying Candidate 2's weapon passive stacks AND an artifact-set conditional and re-running produces bit-identical totals for Candidates 1 and 3 while Candidate 2's total reflects both changes.
- **SC-002**: Each candidate whose effect state differs from the seeded panel state renders the **Setup differs** indicator with a tooltip enumerating every differing conditional and its value.
- **SC-003**: Zero golden fixture diffs (`git diff packages/engine/test/golden/` is empty) and 100% of unit, integration, and UI tests pass.

## Assumptions

- **Artifact Set Conditionals Scope in Candidate Effects Expander**: Because weapon comparison searches across the user's artifact pool (where different weapons may favor different artifact sets, or where the target may have no currently equipped artifacts in Akasha mode), a candidate's **Artifact Set Effects** group includes conditionals for sets worn on the target (`>= 2` pieces), sets authored on the target in the preset, sets with `>= 2` pieces in the user's GOOD inventory (excluding sets fully excluded by the active set filter), and any set with an explicit override on the candidate.
- **Result Row Indicator**: In addition to showing the **Setup differs** indicator on the candidate configuration row in `WeaponComparisonPanel`, we also surface the **Setup differs** indicator (with the same tooltip) on the corresponding result row in `WeaponComparisonList` so users can see at a glance in the ranked results table when a weapon's score used custom effect settings.
