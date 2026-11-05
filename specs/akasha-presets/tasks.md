# Tasks: Akasha Presets (`akasha-presets`)

**Input**: Design documents from `/specs/akasha-presets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Foundational (Display Names, Matcher, Validator, Registry)

- [ ] T001 [P] Implement display-name lookup and formatting helpers in `packages/presets/src/names.ts`
- [ ] T002 [US1] Implement `matchAccount(preset, account, opts)` in `packages/presets/src/match.ts` with part-by-part plain-English messages and weapon inventory candidate discovery
- [ ] T003 [P] [US3] Implement `validatePreset(input)` in `packages/presets/src/validate.ts` checking schema + weapon-type compatibility
- [ ] T004 [US2] [US3] Create bundled Akasha presets in `packages/presets/data/akasha/*.json` and implement `packages/presets/src/registry.ts` (`listBundledPresets`, `getBundledPreset`, `getPresetBadge`)

---

## Phase 2: Tests & Presets Browser UI

- [ ] T005 [US1] [US3] Write unit tests in `packages/presets/test/match.test.ts` and `packages/presets/test/bundled.test.ts` covering exact C0/C2 mismatches, unequipped weapon candidate selection, missing character, talent/level checks, and bundled preset validation
- [ ] T006 [US2] Implement `/presets` page in `apps/web/src/app/presets/page.tsx` with source badges (`Akasha · <label> · Verified`, `Official`, `Custom — use at your own risk`), character filter, requirement & match report breakdown, weapon candidate selector, "Optimize with this preset" button, and "Duplicate & edit" action
