# Tasks: Full Stat Display (`full-stat-display`)

**Input**: Design documents from `/specs/full-stat-display/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`

## Phase 1: Foundational Engine Stat Catalog & Types

- [X] T001 Create `packages/engine/src/stats.ts` defining `RealStatGroupKey`, `REAL_STAT_GROUPS`, `REAL_STAT_KEYS_BY_GROUP` (46 keys), `ALL_REAL_STAT_KEYS`, `ALL_ADDITIONAL_BUFF_KEYS` (133 keys), `ALL_EXTRACTED_STAT_KEYS` (179 keys), `EXCLUDED_GO_STAT_KEYS` (10 keys with 1-line reasons), `STAT_LABELS`, `isPercentStatKey()`, and `formatBuffSourceAttribution()`
- [X] T002 Update `packages/engine/src/types.ts` and `packages/engine/src/index.ts` to add `statBreakdowns?: Record<string, StatBreakdown>` to `MemberStatSummary` and export the stat catalog and helper functions from `@gi/engine`

---

## Phase 2: User Story 1 - Engine Stat & Breakdown Extraction + Guard & Acceptance Tests (Priority: P1)

**Goal**: Extract all 179 Real Stat and Additional Buff keys and their per-source `StatBreakdown` across all team members, with net shred calculation for `*_enemyRes_` and full test coverage.

- [X] T003 [US1] Update `packages/engine/src/breakdown.ts` to expand `STAT_BREAKDOWN_KEYS` to `ALL_EXTRACTED_STAT_KEYS`, use `STAT_LABELS` and `isPercentStatKey()`, compute net modifier for `*_enemyRes_` (`total - enemyBaseRes`, excluding `'enemy'` category from `contributors`), and avoid adding synthetic zero fallback contributors to inactive non-core keys
- [X] T004 [US1] Update `packages/engine/src/session.ts` (`evaluate()`) to populate `RotationResult.stats` and `RotationResult.memberStats[mKey].final` for all `ALL_EXTRACTED_STAT_KEYS` (with net modifier for `*_enemyRes_`) and populate `RotationResult.memberStats[mKey].statBreakdowns` for every team member
- [X] T005 [US1] Create `packages/engine/test/full-stat-display.test.ts` with:
  - Permanent guard test deriving the full stat universe from `@genshin-optimizer/gi/wr-types` (`allInputPremodKeys`, `allModStats`, `allNonModStats`) and `@genshin-optimizer/gi/keymap`
  - Acceptance (a): `official/zibai-lunar-crystallize` in empty-account context (`createSession({})`) — Zibai's `geo_critRate_ = +10%` and `geo_critDMG_ = +30%` attributed to `Illuga`, removed when `a1AfterSkillBurst` is `'off'`, plus Geo Resonance (`all_dmg_`, `shield_`, `geo_enemyRes_`)
  - Acceptance (b): Engine test teams for `Shenhe` (`cryo_dmgInc`), `YunJin` (`normal_dmgInc`), and `Nahida` C2 (`burning_critRate_`, `bloom_critRate_`, `hyperbloom_critRate_`, `burgeon_critRate_`, `lunarbloom_critRate_`)
  - Acceptance (c): Non-zero `RES%` (4-element Protective Canopy resonance) and `Healing Bonus` (`heal_`) extraction

---

## Phase 3: User Story 2 - Member Editor Grouped Real-Stat Table & Additional Buffs List (Priority: P1)

**Goal**: Replace the flat 7+DMG% member stat grid in Stage 3 with a GO-style grouped Real Stat table (`Core` / `DMG%` / `RES%` / `Other`) and an active-only `"Additional Buffs"` list with value + source attribution.

- [X] T006 [US2] Update `MemberCompactStatGrid` in `apps/web/src/components/TeammateFastModePanel.tsx` to render grouped Real Stats (`Core` always shown with Base & Final; `DMG%` with own element first, `RES%`, and `Other` shown when non-zero with Final) and an `"Additional Buffs"` section below it showing active hit-scoped modifiers with value + source attribution (or nothing when no buffs are active)
- [X] T007 [US2] Update `apps/web/src/app/globals.css` with styling for the Member Editor grouped stat table and Additional Buffs list (`>= 0.78rem` font floor per `DESIGN.md`)
- [X] T008 [US2] Update `apps/web/test/TeammateFastModePanel.test.tsx` to verify `Core` / `DMG%` / `RES%` / `Other` group rendering, active `Additional Buffs` with source attribution (`Geo CRIT Rate +10% — Illuga`), and absence of `Additional Buffs` placeholder when none are active

---

## Phase 4: User Story 3 - Build Details Grouped Real-Stat Comparison & Additional Buffs Diff (Priority: P1)

**Goal**: Update Stage 5 `BuildStatComparisonSection` to use the same grouped Real Stat table (`Core` / `DMG%` / `RES%` / `Other`, folding `DMG%` and `heal_` into the real-stat table) and render an `"Additional Buffs"` diff section (`Current → This Build`, `Diff`, source attribution, and expandable breakdown on click).

- [X] T009 [US3] Update `BuildStatComparisonSection` in `apps/web/src/components/OptimizeViews.tsx` to render grouped Real Stat comparison sections (`Core`, `DMG%`, `RES%`, `Other`) and the `"Additional Buffs"` diff section with source attribution and expandable `StatBreakdownView`
- [X] T010 [US3] Update `apps/web/src/app/globals.css` with styling for Build Details grouped Real Stat headers and Additional Buffs source badges
- [X] T011 [US3] Update `apps/web/test/OptimizeViews.test.tsx` to verify grouped Real Stat comparison (`Core`, `DMG%`, `RES%`, `Other`), removal of `"Additional Bonuses"`, and the `"Additional Buffs"` diff & breakdown expansion

---

## Phase 5: Polish & Cross-Cutting Verification

- [X] T012 Run full test suites (`pnpm --filter @gi/engine test`, `pnpm --filter @gi/web test`), production build (`pnpm --filter @gi/web build`), and `impeccable detect` (`impeccable.cmd detect --json apps/web/src`); mark all tasks `[X]` in `specs/full-stat-display/tasks.md`, commit as `feat: full-stat-display`, and push to GitHub
