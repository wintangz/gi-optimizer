# Feature Specification: Delta Styling Tiers (`delta-styling-tiers`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Draft
**Input**: User description: "Every below-baseline delta in results is styled with the red error class, so a build 0.5% behind Current looks like a failure. Reserve red for actual errors; give negative deltas a neutral/muted style (positive stays green). Applies everywhere relative deltas render: build rows, weapon rows, team member rows, stat diffs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reserve Red Error Styling for Actual Errors and Style Negative Relative Deltas Neutral/Muted (Priority: P1)

When viewing optimization results across single-target builds, weapon comparisons, team-wide member rows, or core stat comparisons, a build or stat that is below the baseline (`Current` or `#1` leader) is a valid numerical comparison rather than an error. It must render with neutral/muted (`muted`) styling while positive deltas remain green (`ok`) and actual errors (such as `"No build meets constraints"`) remain red (`error`).

**Why this priority**: Styling every below-baseline delta with `.error` makes a build `0.5%` behind Current or a stat trade-off (`−5.0% ATK` for `+22.6% CRIT DMG`) look like a broken constraint or system failure.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonList`, `TeamOptimizationList`, `BuildStatComparisonSection` (`formatCoreStatComparison`), and `BuildComparisonBars` with positive, zero, and negative deltas, and assert that positive deltas use `ok`, zero and negative deltas use `muted` (while retaining `sign: '-'` and `−X.X%` text), and unmet-constraint messages retain `error`.

**Acceptance Scenarios**:

1. **Given** a relative damage delta below baseline (`formatRelativeDelta(total, baselineTotal)` where `total < baselineTotal`), **When** rendered in build rows, per-instance `vs. Current` cells, or team optimization rows, **Then** its class is `muted` (not `error`), its `sign` remains `'-'`, and its formatted text remains `−X.X%`.
2. **Given** a non-leader weapon row or non-best top-build card in `WeaponComparisonList` (`percentBehindLeader >= 0.05` or `buildPctBehindBest >= 0.05`), **When** rendered, **Then** its `.comp-row-delta` element uses `muted` (not `error`), whereas an unmet-constraint weapon row (`No build meets constraints`) still uses `error`.
3. **Given** a core stat comparison where a build has a lower flat or percent stat than `Current` (`formatCoreStatComparison`), **When** rendered in `BuildStatComparisonSection`, **Then** `cls` is `'muted'` (not `'error'`), `sign` remains `'-'`, and increases remain `'ok'`.
4. **Given** `BuildComparisonBars` with `optimisedTotal < currentTotal`, **When** rendered, **Then** the delta readout uses `muted` instead of `error`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `formatRelativeDelta` MUST return `cls: 'muted'` for negative deltas (`pct <= -0.05`), `cls: 'muted'` for zero/unchanged deltas, and `cls: 'ok'` for positive deltas (`pct >= 0.05`), while preserving `sign: '-'` and `text: '−X.X%'`.
- **FR-002**: `formatCoreStatComparison` MUST return `cls: 'muted'` for negative flat or percent stat diffs (`sign: '-'`), `cls: 'muted'` for unchanged (`sign: '0'`) or plain stats (`sign: null`), and `cls: 'ok'` for positive stat diffs (`sign: '+'`).
- **FR-003**: `WeaponComparisonList` weapon-row deltas (`weapon-compare-delta-${wKey}`) and top-build deltas (`weapon-compare-build-delta-${wKey}-${bIdx}`) MUST use `ok` for the leader/best (`0.0%`) and `muted` for trailing rows (`−X.X%`), reserving `error` for actual unmet-constraint rows (`weapon-compare-unmet-${wKey}`).
- **FR-004**: `BuildComparisonBars` MUST style positive deltas (`diff > 0`) with `ok` and zero/negative deltas (`diff <= 0`) with `muted`.
- **FR-005**: Presentation only — no change to computed numbers, rankings, or stored data; all golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero relative delta chips or stat diff cells in `OptimizeViews.tsx` or `Identifier.tsx` use the `error` class for negative numerical comparisons.
- **SC-002**: Actual error indicators (such as `weapon-compare-unmet-${wKey}`) continue to use `error`.
- **SC-003**: All unit and integration tests pass with zero regressions.

## Assumptions

- Retaining `data-delta-sign="-"` and `data-diff-sign="-"` on negative delta elements preserves semantic sign inspection while changing the visual CSS tier class from `error` to `muted`.
