---
description: "Task list for Bundle Isolation & Animated Loading Feedback (loading-and-bundle)"
---

# Tasks: Bundle Isolation & Animated Loading Feedback (`loading-and-bundle`)

**Input**: Design documents from `/specs/loading-and-bundle/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

**Tests**: Vitest unit tests (`packages/presets/test/statMeta.test.ts`, `packages/good/test/statMeta.test.ts`) and React component + bundle import-isolation tests (`apps/web/test/loading-and-bundle.test.tsx`) are included.

**Organization**: Tasks are grouped by user story (`US1` Bundle Isolation, `US2` Route Skeletons & Shared Loading Primitives, `US3` Engine/Eval Spinners, Results Skeleton & Optimization Progress Bar) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Generator & CSS Keyframe Foundation)

**Purpose**: Create the static metadata generator script and global CSS animations required by downstream phases.

- [x] T001 [P] Create `packages/presets/scripts/generate-stat-meta.ts` to extract `CHAR_STAT_META` (`{ ele, rarity, weaponType }`), `WEAPON_STAT_META` (`{ weaponType, rarity }`), and `ART_SET_STAT_META` (`{ rarities }`) from `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats`
- [x] T002 [P] Add `@keyframes gi-spin`, `@keyframes gi-pulse`, `@keyframes gi-progress-shimmer`, `@media (prefers-reduced-motion: reduce)`, and `.gi-spinner`, `.gi-skeleton`, `.gi-progress-track`, `.gi-progress-fill` styles in `apps/web/src/app/globals.css`

---

## Phase 2: Foundational (Pure Settings, Compact `statMeta.gen.ts` & Shared `Loading.tsx`)

**Purpose**: Establish the pure settings module, generated `statMeta.gen.ts` modules, and shared `Loading.tsx` primitives that unblock all user stories.

- [x] T003 Create `packages/presets/src/settings.ts` exporting `SetFilterMode` (`'all' | 'exclude' | 'include'`), `OptimizerSettings` (`erFloor`, `includeEquippedOnOthers`, `excludedCharacters`, `lockedOnly`, `mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20`, `levelLow`, `levelHigh`, `setExclusion`, `setFilterMode`, `setFilterSelection`, `topN`), `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` with zero `@gi/engine` or `@genshin-optimizer/gi/stats` runtime imports
- [x] T004 Generate `packages/presets/src/statMeta.gen.ts` and `packages/good/src/statMeta.gen.ts` exporting `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META`, `getCharStatMeta`, `getWeaponStatMeta`, and `getArtSetStatMeta`
- [x] T005 [P] Create `apps/web/src/components/Loading.tsx` exporting `Spinner` (`label`, `size`, `inline`), `SkeletonBlock` (`width`, `height`, `borderRadius`, `count`), `ResultsSkeleton` (`label`), and `ProgressBar` (`tested`, `skipped`, `total`, `label`)

**Checkpoint**: Pure settings, compact `statMeta.gen.ts`, and `Loading.tsx` primitives are ready.

---

## Phase 3: User Story 1 - Lightweight Initial Page Loads Without Heavy Calculation Bundles (Priority: P1) 🎯 MVP

**Goal**: Remove all runtime imports of `@genshin-optimizer/gi/stats` (`allStat_gen.json`, 2.4 MB) from `@gi/presets` and `@gi/good`, remove all runtime imports of `@gi/engine` from `apps/web/src/lib/storage/{useGood,db}.ts`, and verify 100% metadata parity and bundle isolation.

**Independent Test**: Run `pnpm --filter @gi/presets test`, `pnpm --filter @gi/good test`, and `pnpm --filter @gi/web build`; confirm 100% parity with `@genshin-optimizer/gi/stats` and confirm that `/`, `/import`, and `/presets` initial JS bundles do not include `@gi/engine` or `allStat_gen.json`.

### Tests for User Story 1

- [x] T006 [P] [US1] Create `packages/presets/test/statMeta.test.ts` verifying 100% parity of `CHAR_STAT_META`, `WEAPON_STAT_META`, and `ART_SET_STAT_META` against `@genshin-optimizer/gi/stats` (`getCharEle`, `getCharStat`, `getWeaponStat`, `getArtSetStat`) across `ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, and `ALL_ARTIFACT_SET_KEYS`, plus `resolveArtSetExclusion` unit tests
- [x] T007 [P] [US1] Create `packages/good/test/statMeta.test.ts` verifying `packages/good/src/statMeta.gen.ts` parity against `@genshin-optimizer/gi/stats` and asserting zero runtime `@genshin-optimizer/gi/stats` imports in `packages/good/src/`

### Implementation for User Story 1

- [x] T008 [P] [US1] Update `packages/presets/src/metadata.ts` to use `getCharStatMeta`, `getWeaponStatMeta`, and `getArtSetStatMeta` from `./statMeta.gen` instead of `@genshin-optimizer/gi/stats`
- [x] T009 [P] [US1] Update `packages/presets/src/validate.ts` and `packages/presets/src/userPreset.ts` to use `getCharStatMeta` and `getWeaponStatMeta` from `./statMeta.gen` instead of `@genshin-optimizer/gi/stats`
- [x] T010 [P] [US1] Update `packages/good/src/parseGood.ts` and `packages/good/src/index.ts` to use `getCharStatMeta` and `getWeaponStatMeta` from `./statMeta.gen` instead of `@genshin-optimizer/gi/stats`
- [x] T011 [US1] Re-export `./settings` and `./statMeta.gen` from `packages/presets/src/index.ts`, and re-export `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `SetFilterMode`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` from `packages/engine/src/types.ts` and `packages/engine/src/index.ts` (updating `packages/engine/src/solver.ts` to call `resolveArtSetExclusion`)
- [x] T012 [US1] Update `apps/web/src/lib/storage/useGood.ts` and `apps/web/src/lib/storage/db.ts` to import `DEFAULT_OPTIMIZER_SETTINGS` and `OptimizerSettings` from `@gi/presets` instead of `@gi/engine`

**Checkpoint**: User Story 1 complete — `@gi/presets`, `@gi/good`, and `useGood.ts` have zero runtime imports of `@gi/engine` or `@genshin-optimizer/gi/stats`.

---

## Phase 4: User Story 2 - Route-Level Animated Skeletons & Shared Loading Primitives (Priority: P1)

**Goal**: Provide route-level `loading.tsx` skeletons with animated pulse on `/`, `/import`, `/presets`, `/optimize`, and `/teams`, and replace static loading states on `/import` (IndexedDB load + `"Parsing GOOD file…"`) and `/presets` (IndexedDB account/presets load) with animated `Spinner` and `SkeletonBlock` indicators.

**Independent Test**: Render all 5 `loading.tsx` files and test `/import` and `/presets` loading/parsing states in Vitest (`apps/web/test/loading-and-bundle.test.tsx`).

### Implementation for User Story 2

- [x] T013 [P] [US2] Create root route skeleton in `apps/web/src/app/loading.tsx` using `SkeletonBlock` and `Spinner` from `@/components/Loading`
- [x] T014 [P] [US2] Create `/import` route skeleton in `apps/web/src/app/import/loading.tsx` mirroring the upload/paste panels and inventory table layout with `SkeletonBlock`
- [x] T015 [P] [US2] Create `/presets` route skeleton in `apps/web/src/app/presets/loading.tsx` mirroring the filter bar and master-detail preset cards with `SkeletonBlock`
- [x] T016 [P] [US2] Create `/optimize` route skeleton in `apps/web/src/app/optimize/loading.tsx` mirroring the preset selector, settings panel, and `ResultsSkeleton`
- [x] T017 [P] [US2] Create `/teams` route skeleton in `apps/web/src/app/teams/loading.tsx` mirroring the metadata/enemy cards, 4-member team grid, and rotation table with `SkeletonBlock`
- [x] T018 [P] [US2] Update `apps/web/src/app/import/page.tsx` to display an animated `<Spinner label="Parsing GOOD file…" />` during file/paste parsing (with a frame yield before `parseGood`) and an animated `<Spinner label="Loading stored account data…" />` + `SkeletonBlock` rows while `loading` is true
- [x] T019 [P] [US2] Update `apps/web/src/app/presets/page.tsx` to display animated `SkeletonBlock` cards and `<Spinner label="Loading presets & account data…" />` while `useGoodStorage().loading` or `useUserPresets().loading` is true

**Checkpoint**: User Story 2 complete — all 5 route `loading.tsx` files exist and `/import` and `/presets` have animated loading/parsing feedback.

---

## Phase 5: User Story 3 - Animated Engine Status, Evaluation Results Skeletons & Real Optimization Progress Bar (Priority: P1)

**Goal**: Show labelled animated spinners (`"Loading optimizer engine…"`, `"Evaluating…"`) and `ResultsSkeleton` in `/optimize` and `/teams` while the worker initializes or evaluates, and render a real animated `ProgressBar` (`tested / total`) during optimization on `/optimize`.

**Independent Test**: Render `ProgressBar`, `ResultsSkeleton`, and `Spinner` states and verify `/optimize` and `/teams` integration in `apps/web/test/loading-and-bundle.test.tsx`.

### Tests for User Story 2 & 3

- [x] T020 [P] [US3] Create `apps/web/test/loading-and-bundle.test.tsx` testing `Spinner` (`"Loading optimizer engine…"`, `"Evaluating…"`, `"Parsing GOOD file…"`), `SkeletonBlock`, `ResultsSkeleton`, `ProgressBar` (determinate percentage fill + indeterminate `total === 0` state), all 5 route `loading.tsx` components, and static source import guards ensuring no runtime `@gi/engine` or `@genshin-optimizer/gi/stats` imports leak into `useGood.ts`, `db.ts`, `@gi/presets`, or `@gi/good`

### Implementation for User Story 3

- [x] T021 [US3] Update `apps/web/src/lib/engine/workerClient.ts` to export `isEngineSessionHydrated(datasetKey: string): boolean` and import `OptimizerSettings` from `@gi/presets`
- [x] T022 [US3] Update `apps/web/src/app/optimize/page.tsx` to: (a) show `<Spinner label="Loading optimizer engine…" />` or `<Spinner label="Evaluating…" />` when `evaluating` is true, (b) render `<ResultsSkeleton />` in the results area while initial evaluation is in flight, (c) render `<ProgressBar tested={progress.tested} skipped={progress.skipped} total={progress.total} />` during optimization, and (d) use `<OptimizeLoading />` as the `<Suspense>` fallback
- [x] T023 [US3] Update `apps/web/src/app/teams/page.tsx` to show `<Spinner label="Loading optimizer engine…" />` / `<Spinner label="Evaluating…" />` and `SkeletonBlock` rows while character catalogs or debounced live rotation previews are loading in the worker, and use `<TeamsLoading />` as the `<Suspense>` fallback

**Checkpoint**: User Story 3 complete — every wait state across `/import`, `/presets`, `/optimize`, and `/teams` renders an animated indicator.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification of tests, typechecks, and production bundle sizes.

- [x] T024 Run `pnpm -r test`, `pnpm -r typecheck`, and `pnpm --filter @gi/web build` to verify all unit/component/golden tests pass and inspect the production First Load JS sizes across `/`, `/import`, `/presets`, `/optimize`, and `/teams`

---

## Dependencies on Other Features

- **`artifact-set-filter`**: Shares `packages/presets/src/settings.ts` (`SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, `summarizeArtSetFilter`) per `docs/architecture.md` lines 71–83 and 129–132. T003 implements the complete contract so both features interoperate seamlessly.
- **`performance`**: Owns `apps/web/src/lib/engine/workerClient.ts` and `apps/web/src/workers/optimizer.worker.ts` per `docs/architecture.md`. T021 only adds the non-breaking `isEngineSessionHydrated` query helper and type import alignment.
- **`visual-identifiers`**: Owns `packages/presets/src/metadata.ts` (`getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`) and `apps/web/src/components/Identifier.tsx`. T008 preserves the exact exported function signatures and behavior of `metadata.ts` while swapping its internal data source from `@genshin-optimizer/gi/stats` to `./statMeta.gen`.

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: No dependencies — can run in parallel.
- **Phase 2 (T003–T005)**: T004 depends on T001; T005 depends on T002; T003 is independent.
- **Phase 3 / US1 (T006–T012)**: Depends on T003 and T004. T006–T010 can run in parallel, followed by T011–T012.
- **Phase 4 / US2 (T013–T019)**: Depends on T005. All route `loading.tsx` files (T013–T017) and page updates (T018–T019) can run in parallel.
- **Phase 5 / US3 (T020–T023)**: Depends on T005 and T012. T020, T021, T022, T023 can run once `Loading.tsx` is in place.
- **Phase 6 (T024)**: Final validation after Phases 1–5 complete.

## Parallel Example

```bash
# Phase 2 + US1 metadata replacements in parallel:
Task: "T008 [P] [US1] Update packages/presets/src/metadata.ts to use ./statMeta.gen"
Task: "T009 [P] [US1] Update packages/presets/src/validate.ts and userPreset.ts to use ./statMeta.gen"
Task: "T010 [P] [US1] Update packages/good/src/parseGood.ts to use ./statMeta.gen"

# US2 route-level loading.tsx skeletons in parallel:
Task: "T013 [P] [US2] Create apps/web/src/app/loading.tsx"
Task: "T014 [P] [US2] Create apps/web/src/app/import/loading.tsx"
Task: "T015 [P] [US2] Create apps/web/src/app/presets/loading.tsx"
Task: "T016 [P] [US2] Create apps/web/src/app/optimize/loading.tsx"
Task: "T017 [P] [US2] Create apps/web/src/app/teams/loading.tsx"
```

## Implementation Strategy

1. **MVP First (US1 — Bundle Isolation)**: Complete Phases 1–3 first to sever `@gi/engine` and `@genshin-optimizer/gi/stats` (`allStat_gen.json`) from `@gi/good`, `@gi/presets`, and `useGood.ts`, immediately reducing initial JS bundle size across every route.
2. **Incremental Delivery (US2 & US3 — Animated Loading Feedback)**: Add `Loading.tsx` + `globals.css` keyframes, drop in route-level `loading.tsx` skeletons for all 5 routes, and wire `Spinner`, `ResultsSkeleton`, and `ProgressBar` into `/import`, `/presets`, `/optimize`, and `/teams`.
