# Feature Specification: Single-Character Optimizer

**Feature**: `single-character-optimizer`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Given a target character and a preset, search the imported artifacts for the build that maximises that character's total damage over the preset's rotation — Akasha-style: sum every damage instance that character does in one (or more) preset rotation. Energy Recharge does NOT enter the calculation. Constraints like an ER floor or whether artifacts equipped on other characters are in the pool are user settings, GO-style, not preset rules. Show current build vs optimised build and the damage difference (total and per damage instance, plus stat diffs). Damage calculation uses the Genshin Optimizer formula base — never rewrite formulas, never a gcsim-style simulator. Verify sample character results against GO itself; a character whose numbers don't match GO within a small tolerance is not done. Optimise ONE character only; team-total is a later feature (out of scope)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluate my current build against a preset rotation (Priority: P1)

A player who has imported their account picks a preset (e.g. "Furina HP C0"). The app checks the
preset against the account part by part; if everything matches, it shows the target character's
**current build** (equipped weapon + artifacts) and its rotation damage: the total for the
preset's rotation(s) and a row per damage instance (label, hits per rotation, damage per hit,
subtotal), plus the character's final stats.

**Why this priority**: It is the foundation of everything else: it proves the numbers are GO's
numbers for the user's real character. Without trustworthy evaluation the optimizer is worthless.

**Independent Test**: Import the sample account, pick a sample preset, and compare the displayed
total and every per-instance number with Genshin Optimizer's own output for the same setup
(relative error ≤ 0.1% per instance).

**Acceptance Scenarios**:

1. **Given** an imported account that owns the preset's target character and satisfies every
   requirement, **When** the user selects the preset, **Then** the current build, rotation total,
   per-instance breakdown and final stats are shown.
2. **Given** a preset with `repeat` = 2, **When** it is evaluated, **Then** every subtotal and the
   total equal twice the single-rotation values.
3. **Given** an account that fails any preset requirement (character missing, constellation,
   weapon, refinement, level, talent), **When** the preset is selected, **Then** each failing part
   is listed in plain English (expected vs actual) and the evaluate/optimise actions are disabled;
   nothing is substituted.
4. **Given** no imported account, **When** the user opens the optimizer, **Then** they are told to
   import a GOOD file first, with a link to the import page.

---

### User Story 2 - Find the build that maximises rotation damage (Priority: P1)

The user presses "Optimise". The app searches the eligible artifact pool for the five-piece
combination that maximises the target's rotation total, honouring the user's optimizer settings.
Progress (builds tested / skipped / total) is shown live and the run can be cancelled. When done,
the best builds (top N) are listed and the best one is compared against the current build: total
difference (absolute and %), per-instance difference, stat differences, and which artifacts change.

**Why this priority**: This is the product's core value.

**Independent Test**: On a small artifact pool, the optimiser's best build equals the best build
found by evaluating every combination exhaustively; on the full sample account (~1000 artifacts,
default settings) the run finishes in under 60 s on a typical laptop.

**Acceptance Scenarios**:

1. **Given** a matching preset and default settings, **When** the user runs the optimiser,
   **Then** progress updates at least once per second and the result lists up to N builds sorted
   by rotation total, best first.
2. **Given** a run in progress, **When** the user presses Cancel, **Then** the search stops within
   2 s, no result is shown as final, and the app remains usable.
3. **Given** a finished run, **When** the user views the comparison, **Then** they see the current
   vs best total, the difference (absolute and %), each damage instance's per-hit and subtotal
   difference, and each final stat's difference (including Energy Recharge, shown for information
   only).
4. **Given** the current build is already optimal, **When** the run finishes, **Then** the best
   build equals the current build and the difference is shown as 0.
5. **Given** an ER floor of 160%, **When** the run finishes, **Then** every listed build has final
   Energy Recharge ≥ 160%; if no build qualifies the user is told plainly that no build meets the
   constraints.
6. **Given** two builds that differ only in Energy Recharge with no ER-to-damage conversion in GO's
   formulas for that setup, **When** ranked, **Then** they have equal totals (ER never weighs in the
   objective).

---

### User Story 3 - Control the search with GO-style settings (Priority: P2)

The user adjusts optimizer settings: ER floor (optional), whether artifacts equipped on other
characters may be used, characters whose artifacts must never be used, main-stat assumption level,
artifact level range, set exclusions (2-piece/4-piece per set, rainbow), and the number of builds
to keep. Settings persist across reloads.

**Why this priority**: Required for real use (protecting other characters' builds, ER needs), but
the optimiser is valuable with defaults alone.

**Independent Test**: Change each setting, reload the page, and confirm it is restored; run the
optimiser and confirm no returned build violates a setting.

**Acceptance Scenarios**:

1. **Given** "include artifacts equipped on others" is off, **When** the optimiser runs, **Then**
   no returned build contains an artifact equipped on another character.
2. **Given** a character in the excluded list, **When** the optimiser runs, **Then** none of that
   character's artifacts appear in any result even if "include equipped on others" is on.
3. **Given** level range 16–20, **When** the optimiser runs, **Then** only artifacts of level 16–20
   are used.
4. **Given** settings were changed, **When** the page is reloaded, **Then** the same settings are
   shown.
5. **Given** a setting is invalid (e.g. level low > level high), **When** the user tries to run,
   **Then** the problem is named and the run is blocked.

---

### User Story 4 - Verify the result in Genshin Optimizer (Priority: P3)

From the comparison view, the user downloads a "Verify in GO" file containing their account, the
preset's team (with teammates, conditionals, enemy settings), the rotation as a GO custom
multi-target and the chosen build. Importing it into the live GO site shows the same numbers.

**Why this priority**: Builds trust and gives a manual cross-check; the automated golden checks
already guarantee fidelity for sample characters.

**Independent Test**: Export for a sample preset, re-import the file headlessly into GO's own
database code and recompute: the rotation total equals the app's total within 0.1%.

**Acceptance Scenarios**:

1. **Given** a current or optimised build, **When** the user clicks "Verify in GO", **Then** a JSON
   file downloads that GO accepts as a database import.
2. **Given** that file imported into GO, **When** the user opens the team, **Then** the target uses
   the chosen build and the custom multi-target named after the rotation shows the same total.

---

### Edge Cases

- Target owned but has fewer than 5 artifacts equipped: current build is evaluated with what is
  equipped; empty slots are shown as empty.
- A slot has no eligible artifact after filtering: the run is blocked with "no eligible <slot>
  artifacts — loosen filters".
- A rotation path that no longer exists in GO's sheets: instance shows value 0 and a visible
  warning naming the path (GO treats missing paths as 0); presets with unresolved paths cannot be
  optimised.
- Preset weapon requirement: the user may choose among owned weapon instances that satisfy it
  (default equipped); if none satisfies it the match report already fails.
- ER floor unreachable: "no build meets the constraints" with the settings that caused it.
- Very large pools (>1500 artifacts) or loose filters: progress shows the total combination count;
  the user can cancel at any time.
- Imported data changes (re-import) while on the page: the session is rebuilt and old results are
  cleared.
- The search worker fails to start (e.g. browser blocks workers): the error is shown plainly; no
  silent fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute all damage with Genshin Optimizer's own formulas, character,
  weapon and artifact data (pinned GO source). No formula may be re-derived; no action simulator.
- **FR-002**: The rotation total MUST equal the sum over damage instances of (damage per hit ×
  hits per rotation), multiplied by the preset's rotation repeat count — exactly GO's custom
  multi-target value × repeat.
- **FR-003**: Energy Recharge MUST NOT be part of the objective. Only GO formula terms that convert
  ER into damage (e.g. Emblem of Severed Fate, Raiden burst) may make ER affect damage.
- **FR-004**: System MUST optimise exactly one character (the preset's target) using the preset's
  team, teammate builds, conditionals, enemy and reaction settings unchanged.
- **FR-005**: System MUST refuse to evaluate or optimise when the preset's match report against the
  account contains any failing part, and MUST list each failure in plain English.
- **FR-006**: System MUST show current vs optimised build: total (absolute and % difference),
  per-instance per-hit and subtotal differences, final-stat differences, and changed artifacts.
- **FR-007**: System MUST list up to N best builds (N = user setting, default 5), sorted by total.
- **FR-008**: System MUST support settings: optional ER floor; include artifacts equipped on other
  characters (on/off); excluded characters; main-stat assumption level (0/4/8/12/16/20); artifact
  level range; set exclusions (2/4 per set, rainbow); top N. Settings MUST persist in the browser.
- **FR-009**: System MUST report search progress (tested, skipped, total) at least once per second
  and allow cancellation at any time.
- **FR-010**: The search MUST run in background workers in the browser; nothing leaves the device.
- **FR-011**: System MUST use GO's existing search pruning; for ~1000 artifacts with default
  settings the search MUST complete in under 60 s on a typical laptop.
- **FR-012**: System MUST let the user download a "Verify in GO" database file containing the
  account, the preset team (teammates, conditionals, enemy), the rotation as a custom multi-target,
  and the chosen build.
- **FR-013**: Each sample character (at least Furina, Neuvillette, Hu Tao with Vaporize, Raiden
  Shogun) MUST have golden fixtures produced by GO's unmodified team calculation; the app's numbers
  MUST match every instance within relative error ≤ 0.1%. Characters failing this are "not done".
- **FR-014**: The target's weapon MAY be any owned weapon instance satisfying the preset's weapon
  requirement (default: equipped); the chosen weapon is fixed during a search.
- **FR-015**: Errors (no data, invalid settings, empty slot pool, worker failure, no build meets
  constraints) MUST be reported plainly with what, where and why.

### Key Entities

- **Engine session**: the user's imported account hydrated into GO's database; lives for the page.
- **Build selection**: weapon instance + one artifact per slot (any slot may be empty).
- **Rotation result**: total, per-instance rows (label, path, count, per-hit, subtotal), final
  stats.
- **Optimizer settings**: the user's GO-style constraints (persisted, global).
- **Optimisation result**: top-N build selections with totals, counts tested/skipped, duration.
- **Comparison**: derived differences between two rotation results.
- **Golden fixture**: a GO-computed reference (setup + every instance value) for a sample
  character.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every sample character, every per-instance value and the total match GO's own
  output within 0.1% relative error.
- **SC-002**: With the sample account (~1150 artifacts) and default settings, a full optimisation
  completes in under 60 s on a typical 8-thread laptop.
- **SC-003**: On a reduced pool where exhaustive search is feasible, the optimiser's best total
  equals the exhaustive maximum (100% of test cases).
- **SC-004**: Cancel stops the search within 2 s in 100% of trials.
- **SC-005**: A user can go from selecting a preset to seeing the current-vs-best comparison in
  ≤ 3 interactions (select preset, optimise, view).
- **SC-006**: 0 returned builds violate any active setting (ER floor, exclusions, level range,
  equipped-on-others rule).

## Assumptions

- **S1 (Weapon fixed per run)**: the optimiser searches artifacts only; the weapon is the user's
  chosen owned instance (default equipped). Weapon search is out of scope (matches GO).
- **S2 (Settings scope)**: optimizer settings are global (one stored record, key `optimizer`), not
  per preset or per character, per docs/architecture.md.
- **S3 (Defaults)**: erFloor undefined; includeEquippedOnOthers = false; excludedCharacters = [];
  mainStatAssumptionLevel = 0; levelLow = 0, levelHigh = 20; no set exclusions; topN = 5;
  lockedOnly = false. Defaults mirror GO's opt-config defaults except "include equipped on others",
  which defaults off to protect other builds.
- **S4 (Search host)**: the GO database and calculation graph live on the page's main thread
  (as in GO itself); the combinatorial search runs in GO's own solver workers. This satisfies
  "optimisation runs in a Web Worker" without re-hosting GO's database in a worker.
- **S5 (Artifact identity)**: build selections reference artifact/weapon ids of the session's GO
  database, which GO assigns deterministically from the GOOD import order; ids are not stable
  across re-imports, so results are cleared on re-import.
- **S6 (Partial builds)**: GO's "allow partial builds" is off: optimised builds always have 5
  artifacts. The current build may be partial.
- **S7 (Missing paths)**: a rotation path not found in GO's display tree contributes 0 (GO
  behaviour) and blocks optimisation with a warning.
- **S8 (Main-stat filters)**: GO's per-slot main-stat filter is not exposed in this feature (not in
  the OptimizerSettings contract); the solver's pruning makes it unnecessary for speed.
- **S9 (Sample characters)**: golden fixtures use the GO sample account
  (Van_2025-07-16_19-59-13.json): Furina C0 + Primordial Jade Cutter (HP scaling, Fanfare
  conditional), Neuvillette C0 (charged attack; explicit artifact selection since he has none
  equipped), Hu Tao C1 + Staff of Homa with a theorycraft Yelan (Vaporize, tc teammate path),
  Raiden Shogun C0 + Staff of the Scarlet Sands (ER-to-damage in GO formulas, global A1).
- **S10 (ER display)**: ER is shown in stat diffs for information; it never affects ranking except
  through GO formulas (global A1).
- **S11 (Gender)**: Traveler gender defaults to 'F' (global A6).
- **S12 (Out of scope)**: team-total optimisation, weapon optimisation, per-slot main-stat filters,
  graph/plot views, build saving into GO's build lists.
- **Dependencies**: `good-import` (stored GOOD and settings store via `src/lib/storage/db.ts`),
  `akasha-presets` (`matchAccount` in `packages/presets/src/match.ts`, bundled preset loading),
  `custom-teams-and-presets` (user presets via storage), `official-presets` (bundled presets).
