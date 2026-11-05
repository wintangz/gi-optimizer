# Tasks: GOOD Import (`good-import`)

**Input**: Design documents from `/specs/good-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup

- [ ] T001 Create `packages/good/package.json`, `packages/good/tsconfig.json`, and `packages/good/vitest.config.mts` wired to `tooling/go-paths.mjs`
- [ ] T002 Add `idb` and `fake-indexeddb` dependencies to `apps/web/package.json`

---

## Phase 2: Foundational (Types & Storage Contract)

- [ ] T003 [P] Define `IGOOD`, `ICharacter`, `IWeapon`, `IArtifact`, `ParseIssue`, `GoodSummary`, and `ParseGoodResult` in `packages/good/src/types.ts`
- [ ] T004 [P] Implement near-match suggestion helper (`didYouMean`) and key humanizer (`humanizeKey`) in `packages/good/src/suggest.ts`
- [ ] T005 Implement IndexedDB module `apps/web/src/lib/storage/db.ts` (`loadGood`, `saveGood`, `clearGood`, `listUserPresets`, `saveUserPreset`, `deleteUserPreset`, `loadSettings`, `saveSettings`) and React hook `apps/web/src/lib/storage/useGood.ts`

---

## Phase 3: User Story 1 & 2 - Parse GOOD File & Report Errors Plainly (Priority: P1) 🎯 MVP

**Goal**: Parse valid GOOD files and GO exports accurately while reporting fatal/error/warning/info diagnostics with exact paths and suggestions on malformed or non-GOOD inputs.

**Independent Test**: `pnpm --filter @gi/good test` verifies `Van_2025-07-16_19-59-13.json` (81 chars, 191 weapons, 1157 artifacts) and all error/warning edge cases.

- [ ] T006 [US1] [US2] Write unit tests in `packages/good/test/parseGood.test.ts` covering the GO sample file, invalid JSON (line/col), BOM, trailing garbage, Enka/showcase rejection, misspelled stat keys (`critRate` → `critRate_`), unknown newer-version keys, out-of-range clamps, duplicate IDs, and GO `ArtCharDatabase.importGOOD` parity
- [ ] T007 [US1] [US2] Implement `parseGood(rawTextOrObject, options)` in `packages/good/src/parseGood.ts` and export from `packages/good/src/index.ts`

---

## Phase 4: User Story 3, 4 & 5 - Import UI, Browse Tables, Replace/Clear & Paste (Priority: P2/P3)

**Goal**: Full `/import` page with file upload/drop, paste box, parse report with grouped issues, replace/clear confirmations, and filterable Character, Weapon, and Artifact tables.

- [ ] T008 [US1] [US3] [US4] [US5] Implement `apps/web/src/app/import/page.tsx` with file picker + drag-drop + paste textarea, parse report, replace/clear confirmation, and filterable Character/Weapon/Artifact tables
- [ ] T009 [P] Write storage unit test in `packages/good/test/storage.test.ts` verifying round-trip persistence and isolation between `good`, `presets`, and `settings`
