# Tasks: Multi-Select Artifact Set Filter (`artifact-set-filter`)

**Input**: Design documents from `/specs/artifact-set-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Foundational Settings Contract & Solver Boundary Translation (`@gi/presets` + `@gi/engine`)

**Purpose**: Define the pure `SetFilterMode` (`'all' | 'exclude' | 'include'`), `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, `summarizeArtSetFilter`, and bulk selection helpers in `packages/presets/src/settings.ts` and wire `resolveArtSetExclusion` into `packages/engine/src/solver.ts`.

- [x] T001 Create `packages/presets/src/settings.ts` exporting `SetPieceCount` (`2 | 4`), `SetFilterMode` (`'all' | 'exclude' | 'include'`), `ArtSetExclusionMap` (`Record<string, (2 | 4)[]>`), `OptimizerSettings` (with `setExclusion?: Record<string, (2 | 4)[]>`, `setFilterMode?: SetFilterMode`, `setFilterSelection?: Record<string, (2 | 4)[]>`, `mainStatAssumptionLevel: 0 | 4 | 8 | 12 | 16 | 20`, `levelLow: number`, `levelHigh: number`, `topN: number`), `DEFAULT_OPTIMIZER_SETTINGS` (`setFilterMode: 'all'`, `setFilterSelection: {}`, `setExclusion: {}`, `topN: 5`), `normalizePieceCounts`, `resolveArtSetExclusion(settings, allSetKeys = ALL_ARTIFACT_SET_KEYS)`, `summarizeArtSetFilter(settings, allSetKeys = ALL_ARTIFACT_SET_KEYS)`, and bulk helpers (`selectAllSets`, `clearSets`, `invertSets`), and re-export `./settings` from `packages/presets/src/index.ts`
- [x] T002 [P] Update `packages/engine/src/types.ts` to re-export `SetPieceCount`, `SetFilterMode`, `ArtSetExclusionMap`, `OptimizerSettings`, and `DEFAULT_OPTIMIZER_SETTINGS` from `@gi/presets` so `@gi/engine` and `@gi/presets` share the exact same type and default definitions
- [x] T003 [US1] [US2] Update `runSolver` in `packages/engine/src/solver.ts` to translate `(settings.setFilterMode, settings.setFilterSelection, settings.setExclusion)` into GO's `ArtSetExclusion` via `resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)` before calling `pruneExclusion` and `artSetPerm`
- [x] T004 [P] [US1] [US2] Write comprehensive unit tests in `packages/presets/test/settings.test.ts` covering `resolveArtSetExclusion` across `'all'` mode (`{}`), legacy `setFilterMode === undefined` fallback (`settings.setExclusion`), `'exclude'` mode (`[2]`, `[4]`, `[2, 4]`), `'include'` mode ("Only these sets": 3 sets allowed = all other sets in `ALL_ARTIFACT_SET_KEYS` excluded at `[2, 4]`, selected `[4]` -> `[2]` excluded, selected `[2]` -> `[4]` excluded, selected `[2, 4]` -> omitted), empty `'include'` selection (all sets excluded at `[2, 4]`), `summarizeArtSetFilter` labels, and bulk helpers (`selectAllSets`, `clearSets`, `invertSets`)
- [x] T005 [P] [US1] [US2] Add solver integration tests in `packages/engine/test/optimizer.test.ts` verifying `session.optimize` with `setFilterMode: 'include'` (restricting to specific allowed sets and piece counts) and `setFilterMode: 'exclude'`

---

## Phase 2: User Story 1, 2 & 3 - Multi-Select `ArtifactSetFilter` Component & `/optimize` Integration (Priority: P1/P2) 🎯 MVP

**Goal**: Replace the one-set-at-a-time exclude dropdown on `/optimize` with the `ArtifactSetFilter` panel (`apps/web/src/components/ArtifactSetFilter.tsx`) supporting first-class `'all' | 'exclude' | 'include'` modes, live allowed-sets summary line, search input, bulk actions (**Select all**, **Clear**, **Invert**), per-set piece-count selector (`[2]`, `[4]`, `[2, 4]`), and `ArtifactBadge` visual identifiers persisted via `useOptimizerSettings`.

**Independent Test**: Render `ArtifactSetFilter` in Vitest (`apps/web/test/ArtifactSetFilter.test.tsx`) and on `/optimize`; verify mode switching (`All sets`, `Exclude selected`, `Only these sets`), summary line counts, search filtering, bulk actions (`Select all`, `Clear`, `Invert`), per-set `2pc` / `4pc` / `Both (2pc + 4pc)` selection, `ArtifactBadge` rendering for every set, and IndexedDB persistence via `useOptimizerSettings`.

- [x] T006 [US1] [US2] [US3] Implement `ArtifactSetFilter` in `apps/web/src/components/ArtifactSetFilter.tsx` with mode selector (`'all'`, `'exclude'`, `'include'`), live summary banner (`summarizeArtSetFilter`), search filter input, bulk action buttons (**Select all**, **Clear**, **Invert** operating on visible sets), and scrollable checkbox grid displaying `<ArtifactBadge setKey={setKey} compact />` and a piece-count selector (`[2, 4]` Both, `[2]` 2pc only, `[4]` 4pc only) for each selected set
- [x] T007 [US1] [US2] [US3] Update `apps/web/src/app/optimize/page.tsx` to replace the single-select `Excluded Artifact Sets (2p & 4p)` dropdown and chip list with `<ArtifactSetFilter settings={settings} onChange={(next) => void updateSettings(next)} />`
- [x] T008 [P] [US1] [US2] [US3] Write component unit tests in `apps/web/test/ArtifactSetFilter.test.tsx` verifying rendering of all 3 modes (`all`, `exclude`, `include`), summary line text (`"All 54 artifact sets allowed"`, `"51 of 54 sets allowed (3 excluded)"`, `"Only 3 of 54 sets allowed"`), `ArtifactBadge` visual identifiers on set items, search filtering, bulk actions, and piece-count (`[2]`, `[4]`, `[2, 4]`) controls

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational Settings Contract & Solver Boundary)**: Starts immediately. T001 (`packages/presets/src/settings.ts`) unblocks T002, T003, T004, T005, and Phase 2.
- **Phase 2 (`ArtifactSetFilter` UI & `/optimize` Integration)**: Depends on T001 and T002. T006 (`apps/web/src/components/ArtifactSetFilter.tsx`) unblocks T007 (`apps/web/src/app/optimize/page.tsx`) and T008 (`apps/web/test/ArtifactSetFilter.test.tsx`).

### Parallel Opportunities

- After T001 completes, T002 (`packages/engine/src/types.ts`), T003 (`packages/engine/src/solver.ts`), T004 (`packages/presets/test/settings.test.ts`), and T006 (`apps/web/src/components/ArtifactSetFilter.tsx`) touch distinct files and can run in parallel `[P]`.
- After T006 completes, T007 (`apps/web/src/app/optimize/page.tsx`) and T008 (`apps/web/test/ArtifactSetFilter.test.tsx`) can run in parallel `[P]`.

### Dependencies on Other Features

- `visual-identifiers` (`docs/architecture.md` — `apps/web/src/components/Identifier.tsx`, `packages/presets/src/metadata.ts`): Consumed by `ArtifactSetFilter.tsx` to render `<ArtifactBadge setKey={setKey} compact />` for every artifact set in the grid.
- `single-character-optimizer` (`docs/architecture.md` — `packages/engine/src/solver.ts`, `apps/web/src/app/optimize/page.tsx`, `apps/web/src/lib/storage/useGood.ts` `useOptimizerSettings`): Consumed for IndexedDB `settings` persistence and GO solver `ArtSetExclusion` execution.
- `loading-and-bundle` (`docs/architecture.md` — bundle isolation contract): `packages/presets/src/settings.ts` has zero runtime imports from `@gi/engine` or `@genshin-optimizer/gi/wr`.
