# Implementation Plan: Akasha Presets (`akasha-presets`)

**Branch**: `akasha-presets` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Implement strict Akasha-style account matching (`packages/presets/src/match.ts`), preset validation (`packages/presets/src/validate.ts`), the bundled preset registry (`packages/presets/src/registry.ts`), bundled Akasha JSON presets (`packages/presets/data/akasha/*.json`), and the `/presets` browser page (`apps/web/src/app/presets/page.tsx`) showing badges, requirements, rotation breakdown, account match report, weapon candidate picker, and direct links to `/optimize` and `/teams`.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `zod`, `@genshin-optimizer/gi/consts` & `@genshin-optimizer/gi/stats`, React 19, Next.js 16
**Storage**: Bundled JSON (`packages/presets/data/akasha/*.json`) + IndexedDB (`presets` store for user presets)
**Testing**: Vitest (`packages/presets/test/*.test.ts`)
**Target Platform**: Browser client-side

## Constitution Check

- **I. Frontend-Only Client**: PASS — all preset loading and matching run client-side.
- **II. GO Formula Fidelity**: PASS — every bundled Akasha preset has a golden fixture verified against GO.
- **III. Import Is GOOD Only**: PASS — matcher reads parsed GOOD account data.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — uses `gi-optimizer/preset@1`; never silently substitutes missing units, constellations, or weapons.
- **V. Single-Character Objective**: PASS — single target character per preset.
