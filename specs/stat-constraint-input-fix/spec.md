# Feature Specification: Stat Constraint Min/Max Input Editing Fix (`stat-constraint-input-fix`)

**Feature Branch**: `main` (`stat-constraint-input-fix`)  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature: stat-constraint-input-fix. The stat constraint min/max inputs (ConstraintsCard in apps/web/src/components/OptimizeViews.tsx) are broken for typing: Typing '1' in a percent-stat field instantly becomes '100': the change handler guesses that any value in (0, 2] is a ratio and converts it to percent on every keystroke. Remove the ratio-guessing entirely — the field's unit is the displayed unit (a percent stat is entered as a percent number, e.g. 175 means 175%), and a committed value must mean exactly what was typed. Keep the stored/engine constraint semantics unchanged for committed values. The field must be freely editable: it holds the raw text while focused, with no reformatting, clamping, or conversion until blur/commit. Deleting every character must work, and an empty field on commit means that bound is unset (no min / no max) — it must never snap back to the previous value. Add a regression test: typing '1' leaves '1' (commits as 1, not 100), and clearing a bound removes it."

## Requirements

- **FR-001**: Remove the `(0, 2]` / `(0, 10]` ratio-to-percent guessing from `formatDisplayBoundValue` in `ConstraintsCard` (`apps/web/src/components/OptimizeViews.tsx`). Values entered in the input are already in the displayed unit and commit as the exact number typed (`"1"` commits as `1`, never `100`).
- **FR-002**: Hold raw text in local draft state while a min/max bound input is focused so no reformatting, clamping, or conversion occurs during typing until blur/commit.
- **FR-003**: Deleting all characters (`""`) and committing/blurring unsets that bound (`min` or `max` deleted from the `StatConstraint` entry) and never snaps back to the previous value.
- **FR-004**: Keep stored/engine constraint semantics (`@gi/presets` / `@gi/engine`) unchanged for committed values.
- **FR-005**: Add regression tests in `apps/web/test/OptimizeViews.test.tsx` verifying that typing `"1"` in a percent-stat field leaves `"1"` and commits `1` (not `100`), and clearing a bound removes it.
