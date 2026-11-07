# Tasks: Artifact Set Filter Click Semantics

- [x] **T001**: Update `ArtifactSetFilter.tsx` so clicking a set tile, changing piece counts, or using bulk actions preserves the current `mode` without flipping `'all'` to `'exclude'`, and update `summarizeArtSetFilter` in `packages/presets/src/settings.ts` to plainly describe selections in `'all'` mode.
- [x] **T002**: Add regression tests in `apps/web/test/ArtifactSetFilter.test.tsx` and `packages/presets/test/settings.test.ts`.
- [x] **T003**: Run tests and commit as `feat: set-filter-click-semantics`.
