# Feature Specification: Build Stat Diffs (`build-stat-diffs`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature: build-stat-diffs — In the optimize results, show stat differences vs the Current build wherever build comparison rows appear (normal results and weapon-compare rows)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Stat Comparison Against Current Build in Expanded Details (Priority: P1)

When viewing expanded Details on an optimized build row (in normal optimize results or weapon comparison results) when a Current build baseline exists, the user sees a core stat comparison for `HP`, `ATK`, `DEF`, `EM`, `ER`, `CR`, and `CD` showing `current value → this build's value → signed difference`, with increases highlighted in green (`ok`), decreases in red (`error`), and unchanged values in grey (`muted`).

**Why this priority**: Showing only total rotation damage delta (`+10.4%`) hides the stat trade-offs (e.g. gaining CRIT DMG while losing ER or HP) that explain why a build ranks higher or lower.

**Independent Test**: Render `BuildComparisonList` and `WeaponComparisonList` with a Current build baseline and an optimized build that increases HP and CRIT DMG, decreases ATK, and leaves DEF unchanged; verify the expanded Details render `current → build → signed diff` with `ok`, `error`, and `muted` classes respectively.

**Acceptance Scenarios**:

1. **Given** an optimized build row in `BuildComparisonList` with a `currentBuild` baseline, **When** its Details section is expanded, **Then** all 7 core stats (`HP`, `ATK`, `DEF`, `EM`, `ER`, `CR`, `CD`) display `current value → this build's value → signed difference` with `ok` (green) for increases, `error` (red) for decreases, and `muted` (grey) when unchanged.
2. **Given** a weapon build row in `WeaponComparisonList` with a Current build baseline, **When** its Details section is expanded, **Then** all 7 core stats display `current value → this build's value → signed difference` against the Current build.

---

### User Story 2 - Plain Core Stats When Build Is Current or No Baseline Exists (Priority: P1)

When the expanded row IS the Current build itself, or when no Current build baseline exists for the preset (e.g. an Akasha preset where the target character has no equipped artifacts in GOOD), the expanded Details display the build's plain core stats with no diff column.

**Why this priority**: Comparing the Current build against itself (`+0` across all rows) or showing empty diffs when no baseline exists adds visual noise.

**Independent Test**: Render `BuildComparisonList` with the `current` row expanded, and render `BuildComparisonList` / `WeaponComparisonList` with `currentBuild={null}`; verify plain core stats are shown without a diff column.

**Acceptance Scenarios**:

1. **Given** the `Current` build row in `BuildComparisonList` is expanded, **When** viewing its Details section, **Then** it renders plain core stats (`Stat` and `Value`) with no diff column.
2. **Given** `currentBuild` is `null` (no Current baseline exists for the preset) in `BuildComparisonList` or `WeaponComparisonList`, **When** any build's Details section is expanded, **Then** it renders plain core stats with no diff column.

### Edge Cases

- Flat stats (`HP`, `ATK`, `DEF`, `EM`) round to integers before computing the difference so `buildDisplay - currentDisplay === diffDisplay` with no rounding mismatch.
- Percentage stats (`ER`, `CR`, `CD`) convert from decimal ratios (`1.62` -> `162.0%`) and round to 1 decimal place (`0.1%` precision); differences within `< 0.05%` after rounding are treated as unchanged (`0.0%`, `muted`).
- Presentation-only change: build evaluation, ranking, and damage delta calculations remain untouched.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `BuildComparisonList` and `WeaponComparisonList`, expanding a build's Details MUST render a core stats section covering `HP`, `ATK`, `DEF`, `EM`, `ER`, `CR`, `CD` (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`).
- **FR-002**: When a Current baseline exists and the expanded row is not the Current build itself, each core stat row MUST show `current value → this build's value → signed difference`, styled with `ok` (green) for positive diffs, `error` (red) for negative diffs, and `muted` (grey) for zero diffs.
- **FR-003**: When the expanded row IS the Current build, or when no Current baseline exists for the preset, the core stats section MUST show plain stats with no diff column.
- **FR-004**: Build evaluation, ranking, and damage difference display MUST remain unchanged.

## Assumptions

- Core stats order follows `CORE_RESULT_STAT_KEYS`: `hp` (HP), `atk` (ATK), `def` (DEF), `eleMas` (EM), `enerRech_` (ER), `critRate_` (CR), `critDMG_` (CD).
- Negative stat differences use the typographic minus sign `−` (`\u2212`) in visible text and ASCII `-` in `data-diff-ascii`, matching `formatRelativeDelta`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit tests in `apps/web/test/OptimizeViews.test.tsx` verify stat comparison rendering (increases, decreases, unchanged) and plain-stat rendering (Current build row and missing-baseline cases) across both `BuildComparisonList` and `WeaponComparisonList`.
- **SC-002**: Full workspace `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` succeed with zero errors.
