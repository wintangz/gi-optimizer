# Implementation Plan: Site-Wide UI Pass (`site-wide-ui-pass`)

1. Expand `apps/web/src/app/globals.css` with design tokens (`--space-*`, `--radius-*`), control hover/focus styles, button variants, `.gi-dropzone`, `.gi-stat-grid`, `.gi-tabs`, `.gi-step-grid`, `.gi-footer`, and `@media (max-width: 640px)` responsive rules.
2. Update `apps/web/src/components/Nav.tsx` (`'use client'`, `usePathname()`, icon+label items, `aria-current="page"`) and `apps/web/src/app/layout.tsx` (add `.gi-footer`).
3. Refactor `apps/web/src/app/page.tsx` (Home hero + step cards with icons and action buttons).
4. Refactor `apps/web/src/app/import/page.tsx` (dropzone card, account summary stat cards, tabbed inventory with `.gi-table-wrap` / `.gi-table`).
5. Harmonize `apps/web/src/app/presets/page.tsx`, `apps/web/src/app/teams/page.tsx`, and `apps/web/src/components/ArtifactSetFilter.tsx` with the shared card, table, and control classes.
6. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
