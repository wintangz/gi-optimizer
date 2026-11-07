# Feature Specification: Collapsible Panels (`collapsible-panels`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Implemented

## Overview

Reduce visual clutter and unnecessary vertical scrolling across the Optimize page, Custom Teams editor, and Presets library by collapsing unrestricted or full-roster panels by default and removing redundant in-card expansion:
1. **`SolverPoolFiltersPanel` Collapsibility**: Make `SolverPoolFiltersPanel` collapsible, collapsed by default when unrestricted (`summary.isUnrestricted === true`), with the header and summary line (`data-testid="solver-pool-filters-summary"`) always visible, and persist the user's expanded/collapsed toggle state per session.
2. **Teams Editor Full-Roster Character Grids (`add-teammate`, `change-target`)**: Collapse the two full-roster `CharacterTilePicker` grids on `/teams` behind their Add/Change controls (`data-testid="toggle-add-teammate-picker-btn"` and `data-testid="toggle-change-target-btn"`), opening on demand.
3. **Preset Card Selection Only**: Clicking a preset card in `/presets` selects it without expanding an in-card duplicate of its description and rotation breakdown.

## User Scenarios & Testing

### User Story 1 — Collapsible Solver Pool Filters with Session Persistence (Priority: P1)
As a user visiting the Optimize page with default (unrestricted) pool filters, I want the Artifact Pool Filters panel to start collapsed with its `"All pieces allowed"` summary visible so Buffs, Constraints, and the Optimize button are not pushed a screenful down, and I want my expanded/collapsed choice remembered during my session.

**Independent Test**: Render `SolverPoolFiltersPanel` with unrestricted settings; assert the summary line is visible, the toggle button has `aria-expanded="false"`, and the filter controls body is hidden. Click the toggle button; assert the body expands (`aria-expanded="true"`) and re-mounting within the same session keeps it expanded.

### User Story 2 — Teams Editor Character Grids Open on Demand (Priority: P1)
As a user editing a custom team on `/teams`, I want the full-roster character grids for adding a teammate and changing the target character to stay collapsed behind their Add/Change controls until I open them.

**Independent Test**: Render `/teams`; assert neither the `"Teammate character"` nor the `"Target character"` `CharacterTilePicker` grid is rendered initially, and clicking the respective toggle control opens each grid on demand.

### User Story 3 — Preset Card Click Selects Only (Priority: P1)
As a user browsing presets on `/presets`, I want clicking a preset card to select it for the detail panel without expanding a duplicate description and rotation list inside the card itself.

**Independent Test**: Render `/presets`, click a preset card, and assert it becomes selected (`preset-card-selected`) while no `.preset-card-expanded-desc` section is rendered.

## Functional Requirements

- **FR-001**: `SolverPoolFiltersPanel` MUST render a header toggle (`data-testid="solver-pool-filters-toggle"`, `aria-expanded`) and always keep `data-testid="solver-pool-filters-summary"` visible. When `summary.isUnrestricted` is `true` and no session toggle has occurred, it MUST default to collapsed (`false`); when restricted (`!summary.isUnrestricted`), it MUST default to expanded (`true`) unless explicitly collapsed in the current session. Toggling MUST persist in session storage (`gi:solver-pool-filters-expanded`) and in-memory session state.
- **FR-002**: In `apps/web/src/app/teams/page.tsx`, the `"Teammate character"` and `"Target character"` `CharacterTilePicker` grids MUST be collapsed by default behind toggle controls (`data-testid="toggle-add-teammate-picker-btn"` and `data-testid="toggle-change-target-btn"`) and open on demand.
- **FR-003**: In `apps/web/src/app/presets/page.tsx`, clicking a `.preset-card` MUST only select the preset (`setSelectedPresetId(p.id)`); the in-card expansion (`.preset-card-expanded-desc`) MUST be removed.
- **FR-004**: Wording and layout only; no changes to solver evaluation, rankings, or stored data.
