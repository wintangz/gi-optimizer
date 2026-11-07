# Research: Weapon Comparison Mode (`weapon-compare`)

## Decision 1: Reusing `SimulatedWeaponSpec` (`weaponOverride`) Across All Preset Sources
- **Decision**: Pass `weaponOverride: { key: candidate.weaponKey, level: candidate.level, ascension: candidate.ascension, refinement: candidate.refinement }` to `session.optimize` and `session.evaluate` for every candidate in a weapon comparison.
- **Rationale**: `resolveFixedTargetOverrides` in `packages/engine/src/session.ts` already constructs an `ICachedWeapon` via `buildSimulatedCachedWeapon(weaponOverride)` for both `fixed` (Akasha) and `owned` (Official/User) targets, while `hydratePresetTeam` / `computeDefaultMemberConditionals` automatically populates GO weapon passive conditionals for `effectiveWeaponSpec.key`. For an owned weapon kept at its GOOD `level`/`ascension`/`refinement`, `buildSimulatedCachedWeapon` produces identical base ATK, secondary stat, and passive refinement scaling to the GOOD weapon entry while also allowing the user to tweak level/ascension/refinement run-locally without mutating `baseDb`.
- **GO Export (`hydrateTeamIntoDb`)**: Extend `hydrateTeamIntoDb` in `packages/engine/src/session.ts` so that when `!isFixedTarget && overrideWeapon` (i.e. `selection.weaponOverride` is provided on an `owned` target preset), the simulated weapon is also written into the exported `ArtCharDatabase` on `locKey`, enabling `Verify GO (.json)` on any compared weapon row.

## Decision 2: Pure Engine Comparison & Ranking Helpers (`compareWeapons` and `rankWeaponCompareRows`)
- **Decision**: Add `compareWeapons` (and `session.compareWeapons`) plus `rankWeaponCompareRows` and `resolveDefaultWeaponCompareCandidate` in `@gi/engine`.
- **Rationale**:
  - `compareWeapons` runs `session.optimize` + `session.evaluate` sequentially per candidate weapon using the shared `OptimizerSettings` (`constraints`, `setFilterMode`, `excludedCharacters`, `memberBuildModes`, `memberConditionals`, etc.), supports `AbortSignal` cancellation that preserves already-completed weapons, and records `status: 'unmet'` when `optRes.builds.length === 0`.
  - `rankWeaponCompareRows` sorts all feasible (`status === 'ok'`) rows by `total` descending, assigns `rank = 1..K`, computes `percentBehindLeader = ((leaderTotal - row.total) / leaderTotal) * 100`, and places any `status === 'unmet'` rows after feasible rows.
  - Both `@gi/engine` tests and the web worker client loop share the exact same ranking and candidate resolution logic.

## Decision 3: Multi-Select `WeaponTilePicker` & `/optimize` Mode Toggle
- **Decision**:
  - Extend `WeaponTilePicker` in `apps/web/src/components/TilePickers.tsx` with optional `selectedIds?: readonly string[]` (matching `CharacterTilePicker.selectedKeys`) so it supports multi-selection while keeping single-selection (`value`) unchanged.
  - Add a mode switcher (`Single Weapon` / `Compare Weapons`) and `WeaponComparisonPanel` + `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` and `apps/web/src/app/optimize/page.tsx`.
