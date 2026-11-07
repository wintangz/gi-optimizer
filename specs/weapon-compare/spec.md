# Feature Specification: Weapon Comparison Mode (`weapon-compare`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User request:
> Feature: weapon-compare
>
> Add a weapon comparison mode to the optimize screen. It reuses the current setup exactly as-is — preset, team, Buffs & Passives overrides, stat constraints, artifact set filter, protected characters — with no separate setup flow. The user changes nothing except choosing weapons.
>
> Behaviour:
> 1. The user multi-selects weapons of the target's weapon type from the full game weapon data — owned and unowned. Each selected weapon gets level/ascension/refinement controls: an owned weapon defaults to the user's actual copy, an unowned one to Lv.90/A6/R1. Reuse the existing simulated-weapon override machinery for unowned weapons.
> 2. Run one optimization per selected weapon, sequentially, with overall progress and a cancel that keeps finished weapons' results. Every run uses the SAME optimizer settings, including the same stat constraints — this is the point of the feature: with an ER ≥ 200% constraint set, a crit weapon's build must buy ER from artifacts while an ER weapon gets it free, and the totals decide who really wins. A weapon with no build meeting the constraints shows "no build meets constraints" in its row instead of failing the comparison.
> 3. Results are ranked rows, best total first: weapon icon + name, its spec (Lv./refinement), best total, and % behind the leader. If the target's currently equipped weapon is among them, mark it as the current baseline. Expanding a row shows that weapon's best build (pieces + final stats) in the same presentation as normal optimize results.
> 4. Comparison runs are run-local: they must not mutate the preset, the saved settings, or the normal optimize state. Single-weapon optimize behaviour and all golden fixtures stay byte-identical.
>
> Tests must cover: every returned build satisfies the shared stat constraints, and a constrained ranking case where the unconstrained-best weapon loses once an ER floor applies to all weapons equally.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Weapon Selection with Owned/Unowned Default Specs & Controls (Priority: P1)

On the `/optimize` screen, the user can switch to **Compare Weapons** mode and multi-select weapons matching the target character's weapon type from the full game weapon catalogue (both owned and unowned). When a weapon is selected:
- If the user owns that weapon in their imported GOOD dataset (prioritizing the copy currently equipped on the target character, or the highest-level/refinement owned copy), its specification defaults to the user's actual copy (`level`, `ascension`, `refinement`).
- If the user does not own the weapon, its specification defaults to `Lv.90 / A6 / R1` (`Lv.70 / A4 / R1` for 1★–2★ weapons whose maximum game cap is Lv.70/A4/R1).
- Each selected weapon has per-weapon Level, Ascension, and Refinement controls and reuses the engine's `SimulatedWeaponSpec` (`weaponOverride`) machinery.

**Independent Test**: Resolve default weapon comparison candidates against a GOOD dataset with an equipped weapon, an inventory-owned weapon at custom level/refinement, and an unowned weapon; verify owned weapons default to the GOOD copy's exact `level`/`ascension`/`refinement` (with the equipped copy flagged as `isEquippedBaseline: true`) and unowned weapons default to `Lv.90 / A6 / R1`, and that editing level/ascension/refinement updates the candidate spec.

---

### User Story 2 - Sequential Multi-Weapon Optimization under Shared Settings & Stat Constraints (Priority: P1)

Running a weapon comparison executes one optimization per selected weapon sequentially using the exact same setup (preset, team member build modes, Buffs & Passives conditional overrides, stat constraints, artifact set filter, protected characters).
- Overall progress displays which weapon (`i` of `N`) is currently being optimized along with its solver progress.
- Cancelling mid-comparison aborts the active solver run and preserves the ranked results of all weapons that already finished.
- If a weapon has no artifact build meeting the shared stat constraints (`builds.length === 0`), its row reports `"No build meets constraints"` (`status: 'unmet'`) instead of failing the comparison.

**Independent Test**: Run `compareWeapons` across a CRIT weapon (`SplendorOfTranquilWaters` R1) and an ER weapon (`FavoniusSword` R5):
1. Without an ER floor, `SplendorOfTranquilWaters` ranks `#1`.
2. With a shared `enerRech_` floor (`ER >= 200%`), every returned build across all weapons satisfies `enerRech_ >= 200%`, and `FavoniusSword` beats `SplendorOfTranquilWaters` because the CRIT weapon must sacrifice damage stats on artifacts to buy ER while the ER weapon gets ER from its weapon substat.
3. With a constraint that one weapon cannot meet, that weapon's row has `status: 'unmet'` while feasible weapons still rank normally.
4. Aborting via `AbortSignal` after the first weapon completes returns the completed weapon's result with `cancelled: true`.

---

### User Story 3 - Ranked Comparison Rows, Baseline Marker, & Expandable Build Breakdown (Priority: P1)

Comparison results render as ranked rows ordered by best total damage descending (feasible builds `#1`, `#2`, ... first, followed by any `"No build meets constraints"` rows):
- Each row shows the rank pill, weapon icon + name (`WeaponBadge`), weapon spec (`Lv.X AY · RZ`), best total damage, and `% behind the leader` (`Leader` / `0.0%` on `#1`, `−X.X%` on `#2+`).
- If the target character's currently equipped weapon in GOOD is among the compared weapons, its row is marked with a visible `Current Baseline` badge.
- Expanding a feasible weapon row reveals that weapon's best build (5 `ArtifactPieceRow` pieces, final `StatChip` stats, per-instance rotation breakdown table, and `Verify GO (.json)` export) in the same presentation as normal optimize results.

**Independent Test**: Render `WeaponComparisonList` with ranked feasible rows (including an equipped baseline row) and an unmet-constraint row; verify order, `% behind leader` formatting, `Current Baseline` badge, `"No build meets constraints"` text, and expandable piece/stat/instance breakdown.

---

### User Story 4 - Run-Local Invariant & Zero Mutation of Single-Weapon State (Priority: P1)

Weapon comparison runs are strictly run-local: they never mutate the preset, never persist changes to `OptimizerSettings`, and never overwrite the normal single-weapon optimize state (`optResult`, `currentEval`, `selectedWeaponId`, `akashaWeaponByPreset`). Single-weapon optimize behaviour and all golden fixtures remain byte-identical.

## Assumptions Logged

1. **Unowned 1★–2★ Weapon Cap**: In Genshin Impact, 3★–5★ weapons cap at `Lv.90 / A6 / R1..R5`, whereas 1★–2★ weapons cap at `Lv.70 / A4 / R1`. Unowned 3★–5★ weapons default to `Lv.90 / A6 / R1`, and unowned 1★–2★ weapons default to their game maximum `Lv.70 / A4 / R1` (matching `buildSimulatedCachedWeapon` in `@gi/engine`).
2. **Duplicate Owned Copies**: If a user owns multiple copies of the same weapon key in GOOD, defaulting picks the copy currently equipped on the target character first (and marks it as `Current Baseline`), or otherwise the highest-level / highest-refinement copy in the inventory.
3. **Simulation Override on Owned/Official Presets**: Both unowned weapons and owned weapons (including when the user adjusts an owned weapon's level, ascension, or refinement in the comparison controls) pass `weaponOverride: { key, level, ascension, refinement }` into `session.optimize` and `session.evaluate`, reusing `buildSimulatedCachedWeapon` and auto-populating GO weapon conditionals for the compared weapon key.
