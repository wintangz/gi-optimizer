# Feature Specification: Akasha Leaderboard Presets Expansion (`akasha-presets-pull`)

**Feature Branch**: `main` (`akasha-presets-pull`)  
**Created**: 2026-11-08  
**Status**: In Progress  
**Input**: User request:
> PROMPT — akasha-presets-pull, second attempt. Full Spec Kit flow, autonomously, subagents in parallel per case where the work allows, assumptions logged instead of questions asked. One commit per preset, message "feat: preset-<preset-id>". Full test suite green at the end, including the preset conditional guard test, plus a golden fixture per new preset.
>
> CONTEXT: akasha.cv is unreachable from this environment (Cloudflare challenge). Do NOT attempt to fetch it again. Instead, author the presets the same way the original 5 Akasha presets were authored: from your knowledge of the leaderboard cases, with provenance recorded in each preset. The existing 5 stay as they are unless a case detail needs correcting.
>
> TASK: Author an Akasha preset for every distinct character-leaderboard case (target + category) that fits this app's model, following the established Akasha format exactly.

## Clarifications & Logged Assumptions

- **Provenance Honesty (`authored-from-knowledge`)**:
  - `akasha.cv` is gated by a Cloudflare challenge in this environment and is not fetched during this run.
  - Every newly authored preset sets `akasha.retrievedAt: "authored-from-knowledge"`, `akasha.leaderboardUrl: "authored-from-knowledge"`, and prefixes `akasha.notes` with `"Source: authored-from-knowledge."` while recording the fixed target spec, default case weapon, teammate builds, and stack/buff assumptions.
  - The 5 existing Akasha presets (`akasha/furina-salon-pjc-c0`, `akasha/furina-splendor-c2`, `akasha/hutao-double-hydro-homa-c1`, `akasha/neuvillette-hypercarry-protoamber-c0`, `akasha/raiden-hypercarry-scarlet-c0`) already pass all GO conditional and golden checks and remain as-is.
- **Target Investment & Isolation Model**:
  - Target (`team[0]`) uses `build: { type: "fixed", character: { level: 90, ascension: 6, constellation: <C>, talent: { auto: 10, skill: 10, burst: 10 } }, weapon: { key: "<CaseWeapon>", level: 90, ascension: 6, refinement: <R> } }` and `requirement: {}` (allowing free user weapon selection while using the case weapon as the default).
  - Teammates (`team[1..3]`) use `build: { type: "tc", tc: ... }` with the case's standard support weapons, artifact sets, and active conditionals.
- **Display Naming Convention**:
  - Per `packages/presets/test/match.test.ts` (`preset-names-drop-weapon`), preset `name` never includes a weapon name or `R1`–`R5` refinement tag; the default case weapon and refinement are recorded in `akasha.label` and `akasha.notes`.
- **Skipped Leaderboard Categories**:
  - Pure stat/balance leaderboards (Shieldbot HP Zhongli, Max EM Kazuha, Healing/ER Bennett, Max HP Kokomi, Bountiful Core HP Nilou, Icy Quill ATK/ER Shenhe, HP/ER Baizhu, Healing/ER Jean, Shield/ER Diona, ATK/ER Xianyun, EM/Scroll Citlali, DEF/Peak Patrol Xilonen, ER/CR Favonius Mona, DEF/CR Yun Jin) are skipped because they rank a single stat or synthetic balance formula rather than a talent damage rotation.
  - Transformative-only Swirl/Hyperbloom driver leaderboards (Sucrose Swirl, Kuki Shinobu Hyperbloom, Raiden Dragon's Bane Hyperbloom, Thoma Burgeon) are skipped because Akasha ranks those via transformative reaction formulas rather than talent damage paths.
  - All 45 considered cases (5 existing verified, 22 newly created, 18 skipped with explicit reasons) are recorded in [manifest.md](./manifest.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Optimize Artifacts Against Expanded Akasha Leaderboard Cases (Priority: P1)

Users selecting an Akasha preset on the Optimize or Presets page can choose from 27 Akasha leaderboard cases across 25 distinct characters, with fixed case investment on the target, simulated case teammates, verified GO conditionals, and free weapon selection.

**Why this priority**: Core deliverable of `akasha-presets-pull`.

**Independent Test**: Every bundled Akasha preset validates against `presetSchema`, passes `validatePresetConditionalsAgainstGO(preset)` with zero issues, and matches its golden fixture in `packages/engine/test/golden/akasha__<slug>.json`.

**Acceptance Scenarios**:

1. **Given** the bundled preset registry, **When** `listBundledPresets({ source: 'akasha' })` is called, **Then** all 27 Akasha presets are returned with valid `fixed` target builds, weapon-free display names, and honest provenance metadata.
2. **Given** any bundled Akasha preset, **When** `validatePresetConditionalsAgainstGO(preset)` and `session.evaluate(preset)` run, **Then** zero conditional issues are reported and the evaluation matches the golden fixture within `1e-4`.

## Requirements *(mandatory)*

- **FR-001**: Every new Akasha preset MUST validate against `presetSchema` (`gi-optimizer/preset@1`, `source: "akasha"`, `author: "akasha.cv"`) and `validatePreset`, with weapon-free display names.
- **FR-002**: Every conditional key and state value across all bundled presets MUST pass `validatePresetConditionalsAgainstGO(preset)` with zero issues.
- **FR-003**: Every new Akasha preset MUST have a golden reference fixture in `packages/engine/test/golden/akasha__<slug>.json` verified against direct GO calculation in `packages/engine/test/golden.test.ts` and be listed in `VERIFIED_PRESET_IDS`.
- **FR-004**: Every new Akasha preset MUST record honest provenance (`retrievedAt: "authored-from-knowledge"`, `leaderboardUrl: "authored-from-knowledge"`, and `notes` stating `Source: authored-from-knowledge`).
- **FR-005**: Each new preset MUST be committed individually with commit message `feat: preset-<preset-id>`.
- **FR-006**: `specs/akasha-presets-pull/manifest.md` MUST list every considered case with `CREATED <preset-id>` (or `VERIFIED (existing) <preset-id>`) or `SKIPPED — <reason>`, matching the final report counts.

## Success Criteria *(mandatory)*

- **SC-001**: All 22 new Akasha presets and 5 existing Akasha presets (27 total Akasha presets, 40 total bundled presets) pass schema validation, GO conditional validation, and golden regression tests.
- **SC-002**: Zero changes to `packages/engine/src/**`.
- **SC-003**: Full workspace test suite (`pnpm test`) and production build (`pnpm build`) pass with zero errors.
