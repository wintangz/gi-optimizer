# Implementation Plan: Relative Percentage Diffs for Core Flat Stats

**Branch**: `main` (`specs/stat-diff-percent`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Extend `CoreStatComparisonFormatted` and `formatCoreStatComparison` (`apps/web/src/components/OptimizeViews.tsx`)**:
   - Add optional `rawDiffText?: string | null` and `asciiRawDiffText?: string | null` to `CoreStatComparisonFormatted`.
   - For flat stats (`!isPct`), compute `currInt = Math.round(currentRaw)`, `buildInt = Math.round(safeBuild)`, and `diffInt = buildInt - currInt`.
   - Format the raw signed integer delta as `rawDiffText` / `asciiRawDiffText` (`0`, `+489`, `−60` / `-60`).
   - When `currInt <= 0` (e.g. `0` EM baseline), fall back to `diffText = rawDiffText` and `asciiDiffText = asciiRawDiffText`.
   - When `currInt > 0`, compute `pctDiff = (diffInt / currInt) * 100`. If `diffInt === 0`, return `diffText: '0.0%'`, `asciiDiffText: '0.0%'`, `sign: '0'`, `cls: 'muted'`, with `rawDiffText: '0'`. If `diffInt > 0`, return `diffText: '+${pctDiff.toFixed(1)}%'`, `asciiDiffText: '+${pctDiff.toFixed(1)}%'`, `sign: '+'`, `cls: 'ok'`, with `rawDiffText: '+${diffInt.toLocaleString()}'`. If `diffInt < 0`, return `diffText: '−${Math.abs(pctDiff).toFixed(1)}%'`, `asciiDiffText: '-${Math.abs(pctDiff).toFixed(1)}%'`, `sign: '-'`, `cls: 'error'`, with `rawDiffText: '−${Math.abs(diffInt).toLocaleString()}'`.
2. **Render Raw Delta Tooltip in `BuildStatComparisonSection` (`apps/web/src/components/OptimizeViews.tsx`)**:
   - On the Diff `<td>` (`data-testid="comp-stat-diff-..."`), pass `title={formatted.rawDiffText ?? undefined}`, `data-raw-diff={formatted.rawDiffText ?? undefined}`, and `data-raw-diff-ascii={formatted.asciiRawDiffText ?? undefined}`.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`pnpm --filter @gi/web test`)
- **Constraints**: Presentation-only; no changes to evaluation, totals, or stored data; golden fixtures remain byte-identical.
