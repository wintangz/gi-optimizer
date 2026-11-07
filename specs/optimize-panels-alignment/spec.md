# Feature Specification: Optimize Filter Panels Matched Pair Alignment (`optimize-panels-alignment`)

**Feature Branch**: `main` (`optimize-panels-alignment`)  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature 1: optimize-panels-alignment. On the optimize page, the Protected Characters panel and the Artifact Set Filter panel sit side by side but are positionally unmatched: different top offsets, heights and header baselines, so the pair looks broken. Make them a matched pair: same top edge and equal height, headers and search rows on the same baseline, tile grids starting at the same y and scrolling inside the equal-height panels, consistent panel padding/borders. On narrow widths they may stack vertically instead. No behaviour changes — layout only."

## Clarifications & Logged Assumptions

- **Matched Pair Grid Container (`.opt-filter-pair`)**: On `/optimize` (`apps/web/src/app/optimize/page.tsx`), the Protected Characters panel (`[data-testid="protected-characters-panel"]`) and the Artifact Set Filter panel (`[data-testid="artifact-set-filter-panel"]`) sit inside a dedicated 2-column grid container `.opt-filter-pair` (`data-testid="optimize-filter-panels-pair"`) with `grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: stretch;`.
- **Consistent Panel Card (`.opt-filter-panel`)**: Both panels use the exact same card class `.opt-filter-panel` (`background: var(--surface)` `#151821`, `border: 1px solid var(--border)`, `border-radius: var(--radius-sm)`, `padding: 0.85rem`, `display: flex; flex-direction: column; gap: 0.55rem; height: 100%;`), eliminating the previous discrepancy where Protected Characters had `.preset-provenance-box` while `ArtifactSetFilter` had no outer box.
- **Four-Row Matched Vertical Structure**: Both panels share the exact same 4 vertical slots with identical fixed row heights and `0.55rem` vertical gaps so their baselines and tile grid `y` coordinates match:
  1. **Header Row (`.opt-filter-panel-header`, `height: 1.5rem`)**: Title on the left (`Protected Characters` / `Artifact Set Filter`) and summary status on the right (`[data-testid="protected-characters-summary"]` / `[data-testid="artifact-set-filter-summary"]`).
  2. **Subbar Row (`.opt-filter-panel-subbar`, `height: 2rem`)**: Helper instruction on Protected Characters (`Click a tile to keep/release equipped artifacts.`) paired against the 3-mode segmented selector (`All sets` / `Exclude selected` / `Only these sets`) on Artifact Set Filter.
  3. **Search & Toolbar Row (`.tile-picker-toolbar`, `height: 2.1rem`)**: Always-visible search input on Protected Characters (`searchable={true}` on `CharacterTilePicker`, or a disabled search input when no GOOD file is imported) paired on the same baseline against the search input + bulk action buttons (`Select all` / `Clear` / `Invert`) on Artifact Set Filter.
  4. **Scrollable Tile Grid (`.tile-picker-grid`, `flex: 1 1 auto; height: 260px; max-height: 260px; overflow-y: auto; align-content: start;`)**: Starts at the exact same `y` offset (`8.1rem` from panel top) in both panels and scrolls internally within the equal-height panels.
- **Responsive Narrow Stacking**: Below `860px` (`@media (max-width: 860px)`), `.opt-filter-pair` switches to `grid-template-columns: 1fr` so the two panels stack cleanly on narrow/mobile widths.
- **Layout Only — Zero Behaviour Changes**: All selection, filtering, search, bulk actions, and settings persistence behaviours remain 100% unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Side-by-Side Matched Panel Pair on `/optimize` (Priority: P1)

When viewing the `/optimize` page on desktop widths, the Protected Characters panel and the Artifact Set Filter panel sit side by side as a visually matched pair with identical top edges, equal heights, identical borders and padding, headers and search inputs on the same horizontal baseline, and tile grids starting at the same vertical offset and scrolling inside equal-height viewports.

**Why this priority**: Eliminates the broken, uneven layout where `ArtifactSetFilter` lacked a panel box and had extra rows above its tile grid compared to Protected Characters.

**Independent Test**: Render `/optimize` (`OptimizePage`) and `ArtifactSetFilter`, and verify both panels share `.opt-filter-panel`, `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, `.tile-picker-toolbar`, and `.tile-picker-grid` inside `.opt-filter-pair`.

**Acceptance Scenarios**:

1. **Given** `/optimize` with an imported GOOD file (even with fewer than 8 characters), **When** rendered, **Then** `[data-testid="protected-characters-panel"]` and `[data-testid="artifact-set-filter-panel"]` both render with class `opt-filter-panel` inside `[data-testid="optimize-filter-panels-pair"]` (`class="opt-filter-pair"`).
2. **Given** both panels inside `.opt-filter-pair`, **When** inspected, **Then** each panel contains `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, `.tile-picker-toolbar` (with a search input), and `.tile-picker-grid` in the same structural order.
3. **Given** narrow viewport widths (`<= 860px`), **When** CSS media queries apply, **Then** `.opt-filter-pair` stacks the two panels vertically (`grid-template-columns: 1fr`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Protected Characters panel and Artifact Set Filter panel on `/optimize` MUST be wrapped in `.opt-filter-pair` (`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: stretch;`) and both panels MUST use `.opt-filter-panel` for consistent borders, background, padding, and equal height.
- **FR-002**: Both panels MUST render matched `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, and `.tile-picker-toolbar` rows above `.tile-picker-grid` so that headers, search inputs, and `.tile-picker-grid` top edges align across both columns.
- **FR-003**: `CharacterTilePicker` in the Protected Characters panel MUST pass `searchable={true}` so the search toolbar row is always present regardless of character count.
- **FR-004**: On narrow viewports (`@media (max-width: 860px)`), `.opt-filter-pair` MUST stack vertically (`grid-template-columns: 1fr`).
- **FR-005**: No functional or behavioural changes may be introduced to Protected Characters or Artifact Set Filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit tests verify the matched panel pair structure (`.opt-filter-pair`, `.opt-filter-panel`, `.opt-filter-panel-header`, `.opt-filter-panel-subbar`, `.tile-picker-toolbar`, and `.tile-picker-grid`) across both panels on `/optimize` and preserve all existing `ArtifactSetFilter` and `TilePickers` tests.
- **SC-002**: `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @gi/web test` pass with zero errors.
