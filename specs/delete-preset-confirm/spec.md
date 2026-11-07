# Feature Specification: Delete Preset Confirmation

**Feature Branch**: `main` (`specs/delete-preset-confirm`)
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Feature: delete-preset-confirm"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explicit Confirmation Before Deleting a User Preset (Priority: P1)

When a user clicks Delete on a custom user preset on either the Presets page (`/presets`) or the Custom Team & Preset Builder (`/teams`), the preset is not immediately deleted. Instead, an inline confirmation step (`Confirm Delete` / `Cancel`) is shown. The preset is only deleted (and on `/teams`, navigation to `/presets` only occurs) after the user clicks `Confirm Delete`. Clicking `Cancel` or switching presets dismisses the confirmation without deleting.

**Independent Test**: Render `PresetsPage` and `TeamsPage` with a saved user preset; click `Delete` / `Delete Preset`, assert `removeUserPreset` and `router.push` have not been called and confirmation controls appear; click `Cancel` to verify dismissal; click `Delete` then `Confirm Delete` and assert `removeUserPreset` (and `router.push('/presets')` on `/teams`) are called.

**Acceptance Scenarios**:

1. **Given** a selected user preset on `/presets`, **When** the user clicks `Delete`, **Then** `removeUserPreset` is not called and inline `Confirm Delete` and `Cancel` buttons appear.
2. **Given** the inline confirmation state on `/presets` or `/teams`, **When** the user clicks `Cancel`, **Then** the confirmation closes and the preset remains intact.
3. **Given** the inline confirmation state on `/teams`, **When** the user clicks `Confirm Delete`, **Then** `removeUserPreset(draft.id)` is awaited and only then does `router.push('/presets')` execute.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both `/presets` (`apps/web/src/app/presets/page.tsx`) and `/teams` (`apps/web/src/app/teams/page.tsx`) MUST require an explicit two-step confirmation before calling `removeUserPreset`.
- **FR-002**: On `/teams`, `router.push('/presets')` MUST only be called after a confirmed delete.
- **FR-003**: Switching to a different preset MUST not carry over an active delete confirmation state from the previous preset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Single-click on `Delete` / `Delete Preset` never deletes a preset or navigates away on either `/presets` or `/teams`.
- **SC-002**: Automated regression tests verify both the `/presets` and `/teams` confirmation and cancellation flows.
