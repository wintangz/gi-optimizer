# Implementation Plan: Custom Team Enemy Edit (`custom-team-enemy-edit`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Fix the broken links in the custom team enemy edit/save/reopen/evaluate chain so that enemy level and per-element RES overrides on custom teams load accurately when reopened, persist in place when edited and saved, and flow into `session.evaluate` and `session.optimize`.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router, static export)  
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*` (vendored submodule, read-only)  
**Storage**: IndexedDB (`gi-optimizer-db` -> `presets` object store) via `useUserPresets`  
**Testing**: Vitest  
**Target Platform**: Web (Static Export)

## Root Cause Analysis Across the Chain

1. **Editor query-param effect clobbers saved drafts (`apps/web/src/app/teams/page.tsx`)**:
   - `useEffect` depended on `[editParam, forkParam, userPresets]`. Whenever `saveUserPreset` ran, `useUserPresets` refreshed `userPresets`, re-triggering the effect.
   - When the user arrived via `/teams?fork=<id>` (the entry point from `/presets` "Fork" and `/optimize` "Customize"), saving their new custom team immediately re-ran `if (forkParam)` and replaced `draft` with a fresh `forkPresetToUser(src)` (resetting `enemy.level` to `100`, `enemy.overrides` to `{}`, and generating a new random ID).
   - Similarly, if the user opened a saved custom preset from the `"Load or Fork Existing Preset"` dropdown while `?edit=` or `?fork=` was in the URL and saved it, the effect re-applied the stale URL param and clobbered `draft`.
   - Furthermore, `useState` initialized `draft` to a blank preset on initial render even when `editParam` or `forkParam` could be resolved immediately from `userPresets` / `getBundledPreset`.
2. **Optimize page "Customize" link always forked (`apps/web/src/app/optimize/page.tsx`)**:
   - When `activePreset.source === 'user'`, the "Customize" button linked to `/teams?fork=${encodeURIComponent(activePreset.id)}` instead of `/teams?edit=${encodeURIComponent(activePreset.id)}`, creating a duplicate copy instead of reopening the custom team for editing.
3. **Enemy override key canonicalization (`packages/presets/src/schema.ts`)**:
   - While `packages/engine/src/session.ts` normalized `${ele}_res_` to `${ele}_enemyRes_`, `parsePreset` in `packages/presets/src/schema.ts` left `${ele}_res_` keys as-is, which `apps/web/src/app/teams/page.tsx` did not display under `ELEMENT_RES_KEYS` (`${ele}_enemyRes_`).
4. **Functional state updates & input testability (`apps/web/src/app/teams/page.tsx`)**:
   - Enemy level and per-element RES `onChange` handlers used non-functional `setDraft({ ...draft, ... })` instead of `setDraft((prev) => ({ ...prev, ... }))`, and lacked distinct `aria-label` / `data-testid` attributes per element.

## Planned Changes

1. **`packages/presets/src/schema.ts`**:
   - Normalize `${ele}_res_` keys in `enemy.overrides` to `${ele}_enemyRes_` during `parsePreset` so all parsed presets use canonical `*_enemyRes_` keys matching `ELEMENT_RES_KEYS` and GO's `enemyOverride`.
2. **`apps/web/src/app/teams/page.tsx`**:
   - Resolve `editParam` / `forkParam` in the `useState` initializer when available, and track the applied URL query param key in a ref so `useEffect` only applies a given `?edit=` or `?fork=` param once when it becomes available, never clobbering `draft` when `userPresets` updates after `saveUserPreset` or after selecting a preset from the dropdown.
   - Update Enemy Level and per-element RES inputs to use functional `setDraft((prev) => ...)` updates and add clear `aria-label` and `data-testid` attributes (`data-testid="enemy-level-input"`, `data-testid={`enemy-res-input-${rk}`}`).
3. **`apps/web/src/app/optimize/page.tsx`**:
   - Link the Setup card's Customize button to `/teams?edit=${encodeURIComponent(activePreset.id)}` when `activePreset.source === 'user'`, while preserving `/teams?fork=${encodeURIComponent(activePreset.id)}` for bundled presets (`akasha` and `official`).
4. **Regression Tests (`apps/web/test/teams-deferred-start.test.tsx`)**:
   - Add an end-to-end regression test that creates a custom team with a non-default enemy RES, saves, reopens the saved custom team, verifies the editor displays the saved enemy level and RES, changes the RES, saves again, reopens, and verifies both the reopened editor input value and a real `createSession(good).evaluate(editedPreset)` total reflecting the new enemy RES.
