# Feature Specification: Artifact Set Filter Click Semantics

**Feature Branch**: `main` (`specs/set-filter-click-semantics`)
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Feature: set-filter-click-semantics"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interacting with Sets Never Silently Flips Filter Mode (Priority: P1)

In the Artifact Set Filter (`ArtifactSetFilter`), clicking a set tile, changing its piece count (`Both` / `2pc` / `4pc`), or using the bulk selection buttons (`Select all`, `Clear`, `Invert`) while the mode is `"All sets"` (`all`) must never silently flip `setFilterMode` to `"Exclude selected"` (`exclude`). `setFilterMode` only changes when the user explicitly clicks one of the mode selector buttons (`All sets`, `Exclude selected`, `Only these sets`).

**Independent Test**: Render `ArtifactSetFilter` with `setFilterMode: 'all'`, click a set tile, change its piece count, and click `Select all` / `Invert`; assert that `onChange` is called with `setFilterMode: 'all'` every time and the clicked set is selected for piece-count configuration.

**Acceptance Scenarios**:

1. **Given** `setFilterMode: 'all'`, **When** the user clicks a set tile (e.g. `GoldenTroupe`), **Then** `setFilterMode` remains `'all'`, `setFilterSelection.GoldenTroupe` becomes `[2, 4]`, and the piece-count controls (`Both`, `2pc`, `4pc`) appear for that set.
2. **Given** `setFilterMode: 'all'` with `GoldenTroupe` selected, **When** the user clicks `4pc` on `GoldenTroupe`, **Then** `setFilterMode` remains `'all'` and `setFilterSelection.GoldenTroupe` becomes `[4]`.
3. **Given** `setFilterMode: 'all'` with 1 or more sets selected, **When** the summary text is rendered, **Then** it plainly states that all sets are allowed in `"All sets"` mode and how many sets are currently selected (`All N artifact sets allowed (M selected — choose Exclude selected or Only these sets to apply)`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `handleToggleSet`, `handlePieceChange`, `handleSelectAll`, `handleClear`, and `handleInvert` in `apps/web/src/components/ArtifactSetFilter.tsx` MUST preserve the current `mode` and MUST NOT coerce `'all'` to `'exclude'`.
- **FR-002**: Only `handleModeChange` (triggered by the explicit mode buttons) may change `setFilterMode`.
- **FR-003**: `summarizeArtSetFilter` in `packages/presets/src/settings.ts` MUST state plainly what the current selection does when `mode === 'all'` and `selectedCount > 0` (`All ${totalSets} artifact sets allowed (${selectedCount} selected — choose Exclude selected or Only these sets to apply)`), while keeping `All ${totalSets} artifact sets allowed` when `selectedCount === 0`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking a set tile or piece-count button in `"All sets"` mode never mutates `setFilterMode`.
- **SC-002**: Unit tests in `apps/web/test/ArtifactSetFilter.test.tsx` and `packages/presets/test/settings.test.ts` pass.
