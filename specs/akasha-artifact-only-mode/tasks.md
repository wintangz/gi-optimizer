# Tasks: Akasha Artifact-Only Mode (`akasha-artifact-only-mode`)

**Input**: Design documents from `/specs/akasha-artifact-only-mode/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`)
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Foundational (Preset Schema, Validation, Bundled Akasha Data, Engine Types)

**Purpose**: Update the shared preset schema, validator, 5 bundled Akasha presets, and engine type definitions so all User Stories can build against the `fixed` target build and `weaponOverride` contracts.

- [x] T001 Add `fixedBuildSchema` (`{ type: 'fixed', character: { level: 1..100, ascension: 0..6, constellation: 0..6, talent: { auto: 1..15, skill: 1..15, burst: 1..15 } }, weapon: { key: weaponKey, level: 1..90, ascension: 0..6, refinement: 1..5 } }`) to `teamMemberSchema.shape.build` and update `presetSchema.superRefine` in `packages/presets/src/schema.ts` so `source === 'akasha'` requires `team[0].build.type === 'fixed'`, `source === 'official' | 'user'` requires `team[0].build.type === 'owned'`, and `team[1..3]` cannot use `build.type === 'fixed'`
- [x] T002 Update `validatePreset` in `packages/presets/src/validate.ts` to verify `member.build.weapon.key` matches the wearer's weapon type when `member.build.type === 'fixed'` and enforce `team[0].build.type === 'fixed'` (plus `team[1..3].build.type === 'tc'`) for `source === 'akasha'` instead of `team.0.requirement`
- [x] T003 [P] Convert `team[0].build` to `{ type: 'fixed', character: { level: 90, ascension: 6, constellation: <case>, talent: { auto: 10, skill: 10, burst: 10 } }, weapon: { key: <case>, level: 90, ascension: 6, refinement: <case> } }` and set `team[0].requirement` to `{}` across all 5 bundled Akasha presets in `packages/presets/data/akasha/furina-salon-pjc-c0.json`, `packages/presets/data/akasha/furina-splendor-c2.json`, `packages/presets/data/akasha/neuvillette-hypercarry-protoamber-c0.json`, `packages/presets/data/akasha/hutao-double-hydro-homa-c1.json`, and `packages/presets/data/akasha/raiden-hypercarry-scarlet-c0.json`
- [x] T004 [P] Add `SimulatedWeaponSpec` (`{ key: string, level?: number, ascension?: number, refinement: number }`) and `weaponOverride?: SimulatedWeaponSpec` to `BuildSelection` and `EngineSession.optimize` options in `packages/engine/src/types.ts`

---

## Phase 2: User Story 1 - Fixed Target Build Evaluation, Optimization & Account Gate Removal (Priority: P1) 🎯 MVP

**Goal**: Remove the account gate for `source === 'akasha'` presets and ensure `session.evaluate` and `session.optimize` use the preset's fixed target character and simulated weapon so the user's GOOD character stats or absence in GOOD have zero effect on numbers.

**Independent Test**: Run `matchAccount` on Akasha presets (returns `canRun: true, parts: []`) and run `packages/engine/test/akasha-isolation.test.ts` verifying (1) identical evaluation and optimization results across two GOOD files with different target character stats/constellations/talents/weapons and (2) successful evaluation and optimization when the target character is missing from GOOD.

### Tests for User Story 1

- [x] T005 [P] [US1] Update `packages/presets/test/schema.test.ts` and `packages/presets/test/match.test.ts` to verify that `source === 'akasha'` requires `team[0].build.type === 'fixed'` and `matchAccount(preset, account)` returns `{ presetId: preset.id, canRun: true, parts: [] }` for all Akasha presets (even on `{ characters: [], weapons: [] }`)
- [x] T006 [P] [US1] Expand `packages/engine/test/akasha-isolation.test.ts` with tests proving: (1) two GOOD files with identical `artifacts` but different target-character `constellation`/`level`/`talent`/weapon ownership produce identical `session.evaluate` and `session.optimize` results for the same chosen weapon, and (2) a GOOD file where the target character does not exist at all in `characters` or `weapons` still evaluates and optimizes an Akasha preset

### Implementation for User Story 1

- [x] T007 [P] [US1] Update `matchAccount` in `packages/presets/src/match.ts` to immediately return `{ presetId: preset.id, canRun: true, parts: [] }` when `preset.source === 'akasha'`
- [x] T008 [US1] Update `hydratePresetTeam`, `hydrateTeamIntoDb`, and `createSession` in `packages/engine/src/session.ts` and `runSolver` in `packages/engine/src/solver.ts` so that when `preset.team[0].build.type === 'fixed'`, `currentBuild` returns `{ weaponOverride: preset.team[0].build.weapon, artifactIds }` (never `weaponId`), and `evaluate`, `optimize`, and `exportGODatabase` pass `overrideChar = preset.team[0].build.character` and `overrideWeapon` (constructed from `selection?.weaponOverride ?? opts?.weaponOverride ?? preset.team[0].build.weapon` clamped via `validateWeaponLevelAsc`) to GO's `getTeamData`

---

## Phase 3: User Story 2 - Free-Choice Weapon & Refinement Selector (`R1`–`R5`) on `/presets` and `/optimize` (Priority: P1)

**Goal**: Allow users to select any weapon matching the target character's weapon type (`listWeaponsForType(weaponType)`) at refinement `R1`–`R5` on `/presets` and `/optimize` for Akasha presets (defaulting to `team[0].build.weapon`), applying the simulated weapon and its GO weapon sheet conditionals without checking inventory ownership, and displaying optimized builds on `/optimize` without a current-build comparison when no artifacts are equipped on the target character.

**Independent Test**: Run `packages/presets/test/metadata.test.ts` for `listWeaponsForType` and `packages/engine/test/akasha-isolation.test.ts` verifying that choosing an unowned weapon in `weaponOverride` changes evaluation and optimization numbers vs. another weapon and across `R1` vs. `R5`.

### Tests for User Story 2

- [x] T009 [P] [US2] Add unit tests in `packages/presets/test/metadata.test.ts` verifying `listWeaponsForType(weaponType)` returns all standard weapons for each of the 5 weapon types (`sword`, `claymore`, `polearm`, `bow`, `catalyst`) sorted by rarity descending then displayName ascending
- [x] T010 [P] [US2] Add a test in `packages/engine/test/akasha-isolation.test.ts` verifying that passing `weaponOverride` for a weapon the user does not own in GOOD changes `session.evaluate` and `session.optimize` results appropriately compared to another weapon and between `refinement: 1` and `refinement: 5`

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement and export `listWeaponsForType(weaponType: IdentifierWeaponType): WeaponMeta[]` in `packages/presets/src/metadata.ts` (filtering `ALL_WEAPON_KEYS` excluding `QuantumCatalyst` by `weaponType`, sorted by rarity desc then `displayName` asc)
- [x] T012 [US2] Update `hydratePresetTeam` in `packages/engine/src/session.ts` to accept an optional `weaponOverrideKey?: string`, include it in `presetTeamFingerprint`, and auto-populate default active conditional states from `getWeaponSheet(effectiveWeaponKey)?.document` on `team[0].conditional[effectiveWeaponKey]` whenever not already explicitly set in `preset.team[0].conditional`
- [x] T013 [P] [US2] Forward `weaponOverride?: SimulatedWeaponSpec` in `WorkerOptimizeRequest` in `apps/web/src/workers/optimizer.worker.ts` and `optimizePresetInWorker` in `apps/web/src/lib/engine/workerClient.ts`
- [x] T014 [P] [US2] Update `apps/web/src/app/presets/page.tsx` so Akasha presets mark `team[0]` as `simulated` (`m.build.type === 'fixed'`), replace the account-check gate with an Akasha fixed-build summary (`Lv. 90 C<x> · Talents <a/s/b>`) and a free-choice Weapon (`listWeaponsForType`) + Refinement (`R1`–`R5`) selector defaulting to `team[0].build.weapon`, and pass `&weaponKey=<key>&refinement=<r>` in the `/optimize` link
- [x] T015 [P] [US2] Update `apps/web/src/app/optimize/page.tsx` so Akasha presets read `weaponKey` and `refinement` query params (defaulting to `team[0].build.weapon`), render the free-choice Weapon (`listWeaponsForType`) + Refinement (`R1`–`R5`) selector passing `weaponOverride` to `evaluatePresetInWorker` and `optimizePresetInWorker`, and display the optimized result without a current-build comparison column when `Object.keys(currentSelection?.artifactIds ?? {}).length === 0`

---

## Phase 4: User Story 3 - Official/User Preset Preservation, Fork/Import Conversion & Golden Fixtures (Priority: P2)

**Goal**: Keep `team[0].build.type === 'owned'` and `matchAccount` matching for Official and User presets, convert `team[0].build` from `fixed` to `owned` when an Akasha preset is forked or imported into a User preset (`forkPresetToUser`, `parsePresetJson`), and re-capture the 5 Akasha golden fixtures from GO's `getTeamDataCalc` so `golden.test.ts` stays green.

**Independent Test**: Run `pnpm -r test` (`packages/presets` and `packages/engine` test suites, including `userPreset.test.ts`, `match.test.ts`, and `golden.test.ts`).

### Tests for User Story 3

- [x] T016 [P] [US3] Update `packages/presets/test/userPreset.test.ts` and `packages/presets/test/match.test.ts` to verify that `forkPresetToUser` and `parsePresetJson` convert an Akasha preset's `team[0].build` from `{ type: 'fixed', ... }` to `{ type: 'owned' }` while preserving `team[1..3]` as `{ type: 'tc', tc }`, and that `matchAccount` continues to enforce `owned` target requirements on Official and User presets

### Implementation for User Story 3

- [x] T017 [P] [US3] Update `forkPresetToUser` and `parsePresetJson` in `packages/presets/src/userPreset.ts` so converting an Akasha preset into a `user` preset sets `team[0].build = { type: 'owned' }` while keeping `team[1..3]` as `{ type: 'tc', tc }`
- [x] T018 [US3] Update `computeDirectGOGolden` in `packages/engine/scripts/capture-golden.ts` to pass `overrideWeapon` and `overrideChar` (plus weapon conditionals) into `getTeamDataCalc` when `preset.team[0].build.type === 'fixed'`, re-capture `packages/engine/test/golden/akasha__*.json`, and verify `packages/engine/test/golden.test.ts` passes

---

## Dependencies & Execution Order

- **Phase 1 (T001–T004)**: Foundational schema, data, and type contracts — complete first (`T003` and `T004` can run in parallel `[P]`).
- **Phase 2 (US1, T005–T008)**, **Phase 3 (US2, T009–T015)**, and **Phase 4 (US3, T016–T018)**:
  - `T007` (`packages/presets/src/match.ts`), `T011` (`packages/presets/src/metadata.ts`), and `T017` (`packages/presets/src/userPreset.ts`) touch separate files in `packages/presets` and can run in parallel `[P]`.
  - `T008` and `T012` both update `packages/engine/src/session.ts` and should be executed sequentially before `T018` (`capture-golden.ts` + golden fixture re-capture).
  - `T013` (`optimizer.worker.ts` + `workerClient.ts`), `T014` (`apps/web/src/app/presets/page.tsx`), and `T015` (`apps/web/src/app/optimize/page.tsx`) can run in parallel `[P]` once `T004` and `T011` are complete.

### Dependencies on Other Features

- `good-import` (`packages/good`, `apps/web/src/lib/storage/db.ts`): provides `useGoodStorage()` and `useUserPresets()` per `docs/architecture.md`.
- `single-character-optimizer` (`packages/engine`): provides `createSession`, `runSolver`, and `capture-golden.ts` per `docs/architecture.md`.
- `visual-identifiers` (`packages/presets/src/metadata.ts`, `apps/web/src/components/Identifier.tsx`): provides `CharacterBadge` (`simulated` prop), `WeaponBadge`, `ArtifactBadge`, and `getWeaponMeta`.
- `loading-and-bundle` (`packages/presets/src/statMeta.ts`): provides compact character/weapon metadata consumed by `getWeaponMeta` and `listWeaponsForType`.
