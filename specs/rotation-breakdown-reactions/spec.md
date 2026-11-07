# Feature Specification: Rotation Breakdown Reactions & Hit Mode (`rotation-breakdown-reactions`)

**Feature Branch**: `rotation-breakdown-reactions`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User request — surface reaction and hitMode on every rotation breakdown row (optimize build Details including Current, weapon compare Details, and preset rotation summaries).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reaction & Hit Mode in Optimize Build Breakdowns (Priority: P1)

When expanding a build's Details on the Optimize page (for the `Current` build, any `#1..#N` optimized build in `BuildComparisonList`, or any weapon row in `WeaponComparisonList`), each per-instance rotation breakdown row displays its reaction status and hit mode alongside its label and hit count.

**Why this priority**: Presets such as `official/mavuika-melt-hypercarry` mix Melt and non-reacting hits in the same rotation. Users need to see directly from the structured `reaction` and `hitMode` fields which hits react and how each hit is evaluated.

**Independent Test**: Render `BuildComparisonList` and `WeaponComparisonList` with `official/mavuika-melt-hypercarry` (and a preset whose labels do NOT contain `"(Melt)"`), expand `Current` and `#1`, and verify that rows with `reaction: "melt"` render a Cryo-styled `Melt` reaction chip, rows without `reaction` render a muted `"No reaction"` marker, and every row renders its hit mode (`Avg Hit`, etc.).

**Acceptance Scenarios**:

1. **Given** a rotation row with `reaction` set (`'melt'`, `'vaporize'`, `'spread'`, or `'aggravate'`), **When** its breakdown row is rendered in `BuildComparisonList`, `WeaponComparisonList`, or the preset rotation summary, **Then** a reaction chip styled with the reacting element's colors (`Melt` / `Vaporize` / `Spread` / `Aggravate`) is displayed, sourced strictly from the row's `reaction` field (even if the row's `label` has no reaction text).
2. **Given** a rotation row with no `reaction` field (`undefined`), **When** its breakdown row is rendered, **Then** an explicit muted `"No reaction"` marker is displayed.
3. **Given** any rotation breakdown row, **When** rendered, **Then** its `hitMode` (`Avg Hit`, `Crit Hit`, `Hit`, or `Global`) is displayed alongside its label, hit count, and reaction indicator.

---

### User Story 2 - Preset Rotation Summary Reaction & Hit Mode Display (Priority: P1)

When viewing a preset's rotation summary on the Presets page (`/presets`), the Optimize setup card (`/optimize`), or the Custom Teams live rotation preview (`/teams`), each rotation row displays the same reaction chip (or `"No reaction"` muted marker) and hit mode badge.

**Why this priority**: Ensures consistent rotation breakdown presentation across all views in the app.

**Independent Test**: Render `PresetRotationSummary` / preset rotation breakdown tables for a mixed-reaction preset and verify each row shows its label, count, reaction chip or `"No reaction"` marker, and hit mode.

**Acceptance Scenarios**:

1. **Given** a preset on `/presets` or `/optimize`, **When** the preset rotation summary is rendered, **Then** rows with `reaction` render the element-styled reaction chip, rows without `reaction` render `"No reaction"`, and all rows show their hit mode.

### Edge Cases

- **Label does not mention the reaction (or misleadingly mentions one)**: The UI reads `preset.rotation.targets[idx].reaction` directly and never parses `inst.label` or `rt.label`.
- **Fallback when `preset.rotation.targets[idx]` is missing in synthetic tests**: Defaults to `reaction = undefined` (`"No reaction"`) and `hitMode = 'avgHit'` (`"Avg Hit"`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every rotation breakdown row in `BuildComparisonList` (including the `Current` build and all optimized builds), `WeaponComparisonList`, the preset rotation summary on `/presets` and `/optimize`, and the live preview on `/teams` MUST display:
  1. A reaction chip (`Melt`, `Vaporize`, `Spread`, `Aggravate`) styled with the reacting element's colour tokens when `reaction` is defined on the rotation target.
  2. An explicit muted `"No reaction"` marker when `reaction` is undefined/empty on the rotation target.
  3. The row's hit mode (`Avg Hit`, `Crit Hit`, `Hit`, `Global`) read from `hitMode`.
- **FR-002**: Reaction and hit mode MUST be read from the structured `RotationTarget` fields (`reaction` and `hitMode`), never inferred from `label`.
- **FR-003**: Presentation only — no changes to preset rotation data, engine evaluation, solver rankings, or golden fixtures.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit tests verify that `BuildComparisonList` (both `Current` and `#1`), `WeaponComparisonList`, and `PresetRotationSummary` render element-styled reaction chips for reacting rows, `"No reaction"` muted markers for non-reacting rows, and hit mode badges, independent of row label text.
- **SC-002**: All existing tests, typechecks, lint, and production static export pass with zero regressions.

## Assumptions

- Element styling for reactions follows the app's existing mapping in `presets/page.tsx`: `melt` → `cryo`, `vaporize` → `hydro`, `spread` → `dendro`, `aggravate` → `electro`, using `ELEMENT_COLORS` from `@gi/presets`.
