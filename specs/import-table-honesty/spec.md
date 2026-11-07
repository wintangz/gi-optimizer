# Feature Specification: Import Table Row Counter Honesty

**Feature Branch**: `main` (`specs/import-table-honesty`)
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Feature: import-table-honesty"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Honest Row Counters Matching Rendered Rows Across Import Tables (Priority: P1)

On the Import page (`/import`), the artifacts table caps rendered rows at 300 (`IMPORT_TABLE_ROW_CAP = 300`) for DOM performance, and the same cap applies to characters and weapons tables. Previously, when more than 300 artifacts matched the filter (e.g. 1,500 artifacts), only 300 rows were rendered while the counter claimed `"Showing 1500 of 1500"`. Now, whenever a table's filtered rows exceed 300, the counter explicitly states `"Showing first 300 of N — refine the filter to see more"` and the number in the counter always matches the exact number of `<tr>` rows on screen across all three tables (`characters`, `weapons`, `artifacts`).

**Independent Test**: Render `ImportPage` (or call `formatImportTableCount`) with > 300 items and <= 300 items across characters, weapons, and artifacts; verify that the rendered `<tbody>` row count matches the counter's shown count and that truncated tables display `"Showing first 300 of N — refine the filter to see more"`.

**Acceptance Scenarios**:

1. **Given** 450 filtered artifacts (or weapons/characters), **When** the table renders on `/import`, **Then** 300 rows are rendered on screen and the counter displays `"Showing first 300 of 450 — refine the filter to see more"`.
2. **Given** 120 filtered artifacts out of 450 total after applying a filter, **When** the table renders on `/import`, **Then** all 120 rows are rendered on screen and the counter displays `"Showing 120 of 450"`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Export `IMPORT_TABLE_ROW_CAP = 300` and `formatImportTableCount(shownCount: number, filteredCount: number, totalCount: number, cap?: number): string` from `apps/web/src/app/import/page.tsx`.
- **FR-002**: Apply the same cap and `formatImportTableCount` counter to the characters, weapons, and artifacts tables in `apps/web/src/app/import/page.tsx` so the counter always matches the exact number of rows rendered in `<tbody>`.
- **FR-003**: When `filteredCount > IMPORT_TABLE_ROW_CAP`, the counter MUST state `"Showing first 300 of ${filteredCount} — refine the filter to see more"`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rendered `<tbody>` row count equals the counter's reported shown count in all three tables (`characters`, `weapons`, `artifacts`).
- **SC-002**: Automated tests verify both truncated (> 300) and non-truncated (<= 300) states.
