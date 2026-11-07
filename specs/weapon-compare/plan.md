# Implementation Plan: Weapon Comparison Mode (`weapon-compare`)

## Technical Context
- **Engine (`packages/engine`)**:
  - `packages/engine/src/types.ts`: Add `WeaponCompareCandidate`, `WeaponCompareRowResult`, `WeaponCompareProgress`, `WeaponCompareResult`, and `EngineSession.compareWeapons`.
  - `packages/engine/src/session.ts`:
    - Add `resolveDefaultWeaponCompareCandidate`, `rankWeaponCompareRows`, and `compareWeapons` (also exposed as `session.compareWeapons`).
    - In `hydrateTeamIntoDb`: support `selection.weaponOverride` (`overrideWeapon`) on non-fixed targets so GO export works for any compared weapon.
  - `packages/engine/src/solver.ts`: Avoid attaching synthetic `akasha_sim_*` `weaponId` when `weaponOverrideSpec` is used on non-fixed targets.
  - `packages/engine/src/index.ts`: Export the new weapon comparison types and helpers.
  - Rebuild `@gi/engine` (`node packages/engine/scripts/build-engine.mjs`).
- **Web App (`apps/web`)**:
  - `apps/web/src/components/TilePickers.tsx`: Support `selectedIds?: readonly string[]` on `WeaponTilePicker` for multi-select weapon tiles.
  - `apps/web/src/components/OptimizeViews.tsx`: Add `WeaponComparisonPanel` (multi-select weapon tile picker + per-weapon Level/Ascension/Refinement controls) and `WeaponComparisonList` (ranked weapon rows, `% behind leader`, `Current Baseline` badge, `"No build meets constraints"` rows, and expandable best-build breakdown with `ArtifactPieceRow` + `StatChip` + rotation instances + `Verify GO`).
  - `apps/web/src/app/optimize/page.tsx`: Integrate `Single Weapon` / `Compare Weapons` mode toggle, run-local multi-weapon selection state, sequential worker execution with progress & cancel keeping completed results, and ranked results view.
  - `apps/web/src/app/globals.css`: Add styling for weapon comparison mode toggle, candidate spec rows, and baseline/leader tags.
- **Tests**:
  - `packages/engine/test/weapon-compare.test.ts`: Test shared stat constraints enforcement across all compared weapons, ER-floor ranking reversal (where `SplendorOfTranquilWaters` wins unconstrained but an ER weapon wins once an `enerRech_` floor is applied), unmet constraints (`status: 'unmet'`), default candidate resolution (owned vs unowned), and mid-run cancellation keeping finished results.
  - `apps/web/test/OptimizeViews.test.tsx`: Test `WeaponComparisonPanel` and `WeaponComparisonList` rendering, owned vs unowned defaults, ranked rows, `% behind leader`, `Current Baseline` marker, `"No build meets constraints"` row, and expandable build details.
