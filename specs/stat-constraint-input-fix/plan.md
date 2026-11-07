# Implementation Plan: Stat Constraint Min/Max Input Editing Fix (`stat-constraint-input-fix`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Fix stat constraint min/max inputs in `ConstraintsCard` (`apps/web/src/components/OptimizeViews.tsx`) by removing the `(0, 2]` / `(0, 10]` ratio-to-percent conversion in `formatDisplayBoundValue`, holding raw text in local draft state while focused until blur/commit, and ensuring clearing a field unsets that bound without snapping back.

## Project Structure

- `apps/web/src/components/OptimizeViews.tsx`: Remove ratio-guessing from `formatDisplayBoundValue` and add `draftBounds` raw-text editing state with `onFocus`, `onChange`, `onBlur`, and `Enter` commit handling.
- `apps/web/test/OptimizeViews.test.tsx`: Add interactive regression test verifying typing `"1"` leaves `"1"` (commits `1`, not `100`), raw text is preserved while focused, and clearing a bound removes it.
