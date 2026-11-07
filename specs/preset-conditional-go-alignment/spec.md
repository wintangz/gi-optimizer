# Feature Specification: Preset Conditional GO Alignment (`preset-conditional-go-alignment`)

**Feature Branch**: `[preset-conditional-go-alignment]`

**Created**: 2026-11-07

**Status**: Approved

**Input**: User description: "Audit EVERY bundled preset (akasha + official). For each member, validate every conditional key AND value — character, weapon, artifact sets, team/resonance — against the authoritative GO conditional catalogue from the vendored submodule. Never edit the submodule. Fix every mismatch by translating it to the correct GO key/value. Re-baseline the golden fixture of every preset whose total changes; report old → new per preset. Add a permanent guard: a test that validates all bundled presets' conditional keys/values against the GO catalogue and fails on any unknown key or value, so a dead key can never ship silently again."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate GO Buff Evaluation Across All Bundled Presets (Priority: P1)

When a user selects any bundled Official or Akasha preset, every conditional buff intended by the preset (character talents/constellations, weapon passives, 2pc/4pc artifact set effects, and team resonance/reactions) must use the exact sheet key, conditional key, and state value defined by Genshin Optimizer's sheets so that no buff is silently dropped or blocked from auto-derivation.

**Why this priority**: A mismatched conditional key or value in a preset JSON file causes Genshin Optimizer's formula graph to evaluate that buff to `0` (naught) and also prevents the engine's default-on fallback from activating when the sheet key is present with a dead inner key (such as `GoldenTroupe: { "offField": "on" }` instead of `GoldenTroupe: { "set4": "on" }`).

**Independent Test**: Can be independently tested by evaluating each of the 11 bundled presets (`6 official + 5 akasha`) against the vendored Genshin Optimizer engine and verifying that every authored conditional matches the GO conditional catalogue and activates its intended formula contribution.

**Acceptance Scenarios**:

1. **Given** any of the 3 Furina bundled presets (`akasha/furina-salon-pjc-c0`, `akasha/furina-splendor-c2`, `official/furina-salon-subdps`), **When** the preset is loaded and evaluated, **Then** Furina's `GoldenTroupe` conditional uses `{ "set4": "on" }` and applies the 4pc Golden Troupe +25% off-field Elemental Skill DMG bonus.
2. **Given** any bundled preset with character, weapon, or artifact conditionals (`Bennett`, `KujouSara`, `RaidenShogun`, `Neuvillette`, `TenacityOfTheMillelith`, `MarechausseeHunter`, `ObsidianCodex`, `ScrollOfTheHeroOfCinderCity`, `ArchaicPetra`, `EngulfingLightning`, `SplendorOfTranquilWaters`), **When** the preset is inspected and evaluated, **Then** every conditional key and state value matches the authoritative GO sheet definition and contributes to the target's stats and rotation damage.
3. **Given** all 11 bundled presets after conditional alignment, **When** golden fixtures are re-captured from the vendored GO calculation engine, **Then** `session.evaluate(preset)` matches the updated golden fixture within `<= 0.1%` relative error on every damage instance and total.

---

### User Story 2 - Permanent Catalogue Validation Guard for Bundled Presets (Priority: P1)

When a developer or contributor modifies a bundled preset or adds a new preset to the repository, an automated test validates every member's `conditional` map and the preset's `teamConditional` (`resonance` and `reaction`) against the authoritative GO conditional catalogue, failing immediately on any unknown sheet key, unknown conditional key, or invalid state value.

**Why this priority**: Without automated catalogue validation, free-form JSON strings in `member.conditional` or `teamConditional` can introduce silent no-op buffs that pass schema validation (`Record<string, Record<string, string>>`) while failing to match GO's sheet definitions.

**Independent Test**: Can be tested by running the validation guard across all bundled presets (expecting 0 issues) and running negative test cases with synthetic dead keys/values (expecting explicit validation failures).

**Acceptance Scenarios**:

1. **Given** all bundled presets (`listBundledPresets()`), **When** the GO conditional catalogue validation guard runs in the test suite, **Then** every preset passes with zero unknown sheet keys, zero unknown conditional keys, and zero invalid state values.
2. **Given** a preset containing an unknown sheet key, an unknown conditional key (such as `GoldenTroupe.offField`), or an invalid state value (such as `Bennett.activeInArea = "active"`), **When** the GO conditional validator runs, **Then** it returns a structured validation issue pinpointing the exact preset path, key, and invalid value.

---

### Edge Cases

- **Multi-path reaction/element conditionals (`ScrollOfTheHeroOfCinderCity`)**: GO's `ScrollOfTheHeroOfCinderCity` 4pc sheet uses dynamic `states: (data: UIData) => ...` functions where `nightsoul_${ele}` states are only emitted when `condReacts[ele]` is truthy in `UIData`, and `react_${charEle}` is hidden for the scratch character's own element. The engine's conditional catalogue collector must enumerate all 7 elemental `react_${ele}` and `nightsoul_${ele}` conditionals so that `ScrollOfTheHeroOfCinderCity` conditionals are both visible in the UI toggle panel and verifiable by the catalogue guard.
- **Unconditional team resonances in GO (`Pyro` Fervent Flames, `Hydro` Soothing Waters)**: In GO's `Resonance.tsx`, Pyro resonance (+25% ATK) and Hydro resonance (+25% HP) are unconditional passives gated automatically by team size (`>= 4`) and element tally (`>= 2`), with no entry in GO's `resonance` conditional catalogue (which only contains `ShatteringIce`, `EnduringRock`, `EnduringRockHit`, `SprawlingCanopy2ele`, and `SprawlingCanopy3ele`). Bundled presets must not author dead `{ "Hydro": "on" }` or `{ "Pyro": "on" }` keys in `teamConditional.resonance`.
- **Submodule immutability**: `vendor/genshin-optimizer` is a pinned read-only submodule and must never be edited.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every bundled preset in `packages/presets/data/akasha/*.json` and `packages/presets/data/official/*.json` MUST use only conditional sheet keys, conditional keys, and state values that exist in the vendored Genshin Optimizer sheets (`vendor/genshin-optimizer/libs/gi/sheets/src/`).
- **FR-002**: All 12 identified sheet conditional mismatches across the 11 bundled presets (`GoldenTroupe`, `SplendorOfTranquilWaters`, `Bennett`, `KujouSara`, `RaidenShogun`, `EngulfingLightning`, `Neuvillette`, `MarechausseeHunter`, `ObsidianCodex`, `ScrollOfTheHeroOfCinderCity`, `TenacityOfTheMillelith`, `ArchaicPetra`) and the non-GO `teamConditional.resonance` entries (`Hydro`, `Pyro`) MUST be updated to their authoritative GO definitions.
- **FR-003**: `packages/engine/src/catalog.ts` MUST enumerate all 7 elemental `react_${ele}` and `nightsoul_${ele}` conditionals from GO's `ScrollOfTheHeroOfCinderCity` sheet so that the catalogue reflects the full set of GO artifact conditionals.
- **FR-004**: Golden fixtures in `packages/engine/test/golden/*.json` MUST be re-captured from the vendored GO engine for every preset whose evaluation total or stats change, and the old → new totals MUST be documented.
- **FR-005**: A permanent validation helper and test guard MUST validate every bundled preset's `member.conditional` and `teamConditional` (`resonance` and `reaction`) against the GO conditional catalogue and fail if any unknown sheet, key, or value is present.
- **FR-006**: `vendor/genshin-optimizer` MUST remain completely untouched.

### Key Entities

- **`ConditionalDescriptor`**: Engine catalogue entry representing a single GO sheet conditional (`sheet`, `key`, `states`, `category`, `section`).
- **`PresetConditionalIssue`**: Diagnostic issue produced when a preset's `member.conditional` or `teamConditional` contains a sheet, key, or state value not found in the GO conditional catalogue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of bundled presets (`11/11`: 5 Akasha + 6 Official) pass the GO conditional catalogue validation guard with zero unknown keys or values.
- **SC-002**: 100% of golden fixtures (`11/11`) match `session.evaluate(preset)` within `<= 0.1%` relative error after re-baselining.
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with zero errors and `vendor/genshin-optimizer` has zero modifications.

## Assumptions

- **Scroll of the Hero of Cinder City reaction element in `official/mavuika-melt-hypercarry`**: Citlali (Cryo) triggers Melt on Pyro in Mavuika's Melt Hypercarry rotation while in Nightsoul's Blessing. In GO's `ScrollOfTheHeroOfCinderCity` sheet, Citlali's own element (`cryo`) is buffed automatically whenever any reaction conditional is enabled, and Mavuika's element (`pyro`) is buffed by enabling `react_pyro: "pyro"` (+12% Pyro & Cryo DMG) and `nightsoul_pyro: "pyro"` (+28% Pyro & Cryo DMG, totaling +40%). Thus `{ "nsReact": "on", "afterReact": "on" }` translates to `{ "react_pyro": "pyro", "nightsoul_pyro": "pyro" }`.
- **Neuvillette A4 HP conditional in `official/neuvillette-hypercarry` and `akasha/neuvillette-hypercarry-protoamber-c0`**: Both presets authored `"a4Hp": "80"` intending Neuvillette's maximum A4 passive (+30% Hydro DMG at `>= 80%` Max HP). In GO's `Neuvillette` sheet, `a4Hp` uses `range(1, 50)` representing percentage points of HP above 30% (displayed in GO's UI as `${hp + 30}%`, so key `"50"` = `80%` HP = full +30% Hydro DMG). Thus `"a4Hp": "80"` translates to `"a4Hp": "50"`.
- **Elemental Resonance in `teamConditional.resonance`**: In GO's `Resonance.tsx`, Fervent Flames (`Pyro`) and Soothing Waters (`Hydro`) have no conditional toggle in GO — they are automatically active whenever a 4-member team has `>= 2` characters of that element. The authored `"resonance": { "Hydro": "on" }` and `"resonance": { "Pyro": "on" }` entries have no GO conditional equivalent in `Resonance.tsx` and are cleared to `"resonance": {}` (and logged in the alignment report).
