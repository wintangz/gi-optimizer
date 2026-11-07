# Implementation Plan: Team-Wide Optimization Mode (`team-wide-optimization`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add a team-wide optimization mode where rotation rows can target any team member (`path` starting with a member's character key or optional `member` field on `RotationTarget`), and `session.optimizeTeam` solves artifacts sequentially in team order (`team[0]..team[3]`), removing each member's chosen 5 pieces from the candidate pool (`excludedArtifactIds`) before solving the next member and skipping members with 0 rotation rows. Surface Team Optimization mode and `TeamOptimizationList` in the Optimize UI and per-row member selection in the Custom Teams rotation builder.

## Technical Context

- **Language/Version**: TypeScript 5.x (strict), React 19, Next.js 15 (`output: 'export'`)
- **Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*` (vendored, read-only)
- **Testing**: Vitest (`packages/engine/test/team-optimization.test.ts`, `apps/web/test/OptimizeViews.test.tsx`)
- **Constraints**: Never edit `vendor/genshin-optimizer`. Single-character `session.optimize` and all golden fixtures must remain byte-identical.

## Project Structure

- `packages/presets/src/schema.ts`:
  - Add optional `member?: CharacterKey` to `RotationTarget` and `parseRotationTarget`.
  - Export `resolveRotationTargetOwner(rt: RotationTarget, preset: Preset): { memberKey: CharacterKey; normPath: [string, string] }`.
- `packages/engine/src/solver.ts`:
  - Add optional `excludedArtifactIds?: ReadonlySet<string>` to `filterArtifactsForOptimizer` and `runSolver`.
- `packages/engine/src/types.ts` & `packages/engine/src/session.ts`:
  - Add `TeamMemberOptimizeResult`, `TeamOptimizeProgress`, `TeamOptimizeOptions`, and `TeamOptimizeResult` to `types.ts`.
  - Update `session.evaluate` so rotation rows owned by any team member evaluate against `calc[ownerKey]?.target`.
  - Implement `session.optimizeTeam(preset, settings, opts)` on `EngineSession`.
- `apps/web/src/workers/optimizer.worker.ts` & `apps/web/src/lib/engine/workerClient.ts`:
  - Add `optimizeTeam` worker message/response and `optimizeTeamInWorker`.
- `apps/web/src/components/OptimizeViews.tsx`, `apps/web/src/app/optimize/page.tsx`, & `apps/web/src/app/teams/page.tsx`:
  - Render member badge in `PresetRotationSummary` when a row targets a non-primary team member.
  - Add `TeamOptimizationList` in `OptimizeViews.tsx` and `team` mode button (`Optimize Team`) in `apps/web/src/app/optimize/page.tsx`.
  - Add a Member selector column in the rotation builder table in `apps/web/src/app/teams/page.tsx`.
