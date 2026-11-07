# Feature Specification: Official Preset Target Weapon Picker (`official-preset-weapon-picker`)

**Feature Branch**: `main`  
**Created**: 2026-11-08  
**Status**: Draft  
**Input**: User request:
> Feature: official-preset-weapon-picker
>
> On official presets the target's weapon cannot be changed: the weapon picker and override path are Akasha-only, and the run always uses the owned character's equipped weapon (or the sim build's authored weapon). Give official presets the same target weapon picker as Akasha presets:
> - Any weapon of the target's weapon type can be chosen, owned or simulated (level/ascension/refinement set the same way as the Akasha picker), and the optimizer re-optimizes artifacts for the chosen weapon. The Current build row uses the chosen weapon too, so the baseline stays honest.
> - Defaults are unchanged: no explicit choice means the owned target keeps its equipped weapon, and a sim-toggled target keeps the preset's authored weapon.
> - Teammates are unaffected — their weapons remain part of their owned/sim builds. Akasha behaviour and all golden fixtures unchanged.
>
> Commit: feat: official-preset-weapon-picker

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose Any Weapon for Official Preset Target (Priority: P1)

When optimizing an official preset in Single Weapon mode, the user can select any weapon matching the target character's weapon type (owned or simulated) and set its refinement (`R1..R5`, or `R1` for 1★–2★ weapons, with level/ascension set to `90/6` or `70/4` the same way as the Akasha picker). Both the Current build baseline evaluation and the optimizer solver run use the chosen weapon so the Current vs. Optimized comparison remains apples-to-apples.

**Why this priority**: Previously, official presets locked the target to the character's equipped GOOD weapon with no way to test or optimize artifacts for another weapon in Single Weapon mode.

**Independent Test**: Load `official/furina-salon-subdps` on the Optimize page, select a different sword and refinement in the target weapon picker, and verify that both the Current build evaluation and the optimizer solver run receive the chosen `weaponOverride` spec and produce different totals/stats while keeping teammates' builds untouched.

**Acceptance Scenarios**:

1. **Given** an official preset is active in Single Weapon mode, **When** the Optimize page renders with no explicit weapon selection, **Then** the target weapon picker displays the target's default weapon (the owned target's equipped GOOD weapon, or the preset's authored weapon when the target is simulated) and no `weaponOverride` is forced on the default run.
2. **Given** an official preset is active, **When** the user chooses any weapon of the target's weapon type (owned or unowned) or changes its refinement in the picker, **Then** both the Current build evaluation and the optimizer run use `weaponOverride` with level/ascension/refinement set the same way as the Akasha picker (`Lv.90/A6/R1..R5`, or `Lv.70/A4/R1` for 1★–2★).
3. **Given** a target whose build is simulated (`tc` build or sim-toggled target) with no explicit weapon choice, **When** evaluated or optimized, **Then** the target keeps the preset's authored weapon.

---

### User Story 2 - Teammates, Akasha Presets & Golden Fixtures Unchanged (Priority: P1)

Selecting or resetting the target weapon on an official preset never alters teammates' weapons or build modes, and Akasha presets and all golden fixtures remain byte-identical.

**Why this priority**: Preserves calculation fidelity and backward compatibility across all presets.

**Independent Test**: Run golden fixture verification and unit tests confirming teammates keep their owned/simulated weapons and default official preset evaluations match their golden fixtures.

**Acceptance Scenarios**:

1. **Given** an official preset with owned and/or simulated teammates, **When** the target weapon is overridden, **Then** teammates' weapons and conditionals remain governed solely by their own owned/simulated builds.
2. **Given** all bundled Akasha and Official presets with default settings, **When** evaluated against the golden fixture suite, **Then** every golden fixture remains byte-identical.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Optimize page MUST render the target weapon picker (`WeaponBadge`, `Weapon Refinement` selector, and `WeaponTilePicker` with all weapons of the target's weapon type) for official presets (`activePreset.source === 'official'`) just like Akasha presets.
- **FR-002**: When no explicit weapon choice is set for an official preset, the target MUST use its default weapon: the owned target's equipped weapon in GOOD (at its actual GOOD level/ascension/refinement), or the preset's authored weapon when the target is in simulated (`tc` / `fixed`) mode.
- **FR-003**: When the user chooses a weapon or refinement in the target weapon picker on an official preset, `weaponOverride` (`SimulatedWeaponSpec` with `level: 90` / `ascension: 6` / `refinement: 1..5`, or `70` / `4` / `1` for 1★–2★) MUST be passed to both the Current build evaluation and the optimizer solver (`optimizePresetInWorker`, `optimizeTeamInWorker`, and `exportGODatabaseInWorker`), as well as `ConditionalTogglePanel`'s `activeTargetWeaponKey`.
- **FR-004**: Users MUST be able to reset an explicit target weapon override on an official preset back to the default weapon.
- **FR-005**: In `@gi/engine` (`resolveFixedTargetOverrides`, `hydratePresetTeam`, `resolveEffectiveTeamConditionals`, `computeDefaultMemberConditionals`), a simulated (`tc`) target with no explicit `weaponOverride` MUST keep its authored `tc.weapon`, while an explicit `weaponOverride` overrides the target's weapon without affecting any teammates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Official presets expose the target weapon picker in Single Weapon mode and re-evaluate Current + re-optimize builds when a weapon or refinement is chosen.
- **SC-002**: Default evaluations and golden fixtures for all bundled Akasha and Official presets remain 100% unchanged.

## Assumptions

- When the user clicks a weapon tile on an official preset for the first time, the picker preserves the currently displayed refinement (clamped to `R1` for 1★–2★ weapons), matching the Akasha weapon picker's behaviour.
- A `"Reset to Default"` button is shown in the official preset weapon picker header whenever an explicit weapon/refinement override is active for that preset.
