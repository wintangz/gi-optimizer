# Feature Specification: Final Stat Constraints (`stat-constraints`)

**Feature**: `stat-constraints` (slug; the git commit is the version)

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "GOAL: Like GO, the user can set constraints on final stats — not only the ER floor. Constraints are user settings (persisted with the other optimizer settings); they must NEVER be stored in presets. REQUIRED: 1. Settings gain a constraints list: entries of { stat, min?, max? } (at least one of min/max set). Stat choices = the final stats the results panel already displays: hp, atk, def, eleMas, enerRech_, critRate_, critDMG_, heal_, and each element's dmg_ (physical + 7 elements). The existing erFloor setting keeps working exactly as today (do not break persisted settings); new constraints are additional. 2. Solver: each constraint contributes its stat's total node with its min and/or max to the solver problem's constraints. The current plumbing passes only min — extend it to carry max through problem setup, upfront-total computation and the workers, mirroring how GO's own optimizer passes min/max constraints into its solver. Percentage stats are entered and normalised in display units exactly like the ER floor (160 means 160%); flat stats are raw numbers. tested + skipped == total must still hold exactly, and impossible constraint combinations return an empty result (same behaviour as an impossible ER floor today). 3. UI (/optimize): a constraints editor next to the ER floor control — rows of [stat select] [min input] [max input] [remove button], plus an add-constraint button; empty min or max means unbounded on that side. When constraints are active and no build satisfies them, the empty state says constraints could not be met. 4. TESTS: a min constraint is respected by every returned build; a max constraint likewise; a min+max band works; an impossible band returns empty; ER floor behaviour unchanged; constraint + ER floor together work. CONSTRAINTS (this feature): no changes to damage formulas or GO sheets; ER still never enters the objective; presets and the preset schema are untouched by this feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persisted Final Stat Constraints in Optimizer Settings (Priority: P1)

Users can configure an arbitrary list of final-stat constraints (`constraints: Array<{ stat, min?, max? }>`) in `OptimizerSettings` alongside the existing `erFloor` setting:
- Supported stats are the 16 final stats displayed in the results panel: `hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`, `heal_`, `pyro_dmg_`, `hydro_dmg_`, `electro_dmg_`, `cryo_dmg_`, `anemo_dmg_`, `geo_dmg_`, `dendro_dmg_`, and `physical_dmg_`.
- Persisted `OptimizerSettings` without `constraints` hydrate cleanly with `constraints: []`, and `erFloor` continues to work identically on its own or combined with `constraints`.
- Constraints are never stored in presets or the preset schema.

**Why this priority**: Real builds often require minimum CRIT Rate, EM thresholds, HP/DEF breakpoints, or maximum CRIT Rate caps (e.g. avoiding overcap past 100%) in addition to Energy Recharge floors.

**Independent Test**: Unit-test `OptimizerSettings` defaults, normalization helpers, and backwards compatibility with persisted settings lacking `constraints`.

**Acceptance Scenarios**:

1. **Given** legacy persisted `OptimizerSettings` with `erFloor: 1.6` and no `constraints` field, **When** merged with `DEFAULT_OPTIMIZER_SETTINGS`, **Then** `erFloor` remains `1.6` and `constraints` defaults to `[]`.
2. **Given** a constraint on a percentage stat (`critRate_`, `critDMG_`, `enerRech_`, `heal_`, or `${ele}_dmg_`) in display units (e.g. `min: 60`, `max: 85`, or `min: 160`), **When** normalized for the solver, **Then** it converts to GO's decimal representation (`0.60`, `0.85`, `1.60`), while flat stats (`hp`, `atk`, `def`, `eleMas`) remain raw unscaled numbers.

---

### User Story 2 - Solver Min/Max Constraint Enforcement & Upfront-Total Parity (Priority: P1)

When `session.optimize(preset, settings)` runs:
- Each active entry in `settings.constraints` (where at least one of `min` or `max` is finite) contributes its `input.total[stat]` node with its normalized `min` and/or `max` to `problem.constraints`.
- `computeUpfrontTotal`, `GOSolver.preprocess`, `BNBSplitWorker`, and `ComputeWorker` enforce both `min` (`stat >= min`) and `max` (`-stat >= -max` via `prod(-1, stat)`) bounds.
- `tested + skipped === total` (`upfrontTotal`) holds strictly on every run, and impossible constraints (or inverted `min > max` bands) return `builds: []`.

**Why this priority**: Solver correctness, branch-and-bound pruning accuracy, and exact progress accounting (`tested + skipped === total`) are core invariants of `@gi/engine`.

**Independent Test**: Run `session.optimize` with (a) a `min` constraint, (b) a `max` constraint, (c) a `min + max` band, (d) an impossible band, (e) `erFloor` alone, and (f) `erFloor` + stat constraints together; verify every returned build satisfies all active bounds via `session.evaluate` and `tested + skipped === total` holds on every run.

**Acceptance Scenarios**:

1. **Given** a `min` constraint (e.g. `atk` or `critRate_`), **When** `session.optimize` completes, **Then** every returned build has `ev.stats[stat] >= min` and `tested + skipped === total`.
2. **Given** a `max` constraint (e.g. `critRate_` or `atk`), **When** `session.optimize` completes, **Then** every returned build has `ev.stats[stat] <= max` and `tested + skipped === total`.
3. **Given** a `min + max` band on a stat, **When** `session.optimize` completes, **Then** every returned build satisfies `min <= ev.stats[stat] <= max` and `tested + skipped === total`.
4. **Given** an impossible constraint or inverted band (`min > max`), **When** `session.optimize` completes, **Then** `builds` is `[]` and `tested + skipped === total`.
5. **Given** both `erFloor` and `constraints`, **When** `session.optimize` completes, **Then** every returned build satisfies both `erFloor` and all `constraints`.

---

### User Story 3 - `/optimize` Constraints Editor UI & Empty-State Feedback (Priority: P1)

On `/optimize`, next to the ER floor control:
- Users can add, edit, and remove stat constraint rows (`[stat select] [min input] [max input] [remove button]`) and click an `+ Add Constraint` button.
- Leaving `min` or `max` empty leaves that side unbounded (`undefined`).
- When optimization finishes with `builds.length === 0`, the empty-state message clearly states that constraints could not be met.

**Why this priority**: Exposes the final-stat constraints capability in the optimizer UI with immediate persistence in IndexedDB.

**Independent Test**: Render the `/optimize` constraints editor and empty-state banner in tests; verify stat selector options, min/max inputs, add/remove controls, and the "constraints could not be met" empty state.

**Acceptance Scenarios**:

1. **Given** the `/optimize` settings panel, **When** rendered, **Then** the stat constraints editor appears next to the ER floor control with an add-constraint button and rows of `[stat select] [min input] [max input] [remove button]`.
2. **Given** an optimization result with `builds.length === 0`, **When** rendered on `/optimize`, **Then** the empty state informs the user that constraints could not be met.

### Edge Cases

- **Dominance pruning (`pruneOrder`) with `max` constraints**: `pruneOrder` in `@genshin-optimizer/gi/solver` assumes all artifact stats are monotonically increasing (higher is always better). When any `max` constraint is active, `pruneOrder` MUST be disabled (including inside `reaffine`'s dependency chain) so lower-stat artifacts required to stay below `max` are never discarded by dominance pruning, while `pruneArtRange`, `pruneNodeRange`, `reaffine`, and `linearUB` remain active.
- **Unbounded constraint rows in UI**: A newly added UI row where both `min` and `max` are currently blank (`undefined`) is persisted in UI state while the user edits it, and ignored by the solver until at least one of `min` or `max` is set.
- **Multiple constraints on the same stat**: If the user adds multiple rows for the same stat, all of them are enforced (effectively intersecting their `[min, max]` intervals).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/presets/src/settings.ts` MUST define `STAT_CONSTRAINT_KEYS` (the 16 final stats: `hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`, `heal_`, `pyro_dmg_`, `hydro_dmg_`, `electro_dmg_`, `cryo_dmg_`, `anemo_dmg_`, `geo_dmg_`, `dendro_dmg_`, `physical_dmg_`), `StatConstraintKey`, and `StatConstraint` (`{ stat: StatConstraintKey; min?: number; max?: number }`), and add `constraints?: StatConstraint[]` to `OptimizerSettings` with default `[]`.
- **FR-002**: `packages/engine/src/solver.ts` MUST extend `OptProblemInput.constraints` to carry `{ value: NumNode; min: number; max?: number }`, normalize percentage stats in display units (e.g. `160 -> 1.60`, `60 -> 0.60`) and flat stats as raw numbers, and encode `max` bounds as `prod(-1, value) >= -max` through `computeUpfrontTotal`, `GOSolver.preprocess`, `BNBSplitWorker`, and `ComputeWorker`.
- **FR-003**: When any `max` constraint is active, `pruneAll` MUST NOT run `pruneOrder` (both initially and after `reaffine`), preserving all lower-stat artifacts that may be needed to satisfy `stat <= max` and maintaining `tested + skipped === total` exactly.
- **FR-004**: `apps/web/src/app/optimize/page.tsx` MUST include `heal_` in `DISPLAY_STATS`, render a constraints editor next to the ER floor control with `[stat select] [min input] [max input] [remove button]` rows and an add-constraint button, and display a message stating that constraints could not be met when `optResult.builds.length === 0`.
- **FR-005**: Presets (`packages/presets/data/**`) and the preset schema (`packages/presets/src/schema.ts`) MUST NOT be modified by this feature, and Energy Recharge MUST never enter the objective function.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Solver tests pass for: `min` constraint, `max` constraint, `min + max` band, impossible band (`builds: []`), `erFloor` unchanged, and `erFloor` + `constraints` together, with `tested + skipped === total` verified on every run.
- **SC-002**: Component/unit tests verify settings normalization and the `/optimize` constraints editor + empty-state message.

## Assumptions

- **SC-A1 (Display vs Decimal Percentage Normalization)**: Following `erFloor`'s convention (`160` -> `1.60`, `1.6` -> `1.60`), percentage stats (`stat.endsWith('_')`) entered in display units (`160` for `160%`, `60` for `60%`) are divided by `100`, while already-normalized decimal inputs in programmatic callers (`<= 10` for `enerRech_`, `<= 2` for other `_*` stats) are preserved as-is.
- **SC-A2 (New Constraint Row Default in UI)**: Clicking "Add Constraint" in the `/optimize` UI appends a row defaulting to the first unconstrained stat in `STAT_CONSTRAINT_KEYS` (or `'critRate_'`) with `min: undefined, max: undefined` so the user can immediately type either a `min`, a `max`, or both; solver execution filters constraints via `isActiveStatConstraint` (`min !== undefined || max !== undefined`).
