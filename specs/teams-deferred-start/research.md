# Research & Technical Decisions: Deferred Engine Start on Custom Teams Page (`teams-deferred-start`)

## R1. Root Cause of Eager Worker Spawn on `/teams` Mount

- **Decision**: Gate both the catalog-loading `useEffect` (`getCatalogInWorker`) and the debounced live rotation preview `useEffect` (`evaluatePresetInWorker`) in `apps/web/src/app/teams/page.tsx` behind an explicit `engineStarted: boolean` state, initialized to `Boolean(forkParam || editParam)`.
- **Rationale**: In commit `bac8f21`, `TeamsInner` (`apps/web/src/app/teams/page.tsx` lines 143–170 and 176–225) runs two unconditional `useEffect` hooks on mount:
  1. Line 143: `useEffect` calling `getCatalogInWorker(keys)` for `draft.target` (`'Furina'`) immediately on mount. Inside `apps/web/src/lib/engine/workerClient.ts` (line 251), `getCatalogInWorker` calls `getOrCreateWorker()`, which invokes `new Worker(new URL('../../workers/optimizer.worker.ts', import.meta.url))` and downloads/compiles the GO engine worker chunk even when no GOOD file is imported.
  2. Line 176: `useEffect` calling `evaluatePresetInWorker({ datasetKey: record.importedAt, good: record.good, preset: draft })` after a 150 ms debounce whenever `record?.good` is present in IndexedDB.
  By gating both effects on `if (!engineStarted) return`, visiting `/teams` (without `?fork=` or `?edit=`) renders the entire page shell, saved-preset selector, team cards, and rotation table using only `@gi/presets` static metadata (`ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `displayName`, `CharacterBadge`) with zero worker creation or chunk requests.
- **Alternatives considered**:
  - Deferring only `evaluatePresetInWorker` while keeping `getCatalogInWorker` on mount: Rejected because `getCatalogInWorker` itself calls `getOrCreateWorker()` in `workerClient.ts`, which spawns the worker and loads `@gi/engine` on mount, violating Acceptance Criterion 1 ("with no worker spawned yet").

## R2. Triggering Engine Start on First Real User Interaction or `?fork=` / `?edit=`

- **Decision**:
  1. Initialize `const [engineStarted, setEngineStarted] = useState<boolean>(() => Boolean(forkParam || editParam))` and synchronize inside the `forkParam` / `editParam` `useEffect` so client-side navigation to `/teams?fork=<id>` or `/teams?edit=<id>` also sets `setEngineStarted(true)`.
  2. Call `setEngineStarted(true)` (via a `startEngine()` helper) in every builder interaction handler in `apps/web/src/app/teams/page.tsx`:
     - Picking/forking/editing a preset in the `"Load or Fork Existing Preset"` `<select>` (`onChange`).
     - Importing a preset JSON file (`handleImportFile` and collision resolution buttons).
     - Changing the target character (`handleTargetChange`).
     - Adding, removing, or editing a team member (`addTeammate`, `removeTeammate`, `toggleTeammateBuildType`, `updateTcMember`).
     - Focusing/opening or changing the conditional selector (`onFocus` / `onChange` on `"+ Add Conditional Buff…"` select) or enabling/removing a conditional (`setMemberConditionalState`).
     - Focusing/opening or changing the rotation target selector (`onFocus` / `onChange` on `"GO Formula Target"` select) or adding/updating/removing a rotation row (`addRotationRow`, `updateRotationRow`, `removeRotationRow`, `rotation.repeat`).
     - Editing enemy level or elemental resistance overrides.
     - Clicking the explicit `"Load Engine & Preview"` button in the Live Rotation Preview card.
- **Rationale**: Covers every user interaction listed in the feature scope while also ensuring that if a user's very first action is opening the `"GO Formula Target"` or `"+ Add Conditional Buff…"` `<select>` dropdown (`onFocus`), the engine starts immediately and populates the catalog options with `"Loading optimizer engine…"` feedback.
- **Alternatives considered**:
  - Document-level `pointerdown`/`keydown` listener that starts the engine on any click anywhere on the page (such as clicking the header or "Export Preset JSON"): Rejected because passive clicks or preset export/delete actions should not unnecessarily spawn the worker, whereas explicit builder interactions and the `"Load Engine & Preview"` button are unambiguous and deterministic.

## R3. Preserving Controlled Rotation Target `<select>` Before Catalog Hydration

- **Decision**: In `apps/web/src/app/teams/page.tsx` (lines 1282–1303), when `targetCatalog` is empty (because `engineStarted` is `false` or `catalogLoading` is still in progress) or does not yet contain `normPathKey`, render a fallback `<option value={normPathKey}>{rt.label ? `${rt.label} (${normPathKey})` : normPathKey}</option>` inside the `"GO Formula Target"` `<select>`.
- **Rationale**: The initial blank draft created by `createBlankUserPreset('Furina', 'Furina Custom Setup', ['skill', 'usherDmg'])` has `rt.path = ['skill', 'usherDmg']` (`normPathKey = 'skill.usherDmg'`) and `rt.label = 'usherDmg'`. When `targetCatalog` is `[]` before the worker runs, an empty `<select value="skill.usherDmg">` would show a blank selection in the browser. Rendering the current row's `normPathKey` as a fallback `<option>` keeps the rotation table accurate and readable prior to worker spawn.
- **Alternatives considered**:
  - Bundling all 80+ characters' target paths statically into `@gi/presets`: Rejected because GO display paths come from `getTeamDataCalc` sheets in `@gi/engine` and duplicating them statically would bloat initial bundles and risk drift.
