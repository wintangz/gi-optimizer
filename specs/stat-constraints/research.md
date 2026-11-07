# Research: Final Stat Constraints (`stat-constraints`)

## Decision 1: `OptimizerSettings.constraints` Schema & Normalization
- **Decision**:
  - Add `STAT_CONSTRAINT_KEYS`, `StatConstraintKey`, and `StatConstraint` (`{ stat: StatConstraintKey; min?: number; max?: number }`) to `packages/presets/src/settings.ts`, and add `constraints?: StatConstraint[]` (default `[]`) to `OptimizerSettings`.
  - Normalize percentage stats (`stat.endsWith('_')`: `enerRech_`, `critRate_`, `critDMG_`, `heal_`, and the 8 `${ele}_dmg_` keys) in display units exactly like `erFloor` (`160` -> `1.60`, `60` -> `0.60`), while keeping flat stats (`hp`, `atk`, `def`, `eleMas`) as raw numbers.
  - Keep `erFloor` 100% intact for backwards compatibility with persisted settings; when both `erFloor` and `constraints` are set, both contribute constraints to the solver.
- **Rationale**:
  - Matches how `erFloor` is persisted in IndexedDB (`settings` store under `'optimizer'`) and normalized in `runSolver`, while never touching preset files or `packages/presets/src/schema.ts`.

## Decision 2: Carrying `min` and `max` Constraints Through Solver Setup, Upfront Total, and Workers
- **Decision**:
  - Extend `OptConstraint` / `OptProblemInput['constraints']` in `packages/engine/src/solver.ts` so each constraint entry has `{ value: NumNode; min: number; max?: number }`.
  - In `runSolver`, each active constraint in `settings.constraints` compiles its `input.total[stat]` node via `optimize(unoptimizedNodes, workerData, ...)` and attaches `min: normMin ?? Number.NEGATIVE_INFINITY` and `max: normMax ?? Number.POSITIVE_INFINITY`.
  - In `computeUpfrontTotal(problem)` (and `GOSolver.prototype.preprocess` via `preprocessCache`), expand each constraint `{ value, min, max }`:
    - If `min > Number.NEGATIVE_INFINITY`, push `{ value, min, isMax: false }`.
    - If `max !== undefined && max < Number.POSITIVE_INFINITY`, push `{ value: prod(-1, value), min: -max, isMax: true }` (mirroring GO's `libs/gi/pando-solver/src/index.ts` lines 108–110 & 152–155).
  - When any `max` constraint is active (`hasMaxConstraint === true`), pass `pruneOrder: false` to `pruneAll` and patch `common.ts` in `packages/engine/scripts/build-engine.mjs` so `reaffine` only re-queues `pruneOrder` when `forced.pruneOrder` was initially truthy.
- **Rationale**:
  - `pruneOrder` in `libs/gi/solver/src/common.ts` assumes higher stat values are always monotonically better; disabling `pruneOrder` when a `max` bound is active prevents dominance pruning from discarding lower-stat artifacts needed to stay below `max`, while `pruneArtRange`, `pruneNodeRange`, `reaffine`, `BNBSplitWorker` (`linearUB` / `polyUB`), and `ComputeWorker` enforce `-stat >= -max` (`stat <= max`) and maintain `tested + skipped === upfrontTotal` identically.

## Decision 3: `/optimize` Constraints Editor UI & Empty State
- **Decision**:
  - Add `heal_` (`{ key: 'heal_', label: 'Healing Bonus', isPercent: true }`) to `DISPLAY_STATS` in `apps/web/src/app/optimize/page.tsx` so all 16 final stats are listed.
  - Render a Stat Constraints editor next to the ER floor control in `apps/web/src/app/optimize/page.tsx` with an `+ Add Constraint` button and rows of `[stat select] [min input] [max input] [remove button]`.
  - Update the empty-result state banner (`optResult.builds.length === 0`) to state that constraints could not be met.
- **Rationale**:
  - Directly satisfies all UI requirements while keeping the existing `/optimize` page layout and styling consistent.
