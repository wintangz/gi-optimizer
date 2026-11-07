# Research: Site-Wide UI Pass (`site-wide-ui-pass`)

## Decision 1: Preserving Existing Component Test Contracts
- **`apps/web/test/teams-deferred-start.test.tsx`**: Evaluates `TeamsPage` via a custom VNode walker. We must keep the exact text strings (`'Custom Team & Preset Builder'`, `'Load or Fork Existing Preset:'`, `'Load Engine & Preview'`, `'Normal 1 (skill.usherDmg)'`, `'Total: 42,500 DMG'`, `'+ Add Simulated Teammate'`), `data-testid="load-engine-preview-btn"`, and direct `<select>` elements in `TeamsInner` while replacing raw inline styles with shared CSS classes.
- **`apps/web/test/ArtifactSetFilter.test.tsx`**, **`Identifier.test.tsx`**, **`Loading.test.tsx`**, **`OptimizeViews.test.tsx`**: Preserve all `data-testid`, `aria-label`, and button text contracts so zero existing component tests break.

## Decision 2: Responsive Layout at `~390px`
- Use `.gi-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }` around tables, collapsible/stacking grid rules under `@media (max-width: 768px)` and `@media (max-width: 640px)`, and `flex-wrap: wrap` on header, nav, filter, and comparison rows so no horizontal page overflow occurs on mobile viewports.
