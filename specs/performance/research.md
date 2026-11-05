# Research & Technical Decisions: Engine & Web Performance Optimization (`performance`)

## 1. Lazy Client-Only Engine Loading & Shared Worker Singleton

- **Decision**: Replace top-level value imports from `@gi/engine` in `apps/web/src/app/optimize/page.tsx` and `apps/web/src/app/teams/page.tsx` with `import type` declarations, and route all runtime engine operations through a shared client singleton `apps/web/src/lib/engine/workerClient.ts` backed by `apps/web/src/workers/optimizer.worker.ts` (with lazy `await import('@gi/engine')` fallback when `typeof Worker === 'undefined'`).
- **Rationale**: `@gi/engine` transitively imports `@genshin-optimizer/gi/sheets`, `@genshin-optimizer/gi/wr`, and `@genshin-optimizer/gi/stats`, which compile thousands of formula nodes on module evaluation. Bundling `@gi/engine` synchronously into page components violates `docs/architecture.md` ("Load the engine only on `/optimize` and `/teams` via dynamic import, client-side only") and blocks initial route rendering. Moving all engine execution into the persistent Web Worker keeps `@gi/engine` out of the main-thread synchronous bundle and prevents UI jank during preset evaluation and live previews.
- **Alternatives Considered**:
  - `next/dynamic` wrapper around page components while keeping synchronous `createSession` on the main thread: still freezes the main thread whenever `createSession` or `session.evaluate` runs.
  - Spawning a new `Worker` on every `startOptimization()` call: re-imports the GOOD database on every optimization and leaves `evaluate()` on the main thread.

## 2. Single Hydrated `ArtCharDatabase` & Non-Mutating `hydratePresetTeam`

- **Decision**: In `packages/engine/src/session.ts`:
  - `createSession(good)` constructs a single `ArtCharDatabase(1, new SandboxStorage())` and calls `db.importGOOD(goodObj, false, false, false)` once.
  - Introduce `hydratePresetTeam(db: ArtCharDatabase, preset: Preset): { teamId: string; targetTeamCharId: string }` which clears only `db.teams.clear()`, `db.teamChars.clear()`, and `db.buildTcs.clear()` on that existing `db` (or caches `{ teamId, targetTeamCharId }` by a deterministic JSON fingerprint of the preset's team/rotation/enemy/conditionals) and creates the preset's `teamChars`, `buildTcs`, and `teams` entries without touching `db.arts`, `db.weapons`, or `db.chars` equipped locations.
  - `session.evaluate(preset, selection)` calls `hydratePresetTeam(baseDb, preset)` and passes `selection` via `overrideArts` and `overrideWeapon` to `getTeamData(baseDb, teamId, targetTeamCharId, 0, overrideArts, overrideWeapon)`. When `selection` is omitted, `overrideArts` and `overrideWeapon` are `undefined`, so GO uses the target character's equipped build from `baseDb`.
  - `session.optimize(preset, settings, opts)` calls `hydratePresetTeam(baseDb, preset)` on `baseDb` and passes `baseDb` to `runSolver`.
  - Only `session.exportGODatabase(preset, selection)` (and the legacy `hydrateTeamIntoDb(goodData, preset, selection)` helper used for standalone export/tests) creates a fresh `ArtCharDatabase` with `selection` mutated onto `location` so "Verify in GO (.json)" downloads a self-contained GO database without dirtying `baseDb`.
- **Rationale**: Previously, `createSession(good)` imported `good` into `baseDb`, and then every `session.evaluate()` and `session.optimize()` call invoked `hydrateTeamIntoDb(goodObj, preset)` which created a brand-new `ArtCharDatabase` and ran `db.importGOOD(goodData)` again! On a 1,157-artifact GOOD file, `importGOOD` parses, validates, and indexes every artifact, weapon, and character on every single evaluation. Reusing `baseDb` reduces preset evaluation from full database import + graph build to just team setup + `getTeamData`.
- **Alternatives Considered**:
  - Mutating `baseDb.arts` and `baseDb.weapons` locations during `evaluate`: unnecessary because GO's `getTeamData(db, teamId, teamCharId, mainStatAssumptionLevel, overrideArt, overrideWeapon)` natively accepts `overrideArt?: ICachedArtifact[] | ArtifactData` and `overrideWeapon?: ICachedWeapon`, and mutating locations would corrupt `currentBuild(preset)`.

## 3. Module-Level Catalog Caching & `weaponType` Filtering in `catalog.ts`

- **Decision**: In `packages/engine/src/catalog.ts`:
  - Maintain module-level caches: `targetCache = new Map<string, TargetDescriptor[]>()` and `conditionalCache = new Map<string, ConditionalDescriptor[]>()`.
  - Maintain a single shared module-level scratch `ArtCharDatabase` (`scratchDb`) instead of calling `baseDb.exportGOOD()` + `db.importGOOD()` on every catalog query.
  - Precompute global conditional descriptors once per process (lazily on first call):
    - `globalArtifactConditionals`: scan `allArtifactSetKeys` once.
    - `weaponConditionalsByType`: group `allWeaponKeys` by `getWeaponStat(wKey).weaponType` (`allStats.weapon.data[wKey].weaponType` from `@genshin-optimizer/gi/stats`) and scan each weapon sheet once per `WeaponTypeKey`.
    - `globalResonanceAndReactionConditionals`: scan `resonanceSheets` and `reactionConditionals` once.
  - In `listConditionalsForCharacter(characterKey)`, resolve `cKey` (`Traveler` → `TravelerAnemo`), look up `weaponType = getCharStat(cKey).weaponType` (`allStats.char.data[locCharKey].weaponType`), combine character sheet conditionals + `globalArtifactConditionals` + `weaponConditionalsByType.get(weaponType)` + `globalResonanceAndReactionConditionals` (deduplicated by `sheet:key`), and store in `conditionalCache`.
- **Rationale**: Previously, `buildScratchUiData` exported and re-imported the entire `baseDb` GOOD payload on every call, and `listConditionalsForCharacter` scanned all 40+ artifact sets and all 180+ weapons (including bows, catalysts, claymores, polearms for a sword character) on every call for each of the 4 team members. Sheet conditionals are static metadata in GO; caching per character and pre-grouping weapons by `weaponType` eliminates >95% of work on cold calls and makes warm calls O(1) map lookups (<0.1 ms).
- **Alternatives Considered**:
  - Passing `baseDb` into `buildScratchUiData` to make target/conditional catalogs depend on user artifacts: GO's display target paths (`normal`, `skill`, `burst`, etc.) and sheet conditional descriptors depend on the character's sheet at C6/A6 (`level: 90, ascension: 6, constellation: 6`), not on the user's artifact inventory.

## 4. Lazy Feasible Permutation Iteration in `solver.ts`

- **Decision**: In `packages/engine/src/solver.ts`, remove `const perms = Array.from(filterFeasiblePerm(artSetPerm(exclusion, allSets), arts))` and the up-front `for (const perm of perms) { total += countBuilds(filterArts(arts, perm)) }` loop. Instead, iterate directly over `for (const perm of filterFeasiblePerm(artSetPerm(exclusion, allSets), arts))` in the main solve loop, incrementing `total += countBuilds(filterArts(arts, perm))` as each permutation is entered and reporting `{ tested, skipped, total }` via `opts?.onProgress`.
- **Rationale**: Materializing all feasible set permutations into an array and running `filterArts` + `countBuilds` across every permutation before `BNBSplitWorker` starts delays time-to-first-split and duplicates `filterArts` work. Lazy iteration starts branch-and-bound pruning immediately on the first permutation and reaches the exact same final `total` when the generator finishes.
- **Alternatives Considered**:
  - Estimating `total` without `countBuilds`: inaccurate final progress total; accumulating `countBuilds(filterArts(arts, perm))` per visited permutation inside the lazy loop is lightweight and preserves exact final build counts.

## 5. Reproducible Acceptance Benchmark (`packages/engine/test/perf-benchmark.test.ts`)

- **Decision**: Add `packages/engine/test/perf-benchmark.test.ts` that loads `vendor/genshin-optimizer/libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json` (81 characters, 1,157 artifacts) and bundled presets (`akasha/furina-salon-pjc-c0`, `official/neuvillette-hypercarry`, `akasha/hutao-homavape-c1`, `akasha/raiden-hyper-soss-c0`) and records high-resolution `performance.now()` timings for:
  1. Cold session hydration (`createSession(good)`) + first preset evaluation (`session.evaluate(furinaPreset, currentBuild)`).
  2. Warm preset switch (`session.evaluate(hutaoPreset)` and `session.evaluate(raidenPreset)` on the already-hydrated session).
  3. Current-build and override-build evaluation (`session.evaluate(furinaPreset, selection)`).
  4. Full optimization run (`session.optimize(furinaPreset, DEFAULT_OPTIMIZER_SETTINGS)`).
  5. Cold and warm 4-member team catalog lookups (`listTargetsForCharacter` + `listConditionalsForCharacter` for `['Furina', 'Neuvillette', 'KaedeharaKazuha', 'Baizhu']`).
- **Rationale**: Runs directly under Vitest (`pnpm --filter @gi/engine test perf-benchmark`) with deterministic assertions on both numerical accuracy and performance budgets.
- **Alternatives Considered**:
  - Browser-only benchmark: harder to run headlessly in CI/Vitest; a Vitest benchmark in `packages/engine/test/perf-benchmark.test.ts` exercises the exact engine code paths deterministically.
