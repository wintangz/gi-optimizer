# Implementation Plan: Official Presets (`official-presets`)

**Branch**: `official-presets` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Author 6 bundled Official meta team presets in `packages/presets/data/official/*.json`, register them in `@gi/presets`, verify their schema and GO display paths in `packages/presets/test/official.test.ts`, and verify their damage output against GO golden fixtures in `packages/engine/test/golden.test.ts`.

## Technical Context

**Language/Version**: TypeScript 5 (strict), JSON
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@genshin-optimizer/gi/*`
**Testing**: Vitest (`packages/presets/test/official.test.ts`, `packages/engine/test/golden.test.ts`)

## Constitution Check

- **I. Frontend-Only Client**: PASS — static JSON bundled client-side.
- **II. GO Formula Fidelity**: PASS — every official preset is verified against GO golden fixtures.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — uses the exact same `gi-optimizer/preset@1` schema as Akasha presets; differs only in `source: "official"`, `author: "gi-optimizer"`, and unconstrained weapon/constellation requirements.

