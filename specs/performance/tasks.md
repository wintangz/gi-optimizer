# Tasks: Engine & Web Performance Optimization (`performance`)

**Input**: Design documents from `/specs/performance/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Vitest unit and benchmark tests are included per requirements (`packages/engine/test/perf-benchmark.test.ts` and golden parity verification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Export updated engine helpers and define the extended worker protocol types.

- [x] T001 Export `hydratePresetTeam` from `packages/engine/src/index.ts` alongside `createSession` and `hydrateTeamIntoDb`
- [x] T002 Define request/response message envelopes (`init`, `evaluate`, `optimize`, `catalog`, `exportGO`, `cancel` with `requestId` and `datasetKey`) in `apps/web/src/workers/optimizer.worker.ts`

---

## Phase 2: Foundational (Single Hydrated Session & Stateful Worker Protocol)

**Purpose**: Core engine session restructuring and stateful worker singleton that all user stories build upon.

- [x] T003 Implement `hydratePresetTeam(db, preset)` in `packages/engine/src/session.ts` that clears only `db.teams`, `db.teamChars`, and `db.buildTcs` on an existing `ArtCharDatabase` (caching `{ teamId, targetTeamCharId }` by preset fingerprint) without calling `db.importGOOD`
- [x] T004 Refactor `createSession(good)` in `packages/engine/src/session.ts` so `baseDb.importGOOD` runs once per session, `evaluate(preset, selection)` and `optimize(preset, settings, opts)` reuse `baseDb` via `hydratePresetTeam(baseDb, preset)` and pass `selection` through `overrideArts`/`overrideWeapon` without mutating equipped locations, and only `exportGODatabase(preset, selection)` clones/hydrates an export database with equipped overrides
- [x] T005 Implement stateful `EngineSession` caching (keyed by `datasetKey` / `importedAt`) and handlers for `init`, `evaluate`, `optimize`, `catalog`, `exportGO`, and `cancel` in `apps/web/src/workers/optimizer.worker.ts`
- [x] T006 Create the persistent client-side worker singleton `apps/web/src/lib/engine/workerClient.ts` with promise-based `initSession`, `evaluatePreset`, `optimizePreset`, `getCatalog`, `exportGODatabase`, and `cancelOptimize` methods (including lazy `await import('@gi/engine')` fallback when `typeof Worker === 'undefined'`)

**Checkpoint**: Single-hydration `EngineSession` and persistent worker client are ready for page and catalog integration.

---

## Phase 3: User Story 1 & User Story 2 - Lazy Client-Only Engine Loading & Off-Main-Thread Evaluation on `/optimize` (Priority: P1) 🎯 MVP

**Goal**: Remove synchronous `@gi/engine` value imports from `/optimize` and run all preset hydration, current/optimised build evaluations, optimization searches, and GO database exports off the main thread on the single hydrated worker session.

**Independent Test**: Load `/optimize`, verify zero top-level runtime imports from `@gi/engine` in `apps/web/src/app/optimize/page.tsx`, switch presets on the 1,157-artifact account, and verify `currentEval` and `optimisedEval` resolve via `workerClient` without re-importing GOOD.

### Tests for User Stories 1 & 2

- [x] T007 [P] [US2] Add unit test in `packages/engine/test/optimizer.test.ts` verifying that `createSession(good)` calls `ArtCharDatabase.prototype.importGOOD` exactly once across multiple `evaluate()`, `currentBuild()`, and `optimize()` calls while preserving golden damage parity

### Implementation for User Stories 1 & 2

- [x] T008 [US1] Replace top-level `@gi/engine` value imports in `apps/web/src/app/optimize/page.tsx` with `import type` declarations (`ArtifactSlot`, `BuildSelection`, `OptimizeProgress`, `OptimizeResult`, `RotationResult`)
- [x] T009 [US2] Refactor `apps/web/src/app/optimize/page.tsx` to use `apps/web/src/lib/engine/workerClient.ts` for initial GOOD hydration (`record.importedAt`), off-main-thread `currentSelection`/`currentEval` and `optimisedEval` computation, `startOptimization`/`cancelOptimization`, and `handleExportGO`

**Checkpoint**: `/optimize` bundles zero synchronous `@gi/engine` code and reuses one hydrated worker session across preset switches, build evaluations, and solver runs.

---

## Phase 4: User Story 3 - Catalog Caching & Debounced Live Preview on `/teams` (Priority: P2)

**Goal**: Cache `listTargetsForCharacter` and `listConditionalsForCharacter` in module-level `Map`s in `packages/engine/src/catalog.ts` with precomputed global artifact/resonance/reaction conditionals and `weaponType`-filtered weapon conditionals, and refactor `/teams` to use type-only `@gi/engine` imports plus 150 ms debounced off-main-thread live preview evaluation.

**Independent Test**: Call `listTargetsForCharacter` and `listConditionalsForCharacter` for a 4-member team and verify weapon conditionals match each character's `allStats.char.data[cKey].weaponType`, warm calls return in <1 ms, and `/teams` has no top-level `@gi/engine` value imports and debounces live preview by 150 ms.

### Tests for User Story 3

- [x] T010 [P] [US3] Add unit tests in `packages/engine/test/optimizer.test.ts` verifying module-level caching of `listTargetsForCharacter` and `listConditionalsForCharacter` and confirming weapon conditionals for a character only include weapons matching `getCharStat(cKey).weaponType`

### Implementation for User Story 3

- [x] T011 [P] [US3] Refactor `packages/engine/src/catalog.ts` to cache `listTargetsForCharacter` and `listConditionalsForCharacter` in module-level `Map`s, compute global artifact-set, weapon-by-`weaponType` (`getCharStat`/`getWeaponStat` from `@genshin-optimizer/gi/stats`), resonance, and reaction conditionals once per process, and reuse a single module-level scratch `ArtCharDatabase`
- [x] T012 [US3] Refactor `apps/web/src/app/teams/page.tsx` to use `import type` from `@gi/engine`, fetch character target/conditional catalogs via `workerClient.getCatalog`, and debounce live rotation preview evaluations by 150 ms via `workerClient.evaluatePreset`

**Checkpoint**: `/teams` loads without synchronous `@gi/engine` bundling, populates 4-member catalogs from cache, and debounces live rotation previews off the main thread.

---

## Phase 5: User Story 4 - Lazy Solver Permutation Iteration & Acceptance Benchmark (Priority: P2)

**Goal**: Remove the up-front `Array.from(filterFeasiblePerm(...))` and `countBuilds` pre-pass in `packages/engine/src/solver.ts`, and create the reproducible benchmark suite `packages/engine/test/perf-benchmark.test.ts` on `Van_2025-07-16_19-59-13.json`.

**Independent Test**: Run `pnpm --filter @gi/engine test` to execute `packages/engine/test/perf-benchmark.test.ts`, `golden.test.ts`, and `optimizer.test.ts` and verify all timings and golden parity assertions pass.

### Implementation & Benchmark for User Story 4

- [x] T013 [P] [US4] Refactor `runSolver` in `packages/engine/src/solver.ts` to iterate lazily over `filterFeasiblePerm(artSetPerm(exclusion, allSets), arts)` during the split/compute loop and accumulate/report `total` dynamically without an up-front `Array.from` + `countBuilds` pass
- [x] T014 [US4] Create `packages/engine/test/perf-benchmark.test.ts` measuring and reporting timings on `vendor/genshin-optimizer/libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json` for: (a) cold session hydration + initial evaluation, (b) warm preset switch evaluation, (c) `session.evaluate` with build selection, (d) full `session.optimize` run, and (e) 4-member team `listTargetsForCharacter` + `listConditionalsForCharacter` (cold vs. cached)

**Checkpoint**: All solver optimizations and benchmark assertions pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full verification across engine golden tests, benchmark suite, and Next.js static export build.

- [x] T015 Run `pnpm --filter @gi/engine test` and `pnpm --filter @gi/web build` to verify golden fixture parity (`packages/engine/test/golden.test.ts`), benchmark execution (`packages/engine/test/perf-benchmark.test.ts`), and clean Next.js static export with zero top-level `@gi/engine` value imports in `apps/web/src/app/`

---

## Dependencies & Execution Order

### Dependencies on Other Features

- **`good-import`**: Consumes `useGoodStorage()` (`record.good` and `record.importedAt`) from `apps/web/src/lib/storage/useGood.ts` per `docs/architecture.md`.
- **`single-character-optimizer`**: Enhances `packages/engine/src/{session,solver,catalog}.ts`, `apps/web/src/workers/optimizer.worker.ts`, and `apps/web/src/app/optimize/page.tsx` while preserving the `EngineSession` contract in `docs/architecture.md`.
- **`custom-teams-and-presets`**: Enhances `apps/web/src/app/teams/page.tsx` to use lazy worker evaluation and cached catalogs.

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T002) — blocks Phase 3 and Phase 4 web integration.
- **User Stories 1 & 2 (Phase 3)**: Depends on Phase 2 (T003–T006).
- **User Story 3 (Phase 4)**: `catalog.ts` caching (T010, T011) can run in parallel with Phase 2/3; `/teams` integration (T012) depends on T006 and T011.
- **User Story 4 (Phase 5)**: `solver.ts` lazy permutation loop (T013) can run in parallel with Phase 2/3/4; `perf-benchmark.test.ts` (T014) depends on T004, T011, and T013.
- **Polish (Phase 6)**: Depends on Phases 1–5 completion.

### Parallel Opportunities

- `packages/engine/src/session.ts` (T003–T004), `packages/engine/src/catalog.ts` (T011), and `packages/engine/src/solver.ts` (T013) touch distinct files in `packages/engine/src/` and can be developed in parallel.
- `apps/web/src/app/optimize/page.tsx` (T008–T009) and `apps/web/src/app/teams/page.tsx` (T012) can be updated in parallel once `apps/web/src/lib/engine/workerClient.ts` (T006) is complete.

---

## Parallel Example

```bash
# Engine core optimizations in parallel across separate files:
Task T003/T004: "Single ArtCharDatabase + hydratePresetTeam in packages/engine/src/session.ts"
Task T011: "Module-level catalog Map caches + weaponType filter in packages/engine/src/catalog.ts"
Task T013: "Lazy filterFeasiblePerm loop in packages/engine/src/solver.ts"

# Web route integrations in parallel after workerClient.ts (T006):
Task T008/T009: "Lazy worker evaluation on apps/web/src/app/optimize/page.tsx"
Task T012: "Debounced live preview & cached catalog on apps/web/src/app/teams/page.tsx"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + Phase 3)

1. Complete Phase 1 & Phase 2 (`hydratePresetTeam`, single-DB `createSession`, stateful `optimizer.worker.ts`, and `workerClient.ts`).
2. Complete Phase 3 (`/optimize` type-only imports and off-main-thread evaluation).
3. Validate `/optimize` cold load and preset switching speed.

### Incremental Delivery

1. Add Phase 4 (`catalog.ts` module-level caching + `weaponType` filtering + `/teams` 150 ms debounced preview).
2. Add Phase 5 (`solver.ts` lazy permutation loop + `perf-benchmark.test.ts`).
3. Run Phase 6 full test and static build verification.
