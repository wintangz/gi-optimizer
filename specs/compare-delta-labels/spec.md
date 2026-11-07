# Feature Specification: Compare Delta Labels (`compare-delta-labels`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Draft
**Input**: User description: "In weapon comparison results, a weapon row's delta is relative to the overall #1 leader weapon, while an expanded top-build card's delta is relative to that weapon's own #1 best build. Both currently render bare '0.0%' / '−X.X%' chips, so they are misread as the same measure. Label both unambiguously so the reference baseline ('vs. leader' vs. 'vs. weapon best') is immediately clear."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unambiguously Label Weapon-Row Deltas vs. Leader and Top-Build Deltas vs. Weapon Best (Priority: P1)

When viewing weapon comparison results and expanding a weapon row to inspect its top 5 builds, the user sees two different relative percentage deltas:
1. The weapon summary row's delta (`weapon-compare-delta-${wKey}`), which compares that weapon's best build against the overall `#1` leader weapon.
2. Each expanded top-build card's delta (`weapon-compare-build-delta-${wKey}-${bIdx}`), which compares that build against that weapon's own `#1` best build.

Both must explicitly state their comparison baseline (`vs. leader` and `vs. weapon best`) in visible text and tooltips so they cannot be confused.

**Why this priority**: Without explicit labels, a `#2` weapon (`−10.0%` behind the `#1` weapon) shows `0.0%` on its first expanded build card and `−1.9%` on its second, which looks contradictory if both appear to be on the same scale.

**Independent Test**: Render `WeaponComparisonList` with multiple weapons and multiple top builds per weapon, and assert that weapon-row deltas display `vs. leader` (`data-delta-scope="leader"`) while top-build deltas display `vs. weapon best` (`data-delta-scope="weapon-best"`) with matching tooltips.

**Acceptance Scenarios**:

1. **Given** a weapon row in `WeaponComparisonList` (`#1` leader at `0.0%` or `#2` at `−10.0%`), **When** rendered, **Then** `weapon-compare-delta-${wKey}` displays `0.0% vs. leader` or `−10.0% vs. leader`, carries `data-delta-scope="leader"`, and has a descriptive `title` referencing the `#1` leader weapon.
2. **Given** an expanded top-build card inside a weapon row (`#1` build at `0.0%` or `#2` build at `−1.9%`), **When** rendered, **Then** `weapon-compare-build-delta-${wKey}-${bIdx}` displays `0.0% vs. weapon best` or `−1.9% vs. weapon best`, carries `data-delta-scope="weapon-best"`, and has a descriptive `title` referencing that weapon's best build.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `WeaponComparisonList` weapon-row delta (`weapon-compare-delta-${wKey}`) MUST render `${behindText} vs. leader` with `data-delta-scope="leader"` and a `title` attribute explaining comparison against the `#1` leader weapon.
- **FR-002**: `WeaponComparisonList` top-build card delta (`weapon-compare-build-delta-${wKey}-${bIdx}`) MUST render `${buildBehindText} vs. weapon best` with `data-delta-scope="weapon-best"` and a `title` attribute explaining comparison against that weapon's best build.
- **FR-003**: Presentation only — no change to computed numbers, rankings, or stored data; all golden fixtures remain byte-identical.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every weapon-row delta in `WeaponComparisonList` explicitly labels its baseline as `vs. leader`.
- **SC-002**: Every top-build delta in `WeaponComparisonList` explicitly labels its baseline as `vs. weapon best`.

## Assumptions

- Existing `data-delta-ascii` and `data-pct-behind` attributes remain unchanged (`"0.0%"` / `"-10.0%"`) so programmatic consumers of raw delta values are unaffected.
