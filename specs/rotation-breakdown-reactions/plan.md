# Implementation Plan: Rotation Breakdown Reactions & Hit Mode (`rotation-breakdown-reactions`)

**Branch**: `rotation-breakdown-reactions` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Surface each rotation target's structured `reaction` and `hitMode` fields wherever a rotation breakdown or preset rotation summary is rendered:
1. Add shared `RotationReactionBadge` and `RotationHitModeBadge` components in `apps/web/src/components/Identifier.tsx` (and export `REACTION_ELEMENT_MAP` and `formatHitModeLabel`).
2. Add a `PresetRotationSummary` component in `apps/web/src/components/OptimizeViews.tsx` and render it in the `/optimize` setup card so users can see the preset's rotation targets, reactions, and hit modes at a glance.
3. Update the per-instance rotation breakdown tables in `BuildComparisonList` (both `Current` and `#1..#N` builds) and `WeaponComparisonList` (`apps/web/src/components/OptimizeViews.tsx`), the preset rotation table in `apps/web/src/app/presets/page.tsx`, and the live rotation preview table in `apps/web/src/app/teams/page.tsx` to display `RotationReactionBadge` (reacting element chip or muted `"No reaction"` marker) and `RotationHitModeBadge` for every row.

## Technical Context

- **Language/Version**: TypeScript 5.8, React 19, Next.js 16 (`output: 'export'`)
- **Testing**: Vitest (`pnpm test`)
- **Constraints**: Presentation only; read `preset.rotation.targets[idx].reaction` and `.hitMode` directly (never parse `label`); no changes to engine calculations or golden fixtures.

## Project Structure

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── optimize/page.tsx
│   │   ├── presets/page.tsx
│   │   └── teams/page.tsx
│   └── components/
│       ├── Identifier.tsx
│       └── OptimizeViews.tsx
└── test/
    └── OptimizeViews.test.tsx
```
