# Research & Technical Decisions: Optimize Experience UI (`optimize-experience-ui`)

## Decision 1: `migrateOptimizerSettings` at Load & Solver Boundaries

- **Context**: Existing persisted IndexedDB settings and existing unit tests may pass `erFloor?: number`.
- **Decision**: Add `migrateOptimizerSettings(raw?: Partial<OptimizerSettings>): OptimizerSettings` in `packages/presets/src/settings.ts`. When `raw?.erFloor !== undefined && raw.erFloor > 0`:
  - Check whether `raw.constraints` already includes `c.stat === 'enerRech_'`.
  - If not, prepend `{ stat: 'enerRech_', min: raw.erFloor }` to `constraints`.
  - Return the normalized `OptimizerSettings` with `erFloor` omitted (`undefined`).
- Call `migrateOptimizerSettings` in `loadSettings()` / `useOptimizerSettings()` and at the start of `runSolver()` so `runSolver` iterates only `migrated.constraints`.

## Decision 2: Reusable `<ConstraintsCard>` & `<BuildComparisonList>` Components

- **Context**: Extracting the Constraints card and Build Comparison Results list into `apps/web/src/components/OptimizeViews.tsx` keeps `apps/web/src/app/optimize/page.tsx` clean and enables fast, deterministic SSR/component tests using `renderToStaticMarkup`.
- **Decision**: Create `apps/web/src/components/OptimizeViews.tsx` exporting `ConstraintsCard` and `BuildComparisonList`, styled via shared classes in `apps/web/src/app/globals.css`.
