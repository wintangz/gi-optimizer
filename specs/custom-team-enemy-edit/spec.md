# Feature Specification: Custom Team Enemy Edit (`custom-team-enemy-edit`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature: custom-team-enemy-edit — Make enemy settings fully editable for an existing custom team: reopening a saved custom team in the team editor must show its saved enemy level and RES overrides (not defaults), editing + saving them must persist, and the optimizer must calculate with the saved enemy values."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit and Persist Enemy Level & Per-Element RES on Existing Custom Teams (Priority: P1)

When a user creates a custom team (either from scratch on `/teams` or by forking an existing preset via `/teams?fork=...`), sets a non-default enemy level and/or per-element RES override, saves it, and later reopens that saved custom team in the team editor (via `/teams?edit=...`, the `/teams` preset switcher, `/presets` "Edit", or `/optimize` "Customize"), the editor displays the saved enemy level and per-element RES overrides (not defaults), and editing + saving them updates the custom preset in place.

**Why this priority**: Previously, saving a custom preset while `/teams?fork=...` was in the URL caused `useEffect([editParam, forkParam, userPresets])` to re-run whenever `userPresets` updated, immediately overwriting `draft` with a fresh `forkPresetToUser(src)` and resetting enemy settings back to defaults. Additionally, clicking "Customize" on `/optimize` for a saved custom preset navigated to `/teams?fork=<id>` instead of `/teams?edit=<id>`, and `*_res_` override keys were not canonicalized to `*_enemyRes_` in schema parsing.

**Independent Test**: Create a custom team with a non-default enemy RES (e.g. `hydro_enemyRes_: 50`), save it, reopen it in `/teams`, verify the editor shows `50`, change the RES to a new value (e.g. `-20`), save again, reopen, and verify the editor shows `-20`.

**Acceptance Scenarios**:

1. **Given** a custom team created with a non-default enemy level or per-element RES override and saved, **When** it is reopened in the team editor (`/teams?edit=<id>` or via the preset selector), **Then** the Enemy Level and per-element RES inputs show the saved values rather than defaults (`100` / `10`).
2. **Given** a reopened custom team in the team editor, **When** the user modifies Enemy Level or any per-element RES override and clicks Save, **Then** the updated enemy values persist on the same custom preset ID and are not clobbered when `userPresets` refreshes.
3. **Given** an active custom preset (`source === 'user'`) on `/optimize`, **When** the user clicks the Customize/Edit action in the Setup card, **Then** it links to `/teams?edit=<id>` rather than `/teams?fork=<id>`, while bundled presets (`akasha` and `official`) continue to link to `/teams?fork=<id>`.

---

### User Story 2 - End-to-End Evaluation & Optimization with Saved Custom Enemy Values (Priority: P1)

When a custom team with saved enemy level and per-element RES overrides is evaluated (`session.evaluate`) or optimized (`session.optimize`), the calculation engine uses the saved enemy level and per-element RES values and reflects changes to them in rotation damage totals.

**Why this priority**: Enemy level and resistance directly determine the defense and resistance multipliers in Genshin Optimizer damage formulas. Editing and saving enemy settings must flow all the way through to evaluation and optimization totals.

**Independent Test**: Evaluate the saved custom preset with initial non-default enemy RES (`50%`) and with edited enemy RES (`-20%`), asserting that the rotation total increases as expected when enemy resistance decreases.

**Acceptance Scenarios**:

1. **Given** a saved custom preset whose target deals elemental damage against an enemy with elevated resistance (e.g. `hydro_enemyRes_: 50`), **When** the enemy resistance is edited to a lower value (e.g. `hydro_enemyRes_: -20`) and saved, **Then** `session.evaluate` and `session.optimize` with the edited preset produce a higher rotation damage total reflecting the updated resistance.
2. **Given** bundled presets (`akasha` and `official`), **When** inspected or evaluated, **Then** their authored enemy configuration remains unchanged and is editable only on a user fork.

### Edge Cases

- Saving a preset after arriving at `/teams?fork=<id>` must transition the editor to editing the newly saved custom preset rather than re-forking `forkParam` when `userPresets` updates.
- Selecting a preset in the "Load or Fork Existing Preset" dropdown on `/teams` when `?edit=` or `?fork=` is present in the URL must not be overwritten by the initial URL query parameter on subsequent `userPresets` updates.
- Presets containing legacy `${ele}_res_` keys in `enemy.overrides` are canonicalized to `${ele}_enemyRes_` during schema parsing so both the team editor inputs and the engine see the same keys.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Reopening a saved custom team (`source === 'user'`) in `/teams` (via `?edit=<id>` or the preset switcher) MUST initialize and display its saved `enemy.level` and `enemy.overrides` values.
- **FR-002**: Saving a custom team in `/teams` MUST persist its `enemy.level` and `enemy.overrides` in place without `useEffect` resetting `draft` when `userPresets` refreshes.
- **FR-003**: On `/optimize`, the Setup card action for a custom preset (`source === 'user'`) MUST link to `/teams?edit=<id>`, whereas bundled presets (`akasha` and `official`) MUST continue to link to `/teams?fork=<id>`.
- **FR-004**: `parsePreset` MUST canonicalize `${ele}_res_` keys in `enemy.overrides` to `${ele}_enemyRes_` so the team editor and engine share a single canonical key format.
- **FR-005**: `session.evaluate` and `session.optimize` MUST calculate damage using the preset's saved `enemy.level` and `enemy.overrides`.

## Assumptions

- Bundled presets (`akasha` and `official`) remain immutable in place and are only editable by forking into a user preset (`/teams?fork=<id>`).
- Per-element resistance values are expressed as percentage numbers (e.g. `10` for `10%`, `-20` for `-20%`, `50` for `50%`), matching GO's `enemyOverride` convention.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Regression test creates a custom team with a non-default enemy RES, saves, reopens, changes the RES, saves again, and asserts both that the reopened editor displays the new RES value and that `session.evaluate` reflects the new RES in its rotation total.
- **SC-002**: All unit and integration tests across `@gi/presets`, `@gi/engine`, and `@gi/web`, plus `pnpm typecheck`, `pnpm lint`, and `pnpm build`, pass with zero errors.
