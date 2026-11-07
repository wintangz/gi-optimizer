# Feature Specification: Current Build Naming (`current-build-naming`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Draft
**Input**: User description: "The current build is called three things across results: 'Current' (rank pill), 'Baseline' (delta chip), and 'Current Baseline' (weapon compare badge). Unify on one term — 'Current' — across all pills, chips, and badges, using tooltips to explain 'Your currently equipped build' where helpful."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unify Current Build Terminology on "Current" Across All Result Pills, Chips, and Badges (Priority: P1)

When viewing single-character build results, weapon comparison setup, or weapon comparison results, the user's currently equipped build/weapon must consistently be labeled `"Current"` (not `"Baseline"` or `"Current Baseline"`) across rank pills, delta chips, and weapon badges, with `"Your currently equipped build"` in the `title` tooltip.

**Why this priority**: Calling the same concept `"Current"` on the left of a build row, `"Baseline"` on the right of the same row, and `"Current Baseline"` in weapon comparison creates unnecessary cognitive friction.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonPanel`, `WeaponComparisonList`, and `BuildComparisonBars`, and assert that all current-build pills, delta chips, and weapon badges display `"Current"` with `title="Your currently equipped build"`, and never render `"Baseline"` or `"Current Baseline"`.

**Acceptance Scenarios**:

1. **Given** the pinned current build row in `BuildComparisonList`, **When** rendered, **Then** both `comp-rank-current` and `comp-delta-current` display `"Current"` and carry `title="Your currently equipped build"`.
2. **Given** an equipped weapon candidate in `WeaponComparisonPanel` (`isEquippedBaseline: true`), **When** rendered, **Then** `weapon-compare-config-baseline-${weaponKey}` displays `"Current"` and carries `title="Your currently equipped build"`.
3. **Given** an equipped weapon row (feasible or unmet) in `WeaponComparisonList` (`isEquippedBaseline: true`), **When** rendered, **Then** `weapon-compare-baseline-badge-${wKey}` displays `"Current"` and carries `title="Your currently equipped build"`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `BuildComparisonList`, the current build's rank pill (`comp-rank-current`) and delta chip (`comp-delta-current`) MUST both display `"Current"` and include `title="Your currently equipped build"`.
- **FR-002**: In `WeaponComparisonPanel` and `WeaponComparisonList`, `.comp-baseline-tag` badges (`weapon-compare-config-baseline-*` and `weapon-compare-baseline-badge-*`) MUST display `"Current"` (instead of `"Current Baseline"`) and include `title="Your currently equipped build"`.
- **FR-003**: In `BuildComparisonBars`, the current bar label MUST display `"Current"` with `title="Your currently equipped build"`.
- **FR-004**: Presentation only — no change to computed numbers, rankings, or stored data; all golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero result pills, delta chips, or weapon comparison badges render `"Baseline"` or `"Current Baseline"` as visible label text.
- **SC-002**: All current-build indicators consistently display `"Current"` with `title="Your currently equipped build"`.

## Assumptions

- Existing CSS class names (`.comp-baseline-tag`) and `data-testid` attributes (`weapon-compare-baseline-badge-*`, `weapon-compare-config-baseline-*`, `data-delta-sign="baseline"`) remain unchanged for backward compatibility with styling and test selectors.
