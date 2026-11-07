# Implementation Plan: GO-Style Formula & Stat Breakdown (`formula-breakdown`)

**Branch**: `formula-breakdown` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

1. Tag `effectiveResonanceData` in `packages/engine/src/teamData.ts` with `inferInfoMut(effectiveResonanceData, 'Resonance' as never)` so elemental resonance nodes carry `info.source = 'Resonance'`.
2. Create `packages/engine/src/breakdown.ts` to extract `DamageRowBreakdown` (base damage components, DMG% contributors, crit multiplier, amplifying reaction multiplier, enemy DEF & RES multipliers grouped by source `character | weapon | artifactSet | teamBuff | resonance | enemy`) and `StatBreakdown` (base value + percentage/flat contributors with source) directly from the `UIData` calculation graph in `session.evaluate()`.
3. Update `packages/engine/src/types.ts`, `packages/engine/src/session.ts`, and `packages/engine/src/index.ts` to attach `breakdown` to each `InstanceResult` and `statBreakdowns` to `RotationResult` (keeping `golden.test.ts` byte-identical by only comparing the golden schema fields or keeping breakdown non-breaking).
4. Update `BuildStatComparisonSection`, `BuildComparisonList`, and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx` so users can expand any rotation damage row and any core final stat row into its breakdown.
5. Add acceptance tests in `packages/engine/test/breakdown.test.ts` and UI tests in `apps/web/test/OptimizeViews.test.tsx`.

## Technical Context

- **Language/Version**: TypeScript 5.8, React 19, Next.js 16 (`output: 'export'`)
- **Dependencies**: `@genshin-optimizer/gi/wr`, `@genshin-optimizer/gi/uidata`, `@genshin-optimizer/gi/keymap`, `@gi/presets`
- **Testing**: Vitest (`pnpm test`)
- **Constraints**: Source all breakdown numbers from the live GO `UIData` calc graph; preserve byte-identical golden fixtures and single-target optimizer behavior.

## Project Structure

```text
packages/engine/
├── src/
│   ├── breakdown.ts
│   ├── index.ts
│   ├── session.ts
│   ├── teamData.ts
│   └── types.ts
└── test/
    └── breakdown.test.ts

apps/web/
├── src/
│   ├── app/
│   │   └── globals.css
│   └── components/
│       └── OptimizeViews.tsx
└── test/
    └── OptimizeViews.test.tsx
```
