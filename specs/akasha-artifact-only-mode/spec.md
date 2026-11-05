# Feature Specification: Akasha Artifact-Only Mode

**Feature Branch**: `akasha-artifact-only-mode`

**Created**: 2026-11-05

**Status**: Ready for Planning

**Input**: User description: "Akasha presets (`source === 'akasha'`) must work like Akasha itself, superseding account-matching behaviour for Akasha presets only: (1) NO account gate for Akasha presets (`matchAccount` returns `canRun: true, parts: []`); (2) Target character (`team[0]`) is a fixed simulated build defined by the preset (`{ type: 'fixed', character: { level, ascension, constellation, talent }, weapon: { key, level, ascension, refinement } }`) so the user's own character level, talents, constellation, or absence in GOOD has zero effect on numbers; (3) Weapon is the user's free choice (`listWeaponsForType(weaponType)`, R1–R5, defaulting to `team[0].build.weapon`), applied as a simulated weapon with its GO conditionals regardless of inventory ownership; (4) Only user artifacts are used for optimization and for optional current-build comparison (omitting current build when unowned or unequipped); (5) Official and user presets keep `team[0].build.type === 'owned'` and `matchAccount`, and forking/importing an Akasha preset into a user preset converts `team[0].build` to `{ type: 'owned' }` while keeping `team[1..3]` as `{ type: 'tc', tc }`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluate and optimize any Akasha preset using only imported artifacts with a fixed simulated target character (Priority: P1)

A player who has imported a GOOD file containing artifacts selects any Akasha leaderboard preset (`source === 'akasha'`). Even if the player does not own the target character, has the target character at Lv. 1 C0 with talents 1/1/1, or does not own the leaderboard weapon, the preset is immediately runnable with no account gate. The engine evaluates and optimizes the preset using the preset's fixed target character specification (`level`, `ascension`, `constellation`, `talent`) and simulated weapon alongside the preset's fixed `tc` teammates. Two players with identical artifact pools receive identical damage evaluations and optimal builds regardless of their character or weapon roster. If the player does not own the target character or has no artifacts equipped on that character in GOOD, `/optimize` displays the optimized build without a current-build comparison column instead of blocking.

**Why this priority**: This is the core behavioral shift of Akasha Artifact-Only Mode: Akasha leaderboards rank a player's artifact quality under standardized character, talent, constellation, weapon, and team assumptions rather than gating on or scaling with the player's scanned character investment.

**Independent Test**: Run `matchAccount`, `session.evaluate`, and `session.optimize` against (a) two GOOD payloads with identical artifacts but different target-character constellation/level/talents/weapon ownership and (b) a GOOD payload where the target character is completely absent from `characters` and `weapons`, verifying `canRun: true` and bit-for-bit identical evaluation and optimization results.

**Acceptance Scenarios**:

1. **Given** any preset with `source === 'akasha'`, **When** `matchAccount(preset, account)` is called for any account (including an account with zero characters and zero weapons), **Then** it returns `{ presetId: preset.id, canRun: true, parts: [] }`.
2. **Given** two GOOD files with identical `artifacts` arrays where File A has the target character at Lv. 90 C6 talents 10/10/10 with a 5★ R5 weapon equipped and File B has the target character at Lv. 1 C0 talents 1/1/1 with a 1★ R1 weapon equipped, **When** `session.evaluate` and `session.optimize` run for an Akasha preset with the same chosen weapon, **Then** both files produce identical per-hit damage, rotation totals, final stats, and ranked optimal artifact builds.
3. **Given** a GOOD file where the target character does not exist in `characters` and has no weapons in `weapons`, **When** `session.evaluate` and `session.optimize` run on an Akasha preset for that character, **Then** both succeed using the preset's fixed target character and simulated weapon.
4. **Given** a GOOD file where the target character is unowned or has zero equipped artifacts (`Object.keys(currentBuild.artifactIds).length === 0`), **When** the player opens `/optimize` with an Akasha preset and runs optimization, **Then** `/optimize` never blocks and renders the optimized build results without a current-build comparison column.

---

### User Story 2 - Freely choose any weapon of the target character's weapon type and refinement R1–R5 on Akasha presets (Priority: P1)

When viewing an Akasha preset on `/presets` or `/optimize`, the player sees a weapon selector listing every weapon matching the target character's weapon type (`sword`, `claymore`, `polearm`, `bow`, `catalyst`) and a refinement selector for `R1`–`R5`, defaulting to the weapon and refinement specified in `team[0].build.weapon` of the Akasha preset. The player can pick any weapon and refinement regardless of whether that weapon exists in their imported GOOD inventory. Selecting a weapon and refinement on `/presets` carries over when clicking "Optimize with this Preset →" to `/optimize`, and changing the weapon or refinement on `/optimize` re-evaluates and optimizes using that simulated weapon (including its Genshin Optimizer weapon sheet passives and active conditionals) on the fixed target character.

**Why this priority**: Akasha leaderboards let players inspect and optimize their artifacts across different weapon and refinement brackets without requiring the player to own the weapon in-game.

**Independent Test**: Call `listWeaponsForType(weaponType)` to verify all weapons of that class are returned; evaluate and optimize an Akasha preset with `weaponOverride` set to a weapon absent from the GOOD file at R1 vs. R5 and vs. another weapon, verifying damage and stats change according to GO's weapon sheets.

**Acceptance Scenarios**:

1. **Given** an Akasha preset whose target character uses a sword (e.g. Furina), **When** the player opens the preset on `/presets` or `/optimize`, **Then** the weapon selector lists all swords (`listWeaponsForType('sword')`) and refinements `R1`–`R5`, pre-selecting `team[0].build.weapon.key` and `team[0].build.weapon.refinement`.
2. **Given** a GOOD file that does not contain `SplendorOfTranquilWaters` or `KeyOfKhajNisut`, **When** `session.evaluate` or `session.optimize` is called on an Akasha Furina preset with `weaponOverride: { key: 'SplendorOfTranquilWaters', refinement: 1 }` vs. `{ key: 'SplendorOfTranquilWaters', refinement: 5 }` vs. `{ key: 'KeyOfKhajNisut', refinement: 1 }`, **Then** each evaluation and optimization uses the simulated weapon at Lv. 90 Ascension 6 (clamped to weapon rarity max) with its GO weapon conditionals active and produces distinct, accurate damage totals.
3. **Given** a player selects a non-default weapon and refinement on `/presets` for an Akasha preset and clicks "Optimize with this Preset →", **When** `/optimize` loads, **Then** `/optimize` initializes with that chosen weapon and refinement.

---

### User Story 3 - Preserve owned-character matching for Official and User presets and convert Akasha presets cleanly on fork/import (Priority: P2)

Official presets (`source === 'official'`) and custom User presets (`source === 'user'`) continue to use `team[0].build = { type: 'owned' }` and check the player's scanned character and weapon inventory via `matchAccount`. When a player duplicates/forks an Akasha preset (`forkPresetToUser` or `/teams?fork=`) or imports an Akasha preset JSON file (`parsePresetJson`), `team[0].build` is automatically converted from `{ type: 'fixed', ... }` to `{ type: 'owned' }` while `team[1..3]` remain `{ type: 'tc', tc }`, producing a valid User preset. All 5 bundled Akasha presets (`packages/presets/data/akasha/*.json`) use `{ type: 'fixed', character, weapon }` on `team[0].build` and have re-captured GO golden fixtures passing `golden.test.ts`.

**Why this priority**: Ensures Akasha Artifact-Only Mode does not regress Official or User presets, keeps the `/teams` fork/import workflow seamless, and maintains the Constitution's mandatory GO golden-fixture verification.

**Independent Test**: Validate all 11 bundled presets (`5 akasha + 6 official`), verify `forkPresetToUser` and `parsePresetJson` convert Akasha `team[0].build` to `{ type: 'owned' }` while keeping `team[1..3]` as `{ type: 'tc', tc }`, and run `packages/engine/test/golden.test.ts`.

**Acceptance Scenarios**:

1. **Given** an Official or User preset (`source === 'official' | 'user'`), **When** validated and matched via `matchAccount`, **Then** `team[0].build.type` must be `'owned'` and `matchAccount` enforces character ownership, constellation, level, talent, weapon, and refinement requirements exactly as before.
2. **Given** an Akasha preset with `team[0].build.type === 'fixed'` and `team[1..3]` with `build.type === 'tc'`, **When** passed to `forkPresetToUser` or `parsePresetJson`, **Then** the resulting User preset has `source === 'user'`, `team[0].build` equal to `{ type: 'owned' }`, and `team[1..3]` preserving `{ type: 'tc', tc }`.
3. **Given** the 5 bundled Akasha presets updated to `team[0].build = { type: 'fixed', character, weapon }`, **When** `capture-golden.ts` and `golden.test.ts` are run, **Then** every bundled preset matches GO's direct `getTeamDataCalc` within relative error ≤ 0.1% and round-trips through `exportGODatabase`.

### Edge Cases

- **Target character absent from GOOD `characters` and `weapons`**: `session.currentBuild(preset)` returns `{ weaponOverride: preset.team[0].build.weapon, artifactIds: {} }`; `session.evaluate` and `session.optimize` succeed without throwing; `/optimize` omits the current-build comparison column and shows only the optimized build.
- **Target character owned in GOOD with a weapon equipped**: For an Akasha preset, the character's GOOD level, ascension, constellation, talents, and equipped weapon are completely ignored; only the artifacts equipped on that character in GOOD are used as `currentBuild.artifactIds` for the optional "Current Build vs. Optimised Build" comparison.
- **User selects a 1★ or 2★ weapon in the free weapon selector**: Simulated weapon level and ascension are clamped to the weapon rarity's maximum in Genshin Impact (`Lv. 70 / Ascension 4` for 1★–2★; `Lv. 90 / Ascension 6` for 3★–5★) using GO's `validateWeaponLevelAsc`.
- **User selects a weapon with conditional passives not listed in `preset.team[0].conditional`**: The engine automatically enables the weapon sheet's default active (max-stack / `'on'`) conditional states from GO's `getWeaponSheet(weaponKey)` so conditional weapon passives take effect without manual conditional editing; if `preset.team[0].conditional[weaponKey]` is already defined by the preset, the preset's explicit conditional values take precedence.
- **"Verify in GO" (`exportGODatabase`) on an Akasha preset**: Writes the fixed character specification and chosen simulated weapon into the exported standalone `ArtCharDatabase` so importing the `.json` into Genshin Optimizer reproduces the exact rotation numbers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `teamMemberSchema` in `packages/presets/src/schema.ts` MUST support a third discriminated union variant on `build`: `{ type: 'fixed', character: { level, ascension, constellation, talent: { auto, skill, burst } }, weapon: { key, level, ascension, refinement } }`.
- **FR-002**: `presetSchema` and `validatePreset` MUST enforce that presets with `source === 'akasha'` use `team[0].build.type === 'fixed'` (with `team[0].build.weapon.key` matching the target character's weapon type and `team[1..3]` using `build.type === 'tc'`), while presets with `source === 'official'` or `source === 'user'` MUST use `team[0].build.type === 'owned'`.
- **FR-003**: All 5 bundled Akasha presets (`packages/presets/data/akasha/*.json`) MUST define `team[0].build` as `{ type: 'fixed', character: { level: 90, ascension: 6, constellation: <case>, talent: { auto: 10, skill: 10, burst: 10 } }, weapon: { key: <case>, level: 90, ascension: 6, refinement: <case> } }` and `team[0].requirement` as `{}`.
- **FR-004**: `matchAccount(preset, account, opts)` MUST immediately return `{ presetId: preset.id, canRun: true, parts: [] }` when `preset.source === 'akasha'`, while preserving full requirement matching for `official` and `user` presets.
- **FR-005**: `@gi/presets` MUST export `listWeaponsForType(weaponType: IdentifierWeaponType): WeaponMeta[]` returning all weapons of that weapon type (sorted by rarity descending, then display name ascending) without consulting user inventory.
- **FR-006**: `BuildSelection` and `EngineSession.optimize` options in `@gi/engine` (and worker messages in `apps/web`) MUST accept `weaponOverride?: SimulatedWeaponSpec` (`{ key: string, level?: number, ascension?: number, refinement: number }`).
- **FR-007**: When evaluating (`session.evaluate`), optimizing (`session.optimize`), or exporting (`session.exportGODatabase`) a preset where `team[0].build.type === 'fixed'`, the engine MUST use `team[0].build.character` for the target character's level, ascension, constellation, and talents and `selection?.weaponOverride ?? opts?.weaponOverride ?? team[0].build.weapon` as a simulated weapon (with its GO weapon sheet conditionals active), completely ignoring the user's GOOD character stats and weapon inventory.
- **FR-008**: For Akasha presets, `/presets` and `/optimize` MUST replace the account-matching gate with an Akasha fixed-build summary and a free-choice Weapon (`listWeaponsForType`) + Refinement (`R1`–`R5`) selector defaulting to `team[0].build.weapon`, and `/optimize` MUST display optimized results without a current-build comparison when `Object.keys(currentBuild.artifactIds).length === 0`.
- **FR-009**: `forkPresetToUser` and `parsePresetJson` MUST convert `team[0].build` to `{ type: 'owned' }` when converting an Akasha preset into a User preset while preserving `team[1..3]` as `{ type: 'tc', tc }`.
- **FR-010**: The 5 Akasha golden fixtures (`packages/engine/test/golden/akasha__*.json`) MUST be re-captured from GO's direct `getTeamDataCalc` under the fixed-build model so `golden.test.ts` passes within ≤ 0.1% relative error.

### Key Entities

- **FixedTargetBuild (`FixedBuild`)**: `{ type: 'fixed', character: { level, ascension, constellation, talent: { auto, skill, burst } }, weapon: { key, level, ascension, refinement } }` stored on `team[0].build` of Akasha presets.
- **SimulatedWeaponSpec**: `{ key: string, level?: number, ascension?: number, refinement: number }` passed via `BuildSelection.weaponOverride` or `optimize(..., { weaponOverride })` to evaluate or optimize with any weapon and refinement.
- **WeaponMeta**: Metadata descriptor returned by `listWeaponsForType(weaponType)` (`key`, `displayName`, `weaponType`, `weaponTypeLabel`, `glyph`, `rarity`, `rarityColor`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Akasha presets return `canRun: true` and `parts: []` from `matchAccount` regardless of account contents, and are runnable on `/presets` and `/optimize` as long as a GOOD file is imported.
- **SC-002**: 0.0% difference (bit-for-bit equality) in `session.evaluate` and `session.optimize` outputs for an Akasha preset across two GOOD files with identical artifacts but different target-character levels, constellations, talents, or weapon inventories.
- **SC-003**: 100% of Akasha presets evaluate and optimize when the target character is completely absent from `good.characters` and `good.weapons`.
- **SC-004**: 100% of bundled Akasha and Official presets pass `golden.test.ts` within ≤ 0.1% relative error against GO's `getTeamDataCalc`.

## Assumptions

- **AAO-1 (Standard Akasha Crowned Talents)**: The 5 bundled Akasha leaderboard presets set `team[0].build.character` to `level: 90, ascension: 6, talent: { auto: 10, skill: 10, burst: 10 }` (base talent level 10, with GO automatically adding +3 constellation talent bonuses where applicable, e.g. Furina C2), matching Akasha's standardized crowned-character baseline.
- **AAO-2 (Simulated Weapon Level & Ascension)**: Simulated weapons chosen via the free weapon selector default to `level: 90, ascension: 6` for 3★–5★ weapons and are clamped via GO's `validateWeaponLevelAsc` to `level: 70, ascension: 4` for 1★–2★ weapons.
- **AAO-3 (Weapon Conditional Activation for Non-Default Weapons)**: When the user selects the preset's default weapon (`weaponOverride.key === team[0].build.weapon.key`) or any weapon whose key already appears in `preset.team[0].conditional`, the preset's explicit conditional states for that weapon are used. When the user selects a different weapon that has conditional passives in GO's `getWeaponSheet(weaponKey).document` not explicitly configured in `preset.team[0].conditional`, the engine activates each conditional section's maximum/active state key (the last key in `states`, e.g. `'on'` or max stack count) so weapon passives function out of the box.
- **AAO-4 (Current Build Artifact Comparison)**: For an Akasha preset, `session.currentBuild(preset)` reads only the artifacts currently equipped on `preset.target` in the imported GOOD file (`artifactIds`) paired with `weaponOverride: preset.team[0].build.weapon` (or the user's selected `weaponOverride` on `/optimize`). If `Object.keys(currentBuild.artifactIds).length === 0`, `/optimize` skips the current-build comparison and shows only the optimized build once optimization finishes.
