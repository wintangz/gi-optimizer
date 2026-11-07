# Implementation Plan: Artifact Roll Value Tooling (`artifact-quality-tooling`)

**Branch**: `artifact-quality-tooling` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

1. Create `packages/good/src/rv.ts` with GO's exact `ART_SUBSTAT_ROLL_TABLE` (from `vendor/genshin-optimizer/libs/gi/stats/Data/Artifacts/artifact_sub.json`), `ART_SUBSTAT_ROLL_DATA`, `getSubstatMaxRoll`, `getSubstatRolls`, and `computeArtifactRollValue`, and export it from `@gi/good`, `@gi/presets`, and `@gi/engine`.
2. Add `ArtifactRvBadge` and per-substat roll breakdown tooltip/detail support to `StatChip` and `ArtifactPieceRow` in `apps/web/src/components/Identifier.tsx`.
3. Surface `ArtifactRvBadge` and per-substat roll breakdowns in the Artifacts inventory table in `apps/web/src/app/import/page.tsx`.
4. Add unit tests for `computeArtifactRollValue` and UI rendering in `apps/web/test/Identifier.test.tsx` and `apps/web/test/OptimizeViews.test.tsx`.

## Technical Context

- **Language/Version**: TypeScript 5.8, React 19, Next.js 16 (`output: 'export'`)
- **Testing**: Vitest (`pnpm test`)
- **Constraints**: Single shared RV implementation in `@gi/good`; display only (no change to evaluation or optimization).

## Project Structure

```text
packages/good/
└── src/
    ├── index.ts
    └── rv.ts
packages/presets/
└── src/
    └── index.ts
packages/engine/
└── src/
    └── index.ts
apps/web/
├── src/
│   ├── app/
│   │   └── import/page.tsx
│   └── components/
│       └── Identifier.tsx
└── test/
    ├── Identifier.test.tsx
    └── OptimizeViews.test.tsx
```
