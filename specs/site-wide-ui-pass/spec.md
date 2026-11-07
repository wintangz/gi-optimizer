# Feature Specification: Site-Wide UI Pass (`site-wide-ui-pass`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: Harmonize the visual language and shared presentation foundation across the entire site (`/`, `/import`, `/presets`, `/teams`, `/optimize`, `Nav`, and `layout`), eliminating unstyled controls and ensuring responsive usability down to `~390px` width.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared Presentation Foundation in `globals.css` (Priority: P1)

All pages share a single CSS foundation in `apps/web/src/app/globals.css`: spacing scale tokens, container, card and section-header styles, typography scale, button variants (`btn-primary`, `btn-secondary`, `btn-icon`, `btn-icon-only`, `btn-danger`, `btn-danger-ghost`, `gi-tab`), styled input/select/checkbox controls with focus/hover states, responsive table wrappers (`.gi-table-wrap`, `.gi-table`), and empty/loading card states.

**Independent Test**: Verify `globals.css` defines the shared design tokens, control styles, button variants, table wrappers, and `@media (max-width: 640px)` responsive rules.

---

### User Story 2 - Harmonized App Shell & Pages (`/`, `/import`, `/presets`, `/teams`, `/optimize`) (Priority: P1)

- **Nav & Footer (`Nav.tsx`, `layout.tsx`)**: Client navigation bar with icon+label links, active route highlighting (`aria-current="page"` via `usePathname()`), consistent height, and a subtle app footer.
- **Home (`/`)**: Hero card + 3 step cards (`Import GOOD`, `Pick a Preset`, `Optimize`) with icons and direct action buttons.
- **Import (`/import`)**: Styled dropzone/file-picker card, account stat summary card with action buttons, and tabbed inventory (`Artifacts`, `Weapons`, `Characters`) using shared identifier badges/chips and `.gi-table`.
- **Presets (`/presets`)**: Filter bar, split preset list, and detail card harmonized with `.gi-card`, `.gi-table-wrap`, and shared button variants.
- **Teams (`/teams`)**: Custom Team & Preset Builder organized into shared `.gi-card` sections and `.gi-table` tables while preserving deferred-engine-start behavior and VNode structure.
- **Optimize (`/optimize`) & `ArtifactSetFilter`**: Harmonized with the shared card, button, and responsive styles.

**Independent Test**: Run all component and unit tests across the monorepo (`pnpm test`) and verify `pnpm build` exports cleanly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `apps/web/src/app/globals.css` MUST define shared spacing, typography, card, header, button, form control, table, and responsive (`~390px`) styles.
- **FR-002**: `apps/web/src/components/Nav.tsx` MUST indicate the active page using `usePathname()` and render icon+label navigation items; `apps/web/src/app/layout.tsx` MUST include a subtle app footer.
- **FR-003**: `/`, `/import`, `/presets`, `/teams`, and `/optimize` MUST use the shared CSS classes and existing visual identifier components without adding new dependencies or modifying engine math.

## Success Criteria *(mandatory)*

- **SC-001**: Full test suite (`pnpm test`), `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass with zero errors.
