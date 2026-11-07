# Feature Specification: Deep Artifact Pool Filters (`solver-filters-deep`)

**Feature Branch**: `solver-filters-deep`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User request — add GO-style artifact pool filters (main-stat allowlist per slot, required substats with any-of/all-of mode, artifact level range and minimum rarity, minimum RV threshold) to optimizer settings next to the artifact set filter, defaulting to unrestricted and applying everywhere the pool is used including weapon-compare runs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Main-Stat Allowlist Per Slot (Priority: P1)

Users can restrict which main stats are allowed on each variable-main-stat artifact slot (`sands`, `goblet`, `circlet`, and optionally `flower`/`plume` in settings). When unrestricted (empty allowlist for a slot), all main stats for that slot are allowed.

**Why this priority**: Filtering Sands/Goblet/Circlet main stats (e.g., ER% Sands, Hydro DMG% or HP% Goblet, CRIT Rate/DMG Circlet) is one of the primary ways users prune the artifact pool and explore specific main-stat configurations in Genshin Optimizer.

**Independent Test**: Run `session.optimize` (and `session.compareWeapons`) with `mainStatKeys: { sands: ['enerRech_'] }` and verify that every returned build's Sands piece has `mainStatKey === 'enerRech_'`.

**Acceptance Scenarios**:

1. **Given** `mainStatKeys` is `{}` (default), **When** `filterArtifactsForOptimizer` or `session.optimize` runs, **Then** no artifacts are excluded by main stat and results are byte-identical to unfiltered runs.
2. **Given** `mainStatKeys: { sands: ['enerRech_'], circlet: ['critRate_', 'critDMG_'] }`, **When** `filterArtifactsForOptimizer` runs, **Then** only Sands with `enerRech_` and Circlets with `critRate_` or `critDMG_` remain in the pool.

---

### User Story 2 - Required Substats (`any` or `all` Mode) (Priority: P1)

Users can select one or more substat keys (`requiredSubstats`) and choose whether candidate artifact pieces must contain **any of** (`'any'`) or **all of** (`'all'`) the selected substats.

**Why this priority**: Requiring pieces to have e.g. CRIT Rate or CRIT DMG (`any`) or both CRIT Rate and CRIT DMG (`all`) lets users focus the solver on relevant pieces or enforce substat presence.

**Independent Test**: Run `filterArtifactsForOptimizer` and `session.optimize` with `requiredSubstats: ['critRate_', 'critDMG_']` under `requiredSubstatsMode: 'all'` vs `'any'` and verify that `'all'` keeps only pieces with both substats (`value > 0`) while `'any'` keeps pieces with at least one of them.

**Acceptance Scenarios**:

1. **Given** `requiredSubstats: []` (default), **When** `filterArtifactsForOptimizer` runs, **Then** no artifacts are excluded by substat presence.
2. **Given** `requiredSubstats: ['critRate_', 'critDMG_']` and `requiredSubstatsMode: 'all'`, **When** `filterArtifactsForOptimizer` runs, **Then** every returned artifact has both `critRate_` and `critDMG_` substats with `value > 0`.
3. **Given** `requiredSubstats: ['critRate_', 'critDMG_']` and `requiredSubstatsMode: 'any'`, **When** `filterArtifactsForOptimizer` runs, **Then** every returned artifact has at least one of `critRate_` or `critDMG_` in its substats with `value > 0`.

---

### User Story 3 - Artifact Level Range, Minimum Rarity, and Minimum RV Threshold (Priority: P1)

Users can filter the artifact pool by level range (`levelLow`..`levelHigh`), minimum rarity (`minRarity: 1..5`, default `1`), and minimum Roll Value threshold (`minRv`, default `0`, evaluated via Feature 2's shared `computeArtifactRollValue` implementation).

**Why this priority**: Allows excluding low-rarity fodder or low-RV pieces from the solver pool across both single-weapon and weapon-compare runs.

**Independent Test**: Run `filterArtifactsForOptimizer`, `session.optimize`, and `session.compareWeapons` with `minRarity: 5` and `minRv: 500`, and verify that every candidate artifact in every returned build has `rarity >= 5` and `computeArtifactRollValue(art).totalRv >= 500` (or `totalRvRounded >= 500`).

**Acceptance Scenarios**:

1. **Given** `minRarity: 5`, **When** `filterArtifactsForOptimizer` runs on a pool containing 4★ and 5★ pieces, **Then** all 4★ and lower pieces are excluded.
2. **Given** `minRv: 450`, **When** `filterArtifactsForOptimizer` runs, **Then** only pieces whose shared `computeArtifactRollValue(art)` meets `totalRv >= 450` (within rounding) remain in the pool.
3. **Given** combined filters (`setFilterMode`, `constraints`, `excludedCharacters`, `mainStatKeys`, `requiredSubstats`, `levelLow`/`levelHigh`, `minRarity`, `minRv`), **When** `session.optimize` or `session.compareWeapons` runs, **Then** all filters compose together and apply to every solver invocation.

### Edge Cases

- When `mainStatKeys[slot]` is an empty array `[]` or `undefined`, that slot is unrestricted.
- When `minRv` is `0`, negative, `undefined`, or `NaN`, no RV filtering is performed (saving RV computation overhead on default runs).
- When persisted settings from an older session lack `mainStatKeys`, `requiredSubstats`, `requiredSubstatsMode`, `minRarity`, or `minRv`, `migrateOptimizerSettings` populates their unrestricted defaults (`{}`, `[]`, `'all'`, `1`, `0`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `OptimizerSettings` and `DEFAULT_OPTIMIZER_SETTINGS` in `packages/presets/src/settings.ts` MUST define:
  - `mainStatKeys?: Partial<Record<ArtifactSlotKey, string[]>>` (default `{}`)
  - `requiredSubstats?: string[]` (default `[]`)
  - `requiredSubstatsMode?: 'any' | 'all'` (default `'all'`)
  - `minRarity?: 1 | 2 | 3 | 4 | 5` (default `1`)
  - `minRv?: number` (default `0`)
  alongside existing `levelLow` (default `0`) and `levelHigh` (default `20`).
- **FR-002**: `filterArtifactsForOptimizer` in `packages/engine/src/solver.ts` MUST enforce all new pool filters using the shared `computeArtifactRollValue` from `@gi/good` / `@gi/presets`, short-circuiting when filters are at their unrestricted defaults so default solver behavior and performance are unchanged.
- **FR-003**: `SolverPoolFiltersPanel` in `apps/web/src/components/OptimizeViews.tsx` MUST be rendered on `/optimize` (`apps/web/src/app/optimize/page.tsx`) next to the existing artifact set filter, providing controls for per-slot main-stat allowlist (`sands`, `goblet`, `circlet`), required substats + `Any of` / `All of` toggle, artifact level range & minimum rarity, and minimum RV% threshold.
- **FR-004**: Filters MUST apply identically to single-character optimization and weapon-compare runs.

## Assumptions

- **A-001**: In the UI, main-stat allowlist chips are shown for the three variable main-stat slots (`sands`, `goblet`, `circlet`) matching Genshin Optimizer (`flower` is always Flat HP and `plume` is always Flat ATK), while the engine's `filterArtifactsForOptimizer` checks `settings.mainStatKeys?.[art.slotKey]` for any slot key if provided.
- **A-002**: For `minRv`, an artifact passes when `rv.totalRv + 1e-6 >= minRv || rv.totalRvRounded >= minRv` so pieces whose displayed integer badge equals `minRv` (e.g., `540% RV`) are never unexpectedly excluded by floating-point representation.

## Success Criteria *(mandatory)*

- **SC-001**: With default `OptimizerSettings`, single-character optimization results and all golden fixtures remain 100% byte-identical.
- **SC-002**: Unit and integration tests in `packages/engine` and `apps/web` verify each filter individually and in combination (including in `compareWeapons`).
