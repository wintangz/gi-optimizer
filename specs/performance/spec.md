# Feature Specification: Engine & Web Performance Optimization

**Feature**: `performance`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Lazy client-only engine loading on /optimize and /teams, single hydrated ArtCharDatabase per EngineSession with off-main-thread Web Worker evaluation and solving, module-level catalog caching with weaponType filtering and debounced live preview on /teams, lazy permutation iteration in solver.ts without up-front countBuilds pass, and reproducible acceptance benchmark script on the 1,157-artifact sample GOOD file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Route Navigation & Non-Blocking Page Loads (Priority: P1)

A player navigates to the `/optimize` or `/teams` views from the home, import, or presets pages. The route shell and controls render immediately without freezing the browser tab while heavy calculation data (character sheets, weapon sheets, artifact formulas) loads asynchronously in the background.

**Why this priority**: Initial route responsiveness determines whether the application feels usable. Bundling or synchronously initializing the entire calculation graph on page mount causes multi-second UI freezes before anything renders.

**Independent Test**: Navigate to `/optimize` and `/teams` in a browser or test runner and verify that the page shell renders immediately and no synchronous calculation engine code is bundled into the initial page module.

**Acceptance Scenarios**:

1. **Given** a user on `/presets` or `/import`, **When** they navigate to `/optimize` or `/teams`, **Then** the page layout and interactive controls render immediately without blocking the main thread on engine initialization.
2. **Given** the `/optimize` and `/teams` source modules, **When** inspected at the top level, **Then** they only import TypeScript `type` declarations from the calculation engine and defer runtime execution to a lazy client-only Web Worker client or dynamic import.

---

### User Story 2 - Fast Preset Switching & Single-Hydration Session Reuse (Priority: P1)

A player who has imported a ~1,000+ artifact GOOD account switches between presets, toggles weapon selections, compares current vs. optimized builds on `/optimize`, or runs an optimization search. The account's artifact and character inventory is imported into the engine database only once per imported dataset, and all subsequent preset evaluations and optimizations reuse that single hydrated database off the main thread.

**Why this priority**: Re-importing a 1,157-artifact GOOD file on every `evaluate()` and `optimize()` call wastes hundreds of milliseconds per evaluation and blocks the main thread during preset switching and build comparison.

**Independent Test**: Create an engine session with the 1,157-artifact sample GOOD file, evaluate multiple presets and build selections sequentially, and verify that GOOD import runs exactly once while preset switching and build evaluation complete in tens of milliseconds without mutating equipped items.

**Acceptance Scenarios**:

1. **Given** an active imported GOOD dataset, **When** `createSession(good)` is called, **Then** the GOOD payload is imported into a single database instance once and reused across all subsequent `currentBuild`, `evaluate`, and `optimize` calls on that session.
2. **Given** an already-hydrated session, **When** `session.evaluate(preset, selection)` is called with different presets or artifact/weapon overrides, **Then** only the team/loadout records are refreshed (or reused by preset fingerprint), `selection` is passed via `overrideArts`/`overrideWeapon` without mutating equipped locations or re-importing GOOD, and the returned numbers match GO golden fixtures within 0.1%.
3. **Given** an already-hydrated worker session on `/optimize`, **When** the user switches presets or selects a different top-N build to compare, **Then** evaluation runs off the main thread via the persistent worker client and returns the updated breakdown without re-hydrating the account.
4. **Given** a user clicking "Verify in GO (.json)", **When** `exportGODatabase(preset, selection)` is invoked, **Then** a clean database export with the selected weapon and artifacts equipped on the target character is produced without corrupting the session's reusable database state.

---

### User Story 3 - Cached Target/Conditional Catalogs & Debounced Live Preview on `/teams` (Priority: P2)

A player opens `/teams` to build or customize a 4-member team and edits preset metadata, conditional buffs, enemy resistances, or rotation hits. Character target lists and conditional catalogs load nearly instantaneously after first access, weapon conditionals only include weapons matching each character's weapon type, and rapid edits to the preset draft are debounced so live rotation damage previews never stutter or block typing.

**Why this priority**: Scanning all 40+ artifact sets and 180+ weapons on an uncached scratch database for every team member makes `/teams` sluggish, and re-running full synchronous evaluations on every keystroke blocks text inputs.

**Independent Test**: Call `listTargetsForCharacter` and `listConditionalsForCharacter` repeatedly for a 4-member team and verify that second calls hit module-level caches in <1 ms, weapon conditionals are filtered to each character's `weaponType`, and `/teams` debounces live preview evaluations (~150 ms) through the shared worker/cached session.

**Acceptance Scenarios**:

1. **Given** `listConditionalsForCharacter(charKey)` is called for a character (e.g., a Sword user), **When** weapon conditionals are collected, **Then** only weapons matching that character's weapon type are included alongside global artifact-set, resonance, and reaction conditionals, and the global sheets are scanned once per process rather than per character call.
2. **Given** `listTargetsForCharacter(charKey)` or `listConditionalsForCharacter(charKey)` has been called once for a character, **When** called again for the same character, **Then** the cached descriptor list is returned immediately from module-level memory without building a new scratch database.
3. **Given** a user typing a preset name or rapidly toggling rotation counts on `/teams`, **When** changes occur within the 150 ms debounce window, **Then** intermediate evaluations are coalesced and the live preview runs off the main thread on the already-hydrated session without input lag.

---

### User Story 4 - Streamlined Solver Start & Reproducible Performance Benchmark (Priority: P2)

When a player starts an optimization run, the solver begins splitting and evaluating artifact permutations immediately without pausing for an up-front full-pass permutation materialization and build count loop. Engineers can run a single reproducible benchmark test on the 1,157-artifact sample account to verify cold hydration, warm preset switching, build evaluation, full optimization, and 4-member team catalog lookup timings.

**Why this priority**: Eliminating redundant up-front work in the solver reduces time-to-first-progress and total solve overhead, while a standardized benchmark prevents performance regressions.

**Independent Test**: Run `packages/engine/test/perf-benchmark.test.ts` against `Van_2025-07-16_19-59-13.json` and verify that all five benchmarked operations complete within target thresholds and produce identical optimization results to the baseline solver.

**Acceptance Scenarios**:

1. **Given** `runSolver` is invoked on an artifact pool, **When** solving begins, **Then** `filterFeasiblePerm` is iterated lazily during the split/compute loop without an up-front `Array.from(filterFeasiblePerm(...))` + `countBuilds` pre-pass, and the returned top-N builds and totals are identical to the baseline solver.
2. **Given** the acceptance benchmark suite is executed on the ~1,157-artifact `Van_2025-07-16_19-59-13.json` file, **When** the benchmark completes, **Then** it reports timings for: (a) cold session hydration + initial evaluation, (b) warm preset switch evaluation on the already-hydrated session, (c) single `session.evaluate` with build override, (d) full `session.optimize` run, and (e) `listTargetsForCharacter` + `listConditionalsForCharacter` for a 4-member team (cold vs. cached).

---

### Edge Cases

- **Dataset replacement / re-import**: When the user imports a new GOOD file (changing `importedAt` or dataset reference), the worker client invalidates its cached `EngineSession` and hydrates the new GOOD dataset once.
- **Concurrent evaluation requests during typing or rapid preset switching**: Stale in-flight `evaluate` requests are superseded by the latest request (or correlated by request ID) so out-of-order responses never overwrite newer UI state.
- **Worker unavailable in headless/test environments**: If `Worker` is undefined (e.g., SSR check or Node unit test), the client helper falls back cleanly to a lazy dynamically-imported in-process singleton session so nothing crashes and the engine is still not statically bundled.
- **`exportGODatabase` isolation**: Calling `exportGODatabase(preset, selection)` with a custom build selection must not leave those override artifacts/weapons equipped in the session's primary `ArtCharDatabase` used by subsequent `currentBuild()` or `evaluate()` calls.
- **Traveler and multi-element character keys in catalog cache**: `Traveler` normalizes consistently (e.g. `TravelerAnemo`) in the module-level catalog caches and weaponType lookup (`sword`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `apps/web/src/app/optimize/page.tsx` and `apps/web/src/app/teams/page.tsx` MUST NOT contain top-level value imports from `@gi/engine` (only `import type` is allowed); all runtime engine usage MUST go through a lazy client-only worker client (`apps/web/src/lib/engine/workerClient.ts`) or dynamic `import('@gi/engine')`.
- **FR-002**: `createSession(good)` in `packages/engine/src/session.ts` MUST instantiate `ArtCharDatabase` and run `importGOOD` at most once per session creation.
- **FR-003**: `hydratePresetTeam(db, preset)` in `packages/engine/src/session.ts` MUST clear and repopulate only `db.teams`, `db.teamChars`, and `db.buildTcs` on the existing `ArtCharDatabase` (or reuse cached team IDs per preset fingerprint) without re-running `db.importGOOD`.
- **FR-004**: `session.evaluate(preset, selection)` and `session.optimize(preset, settings, opts)` MUST reuse the session's single `ArtCharDatabase` instance and pass `selection` via `overrideArts` and `overrideWeapon` into `getTeamData` without mutating equipped locations in `db.arts` or `db.weapons`.
- **FR-005**: `session.exportGODatabase(preset, selection)` MUST produce a clean GO database export with `selection` equipped on the target character without mutating the session's reusable `ArtCharDatabase` instance (e.g., by cloning/hydrating a fresh export database or restoring equipped locations before returning).
- **FR-006**: `apps/web/src/workers/optimizer.worker.ts` and `apps/web/src/lib/engine/workerClient.ts` MUST maintain a persistent worker singleton holding the hydrated `EngineSession` for the active GOOD dataset (keyed by `importedAt` or object reference) and handle request correlation for `init`, `evaluate`, `optimize`, `catalog`, `exportGO`, and `cancel` messages.
- **FR-007**: `packages/engine/src/catalog.ts` MUST cache `listTargetsForCharacter` and `listConditionalsForCharacter` in module-level `Map`s, compute global artifact-set, weapon-by-`weaponType`, resonance, and reaction conditional descriptors once per process, and filter weapon conditionals for a character to only weapons matching `allStats.char.data[cKey].weaponType` (via `getCharStat(cKey).weaponType` and `getWeaponStat(wKey).weaponType`).
- **FR-008**: `/teams` (`apps/web/src/app/teams/page.tsx`) MUST debounce live rotation preview evaluations (150 ms) and execute them asynchronously via the shared worker/cached session so editing fields never recreates a session or blocks the main thread.
- **FR-009**: `runSolver` in `packages/engine/src/solver.ts` MUST iterate lazily over `filterFeasiblePerm(artSetPerm(exclusion, allSets), arts)` during the split/compute loop, accumulating `total` dynamically via `countBuilds(filterArts(arts, perm))` as each permutation is processed, with no up-front `Array.from(filterFeasiblePerm(...))` pre-pass.
- **FR-010**: A reproducible benchmark test (`packages/engine/test/perf-benchmark.test.ts`) MUST measure and report timings on `Van_2025-07-16_19-59-13.json` for cold hydration, warm preset switch, single build evaluation, full optimization, and 4-member team catalog lookups, while preserving 100% parity with existing golden fixtures (`packages/engine/test/golden.test.ts`).

### Key Entities

- **Hydrated EngineSession**: Holds a single `ArtCharDatabase` populated once from `IGOOD`, plus a preset team hydration helper (`hydratePresetTeam`) that updates only team/loadout tables.
- **Engine Worker Protocol**: Typed request/response message envelope (`id`, `type`: `init` | `evaluate` | `optimize` | `catalog` | `exportGO` | `cancel`) connecting `workerClient.ts` on the UI thread to the stateful `EngineSession` in `optimizer.worker.ts`.
- **Catalog Cache**: Module-level `Map`s in `packages/engine/src/catalog.ts` storing per-character `TargetDescriptor[]`, per-character `ConditionalDescriptor[]`, and pre-extracted global conditional templates grouped by artifact set, `WeaponTypeKey`, resonance, and reaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Warm preset switching and single-build `session.evaluate()` on the 1,157-artifact sample account complete in ≤ 50 ms (at least 5× faster than re-importing GOOD on every evaluation).
- **SC-002**: Cached `listTargetsForCharacter` + `listConditionalsForCharacter` for a 4-member team completes in ≤ 5 ms total on warm calls, and cold `listConditionalsForCharacter` for a 4-member team avoids redundant 4× full scans of all 40+ artifact sets and 180+ weapons.
- **SC-003**: Zero top-level runtime value imports from `@gi/engine` exist in `apps/web/src/app/optimize/page.tsx` or `apps/web/src/app/teams/page.tsx`, ensuring static export builds keep `@gi/engine` out of synchronous page bundles.
- **SC-004**: All existing golden fixture tests (`packages/engine/test/golden.test.ts`) and optimizer tests (`packages/engine/test/optimizer.test.ts`) pass with identical damage numbers (relative error ≤ 0.1% vs GO).

## Assumptions

- **P1 (Worker Fallback in Non-Worker Environments)**: When `typeof Worker === 'undefined'` (such as in Node/Vitest or environments without Web Workers), `workerClient.ts` lazily imports `@gi/engine` via `await import('@gi/engine')` and caches a single `EngineSession` instance in memory keyed by `importedAt` / GOOD object reference.
- **P2 (Current Build Resolution)**: `currentBuild(preset)` can either be returned alongside `evaluate` in the worker response or derived directly from the `evaluate` call when `selection` is omitted (or returned by the worker's `evaluate`/`init` handler) so `/optimize` can display both current build artifacts and evaluation results without synchronous main-thread `EngineSession` access.
- **P3 (Progress Total During Lazy Permutation Iteration)**: As `runSolver` lazily iterates over `filterFeasiblePerm`, `total` accumulates `countBuilds(filterArts(arts, perm))` per permutation (or reports `tested + skipped` against the running/completed `total`), ending with the exact same final `tested`, `skipped`, and `total` counts once the loop finishes.
- **P4 (Debounce Window on `/teams`)**: A 150 ms debounce window balances immediate visual feedback with main-thread/worker responsiveness when typing preset names, enemy resistance numbers, or rotation hit counts.
