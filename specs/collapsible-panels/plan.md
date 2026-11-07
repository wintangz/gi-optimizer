# Implementation Plan: Collapsible Panels (`collapsible-panels`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/collapsible-panels/spec.md)

## Summary

1. **`apps/web/src/components/OptimizeViews.tsx` (`SolverPoolFiltersPanel`)**:
   - Add session-scoped state helpers (`readPoolFiltersSessionExpanded`, `writePoolFiltersSessionExpanded`, and exported `resetSolverPoolFiltersExpandedSession` for tests) backed by `sessionStorage` (`gi:solver-pool-filters-expanded`) + module-level fallback.
   - Compute `isExpanded = sessionExpanded !== null ? sessionExpanded : !summary.isUnrestricted`.
   - Render a toggle button (`data-testid="solver-pool-filters-toggle"`, `aria-expanded={isExpanded}`) in `.opt-filter-panel-header` alongside the always-visible `data-testid="solver-pool-filters-summary"` and conditional `Reset Pool Filters` button.
   - Conditionally render the filter sections (`data-testid="solver-pool-filters-body"`) when `isExpanded` is `true`.
2. **`apps/web/src/app/teams/page.tsx`**:
   - Add `showTeammatePicker` and `showTargetPicker` boolean states (default `false`).
   - Collapse the `"Teammate character"` `CharacterTilePicker` behind a toggle button (`data-testid="toggle-add-teammate-picker-btn"`, `aria-expanded={showTeammatePicker}`).
   - Collapse the `"Target character"` `CharacterTilePicker` behind a `"Change Target Character"` toggle button (`data-testid="toggle-change-target-btn"`, `aria-expanded={showTargetPicker}`), closing it when a new target is picked.
3. **`apps/web/src/app/presets/page.tsx`**:
   - Remove `expandedCardIds` state and the `{isExpanded && (<div className="preset-card-expanded-desc">...</div>)}` block from `.preset-card` so clicking a card only selects it.
