# Tasks: Buff Coverage Fixes (`buff-coverage-fixes`)

**Input**: Design documents from `/specs/buff-coverage-fixes/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Preset Data & Custom Preset Defaults

- [x] T001 [P] [US1] Add `"ThrillingTalesOfDragonSlayers": { "Heritage": "on" }` to Citlali and `"ArchaicPetra": { "ele": "pyro", "element": "pyro" }` to Xilonen in `packages/presets/data/official/mavuika-melt-hypercarry.json`
- [x] T002 [P] [US1] Add `"ArchaicPetra": { "ele": "hydro", "element": "hydro" }` to Zhongli in `packages/presets/data/official/furina-salon-subdps.json`
- [x] T003 [P] [US3] Export `DEFAULT_TC_TEAMMATE_CONDITIONAL` (`{ NoblesseOblige: { set4: 'on' } }`) and `createDefaultTcTeammate` in `packages/presets/src/userPreset.ts` and apply in `apps/web/src/app/teams/page.tsx` (`addTeammate` and `toggleTeammateBuildType`)

---

## Phase 2: Engine Hydration & Team Calc Buff Coverage

- [x] T004 [US2] Export `getDefaultTargetArtifactSetConditionals()` in `packages/engine/src/catalog.ts` returning boolean on/off artifact-set conditionals (`states.length === 1 && states[0].key === 'on'`)
- [x] T005 [US2] Generalize target weapon conditional auto-population in `packages/engine/src/session.ts` (`hydratePresetTeam`, `evaluate`, `optimize`, `hydrateTeamIntoDb`) to apply to `'owned'` targets whenever an explicit weapon (`weaponId` or `weaponOverride`) is selected and `!member.conditional[weaponKey]`
- [x] T006 [US2] Populate default boolean artifact-set conditionals for `preset.team[0]` (`isTarget`) in `hydratePresetTeam` (`packages/engine/src/session.ts`) when `!member.conditional[setKey]`
- [x] T007 [US3] Fill `teamConditional.resonance` with `'on'` at hydration (`packages/engine/src/session.ts`) for any element appearing 2+ times in `preset.team` when unspecified, and respect explicit resonance `'off'` states in `packages/engine/src/teamData.ts`

---

## Phase 3: Golden Fixture Re-Capture & Regression Tests

- [x] T008 [US1] Rebuild `@gi/engine` (`node packages/engine/scripts/build-engine.mjs`) and re-capture ONLY `packages/engine/test/golden/official__mavuika-melt-hypercarry.json` and `packages/engine/test/golden/official__furina-salon-subdps.json`, verifying the other 9 golden fixtures are byte-identical
- [x] T009 [US1] [US2] [US3] Add regression tests in `packages/engine/test/buff-coverage.test.ts` and `packages/presets/test/userPreset.test.ts` covering Bennett burst on/off, TTDS in official Mavuika, Archaic Petra in official Furina and Mavuika, double-element custom team resonance fill vs off, owned-target weapon swap conditional auto-population in `evaluate` and `optimize`, target boolean set conditionals vs stack conditionals, and default TC teammate `NoblesseOblige` conditional
