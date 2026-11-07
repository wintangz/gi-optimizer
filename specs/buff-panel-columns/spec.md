# Feature Specification: Buffs & Passives Column Grid Layout (`buff-panel-columns`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User request:
> Feature 1: buff-panel-columns
> The Buffs & Passives panel (ConditionalTogglePanel) renders every conditional as a full-width row: label on the left, control pushed to the far right, and a wide band of empty space in between on desktop widths. Lay the entries out in columns instead:
> - Within each group (Weapon Passive, Artifact Set Effects, Character Passives & Talents, Constellation Effects), entries flow into a responsive grid: 3 columns on wide screens, 2 on medium, 1 on narrow.
> - Each entry becomes a compact cell: label on the left, its toggle/state control on the right of the cell, long labels wrap inside the cell instead of stretching the row. Cells in the same row align to equal height.
> - The member switcher header, group headings, active-count badges and Reset stay as they are. Layout only — no change to conditional state, overrides, or how anything applies to evaluate/optimize.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive 3/2/1-Column Grid Within Each Buff Group (Priority: P1)

Within each of the 4 groups (`Weapon Passive`, `Artifact Set Effects`, `Character Passives & Talents`, `Constellation Effects`) in `ConditionalTogglePanel`, conditional entries flow in a CSS Grid container (`.gi-buffs-rows.gi-buffs-grid`):
- 3 equal columns (`repeat(3, minmax(0, 1fr))`) on wide screens (`> 1024px`).
- 2 equal columns (`repeat(2, minmax(0, 1fr))`) on medium screens (`<= 1024px`).
- 1 column (`1fr`) on narrow screens (`<= 640px`).

**Independent Test**: Render `ConditionalTogglePanel` and inspect the group entry containers (`data-testid="buff-group-grid-weapon-..."`, `buff-group-grid-artifact-...`, `buff-group-grid-character-...`, `buff-group-grid-constellation-...`) and verify they use the `gi-buffs-rows gi-buffs-grid` grid layout class and CSS rules for 3, 2, and 1 columns.

---

### User Story 2 - Equal-Height Compact Cells with Wrapping Labels (Priority: P1)

Each conditional entry (`.gi-buff-row.gi-buff-cell`) is a compact grid cell with `height: 100%` and `min-width: 0`:
- Label and badges sit on the left (`flex: 1 1 0%; min-width: 0`), with long labels wrapping inside the cell (`overflow-wrap: anywhere; word-break: break-word`).
- Toggle switch and state `<select>` sit on the right of the cell (`flex-shrink: 0`).
- Grid items align with `align-items: stretch` so cells in the same row have equal height.
- Member switcher tabs, group headings, active-count badges, and Reset buttons remain unchanged.

## Assumptions Logged

1. **Responsive Breakpoints**: Wide screens (`> 1024px`) use 3 columns, medium screens (`@media (max-width: 1024px)`) use 2 columns, and narrow screens (`@media (max-width: 640px)`) use 1 column, matching the app's existing responsive breakpoint hierarchy in `globals.css`.
