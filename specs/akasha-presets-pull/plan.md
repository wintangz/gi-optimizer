# Implementation Plan: Akasha Leaderboard Presets Expansion (`akasha-presets-pull`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary
Author 22 new Akasha damage-rotation leaderboard presets in `packages/presets/data/akasha/<slug>.json` (expanding the Akasha preset library from 5 to 27 presets across 25 distinct target characters), record all 45 considered leaderboard cases and skip reasons in `specs/akasha-presets-pull/manifest.md`, capture a golden fixture per new preset in `packages/engine/test/golden/akasha__<slug>.json`, and commit one preset per commit (`feat: preset-<preset-id>`).

## Technical Context
- **Preset Data**: `packages/presets/data/akasha/*.json`
- **Registry & Names**: `packages/presets/src/registry.ts`, `packages/presets/src/names.ts`
- **Golden Fixtures**: `packages/engine/test/golden/akasha__*.json`
- **Verification**: `packages/presets/test/match.test.ts`, `packages/engine/test/preset-conditional-go-alignment.test.ts`, `packages/engine/test/golden.test.ts`, `packages/engine/test/akasha-isolation.test.ts`
- **Hard Constraints**: No changes to `packages/engine/src/**`; honest provenance (`authored-from-knowledge`) on all newly authored presets.
