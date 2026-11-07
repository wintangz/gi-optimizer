# Feature Specification: Build Details Deduplication & Row Expand Affordance

**Feature Branch**: `main` (`specs/build-details-dedupe`)
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Feature 2: build-details-dedupe"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Strip Redundant Reaction / Hit-Count Parentheticals from Rotation Row Labels (Priority: P1)

When rendering rotation breakdown rows in build Details (`BuildComparisonList`, `WeaponComparisonList`, `TeamOptimizationList`) and in `PresetRotationSummary`, trailing parentheticals on row labels that duplicate the row's Reaction chip and/or Hits column (such as `"(Melt)"`, `"(Melt ×4)"`, `"(No Reaction ×4)"`, `"(Vaporize ×3)"`, `"(×7)"`, `"(3×8)"`) are stripped at render time so reaction and hit count appear once in their dedicated columns, while preset JSON data remains untouched and non-redundant parentheticals (e.g. `"(Skill)"`, `"(Burst Initial)"`) are preserved.

**Independent Test**: Call `formatRotationRowLabel` and render `BuildComparisonList` / `PresetRotationSummary` with labels containing redundant reaction/hit-count parentheticals and non-redundant parentheticals; verify redundant suffixes are stripped in rendered output while non-redundant parentheticals and raw preset objects remain unchanged.

**Acceptance Scenarios**:

1. **Given** a rotation row label ending with `"(Melt)"`, `"(Melt ×4)"`, `"(No Reaction ×4)"`, `"(Vaporize ×3)"`, or `"(×7)"`, **When** rendered in Details or `PresetRotationSummary`, **Then** the trailing parenthetical is removed from the displayed label.
2. **Given** a rotation row label ending with a non-redundant parenthetical such as `" Musoujen (Burst Initial)"` or `"Frostflake Arrow (Bloom)"` where the parenthetical describes ability part/phase, **When** rendered, **Then** the non-redundant parenthetical is preserved.
3. **Given** bundled preset JSON files, **When** inspected, **Then** their authored `label` strings remain completely untouched.

---

### User Story 2 - Plain Rotating Chevron Row Expand Affordance (Priority: P1)

In build Details, both damage rows and core stat rows expand on row click to show their formula/source breakdown. Instead of rendering a pill button (`"Formula ▼"`) on damage rows and a select-styled button (`"▼"`) on stat rows, both row types indicate expandability with a plain rotating chevron (`<span className="comp-row-chevron">`) inside the row label cell, and clicking the row toggles its breakdown.

**Independent Test**: Render `BuildComparisonList` with expandable damage and stat breakdowns; verify no `<button className="comp-inline-breakdown-btn">` elements exist, plain `.comp-row-chevron` indicators render on expandable rows, and clicking the damage/stat `<tr>` toggles the breakdown and updates `.is-expanded` / `aria-expanded`.

**Acceptance Scenarios**:

1. **Given** an expandable damage instance row or core stat row in Details, **When** rendered, **Then** it displays a plain chevron `<span className="comp-row-chevron">` (not a `<button>` or select-like box) and sets `aria-expanded` on the `<tr>`.
2. **Given** an expandable damage row or stat row, **When** the user clicks the row, **Then** its breakdown row expands/collapses and the chevron rotates via `.is-expanded`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `formatRotationRowLabel(label: string): string` MUST strip a trailing parenthetical `\s*\(([^()]+)\)\s*$` when its content consists solely of reaction terms (`Melt`, `Vaporize`, `Spread`, `Aggravate`, `Overloaded`, `Electro-Charged`, `Superconduct`, `Swirl`, `Shattered`, `Crystallize`, `Burgeon`, `Hyperbloom`, `Lunar-Charged`, `Lunar-Bloom`, `Lunar-Crystallize`, `No Reaction`, `Raw`, `Unreacted`) and/or hit-count expressions (`×N`, `xN`, `N×M`, `NxM`, `N hit`, `N hits`), separated by spaces, commas, slashes, or middots.
- **FR-002**: `formatRotationRowLabel` MUST be applied wherever rotation breakdown row labels are displayed (`BuildComparisonList`, `WeaponComparisonList`, `TeamOptimizationList`, and `PresetRotationSummary`) without mutating preset JSON or evaluation objects.
- **FR-003**: Damage rows and stat rows in Details MUST NOT render `<button className="comp-inline-breakdown-btn">`; instead they MUST render a plain rotating chevron `<span className="comp-row-chevron">` and toggle expansion when the row (`<tr>`) is clicked.
- **FR-004**: Presentation only: no changes to evaluation, totals, or stored data; golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All unit and component tests in `apps/web/test/OptimizeViews.test.tsx` pass.
- **SC-002**: Bundled preset JSON files and golden fixtures remain 100% unmodified.
