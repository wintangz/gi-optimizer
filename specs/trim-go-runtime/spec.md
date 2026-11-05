# Feature Specification: Trim Genshin Optimizer Runtime & Prebuild Headless Engine

**Feature Branch**: `trim-go-runtime`  
**Created**: 2026-11-06  
**Status**: Draft  
**Input**: User description: "Cut GO game-art PNG assets and UI-layer imports via local stub modules and a headless teamData module; prebuild the headless engine (`packages/engine/dist/index.mjs`) and optimizer web worker (`apps/web/public/workers/optimizer.worker.js`) via esbuild so Next.js never transpiles raw GO or `@gi/engine` TypeScript source, shrinking `apps/web/out` from 128.96 MB (2,732 PNGs) to < 15 MB (0 PNGs) and the worker bundle from ~2.4 MB raw to ≤ 1.2 MB raw while preserving 100% golden damage parity and keeping `vendor/genshin-optimizer` pristine."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Bloat Static Deployment & Fast Optimizer Worker Startup (Priority: P1)

A player or self-hoster builds and deploys the static web export (`apps/web/out`) or opens `/optimize` in the browser. Instead of downloading chunks backed by a 128.96 MB static export polluted with 2,732 unused Genshin Optimizer game-art PNGs and a ~2.4 MB raw worker bundle containing Material UI, Emotion, i18next, unused material stat tables, and UI talent card descriptors, the static build outputs zero game PNGs (`< 15 MB` total `apps/web/out`) and spawns a prebuilt, tree-shaken `/workers/optimizer.worker.js` bundle (`≤ 1.2 MB` raw) that evaluates builds and runs the branch-and-bound solver rapidly.

**Why this priority**: The 123.52 MB of unused PNGs and UI framework bloat in the worker bundle are the primary causes of excessive build output size, slow Next.js compilation, and slow worker initialization.

**Independent Test**: Run `pnpm --filter @gi/engine build && pnpm build` and inspect `apps/web/out` and `apps/web/public/workers/optimizer.worker.js`. Verify `apps/web/out` has `0` `.png` files under `_next/static/media`, total `apps/web/out` size is `< 15 MB`, and `apps/web/public/workers/optimizer.worker.js` is `≤ 1.2 MB` raw (`1,258,291` bytes).

**Acceptance Scenarios**:

1. **Given** a clean production build (`pnpm build`), **When** measuring `apps/web/out`, **Then** total directory size is `< 15 MB` (`15,728,640` bytes) and the count of `.png` files in `apps/web/out` is `0`.
2. **Given** the prebuilt worker bundle `apps/web/public/workers/optimizer.worker.js`, **When** measuring its file size, **Then** its raw size is `≤ 1.2 MB` (`1,258,291` bytes, vs. baseline ~2.4 MB raw / ~644 KB gzip) and both raw and gzipped sizes are reported.
3. **Given** the production build served statically and the GO sample GOOD dataset loaded, **When** navigating to `/optimize`, **Then** the worker spawns directly from `/workers/optimizer.worker.js` and completes its first cold evaluation without runtime errors, with cold engine-start time and First Load JS for all routes recorded.

---

### User Story 2 - 100% Damage & Formula Catalog Parity Without GO UI Dependencies (Priority: P1)

A player evaluates rotation damage, optimizes artifact builds, or browses character target formulas and conditionals on `/optimize`. Even though `@genshin-optimizer/gi/assets`, `@genshin-optimizer/gi/assets-data`, `@genshin-optimizer/common/ui`, `@genshin-optimizer/gi/i18n`, `@genshin-optimizer/gi/ui`, and `@genshin-optimizer/gi/db-ui` are replaced with lightweight local stubs and `getTeamData` / `getTeamDataCalc` / `getBuildTcArtifactData` run from a headless `packages/engine/src/teamData.ts` module, every damage number and extracted conditional/formula label remains identical to the baseline.

**Why this priority**: Constitution Principle I (Engine Delegation) and Principle II (Preset Fidelity) forbid any divergence from Genshin Optimizer's calculations (`≤ 0.1%` relative error tolerance, targeting exact `0%` delta against captured golden fixtures).

**Independent Test**: Run `pnpm --filter @gi/engine test` (`golden.test.ts` and `spike.test.ts`) and verify all 11 official and Akasha golden fixtures pass with exact parity and `listTargetsForCharacter` / `listConditionalsForCharacter` return identical formula and conditional metadata.

**Independent Acceptance Scenarios**:

1. **Given** all 11 golden fixtures in `packages/engine/test/golden/`, **When** running `golden.test.ts` against the stubbed and headless-teamData engine, **Then** every preset's rotation total, per-instance `perHit` and `subtotal`, character stats, and `exportGODatabase` round-trip match with `0%` drift from baseline (`≤ 0.1%` relative error threshold).
2. **Given** `extractReactNodeText` in `packages/engine/src/catalog.ts`, **When** `listTargetsForCharacter` and `listConditionalsForCharacter` inspect sheet nodes rendered with stubbed `Translate`, `ColorText`, and `SqBadge`, **Then** `{ type, props }` stub nodes preserve `props.ns`, `props.key18`, and `props.children` so all extracted formula and conditional labels match baseline.
3. **Given** `vendor/genshin-optimizer`, **When** running `git status vendor/genshin-optimizer` and `git diff vendor/genshin-optimizer`, **Then** the vendored submodule has zero modified, added, or deleted files.

---

### User Story 3 - Prebuilt Engine & Decoupled Next.js Dev/Build Pipeline (Priority: P2)

A developer runs `pnpm dev` or `pnpm build` in the workspace. Next.js no longer walks or transpiles raw TypeScript source inside `vendor/genshin-optimizer` or `packages/engine/src`. Instead, `packages/engine` prebuilds `packages/engine/dist/index.mjs` and `apps/web/public/workers/optimizer.worker.js` via `esbuild`, and `apps/web/next.config.ts` consumes prebuilt artifacts only.

**Why this priority**: Eliminates redundant Next.js/Webpack compilation of 100+ character/weapon/artifact sheet TypeScript files on every web build and dev server start.

**Independent Test**: Inspect `apps/web/next.config.ts` and `apps/web/src/lib/engine/workerClient.ts`, run `pnpm build`, and verify Next.js completes static export without `@gi/engine` in `transpilePackages` and without `@genshin-optimizer/*` raw source aliases in `next.config.ts`.

**Acceptance Scenarios**:

1. **Given** `packages/engine/scripts/build-engine.mjs`, **When** `pnpm --filter @gi/engine build` (or root `pnpm build` / `pnpm dev`) runs, **Then** `packages/engine/dist/index.mjs` and `apps/web/public/workers/optimizer.worker.js` are emitted in `< 5` seconds.
2. **Given** `apps/web/next.config.ts`, **When** Next.js builds or runs in dev mode, **Then** `@gi/engine` is not in `transpilePackages` and raw `@genshin-optimizer/*` source paths are not transpiled by Next.js.

---

### Edge Cases

- **Deep property access on stubbed GO assets (`imgAssets`, `AssetData`)**: GO's `talentTem` and weapon/character sheet helpers access nested paths such as `imgAssets.weaponTypes.claymore` or `AssetData.chars[key]`. The `tooling/go-stubs/assets.ts` stub MUST use a recursive `Proxy` returning an empty string when invoked or coerced to primitive so arbitrary property chains never throw `TypeError: Cannot read properties of undefined`.
- **Emotion JSX pragma in `vendor/genshin-optimizer/libs/gi/sheets/tsconfig.json`**: GO's `libs/gi/sheets/tsconfig.json` specifies `"jsxImportSource": "@emotion/react"`, causing `.tsx` sheet files to import `@emotion/react/jsx-runtime` (and `Reaction.tsx` / `Resonance.tsx` to import `Box` from `@mui/material`, and `ElementCycle.tsx` to import `useEffect`/`useState` from `react`). The engine bundler and Vitest alias map MUST route these imports to the lightweight UI stub so `@emotion/*`, `@mui/*`, and `react` are never bundled into the worker or headless engine.
- **Namespace import of `allStat_gen.json`**: `vendor/genshin-optimizer/libs/gi/stats/src/index.ts` uses `import * as allStat_gen from './allStat_gen.json'`. Any build-time transform on `allStat_gen.json` MUST export named top-level bindings (`export const { char, weapon, art } = data; export default data;`) so `allStats.art`, `allStats.char`, and `allStats.weapon` remain defined.
- **Data-only `@genshin-optimizer/gi/consts` imports in `@gi/good` and `@gi/presets`**: Until sibling feature `slim-data-pages` replaces `@genshin-optimizer/gi/consts` in `@gi/good` and `@gi/presets`, `packages/engine/scripts/build-engine.mjs` also emits a tiny prebuilt `packages/engine/dist/gi-consts.mjs` (`~14 KB`) and `apps/web/next.config.ts` aliases `@genshin-optimizer/gi/consts` to that prebuilt `.mjs` file so Next.js never transpiles raw GO TypeScript even if `trim-go-runtime` is built standalone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST provide `tooling/go-stubs/assets.ts` exporting stub implementations of `artifactDefIcon`, `characterAsset`, `weaponAsset`, `imgAssets`, and `AssetData` (backed by a recursive Proxy returning `""`) and wire `@genshin-optimizer/gi/assets` and `@genshin-optimizer/gi/assets-data` to it in `tooling/go-paths.mjs`.
- **FR-002**: The repository MUST provide lightweight stubs in `tooling/go-stubs/` for `@genshin-optimizer/common/ui`, `@genshin-optimizer/common/svgicons`, `@genshin-optimizer/gi/i18n`, `@genshin-optimizer/gi/ui`, `@genshin-optimizer/gi/db-ui`, and `@genshin-optimizer/gi/svgicons` that return `{ type, props }` descriptor objects for `Translate`, `ColorText`, `SqBadge`, and JSX elements (`jsx`, `jsxs`, `createElement`, `Fragment`), ensuring `extractReactNodeText` in `packages/engine/src/catalog.ts` produces identical formula and conditional names without pulling in `@mui/material`, `@emotion/*`, `i18next`, or React DOM.
- **FR-003**: `packages/engine/src/teamData.ts` MUST provide headless implementations of `getTeamData`, `getTeamDataCalc`, `getBuildTcArtifactData`, and `getBuildTcWeaponData` (plus types `TeamData`, `TeamDataBundle`, `CharBundle`) ported from `vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData.ts` using only headless GO packages (`@genshin-optimizer/common/util`, `@genshin-optimizer/gi/consts`, `@genshin-optimizer/gi/db`, `@genshin-optimizer/gi/good`, `@genshin-optimizer/gi/sheets`, `@genshin-optimizer/gi/stats`, `@genshin-optimizer/gi/uidata`, `@genshin-optimizer/gi/util`, `@genshin-optimizer/gi/wr`).
- **FR-004**: All imports of `@genshin-optimizer/gi/ui/useTeamData` across `packages/engine/src/session.ts`, `packages/engine/src/solver.ts`, `packages/engine/src/catalog.ts`, `packages/engine/scripts/capture-golden.ts`, `packages/engine/test/golden.test.ts`, and `packages/engine/test/spike.test.ts` MUST be switched to `packages/engine/src/teamData.ts`.
- **FR-005**: `packages/engine/scripts/build-engine.mjs` MUST use `esbuild` to prebuild:
  1. `apps/web/public/workers/optimizer.worker.js` (single tree-shaken, minified browser worker bundle, `≤ 1.2 MB` raw), and
  2. `packages/engine/dist/index.mjs` (prebuilt headless ESM engine bundle).
- **FR-006**: `packages/engine/package.json` and root `package.json` MUST wire `build-engine.mjs` into the `packages/engine` `build` script and root `build` and `dev` scripts so the worker and engine bundles are always built before Next.js starts.
- **FR-007**: `apps/web/src/lib/engine/workerClient.ts` MUST spawn `new Worker('/workers/optimizer.worker.js')` directly instead of bundling `apps/web/src/workers/optimizer.worker.ts` through Next.js/Webpack.
- **FR-008**: `apps/web/next.config.ts` MUST NOT include `@gi/engine` in `transpilePackages` and MUST NOT alias `@genshin-optimizer/*` to raw TypeScript sources under `vendor/genshin-optimizer`.
- **FR-009**: `vendor/genshin-optimizer` MUST remain completely untouched (`git status vendor/genshin-optimizer` clean).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `apps/web/out` total size is `< 15 MB` (`15,728,640` bytes; baseline `128.96 MB`) and contains `0` `.png` files (baseline `2,732` PNG files totaling `123.52 MB`).
- **SC-002**: `apps/web/public/workers/optimizer.worker.js` raw size is `≤ 1.2 MB` (`1,258,291` bytes; verified prototype `~1.00 MB` raw / `~336 KB` gzip; baseline `~2.4 MB` raw / `~644 KB` gzip).
- **SC-003**: 100% of golden fixtures (`11/11` in `packages/engine/test/golden.test.ts`) pass with `≤ 0.1%` relative error (`0%` drift from baseline).
- **SC-004**: First Load JS for every route (`/`, `/import`, `/presets`, `/optimize`, `/teams`) and cold engine-start time (worker spawn to first evaluation result on `/optimize` with the GO sample GOOD dataset) are measured and reported on the production build.
- **SC-005**: `git status --porcelain vendor/genshin-optimizer` outputs nothing (0 lines).

## Assumptions

- **A-001**: Because `esbuild@0.28.2` is already present in the workspace lockfile via `vitest` → `vite` → `esbuild`, `packages/engine/scripts/build-engine.mjs` will resolve `esbuild` directly if hoisted or via `createRequire` from `vitest`/`vite` as a zero-install fallback so offline builds work without modifying `pnpm-lock.yaml`.
- **A-002**: To bring `apps/web/public/workers/optimizer.worker.js` well under the `≤ 1.2 MB` raw budget (down to `~1.00 MB` raw / `~336 KB` gzip) without touching `vendor/genshin-optimizer`, `packages/engine/scripts/build-engine.mjs` applies three safe, behavior-preserving `esbuild` load transforms during bundling:
  1. Drops unused `allStats.material` (7,987 material item entries, ~430 KB raw) from `allStat_gen.json` and compresses the remaining `{ char, weapon, art }` JSON with gzip + GO's built-in `unzipFromB64Gzip` (`@genshin-optimizer/common/util`), saving ~845 KB raw.
  2. Replaces UI-only talent/weapon/artifact document `fields: [...]` arrays in `libs/gi/sheets/src/**/*.tsx` with `fields: []` (saving ~220 KB raw while preserving `states` conditionals and `CharacterSheet.data` / `WeaponSheet.data` / `allArtifactData` formula trees).
  3. Stubs `zod` inside the prebuilt worker/engine bundle with a lightweight schema normalizer (`tooling/go-stubs/zod.ts`) that implements GO's `.parse()`, `.safeParse()`, `.default()`, `.catch()`, `.transform()`, and `.pipe()` database sanitization rules without bundling 455 KB of Zod v4 human-language locale strings and JSON-schema generators.
- **A-003**: To keep `apps/web` buildable whether `trim-go-runtime` runs before or after sibling feature `slim-data-pages`, `build-engine.mjs` also outputs `packages/engine/dist/gi-consts.mjs` and `apps/web/next.config.ts` maps `@genshin-optimizer/gi/consts` to that prebuilt bundle so Next.js never transpiles raw GO TypeScript source.

