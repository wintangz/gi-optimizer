---
description: "Task list for Deferred Engine Start on Custom Teams Page (teams-deferred-start)"
---

# Tasks: Deferred Engine Start on Custom Teams Page (`teams-deferred-start`)

**Input**: Design documents from `/specs/teams-deferred-start/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

**Tests**: Vitest tests (`apps/web/test/teams-deferred-start.test.tsx`) are included to verify zero worker spawn on initial mount and on-demand engine activation on user interaction or `?fork=` / `?edit=` query parameters.

**Organization**: Tasks are grouped by user story (`US1` Immediate Shell & Preset List Without Spawning Engine, `US2` On-Demand Engine Activation on First Interaction or Deep-Link Query Params) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup & Foundational State

**Purpose**: Introduce the `engineStarted` lifecycle state and `startEngine()` helper in `apps/web/src/app/teams/page.tsx`.

- [x] T001 Add `engineStarted: boolean` state (initialized to `Boolean(forkParam || editParam)`) and `startEngine()` helper in `apps/web/src/app/teams/page.tsx`

---

## Phase 2: User Story 1 - Immediate Shell & Preset List Without Spawning the Engine (Priority: P1) 🎯 MVP

**Goal**: Render the `/teams` page shell, saved-preset switcher, team member cards, and rotation builder controls immediately on initial mount (when no `?fork=` or `?edit=` query parameters are present) without spawning the optimizer Web Worker or requesting the worker chunk.

**Independent Test**: Render `/teams` (without `?fork=` or `?edit=`) with an imported GOOD dataset; verify that `getCatalogInWorker` and `evaluatePresetInWorker` are not called, no `Worker` is constructed, the rotation target `<select>` shows the fallback option for `skill.usherDmg`, and the Live Rotation Preview card displays the `"Load Engine & Preview"` button.

### Implementation for User Story 1

- [x] T002 [US1] Gate the catalog-loading `useEffect` (`getCatalogInWorker`) and debounced live rotation preview `useEffect` (`evaluatePresetInWorker`) on `if (!engineStarted) return` in `apps/web/src/app/teams/page.tsx`
- [x] T003 [US1] Render a fallback `<option value={normPathKey}>{rt.label ? `${rt.label} (${normPathKey})` : normPathKey}</option>` in the `"GO Formula Target"` `<select>` when `targetCatalog` does not yet contain `normPathKey`, and render the idle preview prompt with a `<button type="button" onClick={startEngine}>Load Engine &amp; Preview</button>` button when `!engineStarted` in `apps/web/src/app/teams/page.tsx`

**Checkpoint**: User Story 1 complete — `/teams` mounts with an imported GOOD file and renders its full shell and preset list with zero worker calls.

---

## Phase 3: User Story 2 - On-Demand Engine Activation on First Builder Interaction or Deep-Link Query Params (Priority: P1)

**Goal**: Automatically start the engine (`setEngineStarted(true)`), display `"Loading optimizer engine…"`, load the target/conditional catalogs, and evaluate the live rotation damage preview on the first real user interaction or when `/teams` is opened with `?fork=` or `?edit=`.

**Independent Test**: Trigger any builder interaction on `/teams` (picking/forking/importing a preset, changing target or teammate, focusing/changing conditional or formula target dropdowns, editing rotation rows or enemy overrides, or clicking `"Load Engine & Preview"`) or mount with `?fork=` / `?edit=`; verify that `engineStarted` transitions to `true`, `"Loading optimizer engine…"` is shown while hydrating/loading, and `getCatalogInWorker` + `evaluatePresetInWorker` run.

### Implementation for User Story 2

- [x] T004 [US2] Wire `startEngine()` (`setEngineStarted(true)`) into the `?fork=` / `?edit=` `useEffect`, preset switcher `<select>` `onChange`, `handleImportFile` (and import collision handlers), `handleTargetChange`, `addTeammate`, `removeTeammate`, `toggleTeammateBuildType`, `updateTcMember`, `setMemberConditionalState`, conditional `<select>` `onFocus`/`onChange`, rotation target `<select>` `onFocus`/`onChange`, `addRotationRow`, `updateRotationRow`, `removeRotationRow`, `rotation.repeat` `onChange`, and enemy level/resistance `onChange` handlers in `apps/web/src/app/teams/page.tsx`
- [x] T005 [P] [US2] Create `apps/web/test/teams-deferred-start.test.tsx` verifying: (a) initial mount of `/teams` without `?fork=` / `?edit=` does not call `getCatalogInWorker` or `evaluatePresetInWorker` and renders `"Load Engine & Preview"` + the fallback rotation target option, and (b) user interactions and `?fork=` / `?edit=` query parameters activate the engine, display `"Loading optimizer engine…"`, load catalogs, and compute the live rotation preview

**Checkpoint**: User Story 2 complete — engine starts on first real interaction or `?fork=` / `?edit=` deep link with full loading feedback.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification of tests, typechecks, and production static export build.

- [x] T006 Run `pnpm -r test`, `pnpm -r typecheck`, and `pnpm --filter @gi/web build` to verify all unit/component tests and static export succeed with zero errors

---

## Dependencies on Other Features

- **`loading-and-bundle`**: Owns `apps/web/src/components/Loading.tsx` (`Spinner`, `SkeletonBlock`) and `apps/web/src/app/teams/loading.tsx` per `docs/architecture.md` line 119. `apps/web/src/app/teams/page.tsx` consumes `Spinner` (`label="Loading optimizer engine…"`) and `SkeletonBlock` without modifying `Loading.tsx`.
- **`performance`**: Owns `apps/web/src/lib/engine/workerClient.ts` (`getCatalogInWorker`, `evaluatePresetInWorker`, `isEngineSessionHydrated`). `apps/web/src/app/teams/page.tsx` consumes these functions as-is.
- **`custom-teams-and-presets`**: Owns the custom team builder domain logic in `packages/presets/src/userPreset.ts` and `apps/web/src/app/teams/page.tsx`.

## Dependencies & Execution Order

- **Phase 1 (T001)**: Starts immediately in `apps/web/src/app/teams/page.tsx`.
- **Phase 2 / US1 (T002–T003)**: Depends on T001.
- **Phase 3 / US2 (T004–T005)**: T004 depends on T002–T003; T005 can be written in parallel and run once T004 completes.
- **Phase 4 (T006)**: Final verification after T001–T005 complete.

## Parallel Example

```bash
# Once T001–T004 are applied in apps/web/src/app/teams/page.tsx, T005 can be authored and executed independently:
Task: "T005 [P] [US2] Create apps/web/test/teams-deferred-start.test.tsx"
```

## Implementation Strategy

1. **MVP First (US1 — Deferred Mount)**: Add `engineStarted` state, gate both worker `useEffect` hooks, add the fallback `<option>` on the rotation target `<select>`, and render the `"Load Engine & Preview"` button when `!engineStarted`.
2. **Interaction Activation & Verification (US2)**: Wire `startEngine()` into all builder interaction handlers and `?fork=` / `?edit=` navigation, then verify with `apps/web/test/teams-deferred-start.test.tsx` and a full production build.
