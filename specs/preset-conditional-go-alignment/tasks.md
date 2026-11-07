# Tasks: Preset Conditional GO Alignment (`preset-conditional-go-alignment`)

**Input**: Design documents from `specs/preset-conditional-go-alignment/`

## Phase 1: GO Catalogue Completeness & Validation Helper (`@gi/engine`)

- [x] T001 Update `packages/engine/src/catalog.ts` so `getGlobalConditionalBuckets` enumerates all 7 elemental `react_${ele}` and `nightsoul_${ele}` conditionals for `ScrollOfTheHeroOfCinderCity`, and add `validatePresetConditionalsAgainstGO(preset: Preset): PresetConditionalIssue[]` (exported from `packages/engine/src/index.ts`).
- [x] T002 Remove the legacy `preset.id` exclusions on the `ArchaicPetra` bridge in `packages/engine/src/session.ts`.

## Phase 2: Align All 11 Bundled Presets (`@gi/presets`)

- [x] T003 Fix all mismatched `member.conditional` and `teamConditional` entries across all 5 Akasha presets (`packages/presets/data/akasha/*.json`) and all 6 Official presets (`packages/presets/data/official/*.json`).

## Phase 3: Re-Baseline Golden Fixtures & Add Permanent Guard Tests (`@gi/engine`)

- [x] T004 Re-capture all 11 golden fixtures in `packages/engine/test/golden/*.json` via `captureAllGoldenFixtures()` and record old → new totals per preset.
- [x] T005 Create `packages/engine/test/preset-conditional-go-alignment.test.ts` pinning the permanent guard across all bundled presets plus negative tests for unknown sheet keys, unknown conditional keys, and invalid state values; update existing tests (`buff-coverage.test.ts`, `official-owned-first.test.ts`, `conditional-toggle-panel.test.ts`) for the aligned presets.
- [x] T006 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, verify `vendor/genshin-optimizer` is untouched, and report the complete mismatch list, old → new totals, and `apps/web/out` export size.
