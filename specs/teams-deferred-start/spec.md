# Feature Specification: Deferred Engine Start on Custom Teams Page

**Feature**: `teams-deferred-start` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "1. Render shell and saved-preset list first with zero worker spawn on initial mount: When `/teams` loads (without `?fork=` or `?edit=` query parameters), render the page shell, saved-preset list, and builder form controls immediately without spawning the optimizer worker or requesting the worker chunk. 2. Start engine on first real interaction: Engine start (worker spawn + catalog build + live preview evaluation) begins on the first real user interaction (picking/forking/editing a preset, changing the target character or a team member, adding/editing rotation targets or conditionals, or clicking the 'Load Engine & Preview' button) or when navigated to with `?fork=` / `?edit=`. While the engine is initializing or evaluating after interaction, the existing skeleton/spinner states cover the wait with a labelled status ('Loading optimizer engine…'). 3. Acceptance Criteria: Production `/teams` with an imported GOOD shows its shell + preset list with no worker spawned yet (verified by confirming no worker chunk / `Worker` constructor is invoked before user interaction). Once the user interacts (e.g., picks/forks a preset or changes target/team member), the worker starts, displays 'Loading optimizer engine…', loads the catalog, and computes the live damage preview."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Immediate Shell & Preset List Without Spawning the Engine (Priority: P1)

When a player navigates to `/teams` without `?fork=` or `?edit=` query parameters (including when a GOOD file is already imported in local storage), the Custom Team & Preset Builder immediately renders its page shell, saved-preset selector/list, preset metadata fields, enemy configuration, team setup cards, and rotation table using static metadata — without starting the background calculation engine or downloading/spawning the optimizer worker until the player interacts with the builder.

**Why this priority**: Previously, opening `/teams` immediately spawned the optimizer Web Worker, built the full target and conditional catalog for all team members, and evaluated the live rotation damage preview inside mount `useEffect` hooks whenever `record?.good` was present. Deferring engine startup until the first real user interaction eliminates multi-megabyte worker chunk downloads and heavy GO graph compilation when a user merely opens `/teams` to browse their saved presets, export/delete a preset, or inspect the page shell.

**Independent Test**: Load `/teams` with an imported GOOD dataset in storage and no `?fork=` or `?edit=` query parameters; verify that the page shell, preset switcher, and builder form controls render immediately, zero background worker instances are constructed (`Worker` constructor / worker client calls are not invoked), and the Live Rotation Preview panel displays a clear prompt and an explicit `"Load Engine & Preview"` action button.

**Acceptance Scenarios**:

1. **Given** a user has an imported GOOD dataset and saved custom presets, **When** they open `/teams` without `?fork=` or `?edit=` query parameters, **Then** the page shell, saved-preset list/selector, team cards, and rotation builder controls render immediately and no calculation engine worker is spawned.
2. **Given** `/teams` is in its initial deferred state (before engine activation), **When** the user views the Live Rotation Preview panel or conditional/target selectors, **Then** the current draft's existing rotation target row (`usherDmg` / `"Elemental Skill: Salon Member DMG"` on the default blank Furina setup) is preserved in the select dropdown and the Live Rotation Preview panel presents a `"Load Engine & Preview"` button explaining that the engine starts on first interaction.
3. **Given** `/teams` is in its initial deferred state, **When** the user deletes an existing custom preset or exports the current preset JSON without modifying the team/rotation or activating the engine, **Then** those preset management actions complete without spawning the calculation engine worker.

---

### User Story 2 - On-Demand Engine Activation on First Builder Interaction or Deep-Link Query Params (Priority: P1)

As soon as the player performs a real builder interaction on `/teams` — such as picking/forking/editing a preset from the selector or importing a preset file, changing the target character, adding/removing/updating a team member, opening/selecting a conditional buff or formula target dropdown, adding/editing/removing a rotation row, editing enemy overrides, or clicking the `"Load Engine & Preview"` button — OR when `/teams` is opened directly via `/teams?fork=<id>` or `/teams?edit=<id>`, the calculation engine activates immediately. While the engine initializes and computes the catalog and live rotation preview, the UI displays the animated `"Loading optimizer engine…"` spinner and skeleton placeholders, then populates full GO target/conditional catalogs and live damage numbers.

**Why this priority**: Players actively building or editing a team need seamless access to GO's full character/weapon/artifact conditional catalogs, formula target paths, and debounced live rotation damage preview the moment they begin interacting with the builder or arrive from a "Duplicate & Edit" / "Edit" link on `/presets` or `/optimize`.

**Independent Test**: Start on `/teams` with an imported GOOD dataset (verifying zero worker calls initially), then trigger any builder interaction (e.g., select a preset, change target character, add a teammate, edit a rotation row, or click `"Load Engine & Preview"`) or mount with `?fork=akasha/furina-hp-c0`; verify that the engine starts, displays `"Loading optimizer engine…"`, loads the character catalogs, and renders the computed live rotation damage preview.

**Acceptance Scenarios**:

1. **Given** `/teams` loaded in the deferred state with an imported GOOD dataset, **When** the user picks a preset from the `"Load or Fork Existing Preset"` selector, changes the target character, adds/edits a team member, edits a rotation target/conditional, or clicks `"Load Engine & Preview"`, **Then** the engine activates, displays the `"Loading optimizer engine…"` status spinner and preview skeleton, fetches the character catalogs, and computes the live rotation damage preview.
2. **Given** `/teams` loaded in the deferred state, **When** the user focuses or opens the `"GO Formula Target"` dropdown or `"+ Add Conditional Buff…"` dropdown before any other edit, **Then** the engine activates on demand so the full catalog of GO targets and conditionals loads into the dropdown with a `"Loading optimizer engine…"` indicator.
3. **Given** a user navigates to `/teams?fork=<presetId>` or `/teams?edit=<presetId>`, **When** the page mounts, **Then** the engine activates automatically without requiring an extra click, displaying `"Loading optimizer engine…"` while loading catalogs and evaluating the forked/edited preset's live rotation preview.
4. **Given** the engine has been activated on `/teams`, **When** the user makes subsequent edits to team members, conditionals, enemy resistances, or rotation counts, **Then** catalog lookups and debounced (150 ms) live rotation damage preview evaluations run automatically just as before.

### Edge Cases

- **Fallback option before catalog loads**: While `engineStarted` is `false` (or while `catalogLoading` is in flight), each rotation row's `"GO Formula Target"` `<select>` includes a fallback `<option>` for that row's current `path` and `label` (e.g., `skill.usherDmg` — `usherDmg (skill.usherDmg)`) whenever `targetCatalog` is empty, so controlled `<select>` elements never lose their selected value or render blank before the worker catalog arrives.
- **Target character switched as the very first interaction**: When `handleTargetChange(nextTargetKey)` is the user's first interaction, it marks the engine as started (`setEngineStarted(true)`), awaits `getCatalogInWorker([nextTargetKey])`, and populates both the new target's default rotation target and the subsequent live preview.
- **Preset JSON imported from disk as the first interaction**: Importing a preset JSON file (including resolving an ID collision via Replace or Keep Both) marks the engine as started so the newly imported preset's catalogs and live preview load immediately.
- **No GOOD file imported when engine starts**: If the user interacts with the builder or clicks `"Load Engine & Preview"` without an imported GOOD dataset, the worker still loads the target and conditional catalogs (`getCatalogInWorker`) so the user can build rotations and conditionals, while the Live Rotation Preview panel plainly reports `"Import a GOOD file to see live rotation damage preview."`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When `/teams` mounts without a non-empty `fork` or `edit` URL query parameter, `apps/web/src/app/teams/page.tsx` MUST NOT invoke `getCatalogInWorker`, `evaluatePresetInWorker`, `initEngineSession`, or construct the optimizer Web Worker during initial mount or initial storage hydration (`useGoodStorage`, `useUserPresets`).
- **FR-002**: When `/teams` mounts with a non-empty `fork` or `edit` URL query parameter (`/teams?fork=<id>` or `/teams?edit=<id>`), the page MUST automatically transition into the engine-started state so character catalogs and the live rotation preview load immediately for the forked or edited preset.
- **FR-003**: `apps/web/src/app/teams/page.tsx` MUST maintain an explicit engine-activation state (e.g. `engineStarted: boolean`, initialized to `Boolean(forkParam || editParam)`) that gates both the catalog-loading `useEffect` (`getCatalogInWorker`) and the debounced live-preview `useEffect` (`evaluatePresetInWorker`).
- **FR-004**: Any real builder interaction on `/teams` MUST set `engineStarted = true`, including:
  - Selecting a preset to load or fork in the `"Load or Fork Existing Preset"` dropdown, or importing a preset JSON file.
  - Changing the target character (`handleTargetChange`) or adding, removing, or modifying a team member (`addTeammate`, `removeTeammate`, `toggleTeammateBuildType`, `updateTcMember`).
  - Focusing/interacting with the `"+ Add Conditional Buff…"` selector or enabling/removing a member conditional (`setMemberConditionalState`).
  - Focusing/interacting with the `"GO Formula Target"` selector or adding, updating, or removing a rotation target row (`addRotationRow`, `updateRotationRow`, `removeRotationRow`) or changing `rotation.repeat`.
  - Modifying enemy level or resistance overrides.
  - Clicking the explicit `"Load Engine & Preview"` button in the Live Rotation Preview panel.
- **FR-005**: Before `engineStarted` is `true`, the Live Rotation Preview panel MUST render a clear idle state with a `"Load Engine & Preview"` button (`data-testid="load-engine-preview-btn"` or accessible button text `"Load Engine & Preview"`) instead of automatically firing `evaluatePresetInWorker` or showing an active spinner.
- **FR-006**: Once `engineStarted` becomes `true`, while the worker is hydrating or fetching catalogs/preview (`catalogLoading || previewLoading`), the UI MUST display the shared `<Spinner label="Loading optimizer engine…" />` (when hydrating or loading catalogs) or `<Spinner label="Evaluating…" />` (when already hydrated) and `<SkeletonBlock />` rows in the Live Rotation Preview panel.
- **FR-007**: Before `targetCatalog` is populated by the worker for `draft.target`, the rotation table's `"GO Formula Target"` `<select>` MUST render a fallback `<option value={normPathKey}>` for the row's current target path so the controlled select displays the current target cleanly without requiring the worker catalog on initial mount.

### Key Entities

- **`engineStarted` Activation State (`apps/web/src/app/teams/page.tsx`)**: Boolean state tracking whether the user (or a `?fork=` / `?edit=` deep link) has triggered engine initialization on `/teams`.
- **Deferred Live Rotation Preview Prompt**: Initial state of the Live Rotation Preview card on `/teams` prior to `engineStarted`, offering a one-click `"Load Engine & Preview"` trigger alongside automatic activation on any builder edit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening `/teams` (without `?fork=` or `?edit=`) with an imported GOOD dataset results in **0** calls to `getCatalogInWorker`, `evaluatePresetInWorker`, or `new Worker(...)` prior to user interaction.
- **SC-002**: 100% of first user interactions (preset selection/fork, target/teammate change, conditional/rotation edit, dropdown focus, or clicking `"Load Engine & Preview"`) and `?fork=` / `?edit=` deep links transition `engineStarted` to `true`, display `"Loading optimizer engine…"`, load the catalog, and compute the live damage preview.
- **SC-003**: All automated unit/component tests (`pnpm -r test`), typechecks (`pnpm -r typecheck`), and static production builds (`pnpm --filter @gi/web build`) pass with zero errors.

## Assumptions

- **TDS-A1 (Metadata-only edits before engine start)**: Editing purely descriptive text fields (`draft.name`, `draft.description`, `draft.rotation.name`) or changing the "new teammate candidate" dropdown (`newMemberKey` before clicking `+ Add Simulated Teammate`) does not need to force-start the worker by itself, though starting on any builder edit or clicking `"Load Engine & Preview"` is always available. To keep behavior predictable and responsive, focusing the conditional or formula-target dropdowns (`onFocus` / `onMouseDown`) also triggers `startEngine()` so options populate as the user opens the menu.
- **TDS-A2 (Session-scoped worker reuse)**: If the user already visited `/optimize` in the same browser tab and the shared worker is already alive, `/teams` still defers calling `getCatalogInWorker` and `evaluatePresetInWorker` on initial mount (without `?fork=` / `?edit=`) until first interaction, avoiding unnecessary catalog/evaluation work on mount while reusing the warm worker once activated.
