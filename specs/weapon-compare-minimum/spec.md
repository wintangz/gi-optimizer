# Feature Specification: Weapon Compare Minimum Candidates (`weapon-compare-minimum`)

**Feature Branch**: `weapon-compare-minimum`  
**Created**: 2026-11-08  
**Status**: Approved  
**Input**: User description: "The compare panel says \"Click two or more weapons\" but a comparison runs with a single candidate. Make copy and behaviour agree: running a comparison requires at least 2 candidates; below that the run button is disabled with the reason visible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Require at Least 2 Candidates to Run Weapon Comparison (Priority: P1)

In Weapon Comparison mode (`optimizeMode === 'compare'`), running a comparison must require at least 2 selected weapon candidates (`activeCompareCandidates.length >= 2`). When fewer than 2 candidates (`0` or `1`) are selected, `Compare Weapons` (`run-weapon-compare-btn`) is disabled, `startWeaponComparison` is a no-op, and the reason is visibly displayed to the user.

**Why this priority**: Comparing a single weapon against nothing contradicts the panel copy ("Click two or more weapons") and wastes a solver pass when the user hasn't picked a second weapon yet.

**Independent Test**: Switch `/optimize` to Compare Weapons mode when 1 weapon is seeded (or 0 selected), assert `run-weapon-compare-btn` is `disabled` with a visible reason stating that at least 2 weapons are required, then select a second weapon and assert `run-weapon-compare-btn` becomes enabled.

**Acceptance Scenarios**:

1. **Given** `optimizeMode === 'compare'` with `0` or `1` weapon candidate selected, **When** the Optimize page renders, **Then** `run-weapon-compare-btn` is `disabled`, `startWeaponComparison` does not invoke the worker, and a visible message explains that at least 2 weapons must be selected to run a comparison.
2. **Given** `optimizeMode === 'compare'` with `2` or more weapon candidates selected, **When** the Optimize page renders, **Then** `run-weapon-compare-btn` is enabled and clicking it runs the comparison across all selected candidates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `apps/web/src/app/optimize/page.tsx`, require `activeCompareCandidates.length >= 2` to enable `data-testid="run-weapon-compare-btn"` and in `startWeaponComparison()`.
- **FR-002**: When `activeCompareCandidates.length < 2` in Compare Weapons mode, display a visible reason in the UI (both in the Results card / idle banner and in `WeaponComparisonPanel` when fewer than 2 candidates are selected) explaining that at least 2 weapons must be selected to compare.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 0 or 1 weapon selected in Compare Weapons mode, `run-weapon-compare-btn` is disabled and a visible reason is rendered; with 2+ weapons selected, `run-weapon-compare-btn` is enabled.
