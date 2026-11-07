# Feature Specification: Reset File Input Value After Pick (`import-file-repick`)

**Feature Branch**: `import-file-repick`  
**Created**: 2026-11-08  
**Status**: Approved  
**Input**: User description: "Picking the same file again in the GOOD import file picker does not fire a change event because the file input value is not reset after each pick, so re-importing an edited export under the same filename silently does nothing. Reset the input value after each pick so the same file can always be re-selected."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Re-select the Same File in File Pickers (Priority: P1)

When a user selects a file via the GOOD import file input (or custom presets import file input), edits that file on disk under the same filename, and selects the same file again in the file picker, the browser must fire the `change` event and process the newly selected file instead of silently ignoring it.

**Why this priority**: Browser `<input type="file">` elements only fire `change` when their `value` string changes. Leaving `e.target.value` populated after handling a pick prevents re-picking the same file path.

**Independent Test**: Simulate selecting a file on the `<input type="file">` element on `/import` (and `/teams`), verify `e.target.value` is reset to `''`, and verify a second selection of the same file is processed.

**Acceptance Scenarios**:

1. **Given** the GOOD import page (`/import`), **When** the user selects a JSON file in the file input, **Then** the file input's `value` is immediately reset to `''` so selecting the same file again fires `onChange` and re-runs the import.
2. **Given** the Teams editor page (`/teams`), **When** the user selects a preset JSON file in the import file input, **Then** the file input's `value` is immediately reset to `''` so selecting the same file again fires `onChange`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `apps/web/src/app/import/page.tsx` (`handleFileChange`), capture `const file = e.target.files?.[0]` and reset `e.target.value = ''` on every invocation so the same file can be re-selected.
- **FR-002**: In `apps/web/src/app/teams/page.tsx` (`handleImportFile`), capture `const file = e.target.files?.[0]` and reset `e.target.value = ''` on every invocation so the same file can be re-selected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Picking a file in `/import` (and `/teams`) resets `e.target.value` to `''` even before async `file.text()` completes or if `file.text()` fails, allowing immediate re-selection of the same file.
