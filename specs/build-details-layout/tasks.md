# Tasks: Build Details Layout

- [x] **T001**: Refactor `ArtifactPieceRow` in `apps/web/src/components/Identifier.tsx` to render a compact vertical card (`.artifact-piece-card`) with slot icon (`SlotIcon`), set badge + level, RV badge, main stat, compact substat lines (`.artifact-substat-line`), and descriptive `title` tooltips on owner/lock badges.
- [x] **T002**: Update `OptimizeViews.tsx` and `globals.css` so damage tables use `.comp-damage-table` with compact right-aligned numeric columns (`.comp-dmg-col-num`), `BuildStatComparisonSection` places its hint on a spaced line under the heading (`.comp-details-subhint`), and artifact pieces render under an `"Artifacts"` heading + legend in a responsive 5-column grid (`.comp-details-pieces`).
- [x] **T003**: Update and add unit tests in `apps/web/test/Identifier.test.tsx` and `apps/web/test/OptimizeViews.test.tsx`, run `pnpm typecheck`, `pnpm lint`, and `pnpm test`, and commit as `feat: build-details-layout`.
