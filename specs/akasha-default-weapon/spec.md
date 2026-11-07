# Feature Specification: Akasha Default Weapon (`akasha-default-weapon`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: Seed Akasha (`fixed`) preset default weapon from the user's equipped weapon on the target character in GOOD when present, falling back to the preset's Akasha case weapon.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seed `session.currentBuild(preset)` from Equipped Weapon on Fixed Target (Priority: P1)

When evaluating or inspecting `session.currentBuild(preset)` for an Akasha (`fixed`) preset, if the target character exists in `baseDb` with an equipped weapon (`char?.equippedWeapon` -> `baseDb.weapons.get(char.equippedWeapon)`), `currentBuild(preset)` returns that weapon as the default `weaponOverride` (`key` and `refinement` from the equipped copy, `level`/`ascension` at simulated maximum: `70`/`4` for rarity `<= 2`, `90`/`6` for rarity `>= 3`). When the target character is absent from GOOD or has no weapon equipped, `currentBuild(preset)` returns the preset's Akasha case weapon spec.

**Independent Test**:
- Import a GOOD dataset where the target character wears a non-case weapon (e.g., Furina wearing `SplendorOfTranquilWaters` R2 on `akasha/furina-salon-pjc-c0` whose case weapon is `PrimordialJadeCutter` R1) and verify `session.currentBuild(preset).weaponOverride` has `{ key: 'SplendorOfTranquilWaters', refinement: 2, level: 90, ascension: 6 }`.
- Import a GOOD dataset where the target character is absent and verify `session.currentBuild(preset).weaponOverride` equals the preset's case weapon (`PrimordialJadeCutter` R1).

---

### User Story 2 - `/optimize` Initial Akasha Weapon Selection Follows `currentBuild()` (Priority: P1)

On `/optimize`, when an Akasha preset is selected and the user has not explicitly picked a weapon override for that preset, the initial weapon selection (displayed weapon badge, dropdown value, refinement selector, and baseline comparison) uses the target character's equipped weapon from GOOD when present, falling back to the preset's case weapon.

**Independent Test**: Verify `akashaWeaponSpec` in `apps/web/src/app/optimize/page.tsx` seeds from the target character's equipped weapon in `record.good` when present and allows explicit override via the weapon/refinement selectors or URL query params.

---

### User Story 3 - Preserve Akasha Isolation & Explicit Override Semantics (Priority: P1)

`resolveFixedTargetOverrides` fallback when no `weaponOverride` is passed to `session.evaluate(preset)` or `session.optimize(preset)` stays the preset's case weapon, explicit `weaponOverride` still wins in both `evaluate` and `optimize`, and existing `akasha-isolation` and `golden` tests pass unchanged.

**Independent Test**: Run `packages/engine/test/akasha-isolation.test.ts` and `packages/engine/test/golden.test.ts`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `packages/engine/src/session.ts`, `currentBuild(preset)` for a `fixed` target member MUST check `char?.equippedWeapon` in `baseDb.weapons` and, when present, return `{ key: equippedWeapon.key, level: isLowRarity ? 70 : 90, ascension: isLowRarity ? 4 : 6, refinement: isLowRarity ? 1 : equippedWeapon.refinement }` as `weaponOverride`.
- **FR-002**: When the target character is not in `baseDb` or has no equipped weapon in `baseDb`, `currentBuild(preset)` MUST return `targetMember.build.weapon` as `weaponOverride`.
- **FR-003**: `resolveFixedTargetOverrides` MUST keep `targetMember.build.weapon` as its fallback when `weaponOverride` is omitted, and explicit `weaponOverride` MUST override both defaults.
- **FR-004**: `apps/web/src/app/optimize/page.tsx` MUST seed the initial `akashaWeaponSpec` for an Akasha preset from the target character's equipped weapon in `record?.good` (matching `session.currentBuild(preset)`), falling back to `activePreset.team[0].build.weapon`.

## Success Criteria *(mandatory)*

- **SC-001**: Unit tests verify: (a) GOOD where target wears a non-case weapon -> `currentBuild` default is that weapon (`key` + `refinement` match equipped copy); (b) GOOD where target is absent -> default is case weapon; (c) explicit `weaponOverride` overrides the new default; (d) all existing `akasha-isolation` and `golden` tests pass unchanged.
