# Tasks: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

**Input**: Design documents from `specs/official-presets-owned-first/`

## Phase 1: `@gi/presets` Settings & Resolution Helpers

- [x] T001 Add `MemberBuildMode`, `MemberBuildModesMap`, `ResolvedMemberBuild`, `OptimizerSettings.memberBuildModes`, `resolvePresetMemberBuildMode`, `getPresetMemberBuildModes`, and `setPresetMemberBuildMode` in `packages/presets/src/settings.ts` and export from `packages/presets/src/index.ts`.

## Phase 2: `@gi/engine` Owned-First Teammate Resolution & Golden Re-Baseline

- [x] T002 Update `BuildSelection` and `EngineSession.optimize` in `packages/engine/src/types.ts` and `packages/engine/src/solver.ts` to support `memberBuildModes?: Record<string, 'owned' | 'tc'>`.
- [x] T003 Update `hydratePresetTeam`, `hydrateTeamIntoDb`, and `createSession` in `packages/engine/src/session.ts` to resolve official preset teammates (`i > 0`) as `'owned'` by default when present in GOOD `characters` (with derived worn-set and equipped-weapon conditionals) and `'tc'` when absent from GOOD or toggled to `'tc'` (with preset-authored `member.conditional`).
- [x] T004 Update `computeDirectGOGolden` in `packages/engine/scripts/capture-golden.ts` for official presets and re-capture `packages/engine/test/golden/official__*.json` while keeping `packages/engine/test/golden/akasha__*.json` byte-identical.

## Phase 3: UI Per-Member Toggles & Visible Simulated Labelling (`apps/web`)

- [x] T005 Update `apps/web/src/app/optimize/page.tsx` and `apps/web/src/app/presets/page.tsx` to render per-member `Owned` / `Simulated (TC)` toggles on official presets, persist choices in `settings.memberBuildModes`, pass `memberBuildModes` to `evaluatePresetInWorker` / `optimizePresetInWorker` / `exportGODatabaseInWorker`, and visibly label unowned characters as simulated (`SIM` + `"Not in GOOD — Simulated"`).

## Phase 4: Tests & Full Verification

- [x] T006 Add engine and UI tests (`packages/engine/test/official-owned-first.test.ts`, `apps/web/test/official-owned-first-ui.test.tsx`) pinning: (1) owned member in GOOD uses owned build by default; (2) toggling to simulated reproduces old TC totals; (3) character absent from GOOD uses simulated build and is visibly labelled.
- [x] T007 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, verify `akasha__*.json` fixtures are byte-identical, and record `old → new` official golden totals and `apps/web/out` byte size.
