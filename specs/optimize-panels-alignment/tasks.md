# Tasks: Optimize Filter Panels Matched Pair Alignment (`optimize-panels-alignment`)

- [x] T001 Add matched filter panel pair CSS rules (`.opt-filter-pair`, `.opt-filter-panel`, `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, `.opt-filter-mode-group`, `.opt-filter-panel-toolbar`, responsive stacking) in `apps/web/src/app/globals.css`
- [x] T002 Update `ArtifactSetFilter` in `apps/web/src/components/ArtifactSetFilter.tsx` to use the matched `.opt-filter-panel` structure
- [x] T003 Update the Protected Characters & Artifact Set Filter section in `apps/web/src/app/optimize/page.tsx` to use `.opt-filter-pair` and matched `.opt-filter-panel` rows with `searchable={true}`
- [x] T004 Add unit test assertions in `apps/web/test/ArtifactSetFilter.test.tsx` and `apps/web/test/official-owned-first-ui.test.tsx` verifying the matched panel pair structure and alignment classes
- [x] T005 Run `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @gi/web test` and commit as `"feat: optimize-panels-alignment"`
