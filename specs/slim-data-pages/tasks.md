---
description: "Task list for Slim Data Pages (slim-data-pages)"
---

# Tasks: Slim Data Pages (`slim-data-pages`)

**Input**: Design documents from `/specs/slim-data-pages/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

**Tests**: Vitest unit tests in `packages/good/test/parseGood.test.ts`, `packages/presets/test/metadata.test.ts`, and `packages/presets/test/schema.test.ts` are included.

**Organization**: Tasks are grouped by user story (`US1` Canonical Compact Metadata & Zero `@genshin-optimizer/gi/consts` Runtime Imports, `US2` Zero-Dependency Preset Schema Validator, `US3` Slim Route Imports on `/import` and `/presets`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Workspace Package Configuration)

**Purpose**: Configure `@gi/good` and `@gi/presets` package manifests for shared metadata consumption, tree-shaking (`"sideEffects": false`), and `zod` removal.

- [x] T001 [P] Add `"sideEffects": false` to `packages/good/package.json`
- [x] T002 [P] Add `"@gi/good": "workspace:*"` and `"sideEffects": false` to `packages/presets/package.json` and remove `"zod"` from `dependencies`

---

## Phase 2: Foundational (Compact Canonical `statMeta.gen.ts` Generator & Output)

**Purpose**: Update `packages/presets/scripts/generate-stat-meta.ts` to emit a single compact `packages/good/src/statMeta.gen.ts` containing all character/weapon/artifact metadata and GO key/slot/stat constants, and delete the duplicate `packages/presets/src/statMeta.gen.ts`.

- [x] T003 Update `packages/presets/scripts/generate-stat-meta.ts` to compactly encode character (`ele` index `0..6`, `rarity` `'4'|'5'`, `weaponType` index `0..4`), weapon (`weaponType` index `0..4`, `rarity` `'1'..'5'`), and artifact set (`rarities` digit string) metadata and emit a single canonical `packages/good/src/statMeta.gen.ts` exporting `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META`, `getCharStatMeta`, `getWeaponStatMeta`, `getArtSetStatMeta`, `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS` (`['flower','plume','sands','goblet','circlet']`), `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL` (`{ 1: 4, 2: 4, 3: 12, 4: 16, 5: 20 }`), `ART_SLOT_MAIN_KEYS`, and `charKeyToLocCharKey`
- [x] T004 Run `packages/presets/scripts/generate-stat-meta.ts` to regenerate `packages/good/src/statMeta.gen.ts` and delete the duplicate `packages/presets/src/statMeta.gen.ts`

**Checkpoint**: Canonical compact `packages/good/src/statMeta.gen.ts` is generated and duplicate `packages/presets/src/statMeta.gen.ts` is removed.

---

## Phase 3: User Story 1 - Single Canonical & Compact Metadata Without Runtime `@genshin-optimizer/gi/consts` (Priority: P1) 🎯 MVP

**Goal**: Re-export the canonical metadata and constants from `@gi/good` and update `@gi/good` and `@gi/presets` to consume them so neither package imports `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats` at runtime.

**Independent Test**: Run `pnpm --filter @gi/good test` and `pnpm --filter @gi/presets test` (`metadata.test.ts`); verify 100% parity against `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats` and zero runtime imports of `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats` in `packages/good/src/` and `packages/presets/src/`.

### Tests for User Story 1

- [x] T005 [P] [US1] Update `packages/presets/test/metadata.test.ts` to import `getCharStatMeta`, `getWeaponStatMeta`, `getArtSetStatMeta`, `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, and `charKeyToLocCharKey` from `@gi/good` and verify 100% parity against `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats`, plus assert that `packages/presets/src/statMeta.gen.ts` does not exist and no file in `packages/good/src/` or `packages/presets/src/` imports `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats`

### Implementation for User Story 1

- [x] T006 [P] [US1] Update `packages/good/src/parseGood.ts` and `packages/good/src/index.ts` to import `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, `CHAR_STAT_META`, and `WEAPON_STAT_META` from `./statMeta.gen` (removing `@genshin-optimizer/gi/consts`) and re-export `./statMeta.gen` from `packages/good/src/index.ts`
- [x] T007 [P] [US1] Update `packages/presets/src/names.ts` to re-export `ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, and `ALL_ARTIFACT_SET_KEYS` from `@gi/good` (removing `@genshin-optimizer/gi/consts`)
- [x] T008 [P] [US1] Update `packages/presets/src/metadata.ts`, `packages/presets/src/validate.ts`, and `packages/presets/src/userPreset.ts` to import `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META`, `getCharStatMeta`, and `getWeaponStatMeta` from `@gi/good` instead of `./statMeta.gen`

**Checkpoint**: User Story 1 complete — `@gi/good` and `@gi/presets` share a single compact `statMeta.gen.ts` with zero runtime imports of `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats`.

---

## Phase 4: User Story 2 - Zero-Dependency Preset Schema Validator Replacing Runtime `zod` (Priority: P1)

**Goal**: Replace `zod` in `packages/presets/src/schema.ts` with a lightweight, zero-dependency custom validator implementing `.parse(input)` and `.safeParse(input)` with identical validation constraints, default hydration, and structured issue paths/messages.

**Independent Test**: Run `pnpm --filter @gi/presets test` (`schema.test.ts`, `official.test.ts`, `match.test.ts`, `userPreset.test.ts`) and verify all schema, default, and domain refinement rules pass with zero `zod` imports.

### Tests for User Story 2

- [x] T009 [P] [US2] Expand `packages/presets/test/schema.test.ts` to test `presetSchema.parse()` and `presetSchema.safeParse()` across default hydration (`description: ''`, `requirement: {}`, `conditional: {}`, `bonusStats: {}`, `hitMode: 'avgHit'`, `enemy: { level: 100, overrides: {} }`, `teamConditional: { resonance: {}, reaction: {} }`, `rotation: { name: 'Rotation', repeat: 1 }`), input immutability, enum validation (`ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_MAIN_STAT_KEYS`, `hitMode`, `reaction`, `infusionAura`), integer bounds (`talent` `1..15`, `character.level` `1..100`, `ascension` `0..6`, `constellation` `0..6`, `weapon.level` `1..90`, `refinement` `1..5`, `artifact.level` `0..20`, `rarity` `1..5`, `enemy.level` `1..200`, `rotation.repeat` `>= 1`), `rotation.targets` (`path.length >= 2`, `path[0] !== 'custom'`, `count > 0`), and all 5 `superRefine` domain checks

### Implementation for User Story 2

- [x] T010 [US2] Implement the zero-dependency schema validator in `packages/presets/src/schema.ts` consuming `ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_MAIN_STAT_KEYS`, and `ALL_SUBSTAT_KEYS` from `@gi/good`, exporting `PRESET_SCHEMA_ID` (`'gi-optimizer/preset@1'`), `memberRequirementSchema`, `tcCharacterSchema`, `tcWeaponSchema`, `tcBuildSchema`, `fixedBuildSchema`, `teamMemberSchema`, `rotationTargetSchema`, `presetSourceSchema`, `presetSchema` (with `.parse(input)` and `.safeParse(input)`), and types `Preset`, `PresetInput`, `TeamMember`, `MemberRequirement`, `RotationTarget`, `TcBuild`, `FixedBuild`, `TcCharacter`, `TcWeapon`, and `PresetSource`

**Checkpoint**: User Story 2 complete — `zod` is completely removed from `@gi/presets` runtime bundles while all schema tests and preset validations pass.

---

## Phase 5: User Story 3 - Slim Route Imports on `/import` and `/presets` (Priority: P1)

**Goal**: Make `packages/presets/src/registry.ts` lazy/side-effect-free at module load time and slim imports on `/import` and `/presets` so `/import` never bundles the 11 preset JSON files and `/presets` never bundles `parseGood.ts`, bringing both routes' First Load JS within ~60 kB of `/`.

**Independent Test**: Run `pnpm --filter @gi/web build` and verify that `/import` and `/presets` First Load JS are within ~60 kB of `/` First Load JS, and run `pnpm -r test` to confirm all tests pass.

### Implementation for User Story 3

- [x] T011 [P] [US3] Refactor `packages/presets/src/registry.ts` so `BUNDLED_PRESETS` and `VERIFIED_PRESET_IDS` are lazily initialized on first call rather than executing `RAW_BUNDLED.map((raw) => presetSchema.parse(raw))` at module top-level evaluation
- [x] T012 [P] [US3] Slim imports in `apps/web/src/app/import/page.tsx`, `apps/web/src/app/presets/page.tsx`, `apps/web/src/lib/itemMeta.ts`, and `apps/web/src/lib/storage/useGood.ts` so `/import` only loads parser, `humanizeKey`, `displayName`, `Identifier`, and `useGoodStorage` (without `registry.ts` / preset JSONs) and `/presets` only loads `humanizeKey` and preset browsing/matching helpers (without `parseGood.ts`)

**Checkpoint**: User Story 3 complete — `/import` and `/presets` only bundle the modules they actually use on initial render.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation of unit tests, typechecking, and production First Load JS sizes across all routes.

- [x] T013 Run `pnpm -r test`, `pnpm -r typecheck`, and `pnpm --filter @gi/web build` to verify all `@gi/good`, `@gi/presets`, `@gi/engine`, and `@gi/web` tests pass and record the before/after First Load JS table for `/`, `/import`, `/presets`, `/optimize`, and `/teams`

---

## Dependencies on Other Features

- **`loading-and-bundle`**: Introduced `packages/presets/scripts/generate-stat-meta.ts` and `packages/presets/src/settings.ts`. `slim-data-pages` builds directly on top of `loading-and-bundle` by consolidating `statMeta.gen.ts` into `@gi/good` alone, compacting its encoding, adding GO key constants, replacing `zod`, and enabling tree-shaking across `/import` and `/presets`.
- **`visual-identifiers`**: Owns `packages/presets/src/metadata.ts` and `apps/web/src/components/Identifier.tsx`. T008 preserves all exported types and functions of `metadata.ts` while switching its internal `statMeta` import to `@gi/good`.

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: No dependencies — can run in parallel.
- **Phase 2 (T003–T004)**: Depends on Phase 1. T003 updates the generator script; T004 runs it and deletes `packages/presets/src/statMeta.gen.ts`.
- **Phase 3 / US1 (T005–T008)**: Depends on Phase 2 (T004). T005, T006, T007, T008 can run in parallel across `@gi/good` and `@gi/presets`.
- **Phase 4 / US2 (T009–T010)**: Depends on Phase 3 (T006). T009 and T010 can run together to replace `zod` in `packages/presets/src/schema.ts`.
- **Phase 5 / US3 (T011–T012)**: Depends on Phases 3 & 4. T011 and T012 can run in parallel.
- **Phase 6 (T013)**: Final verification after Phases 1–5 complete.

## Parallel Example

```bash
# Phase 3 (US1) tasks in parallel after T004:
Task: "T006 [P] [US1] Update packages/good/src/parseGood.ts and packages/good/src/index.ts"
Task: "T007 [P] [US1] Update packages/presets/src/names.ts"
Task: "T008 [P] [US1] Update packages/presets/src/metadata.ts, validate.ts, and userPreset.ts"

# Phase 5 (US3) tasks in parallel after T010:
Task: "T011 [P] [US3] Refactor packages/presets/src/registry.ts for lazy initialization"
Task: "T012 [P] [US3] Slim route imports in apps/web/src/app/import/page.tsx and presets/page.tsx"
```

## Implementation Strategy

1. **MVP First (US1 + US2 — Canonical Compact Metadata & Zero-Dependency Schema)**: Complete Phases 1–4 first to eliminate duplicate `statMeta.gen.ts` (~35.5 KB), `@genshin-optimizer/gi/consts` (~85.8 KB), and `zod` (~104.3 KB) from `@gi/good` and `@gi/presets`.
2. **Route Tree-Shaking & Verification (US3)**: Complete Phase 5–6 (`registry.ts` lazy init + `"sideEffects": false` + slim route imports) and verify with `pnpm --filter @gi/web build` that `/import` and `/presets` First Load JS are within ~60 kB of `/`.
