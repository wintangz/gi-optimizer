# Feature Specification: Single Artifact Level Range Control & Draft-Text Numeric Editing (`single-level-range-control`)

**Feature Branch**: `single-level-range-control`  
**Created**: 2026-11-08  
**Status**: Approved  
**Input**: User description: "The Artifact Level Range (levelLow/levelHigh) is editable in two places on the optimize page — the Setup grid and Solver Pool Filters — both writing the same setting. Keep exactly one control (in Solver Pool Filters) and remove the other. Additionally, every numeric settings input outside the Constraints card (level range, weapon level/refinement in the compare panel, and any other found) must use the same draft-text editing pattern the Constraints card already uses: no clamping or snapping while typing; values commit and clamp on blur, and the field can be cleared while editing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Artifact Level Range Control in Solver Pool Filters (Priority: P1)

On the Optimize page (`/optimize`), `levelLow` and `levelHigh` must only be editable in `SolverPoolFiltersPanel` (`pool-filter-level-low` and `pool-filter-level-high`), removing the duplicate `Artifact Level Range (Min / Max)` inputs from the Setup grid.

**Why this priority**: Having two identical level range controls in the same Artifact Settings card is redundant and confusing.

**Independent Test**: Render `/optimize` and verify `pool-filter-level-low` / `pool-filter-level-high` are present in `SolverPoolFiltersPanel` while no duplicate `Artifact Level Min` / `Artifact Level Max` inputs exist in the Setup grid.

**Acceptance Scenarios**:

1. **Given** the Optimize page (`/optimize`), **When** the Artifact Settings section renders, **Then** there is exactly one pair of Artifact Level Range inputs (`pool-filter-level-low` and `pool-filter-level-high` inside `SolverPoolFiltersPanel`).

---

### User Story 2 - Draft-Text Numeric Editing Without Keystroke Clamping or Snapping (Priority: P1)

Every numeric settings input outside `ConstraintsCard` (`pool-filter-level-low`, `pool-filter-level-high`, and `pool-filter-min-rv` in `SolverPoolFiltersPanel`, and `weapon-compare-level-<weaponKey>` in `WeaponComparisonPanel`) must hold raw draft text while focused so the user can clear the field or type multi-digit numbers without immediate clamping or snapping on keystroke, committing and clamping only on blur.

**Why this priority**: Clamping on `onChange` snaps cleared inputs to `0` or `1` mid-edit and prevents natural typing of multi-digit values.

**Independent Test**: Focus each numeric input (`pool-filter-level-low`, `pool-filter-level-high`, `pool-filter-min-rv`, `weapon-compare-level-*`), clear it to `""`, type intermediate/out-of-range values, verify raw text is preserved without snapping while focused, and verify blur clamps and commits the value.

**Acceptance Scenarios**:

1. **Given** `SolverPoolFiltersPanel`, **When** the user focuses `pool-filter-level-low`, `pool-filter-level-high`, or `pool-filter-min-rv`, clears it to `""` or types an intermediate/out-of-range string, **Then** the input displays the raw string while focused and only clamps + commits to `settings` on `onBlur`.
2. **Given** `WeaponComparisonPanel`, **When** the user focuses `weapon-compare-level-<weaponKey>`, clears it to `""` or types `"8"` on the way to `"80"` (or `"120"`), **Then** the input displays the raw string while focused without snapping to `1`, and clamps to `[1, maxLvl]` and commits on `onBlur`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Remove the duplicate `Artifact Level Range (Min / Max)` control (`aria-label="Artifact Level Min"` and `aria-label="Artifact Level Max"`) from the Setup grid in `apps/web/src/app/optimize/page.tsx`, keeping only the level range control in `SolverPoolFiltersPanel`.
- **FR-002**: Update `pool-filter-level-low`, `pool-filter-level-high`, and `pool-filter-min-rv` in `SolverPoolFiltersPanel` (`apps/web/src/components/OptimizeViews.tsx`) to use draft-text editing (`type="text"`, `draftValues` map, no clamping/snapping on `onChange`, allow clearing to `""` while focused, commit and clamp on `onBlur`).
- **FR-003**: Update `weapon-compare-level-${cand.weaponKey}` in `WeaponComparisonPanel` (`apps/web/src/components/OptimizeViews.tsx`) to use draft-text editing (`type="text"`, `draftLevels` map, no clamping/snapping on `onChange`, allow clearing to `""` while focused, commit and clamp to `[1, maxLvl]` on `onBlur`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Only one Artifact Level Range control exists on `/optimize` (in `SolverPoolFiltersPanel`).
- **SC-002**: All numeric settings inputs outside `ConstraintsCard` preserve raw draft text (including empty string `""`) while focused and commit + clamp on blur.
