# Research: Multi-Select Artifact Set Filter (`artifact-set-filter`)

## Decisions

### 1. First-Class `SetFilterMode` (`'all' | 'exclude' | 'include'`) and Pure Boundary Translation (`packages/presets/src/settings.ts`)
- **Decision**: Persist `setFilterMode: 'all' | 'exclude' | 'include'` and `setFilterSelection: Record<string, (2 | 4)[]>` directly on `OptimizerSettings`, and translate them to Genshin Optimizer's `ArtSetExclusion` (`Record<string, (2 | 4)[]>`) at the solver boundary via `resolveArtSetExclusion(settings, allSetKeys = ALL_ARTIFACT_SET_KEYS)` in `packages/presets/src/settings.ts`.
- **Rationale**:
  - In `vendor/genshin-optimizer/libs/gi/solver/src/common.ts`, GO's solver consumes `exclusion: ArtSetExclusion` in two places:
    1. `pruneExclusion(nodes, exclusion)` (lines 94–126): Prunes threshold formula nodes when a set's 4-piece (`e.includes(4)`) or 2-piece (`e.includes(2)`) bonus is excluded.
    2. `artSetPerm(exclusion, artSets)` & `exclusionToAllowed(exclusion[setKey])` (lines 623–821): Maps each set's excluded piece array `(2 | 4)[]` to the set of allowed piece counts in a 5-slot build:
       - `undefined` or `[]` → `Set([0, 1, 2, 3, 4, 5])` (both 2pc and 4pc allowed)
       - `[2]` → `Set([0, 1, 4, 5])` (2pc/3pc excluded; 4pc bonus or single rainbow off-piece allowed)
       - `[4]` → `Set([0, 1, 2, 3])` (4pc/5pc excluded; 2pc bonus or single rainbow off-piece allowed)
       - `[2, 4]` → `Set([0, 1])` (both 2pc and 4pc excluded; at most 1 rainbow off-piece allowed)
  - Because GO's solver natively operates on `ArtSetExclusion` (`Record<string, (2 | 4)[]>`), translating `'include'` ("Only these sets") at the solver boundary into:
    - Unselected set in `allSetKeys` → `[2, 4]` (neither 2pc nor 4pc allowed)
    - Selected set with `[2, 4]` (both allowed) → omitted from `exclusion`
    - Selected set with `[4]` (4pc only allowed) → `[2]` (2pc excluded, 4pc allowed)
    - Selected set with `[2]` (2pc only allowed) → `[4]` (4pc excluded, 2pc allowed)
    gives exact GO solver semantics without changing `EngineSession.optimize` or modifying vendored GO code.
  - Persisting `setFilterMode: 'include'` and `setFilterSelection` as first-class fields in `OptimizerSettings` (instead of mutating 50+ excluded sets in UI state) means the user's intent ("Only these 2 sets") is preserved cleanly across reloads and future game updates that add new artifact sets to `ALL_ARTIFACT_SET_KEYS`.
- **Alternatives considered**:
  - Having the "Only these sets" UI button merely invert checkboxes in `setExclusion`: Rejected by Requirement 1 & 7 (`'include'` must be a first-class mode persisted in `OptimizerSettings.setFilterMode`, not simulated in the UI by clicking every other set).
  - Putting `resolveArtSetExclusion` inside `packages/engine`: Rejected by Requirement 7 and `docs/architecture.md` (`loading-and-bundle`), which require optimizer settings types, defaults (`DEFAULT_OPTIMIZER_SETTINGS`), and `resolveArtSetExclusion` to live in a pure module (`packages/presets/src/settings.ts`) with zero `@gi/engine` runtime imports so `apps/web` can import them without pulling the engine into initial route bundles.

### 2. Backward Compatibility with Legacy `settings.setExclusion`
- **Decision**:
  - When `settings.setFilterMode` is `undefined`: `resolveArtSetExclusion` returns the normalized entries from `settings.setExclusion ?? {}`.
  - When `settings.setFilterMode === 'all'`: `resolveArtSetExclusion` returns `{}` (unless `setFilterSelection` is `undefined` and `settings.setExclusion` has entries, supporting callers that spread `DEFAULT_OPTIMIZER_SETTINGS` and pass only `setExclusion`).
  - Re-export `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, and `resolveArtSetExclusion` from both `@gi/presets` and `@gi/engine` (`packages/engine/src/types.ts` and `packages/engine/src/index.ts`).
- **Rationale**: Keeps all existing imports and unit tests across `packages/engine` and `apps/web` working without breaking changes.

### 3. Searchable Visual Badge Grid & Bulk Actions (`apps/web/src/components/ArtifactSetFilter.tsx`)
- **Decision**: Build a dedicated controlled component `ArtifactSetFilter` in `apps/web/src/components/ArtifactSetFilter.tsx` that renders:
  - A 3-mode segmented control / radio group (`All sets`, `Exclude selected`, `Only these sets`).
  - A live summary banner computed via `summarizeArtSetFilter(settings, ALL_ARTIFACT_SET_KEYS)` (e.g., `"All 54 artifact sets allowed"`, `"51 of 54 sets allowed (3 excluded)"`, `"Only 3 of 54 sets allowed"`).
  - When mode is `'exclude'` or `'include'`, a toolbar with a text search input and bulk action buttons (`Select all`, `Clear`, `Invert`) operating on the currently visible sets (`visibleSets`), plus a responsive checkbox grid where each set renders `ArtifactBadge` (`compact`) and, when checked, a compact piece-count `<select>` (`Both (2pc + 4pc)` = `'2,4'`, `2pc only` = `'2'`, `4pc only` = `'4'`).
- **Rationale**: Satisfies `visual-identifiers` (every artifact set uses `ArtifactBadge`, never plain text alone) and allows rapid multi-select filtering and piece-count customization.
