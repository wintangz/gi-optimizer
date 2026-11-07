# Tasks: Team-Wide Optimization Mode (`team-wide-optimization`)

**Input**: Design documents from `/specs/team-wide-optimization/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Preset Schema & Multi-Member Rotation Target Resolution

- [x] T001 Add optional `member?: CharacterKey` to `RotationTarget` and export `resolveRotationTargetOwner` in `packages/presets/src/schema.ts`

## Phase 2: Solver Disjoint Artifact Exclusion & `session.optimizeTeam`

- [x] T002 Add `excludedArtifactIds?: ReadonlySet<string>` support to `filterArtifactsForOptimizer` and `runSolver` in `packages/engine/src/solver.ts`
- [x] T003 Define `TeamMemberOptimizeResult`, `TeamOptimizeProgress`, `TeamOptimizeOptions`, and `TeamOptimizeResult` in `packages/engine/src/types.ts` and implement multi-member `evaluate` + sequential greedy `optimizeTeam` in `packages/engine/src/session.ts`

## Phase 3: Worker & Optimize / Custom Teams UI

- [x] T004 Expose `optimizeTeam` in `apps/web/src/workers/optimizer.worker.ts` and `optimizeTeamInWorker` in `apps/web/src/lib/engine/workerClient.ts`
- [x] T005 Add `TeamOptimizationList` and non-target member badges in `PresetRotationSummary` in `apps/web/src/components/OptimizeViews.tsx`, wire `Optimize Team` mode in `apps/web/src/app/optimize/page.tsx`, and add per-row team member selector in `apps/web/src/app/teams/page.tsx`

## Phase 4: Unit & Integration Verification

- [x] T006 Add engine tests in `packages/engine/test/team-optimization.test.ts` and UI tests in `apps/web/test/OptimizeViews.test.tsx`, then run full `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
