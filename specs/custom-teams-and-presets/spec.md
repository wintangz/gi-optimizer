# Feature Specification: Custom Teams and Presets

**Feature**: `custom-teams-and-presets` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "The user can set up their own team the normal GO way and save that setup as a preset. A preset is only a setup bundle (team context, target character, rotation, buff assumptions) — it makes no damage claim; numbers come from the user's own artifacts when it runs. User presets are use-at-your-own-risk, no verification badge. Same schema (source 'user', id 'user/<slug-or-uuid>'). Team builder like GO's Team page (up to 4 characters, target first, owned or assumed builds), per-character/weapon/artifact conditionals driven by GO sheet metadata, team resonance/reaction conditionals, enemy level/res overrides, hit mode / reaction / infusion, bonus stats, rotation built from GO damage instances with counts. Duplicate & edit an akasha/official preset into a user preset; import/export user preset as plain JSON; delete; live preview of rotation damage with the current build."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a team and rotation, save as my preset (Priority: P1)

On the Teams page the user picks a target character (slot 1) and up to three teammates. For each teammate they choose "my character" (their scanned unit with its equipped weapon and artifacts) or "assumed build" (fixed level/constellation/talents/weapon/artifact main stats/substat totals/sets). They build a rotation by picking the target's damage instances from the same list GO shows (e.g. "Elemental Skill › Salon Member DMG") and setting how many times each hits. They name the setup and save it. It then appears in their preset list with the badge "Custom — use at your own risk" and can be run in the optimizer like any other preset.

**Why this priority**: Without creating and saving a setup there is no feature; everything else edits or moves such setups.

**Independent Test**: With a GOOD file imported, create a 2-member team, add two damage instances, save, reload the browser, and confirm the preset is listed, reopens with identical contents, and validates against the shared preset schema.

**Acceptance Scenarios**:

1. **Given** no target is chosen, **When** the user opens the Teams page, **Then** they are asked to pick a target character before anything else can be edited.
2. **Given** a target and one rotation entry, **When** the user saves with name "Furina hypercarry", **Then** a preset with source `user`, an id starting `user/`, author "You", and the entered setup is stored on the device and listed with the "Custom — use at your own risk" badge and no verification badge.
3. **Given** a setup with zero rotation entries or a blank name, **When** the user tries to save, **Then** saving is refused and the exact missing part is named ("Rotation needs at least one damage instance").
4. **Given** a saved user preset, **When** the user renames it and saves, **Then** the same preset (same id) is updated, not duplicated.
5. **Given** the same character is already in the team, **When** the user tries to add it again, **Then** it is not offered.

---

### User Story 2 - Set buffs and conditions the GO way (Priority: P1)

For every team member the user sees that member's conditional toggles and stack/option selectors exactly as GO groups them (character talents/constellations, weapon passive, artifact set effects). For teammates only conditionals that buff the team are shown. Team-wide elemental resonance and reaction conditionals, enemy level and resistances / DEF reduction / DEF ignore, per-member hit mode, amplifying/additive reaction, infusion, and bonus stats are also editable. Each rotation entry can override hit mode, reaction, infusion and bonus stats.

**Why this priority**: Rotation damage is meaningless without the buff assumptions; this is the "GO way" the user asked for.

**Independent Test**: Toggle a known conditional (e.g. a weapon passive stack selector) and verify the saved preset's conditional values equal what GO would store for the same choice, and that the live preview total changes accordingly.

**Acceptance Scenarios**:

1. **Given** a teammate with a team-buff conditional, **When** the user sets its stacks to "3", **Then** the preset stores the value under that member, keyed exactly by GO's sheet key and conditional key, with GO's state key.
2. **Given** a conditional currently set, **When** the user chooses "Not active", **Then** the value is removed from the preset (not stored as empty).
3. **Given** a conditional that does not apply in the current context (e.g. a constellation the member does not have), **When** the editor renders, **Then** it is shown as unavailable with the reason, and any stored value is kept and flagged rather than silently deleted.
4. **Given** the enemy editor, **When** the user sets Pyro RES to 30%, **Then** the preset stores the GO enemy-override key for Pyro RES with value 30.

---

### User Story 3 - Live preview with my current build (Priority: P2)

While editing, a panel shows the rotation total and per-instance breakdown (per hit, count, subtotal) computed from the target's currently equipped weapon and artifacts, plus key final stats. It updates after each change.

**Why this priority**: Gives immediate feedback that the setup is sane; not required to save a preset.

**Independent Test**: Load a fixed GOOD file, build a known setup, and compare the preview numbers with the engine's evaluation of the same preset and build.

**Acceptance Scenarios**:

1. **Given** a valid draft and an owned target, **When** the user changes a rotation count from 2 to 3, **Then** that instance's subtotal and the total update within 1 second.
2. **Given** no GOOD import or a target the user does not own, **When** the preview would render, **Then** it states plainly why no numbers are shown ("You don't own Furina in the imported data") and shows nothing else.
3. **Given** an "owned" teammate the user does not own, **When** preview runs, **Then** it names that teammate as the blocker instead of substituting a build.

---

### User Story 4 - Duplicate & edit an Akasha or official preset (Priority: P2)

From any bundled preset the user chooses "Duplicate & edit". A new user preset opens in the builder containing the same team, conditionals, enemy, rotation and requirements, but with source `user`, a new id, author "You", name "<original name> (copy)", and no Akasha leaderboard data or badges. The original is untouched.

**Why this priority**: Fastest way to a custom setup; depends on US1's save.

**Independent Test**: Fork a bundled Akasha preset, save, and verify the copy validates, has source `user`, no `akasha` block, a different id, and identical team/rotation.

**Acceptance Scenarios**:

1. **Given** an Akasha preset, **When** duplicated, **Then** the copy has no Akasha metadata, no Akasha/verified badge, and shows the "Custom — use at your own risk" badge.
2. **Given** a user preset, **When** duplicated, **Then** a second user preset with a new id is created; both exist independently.

---

### User Story 5 - Import, export and delete user presets (Priority: P3)

The user exports a user preset to a plain JSON file, imports such a file (from themselves or a friend), and deletes presets they no longer want.

**Why this priority**: Portability and housekeeping; core value exists without it.

**Independent Test**: Export a preset, delete it, import the file, and confirm the restored preset is identical; import a broken file and confirm each problem is listed plainly.

**Acceptance Scenarios**:

1. **Given** a user preset, **When** exported, **Then** a `.json` file containing exactly that preset document is downloaded.
2. **Given** a file that is not JSON, **When** imported, **Then** the user sees "This file is not valid JSON" with the parser's position, and nothing is saved.
3. **Given** valid JSON with schema problems, **When** imported, **Then** every problem is listed with where (e.g. `team › 2 › build › tc › weapon › level`), what was found and why it is wrong, and nothing is saved.
4. **Given** a valid file whose id already exists on the device, **When** imported, **Then** the user chooses "Replace existing" or "Keep both" (keep both assigns a new id); default is "Keep both".
5. **Given** a valid file with source `akasha` or `official`, **When** imported, **Then** it is imported as a user copy (Akasha data removed) and the user is told so explicitly.
6. **Given** a user preset, **When** the user deletes it and confirms, **Then** it disappears from all lists and the device store.

### Edge Cases

- Rotation entry whose damage-instance path no longer exists in the current GO data (e.g. imported from a different version): kept, flagged "Unknown damage instance", excluded from preview, and saving still allowed only after the user removes or replaces it.
- Changing the target character: rotation entries belonging to the old target are listed and must be confirmed for removal; conditionals keyed by the old target are removed with it.
- Removing a teammate removes only that member's conditionals; team resonance values that no longer apply are flagged, not silently dropped.
- Switching a teammate from assumed build to my character (or back) keeps its conditionals.
- Preset names using non-Latin characters: id falls back to a random id; name is kept verbatim.
- Very large imported file (> 1 MB): rejected with a plain message before parsing.
- Unsaved changes when leaving the page: the user is warned.
- Storage write failure (quota/private mode): plain error, draft stays in the editor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Teams page MUST let the user pick 1–4 distinct characters; slot 1 is the target and is always "my character".
- **FR-002**: Each teammate MUST be settable to "my character" (scanned unit, equipped weapon + artifacts) or "assumed build" with level, ascension, constellation, three talent levels, weapon (key, level, ascension, refinement), five artifact main stats (stat, level, rarity), substat totals (type, rarity, values) and set counts.
- **FR-003**: Switching a teammate to "assumed build" MUST prefill from the user's own unit when owned, otherwise from GO's default theorycraft build.
- **FR-004**: The conditional editor MUST list conditionals from GO's own sheets for the member's character, weapon and active artifact sets, grouped as GO groups them, rendered as on/off toggles or option/stack selectors, with "Not active" removing the value.
- **FR-005**: For teammates, only team-buff conditionals MUST be shown; for the target, all conditionals.
- **FR-006**: Team resonance and reaction conditionals MUST be editable and stored at team level.
- **FR-007**: The user MUST be able to set enemy level (1–200), per-element RES (including physical), DEF reduction and DEF ignore.
- **FR-008**: The user MUST be able to set per-member hit mode (average / non-crit / crit), amplifying or additive reaction, infusion, and bonus stats restricted to GO's bonus-stat keys.
- **FR-009**: The rotation builder MUST offer the target's damage instances as GO lists them (section › name), allow adding, removing, reordering, setting count (> 0, decimals allowed), label, and per-entry hit mode / reaction / infusion / bonus stats, plus rotation name and repeat (integer ≥ 1).
- **FR-010**: Saving MUST produce a document valid against the shared preset schema with source `user`, id `user/<slug>` derived from the name plus a random suffix (random id when the name yields no slug), and author "You". The id MUST NOT change on rename.
- **FR-011**: User presets MUST be stored on the device only and listed with the badge "Custom — use at your own risk" and no verification badge.
- **FR-012**: "Duplicate & edit" MUST produce a user preset with new id, source `user`, Akasha metadata removed, name suffixed " (copy)", all other content deep-copied, original unchanged.
- **FR-013**: Export MUST download exactly the stored preset as pretty-printed JSON named `<id-slug>.preset.json`.
- **FR-014**: Import MUST reject non-JSON, oversize (> 1 MB) and schema-invalid files with every problem reported as where / what / why, and MUST save nothing in those cases.
- **FR-015**: Import of non-user presets MUST convert to a user copy and say so; id collisions MUST offer Replace / Keep both.
- **FR-016**: Delete MUST require confirmation and remove the preset from the device.
- **FR-017**: Live preview MUST show rotation total, per-instance per-hit / count / subtotal, and final stats for the target's currently equipped build, computed by the GO-based engine, updating within 1 second after an edit; when it cannot compute it MUST state why.
- **FR-018**: Nothing MUST be silently substituted: unknown damage instances, inapplicable conditionals and unowned "my character" members are shown plainly.
- **FR-019**: Energy Recharge MUST NOT be part of any objective or requirement the builder writes.
- **FR-020**: Leaving with unsaved changes MUST warn the user.

### Key Entities

- **User preset**: a preset document with source `user` — name, description, target, team (members), enemy, team conditionals, rotation. Makes no damage claim.
- **Team member**: character, build kind (mine / assumed), requirement, conditionals, bonus stats, hit mode, reaction, infusion.
- **Rotation entry**: damage-instance path, count, label, per-entry overrides.
- **Conditional descriptor**: engine-provided description of one GO conditional (where it is stored, label, kind, states, availability) used to render the editor.
- **Draft**: an in-editor, possibly incomplete preset (may have no rotation yet) that becomes a user preset when saved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with imported data can create and save a 4-member team with a 5-instance rotation in under 5 minutes.
- **SC-002**: 100% of saved, exported or forked user presets validate against the shared preset schema.
- **SC-003**: Export → delete → import round-trips to an identical preset in 100% of tested cases.
- **SC-004**: For a fixed test account and setup, the preview total equals the engine's evaluation of the same preset and build exactly (same code path), and conditional values match what GO stores for the same toggles in 100% of sampled conditionals.
- **SC-005**: Preview updates within 1 second of an edit for a 4-member team.
- **SC-006**: Every rejected import lists all detected problems in plain language; zero files are partially saved.

## Assumptions

- **CT-A1 (Author)**: User presets have author "You" (schema needs a non-empty author; no accounts exist).
- **CT-A2 (Id)**: id = `user/<slug(name) ≤ 40 chars>-<6 random base36 chars>`; if the slug is empty (e.g. non-Latin name) id = `user/<uuid v4>`. Ids are immutable after creation.
- **CT-A3 (Fork content)**: Duplicating keeps member requirements, tc builds, conditionals, enemy and rotation verbatim; only source/id/author/name/akasha change. Requirements are editable afterwards.
- **CT-A4 (Requirements in user presets)**: New user presets start with empty requirements. In the builder, failing requirement parts of a user preset are shown as warnings, not blockers; an unowned "my character" member is a blocker for preview/optimisation (nothing to evaluate).
- **CT-A5 (Teammate conditionals)**: Teammates show team-buff conditionals only, mirroring GO's team buff panel; their values are stored on that member, as GO stores them on that team character.
- **CT-A6 (Inapplicable values)**: Stored conditional values whose section is not shown in the current context are kept and flagged, never auto-deleted (no silent adaptation).
- **CT-A7 (Preview build)**: Preview uses the target's currently equipped weapon and artifacts; weapon swapping is an optimizer concern, not a builder concern.
- **CT-A8 (Preview location)**: Preview evaluation runs on the page (debounced), not in the optimizer worker; it is one evaluation, not an optimisation.
- **CT-A9 (No GOOD)**: Without imported data the builder still works (metadata only); preview is disabled with a plain reason.
- **CT-A10 (Names)**: Characters, weapons and sets are shown with GO's English names where the engine provides them, otherwise humanised GO keys (e.g. "HuTao" → "Hu Tao").
- **CT-A11 (Import format)**: Import accepts exactly one preset document per file (no arrays, no GO database files). Max size 1 MB.
- **CT-A12 (Collision default)**: Import id collision defaults to "Keep both".
- **CT-A13 (Enemy keys)**: Enemy overrides use GO `Team.enemyOverride` keys: `<element>_enemyRes_` (incl. `physical`), `enemyDefRed_`, `enemyDefIgn_`; level lives in `enemy.level`, never in overrides.
- **CT-A14 (Bonus stats)**: Bonus-stat keys are limited to GO `allInputPremodKeys`; other keys are rejected on save/import (GO would silently drop them).
- **CT-A15 (Entry point)**: Other pages open the builder via `/teams?edit=<userPresetId>` or `/teams?fork=<presetId>`; `/teams` alone starts a blank draft.
- **CT-A16 (Scope)**: No sharing service, no uploads, no team-total objective; export/import files are the only way presets leave or enter the device.
