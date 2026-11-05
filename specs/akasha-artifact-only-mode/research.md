# Phase 0 Research: Akasha Artifact-Only Mode (`akasha-artifact-only-mode`)

## 1. Fixed Target Character & Simulated Weapon in GO (`useTeamData.ts`)

- **Decision**: Drive fixed target character stats (`level`, `ascension`, `constellation`, `talent`) and simulated weapon stats (`key`, `level`, `ascension`, `refinement`) through Genshin Optimizer's native `overrideWeapon` and `overrideChar` parameters on `getTeamData` and `getTeamDataCalc` (`vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData.ts`, lines 135–266).
- **Rationale**: In `useTeamData.ts`, `getTeamData(database, teamId, activeTeamCharId, mainStatAssumptionLevel, overrideArt, overrideWeapon, overrideChar)` checks `if (overrideChar && isActiveTeamChar) char = overrideChar` and `if (overrideWeapon && isActiveTeamChar) return overrideWeapon`, while still reading equipped artifacts from `database.teams.getLoadoutArtifacts(loadoutDatum)` when `overrideArt` is undefined. This guarantees 100% GO formula fidelity and complete invariance to `db.chars.get(targetKey)`'s level, constellation, talents, or equipped weapon in the user's GOOD payload, without mutating `baseDb.chars` or `baseDb.weapons` across session evaluations.
- **Alternatives considered**:
  - Using `buildType: 'tc'` on `team[0]`: Rejected because in `useTeamData.ts` (line 220), `buildType === 'tc'` forces `arts` to `getBuildTcArtifactData(...)` when `overrideArt` is undefined, bypassing the user's equipped GOOD artifacts during default evaluation.
  - Mutating `baseDb.chars` in-place inside `createSession`: Rejected because a single `EngineSession` evaluates both Akasha presets (`fixed`) and Official/User presets (`owned`) for the same character; mutating `baseDb.chars` would corrupt subsequent `owned` evaluations. (For standalone GO export in `hydrateTeamIntoDb`, writing the fixed character and simulated weapon into the fresh export `ArtCharDatabase` is safe and desired so `exportGODatabase` round-trips cleanly.)

## 2. Simulated Weapon Conditionals When Overriding Weapons

- **Decision**: In `hydratePresetTeam(db, preset, weaponOverrideKey?)` (`packages/engine/src/session.ts`), determine the effective weapon key (`weaponOverrideKey ?? (member.build.type === 'fixed' ? member.build.weapon.key : undefined)`). If `effectiveWeaponKey` is present and `member.conditional[effectiveWeaponKey]` is not already explicitly set in the preset, inspect `getWeaponSheet(effectiveWeaponKey)?.document` and populate `conditional[effectiveWeaponKey][condKey]` with the last declared state key (`Object.keys(states).at(-1)`, which in GO weapon sheets is `'on'` or maximum stacks such as `'3'` or `'2'`). Include `weaponOverrideKey` in `presetTeamFingerprint` so changing the weapon re-hydrates `teamChar.conditional`.
- **Rationale**: Bundled Akasha presets explicitly specify conditionals for their default weapon (e.g. `SplendorOfTranquilWaters`, `StaffOfHoma`, `StaffOfTheScarletSands`). When a user selects a different weapon in the free weapon selector (e.g. `MistsplitterReforged`, `TomeOfTheEternalFlow`, `SacrificialJade`, `EngulfingLightning`, `CrimsonMoonsSemblance`), GO weapon sheets gate their conditional passives on `input.conditional[weaponKey][condKey]`. Auto-activating the weapon sheet's default active state when not overridden by the preset ensures non-default weapons apply their full GO passive and refinement scaling out of the box.
- **Alternatives considered**: Leaving `conditional[weaponKey]` empty for non-default weapons — rejected because weapons whose entire refinement passive is inside a conditional block (e.g. `SacrificialJade`, `CrimsonMoonsSemblance`) would show zero passive change between R1 and R5.

## 3. Simulated Weapon Level & Ascension Clamping

- **Decision**: Construct the simulated `ICachedWeapon` using GO's `validateWeaponLevelAsc` (`@genshin-optimizer/gi/consts`) and weapon rarity from `getWeaponStat(key)` (or `getWeaponMeta(key).rarity`), defaulting `level` to `90` and `ascension` to `6` (`70` / `4` for 1★ and 2★ weapons).
- **Rationale**: Prevents out-of-bounds curve lookups on 1★/2★ weapons (`DullBlade`, `SilverSword`, etc.) while keeping all 3★–5★ weapons at Lv. 90 Ascension 6 unless overridden.

## 4. Weapon Catalog Helper (`listWeaponsForType`)

- **Decision**: Export `listWeaponsForType(weaponType: IdentifierWeaponType): WeaponMeta[]` from `packages/presets/src/metadata.ts` (and re-export from `packages/presets/src/index.ts`). It iterates `ALL_WEAPON_KEYS`, excludes `QuantumCatalyst` (GO's non-standard April Fools entry), maps each key via `getWeaponMeta(key)`, filters by `meta.weaponType === weaponType`, and sorts by `rarity` descending (`5 → 1`) then `displayName` ascending.
- **Rationale**: Uses `@gi/presets`'s existing metadata layer (compatible with `loading-and-bundle`'s `statMeta` isolation) and requires zero inventory lookups.

## 5. Preserving Official/User Matching & Converting Akasha Presets on Fork/Import

- **Decision**:
  - In `packages/presets/src/schema.ts`, add `fixedBuildSchema` (`{ type: 'fixed', character, weapon }`) to `teamMemberSchema.shape.build` and update `presetSchema.superRefine` so `source === 'akasha'` requires `team[0].build.type === 'fixed'` and `source !== 'akasha'` requires `team[0].build.type === 'owned'`.
  - In `packages/presets/src/match.ts`, return `{ presetId: preset.id, canRun: true, parts: [] }` immediately when `preset.source === 'akasha'`.
  - In `packages/presets/src/userPreset.ts`, update `forkPresetToUser` and `parsePresetJson` so converting an Akasha preset into a User preset rewrites `team[0].build` to `{ type: 'owned' }` while keeping `team[1..3]` as `{ type: 'tc', tc }`.
- **Rationale**: Satisfies Requirements 1, 2, and 5 with strict Zod schema guarantees at compile and parse time.
