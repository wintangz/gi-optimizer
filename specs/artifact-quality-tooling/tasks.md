# Tasks: Artifact Roll Value Tooling (`artifact-quality-tooling`)

**Input**: Design documents from `/specs/artifact-quality-tooling/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Shared GO-Aligned RV Implementation (`@gi/good`)

- [x] T001 Implement `packages/good/src/rv.ts` with GO's roll tables (`ART_SUBSTAT_ROLL_TABLE`), roll decomposition (`getSubstatRolls`), and `computeArtifactRollValue`, and export from `packages/good/src/index.ts`, `packages/presets/src/index.ts`, and `packages/engine/src/index.ts`

## Phase 2: UI Badges & Per-Substat Roll Breakdowns (`@gi/web`)

- [x] T002 Add `ArtifactRvBadge` and per-substat roll breakdown details/tooltips in `StatChip` and `ArtifactPieceRow` (`apps/web/src/components/Identifier.tsx`)
- [x] T003 Add the `RV` column (`ArtifactRvBadge`) and per-substat roll breakdown tooltips to the Artifacts inventory table in `apps/web/src/app/import/page.tsx`

## Phase 3: Unit Tests & Verification

- [x] T004 Add unit tests for `computeArtifactRollValue`, `ArtifactRvBadge`, and `ArtifactPieceRow` per-substat roll breakdowns in `apps/web/test/Identifier.test.tsx` and `apps/web/test/OptimizeViews.test.tsx`
- [x] T005 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`
