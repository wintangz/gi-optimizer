# Feature Specification: Bundle Isolation & Animated Loading Feedback

**Feature**: `loading-and-bundle` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Bundle size isolation & animated loading feedback across all routes: (1) Eliminate `@gi/engine` and `@genshin-optimizer/gi/stats` (`allStat_gen.json`, 2.4 MB / ~430 kB gzipped) from the shared and per-page initial JS bundles of `/`, `/import`, and `/presets` by moving `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `SetFilterMode`, and `resolveArtSetExclusion` into a pure module (`packages/presets/src/settings.ts`, re-exported from `@gi/presets` and `@gi/engine`) and replacing runtime `@genshin-optimizer/gi/stats` imports in `@gi/presets` and `@gi/good` with a compact generated static metadata module (`statMeta.gen.ts`, ~8 KB verified against `@genshin-optimizer/gi/stats` in unit tests). (2) Ensure `@gi/engine` lives strictly in async/worker chunks loaded on demand when `/optimize` or `/teams` runs. (3) Add route-level `loading.tsx` skeletons with animated pulse on `/`, `/import`, `/presets`, `/optimize`, and `/teams`. (4) Add shared animated `Spinner`, `SkeletonBlock`, `ResultsSkeleton`, and `ProgressBar` components (`apps/web/src/components/Loading.tsx` + CSS keyframes in `apps/web/src/app/globals.css`) with labelled status for engine initialisation ('Loading optimizer engine…'), evaluation ('Evaluating…'), and GOOD import parsing ('Parsing GOOD file…'), skeleton placeholders in `/optimize` results while evaluating, and a real animated progress bar (`tested / total`) during optimization."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lightweight Initial Page Loads Without Heavy Calculation Bundles (Priority: P1)

When a player opens the home page (`/`), imports their account data (`/import`), or browses presets (`/presets`), the browser only downloads lightweight UI, storage, parser, and preset metadata code — never the multi-megabyte Genshin Optimizer calculation engine (`@gi/engine`) or the raw 2.4 MB `allStat_gen.json` skill-multiplier dataset (`@genshin-optimizer/gi/stats`). Even when opening `/optimize` or `/teams`, the route shell renders first while the calculation engine is loaded asynchronously on demand in a Web Worker (or dynamic import chunk).

**Why this priority**: In the baseline build (`c7b23cc`), every route paid a 541 kB shared First Load JS tax (with `/import` and `/presets` at 573 kB and `/optimize` at 903 kB) because `useGood.ts` value-imported `DEFAULT_OPTIMIZER_SETTINGS` from `@gi/engine` and `@gi/presets` + `@gi/good` runtime-imported `@genshin-optimizer/gi/stats` (`allStat_gen.json`). Eliminating both from initial bundles cuts initial JS size dramatically across every route.

**Independent Test**: Run a production static build (`pnpm --filter @gi/web build`), inspect the generated chunk graph and First Load JS sizes, and verify that neither `@gi/engine` nor `allStat_gen.json` is referenced in the shared initial chunks or the initial route bundles for `/`, `/import`, or `/presets`, while unit tests verify 100% parity between `statMeta.gen.ts` and `@genshin-optimizer/gi/stats`.

**Acceptance Scenarios**:

1. **Given** `apps/web/src/lib/storage/useGood.ts` and `apps/web/src/lib/storage/db.ts`, **When** inspected and bundled for `/import` and `/presets`, **Then** they import `OptimizerSettings` and `DEFAULT_OPTIMIZER_SETTINGS` from `@gi/presets` (`packages/presets/src/settings.ts`) with zero runtime imports from `@gi/engine`.
2. **Given** `packages/presets/src/{metadata,validate,userPreset}.ts` and `packages/good/src/parseGood.ts`, **When** they look up character `{ ele, rarity, weaponType }`, weapon `{ weaponType, rarity }`, or artifact set `{ rarities }`, **Then** they read from the compact static `statMeta.gen.ts` module (~8–12 KB) instead of importing `@genshin-optimizer/gi/stats` (`allStat_gen.json`, 2.4 MB).
3. **Given** every character key (`ALL_CHARACTER_KEYS`), weapon key (`ALL_WEAPON_KEYS`), and artifact set key (`ALL_ARTIFACT_SET_KEYS`), **When** tested against `@genshin-optimizer/gi/stats` in Vitest, **Then** `statMeta.gen.ts` matches `getCharEle`, `getCharStat` (`rarity`, `weaponType`), `getWeaponStat` (`weaponType`, `rarity`), and `getArtSetStat` (`rarities`) with 100% accuracy.
4. **Given** a production build of `apps/web`, **When** inspecting the First Load JS of `/`, `/import`, and `/presets`, **Then** `@gi/engine` and `allStat_gen.json` are completely absent from their initial JS chunks and shared root chunks.

---

### User Story 2 - Route-Level Animated Skeletons & Shared Loading Primitives (Priority: P1)

When a player navigates between routes (`/`, `/import`, `/presets`, `/optimize`, `/teams`) or waits for initial client storage hydration (`useGoodStorage`, `useUserPresets`, `useOptimizerSettings`) or GOOD file parsing, the UI immediately displays an animated skeleton layout or labelled animated spinner (`"Parsing GOOD file…"`, `"Loading stored account data…"`) instead of blank screens or static plain text.

**Why this priority**: Previously, the app had zero loading skeletons, zero spinners, and zero CSS animations anywhere, leaving users unsure whether the app was working or frozen during navigation, storage reads, and large GOOD JSON imports.

**Independent Test**: Render each route's `loading.tsx` component and trigger loading states on `/import` (storage loading and GOOD file parsing) and `/presets` (storage/preset loading); verify that animated `SkeletonBlock` and `Spinner` elements with appropriate `role="status"` and `aria-busy="true"` attributes and descriptive labels are displayed.

**Acceptance Scenarios**:

1. **Given** each route directory in `apps/web/src/app/` (`/`, `/import`, `/presets`, `/optimize`, `/teams`), **When** Next.js renders its route-level `loading.tsx` boundary or `<Suspense>` fallback, **Then** a layout-matched skeleton with an animated CSS pulse (`SkeletonBlock`) is shown.
2. **Given** a user uploading, dropping, or pasting a GOOD JSON file on `/import`, **When** parsing and storage persistence are in progress (or while initial IndexedDB account data is loading), **Then** an animated `Spinner` with the label `"Parsing GOOD file…"` (or `"Loading stored account data…"` + skeleton blocks) is displayed.
3. **Given** a user opening `/presets`, **When** stored account data and user presets are hydrating from IndexedDB, **Then** an animated loading indicator / skeleton list is shown in place of static text.

---

### User Story 3 - Animated Engine Status, Evaluation Results Skeletons & Real Optimization Progress Bar (Priority: P1)

When a player opens `/optimize` or `/teams` and the background worker initializes the calculation engine, evaluates the current or selected build, or runs a multi-thousand-build optimization search:
- **Engine initialization & evaluation**: Shows a shared animated `Spinner` with a clear status label (`"Loading optimizer engine…"` during cold worker/session initialization, `"Evaluating…"` during preset/build rotation evaluation) and renders a structured `ResultsSkeleton` placeholder in the `/optimize` results area until the evaluation completes.
- **Optimization progress**: Shows a real animated `ProgressBar` on `/optimize` driven by live `progress.tested`, `progress.skipped`, and `progress.total` counts (`(tested + skipped) / total` percentage fill, animated indeterminate shimmer when `total === 0` during setup, plus formatted tested/pruned/total build counters).

**Why this priority**: Optimization and cold GO engine hydration are the most compute-intensive operations in the application. Visual progress bars and results skeletons give immediate, continuous confirmation that the worker is actively progressing.

**Independent Test**: On `/optimize` and `/teams`, trigger initial evaluation and optimization runs; verify that `"Loading optimizer engine…"` / `"Evaluating…"` spinners and `ResultsSkeleton` appear while awaiting evaluation, and that `ProgressBar` renders an accurate `0%–100%` width fill (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`) from `progress.tested`, `progress.skipped`, and `progress.total`.

**Acceptance Scenarios**:

1. **Given** `/optimize` has an active preset and imported GOOD account, **When** the worker is initializing the engine session for the first time or evaluating the current/optimised build, **Then** an animated `Spinner` with `"Loading optimizer engine…"` or `"Evaluating…"` is shown alongside `<ResultsSkeleton />` in the results area if no evaluation result is ready yet.
2. **Given** an optimization run is active on `/optimize`, **When** `onProgress({ tested, skipped, total })` updates arrive from the worker, **Then** `<ProgressBar />` renders an animated fill track reflecting `Math.min(100, Math.round(((tested + skipped) / total) * 100))`% (or an indeterminate animated bar while `total === 0`), displaying the percentage and `tested`, `skipped`, and `total` build counts.
3. **Given** `/teams` is loading character target/conditional catalogs or computing the debounced live rotation preview in the worker, **When** a catalog fetch or preview evaluation is in flight, **Then** an animated `Spinner` (`"Loading optimizer engine…"` / `"Evaluating…"`) and/or skeleton rows are displayed in the rotation preview panel.

### Edge Cases

- **Zero or not-yet-known `progress.total` at solver start**: Before the first permutation's `countBuilds` is accumulated (`total === 0`), `ProgressBar` renders in an indeterminate animated state (`0 / …` with a sliding shimmer animation) and never divides by zero or produces `NaN%`.
- **Fast evaluations (< 50 ms) vs. initial cold engine load**: When switching top-N builds on an already-hydrated session, if `currentEval` is already present, the existing comparison card stays visible with an inline animated `<Spinner label="Evaluating…" size="sm" />` badge rather than collapsing the entire page layout, while initial preset evaluation without `currentEval` renders the full `<ResultsSkeleton />`.
- **Large GOOD file paste/drop on `/import`**: `handleRawInput` yields a frame before running `parseGood(raw)` so React paints the `"Parsing GOOD file…"` animated `<Spinner />` immediately before synchronous JSON parsing begins.
- **Reduced motion accessibility**: CSS animations in `apps/web/src/app/globals.css` respect `@media (prefers-reduced-motion: reduce)` by toning down rapid motion while keeping clear visual state indicators.
- **Backward compatibility for `@gi/engine` consumers**: Re-exporting `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `SetFilterMode`, and `resolveArtSetExclusion` from both `@gi/presets` and `@gi/engine` ensures existing engine tests and external callers continue to work without breaking changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a pure settings module `packages/presets/src/settings.ts` (re-exported from `@gi/presets` and `@gi/engine`) with zero runtime imports from `@gi/engine` or `@genshin-optimizer/gi/stats`, exporting `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, and `summarizeArtSetFilter`.
- **FR-002**: `apps/web/src/lib/storage/useGood.ts`, `apps/web/src/lib/storage/db.ts`, and `apps/web/src/app/optimize/page.tsx` MUST import `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `SetFilterMode`, and `resolveArtSetExclusion` from `@gi/presets` so `useGood.ts` has zero runtime dependency on `@gi/engine`.
- **FR-003**: The system MUST provide a compact static metadata module `statMeta.gen.ts` (~8–12 KB) in `packages/presets/src/statMeta.gen.ts` and `packages/good/src/statMeta.gen.ts` (generated from `@genshin-optimizer/gi/stats` via `packages/presets/scripts/generate-stat-meta.ts`) containing character `{ ele, rarity, weaponType }`, weapon `{ weaponType, rarity }`, and artifact set `{ rarities }`.
- **FR-004**: `packages/presets/src/metadata.ts`, `packages/presets/src/validate.ts`, `packages/presets/src/userPreset.ts`, and `packages/good/src/parseGood.ts` MUST use `statMeta.gen.ts` and MUST NOT import `@genshin-optimizer/gi/stats` at runtime.
- **FR-005**: Automated unit tests MUST verify that every character, weapon, and artifact set entry in `statMeta.gen.ts` is 100% identical to `@genshin-optimizer/gi/stats` (`getCharEle`, `getCharStat`, `getWeaponStat`, `getArtSetStat`) and that no source file in `packages/presets/src/` or `packages/good/src/` imports `@genshin-optimizer/gi/stats` at runtime.
- **FR-006**: The GO calculation engine (`@gi/engine`) MUST only be loaded via Web Worker (`apps/web/src/workers/optimizer.worker.ts`) or dynamic `import('@gi/engine')` inside `apps/web/src/lib/engine/workerClient.ts`, and MUST NOT appear in the initial synchronous JS bundle of `/`, `/import`, or `/presets`.
- **FR-007**: `apps/web/src/app/globals.css` MUST define reusable CSS keyframe animations (`gi-spin`, `gi-pulse`, `gi-progress-shimmer`) and utility classes for spinners, skeleton blocks, and progress bars.
- **FR-008**: `apps/web/src/components/Loading.tsx` MUST export shared, accessible loading primitives:
  - `Spinner` (animated SVG/CSS ring spinner with configurable size and optional status label such as `"Loading optimizer engine…"`, `"Evaluating…"`, `"Parsing GOOD file…"`).
  - `SkeletonBlock` (animated pulse placeholder with configurable width, height, border radius, and line count).
  - `ResultsSkeleton` (structured skeleton mirroring the `/optimize` rotation summary cards, per-instance table, and artifact slot comparison table).
  - `ProgressBar` (animated determinate/indeterminate progress bar accepting `tested`, `skipped`, `total`, and optional `label`).
- **FR-009**: Route-level `loading.tsx` files MUST be present for all five routes (`apps/web/src/app/loading.tsx`, `apps/web/src/app/import/loading.tsx`, `apps/web/src/app/presets/loading.tsx`, `apps/web/src/app/optimize/loading.tsx`, `apps/web/src/app/teams/loading.tsx`), mirroring each page's layout with animated `SkeletonBlock` / `Spinner` components, and `/optimize` and `/teams` `<Suspense>` boundaries MUST use animated skeleton fallbacks instead of plain text.
- **FR-010**: Every asynchronous wait across `/import` (initial IndexedDB load + GOOD file parsing), `/presets` (IndexedDB account/user-preset hydration), `/optimize` (engine initialization, current/optimised build evaluation, and active optimization progress), and `/teams` (engine catalog loading and live rotation preview evaluation) MUST render an animated indicator from `apps/web/src/components/Loading.tsx`; no static-text-only loading states may remain.

### Key Entities

- **`StatMeta` (`statMeta.gen.ts`)**: Compact static lookup tables mapping `CharacterKey -> { ele, rarity, weaponType }`, `WeaponKey -> { weaponType, rarity }`, and `ArtifactSetKey -> { rarities }`.
- **`OptimizerSettings` & `resolveArtSetExclusion` (`packages/presets/src/settings.ts`)**: Pure optimizer constraint configuration, default values (`DEFAULT_OPTIMIZER_SETTINGS`), and set-filter-to-GO-exclusion translator (`resolveArtSetExclusion`).
- **`Loading` Primitives (`apps/web/src/components/Loading.tsx`)**: `Spinner`, `SkeletonBlock`, `ResultsSkeleton`, and `ProgressBar` components providing accessible (`role="status"`, `role="progressbar"`), animated visual feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Production build (`next build --webpack`) shared First Load JS and `/import` / `/presets` First Load JS drop by at least 60% compared to the 541 kB / 573 kB baseline (eliminating the ~430 kB gzipped `allStat_gen.json` chunk and `@gi/engine` from initial page bundles).
- **SC-002**: 100% of character, weapon, and artifact metadata in `statMeta.gen.ts` matches `@genshin-optimizer/gi/stats` in automated unit tests, and 0 runtime imports of `@genshin-optimizer/gi/stats` or `@gi/engine` exist in `packages/good/src`, `packages/presets/src`, or `apps/web/src/lib/storage`.
- **SC-003**: All 5 route-level `loading.tsx` files (`/`, `/import`, `/presets`, `/optimize`, `/teams`) and all 4 interactive pages (`/import`, `/presets`, `/optimize`, `/teams`) render animated loading indicators (`Spinner`, `SkeletonBlock`, `ResultsSkeleton`, `ProgressBar`) during every loading, parsing, engine initialization, evaluation, and optimization wait state, with 0 static-text-only loading fallbacks remaining.
- **SC-004**: All unit, component, and golden fixture tests (`pnpm -r test`, `pnpm -r typecheck`, `pnpm --filter @gi/web build`) pass with zero errors.

## Assumptions

- **LB-A1 (Identical Static Metadata Module in `@gi/presets` and `@gi/good`)**: To keep `@gi/good` dependency-free at the bottom of the workspace layering (`packages/good` → `packages/presets` → `packages/engine` → `apps/web`) without modifying `package.json` files, `packages/presets/scripts/generate-stat-meta.ts` writes the identical compact `statMeta.gen.ts` module to both `packages/presets/src/statMeta.gen.ts` and `packages/good/src/statMeta.gen.ts`, and unit tests verify both against `@genshin-optimizer/gi/stats`.
- **LB-A2 (Engine Initialization vs. Evaluation Status Labels)**: `workerClient.ts` exposes a lightweight `isEngineSessionHydrated(datasetKey: string): boolean` helper so `/optimize` and `/teams` can distinguish cold engine initialization (`"Loading optimizer engine…"`) from warm rotation evaluation (`"Evaluating…"`).
- **LB-A3 (Yield Before Large Synchronous GOOD Parse)**: Because `parseGood` is a synchronous function in `@gi/good`, `/import` sets `parsing = true` and awaits a macrotask/animation frame (`new Promise((r) => setTimeout(r, 0))`) before invoking `parseGood(raw)` so the browser immediately paints the animated `<Spinner label="Parsing GOOD file…" />`.
- **LB-A4 (Shared `packages/presets/src/settings.ts` Contract with `artifact-set-filter`)**: `packages/presets/src/settings.ts` implements the full `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` contract specified in `docs/architecture.md` so `loading-and-bundle` and `artifact-set-filter` are 100% compatible regardless of merge/execution order.
