# Research & Technical Decisions: Bundle Isolation & Animated Loading Feedback (`loading-and-bundle`)

## R1. Eliminating `@gi/engine` from `useGood.ts` and Initial Page Bundles

- **Decision**: Move `SetFilterMode`, `OptimizerSettings`, `DEFAULT_OPTIMIZER_SETTINGS`, `resolveArtSetExclusion`, and `summarizeArtSetFilter` into `packages/presets/src/settings.ts` (a pure TypeScript module with zero runtime imports from `@gi/engine` or `@genshin-optimizer/gi/stats`), re-export them from `packages/presets/src/index.ts` and `packages/engine/src/types.ts` / `packages/engine/src/index.ts`, and update `apps/web/src/lib/storage/useGood.ts` and `apps/web/src/lib/storage/db.ts` to import from `@gi/presets`.
- **Rationale**: In commit `c7b23cc`, `apps/web/src/lib/storage/useGood.ts` line 3 contained `import { DEFAULT_OPTIMIZER_SETTINGS, type OptimizerSettings } from '@gi/engine'`. Because `packages/engine/src/index.ts` re-exports `session.ts`, `solver.ts`, and `catalog.ts` (which pull in `@genshin-optimizer/gi/db`, `@genshin-optimizer/gi/sheets`, `@genshin-optimizer/gi/wr`, and `@genshin-optimizer/gi/stats`), any route importing `useGood.ts` (`/import`, `/presets`, `/optimize`, `/teams`) had the entire GO engine graph linked into its module graph. Moving `DEFAULT_OPTIMIZER_SETTINGS` to `@gi/presets` severs the only runtime link between `useGood.ts` and `@gi/engine`.
- **Alternatives considered**:
  - Deep-importing `@gi/engine/types`: Still couples storage hooks to the engine package and does not house `resolveArtSetExclusion` alongside `ALL_ARTIFACT_SET_KEYS` in `@gi/presets`.

## R2. Replacing Runtime `@genshin-optimizer/gi/stats` (`allStat_gen.json`, 2.4 MB) in `@gi/presets` and `@gi/good`

- **Decision**: Create a generator script `packages/presets/scripts/generate-stat-meta.ts` that reads `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats` at codegen time and emits a compact static TypeScript module `statMeta.gen.ts` (~8–12 KB uncompressed, ~2 KB gzipped) into both `packages/presets/src/statMeta.gen.ts` and `packages/good/src/statMeta.gen.ts`. Replace all runtime `@genshin-optimizer/gi/stats` imports in `packages/presets/src/{metadata,validate,userPreset}.ts` and `packages/good/src/parseGood.ts` with `./statMeta.gen`.
- **Rationale**: `@genshin-optimizer/gi/stats` (`vendor/genshin-optimizer/libs/gi/stats/src/index.ts`) unconditionally imports `./allStat_gen.json` (2.4 MB of every character/weapon skill multiplier table at Lv. 1–15). In `c7b23cc`, webpack bundled `allStat_gen.json` into a 430 kB gzipped shared initial chunk (`60-*.js`) loaded on every route (`/`, `/import`, `/presets`, `/optimize`, `/teams`). Yet `@gi/presets` and `@gi/good` only ever inspect:
  1. Character `ele`, `rarity`, and `weaponType` (`metadata.ts`, `validate.ts`, `userPreset.ts`, `parseGood.ts`).
  2. Weapon `weaponType` and `rarity` (`metadata.ts`, `validate.ts`, `parseGood.ts`).
  3. Artifact set `rarities` (`metadata.ts`).
  Pre-extracting those 3 tiny maps into `statMeta.gen.ts` eliminates `allStat_gen.json` from all initial page bundles while keeping `@gi/engine` free to use the full `@genshin-optimizer/gi/stats` inside the async Web Worker.
- **Alternatives considered**:
  - Making `@gi/presets` depend on `@gi/good`: Works, but writing the identical generated `statMeta.gen.ts` to both `packages/good/src/statMeta.gen.ts` and `packages/presets/src/statMeta.gen.ts` requires zero `package.json` or lockfile changes and keeps each package self-contained.

## R3. Enforcing Worker/Async-Only Loading for `@gi/engine`

- **Decision**: Keep all runtime `@gi/engine` imports strictly inside `apps/web/src/workers/optimizer.worker.ts` (bundled as an async Web Worker chunk via `new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url))`) and dynamic `await import('@gi/engine')` fallback inside `apps/web/src/lib/engine/workerClient.ts`. Add a unit/static-analysis test verifying that no file in `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/lib/storage/`, `packages/presets/src/`, or `packages/good/src/` contains a static value import from `@gi/engine` or `@genshin-optimizer/gi/stats`.
- **Rationale**: Guarantees that `/`, `/import`, and `/presets` never download `@gi/engine`, and `/optimize` and `/teams` render their initial UI and skeletons immediately while the worker chunk loads in parallel.
- **Alternatives considered**: None.

## R4. Route-Level Skeletons & Shared Animated Loading Components

- **Decision**:
  1. Add CSS keyframe animations (`@keyframes gi-spin`, `@keyframes gi-pulse`, `@keyframes gi-progress-shimmer`) and utility classes (`.gi-spinner`, `.gi-skeleton`, `.gi-progress-track`, `.gi-progress-fill`) to `apps/web/src/app/globals.css`, with `@media (prefers-reduced-motion: reduce)` support.
  2. Create `apps/web/src/components/Loading.tsx` exporting:
     - `Spinner`: Animated SVG ring spinner (`role="status"`, `aria-live="polite"`) with `size?: 'sm' | 'md' | 'lg'` and `label?: string` (`"Loading optimizer engine…"`, `"Evaluating…"`, `"Parsing GOOD file…"`).
     - `SkeletonBlock`: Animated pulsing placeholder block (`aria-hidden="true"`) with customizable `width`, `height`, `borderRadius`, and `count`.
     - `ResultsSkeleton`: Structured skeleton mirroring `/optimize` results (3 summary metric cards, per-instance breakdown table rows, and 5-slot artifact loadout comparison rows) with an optional status header (`Spinner`).
     - `ProgressBar`: Real animated progress bar (`role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={percent}`) displaying `(tested + skipped) / total` percentage fill, indeterminate shimmer when `total === 0`, and formatted `tested`, `skipped`, and `total` build counters.
  3. Add Next.js App Router `loading.tsx` files for `/`, `/import`, `/presets`, `/optimize`, and `/teams` that mirror each page's header, filter/control panels, and content grid.
  4. Replace all static text loading states across `/import`, `/presets`, `/optimize`, and `/teams` (including `<Suspense>` fallbacks, IndexedDB hydration states, GOOD file parsing, engine initialization, rotation evaluation, and solver progress) with these animated components.
- **Rationale**: Provides consistent, zero-dependency, accessible visual feedback for every asynchronous operation in the app.
- **Alternatives considered**:
  - Third-party skeleton/spinner UI libraries: Rejected per Constitution Engineering Standards (Simplicity — no dependencies added without need).
