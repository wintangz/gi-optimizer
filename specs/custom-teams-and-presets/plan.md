# Implementation Plan: Custom Teams and Presets (`custom-teams-and-presets`)

**Branch**: `custom-teams-and-presets` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Implement user preset creation, forking, JSON import/export, and default TC build helpers in `packages/presets/src/userPreset.ts`, and implement the `/teams` custom team and preset builder page in `apps/web/src/app/teams/page.tsx` with live GO damage preview, GO target/conditional catalog integration, and IndexedDB persistence.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `idb`, React 19, Next.js 16
**Storage**: Browser IndexedDB (`presets` store) + JSON file import/export
**Testing**: Vitest (`packages/presets/test/userPreset.test.ts`)

## Constitution Check

- **I. Frontend-Only Client**: PASS — all preset editing and persistence happen in the browser.
- **II. GO Formula Fidelity**: PASS — live preview and target/conditional catalogs come directly from `@gi/engine` (GO source).
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — user presets use the exact `gi-optimizer/preset@1` schema with `source: "user"`, make no damage claim, and carry the `"Custom — use at your own risk"` badge with no verification badge.
- **V. Single-Character Objective**: PASS — rotation targets `team[0]` only; ER is never added to the objective.

