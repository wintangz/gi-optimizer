# Tasks: Custom Teams and Presets (`custom-teams-and-presets`)

**Input**: Design documents from `/specs/custom-teams-and-presets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: User Preset Helpers & Tests (`@gi/presets`)

- [ ] T001 [US1] [US4] [US5] Implement `generateUserPresetId`, `defaultTcBuildForCharacter`, `createBlankUserPreset`, `forkPresetToUser`, `serializePresetJson`, and `parsePresetJson` in `packages/presets/src/userPreset.ts`
- [ ] T002 [US1] [US4] [US5] Write unit tests in `packages/presets/test/userPreset.test.ts` covering blank creation, forking Akasha/Official presets (stripping `akasha` metadata), non-Latin slug fallback, JSON export/import round-trip, non-user conversion on import, and schema error reporting

---

## Phase 2: Custom Team & Preset Builder UI (`apps/web`)

- [ ] T003 [US1] [US2] [US3] [US4] [US5] Implement `/teams` page in `apps/web/src/app/teams/page.tsx` supporting 1–4 team members (`owned` or `tc` assumed build), GO conditional toggles, team resonance/reaction, enemy overrides, GO rotation target picker with counts & reactions, live rotation damage preview with current build, save/rename/delete in IndexedDB, `?edit=` / `?fork=` URL handling, and JSON import/export with collision handling
