# Tasks: Fast Mode (Per-Teammate Virtual 6th Artifact)

**Input**: Design documents from `/specs/fast-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup & Foundational (`@gi/presets` Schema & Settings)

**Purpose**: Define Fast Mode types, preset schema validation, and per-preset settings helpers in `@gi/presets`.

- [x] T001 Define `FAST_MODE_STAT_KEYS`, `FastModeStatKey`, `FastModeStats`, `PresetFastModeMap`, `normalizeFastModeStats`, and optional `fastMode?: FastModeStats` on `TeamMember` / `TeamMemberInput` (with target-slot stripping in `parsePreset`) in `packages/presets/src/schema.ts`
- [x] T002 Extend `OptimizerSettings` with `fastModeByPreset?: Record<string, PresetFastModeMap>` and implement `getPresetFastMode`, `resolveEffectiveFastMode`, `setPresetMemberFastModeStat`, `setPresetMemberFastMode`, `resetPresetMemberFastMode`, `hasMemberFastMode`, and `hasPresetFastMode` in `packages/presets/src/settings.ts`
- [x] T003 Re-export Fast Mode types and helper functions from `packages/presets/src/index.ts`
- [x] T004 [P] Add unit tests for `TeamMember.fastMode` parsing, target stripping, and `OptimizerSettings.fastModeByPreset` helpers in `packages/presets/test/schema.test.ts` and `packages/presets/test/settings.test.ts`

---

## Phase 2: User Story 1 - Virtual 6th Artifact Injection & Member Base/Final Stats (`@gi/engine`) (Priority: P1) 🎯 MVP

**Goal**: Inject non-target teammate Fast Mode stats at the `art` layer of their GO `Data` computation and compute both `base` and `final` stats for every team member on `RotationResult.memberStats`.

**Independent Test**: `pnpm --filter @gi/engine test` verifies golden parity when Fast Mode is empty and verifies that `+40 EM` on a Kazuha teammate via Fast Mode changes the target's rotation total by the exact same amount as giving Kazuha a real `+40 EM` artifact change.

- [x] T005 [US1] Extend `BuildSelection`, `EngineSession`, `RotationResult`, and `MemberStatSummary` with Fast Mode and member stat types in `packages/engine/src/types.ts` and `packages/engine/src/index.ts`
- [x] T006 [US1] Implement `getFastModeArtifactData`, `setDbFastMode`, and `getDbFastMode` and append virtual 6th artifact `Data` to `artifactData` for non-target teammates in `packages/engine/src/teamData.ts`
- [x] T007 [US1] Plumb `fastMode` and `disableFastMode` through `hydratePresetTeam`, `presetTeamFingerprint`, `hydrateTeamIntoDb`, `session.evaluate` (including `RotationResult.memberStats`), `session.optimize`, `session.compareWeapons`, and `session.optimizeTeam` (suppressing Fast Mode in `optimizeTeam`) in `packages/engine/src/session.ts` and `packages/engine/src/solver.ts`
- [x] T008 [US1] Add engine integration tests for Kazuha `+40 EM` equivalence against a real `+40 EM` artifact change, negative Fast Mode stats, target immunity, weapon-compare sharing, `optimizeTeam` suppression, and `memberStats` (`base` & `final`) in `packages/engine/test/buff-coverage.test.ts`

---

## Phase 3: User Story 2 & 3 - Teammate Cards UI & Dual Persistence (`@gi/web`) (Priority: P2/P3)

**Goal**: Display teammate cards with Base & Final stats, `Fast Mode` badge, typed stat lines, inline virtual piece controls, and per-member Reset on `/optimize` and `/teams`, persisting to user preset data for user presets and `OptimizerSettings` for bundled presets.

**Independent Test**: `pnpm --filter @gi/web test` verifies teammate cards render Base & Final stats, badge active Fast Mode members, display typed stat lines, reset per member, hide Fast Mode on target and in Team Optimize mode, and persist appropriately.

- [x] T009 [US2] Create `TeammateFastModePanel` component (and reusable teammate Fast Mode editor/stat table) displaying Base & Final stats, `Fast Mode` badge, typed stat lines, stat inputs, and per-member Reset in `apps/web/src/components/TeammateFastModePanel.tsx` and style rules in `apps/web/src/app/globals.css`
- [x] T010 [US2] [US3] Integrate `TeammateFastModePanel` and `fastMode` evaluation/optimization plumbing into `apps/web/src/app/optimize/page.tsx` and `apps/web/src/components/ConditionalTogglePanel.tsx` (persisting via `saveUserPreset` for user presets and `updateSettings` for bundled presets, hidden when `optimizeMode === 'team'`)
- [x] T011 [US2] [US3] Integrate teammate Base & Final stats and Fast Mode virtual piece controls into `apps/web/src/app/teams/page.tsx` (saving `fastMode` on `draft.team[idx]` for non-target members and stripping `fastMode` on target change)
- [x] T012 [P] [US2] [US3] Add component and persistence tests in `apps/web/test/TeammateFastModePanel.test.tsx`

---

## Phase 4: Polish & Cross-Cutting Verification

- [x] T013 Run `pnpm typecheck; pnpm lint; pnpm test; pnpm build`, verify zero golden fixture diff (`git diff packages/engine/test/golden/`), and commit `feat: fast-mode`
