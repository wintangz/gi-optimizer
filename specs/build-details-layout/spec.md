# Feature Specification: Build Details Layout (`build-details-layout`)

**Feature Branch**: `main`  
**Created**: 2026-11-08  
**Status**: Draft  
**Input**: User description: "Fix the layout of the build Details view (damage table, stat comparison, artifact pieces): - Damage table: the instance-name column currently eats most of the width and the numeric columns drift apart with dead space between them. Make Per-Hit DMG, Subtotal DMG and Vs. Current a compact, consistently-sized, right-aligned cluster; the name column takes the remaining space. Reaction/Hit Mode/Hits stay compact. - The 'Core Stat Comparison vs. Current' heading and its 'Click a stat row…' hint are jammed together with no spacing — put the hint on its own line (or properly spaced) under the heading. - The artifact pieces list has no heading and each piece is a full-width row of 7+ chips. Add an 'Artifacts' heading and lay the 5 pieces out as compact cards in a grid that shows all 5 in a single row on wide screens (5 columns), wrapping responsively on narrower screens (e.g. 3 then 2, then 1). Each card holds: slot icon, set name + level, RV badge, main stat, and the substats as compact icon+value text (not individual pills). Owner/lock badges get tooltips explaining them (owner = character the piece is equipped on; lock = locked in the imported data), plus a one-line legend under the heading if tooltips alone are not enough."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Damage Table Column Proportions & Alignment (Priority: P1)

When viewing a build's expanded Details, the damage breakdown table keeps Reaction, Hit Mode, and Hits compact, gives the Damage Instance name column the flexible remaining width, and clusters Per-Hit DMG, Subtotal DMG, and vs. Current as compact, consistently-sized, right-aligned numeric columns.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList` and verify that the damage breakdown table applies `.comp-damage-table` with flexible `.comp-dmg-col-name`, compact `.comp-dmg-col-compact` / `.comp-dmg-col-hits`, and right-aligned numeric cluster `.comp-dmg-col-num`.

**Acceptance Scenarios**:

1. **Given** an expanded build Details panel, **When** the damage breakdown table renders, **Then** Per-Hit DMG, Subtotal DMG, and vs. Current headers and cells use right-aligned compact numeric column classes while the instance name column takes the remaining flexible width.

---

### User Story 2 - Spaced Heading & Hint for Core Stat Comparison (Priority: P1)

In the Core Stat Comparison section, the heading (`Core Stat Comparison vs. Current` or `Core Build Stats`) and its `"Click a stat row to inspect its source breakdown"` hint are stacked on separate lines with clean spacing instead of running together inline.

**Independent Test**: Render `BuildStatComparisonSection` with `statBreakdowns` and verify `.comp-details-subheader` places the heading and `.comp-details-subhint` on separate stacked lines.

**Acceptance Scenarios**:

1. **Given** `BuildStatComparisonSection` with `statBreakdowns`, **When** rendered, **Then** the heading and hint render inside a stacked `.comp-details-subheader` with `.comp-details-subhint`.

---

### User Story 3 - 5-Column Responsive Artifact Piece Cards with Heading, Legend & Tooltips (Priority: P1)

In the build Details view, the equipped artifact pieces section has an `"Artifacts"` heading with a one-line legend underneath, and lays out the 5 pieces as compact cards in a 5-column grid on wide screens (wrapping to 3, 2, then 1 column on narrower viewports). Each card displays the slot icon, set name + level, RV badge, main stat, substats as compact icon+value text (not individual pill chips), and owner/lock badges with explanatory tooltips.

**Independent Test**: Render `ArtifactPieceRow` and expanded build Details in `BuildComparisonList` and verify the `"Artifacts"` heading, legend, 5-column `.comp-details-pieces` grid, compact `.artifact-piece-card` structure, compact `.artifact-substat-line` icon+value text (not `.gi-stat-chip` pills for substats), and owner/lock tooltips.

**Acceptance Scenarios**:

1. **Given** an expanded build Details view, **When** rendered, **Then** an `"Artifacts"` heading and explanatory legend appear above the `.comp-details-pieces` 5-column card grid.
2. **Given** an artifact piece with substats, `location`, and `lock`, **When** rendered, **Then** substats render as compact `.artifact-substat-line` icon+value items (not pill chips) and owner/lock badges carry explanatory `title` tooltips.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Damage breakdown tables in build Details MUST style Per-Hit DMG, Subtotal DMG, and vs. Current as a compact, consistently-sized, right-aligned numeric cluster, keep Reaction / Hit Mode / Hits compact, and let the Damage Instance name column take the remaining width.
- **FR-002**: The Core Stat Comparison heading and its `"Click a stat row…"` hint MUST be placed on separate lines with proper spacing.
- **FR-003**: The artifact pieces section in build Details MUST include an `"Artifacts"` heading and a one-line legend explaining owner and lock badges.
- **FR-004**: The 5 artifact pieces MUST be laid out as compact cards in a responsive grid (`repeat(5, minmax(0, 1fr))` on wide screens, wrapping to 3, 2, and 1 column on narrower screens).
- **FR-005**: Each artifact piece card MUST display: slot icon, set name + level, RV badge, main stat, substats as compact icon+value text (not individual pill chips), and owner/lock indicators with descriptive tooltips.
- **FR-006**: Presentation only: no changes to evaluation, totals, or stored data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All damage tables in build Details apply `.comp-damage-table` and right-aligned numeric column classes (`.comp-dmg-col-num`).
- **SC-002**: Artifact pieces in build Details render under an `"Artifacts"` heading inside a 5-column responsive grid with compact icon+value substat lines and owner/lock tooltips.
