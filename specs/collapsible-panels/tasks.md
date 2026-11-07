# Tasks: Collapsible Panels (`collapsible-panels`)

**Input**: Design documents from `/specs/collapsible-panels/`

## Phase 1: Collapsible `SolverPoolFiltersPanel` with Session Persistence
- [x] T001 Make `SolverPoolFiltersPanel` in `apps/web/src/components/OptimizeViews.tsx` collapsible, collapsed by default when unrestricted, with the summary line always visible and expanded state persisted per session.

## Phase 2: Teams Editor Full-Roster Pickers & Presets Card Click
- [x] T002 Collapse the `add-teammate` and `change-target` `CharacterTilePicker` grids behind toggle controls in `apps/web/src/app/teams/page.tsx`.
- [x] T003 Remove in-card expansion (`expandedCardIds` and `.preset-card-expanded-desc`) from `apps/web/src/app/presets/page.tsx`.

## Phase 3: Regression Tests & Verification
- [x] T004 Update and add unit tests in `apps/web/test/OptimizeViews.test.tsx`, `apps/web/test/official-owned-first-ui.test.tsx`, and `apps/web/test/teams-deferred-start.test.tsx`.
