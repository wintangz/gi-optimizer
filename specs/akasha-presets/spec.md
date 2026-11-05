# Feature Specification: Akasha Presets

**Feature Branch**: `akasha-presets`

**Created**: 2026-11-05

**Status**: Ready for Review Fix Pass

**Input**: User description: "Presets that copy Akasha (akasha.cv) leaderboard cases exactly — same team context, weapon, constellation, rotation and buff assumptions. If the user's scanned target character or weapon is not exactly the preset's, tell them plainly which part doesn't match, Akasha-style; never silently substitute different units / constellations / weapons. Teammates are fixed simulated/assumed builds provided by the preset and are never checked against or drawn from the user's account. Presets are plain JSON (source 'akasha', with akasha metadata). A preset makes no damage claim; numbers come from the user's own artifacts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See exactly why my target character & weapon do / do not fit a preset (Priority: P1)

A player who has imported their scanner export opens an Akasha preset (e.g. a Furina leaderboard case) and
sees, requirement by requirement under a "Target Character & Weapon Check" heading, whether their own target
character and weapon satisfy it: owned, constellation, weapon, refinement, level, each talent. Every failing
part is one plain-English sentence naming what the preset needs and what the player has, e.g.
"Preset needs Furina C0 — you have C2." If the right weapon is in the player's inventory but not equipped,
the message says so and lets them pick it. No wording on `/presets` or `/optimize` ever implies that the
player's supporting teammates are checked or needed.

**Why this priority**: The defining promise of Akasha presets is "exactly the leaderboard target & weapon case,
with fixed simulated teammates". Without accurate target-only wording and part-by-part matching, players are
misled into thinking they need the supporting teammates on their account.

**Independent Test**: Feed a preset and a scanner export into the matcher; assert the list of parts, their
pass/fail state and the exact sentences; verify that `/presets` and `/optimize` compatibility headings and
empty-state prompts refer exclusively to the target character and its required weapon.

**Acceptance Scenarios**:

1. **Given** a preset requiring Furina C0 with Primordial Jade Cutter R1, **When** the account has Furina C2, **Then** the constellation part fails with "Preset needs Furina C0 — you have C2." and the preset cannot run.
2. **Given** the same preset, **When** Furina has Festering Desire R5 equipped and an unequipped Primordial Jade Cutter R1 exists, **Then** the weapon part fails with "Preset needs Primordial Jade Cutter R1 — Furina has Festering Desire R5 equipped; you own Primordial Jade Cutter R1 unequipped, select it to continue." and that weapon is offered as a selectable candidate.
3. **Given** the player selects that candidate weapon, **When** matching is re-run with the selection, **Then** weapon and refinement parts pass.
4. **Given** the account does not contain Furina, **Then** a single "owned" failure is reported ("Preset needs Furina — Furina is not in your imported account.") and no other parts are evaluated for her.
5. **Given** no account is imported on `/presets` or `/optimize`, **Then** the compatibility box heading reads "Target Character & Weapon Check" and the prompt reads "Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset." (never implying scanned teammates are checked).
6. **Given** a teammate has a fixed assumed build (`build.type === 'tc'`), **Then** no ownership, constellation, level, talent, or weapon check is made for that teammate, and mutating or deleting that teammate in the player's GOOD account has zero effect on matching, damage evaluation, or optimization results.

---

### User Story 2 - Browse presets and see target vs. simulated teammates clearly (Priority: P1)

A player opens the Presets page (`/presets`) or the Optimizer page (`/optimize`) and sees all available presets
with a badge per source, filters by target character, and views the team breakdown. Everywhere a preset team is
shown (preset list cards on `/presets`, preset detail panel on `/presets`, and preset summary bar on `/optimize`),
the target is explicitly marked as the player's own character ("Your Character · Target") and each teammate with
`build.type === 'tc'` is visually distinguished as a simulated / fixed preset build (with a `SIM` badge, dashed
border/ring, and "Simulated / Assumed Preset Build (Not Your Account)" label) — never rendered as a flat list of
4 equal character names. When a player duplicates/forks an Akasha or Official preset into the custom team builder
(`/teams?fork=`), all `tc` teammates remain simulated assumed builds (`build.type === 'tc'`), clearly labelled
as "Simulated / Assumed Preset Build (Not Your Account)" and editable as assumed builds, never silently switched
to the player's scanned copies.

**Why this priority**: Visually distinguishing the player's target character from simulated teammates across
`/presets`, `/optimize`, and `/teams` prevents the misconception that preset teams use or require the player's
own support characters.

**Independent Test**: Render `/presets`, `/optimize`, and `/teams?fork=<akasha-preset-id>`; verify that every
team display badges the target as "Your Character · Target" and each `tc` teammate with a `SIM` badge + dashed
ring/simulated label, and that forking preserves `build.type === 'tc'` and all `tc` stats on every teammate.

**Acceptance Scenarios**:

1. **Given** any preset is displayed in the `/presets` list cards, `/presets` detail table, or `/optimize` preset bar, **When** the team is rendered, **Then** `team[0]` is marked "Your Character · Target" and every `build.type === 'tc'` teammate is rendered with a visual `SIM` badge + dashed ring and simulated label (never a flat `A / B / C / D` or `A · B · C · D` string of equal names).
2. **Given** an Akasha preset is opened on `/presets`, **Then** the leaderboard link, label, retrieval date and notes are shown, and no damage number is shown or implied.
3. **Given** the player clicks "Duplicate & Edit" on `/presets` or "Customize Preset / Team" on `/optimize` (navigating to `/teams?fork=<id>`), **When** the custom team builder loads the forked preset, **Then** every teammate from the source preset retains `build.type === 'tc'` and all of its `tc` character/weapon/artifact stats, and is labelled "Simulated / Assumed Preset Build (Not Your Account)" with editable assumed-build fields.
4. **Given** the preset can run, **When** the player clicks "Optimize with this Preset", **Then** they land on `/optimize` with that preset selected (and the chosen weapon, if they picked a non-equipped one).

---

### User Story 3 - Bundled Akasha presets are trustworthy & teammate-isolated in the engine (Priority: P2)

Every bundled Akasha preset is checked automatically: it conforms to the preset format, its rotation
instances and buff/conditional names exist for that character in the calculation engine, the required
weapon fits the character's weapon type, it records which leaderboard it copies and when it was retrieved,
and it has a reference-value fixture proving the engine reproduces Genshin Optimizer's numbers for that setup.
Furthermore, the calculation engine and solver guarantee strict teammate isolation: evaluating or optimizing
an Akasha preset against two GOOD files that differ only in the teammates (missing teammates, different
teammate constellations/levels/talents, or different teammate weapons/artifacts outside the target's eligible
artifact pool) produces identical rotation damage and identical optimal builds.

**Why this priority**: Guarantees both data integrity and engine-level isolation so a player's own supporting
roster never leaks into Akasha leaderboard evaluations or optimizations.

**Independent Test**: Run the preset validation suite, the `forkPresetToUser` unit test, and the engine
Akasha teammate-isolation regression test (`packages/engine/test/akasha-isolation.test.ts`).

**Acceptance Scenarios**:

1. **Given** two GOOD account files that have the exact same target character, target weapon, and eligible artifact pool, but one GOOD file deletes all supporting teammate characters, mutates their levels/constellations/talents, or swaps their equipped weapons, **When** `session.evaluate` and `session.optimize` (with `includeEquippedOnOthers: false` or an identical unequipped pool) are run for an Akasha preset, **Then** both GOOD files produce bit-for-bit identical per-instance damage, rotation totals, and top optimized builds.
2. **Given** an Akasha or Official preset with `tc` teammates is passed to `forkPresetToUser`, **When** the forked preset is inspected, **Then** every teammate (`team[1..3]`) preserves `build.type === 'tc'` and deep-equals the original `tc` character, weapon, and artifact configuration.
3. **Given** a bundled Akasha preset without a matching reference fixture or with a non-`tc` teammate, **Then** the automated checks fail.

### Edge Cases

- Account contains the target character but GOOD talent levels are below the requirement → talent part fails with "Preset needs Furina Skill talent 10+ — you have Skill 9." (base levels, constellation bonuses not added).
- Account does not own any of the supporting teammates (e.g. player has Neuvillette C0 with Sacrificial Jade R5, but does not own Furina, Kazuha, or Zhongli in their GOOD file) → `matchAccount` passes (`canRun: true`), and `session.evaluate` / `session.optimize` compute full team-buffed damage using the preset's simulated `tc` teammates.
- Account owns the supporting teammates at different constellations or levels (e.g. C6 Kazuha with Freedom-Sworn R5 in GOOD vs. C0 Kazuha with Xiphos' Moonlight R1 in the preset's `tc` build) → the engine ignores the player's GOOD Kazuha and uses the preset's `tc` Kazuha exclusively.
- Required weapon is equipped on a different character → candidate offered with "equipped on <Character>"; selecting it is allowed and re-matched without mutating the stored GOOD account.
- Forking an Akasha preset into `/teams` → `forkPresetToUser` strips `akasha` provenance metadata and assigns a `user/` id, while keeping `team[1..3]` as `build.type === 'tc'` with all original `tc` stats intact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compare a preset's target requirements with the imported account and return one result per requirement part: owned, constellation, weapon, refinement, level, talent (auto/skill/burst individually), each with expected value, actual value, pass/fail and one plain-English message.
- **FR-002**: Messages MUST name the character, the expected value and the actual value using in-game display names (e.g. "Splendor of Tranquil Waters", "Furina"), never internal keys.
- **FR-003**: When the weapon part fails, the system MUST list qualifying weapons the player owns (unequipped or equipped on another character) and allow selecting one; the selection MUST be re-matched, never assumed.
- **FR-004**: A preset with any failing part MUST NOT be runnable; the system MUST NOT substitute characters, constellations, weapons or refinements.
- **FR-005**: Teammates declared as fixed assumed builds (`build.type === 'tc'`) MUST NOT be checked against the account, and the player's scanned teammate characters, constellations, talents, and weapons MUST NOT influence `session.evaluate` or `session.optimize` results.
- **FR-006**: Requirement parts omitted by the preset mean "any" and MUST NOT produce failures.
- **FR-007**: The system MUST validate preset documents against the shared preset format and report every problem with its location.
- **FR-008**: The system MUST additionally verify, using the calculation engine's own catalog, that each rotation instance path and each conditional (sheet + name + value) exists for the relevant character/weapon/artifact set, and that required/assumed weapons match the wearer's weapon type.
- **FR-009**: Akasha presets MUST additionally: carry leaderboard metadata (calculation id, leaderboard URL on akasha.cv, label, retrieval date); require an exact constellation (or range) and an exact weapon with refinement for the target; use fixed `tc` builds for every teammate; require character level 90+ unless the leaderboard states otherwise.
- **FR-010**: The system MUST provide a registry of bundled presets (Akasha and official) with list and lookup-by-id, exposing each preset's badge text and whether it is verified (reference fixture present).
- **FR-011**: Everywhere a preset team is displayed on `/presets` (both list cards and detail panel) and `/optimize`, the UI MUST visually mark `team[0]` as the player's target character ("Your Character · Target") and MUST visually mark each `build.type === 'tc'` teammate as a simulated / fixed preset build (using a `SIM` badge, dashed border/ring, and simulated label), never rendering a preset team as a flat list of 4 equal character names.
- **FR-012**: All account compatibility UI on `/presets` and `/optimize` MUST refer exclusively to the target character and its required weapon (e.g. heading "Target Character & Weapon Check" and unimported prompt "Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset"), removing any phrasing that implies supporting teammates are checked or required in the player's account.
- **FR-013**: Presets MUST NOT display or embed any damage number; no preset field may carry expected damage.
- **FR-014**: When a player duplicates/forks an Akasha or Official preset (`forkPresetToUser` / `/teams?fork=`), every `tc` teammate MUST remain a simulated assumed build (`build.type === 'tc'`) with all its `tc` stats preserved, clearly labelled in `/teams` as "Simulated / Assumed Preset Build (Not Your Account)" and editable as an assumed build — never silently switched to `build.type === 'owned'`.
- **FR-015**: Every bundled Akasha preset MUST have a reference fixture in the engine's golden-fixture suite and pass an engine teammate-isolation regression test proving that `session.evaluate` and `session.optimize` depend only on the target character, selected weapon, and eligible artifact pool.

### Key Entities

- **Preset**: setup bundle (shared format) — id, name, source, author, Akasha metadata, target (`team[0]`, `build.type: 'owned'`), supporting teammates (`team[1..3]`, `build.type: 'tc'` for Akasha/Official), enemy, team conditionals, rotation.
- **Match Report**: result of comparing one preset's `owned` target requirements with one account — preset id, can-run flag, ordered list of match entries, the weapon selection it was computed for.
- **Match Entry**: one requirement part for the target — part, expected, actual, pass/fail, message, optional weapon candidates.
- **Weapon Candidate**: a weapon in the player's inventory that satisfies the target weapon requirement — inventory reference, name, refinement, level, where it is equipped.
- **Registry Entry**: a bundled preset plus badge text and verified flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of target character/weapon mismatch cases in the test suite, the player is told which part fails and what they have, in one sentence per part, under "Target Character & Weapon Check".
- **SC-002**: 0 places in `/presets`, `/optimize`, or `/teams` where a preset team is shown as a flat list of 4 equal names or where wording implies supporting teammates are checked against the player's account.
- **SC-003**: 100% of Akasha presets evaluate (`session.evaluate`) and optimize (`session.optimize`) to identical numbers across two GOOD accounts that differ only in supporting teammate ownership, levels, constellations, talents, or teammate weapons/artifacts outside the eligible pool.
- **SC-004**: 100% of forked Akasha and Official presets preserve `build.type === 'tc'` and all `tc` build fields on every supporting teammate (`team[1..3]`).
- **SC-005**: A player can go from the Presets page to the optimizer with a chosen preset in at most 2 clicks when the target character and weapon match.

## Assumptions

- **AP-1 (Starter Akasha Preset Suite)**: We ship 5 canonical Akasha leaderboard presets (`akasha/furina-salon-pjc-c0`, `akasha/furina-splendor-c2`, `akasha/neuvillette-hypercarry-sacjade-c0`, `akasha/hutao-double-hydro-homa-c1`, `akasha/raiden-hypercarry-scarlet-c0`) with verified golden fixtures against GO's calculation.
- **AP-2 (Talent levels)**: Talent requirements are compared against GOOD base talent levels (constellation +3 bonuses not added), because that is what scanners export and what GO stores.
- **AP-3 (Min semantics)**: `minLevel`/`minTalent` are minimums; higher is a pass. Constellation and refinement are exact or an explicit range.
- **AP-4 (Runnable rule)**: "Can run" = every emitted part passes, for every source (Akasha, official, user). Official/user presets that want leniency simply omit requirement parts.
- **AP-5 (Weapon selection)**: Default weapon = the one equipped on the target. A weapon equipped on another character may be selected; this does not move it in the user's data, it only selects it for evaluation (GO "use equipped" semantics, A5 in architecture).
- **AP-6 (Teammates — Simulated Fixed Builds)**: Akasha and Official presets model every teammate as a fixed assumed build (`build.type: 'tc'`, architecture A4); teammate constellations/weapons/artifacts are fixed by the preset, visually badged with `SIM` + dashed ring / "Simulated / Assumed Preset Build (Not Your Account)", preserved across `forkPresetToUser`, and never matched against or read from the user's GOOD characters/weapons.
- **AP-7 (Level)**: Akasha normalises characters to level 90; Akasha presets therefore set `minLevel: 90` unless the leaderboard states another level.
- **AP-8 (Rotation paths)**: Rotation paths are GO-native display paths as GO stores them in `CustomTarget.path` (e.g. `["skill","usherDmg"]`, `["normal","0"]`), normalized if prefixed with the character key.
- **AP-9 (Names)**: Display names come from GO's English localisation files; only English is supported in this phase.
- **AP-10 (Verified badge)**: An Akasha preset is "verified" iff its id is listed in the bundled verified manifest, which an automated test keeps in sync with the engine's golden fixtures.
- Depends on `good-import` (stored account, `useGood()`), `single-character-optimizer` (engine catalog `listTargets`/`listConditionals`, golden-fixture harness, `/optimize?preset=` handling), `official-presets` (official bundled JSON), `custom-teams-and-presets` (user presets in storage and `/teams` builder).
