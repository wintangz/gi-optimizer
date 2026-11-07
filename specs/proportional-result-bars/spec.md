# Feature Specification: Proportional Result Bars (`proportional-result-bars`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Draft
**Input**: User description: "Result bars in build comparison and weapon comparison rows are floored at 4% width (Math.max(4, ...)), so a build at 0.5% of the leader draws a 4.0% bar and claims '4.0% of best' in its tooltip. Remove the 4% percentage floor so bar width and tooltip percentage reflect the true proportion of the leader (0%–100%)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - True Proportional Result Bar Widths and Tooltips (Priority: P1)

When comparing builds or weapons with a large spread (or when testing a low-damage baseline against an optimized build), the horizontal comparison bar and its tooltip must reflect the true proportion `(total / maxTotal) * 100` clamped to `[0, 100]` rather than artificially flooring at `4%`.

**Why this priority**: Flooring `barPct` at `4` causes a build at `0.5%` of the leader to render `style="width:4.0%"` and a tooltip reading `(4.0% of best)`, misrepresenting the mathematical ratio.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonList`, and `BuildComparisonBars` where a row's total is `0.5%` of the leader (`5,000` vs `1,000,000`) and verify that the bar's `style` width is `0.5%` (not `4.0%`) and its tooltip reports `0.5% of best` / `0.5% of leader`.

**Acceptance Scenarios**:

1. **Given** a build in `BuildComparisonList` with total `5,000` against a best build of `1,000,000`, **When** rendered, **Then** `comp-bar-fill-${row.id}` has `width: 0.5%` and the bar track tooltip says `(0.5% of best)`.
2. **Given** a weapon row in `WeaponComparisonList` with total `5,000` against a leader weapon of `1,000,000`, **When** rendered, **Then** `weapon-compare-bar-${wKey}` has `width: 0.5%` and the bar track tooltip says `(0.5% of leader)`.
3. **Given** an expanded top-build card in `WeaponComparisonList` with total `5,000` against that weapon's best build of `1,000,000`, **When** rendered, **Then** its bar fill has `width: 0.5%` and the bar track tooltip says `(0.5% of weapon best)`.
4. **Given** `BuildComparisonBars` with `currentTotal={5_000}` and `optimisedTotal={1_000_000}`, **When** rendered, **Then** `comparison-bar-current-fill` has `width: 0.5%` (not `4.0%`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `BuildComparisonList` MUST compute `barPct` as `Math.max(0, Math.min(100, (row.total / maxTotal) * 100))` without a `4%` floor.
- **FR-002**: `WeaponComparisonList` weapon rows MUST compute `barPct` as `Math.max(0, Math.min(100, (total / maxTotal) * 100))` and top-build cards MUST compute `buildBarPct` as `Math.max(0, Math.min(100, (buildTotal / Math.max(total, 1)) * 100))` without a `4%` floor.
- **FR-003**: `BuildComparisonBars` in `Identifier.tsx` MUST compute `currPct` and `optPct` with `Math.max(0, Math.min(100, ...))` without a `4%` floor.
- **FR-004**: Presentation only — no change to computed numbers, rankings, or stored data; all golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero result bar calculations in `OptimizeViews.tsx` or `Identifier.tsx` use `Math.max(4, ...)`.
- **SC-002**: A build at `0.5%` of the leader renders `width: 0.5%` and `(0.5% of ...)` across all comparison bar surfaces.

## Assumptions

- Adding `min-width: 2px` to `.comp-row-bar-fill` in `globals.css` provides a sub-pixel visual hairline for non-zero bars without altering the percentage width or tooltip text.
