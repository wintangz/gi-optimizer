# Feature Specification: Relative Percentage Diffs for Core Flat Stats

**Feature Branch**: `main` (`specs/stat-diff-percent`)
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Feature 3: stat-diff-percent"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Relative Percentage Change for Flat Stats in Core Stat Comparison (Priority: P1)

In the "Core Stat Comparison vs. Current" table (`BuildStatComparisonSection`), flat stats (`HP`, `ATK`, `DEF`, `EM`) display their relative percentage change vs Current in the Diff column by default (e.g. `+489` HP on `18,554` displays as `+2.6%`), with the raw signed integer delta available on hover (`title` tooltip and `data-raw-diff` attribute). Percentage stats (`ER`, `CR`, `CD`) keep their percentage-point difference display (`+22.6%`, `−12.0%`). When the Current value is `0` for a flat stat (e.g. `0` EM → `40` EM), the Diff column falls back to the raw signed integer delta (`+40`) so it never divides by zero.

**Independent Test**: Call `formatCoreStatComparison` and render `BuildComparisonList` with flat stats (`hp`, `atk`, `def`, `eleMas`) and percentage stats (`enerRech_`, `critRate_`, `critDMG_`), including a `0` Current baseline case; verify relative percentage `diffText` (`+2.6%`), raw delta tooltip (`+489`), zero-baseline fallback (`+40`), and unchanged Current / This Build formatting.

**Acceptance Scenarios**:

1. **Given** a flat stat with a non-zero Current baseline (e.g. `HP` Current `18,554` → This Build `19,043`, raw delta `+489`), **When** formatted and rendered in `BuildStatComparisonSection`, **Then** the Diff column displays `+2.6%` (`cls: 'ok'`) with `title="+489"` (`data-raw-diff="+489"`).
2. **Given** a flat stat with a `0` Current baseline (e.g. `EM` Current `0` → This Build `40`), **When** formatted and rendered, **Then** the Diff column falls back to `+40` without dividing by zero.
3. **Given** percentage stats (`ER`, `CR`, `CD`), **When** formatted and rendered, **Then** they keep their percentage-point difference display (`+22.6%`, `−12.0%`, `0.0%`).
4. **Given** any core stat row, **When** rendered, **Then** the `Current` and `This Build` columns remain unchanged (flat stats as locale-formatted integers, percent stats with one decimal place).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `formatCoreStatComparison` MUST return relative percentage change (`diffText`, `asciiDiffText`) for flat stats (`hp`, `atk`, `def`, `eleMas`) when `currInt > 0`, formatted to 1 decimal place (`+2.6%`, `−5.0%`, `0.0%`), and include `rawDiffText` / `asciiRawDiffText` holding the signed integer delta (`+489`, `−60`, `0`).
- **FR-002**: When `currInt === 0` for a flat stat, `formatCoreStatComparison` MUST fall back to the raw signed integer delta (`+40`, `0`, etc.) so division by zero never occurs.
- **FR-003**: `BuildStatComparisonSection` MUST render `formatted.rawDiffText` as the `title` tooltip (and `data-raw-diff` / `data-raw-diff-ascii`) on the Diff `<td>` when present.
- **FR-004**: Percentage stats (`enerRech_`, `critRate_`, `critDMG_`) and the `Current` / `This Build` columns MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All unit tests in `apps/web/test/OptimizeViews.test.tsx` pass.
- **SC-002**: Golden fixtures and engine evaluations remain byte-identical.
