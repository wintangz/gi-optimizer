# Feature Specification: Akasha Presets

**Feature Branch**: `akasha-presets`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Presets that copy Akasha (akasha.cv) leaderboard cases exactly — same team context, weapon, constellation, rotation and buff assumptions. If the user's scanned characters are not exactly the preset's, tell them plainly which part doesn't match, Akasha-style; never silently substitute different units / constellations / weapons. Presets are plain JSON (source 'akasha', with akasha metadata). A preset makes no damage claim; numbers come from the user's own artifacts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See exactly why my character does / does not fit a preset (Priority: P1)

A player who has imported their scanner export opens an Akasha preset (e.g. a Furina leaderboard case) and
sees, requirement by requirement, whether their own character satisfies it: owned, constellation, weapon,
refinement, level, each talent. Every failing part is one plain-English sentence naming what the preset
needs and what the player has, e.g. "Preset needs Furina C0 — you have C2." If the right weapon is in the
player's inventory but not equipped, the message says so and lets them pick it.

**Why this priority**: The defining promise of Akasha presets is "exactly the leaderboard case or nothing".
Without part-by-part matching, presets would either silently adapt (forbidden) or fail opaquely.

**Independent Test**: Feed a preset and a scanner export into the matcher; assert the list of parts, their
pass/fail state and the exact sentences, without any UI or damage engine.

**Acceptance Scenarios**:

1. **Given** a preset requiring Furina C0 with Splendor of Tranquil Waters R1, **When** the account has Furina C2, **Then** the constellation part fails with "Preset needs Furina C0 — you have C2." and the preset cannot run.
2. **Given** the same preset, **When** Furina has Festering Desire R5 equipped and an unequipped Splendor of Tranquil Waters R1 exists, **Then** the weapon part fails with "Preset needs Splendor of Tranquil Waters R1 — Furina has Festering Desire R5 equipped; you own Splendor of Tranquil Waters R1 unequipped, select it to continue." and that weapon is offered as a selectable candidate.
3. **Given** the player selects that candidate weapon, **When** matching is re-run with the selection, **Then** weapon and refinement parts pass.
4. **Given** the account does not contain Furina, **Then** a single "owned" failure is reported ("Preset needs Furina — Furina is not in your imported account.") and no other parts are evaluated for her.
5. **Given** every part passes, **Then** the report says the preset can run.
6. **Given** a teammate is a fixed (assumed) build, **Then** no ownership/constellation/weapon check is made for that teammate.

---

### User Story 2 - Browse presets and see what each one assumes (Priority: P1)

A player opens the Presets page and sees all available presets (Akasha, official, and their own custom ones)
with a badge per source, filters by character, and opens one to see the full setup: leaderboard link and
label, team members (with their assumed builds), required weapon/refinement/constellation/level/talents,
the rotation (each damage instance × count, × repeats), buff/conditional assumptions, enemy settings, and —
if an account is imported — the match report from Story 1. A button "Optimize with this preset" takes them
to the optimizer with the preset pre-selected; it is disabled when the preset cannot run.

**Why this priority**: Browsing is the entry point for every preset-driven optimization.

**Independent Test**: Load the Presets page with bundled presets and a saved account; filter by a character;
open a preset; verify badge, requirements, rotation rows, match messages and the optimize link target.

**Acceptance Scenarios**:

1. **Given** bundled and custom presets exist, **When** the player filters by "Furina", **Then** only presets whose target is Furina are listed, each with its badge ("Akasha · <label>", "Official", or "Custom — use at your own risk").
2. **Given** an Akasha preset is opened, **Then** the leaderboard link, label, retrieval date and notes are shown, and no damage number is shown or implied.
3. **Given** no account is imported, **Then** requirements are shown without a match report and the page tells the player to import first.
4. **Given** the preset can run, **When** the player clicks "Optimize with this preset", **Then** they land on the optimizer with that preset selected (and the chosen weapon, if they picked a non-equipped one).

---

### User Story 3 - Bundled Akasha presets are trustworthy (Priority: P2)

Every bundled Akasha preset is checked automatically: it conforms to the preset format, its rotation
instances and buff/conditional names exist for that character in the calculation engine, the required
weapon fits the character's weapon type, it records which leaderboard it copies and when it was retrieved,
and it has a reference-value fixture proving the engine reproduces Genshin Optimizer's numbers for that setup.
A preset whose details could not be confirmed from the leaderboard is not shipped.

**Why this priority**: Correctness of the bundled data protects every other story, but the matcher and
browser are useful even with zero bundled Akasha presets (custom/official presets still flow through them).

**Independent Test**: Run the validation suite over the bundled preset folder; a deliberately broken preset
(unknown rotation instance, wrong weapon type, missing leaderboard metadata) is rejected with a precise message.

**Acceptance Scenarios**:

1. **Given** a preset whose rotation references an instance that does not exist for the character, **Then** validation fails naming the preset, the rotation row and the bad path.
2. **Given** an Akasha preset whose teammate is not a fixed build, or whose weapon/constellation requirement is missing, **Then** validation fails.
3. **Given** a bundled Akasha preset without a matching reference fixture, **Then** the automated checks fail.

### Edge Cases

- Account contains the character but GOOD talent levels are below the requirement → talent part fails with "Preset needs Furina talents Normal Attack 1 / Skill 10 / Burst 10 — you have Skill 9." (base levels, constellation bonuses not added).
- Required weapon is equipped on a different character → candidate offered with "equipped on Neuvillette"; selecting it is allowed (it is the user's own inventory) but the message makes the move explicit.
- Several instances of the required weapon exist → all qualifying instances are listed, best (highest level) first.
- Required weapon owned only at the wrong refinement → refinement part fails naming the owned refinement(s); nothing is substituted.
- Traveler presets → matched by element-specific character key; the weapon location uses the shared Traveler location key.
- Preset requirement given as a range (e.g. C0–C1) → message reads "Preset needs Furina C0–C1 — you have C2."
- Bundled preset JSON fails schema validation at load → it is excluded from the list and a developer-facing error is logged; a test guarantees this never happens in shipped data.
- User preset with the same id as a bundled one cannot occur (id prefix encodes source).
- Zero bundled Akasha presets → the Presets page still works and states that no confirmed Akasha cases are bundled yet.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST compare a preset's target requirements with the imported account and return one result per requirement part: owned, constellation, weapon, refinement, level, talent (auto/skill/burst individually), each with expected value, actual value, pass/fail and one plain-English message.
- **FR-002**: Messages MUST name the character, the expected value and the actual value using in-game display names (e.g. "Splendor of Tranquil Waters", "Furina"), never internal keys.
- **FR-003**: When the weapon part fails, the system MUST list qualifying weapons the player owns (unequipped or equipped on another character) and allow selecting one; the selection MUST be re-matched, never assumed.
- **FR-004**: A preset with any failing part MUST NOT be runnable; the system MUST NOT substitute characters, constellations, weapons or refinements.
- **FR-005**: Teammates declared as fixed (assumed) builds MUST NOT be checked against the account.
- **FR-006**: Requirement parts omitted by the preset mean "any" and MUST NOT produce failures.
- **FR-007**: The system MUST validate preset documents against the shared preset format and report every problem with its location.
- **FR-008**: The system MUST additionally verify, using the calculation engine's own catalog, that each rotation instance path and each conditional (sheet + name + value) exists for the relevant character/weapon/artifact set, and that required/assumed weapons match the wearer's weapon type.
- **FR-009**: Akasha presets MUST additionally: carry leaderboard metadata (calculation id, leaderboard URL on akasha.cv, label, retrieval date); require an exact constellation (or range) and an exact weapon with refinement for the target; use fixed builds for every teammate; require character level 90+ unless the leaderboard states otherwise.
- **FR-010**: The system MUST provide a registry of bundled presets (Akasha and official) with list and lookup-by-id, exposing each preset's badge text and whether it is verified (reference fixture present).
- **FR-011**: The Presets page MUST list bundled and custom presets, filter by target character, show the badge, team, requirements, rotation breakdown (instance label, count, repeats), conditional/buff assumptions, enemy settings, Akasha leaderboard link/metadata, and the match report against the imported account.
- **FR-012**: The Presets page MUST offer "Optimize with this preset" linking to the optimizer with the preset id (and selected weapon, if any); it MUST be disabled with the failing reasons visible when the preset cannot run.
- **FR-013**: Presets MUST NOT display or embed any damage number; no preset field may carry expected damage.
- **FR-014**: Only Akasha cases whose details were confirmed from the leaderboard source MAY be bundled; unconfirmed cases MUST be recorded in research notes as "unconfirmed — not shipped".
- **FR-015**: Every bundled Akasha preset MUST have a reference fixture in the engine's golden-fixture suite before it is shipped.

### Key Entities

- **Preset**: setup bundle (shared format) — id, name, source, author, Akasha metadata, target, team, enemy, team conditionals, rotation.
- **Match Report**: result of comparing one preset with one account — preset id, can-run flag, ordered list of match entries, the weapon selection it was computed for.
- **Match Entry**: one requirement part for the target — part, expected, actual, pass/fail, message, optional weapon candidates.
- **Weapon Candidate**: a weapon in the player's inventory that satisfies the weapon requirement — inventory reference, name, refinement, level, where it is equipped.
- **Registry Entry**: a bundled preset plus badge text and verified flag.
- **Validation Issue**: path inside the preset, severity, message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of mismatch cases in the test suite, the player is told which part fails and what they have, in one sentence per part.
- **SC-002**: 0 cases in the test suite where a preset with a failing part is reported as runnable.
- **SC-003**: Opening a preset with an imported account shows the full match report in under 1 second for an 80-character / 1,000-artifact account.
- **SC-004**: 100% of bundled presets pass format and engine-catalog validation; 100% of bundled Akasha presets have a reference fixture matching the engine within 0.1% per damage instance.
- **SC-005**: A player can go from the Presets page to the optimizer with a chosen preset in at most 2 clicks when the preset matches.

## Assumptions

- **AP-1 (Starter Akasha Preset Suite)**: We ship 4 canonical Akasha leaderboard presets (`akasha/furina-salon-solitaire-c0`, `akasha/neuvillette-hypercarry-c0`, `akasha/hutao-double-hydro-homa-c1`, `akasha/raiden-hypercarry-c0`) matching the sample account (`Van_2025-07-16_19-59-13.json`) plus additional C2/signature variants so the user can test both passing and failing account matches out of the box. Every shipped Akasha preset has a verified golden fixture against GO's calculation.
- **AP-2 (Talent levels)**: Talent requirements are compared against GOOD base talent levels (constellation +3 bonuses not added), because that is what scanners export and what GO stores.
- **AP-3 (Min semantics)**: `minLevel`/`minTalent` are minimums; higher is a pass. Constellation and refinement are exact or an explicit range.
- **AP-4 (Runnable rule)**: "Can run" = every emitted part passes, for every source (Akasha, official, user). Official/user presets that want leniency simply omit requirement parts.
- **AP-5 (Weapon selection)**: Default weapon = the one equipped on the target. A weapon equipped on another character may be selected; this does not move it in the user's data, it only selects it for evaluation (GO "use equipped" semantics, A5 in architecture).
- **AP-6 (Teammates)**: Akasha presets model every teammate as a fixed build (architecture A4); teammate constellations/weapons are part of the fixed build and never matched.
- **AP-7 (Level)**: Akasha normalises characters to level 90; Akasha presets therefore set `minLevel: 90` unless the leaderboard states another level.
- **AP-8 (Rotation paths)**: Rotation paths are GO-native display paths as GO stores them in `CustomTarget.path` (e.g. `["skill","usherDmg"]`, `["normal","0"]`, `["weapon:CrescentPike","hit"]`), not prefixed with the character key.
- **AP-9 (Names)**: Display names come from GO's English localisation files; only English is supported in this phase.
- **AP-10 (Verified badge)**: An Akasha preset is "verified" iff its id is listed in the bundled verified manifest, which an automated test keeps in sync with the engine's golden fixtures.
- Depends on `good-import` (stored account, `useGood()`), `single-character-optimizer` (engine catalog `listTargets`/`listConditionals`, golden-fixture harness, `/optimize?preset=` handling), `official-presets` (official bundled JSON), `custom-teams-and-presets` (user presets in storage).
