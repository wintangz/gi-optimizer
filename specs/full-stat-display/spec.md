# Feature Specification: Full Stat Display (`full-stat-display`)

**Feature Directory**: `specs/full-stat-display`  
**Created**: 2026-11-09  
**Status**: Approved  
**Input**: User description: "Feature: full-stat-display. Run the full Spec Kit flow autonomously; log assumptions, don't ask. One commit: feat: full-stat-display, push when done."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Engine Extracts Full Qualified Stat Universe & Source Attribution (Priority: P1)

As a user optimizing or inspecting teams in GI Optimizer, I need the calculation engine to extract the complete universe of Genshin Optimizer (GO) real stats and hit-scoped additional buffs across all team members—with accurate per-stat source attribution (`StatBreakdown`)—so that no build-deciding modifier (Elemental/Move CRIT, Flat DMG Inc, Reaction DMG/CRIT including Lunar & Stellar, RES%, Healing Bonus, Enemy DEF/RES shred) is hidden.

**Why this priority**: Engine extraction and source attribution are the data foundation for both the Stage 3 Member Editor and Stage 5 Build Details views, as well as the permanent guard test against vendored GO stat definitions.

**Independent Test**: Can be fully tested in `@gi/engine` unit tests by evaluating `official/zibai-lunar-crystallize` and dedicated engine test teams (`Shenhe`, `YunJin`, `Nahida` C2, 4-element resonance) and verifying extracted values, source attribution, and the permanent guard test against `@genshin-optimizer/gi/wr-types` and `@genshin-optimizer/gi/keymap`.

**Acceptance Scenarios**:

1. **Given** the vendored GO stat listing (`@genshin-optimizer/gi/wr-types` `allInputPremodKeys`, `allModStats`, `allNonModStats`) and `@genshin-optimizer/gi/keymap`, **When** the permanent guard test runs, **Then** every stat key in the universe is either mapped as an extracted Real Stat (`ALL_REAL_STAT_KEYS`) or Additional Buff (`ALL_ADDITIONAL_BUFF_KEYS`) with a human-readable label, or listed in `EXCLUDED_GO_STAT_KEYS` with a one-line reason.
2. **Given** `official/zibai-lunar-crystallize` evaluated in an empty-account context (`createSession({})`), **When** inspecting Zibai's extracted stats and breakdowns, **Then** Zibai's active Additional Buffs include `geo_critRate_ = 0.10` (`+10%`) and `geo_critDMG_ = 0.30` (`+30%`) attributed to `Illuga`, and Geo Resonance is visible (`all_dmg_ = 0.15` in `DMG%`, `shield_ = 0.15` in `Other`, and `geo_enemyRes_ = -0.20` in `Additional Buffs` attributed to `Elemental Resonance`).
3. **Given** `official/zibai-lunar-crystallize` with `Illuga`'s conditional `a1AfterSkillBurst` set to `'off'`, **When** re-evaluating the session, **Then** `geo_critRate_` and `geo_critDMG_` from Illuga's A1 are removed (`0` / no longer active).
4. **Given** engine test teams containing `Shenhe` (with `Press` or `Hold` skill active), `YunJin` (with Burst `q` active), and `Nahida` C2 (with `c2.crit` active), **When** evaluating each session, **Then** `cryo_dmgInc` attributed to `Shenhe`, `normal_dmgInc` attributed to `Yun Jin`, and reaction CRIT (`burning_critRate_`, `bloom_critRate_`, `hyperbloom_critRate_`, `burgeon_critRate_`, `lunarbloom_critRate_`) attributed to `Nahida` appear on the affected member.
5. **Given** any preset or team evaluation, **When** comparing rotation damage totals and existing golden snapshots before and after this feature, **Then** all rotation damage totals and existing goldens are byte-identical on identical inputs.

---

### User Story 2 - Member Editor Grouped Real-Stat Table & Active Additional Buffs List (Priority: P1)

As a user inspecting or editing a team member in Stage 3 (Team Roster & Buffs), I want the member's real stats displayed in a GO-style grouped table (`Core` / `DMG%` / `RES%` / `Other` — with `Core` rows always shown and other groups/rows shown when non-zero), followed by an `"Additional Buffs"` list showing every active hit-scoped modifier on that member with its value and source attribution (and no placeholder box when none are active).

**Why this priority**: Gives immediate visibility into both panel stats and hit-scoped buffs (like Illuga's Geo CRIT, Shenhe Quills, Nahida C2, or RES shred) right inside Stage 3 as users toggle conditionals and edit gear.

**Independent Test**: Render `TeammateFastModePanel` / `MemberCompactStatGrid` with varied member stats and breakdowns and verify group rendering (`Core`, `DMG%`, `RES%`, `Other`), own-element ordering in `DMG%`, active Additional Buff rows with value + source (`"Geo CRIT Rate +10.0% — Illuga"`), and complete omission of the Additional Buffs section when no hit-scoped buffs are active.

**Acceptance Scenarios**:

1. **Given** a selected member in Stage 3, **When** the member stat panel renders, **Then** the `Core` group always displays all 7 core stats (`HP`, `ATK`, `DEF`, `EM`, `ER%`, `CR%`, `CD%`) with Base and Final values, while `DMG%`, `RES%`, and `Other` groups render only when they have at least one non-zero stat (`Final` value shown; character's own elemental DMG% listed first in `DMG%` when non-zero).
2. **Given** a selected member with active hit-scoped modifiers (e.g., `geo_critRate_: 0.1`, `geo_critDMG_: 0.3` from `Illuga`, `geo_enemyRes_: -0.2` from `Elemental Resonance`), **When** the panel renders, **Then** an `"Additional Buffs"` section appears below the real-stat table listing each active modifier with its human-readable name, signed value, and source attribution (e.g., `Geo CRIT Rate +10.0% — Illuga`).
3. **Given** a selected member with zero active hit-scoped modifiers, **When** the panel renders, **Then** no `"Additional Buffs"` section or empty placeholder box is rendered.

---

### User Story 3 - Build Details Grouped Real-Stat Comparison & Additional Buffs Diff (Priority: P1)

As a user comparing a candidate build against my current build in Stage 5 (Build Details), I want the Stat Comparison table to use the same grouped real-stat structure (`Core` / `DMG%` / `RES%` / `Other` — folding `DMG%` and `Healing Bonus` into the real-stat table instead of a misnamed `"Additional Bonuses"` section), and an `"Additional Buffs"` comparison below it that diffs hit-scoped modifiers (`Current → This Build` and `Diff`) with source attribution and expandable per-stat breakdowns.

**Why this priority**: Ensures consistent terminology and full visibility when comparing candidate builds against the equipped baseline in Stage 5.

**Independent Test**: Render `BuildStatComparisonSection` in `OptimizeViews` with current and candidate build stats/breakdowns and verify the grouped real-stat comparison (`Core`, `DMG%`, `RES%`, `Other`), expandable breakdown panels on click, and the `"Additional Buffs"` diff section.

**Acceptance Scenarios**:

1. **Given** Stage 5 Build Details is open for a candidate result, **When** viewing the Stat Comparison section, **Then** real stats are grouped into `Core` (always shown), `DMG%`, `RES%`, and `Other` (shown when non-zero in either Current or This Build), and the old misnamed `"Additional Bonuses"` section is gone (`DMG%` is in the `DMG%` group and `heal_` is in `Other`).
2. **Given** active hit-scoped modifiers in either Current or This Build, **When** viewing Build Details, **Then** an `"Additional Buffs"` section appears below the real-stat table, diffing `Current → This Build` with `Diff`, displaying source attribution, and expanding the full `StatBreakdownView` when a row/card is clicked.

---

### Edge Cases

- **Enemy Base RES vs. Active Enemy RES Modifiers (`${ele}_enemyRes_`)**: In GO's `formula.ts`, `input.total[`${ele}_enemyRes_`]` includes the default `10%` (`0.10`) enemy base resistance (`input.enemy[`${ele}_res_]`). If extracted raw without subtracting `input.enemy[`${ele}_res_]`, every character would falsely show `+10% Enemy RES` across all 8 elements even with no buffs/shred active. The engine MUST extract the net modifier (`input.total[`${ele}_enemyRes_`] - input.enemy[`${ele}_res_]`) and exclude the baseline `'enemy'` category (`Enemy Base RES`) from `contributors`, so `${ele}_enemyRes_` is `0` when no shred/modifier is active and equals the exact shred (e.g., `-20%` from Geo Resonance) when active.
- **Floating-Point Epsilon**: Values with `Math.abs(value) <= 1e-6` are treated as zero (`inactive`) and suppressed from conditional groups (`DMG%`, `RES%`, `Other`) and `Additional Buffs`.
- **Flat vs. Percentage Hit-Scoped Modifiers**: Keys ending in `_` (`unit: '%'`, e.g. `geo_critRate_`, `lunarcrystallize_dmg_`, `enemyDefRed_`) format as percentages (`+10.0%`), whereas keys not ending in `_` (`unit: ''`, e.g. `cryo_dmgInc`, `normal_dmgInc`, `lunarcrystallize_directDmgInc`, `healInc`) format as rounded integers (`+1,250`).
- **Multiple Contributors to One Additional Buff**: When multiple sources contribute to the same hit-scoped modifier (e.g., `Elemental Resonance` and `Linnea` both shredding `geo_enemyRes_`), source attribution deduplicates and joins distinct contributor source names with `, ` (e.g., `Elemental Resonance, Linnea`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The engine MUST enumerate and partition the complete vendored GO stat key universe (`@genshin-optimizer/gi/wr-types` `allInputPremodKeys` = `[...allModStats, ...allNonModStats]`, 189 keys) into:
  - **Real (Panel) Stats (`ALL_REAL_STAT_KEYS`, 46 keys)** grouped into:
    - `core` (7 keys, always shown): `hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`
    - `dmg` (18 keys, shown when non-zero): `pyro_dmg_`, `hydro_dmg_`, `dendro_dmg_`, `electro_dmg_`, `anemo_dmg_`, `cryo_dmg_`, `geo_dmg_`, `physical_dmg_`, `all_dmg_`, `normal_dmg_`, `charged_dmg_`, `plunging_dmg_`, `plunging_collision_dmg_`, `plunging_impact_dmg_`, `skill_dmg_`, `burst_dmg_`, `elemental_dmg_`, `normalEle_dmg_`
    - `res` (8 keys, shown when non-zero): `pyro_res_`, `hydro_res_`, `dendro_res_`, `electro_res_`, `anemo_res_`, `cryo_res_`, `geo_res_`, `physical_res_`
    - `other` (13 keys, shown when non-zero): `heal_`, `incHeal_`, `healInc`, `shield_`, `cdRed_`, `moveSPD_`, `atkSPD_`, `weakspotDMG_`, `dmgRed_`, `staminaDec_`, `staminaSprintDec_`, `staminaGlidingDec_`, `staminaChargedDec_`
  - **Hit-Scoped Additional Buffs (`ALL_ADDITIONAL_BUFF_KEYS`, 133 keys)**:
    - Per-element CRIT Rate & CRIT DMG (`${ele}_critRate_`, `${ele}_critDMG_`, 16 keys)
    - Per-move-type CRIT Rate & CRIT DMG (`${move}_critRate_`, `${move}_critDMG_`, 16 keys)
    - Flat DMG Increase (`all_dmgInc`, `${ele}_dmgInc`, `${move}_dmgInc`, `${trans}_dmgInc`, `${lunar}_reactionDmgInc`, `${lunar}_directDmgInc`, `${stellar}_reactionDmgInc`, `${stellar}_directDmgInc`, 41 keys)
    - Reaction DMG Bonuses & Multipliers (`${reaction}_dmg_`, `${lunar}_baseDmg_`, `${lunar}_specialDmg_`, `${stellar}_baseDmg_`, `${stellar}_specialDmg_`, `${stellar}_mult_`, 30 keys)
    - Reaction CRIT Rate & CRIT DMG (`${crittableReaction}_critRate_`, `${crittableReaction}_critDMG_`, 20 keys)
    - Enemy DEF & RES Modifiers (`${ele}_enemyRes_`, `enemyDefRed_`, `enemyDefIgn_`, 10 keys)
  - **Explicitly Excluded Keys (`EXCLUDED_GO_STAT_KEYS`, 10 keys)**: `hp_`, `atk_`, `def_`, `base_hp`, `base_atk`, `base_def`, `autoBoost`, `skillBoost`, `burstBoost`, `stamina`, each with a documented one-line reason.
- **FR-002**: `extractStatBreakdowns` and `session.evaluate()` MUST extract values and per-source `StatBreakdown` contributors for all 179 keys (`ALL_EXTRACTED_STAT_KEYS`) for both the target character (`RotationResult.stats` and `RotationResult.statBreakdowns`) and every team member (`RotationResult.memberStats[mKey].final` and `RotationResult.memberStats[mKey].statBreakdowns`).
- **FR-003**: There MUST be zero per-character or per-case special-casing in engine extraction or UI rendering; display is driven strictly by the extracted values and contributor breakdowns.
- **FR-004**: `MemberCompactStatGrid` in `TeammateFastModePanel.tsx` MUST render a GO-style grouped real-stat table (`Core` / `DMG%` / `RES%` / `Other`) and, below it, an `"Additional Buffs"` list showing every active (`Math.abs(val) > 1e-6`) hit-scoped modifier on the selected member with value + source attribution, or nothing (no placeholder box) when no buffs are active.
- **FR-005**: `BuildStatComparisonSection` in `OptimizeViews.tsx` MUST render the same grouped real-stat comparison (`Core` / `DMG%` / `RES%` / `Other`, folding `DMG%` and `heal_` into the real-stat table and removing the misnamed `"Additional Bonuses"` section) and an `"Additional Buffs"` comparison below it that diffs active hit-scoped modifiers (`Current → This Build`, `Diff`) with source attribution and expandable per-stat breakdown.
- **FR-006**: A permanent guard test MUST derive the full qualified-stat universe from `@genshin-optimizer/gi/wr-types` and `@genshin-optimizer/gi/keymap` at test time and fail if any stat key is neither mapped in `ALL_EXTRACTED_STAT_KEYS` (with label) nor listed in `EXCLUDED_GO_STAT_KEYS` with a non-empty one-line reason.
- **FR-007**: All existing golden tests and rotation damage totals MUST remain byte-identical on identical inputs.

### Key Entities

- **`RealStatGroupKey`**: `'core' | 'dmg' | 'res' | 'other'` — groups for the real-stat table in both Member Editor and Build Details.
- **`StatBreakdown`**: Per-stat source attribution object containing `statKey`, `label`, `unit` (`'' | '%'`), `total`, `reconciledTotal`, and `contributors: BreakdownContributor[]`.
- **`MemberStatSummary`**: Per-member stat summary in `RotationResult.memberStats[mKey]`, extended with `statBreakdowns?: Record<string, StatBreakdown>` alongside `base` and `final`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 189 keys in `@genshin-optimizer/gi/wr-types` (`allInputPremodKeys`) are accounted for by the permanent guard test (179 extracted + displayable, 10 explicitly excluded with 1-line reasons).
- **SC-002**: Acceptance spread cases (a) `official/zibai-lunar-crystallize` (Illuga A1 Geo CRIT Rate +10% & Geo CRIT DMG +30% toggleable via `a1AfterSkillBurst`, plus Geo Resonance), (b) `Shenhe` (`cryo_dmgInc`), `YunJin` (`normal_dmgInc`), `Nahida` C2 (reaction CRIT), and (c) non-zero `RES%` and `Healing Bonus` all pass automated tests.
- **SC-003**: 0 regressions across all `@gi/engine` and `@gi/web` test suites, `pnpm --filter @gi/web build` succeeds, and `impeccable detect` reports 0 P0/P1 issues.

## Assumptions

1. **Handling of `input.total.${ele}_enemyRes_`**: Because GO initializes `input.enemy.${ele}_res_` to `10%` (`0.10`) by default and sums it into `input.total.${ele}_enemyRes_`, displaying raw `input.total.${ele}_enemyRes_` would show `+10% Enemy RES` for all 8 elements on every character even when no buffs or debuffs are active. We assume `${ele}_enemyRes_` in `Additional Buffs` represents the net enemy RES modifier (`input.total.${ele}_enemyRes_ - input.enemy.${ele}_res_`), with the default `'enemy'` (`Enemy Base RES`) entry filtered out of `contributors`.
2. **Talent Boosts (`autoBoost`, `skillBoost`, `burstBoost`), `stamina`, and Sub-scaling Keys (`hp_`, `atk_`, `def_`, `base_hp`, `base_atk`, `base_def`)**: We assume these 10 keys from `allInputPremodKeys` belong on the explicit exclusion list (`EXCLUDED_GO_STAT_KEYS`) because sub-scaling keys are already folded into `hp`/`atk`/`def` panel stats and their `baseContributors`/`percentContributors` breakdowns, talent boosts are reflected in talent levels, and `stamina` is a fixed constant (`100`) in GO's `formula.ts` while stamina reduction modifiers (`staminaDec_*`) are extracted in `Other`.
3. **Layout Integration with `ui-fix-batch`**: In Stage 5 `BuildStatComparisonSection`, we preserve the responsive multi-column compact block grid (`comp-stat-cards-grid`) from `ui-fix-batch` inside each real-stat group (`Core`, `DMG%`, `RES%`, `Other`) and inside the `Additional Buffs` diff section, with full-width expandable `StatBreakdownView` below any clicked card. In Stage 3 `MemberCompactStatGrid`, the grouped table (`Core` / `DMG%` / `RES%` / `Other`) + `Additional Buffs` list supersedes the flat `DMG%`-only rows added in `ui-fix-batch`.
4. **Concise Source Attribution Format**: In `Additional Buffs`, each contributor's source name is derived from its `sourceKey` (via `displayName(sourceKey)` when present, e.g. `Illuga`, `Shenhe`, `Yun Jin`, `Nahida`), or `"Elemental Resonance"` for `category === 'resonance'`, or the contributor's `label` otherwise, deduplicated in order of appearance and joined with `, `.
