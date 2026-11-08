# Tasks: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

**Input**: Design documents from `/specs/weapon-compare-effects-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Foundational (`@gi/presets` Candidate Spec, Seeding & Persistence)

**Purpose**: Define `WeaponCompareCandidateSpec`, `weaponCompareCandidatesByPreset`, candidate target conditional seeding, and per-candidate conditional resolution in `@gi/presets`.

- [x] T001 Define `WeaponCompareCandidateSpec` (with `targetConditionals?: MemberConditionalsMap` and `seededTargetConditionals?: MemberConditionalsMap`), extend `OptimizerSettings` with `weaponCompareCandidatesByPreset`, and implement `seedCandidateTargetConditionals`, `resolveCandidateMemberConditionals`, `getPresetWeaponCompareCandidates`, `setPresetWeaponCompareCandidates`, and `resetPresetWeaponCompareCandidates` in `packages/presets/src/settings.ts` and `packages/presets/src/index.ts`
- [x] T002 [P] Add unit tests for `seedCandidateTargetConditionals`, `resolveCandidateMemberConditionals`, and `weaponCompareCandidatesByPreset` persistence/reset helpers in `packages/presets/test/settings.test.ts`

---

## Phase 2: User Story 1 - Per-Candidate Target Effect State in Weapon Comparison Engine (`@gi/engine`) (Priority: P1) 🎯 MVP

**Goal**: Apply each candidate's own `targetConditionals` to that candidate's optimization and build evaluations in `compareWeapons`, while keeping teammate conditionals, elemental resonance, Fast Mode, stat constraints, and pool filters shared across candidates.

**Independent Test**: `pnpm --filter @gi/engine test -- test/weapon-compare.test.ts` verifies that in a 3-candidate weapon comparison, configuring Candidate 2's weapon passive stacks AND a target artifact-set conditional changes Candidate 2's total while Candidates 1 and 3 return bit-identical totals.

- [x] T003 [US1] Extend `WeaponCompareCandidate` with `targetConditionals` and `seededTargetConditionals` and re-export candidate conditional helpers in `packages/engine/src/types.ts` and `packages/engine/src/index.ts`
- [x] T004 [US1] Update `compareWeapons` and `resolveDefaultWeaponCompareCandidate` in `packages/engine/src/session.ts` to resolve each candidate's `memberConditionals` via `resolveCandidateMemberConditionals` for both `session.optimize` and top-build `session.evaluate` calls
- [x] T005 [US1] Add engine acceptance test in `packages/engine/test/weapon-compare.test.ts` verifying 3-candidate isolation (modifying Candidate 2's weapon stacks + set conditional leaves Candidates 1 and 3 bit-identical while updating Candidate 2) and shared teammate/resonance/constraint behavior

---

## Phase 3: User Story 2 & 3 - Per-Candidate "Effects" Expander, "Setup Differs" Indicator, and Persistence (`@gi/web`) (Priority: P2/P3)

**Goal**: Render an expandable **Effects** section on each candidate row in `WeaponComparisonPanel` (with weapon, artifact-set, character, and constellation conditional controls), display a **Setup differs** indicator with a detailed tooltip whenever a candidate's effect state differs from its seeded panel state, and persist/reset per-candidate effect state with the compare candidate list.

**Independent Test**: `pnpm --filter @gi/web test` verifies per-candidate Effects expander controls, candidate independence, **Setup differs** badge and tooltip content, and persistence/reset with the candidate list.

- [x] T006 [US2] Export reusable target conditional derivation, conditional row renderer, and `computeCandidateEffectDiffs` / `formatCandidateEffectDiffsTooltip` helpers in `apps/web/src/components/ConditionalTogglePanel.tsx`
- [x] T007 [US2] [US3] Update `WeaponComparisonPanel` and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` (and styles in `apps/web/src/app/globals.css`) to seed candidate `targetConditionals`/`seededTargetConditionals` when added, render the per-candidate **Effects** expander and **Reset Effects** button, render the **Setup differs** indicator and tooltip on differing candidates, and support resetting the compare setup
- [x] T008 [US2] [US3] Wire per-candidate `targetConditionals` seeding, `OptimizerSettings.weaponCompareCandidatesByPreset` persistence/reset, and per-candidate `resolveCandidateMemberConditionals` in `startWeaponComparison` in `apps/web/src/app/optimize/page.tsx`
- [x] T009 [P] [US2] [US3] Add component tests for per-candidate Effects expander, independent toggles, **Setup differs** badge/tooltip, and compare setup persistence/reset in `apps/web/test/OptimizeViews.test.tsx`

---

## Phase 4: Polish & Cross-Cutting Verification

- [x] T010 Run `pnpm typecheck; pnpm lint; pnpm test; pnpm build`, verify zero golden fixture diff (`git diff packages/engine/test/golden/`), and commit `feat: weapon-compare-effects-setup`
