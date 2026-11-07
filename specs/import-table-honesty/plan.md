# Implementation Plan: Import Table Row Counter Honesty

**Branch**: `main` (`specs/import-table-honesty`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Shared Row Cap & Honest Counter Formatter (`apps/web/src/app/import/page.tsx`)**:
   - Export `IMPORT_TABLE_ROW_CAP = 300` and `formatImportTableCount(shownCount, filteredCount, totalCount, cap = IMPORT_TABLE_ROW_CAP)`.
   - Slice `filteredChars`, `filteredWeapons`, and `filteredArtifacts` to `IMPORT_TABLE_ROW_CAP` (`displayedChars`, `displayedWeapons`, `displayedArtifacts`).
   - Render `displayedChars`, `displayedWeapons`, and `displayedArtifacts` in their respective `<tbody>` elements and display `formatImportTableCount(...)` in each table's `.presets-count` span (`data-testid="import-characters-count"`, `data-testid="import-weapons-count"`, `data-testid="import-artifacts-count"`).

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`pnpm --filter @gi/web test`)
