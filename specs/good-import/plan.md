# Implementation Plan: GOOD Import (`good-import`)

**Branch**: `good-import` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the `@gi/good` package (`packages/good`) for parsing, validating, and normalizing scanner GOOD exports with plain-language error messages, JSON paths, and near-match suggestions, plus the IndexedDB persistence layer (`apps/web/src/lib/storage/db.ts`) and the `/import` page (`apps/web/src/app/import/page.tsx`) with file picker, drag-and-drop, paste box, parse report, replace/clear confirmations, and filterable character/weapon/artifact tables.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@genshin-optimizer/gi/consts` & `@genshin-optimizer/gi/stats` (via `tooling/go-paths.mjs`), `idb` (IndexedDB), React 19, Next.js 16 (static export)
**Storage**: Browser IndexedDB (`gi-optimizer` database: `good`, `presets`, `settings` stores)
**Testing**: Vitest (`packages/good/test/*.test.ts`, `apps/web` storage tests)
**Target Platform**: Browser client-side only (Next.js `output: "export"`)
**Project Type**: Monorepo package (`packages/good`) + web route (`apps/web/src/app/import`)
**Performance Goals**: Parse 2,000-artifact GOOD file in <2 s; filter 1,157-artifact table in <200 ms
**Constraints**: Max 20 MB file size; GOOD format only (reject Enka/UID showcase JSON with a clear explanation)

## Constitution Check

- **I. Frontend-Only Client**: PASS — all parsing and storage run in the browser; IndexedDB stores data locally.
- **II. GO Formula Fidelity**: PASS — uses GO's canonical key lists and stat tables so accepted items match GO's `ArtCharDatabase.importGOOD`.
- **III. Import Is GOOD Only**: PASS — rejects Enka/showcase and non-GOOD JSON explicitly; reports every issue with path and reason.
- **IV. Presets Are Plain JSON**: PASS — provides the `presets` IndexedDB store for user presets.
- **V. Single-Character Objective**: N/A (import layer).

## Project Structure

```text
packages/good/
├── package.json
├── tsconfig.json
├── vitest.config.mts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── suggest.ts
│   └── parseGood.ts
└── test/
    └── parseGood.test.ts

apps/web/src/
├── lib/storage/
│   ├── db.ts
│   └── useGood.ts
└── app/import/
    └── page.tsx
```

