# Implementation Plan: Slim Data Pages (`slim-data-pages`)

**Branch**: `slim-data-pages` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/slim-data-pages/spec.md`

## Summary

Eliminate the ~308 kB First Load JS overhead on `/import` (563 kB baseline) and `/presets` (561 kB baseline) over `/` (255 kB baseline) so both data pages ship within ~60 kB of `/`:
1. **Deduplicate & compact `statMeta.gen.ts` and remove runtime `@genshin-optimizer/gi/consts` imports**: Update `packages/presets/scripts/generate-stat-meta.ts` to emit a single, compactly encoded `packages/good/src/statMeta.gen.ts` (~7–9 KB raw instead of 2 × 35.5 KB) that includes all character/weapon/artifact metadata and key constants (`ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, `charKeyToLocCharKey`). Delete `packages/presets/src/statMeta.gen.ts`, re-export from `@gi/good`, and consume from `@gi/presets` so neither package imports `@genshin-optimizer/gi/consts` (`85.8 KB` raw) at runtime.
2. **Replace runtime `zod` with a lightweight zero-dependency validator**: Rewrite `packages/presets/src/schema.ts` without `zod`, implementing `presetSchema.parse()` and `presetSchema.safeParse()` (plus exported sub-schemas) with identical validation rules, defaults, and issue paths/messages, eliminating `104.3 KB` raw of `zod` runtime chunks.
3. **Slim route imports on `/import` and `/presets`**: Mark `@gi/good` and `@gi/presets` as `"sideEffects": false`, make bundled preset parsing in `packages/presets/src/registry.ts` lazy so importing `@gi/presets` does not eagerly evaluate all 11 preset JSON files (`53.5 KB` raw), and scope imports in `apps/web/src/app/import/page.tsx`, `apps/web/src/app/presets/page.tsx`, `apps/web/src/lib/itemMeta.ts`, and `apps/web/src/lib/storage/useGood.ts` so `/import` only loads parser + display/badge helpers and `/presets` never loads `parseGood.ts`.

## Technical Context

**Language/Version**: TypeScript 5 strict

**Primary Dependencies**: pnpm workspace, Next.js 16 App Router static export (`apps/web`, frontend only), Vitest, Playwright for UI smoke, IndexedDB via `idb`, GO engine via vendored source (`vendor/genshin-optimizer`). No server, no API routes. (`zod` removed from `@gi/presets` runtime dependencies.)

**Storage**: Browser IndexedDB (`idb`) via `apps/web/src/lib/storage/db.ts` (`good`, `presets`, `settings` stores)

**Testing**: Vitest (unit & integration tests across `@gi/good`, `@gi/presets`, `@gi/engine`, and `@gi/web`), Playwright for UI smoke

**Target Platform**: Modern browsers (static export, client-side + Web Worker execution)

**Project Type**: Monorepo web application (`apps/web` + `packages/good`, `packages/presets`, `packages/engine`)

**Performance Goals**: Bring `/import` and `/presets` First Load JS within ~60 kB of `/` First Load JS (i.e. ≤ ~315 kB when `/` is ~255 kB, down from 563 kB / 561 kB in `bac8f21`)

**Constraints**: Static export (`output: "export"`), no server code, no API routes, zero edits to `vendor/genshin-optimizer`, zero runtime `@genshin-optimizer/gi/consts`, `@genshin-optimizer/gi/stats`, or `zod` imports in `@gi/good` or `@gi/presets`

**Scale/Scope**: `packages/good`, `packages/presets`, `packages/engine` (solver import alignment if needed), and `apps/web` (`/import`, `/presets`, `itemMeta.ts`, `useGood.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client (NON-NEGOTIABLE)**: PASS — Pure client-side bundle optimization; no server routes or server actions.
- **II. GO Formula Fidelity (NON-NEGOTIABLE)**: PASS — `packages/good/src/statMeta.gen.ts` is generated directly from vendored `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats` and verified for 100% parity in Vitest; `@gi/engine` continues to run the unmodified vendored GO formulas in the Web Worker.
- **III. Import Is GOOD Only**: PASS — `parseGood.ts` preserves all GOOD v1–v3 validation and plain-language diagnostics.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — `presetSchema` preserves the exact `gi-optimizer/preset@1` contract, default values, and validation diagnostics without runtime `zod`.
- **V. Single-Character, Akasha-Style Objective**: PASS — Unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/slim-data-pages/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── research.md          # Phase 0 bundle root-cause & technical decisions
├── data-model.md        # Phase 1 contracts for compact statMeta.gen.ts & custom presetSchema
├── plan.md              # This implementation plan
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
packages/good/
├── package.json                 # Adds "sideEffects": false
├── src/
│   ├── statMeta.gen.ts          # Single canonical compact metadata + GO key/slot/stat constants
│   ├── parseGood.ts             # Consumes constants & metadata from ./statMeta.gen (zero gi/consts imports)
│   └── index.ts                 # Re-exports ./statMeta.gen, ./types, ./suggest, ./parseGood
└── test/
    └── parseGood.test.ts        # Existing + parity/import-isolation assertions

packages/presets/
├── package.json                 # Adds "@gi/good": "workspace:*", "sideEffects": false; removes "zod"
├── scripts/
│   └── generate-stat-meta.ts    # Generates compact packages/good/src/statMeta.gen.ts only
├── src/
│   ├── statMeta.gen.ts          # DELETED (duplicate removed)
│   ├── schema.ts                # Zero-dependency custom validator (.parse / .safeParse) using @gi/good keys
│   ├── names.ts                 # Re-exports ALL_CHARACTER_KEYS, ALL_WEAPON_KEYS, ALL_ARTIFACT_SET_KEYS from @gi/good
│   ├── metadata.ts              # Imports CHAR_STAT_META, WEAPON_STAT_META, ART_SET_STAT_META from @gi/good
│   ├── validate.ts              # Imports getCharStatMeta, getWeaponStatMeta from @gi/good
│   ├── userPreset.ts            # Imports CHAR_STAT_META from @gi/good
│   ├── registry.ts              # Lazily parses BUNDLED_PRESETS on first access (tree-shakeable)
│   └── index.ts                 # Re-exports schema, names, metadata, settings, match, validate, registry, userPreset
└── test/
    ├── schema.test.ts           # Expanded tests for custom validator edge cases & issue formatting
    └── metadata.test.ts         # Verifies 100% parity of @gi/good statMeta & constants vs @genshin-optimizer/gi/{consts,stats}

apps/web/
└── src/
    ├── app/
    │   ├── import/
    │   │   └── page.tsx         # Slim imports (no registry/preset JSONs pulled into /import)
    │   └── presets/
    │       └── page.tsx         # Slim imports (no parseGood pulled into /presets)
    └── lib/
        ├── itemMeta.ts          # Direct metadata re-exports
        └── storage/
            └── useGood.ts       # Pure settings import
```

**Structure Decision**: Existing monorepo layout (`packages/good` → `packages/presets` → `apps/web`). `@gi/good` is the foundational leaf package holding the single canonical `statMeta.gen.ts` and key constants; `@gi/presets` depends on `@gi/good` and has zero external npm runtime dependencies.

## Complexity Tracking

No Constitution violations. Removes `zod` (`104.3 KB` raw) and `@genshin-optimizer/gi/consts` (`85.8 KB` raw) from client bundles while adding zero new dependencies.
