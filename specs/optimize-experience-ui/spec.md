# Feature Specification: Optimize Experience UI (`optimize-experience-ui`)

**Feature Branch**: `optimize-experience-ui`  
**Created**: 2026-11-07  
**Status**: Approved  

## Assumptions Logged

1. **Legacy `erFloor` Migration**: When loading or normalizing `OptimizerSettings` via `migrateOptimizerSettings(raw)`, if `raw.erFloor` is a finite number `> 0` and `raw.constraints` does not already contain an entry with `stat === 'enerRech_'`, an entry `{ stat: 'enerRech_', min: raw.erFloor }` is prepended to `constraints` and `erFloor` is cleared (`undefined`). If an `enerRech_` constraint already exists in `raw.constraints`, it is preserved without duplication.
2. **Single Constraint Source in Solver**: `runSolver` normalizes incoming settings with `migrateOptimizerSettings(settings)` and reads constraints exclusively from `constraints`. Because `normalizeStatConstraintValue('enerRech_', min)` normalizes both display percentages (`160` -> `1.60`) and legacy decimals (`1.6` -> `1.60`), an `enerRech_` min constraint produces identical solver nodes, pruning, and builds as the legacy `erFloor`.
3. **Comparison List Row Structure**: Each row in the results comparison list displays:
   - Row rank badge (`Current` for the pinned current build row; `#1`..`#N` for optimized builds, with `#1` visually highlighted as best).
   - Big rotation total number + percentage delta vs `Current` (`+X.X%` in green `.ok` when above current, `-X.X%` in red `.error` when below current, `0.0%` when equal, or `Baseline` on the `Current` row).
   - Proportional horizontal bar scaled to the highest total in the list.
   - Five artifact badges (`flower`, `plume`, `sands`, `goblet`, `circlet`) using `ArtifactBadge`.
   - Seven core final stat chips (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`) using `StatChip`.
   - Clicking/tapping a row expands its per-instance rotation breakdown, slot-by-slot artifact details, and `Verify GO (.json)` export button.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Constraints Card & Legacy ER Migration (Priority: P1)

Users manage all final-stat floors and caps—including Energy Recharge—through a single **Constraints** card with a visual stat-chip picker rather than a separate ER floor input and CRUD table. Existing users with a persisted `erFloor` automatically keep their floor as an `enerRech_` constraint.

**Acceptance Scenarios**:

1. **Given** persisted settings with `erFloor: 160` (or `1.6`) and no `enerRech_` constraint, **When** settings are loaded/migrated, **Then** `constraints` contains `{ stat: 'enerRech_', min: 160 }` (or `1.6`) and no duplicate is added if `enerRech_` already exists.
2. **Given** no active constraints, **When** viewing the Constraints card on `/optimize`, **Then** it shows `"No constraints. Add one to set floors or caps, e.g. ER at least 160%."` and clicking `"Add constraint"` opens a stat picker grid of selectable stat chips with already-added stats disabled.

---

### User Story 2 - Multi-Build Comparison List (Priority: P1)

After running optimization, users see a ranked comparison list with their `Current` build pinned first followed by all `topN` optimized builds, each showing total damage, `%` delta vs current, proportional bar, 5 artifact badges, 7 final stat chips, and expandable per-instance breakdown.

**Acceptance Scenarios**:

1. **Given** a current build and $N$ optimized builds (some higher and some lower than current), **When** the results list renders, **Then** `Current` is pinned first, `#1` is highlighted as best, deltas show `+x.x%` for higher builds and `-x.x%` for lower builds, and clicking any row expands its per-instance rotation breakdown.

---

### User Story 3 - Polished Card Layout on `/optimize` (Priority: P1)

The `/optimize` page is organized into three clear card sections—**Setup**, **Constraints**, and **Results**—with consistent control heights, aligned grids, and styled empty/loading cards.

## Requirements *(mandatory)*

- **FR-001**: Remove the standalone ER floor input from `/optimize`; represent ER floor as `{ stat: 'enerRech_', min }` in `settings.constraints`.
- **FR-002**: Implement `migrateOptimizerSettings` to convert legacy `erFloor` into `{ stat: 'enerRech_', min: erFloor }` when no `enerRech_` constraint exists, and make `constraints` the sole constraint source in `runSolver`.
- **FR-003**: Render the Constraints card with stat-chip rows (`StatChip` + min/max inputs with `%` unit for percent stats + remove icon-button), a selectable stat-chip picker grid with already-added stats disabled, and the one-line empty state `"No constraints. Add one to set floors or caps, e.g. ER at least 160%."`.
- **FR-004**: Replace the two-bar summary on `/optimize` with a ranked build comparison list (`Current` pinned first + `#1..#N` builds) with proportional bars, `%` delta vs current, 5 `ArtifactBadge`s, 7 `StatChip`s (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`), best-build highlight, and expandable per-instance breakdown.
- **FR-005**: Organize `/optimize` into **Setup**, **Constraints**, and **Results** card sections with zero damage-formula, solver-math, or golden-fixture changes.
