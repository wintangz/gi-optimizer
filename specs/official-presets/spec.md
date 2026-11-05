# Feature Specification: Official Presets

**Feature**: `official-presets`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "official-presets: A small set of the most popular meta teams, made by me and you. Same preset format as akasha-presets; the difference is only who authored them and that they are not tied to a leaderboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Optimise a popular meta team immediately after importing (Priority: P1)

A player imports their GOOD file and opens the Presets or Optimize page. Even if their account does not match a strict Akasha leaderboard weapon/constellation lock, they can pick one of the bundled Official meta team presets (e.g., Neuvillette Hypercarry, Furina Salon Sub-DPS, Hu Tao Double Hydro Vaporize, Raiden National, Arlecchino Vaporize, Mavuika Melt/Vaporize). As long as they own the target character, the preset uses their character's actual weapon and constellation with standard assumed (`tc`) teammates and realistic rotation hit counts, and calculates/optimises their rotation damage immediately.

**Why this priority**: Gives every player immediate out-of-the-box value from the preset-first workflow without requiring specific 5-star signature weapons or exact constellations.

**Independent Test**: Load the bundled official presets registry, match each against the sample GOOD file (`Van_2025-07-16_19-59-13.json`), confirm all pass account matching, and evaluate each preset's rotation damage via `@gi/engine` with finite positive damage totals.

**Acceptance Scenarios**:

1. **Given** an imported account that owns the target character (any weapon, any constellation), **When** the player selects an Official preset for that character, **Then** the account match report passes and the preset is runnable.
2. **Given** an Official preset is viewed in the Presets browser, **When** rendered, **Then** it displays the `"Official"` badge, author `"gi-optimizer"`, team lineup, conditional assumptions, and rotation hit breakdown, with no leaderboard link and no static damage claim.
3. **Given** an Official preset is evaluated or optimised, **When** the engine runs, **Then** every rotation target path resolves to a positive damage number in GO's formula engine and matches its golden reference fixture within 0.1%.

---

### User Story 2 - Every bundled Official preset is validated against GO schemas and formulas (Priority: P1)

Every JSON file in `packages/presets/data/official/*.json` is automatically verified in tests: it conforms to `presetSchema` (`gi-optimizer/preset@1`), has `source: "official"`, omits `akasha` metadata, uses valid GO character/weapon/artifact keys, uses valid GO display paths for every rotation target, and has a golden fixture verified against GO's unmodified `getTeamDataCalc`.

**Why this priority**: Constitution II & IV forbid shipping a preset whose character/rotation numbers are not verified against GO itself.

**Independent Test**: Run `pnpm --filter @gi/presets test` and `pnpm --filter @gi/engine test` to verify 100% of bundled official presets pass schema validation, path validation, and golden-fixture parity.

**Acceptance Scenarios**:

1. **Given** all JSON files in `packages/presets/data/official/`, **When** validated against `presetSchema`, **Then** 100% pass with 0 schema issues.
2. **Given** any bundled official preset, **When** its target character and rotation paths are checked against GO's `getDisplay()` catalog, **Then** every path resolves to a valid numeric damage node.
3. **Given** any bundled official preset, **When** evaluated against the sample account in the golden test suite, **Then** every instance damage and the rotation total match GO's direct calculation within relative error ≤ 0.1%.

### Edge Cases

- User owns the target character at Level 1 with a 1-star weapon: Official presets omit weapon/level/talent locks so the preset is still runnable (showing whatever damage their current level/weapon produces).
- User does not own the target character at all: `matchAccount` fails on the `owned` part ("Preset needs <Character> — <Character> is not in your imported account.") and blocks optimisation.
- Teammates in official presets: Always use `build.type: "tc"` (assumed standard builds) so the user never needs to own or build the supports to optimise their main character.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST bundle at least 6 Official meta team presets under `packages/presets/data/official/*.json` covering distinct characters and scaling mechanics (HP scaling, ATK scaling, EM/reaction scaling, ER-to-DMG conversion).
- **FR-002**: Every Official preset MUST use the shared `gi-optimizer/preset@1` schema with `source: "official"`, `id` prefixed with `"official/"`, `author: "gi-optimizer"`, and NO `akasha` field.
- **FR-003**: Official presets MUST leave target weapon, constellation, level, and talent requirements unconstrained (`requirement: {}`) so any player who owns the target character can run them with their own weapon and constellation.
- **FR-004**: Teammates in Official presets MUST use `build.type: "tc"` with realistic support weapons, artifact sets, and main/substat distributions.
- **FR-005**: Every rotation target path and conditional in an Official preset MUST correspond to a real path/conditional in the pinned Genshin Optimizer sheets.
- **FR-006**: Every Official preset MUST have a corresponding golden fixture verified against Genshin Optimizer's calculation within 0.1% relative error.
- **FR-007**: In the UI, Official presets MUST display the `"Official"` badge and MUST NOT display an Akasha leaderboard link or make any static damage claim.

### Key Entities

- **Official Preset JSON**: A `Preset` document with `source: "official"` stored in `packages/presets/data/official/<slug>.json` and exposed through `@gi/presets` registry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 6 bundled Official presets ship and 100% validate against `presetSchema`.
- **SC-002**: 100% of bundled Official presets resolve all rotation paths to finite positive damage numbers when evaluated with the sample GOOD database.
- **SC-003**: 100% of bundled Official presets match GO's reference calculation within 0.1% relative error per damage instance.

## Assumptions

- **OP-1 (Starter roster)**: We ship 6 meta presets covering diverse archetypes present in the sample GOOD file:
  1. `official/neuvillette-hypercarry` — Neuvillette (target) + Furina + Kaedehara Kazuha + Zhongli (Charged Attack Equitable Judgment ticks, Hydro resonance, Fanfare, VV shred, Archaic Petra / Zhongli shield shred).
  2. `official/furina-salon-subdps` — Furina (target) + Neuvillette + Kaedehara Kazuha + Baizhu (Gentilhomme Usher, Surintendante Chevalmarin, Mademoiselle Crabaletta hits + Burst).
  3. `official/hutao-double-hydro-vape` — Hu Tao (target) + Yelan + Xingqiu + Zhongli (Paramita Papilio state active, ≤50% HP, Vaporize Charged Attacks + Normal Attacks + Blood Blossom + Spirit Soother).
  4. `official/raiden-hypercarry` — Raiden Shogun (target) + Kujou Sara + Kaedehara Kazuha + Bennett (Musou no Hitotachi initial slash + Musou Isshin combo with Chakra Desiderata stacks, Bennett Fantastic Voyage buff, Kazuha VV/DMG buff, Sara Crowfeather buff).
  5. `official/arlecchino-vaporize` — Arlecchino (target) + Yelan + Bennett + Zhongli (Masque of the Red Death Normal Attack sequence with Vaporize on reactive hits, Bennett burst, Zhongli shield).
  6. `official/mavuika-melt-hypercarry` — Mavuika (target) + Citlali + Xilonen + Bennett (Hour of Burning Skies Sunfell Slice Melt + Flamestrider Charged Attacks, Fighting Spirit, Bennett burst, Xilonen Source Sample, Citlali shred).
- **OP-2 (Unconstrained requirements)**: Official presets set `requirement: {}` on the target member so users aren't blocked by weapon or constellation locks.
- **OP-3 (Shared UI)**: Official presets are browsed and selected through the same Presets and Optimize UI as Akasha and User presets (`packages/presets/src/registry.ts` and `apps/web/src/app/presets/page.tsx`).

