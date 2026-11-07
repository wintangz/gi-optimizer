# Implementation Plan: Build Details Deduplication & Row Expand Affordance

**Branch**: `main` (`specs/build-details-dedupe`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Deduplicate Rotation Row Labels (`formatRotationRowLabel`)**:
   - Export `formatRotationRowLabel(label: string): string` from `apps/web/src/components/OptimizeViews.tsx`.
   - Match a trailing parenthetical `\s*\(([^()]+)\)\s*$`. Strip it if its inner text matches a combination of reaction names (`Melt`, `Vaporize`, `Spread`, `Aggravate`, `Overloaded`, `Electro-Charged`, `Superconduct`, `Swirl`, `Shattered`, `Crystallize`, `Burgeon`, `Hyperbloom`, `Lunar-Charged`, `Lunar-Bloom`, `Lunar-Crystallize`, `No Reaction`, `No-Reaction`, `Raw`, `Unreacted`) and/or hit-count expressions (`[×x]\s*\d+`, `\d+\s*[×x]\s*\d+`, `\d+\s*hits?`).
   - Apply `formatRotationRowLabel` when rendering rotation row labels in `PresetRotationSummary`, `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList`.
2. **Unify Row Expand Affordance (`.comp-row-chevron`)**:
   - Remove `<button className="comp-inline-breakdown-btn">` from `BuildStatComparisonSection` and from damage tables in `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList`.
   - Render a plain `<span className={`comp-row-chevron${isExpanded ? ' is-expanded' : ''}`} data-testid={...} aria-hidden="true">▸</span>` inside `.comp-stat-label-cell`, and put `aria-expanded={isExpanded}` on the clickable `<tr>`.
   - Style `.comp-row-chevron` in `apps/web/src/app/globals.css` with a smooth rotation transform when `.is-expanded` is present, with no button/border/background box.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`pnpm --filter @gi/web test`)
- **Constraints**: Presentation-only; preset JSON files and golden fixtures untouched.
