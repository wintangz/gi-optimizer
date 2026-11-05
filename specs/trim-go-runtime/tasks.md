# Tasks: Trim Genshin Optimizer Runtime & Prebuild Headless Engine (`trim-go-runtime`)

**Input**: Design documents from `/specs/trim-go-runtime/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`)  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`

**Tests**: Included — Vitest golden-fixture damage parity tests (`packages/engine/test/golden.test.ts`), engine spike tests (`packages/engine/test/spike.test.ts`), and production static build + cold worker start verification (`packages/engine/scripts/verify-trim.mjs`).

**Organization**: Tasks are grouped by user story to enable independent implementation and verification while strictly respecting sibling feature file ownership.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (GO Stub Modules & Path Aliasing)

**Purpose**: Create the lightweight stub modules in `tooling/go-stubs/` and wire `tooling/go-paths.mjs` so `@genshin-optimizer/gi/assets`, `@genshin-optimizer/gi/assets-data`, `@genshin-optimizer/common/ui`, `@genshin-optimizer/common/svgicons`, `@genshin-optimizer/gi/i18n`, `@genshin-optimizer/gi/ui`, `@genshin-optimizer/gi/db-ui`, and `@genshin-optimizer/gi/svgicons` resolve to local stubs without touching `vendor/genshin-optimizer`.

- [x] T001 [P] Create `tooling/go-stubs/assets.ts` with a recursive callable `Proxy` for `imgAssets` and `AssetData` plus empty-string stubs for `artifactDefIcon`, `characterAsset`, and `weaponAsset`
- [x] T002 [P] Create `tooling/go-stubs/ui.ts` exporting lightweight `{ type, props }` element constructors (`jsx`, `jsxs`, `jsxDEV`, `Fragment`, `createElement`), no-op `useEffect`/`useState` hooks, and stub tokens/components (`ColorText`, `SqBadge`, `ImgIcon`, `Box`, `StatIcon`, `ElementIcon`, `AnemoIcon`, `CryoIcon`, `DendroIcon`, `ElectroIcon`, `GeoIcon`, `HydroIcon`, `PyroIcon`, `PhysicalIcon`, `iconInlineProps`)
- [x] T003 [P] Create `tooling/go-stubs/i18n.ts` exporting `Translate = 'Translate'` and a minimal `i18nInstance` stub for `@genshin-optimizer/gi/i18n`
- [x] T004 [P] Create `tooling/go-stubs/db-ui.ts` exporting headless error-throwing stubs for `useDatabase` and `useDBMeta`
- [x] T005 [P] Create `tooling/go-stubs/zod.ts` implementing a lightweight `Proxy`-backed `z` schema normalizer (`.parse()`, `.safeParse()`, `.optional()`, `.nullable()`, `.nullish()`, `.default()`, `.catch()`, `.transform()`, `.pipe()`, `.object()`, `.looseObject()`, `.strictObject()`, `.enum()`, `.union()`, `.discriminatedUnion()`, `.record()`, `.array()`, `.tuple()`, `.coerce`) for the prebuilt engine/worker bundles
- [x] T006 Update `tooling/go-paths.mjs` to route `@genshin-optimizer/gi/assets` and `@genshin-optimizer/gi/assets-data` to `tooling/go-stubs/assets.ts`, `@genshin-optimizer/common/ui`, `@genshin-optimizer/common/svgicons`, `@genshin-optimizer/gi/ui`, and `@genshin-optimizer/gi/svgicons` to `tooling/go-stubs/ui.ts`, `@genshin-optimizer/gi/i18n` to `tooling/go-stubs/i18n.ts`, and `@genshin-optimizer/gi/db-ui` to `tooling/go-stubs/db-ui.ts`

---

## Phase 2: Foundational / User Story 2 - 100% Damage & Formula Catalog Parity Without GO UI Dependencies (Priority: P1) 🎯

**Goal**: Replace every `@genshin-optimizer/gi/ui/useTeamData` import across `packages/engine` with a headless local implementation `packages/engine/src/teamData.ts` using only headless GO entry points, and prove with `golden.test.ts` and `spike.test.ts` that no damage number or extracted formula/conditional label changed.

**Independent Test**: Run `pnpm --filter @gi/engine test` and verify all 11 golden fixtures in `packages/engine/test/golden.test.ts` and all tests in `packages/engine/test/spike.test.ts` pass with `0%` drift from baseline.

- [x] T007 [US2] Create `packages/engine/src/teamData.ts` porting `getTeamData`, `getTeamDataCalc`, `getBuildTcArtifactData`, `getBuildTcWeaponData`, and types `TeamData`, `TeamDataBundle`, `CharBundle` from `vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData.ts` using only headless GO packages (`@genshin-optimizer/common/util`, `@genshin-optimizer/gi/consts`, `@genshin-optimizer/gi/db`, `@genshin-optimizer/gi/good`, `@genshin-optimizer/gi/sheets`, `@genshin-optimizer/gi/stats`, `@genshin-optimizer/gi/uidata`, `@genshin-optimizer/gi/util`, `@genshin-optimizer/gi/wr`)
- [x] T008 [P] [US2] Update `packages/engine/src/session.ts` to import `getTeamData` and `getTeamDataCalc` from `./teamData` instead of `@genshin-optimizer/gi/ui/useTeamData`
- [x] T009 [P] [US2] Update `packages/engine/src/solver.ts` to import `getTeamData` from `./teamData` instead of `@genshin-optimizer/gi/ui/useTeamData`
- [x] T010 [P] [US2] Update `packages/engine/src/catalog.ts` to import `getTeamData` from `./teamData` instead of `@genshin-optimizer/gi/ui/useTeamData`
- [x] T011 [P] [US2] Update `packages/engine/scripts/capture-golden.ts` to import `getTeamDataCalc` from `../src/teamData` instead of `@genshin-optimizer/gi/ui/useTeamData`
- [x] T012 [P] [US2] Update `packages/engine/test/spike.test.ts` to import `getTeamDataCalc` from `../src/teamData` instead of `@genshin-optimizer/gi/ui/useTeamData`
- [x] T013 [US2] Update `packages/engine/test/golden.test.ts` to import `getTeamDataCalc` from `../src/teamData` and add assertions verifying `listTargetsForCharacter` and `listConditionalsForCharacter` return non-empty, human-readable English labels with the stubbed `Translate` / `ColorText` / `SqBadge` nodes
- [x] T014 [US2] Run `pnpm --filter @gi/engine test` and `pnpm --filter @gi/engine typecheck` to confirm all 11 golden fixtures and catalog extractions pass with `0%` damage delta

**Checkpoint**: `packages/engine` has zero imports from `@genshin-optimizer/gi/ui/*`, `@genshin-optimizer/gi/assets*`, or `@genshin-optimizer/common/ui`, and 100% of golden damage fixtures pass.

---

## Phase 3: User Story 1 & User Story 3 - Prebuild Headless Engine & Worker Bundle and Decouple Next.js (Priority: P1 / P2)

**Goal**: Prebuild `apps/web/public/workers/optimizer.worker.js` (`≤ 1.2 MB` raw) and `packages/engine/dist/index.mjs` (`+ dist/gi-consts.mjs`) via `esbuild` in `packages/engine/scripts/build-engine.mjs`, spawn `new Worker('/workers/optimizer.worker.js')` in `apps/web/src/lib/engine/workerClient.ts`, and update `apps/web/next.config.ts` so Next.js (`next dev` and `next build`) never transpiles `@genshin-optimizer/*` or `@gi/engine` raw TypeScript source and emits `< 15 MB` total in `apps/web/out` with `0` PNGs.

**Independent Test**: Run `pnpm build`, verify `apps/web/public/workers/optimizer.worker.js` is `≤ 1.2 MB` raw, `packages/engine/dist/index.mjs` exists, `apps/web/out` is `< 15 MB` with `0` `.png` files, and `/optimize` evaluates cold in the production build.

- [x] T015 [US1] [US3] Create `packages/engine/scripts/build-engine.mjs` using `esbuild` to bundle and minify `apps/web/public/workers/optimizer.worker.js` (`iife`, `browser`, `≤ 1.2 MB` raw), `packages/engine/dist/index.mjs` (`esm`), and `packages/engine/dist/gi-consts.mjs` (`esm`) with `go-stubs` resolution, `allStat_gen.json` material removal + `unzipFromB64Gzip` compression, and sheet `fields: [...]` stripping
- [x] T016 [US3] Update `packages/engine/package.json` to set `"main": "./dist/index.mjs"` (retaining `"types": "./src/index.ts"`) and add `"build": "node scripts/build-engine.mjs"`
- [x] T017 [US3] Update root `package.json` `"build"` and `"dev"` scripts to run `pnpm --filter @gi/engine build` before `pnpm --filter @gi/web build` / `pnpm --filter @gi/web dev`
- [x] T018 [P] [US1] [US3] Update `apps/web/src/lib/engine/workerClient.ts` to instantiate `new Worker('/workers/optimizer.worker.js')` directly
- [x] T019 [US1] [US3] Update `apps/web/next.config.ts` to remove `@gi/engine` from `transpilePackages`, remove `goAliases()`, and alias `@gi/engine` to `packages/engine/dist/index.mjs` (and `@genshin-optimizer/gi/consts` to `packages/engine/dist/gi-consts.mjs` for standalone compatibility)

---

## Phase 4: Polish & Acceptance Verification

**Purpose**: Verify all acceptance criteria against the production build (`apps/web/out` size `< 15 MB`, `0` PNGs, worker bundle raw & gzip size `≤ 1.2 MB` raw, First Load JS per route, cold worker start time on `/optimize` with the GO sample GOOD, and clean `vendor/genshin-optimizer`).

- [x] T020 [US1] [US2] [US3] Create `packages/engine/scripts/verify-trim.mjs` to measure and assert `apps/web/out` total byte size (`< 15 MB`), `.png` file count (`0`), `apps/web/public/workers/optimizer.worker.js` raw (`≤ 1.2 MB`) and gzipped byte sizes, prebuilt `packages/engine/dist/index.mjs` golden-fixture parity, and clean `git status --porcelain vendor/genshin-optimizer`
- [x] T021 [US1] [US3] Run `pnpm build`, `pnpm test`, and Playwright cold engine-start measurement on `/optimize` with the GO sample GOOD dataset (`Van_2025-07-16_19-59-13.json`), recording First Load JS per route and cold worker spawn-to-first-evaluation latency

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup: `T001`–`T006`)**: No dependencies — `T001` through `T005` can run in parallel (`[P]`), followed by `T006`.
- **Phase 2 (User Story 2: `T007`–`T014`)**: Depends on Phase 1 (`T006`). `T007` creates `packages/engine/src/teamData.ts`; `T008`–`T013` can run in parallel (`[P]`), followed by `T014`.
- **Phase 3 (User Story 1 & 3: `T015`–`T019`)**: Depends on Phase 2 (`T007`–`T010`). `T015` and `T018` can run in parallel (`[P]`), followed by `T016`, `T017`, and `T019`.
- **Phase 4 (Verification: `T020`–`T021`)**: Depends on Phase 3 (`T015`–`T019`).

### Dependencies on Other Features

- **`slim-data-pages`**: Owns `packages/good/src/*`, `packages/presets/src/*`, and `apps/web/src/app/{import,presets,teams}/page.tsx` to strip `@genshin-optimizer/gi/consts` from data-only pages. `trim-go-runtime` does NOT modify any files owned by `slim-data-pages`; instead, `build-engine.mjs` (`T015`) emits a `14 KB` prebuilt `packages/engine/dist/gi-consts.mjs` and `apps/web/next.config.ts` (`T019`) aliases `@genshin-optimizer/gi/consts` to it so Next.js never transpiles raw GO TypeScript whether `trim-go-runtime` runs before or after `slim-data-pages`.
- **`loading-and-bundle`**: Owns `apps/web/src/app/**/loading.tsx`, `apps/web/src/components/PageSkeleton.tsx`, and `apps/web/scripts/measure-bundle.mjs`. `trim-go-runtime` does not touch those files.
- **`teams-deferred-start`**: Owns `apps/web/src/app/teams/page.tsx`. `trim-go-runtime` does not touch that file.

### Parallel Opportunities

- `T001`, `T002`, `T003`, `T004`, `T005` (all in separate files under `tooling/go-stubs/`) can be executed in parallel.
- `T008`, `T009`, `T010`, `T011`, `T012`, `T013` (import path switches in separate files under `packages/engine/`) can be executed in parallel once `T007` completes.
- `T015` (`packages/engine/scripts/build-engine.mjs`) and `T018` (`apps/web/src/lib/engine/workerClient.ts`) can be executed in parallel.

