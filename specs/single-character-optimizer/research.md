# Research: Single-Character Optimizer (`single-character-optimizer`)

## Decisions

### 1. Preset → GO Database Hydration
- **Decision**: Hydrate each evaluation/optimization into a fresh or reset `ArtCharDatabase(1, new SandboxStorage())` with `db.importGOOD(good, false, false, false)`. Then construct:
  - For each member in `preset.team`:
    - Create `teamCharId = db.teamChars.new(member.key, { name: preset.name, conditional: member.conditional, bonusStats: member.bonusStats, hitMode: member.hitMode, reaction: member.reaction, infusionAura: member.infusionAura ?? '', customMultiTargets: isTarget ? [presetToCustomMultiTarget(preset)] : [] })`.
    - If `member.build.type === 'tc'`, create `buildTcId = db.buildTcs.new({ characterKey: member.key, name: 'Preset TC', description: '', character: member.build.tc.character, weapon: member.build.tc.weapon, artifact: member.build.tc.artifact })` and set `loadoutDatum = { teamCharId, buildType: 'tc', buildTcId, buildId: '', compare: false, compareType: 'equipped', compareBuildId: '', compareBuildTcId: '' }`.
    - If `member.build.type === 'owned'`, set `loadoutDatum = { teamCharId, buildType: 'equipped', buildId: '', buildTcId: '', compare: false, compareType: 'equipped', compareBuildId: '', compareBuildTcId: '' }`.
  - Create `teamId = db.teams.new({ name: preset.name, loadoutData, conditional: preset.teamConditional, enemyOverride: { enemyLevel: preset.enemy.level, ...preset.enemy.overrides } })`.
  - Call GO's `getTeamData(db, teamId, targetTeamCharId, mainStatAssumptionLevel, overrideArts, overrideWeapon)` and `uiDataForTeam(teamData.teamData, gender, preset.target)`.
- **Rationale**: Uses GO's exact team calculation pipeline (`useTeamData.ts`) and custom multi-target system (`CustomMultiTarget.ts`), guaranteeing 100% formula parity with GO.

### 2. Optimizer Search & Web Worker Execution
- **Decision**: Compile the target node (`display.custom['0']`) and optional ER constraint (`input.total.enerRech_ >= erFloor`) using GO's `optimize(nodes, workerData, ({ path: [p] }) => p !== 'dyn')` and `compactArtifacts(...)` from `@genshin-optimizer/gi/solver`. Run the branch-and-bound / top-N search inside a Web Worker (in browser via `new Worker(new URL('./optimizer.worker.ts', import.meta.url))`, with a direct in-process async runner fallback for Node/Vitest or environments where `Worker` is unavailable).
- **Rationale**: Keeps the UI responsive with progress callbacks (`tested`, `skipped`, `total`) and instant `AbortSignal` cancellation while using GO's compiled `OptNode` graph (`evalSelector` / branch-and-bound pruning).

### 3. Next.js Bundling of Vendored GO Source
- **Decision**: Use `next build --webpack` with exact-match aliases from `tooling/go-paths.mjs` (`${k}$`) and `tooling/go-shim.d.ts` ambient module boundary, proven in our build spike (compiled and exported static pages in 22 s).

