# Tasks: Custom Team Enemy Edit (`custom-team-enemy-edit`)

**Input**: Design documents from `/specs/custom-team-enemy-edit/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Schema & Preset Enemy Override Canonicalization

- [x] T001 Canonicalize `${ele}_res_` keys to `${ele}_enemyRes_` in `parsePreset` in `packages/presets/src/schema.ts` and add unit test coverage in `packages/presets/test/schema.test.ts`

## Phase 2: Team Editor & Optimize Navigation Fixes

- [x] T002 Fix `draft` initialization and `editParam`/`forkParam` effect handling in `apps/web/src/app/teams/page.tsx` so reopening a saved custom team loads its saved enemy level and RES overrides and saving never resets `draft` when `userPresets` updates
- [x] T003 Use functional `setDraft((prev) => ...)` updates and add accessible `aria-label` / `data-testid` attributes on Enemy Level and per-element RES inputs in `apps/web/src/app/teams/page.tsx`
- [x] T004 Update the Setup card Customize link in `apps/web/src/app/optimize/page.tsx` to navigate to `/teams?edit=<id>` for custom user presets (`source === 'user'`) while keeping `/teams?fork=<id>` for bundled presets

## Phase 3: Regression Test & Full Verification

- [x] T005 Add regression test in `apps/web/test/teams-deferred-start.test.tsx` covering: create custom team with non-default enemy RES -> save -> reopen -> change RES -> save again -> reopen shows new value + engine evaluation with edited preset reflects new RES in rotation total
- [x] T006 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
