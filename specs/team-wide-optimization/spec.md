# Feature Specification: Team-Wide Optimization Mode (`team-wide-optimization`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "Feature 5: team-wide-optimization — Today optimization solves artifacts for one target (`team[0]`) while teammates stay on their current or simulated gear. Add a team-wide optimization mode: A rotation can include target rows pointing at any team member (`path` starting with a member's character key, or a per-row member field). When Team Optimization runs, solve artifacts across the team in team order (target first, then members 2–4), removing each member's chosen 5 pieces from the pool before solving the next so no artifact is equipped twice. Members with no rotation rows keep their current/simulated gear without running the solver. Results show each optimized member's build + subtotal and the combined team total. Single-target optimization is unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Member Rotation Rows & Team Evaluation (Priority: P1)

Users can author rotation rows pointing at any member of the team (either via a 3-segment `path: [memberKey, section, targetKey]` or an explicit `member?: CharacterKey` field on `RotationTarget`), and both `session.evaluate()` and the custom team editor's rotation builder support choosing which team member owns each rotation damage row.

**Why this priority**: Team-wide optimization requires rotation rows to be attributable to specific team members and evaluated against each member's own GO `UIData` within the shared team context.

**Independent Test**: Construct a preset with 2+ team members where rotation rows reference both `team[0]` and `team[1]` (via `path: [memberKey, section, targetKey]` or `member: memberKey`). Verify `resolveRotationTargetOwner` and `session.evaluate` resolve each row against the owning member's `UIData`.

**Acceptance Scenarios**:

1. **Given** a rotation target with `path: ['Furina', 'skill', 'usherDmg']` (or `member: 'Furina'`, `path: ['skill', 'usherDmg']`) in a team where `team[0]` is `Neuvillette` and `team[1]` is `Furina`, **When** `resolveRotationTargetOwner(rt, preset)` and `session.evaluate(preset)` run, **Then** the row is evaluated against `Furina`'s `UIData` in `calc['Furina'].target` while `Neuvillette`'s rows are evaluated against `calc['Neuvillette'].target`.
2. **Given** any existing single-character bundled preset (where rows have 2-segment paths like `['charged', 'judgmentDmg']` or start with `preset.target`), **When** `session.evaluate(preset)` or `session.optimize(preset, settings)` runs, **Then** single-character behavior and all golden fixtures remain 100% byte-identical.

---

### User Story 2 - Sequential Greedy Team Optimization Without Artifact Reuse (Priority: P1)

When Team Optimization runs (`session.optimizeTeam(preset, settings, opts)`), the engine solves artifacts across the team in team order (`team[0]`, then `team[1]`, `team[2]`, `team[3]`):
- Each member's chosen 5 artifact pieces are removed from the candidate pool (`excludedArtifactIds`) before solving the next member, guaranteeing that no artifact ID is ever assigned to two team members simultaneously.
- Members with no rotation rows attributed to them skip the solver and keep their current/simulated gear (`skipped: true`).
- Subsequent members' solver runs reflect earlier members' newly assigned builds in the team calculation context.

**Why this priority**: Prevents two characters on the same team from claiming the same physical artifact piece while maximizing each damage-dealing member's rotation subtotal in priority order.

**Independent Test**: Run `session.optimizeTeam` on a 2-carry/sub-DPS team sharing the same artifact set / stat profile (e.g., two Hydro or Pyro DPS/sub-DPS members with rotation rows, plus support members with 0 rotation rows). Verify:
1. Every optimized member with rotation rows receives a 5-piece build and a positive subtotal.
2. The intersection of assigned artifact IDs across all optimized members is empty (`size === 0`).
3. Members with 0 rotation rows are marked `skipped: true` with `tested === 0` and retain their current/simulated gear.
4. `teamTotal` equals the sum of all optimized members' subtotals.

**Acceptance Scenarios**:

1. **Given** a preset where `team[0]` and `team[1]` both have rotation rows and compete for the same artifact pool, **When** `session.optimizeTeam` runs, **Then** `team[0]` gets its optimal 5-piece set first, those 5 artifact IDs are excluded from `team[1]`'s candidate pool, and no artifact ID appears in both members' `selection.artifactIds`.
2. **Given** a team member `team[2]` with 0 rotation rows in `preset.rotation.targets`, **When** `session.optimizeTeam` runs, **Then** the solver is not invoked for `team[2]`, `memberResult.skipped` is `true`, and `team[2]` keeps its current/simulated build.

---

### User Story 3 - Team Optimization UI Mode & Per-Member + Combined Results (Priority: P1)

On the Optimize page (`/optimize`), users can select the **Optimize Team** mode alongside **Single Weapon** and **Compare Weapons**. Running Team Optimization displays a `TeamOptimizationList` showing:
- Combined Team Rotation DMG total (`teamTotal`), comparison against Current Team Baseline (`currentTeamTotal`), and total tested/pruned builds.
- Per-member cards in team order (`team[0]..team[3]`):
  - For optimized members (with rotation rows): their assigned 5 artifact pieces, core stats, rotation instance breakdown, and member subtotal vs. current member subtotal.
  - For skipped members (0 rotation rows): a clear badge indicating they have no rotation rows and kept their current/simulated gear.

**Why this priority**: Surfaces the team-wide optimization workflow and results directly in the Optimize UI without altering single-target optimization.

**Independent Test**: Render `TeamOptimizationList` with a `TeamOptimizeResult` containing optimized members and skipped support members, and verify combined team total, per-member subtotals, artifact badges, and skipped member badges render accurately.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `RotationTarget` in `@gi/presets` MUST support optional `member?: CharacterKey` in addition to 3-segment paths `[memberKey, section, targetKey]`, and export `resolveRotationTargetOwner(rt: RotationTarget, preset: Preset): { memberKey: CharacterKey; normPath: [string, string] }`.
- **FR-002**: `filterArtifactsForOptimizer` and `runSolver` in `packages/engine/src/solver.ts` MUST accept an optional `excludedArtifactIds?: ReadonlySet<string>` and exclude any artifact whose `id` is in `excludedArtifactIds`.
- **FR-003**: `EngineSession` MUST expose `optimizeTeam(preset: Preset, settings: OptimizerSettings, opts?: TeamOptimizeOptions): Promise<TeamOptimizeResult>` that solves artifacts across `preset.team` in team order (`0..team.length - 1`), skipping members with 0 rotation rows, removing each solved member's chosen 5 artifact IDs from the pool before solving the next member, and returning per-member results (`TeamMemberOptimizeResult[]`) plus `teamTotal` and `currentTeamTotal`.
- **FR-004**: `apps/web/src/workers/optimizer.worker.ts` and `apps/web/src/lib/engine/workerClient.ts` MUST expose `optimizeTeamInWorker`.
- **FR-005**: `apps/web/src/components/OptimizeViews.tsx` and `apps/web/src/app/optimize/page.tsx` MUST add a `team` optimization mode (`Optimize Team`) and `TeamOptimizationList` component displaying each member's optimized build + subtotal (or skipped status) and the combined team total.
- **FR-006**: `apps/web/src/app/teams/page.tsx` MUST allow selecting which team member owns each rotation target row in the custom team rotation builder, and `PresetRotationSummary` MUST display the member badge when a rotation row belongs to a non-primary team member.
- **FR-007**: Single-character optimization (`session.optimize`) and all existing golden fixtures MUST remain byte-identical.

## Assumptions

- When a non-target member (`team[i]`, $i \ge 1$) has rotation rows in `optimizeTeam`, that member is solved using the user's owned character & equipped weapon in GOOD if owned (or its preset TC character/weapon if not owned in GOOD), searching the remaining candidate artifact pool (`excludedArtifactIds` containing all artifact IDs already assigned to earlier members `0..i-1`).
- During `optimizeTeam`, `includeEquippedOnOthers` in `settings` still governs whether artifacts equipped on characters outside the current solver step are eligible, except that any artifact already assigned to an earlier team member in the same `optimizeTeam` run is unconditionally excluded via `excludedArtifactIds`.
- Per-stat constraints (`settings.constraints`) apply to the primary target (`team[0]`) as configured; for secondary members (`team[1..3]`), solver pool filters (`levelLow`, `levelHigh`, `minRarity`, `minRv`, `lockedOnly`, `excludedCharacters`) apply while target-specific stat constraints and artifact-set filters do not block secondary teammates unless configured.

## Success Criteria *(mandatory)*

- **SC-001**: No artifact ID is ever assigned to more than one member in `TeamOptimizeResult.members`.
- **SC-002**: Members with 0 rotation rows are skipped (`skipped: true`, `tested: 0`) and keep their current/simulated gear.
- **SC-003**: Single-character `session.optimize` results and all golden fixtures remain 100% byte-identical.
