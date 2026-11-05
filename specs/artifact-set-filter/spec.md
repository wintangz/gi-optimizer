# Feature Specification: Multi-Select Artifact Set Filter (All / Exclude / Only These Sets)

**Feature**: `artifact-set-filter` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Replace the one-set-at-a-time exclude dropdown in the optimizer settings on `/optimize` with a comprehensive set-filter panel (`apps/web/src/components/ArtifactSetFilter.tsx`): (1) Three first-class modes (`SetFilterMode = 'all' | 'exclude' | 'include'`): All sets ('all'), Exclude selected ('exclude'), Only these sets ('include' — a first-class mode persisted in `OptimizerSettings.setFilterMode`, not simulated in the UI by manually clicking every other set). (2) All artifact sets (`ALL_ARTIFACT_SET_KEYS`) shown as a searchable checkbox grid with their visual identifier badges (`ArtifactBadge` from `apps/web/src/components/Identifier.tsx`). (3) Bulk actions: Select all, Clear, Invert (operating on the currently filtered/visible sets or full set list). (4) Each selected set keeps the `2pc` / `4pc` / `Both (2pc + 4pc)` choice (`[2]`, `[4]`, or `[2, 4]`), allowing excluding or including a set at 2pc only, 4pc only, or both. (5) A summary line shows how many sets are currently allowed (e.g. 'All 54 artifact sets allowed', '51 of 54 sets allowed (3 excluded)', 'Only 3 of 54 sets allowed'). (6) Persist `setFilterMode` and `setFilterSelection` in the existing `OptimizerSettings` (IndexedDB `settings` store via `useOptimizerSettings`). (7) Translate `(setFilterMode, setFilterSelection, setExclusion)` into GO's `ArtSetExclusion` (`Record<string, (2 | 4)[]>`) at the solver boundary via a pure helper `resolveArtSetExclusion(settings, allSetKeys)` in `packages/presets/src/settings.ts` (consumed by `packages/engine/src/solver.ts`) so the engine contract does not change. (8) Add comprehensive unit tests for `resolveArtSetExclusion` and UI component tests for `ArtifactSetFilter`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Class "Only These Sets" (`include`) & "Exclude Selected" (`exclude`) Modes (Priority: P1)

When optimizing a character on `/optimize`, a player very often wants to restrict the optimizer to only 1–3 relevant artifact sets (for example, allowing only `Marechaussee Hunter` and `Golden Troupe` on Furina, or only `Crimson Witch of Flames` and `Gilded Dreams` on Hu Tao) instead of manually excluding 50+ irrelevant sets one by one from a dropdown. Conversely, a player may want to allow all sets except 1–2 sets (`Exclude selected`), or allow every set without restriction (`All sets`).

The player selects one of three first-class filter modes in the Artifact Set Filter panel:
- **All sets (`'all'`)**: Every artifact set in the game is allowed at both 2-piece and 4-piece bonuses.
- **Exclude selected (`'exclude'`)**: Checked artifact sets are excluded at their chosen piece counts (`2pc`, `4pc`, or `Both 2pc + 4pc`); all unchecked sets remain allowed.
- **Only these sets (`'include'`)**: A first-class persisted mode where **only** the checked artifact sets are allowed at their chosen piece counts (`2pc`, `4pc`, or `Both 2pc + 4pc`), and every unselected artifact set is automatically excluded at both `2pc` and `4pc` when the solver runs.

**Why this priority**: Manually excluding 50+ sets one at a time via a single-select dropdown makes "only optimize with set X or Y" practically unusable. First-class include/exclude/all modes directly remove the biggest UX bottleneck on `/optimize` and narrow the solver search space dramatically when desired.

**Independent Test**: On `/optimize`, switch the Artifact Set Filter to **Only these sets (`include`)**, check 2 sets (e.g., `Golden Troupe` and `Marechaussee Hunter`), run the optimizer, and verify that `resolveArtSetExclusion` excludes every other set in `ALL_ARTIFACT_SET_KEYS` at `[2, 4]` and that the persisted `OptimizerSettings` in IndexedDB stores `setFilterMode: 'include'` and the 2-set `setFilterSelection`.

**Acceptance Scenarios**:

1. **Given** `setFilterMode` is `'all'`, **When** the user views the summary line and runs the optimizer, **Then** the summary reads `"All <N> artifact sets allowed"` (where `<N>` is `ALL_ARTIFACT_SET_KEYS.length`) and `resolveArtSetExclusion` returns `{}`.
2. **Given** `setFilterMode` is `'exclude'` and 3 sets are checked (`GoldenTroupe: [2, 4]`, `MarechausseeHunter: [4]`, `EmblemOfSeveredFate: [2]`), **When** the solver translates settings, **Then** `resolveArtSetExclusion` returns `{ GoldenTroupe: [2, 4], MarechausseeHunter: [4], EmblemOfSeveredFate: [2] }` and the summary reads `"<N - 3> of <N> sets allowed (3 excluded)"`.
3. **Given** `setFilterMode` is `'include'` ("Only these sets") and 3 sets are checked (`GoldenTroupe: [2, 4]`, `MarechausseeHunter: [4]`, `EmblemOfSeveredFate: [2]`), **When** the solver translates settings across all `N` sets, **Then** `resolveArtSetExclusion` marks all `N - 3` unselected sets as `[2, 4]` excluded, marks `MarechausseeHunter` (4pc-only allowed) as `[2]` excluded, marks `EmblemOfSeveredFate` (2pc-only allowed) as `[4]` excluded, omits `GoldenTroupe` (both 2pc and 4pc allowed) from the exclusion map, and the summary reads `"Only 3 of <N> sets allowed"`.
4. **Given** the user selects `'include'` mode and checks 2 sets on `/optimize`, **When** the page is reloaded, **Then** `useOptimizerSettings` restores `setFilterMode: 'include'` and the exact `setFilterSelection` from IndexedDB (`settings` store, key `'optimizer'`).

---

### User Story 2 - Per-Set Piece-Count Granularity (`2pc` / `4pc` / `Both 2pc + 4pc`) (Priority: P1)

For any checked artifact set in either **Exclude selected** or **Only these sets** mode, the user can choose which set-bonus thresholds (`[2]`, `[4]`, or `[2, 4]`) the selection applies to:
- In **Exclude selected (`'exclude'`)** mode:
  - `Both (2pc + 4pc)` (`[2, 4]`): Neither 2-piece nor 4-piece bonus of this set is allowed (at most 1 rainbow off-piece from this set may be used by GO's `artSetPerm`).
  - `2pc only` (`[2]`): Excludes 2-piece/3-piece builds of this set while still allowing a full 4-piece bonus (`[0, 1, 4, 5]` pieces allowed in GO's `exclusionToAllowed`).
  - `4pc only` (`[4]`): Excludes 4-piece/5-piece builds of this set while still allowing 2-piece combinations (`[0, 1, 2, 3]` pieces allowed in GO's `exclusionToAllowed`).
- In **Only these sets (`'include'`)** mode:
  - `Both (2pc + 4pc)` (`[2, 4]`): Both 2-piece and 4-piece bonuses of this set are allowed (no exclusion entry in `ArtSetExclusion`).
  - `4pc only` (`[4]`): Only 4-piece builds of this set are allowed (2-piece is excluded → `exclusion[setKey] = [2]`).
  - `2pc only` (`[2]`): Only 2-piece builds of this set are allowed (4-piece is excluded → `exclusion[setKey] = [4]`).

**Why this priority**: Players frequently want to allow a 4-piece set (like `Golden Troupe` 4pc) or a 2pc+2pc combination (like `Golden Troupe` 2pc + `Marechaussee Hunter` 2pc) without allowing half-sets or full-sets where inappropriate.

**Independent Test**: Select a set in `ArtifactSetFilter`, toggle its piece-count selector between `[2, 4]`, `[2]`, and `[4]`, and verify both the updated `setFilterSelection[setKey]` state and the resulting `resolveArtSetExclusion` output in `'exclude'` and `'include'` modes.

**Acceptance Scenarios**:

1. **Given** a set is newly checked in the grid, **When** no prior piece-count preference exists for that set, **Then** its selection defaults to `[2, 4]` (`Both 2pc + 4pc`).
2. **Given** a checked set in `'include'` mode is changed to `4pc` (`[4]`), **When** `resolveArtSetExclusion` runs, **Then** that set is mapped to `[2]` in `ArtSetExclusion` so GO's `exclusionToAllowed([2])` permits `[0, 1, 4, 5]` pieces (4pc or single rainbow off-piece, disallowing 2pc/3pc).
3. **Given** a checked set in `'include'` mode is changed to `2pc` (`[2]`), **When** `resolveArtSetExclusion` runs, **Then** that set is mapped to `[4]` in `ArtSetExclusion` so GO's `exclusionToAllowed([4])` permits `[0, 1, 2, 3]` pieces (2pc or single rainbow off-piece, disallowing 4pc/5pc).

---

### User Story 3 - Searchable Visual Badge Grid & Bulk Actions (Select All / Clear / Invert) (Priority: P2)

When browsing all artifact sets in `'exclude'` or `'include'` mode, the user sees a responsive scrollable checkbox grid where every artifact set is rendered with its `ArtifactBadge` (from `apps/web/src/components/Identifier.tsx`, never plain text alone). Above the grid, the user can:
- Filter the visible sets by typing a case-insensitive substring of the set's display name or key in a search input.
- Trigger bulk actions — **Select all**, **Clear**, and **Invert** — which update the checked state across the currently visible (search-filtered) artifact sets (or all sets when the search query is empty).

**Why this priority**: With 50+ artifact sets in Genshin Impact, quick text search combined with visual badges and 1-click bulk actions (`Select all`, `Clear`, `Invert`) makes multi-set selection fast and ergonomic.

**Independent Test**: Render `ArtifactSetFilter`, enter a search query (e.g. `"Troupe"` or `"Hunter"`), verify only matching sets are shown with their `ArtifactBadge`, click **Select all**, **Invert**, and **Clear**, and verify `onChange` emits the expected `setFilterSelection`.

**Acceptance Scenarios**:

1. **Given** the filter mode is `'exclude'` or `'include'`, **When** the user views the set grid, **Then** every rendered artifact set displays its `ArtifactBadge` (`compact`) alongside a checkbox and, when checked, a `2pc / 4pc / Both` piece-count selector.
2. **Given** the user types `"emblem"` into the search box, **When** the grid updates, **Then** only artifact sets whose display name or key matches `"emblem"` (case-insensitive) are shown.
3. **Given** a search filter (or full list) is active, **When** the user clicks **Select all**, **Then** all currently visible sets are added to `setFilterSelection` (preserving existing piece counts for already-selected sets and defaulting newly selected sets to `[2, 4]`).
4. **Given** a search filter (or full list) is active, **When** the user clicks **Clear**, **Then** all currently visible sets are removed from `setFilterSelection` (or all sets are cleared when no search filter is active).
5. **Given** a search filter (or full list) is active, **When** the user clicks **Invert**, **Then** every currently visible unselected set becomes selected with `[2, 4]` and every currently visible selected set is unselected.

### Edge Cases

- **Legacy `setExclusion` compatibility**: If an existing stored `OptimizerSettings` object or unit test provides `setExclusion` without `setFilterMode` (i.e. `setFilterMode === undefined`), `resolveArtSetExclusion` falls back to `settings.setExclusion` (and the UI initializes from `setExclusion` if `setFilterMode` is undefined and `setExclusion` is non-empty).
- **Include mode with 0 sets selected**: If the user switches to `'include'` ("Only these sets") and has 0 sets checked, `resolveArtSetExclusion` excludes all sets in `ALL_ARTIFACT_SET_KEYS` at `[2, 4]`, and the summary line clearly states `"Only 0 of <N> sets allowed (no set bonuses allowed)"` with a warning style so the user knows only rainbow builds (up to 1 piece per set) can form.
- **Invalid or duplicate piece counts**: If `setFilterSelection` contains duplicate or unsorted numbers (e.g. `[4, 2]`), `resolveArtSetExclusion` normalizes piece counts to sorted unique `(2 | 4)[]` (`[2]`, `[4]`, or `[2, 4]`), ignoring empty arrays.
- **`'all'` mode hiding/collapsing the grid**: When `setFilterMode === 'all'`, the summary line shows `"All <N> artifact sets allowed"` and any prior `setFilterSelection` is preserved in settings memory so switching between `'exclude'` / `'include'` and `'all'` does not lose the user's checked sets unless they click **Clear**.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `OptimizerSettings` MUST support `setFilterMode?: SetFilterMode` (`'all' | 'exclude' | 'include'`) and `setFilterSelection?: Record<string, (2 | 4)[]>`, alongside legacy `setExclusion?: Record<string, (2 | 4)[]>`.
- **FR-002**: A pure, engine-free module (`packages/presets/src/settings.ts`, re-exported from `@gi/presets` and `@gi/engine`) MUST export `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion(settings, allSetKeys?)`, and `summarizeArtSetFilter(settings, allSetKeys?)`.
- **FR-003**: `resolveArtSetExclusion(settings, allSetKeys)` MUST deterministically translate `(setFilterMode, setFilterSelection, setExclusion)` into GO's `ArtSetExclusion` (`Record<string, (2 | 4)[]>`) as follows:
  - When `setFilterMode === 'all'`: return `{}`.
  - When `setFilterMode === undefined`: return normalized `settings.setExclusion ?? {}`.
  - When `setFilterMode === 'exclude'`: return normalized entries from `settings.setFilterSelection ?? settings.setExclusion ?? {}` where each selected set maps to its excluded piece counts (`[2]`, `[4]`, or `[2, 4]`).
  - When `setFilterMode === 'include'`: for every `setKey` in `allSetKeys`, if `setKey` is not in `setFilterSelection` (or its array is empty), map `setKey` to `[2, 4]`; if `setFilterSelection[setKey]` is `[4]` (4pc only allowed), map `setKey` to `[2]`; if `setFilterSelection[setKey]` is `[2]` (2pc only allowed), map `setKey` to `[4]`; if `setFilterSelection[setKey]` is `[2, 4]` (both allowed), omit `setKey` from the returned exclusion map.
- **FR-004**: `packages/engine/src/solver.ts` MUST call `resolveArtSetExclusion(settings, ALL_ARTIFACT_SET_KEYS)` at the solver boundary instead of reading `settings.setExclusion` directly, keeping the `EngineSession.optimize` signature unchanged.
- **FR-005**: The web app MUST provide `apps/web/src/components/ArtifactSetFilter.tsx` rendering:
  1. Mode selector for `'all'` (**All sets**), `'exclude'` (**Exclude selected**), and `'include'` (**Only these sets**).
  2. Live summary line indicating how many sets of `ALL_ARTIFACT_SET_KEYS.length` are currently allowed.
  3. Search input filtering `ALL_ARTIFACT_SET_KEYS` by display name or key (case-insensitive).
  4. Bulk action buttons (**Select all**, **Clear**, **Invert**) operating on the currently visible sets.
  5. Multi-select checkbox grid where each set is rendered with `ArtifactBadge` (`from '@/components/Identifier'`) and a piece-count selector (`Both 2pc + 4pc` = `[2, 4]`, `2pc only` = `[2]`, `4pc only` = `[4]`) when checked.
- **FR-006**: `/optimize` (`apps/web/src/app/optimize/page.tsx`) MUST replace the legacy one-set-at-a-time exclude `<select>` with `<ArtifactSetFilter />` bound to `useOptimizerSettings()`, persisting `setFilterMode`, `setFilterSelection`, and synchronized `setExclusion` to IndexedDB (`settings` store).
- **FR-007**: Automated unit and component tests MUST cover `resolveArtSetExclusion` (all modes, piece-count permutations, legacy fallback, solver integration) and `ArtifactSetFilter` rendering and interactions.

### Key Entities

- **`SetFilterMode`**: `'all' | 'exclude' | 'include'` — the first-class artifact set filtering mode.
- **`SetFilterSelection`**: `Record<string, (2 | 4)[]>` — map of checked artifact set keys to their active piece counts (`[2]`, `[4]`, or `[2, 4]`).
- **`ArtSetExclusion`**: `Record<string, (2 | 4)[]>` — Genshin Optimizer solver's native set exclusion format produced by `resolveArtSetExclusion`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can restrict optimization to any N artifact sets (e.g. 1–3 sets) in `'include'` ("Only these sets") mode in N+1 clicks (1 mode click + N set clicks), compared to 50+ dropdown selections previously.
- **SC-002**: 100% of `resolveArtSetExclusion` unit test cases (`'all'`, `'exclude'`, `'include'` with `[2]`, `[4]`, `[2, 4]`, empty selection, legacy `setExclusion`, and full `ALL_ARTIFACT_SET_KEYS` coverage) and solver integration tests pass.
- **SC-003**: 100% of artifact sets rendered in `ArtifactSetFilter` display their visual `ArtifactBadge` identifier, and search + bulk actions (**Select all**, **Clear**, **Invert**) accurately transform the selection state in component tests.
- **SC-004**: `setFilterMode` and `setFilterSelection` persist across page reloads via IndexedDB `settings` store (`useOptimizerSettings`).

## Assumptions

- **ASF-A1 (Placement of Pure Settings Module)**: In accordance with `docs/architecture.md` (Bundle Isolation & `artifact-set-filter` contract), `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` are defined in `packages/presets/src/settings.ts` (which has zero runtime dependency on `@gi/engine` or `@genshin-optimizer/gi/wr`) and re-exported from both `@gi/presets` and `@gi/engine` so existing imports of `OptimizerSettings` and `DEFAULT_OPTIMIZER_SETTINGS` from `@gi/engine` remain 100% backward-compatible.
- **ASF-A2 (Bulk Action Scope)**: When a search query is active in `ArtifactSetFilter`, **Select all**, **Clear**, and **Invert** operate on the currently visible (search-filtered) sets so a user can, for example, search `"Hunter"`, click **Select all**, then search `"Troupe"`, and click **Select all** without losing their previous selection. When the search query is empty, they operate on all `ALL_ARTIFACT_SET_KEYS`.
- **ASF-A3 (Preserving Selection Across Mode Toggles)**: Switching `setFilterMode` to `'all'` keeps `setFilterSelection` intact in `OptimizerSettings` while `resolveArtSetExclusion` returns `{}`; if the user switches back to `'exclude'` or `'include'`, their previously checked sets are still available without re-checking.
- **ASF-A4 (Legacy `setExclusion` Migration in UI)**: If a user has legacy `settings.setExclusion` entries in IndexedDB with `setFilterMode === undefined`, `ArtifactSetFilter` treats the effective mode as `'exclude'` (or `'all'` if `setExclusion` is empty) and uses `settings.setExclusion` as the initial `setFilterSelection` so no prior exclusions are lost.
