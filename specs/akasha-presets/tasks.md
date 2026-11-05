# Tasks: Akasha Presets (`akasha-presets`)

**Input**: Design documents from `/specs/akasha-presets/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`)
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Foundational (Display Names, Matcher, Validator, Registry)

- [x] T001 [P] Implement display-name lookup and formatting helpers in `packages/presets/src/names.ts`
- [x] T002 [US1] Implement `matchAccount(preset, account, opts)` in `packages/presets/src/match.ts` with part-by-part plain-English messages and weapon inventory candidate discovery
- [x] T003 [P] [US3] Implement `validatePreset(input)` in `packages/presets/src/validate.ts` checking schema + weapon-type compatibility
- [x] T004 [US2] [US3] Create bundled Akasha presets in `packages/presets/data/akasha/*.json` and implement `packages/presets/src/registry.ts` (`listBundledPresets`, `getBundledPreset`, `getPresetBadge`)

---

## Phase 2: Initial Tests & Presets Browser UI

- [x] T005 [US1] [US3] Write unit tests in `packages/presets/test/match.test.ts` and `packages/presets/test/bundled.test.ts` covering exact C0/C2 mismatches, unequipped weapon candidate selection, missing character, talent/level checks, and bundled preset validation
- [x] T006 [US2] Implement `/presets` page in `apps/web/src/app/presets/page.tsx` with source badges (`Akasha · <label> · Verified`, `Official`, `Custom — use at your own risk`), character filter, requirement & match report breakdown, weapon candidate selector, "Optimize with this preset" button, and "Duplicate & edit" action

---

## Phase 3: User Story 1 - Target-Only Compatibility Wording (Priority: P1)

**Goal**: Ensure the match / compatibility UI on `/presets` and `/optimize` talks exclusively about the target character and its required weapon, removing any wording implying the user's supporting teammates are checked or needed.

**Independent Test**: Load `/presets` and `/optimize` both with and without an imported GOOD file; verify the section heading is `"Target Character & Weapon Check"` and the unimported prompt reads `"Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset"`, with zero occurrences of `"your scanned characters and weapons satisfy this preset"`.

- [x] T007 [P] [US1] Update compatibility check heading to `"Target Character & Weapon Check"` and unimported GOOD prompts in `apps/web/src/app/presets/page.tsx` so they only reference the target character and its required weapon (remove `"whether your scanned characters and weapons satisfy this preset"`)
- [x] T008 [P] [US1] Update the compatibility gate heading and unimported GOOD prompt in `apps/web/src/app/optimize/page.tsx` to `"Target Character & Weapon Check"` and target-only wording

---

## Phase 4: User Story 2 - Target vs. Simulated (`tc`) Teammate Visual Distinction & Forked Team Builder (Priority: P1)

**Goal**: Everywhere a preset team is shown (`/presets` list cards, `/presets` detail table, `/optimize` preset bar), mark the target as `"Your Character · Target"` and visually mark each `build.type === 'tc'` teammate as simulated (`SIM` badge + dashed ring + `"Simulated / Assumed Preset Build (Not Your Account)"`) — never a flat list of 4 equal names. In `/teams`, ensure forked presets (`?fork=`) keep teammates as `build.type === 'tc'` clearly labelled `"Simulated / Assumed Preset Build (Not Your Account)"` and editable as assumed builds.

**Independent Test**: Inspect preset list cards and detail table on `/presets`, the preset summary bar on `/optimize`, and `/teams?fork=akasha/neuvillette-hypercarry-sacjade-c0`; verify `team[0]` shows `"Your Character · Target"`, each `tc` teammate shows a `SIM` badge with a dashed border and `"Simulated / Assumed Preset Build (Not Your Account)"`, and `forkPresetToUser` unit tests pass.

### Tests for User Story 2

- [x] T009 [P] [US2] Add unit test in `packages/presets/test/userPreset.test.ts` verifying that `forkPresetToUser` on Akasha and Official presets preserves `build.type === 'tc'` and all `tc` character, weapon, and artifact stats on every teammate (`team[1..3]`)

### Implementation for User Story 2

- [x] T010 [US2] Update preset list cards and the Team & Buff Assumptions table in `apps/web/src/app/presets/page.tsx` to badge `team[0]` as `"Your Character · Target"` and render each `build.type === 'tc'` teammate with a `SIM` badge, dashed border/ring, and `"Simulated / Assumed Preset Build (Not Your Account)"` label instead of a flat `/`-joined list of 4 equal names
- [x] T011 [P] [US2] Update the preset team summary in `apps/web/src/app/optimize/page.tsx` to render structured member pills marking `team[0]` as `"Your Character · Target"` and each `build.type === 'tc'` teammate with a `SIM` badge + dashed ring instead of a flat `·`-joined list of 4 equal names
- [x] T012 [P] [US2] Update `apps/web/src/app/teams/page.tsx` so teammates with `build.type === 'tc'` (including those from a forked Akasha or Official preset via `?fork=`) display a `SIM` badge, dashed ring, and explicit `"Simulated / Assumed Preset Build (Not Your Account)"` label while remaining editable as assumed builds and never silently switching to `'owned'`

---

## Phase 5: User Story 3 - Engine Teammate-Isolation Regression Test (Priority: P2)

**Goal**: Prove at the engine level that evaluating (`session.evaluate`) and optimizing (`session.optimize`) an Akasha preset depend strictly on the target character's data, selected weapon, and eligible artifact pool, and are completely invariant to supporting teammates in the user's GOOD file.

**Independent Test**: Run `pnpm --filter @gi/engine test akasha-isolation.test.ts` and verify that two GOOD files differing only in teammates (deleted teammates, mutated teammate levels/constellations/talents, mutated teammate weapons/artifacts with `includeEquippedOnOthers: false` or identical target artifact pool) evaluate and optimize to identical results.

- [x] T013 [P] [US3] Create regression test `packages/engine/test/akasha-isolation.test.ts` asserting that `session.evaluate` and `session.optimize` on an Akasha preset produce identical `RotationResult` and `OptimizeResult` across two GOOD payloads that differ only in teammates (missing teammate characters, mutated teammate level/cons/talents, or different teammate weapons/artifacts outside the eligible target pool)

---

## Dependencies & Execution Order

- **Phase 1 & Phase 2**: Completed.
- **Phase 3 (US1)**, **Phase 4 (US2)**, and **Phase 5 (US3)** can proceed immediately:
  - `T009` (`packages/presets/test/userPreset.test.ts`), `T012` (`apps/web/src/app/teams/page.tsx`), and `T013` (`packages/engine/test/akasha-isolation.test.ts`) touch completely separate files and can run in parallel (`[P]`).
  - `T007` and `T010` both edit `apps/web/src/app/presets/page.tsx` and should be applied together or sequentially.
  - `T008` and `T011` both edit `apps/web/src/app/optimize/page.tsx` and should be applied together or sequentially.

### Dependencies on Other Features
- `good-import` (`packages/good`, `apps/web/src/lib/storage/db.ts`): provides `useGoodStorage()` and `useUserPresets()`.
- `single-character-optimizer` (`packages/engine`): provides `createSession`, `session.evaluate`, and `session.optimize` per `docs/architecture.md`.
- `custom-teams-and-presets` (`packages/presets/src/userPreset.ts`, `apps/web/src/app/teams/page.tsx`): provides `forkPresetToUser` and the `/teams` custom team builder route.
