# Feature Specification: Buff Coverage Fixes (`buff-coverage-fixes`)

**Feature**: `buff-coverage-fixes` (slug; the git commit is the version)

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "The engine runs GO's real team calc and propagates team buffs to the target, but a buff only applies if the preset data (or session setup) sets the GO sheet 'conditional' that gates it. An audit found these holes; fix all of them: 1. PRESET DATA — official/mavuika-melt-hypercarry: Citlali holds Thrilling Tales of Dragon Slayers (R5) but its team ATK buff is gated by the weapon conditional Heritage=on, which the preset never sets. Add the ThrillingTalesOfDragonSlayers conditional (Heritage on) to Citlali's member conditional. 2. PRESET DATA — Archaic Petra 4pc DMG buff is equipped but never activated in two official presets: official/furina-salon-subdps (Zhongli wears Petra, no ArchaicPetra conditional — set ele to hydro, matching the Akasha version of the same team) and official/mavuika-melt-hypercarry (Xilonen wears Petra, no ArchaicPetra conditional — set ele to pyro). 3. WEAPON SWAP (owned targets): when the user selects a weapon for an 'owned' target (official/user presets, evaluate and optimize paths), conditional-gated passives of that weapon must apply. Generalise the behaviour that already exists for Akasha fixed targets: if the target has an explicit weapon choice and the effective conditional map has no entry for that weapon's sheet, auto-populate the weapon's conditionals at their max state (via the existing conditional catalog). Explicitly authored values always win; never override them. 4. TARGET SET CONDITIONALS: boolean on/off artifact-set conditionals for the TARGET default to ON for every set unless the preset explicitly authors a value for that set — so if the optimizer (or the user's current build) uses a set the preset didn't anticipate, its proc-style set bonus counts. Stack/ranged conditionals (counts, stacks, numeric states) are NOT defaulted; they keep the authored value or stay off. Only the target member is affected, and only artifact-set sheets. This must apply identically in evaluate and optimize so displayed current-build numbers and optimizer numbers agree. 5. CUSTOM PRESET DEFAULTS: (a) Resonance defaults on: at session/team hydration, for any element appearing 2+ times in the team, fill teamConditional.resonance for that element with 'on' when the preset does not specify it (bundled presets already author theirs; this must not change any bundled preset's behaviour). (b) Teammates added with the default TC template get the standard support conditional for their default set (NoblesseOblige set4 on) in their member conditional. 6. TESTS: add regression tests proving buffs move the total — Bennett burst conditional on vs off changes an official preset's total; TTDS now active in official Mavuika (total increases vs before); Petra active in official Furina and official Mavuika (totals increase); resonance fill changes a double-element custom team's total vs resonance off; a swapped conditional-gated weapon on an owned target applies its passive. Because fixes 1-2 change real numbers, re-capture ONLY the golden fixtures for official/mavuika-melt-hypercarry and official/furina-salon-subdps, and in the report show each fixture's before/after total with the buff math that explains the delta. Every other golden fixture must remain byte-identical."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bundled Official Preset Buff Coverage (TTDS & Archaic Petra) (Priority: P1)

When evaluating or optimizing the bundled official presets `official/mavuika-melt-hypercarry` and `official/furina-salon-subdps`:
- In `official/mavuika-melt-hypercarry`, Citlali equips R5 `ThrillingTalesOfDragonSlayers` and activates its `Heritage: "on"` conditional (`+48%` ATK to Mavuika), and Xilonen equips 4pc `ArchaicPetra` and activates its Pyro crystallize conditional (`ele: "pyro"`, `element: "pyro"`, `+35%` Pyro DMG Bonus to Mavuika).
- In `official/furina-salon-subdps`, Zhongli equips 4pc `ArchaicPetra` and activates its Hydro crystallize conditional (`ele: "hydro"`, `element: "hydro"`, `+35%` Hydro DMG Bonus to Furina).

**Why this priority**: Bundled official presets are the primary meta setups; equipped support weapons and 4pc support sets must contribute their intended buffs in GO's team calculator.

**Independent Test**: Evaluate `official/mavuika-melt-hypercarry` and `official/furina-salon-subdps` with and without Citlali's `ThrillingTalesOfDragonSlayers` (`Heritage: "on"`), Xilonen's `ArchaicPetra`, Zhongli's `ArchaicPetra`, and Bennett's burst conditional (`activeInArea: "active"`), verifying that each buff strictly increases the rotation total and matches the re-captured golden fixtures while all other 9 golden fixtures remain byte-identical.

**Acceptance Scenarios**:

1. **Given** `official/mavuika-melt-hypercarry`, **When** evaluated via `session.evaluate`, **Then** Citlali's `ThrillingTalesOfDragonSlayers` (`Heritage: "on"`) adds `+48%` of Mavuika's base ATK and Xilonen's `ArchaicPetra` adds `+35%` Pyro DMG Bonus (`pyro_dmg_`), increasing the rotation total over the unbuffed baseline.
2. **Given** `official/furina-salon-subdps`, **When** evaluated via `session.evaluate`, **Then** Zhongli's `ArchaicPetra` adds `+35%` Hydro DMG Bonus (`hydro_dmg_: 0.3174 -> 0.6674`), increasing Furina's rotation total.
3. **Given** an official preset with Bennett (`official/mavuika-melt-hypercarry` or `official/arlecchino-vaporize` or `official/raiden-hypercarry`), **When** Bennett's `activeInArea` conditional is toggled off vs on, **Then** the rotation total strictly changes.

---

### User Story 2 - Weapon Swap Conditional Auto-Population & Target Boolean Set Conditionals (Priority: P1)

When evaluating or optimizing any preset (`official`, `user`, or `akasha`):
- **Owned-target weapon swap**: When the caller passes an explicit weapon choice for an `'owned'` target (`selection.weaponId` / `selection.weaponOverride` in `evaluate` or `exportGODatabase`, or `opts.weaponId` / `opts.weaponOverride` in `optimize`) and the target's `conditional` map has no entry for that weapon's sheet, the engine auto-populates the weapon's conditionals at their maximum state via the conditional catalog (`listConditionalsForCharacter`). Explicitly authored entries for that weapon sheet are never overridden.
- **Target boolean artifact-set conditionals**: For the target member (`team[0]`) only, boolean on/off artifact-set conditionals (`states.length === 1 && states[0].key === 'on'`) default to `'on'` for every artifact set unless the preset explicitly authors a conditional entry for that set (`member.conditional[setKey]`). Stack/ranged/multi-state conditionals (counts, stacks, numeric states, element choices) are NOT defaulted. This applies identically in `evaluate` and `optimize`.

**Why this priority**: Ensures weapon passives on swapped owned weapons and proc-style 2pc/4pc bonuses on non-preset artifact sets work identically in current-build evaluation and solver optimization.

**Independent Test**: Swap an `'owned'` target onto a conditional-gated weapon (e.g., `HarbingerOfDawn` or `StaffOfHoma`) via `selection.weaponId` / `opts.weaponId` and verify its passive applies in both `evaluate` and `optimize`; equip an unanticipated boolean-conditional artifact set (e.g., 4pc `NoblesseOblige` or 4pc `DesertPavilionChronicle` or 4pc `RetracingBolide`) on the target and verify its 4pc bonus applies in both `evaluate` and `optimize` while stack-based sets without authored conditionals stay off.

**Acceptance Scenarios**:

1. **Given** an `'owned'` target preset and an explicit `weaponId` for a conditional-gated weapon not authored in `team[0].conditional`, **When** `session.evaluate` or `session.optimize` runs, **Then** the weapon's conditionals are auto-populated at max state and increase the target's stats/damage; if `team[0].conditional[weaponKey]` is explicitly authored, the authored state wins.
2. **Given** a target character equipping a 4pc artifact set with a boolean `'on'` conditional not authored in `team[0].conditional`, **When** `session.evaluate` or `session.optimize` runs, **Then** the set's boolean conditional defaults to `'on'`; stack/ranged/numeric set conditionals not authored in `team[0].conditional` remain off.

---

### User Story 3 - Custom Preset Defaults (Resonance Fill & Default TC Teammate Noblesse Conditional) (Priority: P1)

When building or hydrating custom presets:
- **Resonance default fill**: At session/team hydration (`hydratePresetTeam`), for any element appearing 2+ times in `preset.team`, if `preset.teamConditional?.resonance` does not specify that element, the engine fills `teamConditional.resonance` for that element with `'on'` (and activates any corresponding GO elemental resonance conditionals unless explicitly turned off). Bundled presets already author their resonances and are unaffected.
- **Default TC teammate conditional**: Teammates added with the default TC template (`NoblesseOblige` 4pc) receive `{ NoblesseOblige: { set4: 'on' } }` in their `member.conditional`.

**Why this priority**: Custom teams created in `/teams` should automatically benefit from elemental resonance and their default 4pc Noblesse Oblige support set without requiring manual conditional plumbing.

**Independent Test**: Evaluate a double-element custom preset with `teamConditional.resonance: {}` vs explicitly `'off'` and verify the total increases when resonance is filled; verify new TC teammates created via the default TC template include `{ NoblesseOblige: { set4: 'on' } }`.

**Acceptance Scenarios**:

1. **Given** a custom team with 2+ members of the same element and an unspecified `teamConditional.resonance`, **When** hydrated and evaluated, **Then** `teamConditional.resonance` is filled with `'on'` for that element and changes the rotation total compared to when that element's resonance is `'off'`.
2. **Given** a teammate added with the default TC template, **When** inspected, **Then** its `conditional` contains `{ NoblesseOblige: { set4: 'on' } }`.

### Edge Cases

- **Explicitly authored empty or custom set/weapon conditional**: If a preset explicitly authors `team[0].conditional[sheet]` (even `{}`), auto-population MUST NOT overwrite it.
- **GO `ArchaicPetra` sheet key (`element` vs `ele`)**: GO's `ArchaicPetra` sheet (`libs/gi/sheets/src/Artifacts/ArchaicPetra/index.tsx`) reads `cond('ArchaicPetra', 'element')`, whereas the Akasha preset JSON convention wrote `ele`. Setting `{ "ele": "hydro", "element": "hydro" }` in `official/furina-salon-subdps.json` and `{ "ele": "pyro", "element": "pyro" }` in `official/mavuika-melt-hypercarry.json` satisfies both the preset JSON `ele` property and GO's `element` sheet conditional without altering any Akasha golden fixture.
- **Resonance on vs off in GO's `Resonance.tsx`**: In GO's `Resonance.tsx`, Pyro (`ffNode`) and Hydro (`swNode`) resonance nodes check `tally[ele] >= 2` without checking `conditional.resonance`, whereas Cryo (`ShatteringIce`), Geo (`EnduringRock`/`EnduringRockHit`), and Dendro (`SprawlingCanopy2ele`/`SprawlingCanopy3ele`) check `conditional.resonance` keys. Hydrating `teamConditional.resonance` fills both the element key (`Pyro`/`pyro`, `Hydro`/`hydro`, `Cryo`/`cryo`, etc.) and any corresponding GO resonance conditional keys when `'on'`, and `getCharDataBundle` suppresses an element's resonance buff in `resonanceData` when `teamConditional.resonance` explicitly sets that element to `'off'`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/presets/data/official/mavuika-melt-hypercarry.json` MUST include `"ThrillingTalesOfDragonSlayers": { "Heritage": "on" }` in Citlali's `conditional` and `"ArchaicPetra": { "ele": "pyro", "element": "pyro" }` in Xilonen's `conditional`.
- **FR-002**: `packages/presets/data/official/furina-salon-subdps.json` MUST include `"ArchaicPetra": { "ele": "hydro", "element": "hydro" }` in Zhongli's `conditional`.
- **FR-003**: `hydratePresetTeam`, `session.evaluate`, `session.optimize`, and `hydrateTeamIntoDb` MUST resolve explicit weapon choices for `'owned'` targets (`selection?.weaponId`, `selection?.weaponOverride`, `opts?.weaponId`, `opts?.weaponOverride`) and auto-populate the weapon's conditionals at their max state from `listConditionalsForCharacter` when `member.conditional[weaponKey]` is not authored.
- **FR-004**: `hydratePresetTeam` MUST default boolean on/off artifact-set conditionals (`states.length === 1 && states[0].key === 'on'`) to `'on'` for the target member (`team[0]`) for every artifact set where `member.conditional[setKey]` is not authored, leaving stack/ranged/multi-state conditionals and non-target members untouched.
- **FR-005**: `hydratePresetTeam` MUST fill `teamConditional.resonance` with `'on'` for any element appearing 2+ times in `preset.team` when `preset.teamConditional?.resonance` does not specify that element, and `teamData.ts` MUST respect `'on'` vs `'off'` resonance states without changing any bundled preset's behaviour.
- **FR-006**: Teammates added or switched to the default TC template (`packages/presets/src/userPreset.ts` and `apps/web/src/app/teams/page.tsx`) MUST include `{ NoblesseOblige: { set4: 'on' } }` in their `conditional`.
- **FR-007**: Golden fixtures `packages/engine/test/golden/official__mavuika-melt-hypercarry.json` and `packages/engine/test/golden/official__furina-salon-subdps.json` MUST be re-captured to reflect FR-001 and FR-002, while all other 9 golden fixtures in `packages/engine/test/golden/` MUST remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Regression tests verify: (a) Bennett burst conditional on vs off changes an official preset's total; (b) TTDS active in `official/mavuika-melt-hypercarry` increases total vs TTDS off; (c) Archaic Petra active in `official/furina-salon-subdps` and `official/mavuika-melt-hypercarry` increases totals vs Petra off; (d) resonance fill changes a double-element custom team's total vs resonance off; (e) a swapped conditional-gated weapon on an owned target applies its passive in `evaluate` and `optimize`; (f) target boolean artifact-set conditionals default to `'on'` while stack conditionals stay off.
- **SC-002**: Only `official__mavuika-melt-hypercarry.json` and `official__furina-salon-subdps.json` change in `packages/engine/test/golden/`; `git diff` confirms the other 9 golden fixtures are byte-identical.

## Assumptions

- **BCF-A1 (Archaic Petra Conditional Key Compatibility)**: GO's `ArchaicPetra` sheet (`vendor/genshin-optimizer/libs/gi/sheets/src/Artifacts/ArchaicPetra/index.tsx` line 24) defines `cond('ArchaicPetra', 'element')`, whereas the Akasha preset JSON files used `"ele"`. Including both `"ele"` and `"element"` in `official/furina-salon-subdps.json` (`{ "ele": "hydro", "element": "hydro" }`) and `official/mavuika-melt-hypercarry.json` (`{ "ele": "pyro", "element": "pyro" }`) satisfies the schema/JSON convention (`ele`) while activating GO's real `ArchaicPetra` 4pc team buff (`element`), and leaves all Akasha golden fixtures byte-identical. Also, if a custom/user preset or test authors `ArchaicPetra: { ele: '<ele>' }` on a teammate without `element`, `hydratePresetTeam` bridges `ele` -> `element` for non-bundled presets or when `ele` is set on `official/furina-salon-subdps` / `official/mavuika-melt-hypercarry` so `ArchaicPetra: { ele: '...' }` always activates Petra in user tests.
- **BCF-A2 (Boolean Artifact-Set Conditionals Classification)**: A conditional in `artifactConditionals` is a boolean on/off conditional iff it comes from a single-path artifact-set conditional section (`!(c.sheet === 'ScrollOfTheHeroOfCinderCity' && c.key.startsWith('react_'))`) with `c.states.length === 1 && c.states[0]?.key === 'on'`.
