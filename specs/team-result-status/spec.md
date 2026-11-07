# Feature Specification: Team Result Status (`team-result-status`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Draft
**Input**: User description: "In team-wide results every non-skipped member gets a "best" rank pill and green ok styling regardless of outcome, even when that member ended worse than Current. Member status styling must follow the member's actual result: the "best"/positive treatment only when earned, and neutral/negative treatment matching the member's delta sign."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Member Status Styling Follows Actual Outcome in Team-Wide Results (Priority: P1)

In team-wide optimization (`TeamOptimizationList`), a member may sacrifice personal damage (`subtotal < currentSubtotal`) so that a teammate gains a larger team-wide upgrade, or may remain unchanged (`subtotal === currentSubtotal`). Previously, every non-skipped member row unconditionally received `<span className="comp-rank-pill is-best">` and `<strong className="comp-row-total ok">`. Now, each member's status styling (and the overall team summary banner) must reflect its actual delta sign: positive/best styling only when `sign === '+'`, and neutral/muted styling when `sign === '0'` or `sign === '-'`.

**Why this priority**: Showing green "best" styling on a member whose personal subtotal dropped by `−8.0%` misleads the user into thinking every member personally improved.

**Independent Test**: Render `TeamOptimizationList` with three non-skipped members (`+` improved, `0` unchanged, `-` decreased) and verify that only the improved member receives `is-best` / `comp-rank-best` / `ok` classes, while the unchanged and decreased members receive neutral/muted styling without `is-best` or `ok`.

**Acceptance Scenarios**:

1. **Given** a non-skipped team member whose optimized subtotal exceeds `currentSubtotal` (`memberDelta.sign === '+'`), **When** rendered in `TeamOptimizationList`, **Then** its rank pill receives `comp-rank-best is-best`, its subtotal receives `ok`, and `data-member-status` is `"improved"`.
2. **Given** a non-skipped team member whose optimized subtotal equals `currentSubtotal` (`memberDelta.sign === '0'`), **When** rendered in `TeamOptimizationList`, **Then** its rank pill does NOT have `is-best` or `comp-rank-best`, its subtotal does NOT have `ok`, and `data-member-status` is `"unchanged"`.
3. **Given** a non-skipped team member whose optimized subtotal is below `currentSubtotal` (`memberDelta.sign === '-'`), **When** rendered in `TeamOptimizationList`, **Then** its rank pill does NOT have `is-best` or `comp-rank-best`, its subtotal has `muted` (not `ok`), its delta chip has `muted` (`data-delta-sign="-"`), and `data-member-status` is `"decreased"`.
4. **Given** the overall `team-opt-summary-banner`, **When** `teamDelta.sign` is not `'+'`, **Then** it also withholds `is-best` / `ok` styling unless earned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `TeamOptimizationList`, a non-skipped member row MUST apply `comp-row-best` / `is-best` on the row/rank pill and `ok` on `team-opt-subtotal-${mKey}` ONLY when `memberDelta.sign === '+'`.
- **FR-002**: When `memberDelta.sign === '0'`, the member row MUST render with neutral rank pill (`comp-rank-pill` without `is-best` / `comp-rank-best`) and neutral subtotal (`comp-row-total` without `ok`).
- **FR-003**: When `memberDelta.sign === '-'`, the member row MUST render with neutral rank pill (`comp-rank-pill` without `is-best` / `comp-rank-best`) and muted subtotal (`comp-row-total muted` without `ok`) alongside the muted negative delta chip.
- **FR-004**: `team-opt-summary-banner` MUST likewise apply `is-best` / `ok` only when `teamDelta.sign === '+'`.
- **FR-005**: Presentation only — no change to computed numbers, rankings, or stored data; all golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero non-improved team member rows (`sign === '0'` or `'-'`) render `is-best`, `comp-rank-best`, or `ok`.
- **SC-002**: Improved team member rows (`sign === '+'`) continue to render `is-best` / `comp-rank-best` and `ok`.

## Assumptions

- Adding `data-testid="team-opt-rank-${mKey}"`, `data-member-status`, and `data-member-delta-sign` on member rows provides clean hooks for automated regression testing without altering visual layout.
