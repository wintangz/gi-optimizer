# Feature Specification: GOOD Import

**Feature**: `good-import`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Load a GOOD file (file + paste), store locally in the browser, show characters / weapons / artifacts parsed, report parse errors plainly. Import is GOOD format from scanners (e.g. Irminsul, Inventory Kamera, GO export) ONLY. No UID / Enka / showcase import — showcase data can't be optimised (state this as out of scope)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import a scanner GOOD file and keep it (Priority: P1)

I exported my account from a scanner (Irminsul, Inventory Kamera) or from Genshin Optimizer. I open
the Import page, pick the file (or drop it on the page), see a short report saying how many
characters, weapons and artifacts were read, and confirm. The data is kept in this browser so the
optimizer and presets can use it next time I open the site, without uploading anything.

**Why this priority**: Every other feature (optimizer, preset matching) needs the user's account
data. Without import, nothing else works.

**Independent Test**: Import the GO sample file (81 characters, 191 weapons, 1157 artifacts),
reload the page, and see the same counts restored with the import date and file name.

**Acceptance Scenarios**:

1. **Given** no stored data, **When** I choose a valid GOOD file, **Then** I see a report with
   counts of characters, weapons and artifacts read, plus any warnings, and a "Save" action.
2. **Given** a parsed file with no fatal problems, **When** I save, **Then** the data is stored in
   this browser and the page shows "Current data: <file name>, imported <date/time>" with counts.
3. **Given** stored data, **When** I reload or reopen the site, **Then** the stored data and its
   summary are shown without re-importing.
4. **Given** a Genshin Optimizer database export (GOOD plus GO-only sections such as teams and
   optimizer settings), **When** I import it, **Then** characters, weapons and artifacts are read,
   and one informational note says the GO-only sections were ignored.

---

### User Story 2 - Understand exactly what is wrong with a bad file (Priority: P1)

My file is broken, from the wrong tool, or from a newer game version. The page tells me in plain
English what is wrong, where (the exact location in the file, e.g. `artifacts[12].substats[2].key`),
and why, with a suggestion when one is obvious. Nothing is silently dropped or silently changed.

**Why this priority**: Constitution III requires plain error reporting and forbids silent drops; a
wrong import silently corrupts every optimization result downstream.

**Independent Test**: Feed a set of crafted bad inputs (invalid JSON, Enka JSON, misspelled stat
keys, unknown new character, out-of-range levels) and verify each produces the specified message,
location and severity.

**Acceptance Scenarios**:

1. **Given** text that is not JSON, **When** I import it, **Then** I see a fatal error naming the
   line and column where reading failed, and nothing is stored.
2. **Given** an Enka.Network / showcase response, **When** I import it, **Then** I see a fatal error
   saying showcase data cannot be optimised and that a GOOD file from a scanner is required.
3. **Given** an artifact with substat key `critRate`, **When** I import, **Then** I see
   `artifacts[12].substats[2].key: 'critRate' is not a valid substat — did you mean 'critRate_'?`
   and the report states that artifact was skipped.
4. **Given** a character, weapon or artifact set the optimizer does not know yet (newer game
   version), **When** I import, **Then** that entry is skipped with a warning naming the unknown key,
   and every other entry is still imported.
5. **Given** a value outside allowed limits (e.g. talent 13 at ascension 6, refinement 7), **When** I
   import, **Then** a warning shows the original value and the adjusted value used.
6. **Given** any import with problems, **When** I view the report, **Then** problems are grouped by
   kind with counts, each entry listing its exact location, and fatal errors are visually distinct
   from skipped entries and from warnings.

---

### User Story 3 - Browse my imported characters, weapons and artifacts (Priority: P2)

After importing I can look through tables of my characters, weapons and artifacts to check the scan
is right: filter by name/set/slot/main stat/location/rarity and see who has what equipped.

**Why this priority**: Lets the user verify the scan before trusting optimizer output; not required
for the optimizer to run.

**Independent Test**: With the sample file stored, filter artifacts to set "Viridescent Venerer",
slot "goblet" and see only matching rows; filter characters by name; filter weapons by equipped.

**Acceptance Scenarios**:

1. **Given** stored data, **When** I open the Characters tab, **Then** I see one row per character
   with level, ascension, constellation, talents and the equipped weapon.
2. **Given** stored data, **When** I open the Artifacts tab and set filters, **Then** only matching
   rows are shown and the count "showing X of Y" is updated.
3. **Given** 1,000+ artifacts, **When** I scroll and filter, **Then** the table stays responsive.

---

### User Story 4 - Replace or clear my data safely (Priority: P2)

When data is already stored, importing a new file asks me to confirm that it will replace the current
data (with old vs new counts). I can also clear all stored account data.

**Why this priority**: Prevents accidental loss; needed once the user re-scans.

**Independent Test**: With data stored, import another file, cancel → old data unchanged; confirm →
new data stored. Clear → no data stored, presets and settings untouched.

**Acceptance Scenarios**:

1. **Given** stored data, **When** I save a new import, **Then** a confirmation shows current vs new
   counts and nothing changes until I confirm.
2. **Given** stored data, **When** I choose "Clear data" and confirm, **Then** the imported account
   data is removed; user presets and optimizer settings remain.

---

### User Story 5 - Paste GOOD text instead of a file (Priority: P3)

I can paste the GOOD JSON text into a text box (e.g. copied from a scanner window) and import it the
same way as a file.

**Why this priority**: Convenience; the file path covers the core need.

**Independent Test**: Paste the sample file's text and get the same report as importing the file.

**Acceptance Scenarios**:

1. **Given** the paste box, **When** I paste GOOD text and choose "Read", **Then** I get the same
   report as for the equivalent file (file name shown as "pasted text").

### Edge Cases

- UTF-8 byte-order mark at the start: ignored silently (not a problem).
- Trailing content after a complete JSON value (e.g. a scanner log line, a second `}`): the JSON
  value is read, and a warning states how many characters were ignored and where they start.
- Empty input or whitespace only: fatal "The file is empty".
- File over 20 MB: fatal, rejected before reading (a real account export is ~1–2 MB).
- Top-level JSON is not an object, or `format` is not `"GOOD"`: fatal, with format detection hints
  (Enka/showcase, GO settings file, array instead of object).
- `version` other than 1, 2 or 3 or missing `source`: warning, continue.
- `characters` / `weapons` / `artifacts` present but not lists: fatal for the file.
- No usable characters, weapons or artifacts at all: fatal "nothing to import".
- Unknown extra fields on entries or at top level: one grouped informational note per field name.
- GO database export with a database version newer than the pinned GO supports: GO-only sections are
  ignored, so the import still succeeds.
- Duplicate artifact/weapon `id`s: the later entry gets a new id; warning lists both locations.
- Duplicate character keys: the later entry wins (as GO does); warning lists both locations.
- Legacy character key `Traveler`: expanded into the elemental Traveler variants exactly as GO does;
  informational note.
- Artifact or weapon equipped on a character not in the file: kept; warning that the optimizer will
  treat that character as level 1, C0, talents 1 (GO behaviour) until it is scanned.
- Two artifacts in the same slot (or two weapons) equipped on the same character: the later one stays
  equipped, the earlier becomes unequipped; warning.
- Character without an equipped weapon: warning that GO will assume a default weapon for it.
- Equipment location not a known character: unequipped; warning.
- Weapon type not usable by the character it is equipped on: weapon skipped (GO rejects it); error.
- Artifact rarity 1–2, level above the rarity's maximum, main stat impossible for the slot, a substat
  equal to the main stat, or a set that has no such slot/rarity: artifact skipped; error.
- Flower/plume with a wrong main stat: corrected to HP/ATK (GO behaviour); warning.
- More than 4 substats: first 4 kept; warning. Substat value outside the possible roll range for the
  rarity: clamped to the range (GO behaviour); warning.
- Very large files (2,000 artifacts): the report appears within the success-criteria time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept GOOD data from a chosen file, a dropped file, or pasted text.
- **FR-002**: The system MUST accept only the GOOD format (`format: "GOOD"`), including GO database
  exports (GOOD supersets). It MUST NOT offer UID, Enka.Network, or character-showcase import.
- **FR-003**: The system MUST classify every problem as **fatal** (file rejected, nothing stored),
  **error** (that entry skipped), **warning** (entry kept, possibly adjusted, or skipped because its
  key is unknown to this version), or **info** (no effect on data).
- **FR-004**: Every problem MUST state what is wrong, where (path such as
  `artifacts[12].substats[2].key`; line/column for unreadable JSON), and why, in plain English; and
  MUST offer a "did you mean" suggestion when a near-match key exists.
- **FR-005**: No entry may be dropped or changed without a corresponding reported problem.
- **FR-006**: Every entry the system accepts MUST also be accepted by Genshin Optimizer's own import
  with identical values after GO's normalization, so downstream optimization sees exactly what the
  report showed.
- **FR-007**: The report MUST show counts per section: read, imported, skipped, adjusted; and counts
  per severity.
- **FR-008**: The user MUST explicitly save; saving MUST replace any existing account data only after
  a confirmation showing current vs new counts.
- **FR-009**: Stored account data MUST persist in the browser across reloads and MUST NOT leave the
  device.
- **FR-010**: Each stored import MUST record import date/time, file name (or "pasted text"), original
  source tool name, and the summary counts.
- **FR-011**: The user MUST be able to clear stored account data without affecting user presets or
  optimizer settings.
- **FR-012**: The system MUST display characters, weapons and artifacts in filterable tables
  (characters: name; weapons: name, type, rarity, equipped-on; artifacts: set, slot, main stat,
  rarity, level range, equipped-on, substat present) with "showing X of Y".
- **FR-013**: Every stored artifact and weapon MUST carry a unique, stable id so other features can
  refer to a specific item.
- **FR-014**: The import page MUST state that GOOD from a scanner or GO export is the only supported
  import and that showcase (UID/Enka) data cannot be optimised.
- **FR-015**: The local storage module MUST also provide the user-preset and optimizer-settings
  stores defined in the shared architecture contract, for use by other features.

### Key Entities

- **GOOD file**: The account export (format, source tool, version, characters, weapons, artifacts).
- **Import report**: Problems (severity, location, message, suggestion, effect) plus summary counts.
- **Stored import**: The normalized account data accepted for use, import date/time, file name,
  source, and summary. Exactly one is stored at a time.
- **Character / Weapon / Artifact**: As defined by GOOD; weapons and artifacts carry an id and an
  optional "equipped on" character.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 2,000-artifact GOOD file produces its report in under 2 seconds on a mid-range laptop.
- **SC-002**: The GO sample export (81 characters, 191 weapons, 1157 artifacts) imports with 0 fatal
  problems, 0 skipped entries, and the exact counts shown.
- **SC-003**: For each of the documented bad-input cases, the report names the exact location and the
  expected message in 100% of cases.
- **SC-004**: Entries the report says were imported equal, one for one, the entries Genshin
  Optimizer accepts from the stored data (0 discrepancies on the sample and test fixtures).
- **SC-005**: Stored data survives a full browser reload in 100% of test runs.
- **SC-006**: Filtering the 1157-artifact table updates visible rows in under 200 ms.

## Assumptions

- **GI-1 (Replace, not merge)**: An import always replaces the stored account data as a whole. GO's
  merge options (keep items not in import, duplicate matching) are not offered.
- **GI-2 (Strictness vs GO)**: Where GO silently substitutes a default (unknown set → first set,
  unknown substat → blank, unknown location → unequipped, out-of-range refinement → 1), we either
  skip the entry with an error/warning (unknown set/substat/character/weapon keys) or adjust it with a
  warning (location, refinement, clamps). We are therefore never more permissive than GO.
- **GI-3 (Unknown keys = newer game)**: Unknown character/weapon/set keys are treated as content from
  a newer game version: entry skipped, severity warning, with a "did you mean" if a near match exists.
  Misspelled stat keys (main stat, substat, slot) are errors.
- **GI-4 (Talent levels)**: GOOD talent levels exclude constellation bonuses. Values above the base
  limit for the ascension are clamped as GO does, with a warning that mentions this likely cause.
- **GI-5 (GO-only sections)**: Sections of GO database exports other than characters/weapons/artifacts
  (teams, builds, optimizer configs, display settings, dbMeta, dbVersion) are not stored; one info note.
- **GI-6 (Ids)**: Artifact/weapon ids present in the file are kept when unique; missing or duplicate
  ids are assigned as `artifact_<n>` / `weapon_<n>` (GO's id style). Ids are stable for the lifetime of
  a stored import, not across re-imports.
- **GI-7 (Traveler)**: Legacy `Traveler` character key is expanded the same way GO's import migration
  does; Traveler equipment uses location `Traveler`, as in GOOD.
- **GI-8 (Size limit)**: Inputs over 20 MB are rejected to protect the browser tab.
- **GI-9 (Main thread)**: Parsing runs in the page (no worker); a progress indicator is unnecessary at
  the target sizes.
- **GI-10 (Single stored import)**: Only one account is stored at a time (no multiple profiles).
- **GI-11 (Display names)**: Tables show GO keys humanized (e.g. `KaedeharaKazuha` → "Kaedehara
  Kazuha"); localized names and icons are out of scope.
- **Out of scope**: UID / Enka.Network / showcase import (showcase data cannot be optimised),
  merging imports, editing items in the browser, exporting GOOD, multiple accounts.
