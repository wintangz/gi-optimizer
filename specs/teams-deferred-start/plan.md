# Implementation Plan: Deferred Engine Start on Custom Teams Page (`teams-deferred-start`)

**Branch**: `teams-deferred-start` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/teams-deferred-start/spec.md`

## Summary

Defer spawning the optimizer Web Worker, building the character target/conditional catalog, and evaluating the live rotation damage preview on `/teams` (`apps/web/src/app/teams/page.tsx`) until the user's first real builder interaction or when `/teams` is opened with `?fork=` or `?edit=` query parameters:
1. Introduce an explicit `engineStarted` state in `TeamsInner` (`apps/web/src/app/teams/page.tsx`), initialized to `Boolean(forkParam || editParam)` and gated around both the `getCatalogInWorker` effect and the debounced `evaluatePresetInWorker` effect so initial mount on `/teams` renders the page shell, saved-preset switcher, and builder form controls immediately with zero `Worker` instantiation.
2. Render a fallback `<option>` in each rotation row's `"GO Formula Target"` `<select>` before the worker catalog loads so the default target path (`skill.usherDmg`) displays cleanly in the deferred state, and render a `"Load Engine & Preview"` call-to-action button in the Live Rotation Preview card prior to `engineStarted`.
3. Activate the engine (`setEngineStarted(true)`) on the first real user interaction (picking/forking/importing a preset, changing the target character or a team member, focusing or editing conditionals or rotation targets, editing enemy overrides, or clicking `"Load Engine & Preview"`), covering the initialization and evaluation wait with the existing `<Spinner label="Loading optimizer engine…" />` and `<SkeletonBlock />` states.

## Technical Context

**Language/Version**: TypeScript 5 strict

**Primary Dependencies**: pnpm workspace, Next.js 16 App Router static export (`apps/web`, frontend only), React 19, Zod 4 (`@gi/presets`), IndexedDB via `idb`, GO engine via vendored source (`vendor/genshin-optimizer`)

**Storage**: Browser IndexedDB (`idb`) via `apps/web/src/lib/storage/db.ts` (`good`, `presets`, `settings` stores — unchanged)

**Testing**: Vitest (unit & component tests in `apps/web/test/`), Playwright for UI smoke tests

**Target Platform**: Modern browsers (static export, client-side + Web Worker execution)

**Project Type**: Monorepo web application (`apps/web` + `packages/good`, `packages/presets`, `packages/engine`)

**Performance Goals**: Zero Web Worker spawns, zero worker chunk downloads, and zero GO engine graph evaluations on initial `/teams` mount (when no `?fork=` / `?edit=` query params are present); immediate 60fps `<Spinner label="Loading optimizer engine…" />` and `<SkeletonBlock />` feedback upon first interaction

**Constraints**: Static export (`output: "export"`), no server code, no API routes, zero edits to `vendor/genshin-optimizer`, zero new npm dependencies

**Scale/Scope**: `apps/web/src/app/teams/page.tsx` and Vitest verification in `apps/web/test/teams-deferred-start.test.tsx`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client (NON-NEGOTIABLE)**: PASS — Strictly client-side state management in `apps/web/src/app/teams/page.tsx`; optimization and evaluation continue to run in the client-side Web Worker on demand.
- **II. GO Formula Fidelity (NON-NEGOTIABLE)**: PASS — Once activated, target/conditional catalogs and live rotation damage previews are computed by the exact same unmodified vendored GO engine (`getCatalogInWorker`, `evaluatePresetInWorker`).
- **III. Import Is GOOD Only**: PASS — Unchanged.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — Unchanged; preset load, fork, save, import, and export continue to use the shared `@gi/presets` contract.
- **V. Single-Character, Akasha-Style Objective**: PASS — Unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/teams-deferred-start/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── research.md          # Phase 0 root-cause analysis & interaction trigger decisions
├── data-model.md        # Phase 1 state machine & UI contract for deferred vs. active engine state
├── plan.md              # This implementation plan
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   └── teams/
│   │       └── page.tsx                 # Gated engineStarted state, interaction triggers, fallback target option, & Load Engine CTA
│   ├── components/
│   │   └── Loading.tsx                  # Existing shared Spinner ("Loading optimizer engine…") & SkeletonBlock (consumed)
│   └── lib/
│       └── engine/
│           └── workerClient.ts          # Existing getCatalogInWorker, evaluatePresetInWorker, isEngineSessionHydrated (consumed)
└── test/
    └── teams-deferred-start.test.tsx    # Tests verifying zero worker calls on initial mount and on-demand start on interaction / query params
```

**Structure Decision**: Existing monorepo layout (`apps/web`). Only `apps/web/src/app/teams/page.tsx` requires modification, paired with a dedicated test file `apps/web/test/teams-deferred-start.test.tsx`.

## Complexity Tracking

No Constitution violations. Zero new external dependencies.
