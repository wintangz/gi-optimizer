# Feature Specification: Weapon Comparison Follow-ups (`weapon-compare-followups`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "Feature: weapon-compare-followups — Two fixes to the weapon comparison results, from live use: 1. Badge styling: the 'CURRENT BASELINE' tag on a weapon row is rendered as bare coloured text while the 'Owned' tag is a pill badge — make CURRENT BASELINE the same pill-badge treatment as Owned (rounded, bordered, padded; its own colour is fine) and vertically centre it with the weapon name/spec line, matching Owned's alignment. 2. Top builds per weapon: a weapon row currently exposes only its single best build. Each weapon's expanded row must list its top 5 builds (fewer if fewer are feasible), ranked, each rendered like a normal optimize result (pieces, final stats, total). The engine's weapon-compare row should carry those top builds (the comparison always fetches up to 5 per weapon, independent of the single-run Top-N setting). The row header keeps the weapon's best total and % behind the leader; an 'unmet' row (no build meets the shared constraints) stays as it is."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pill-Badge Styling & Vertical Alignment for "Current Baseline" (Priority: P1)

In the Weapon Comparison selector and results list, the "Current Baseline" badge on a weapon row has the same rounded, bordered, padded pill-badge treatment and vertical centering as the "Owned" and "Unowned (Simulated)" badges.

**Why this priority**: Previously `.comp-baseline-tag` inherited `.comp-best-tag` text-only styles without the `.comp-owned-tag` pill border, border-radius, padding, and inline-flex vertical centering, making it look misaligned and inconsistent next to weapon rows.

**Independent Test**: Render `WeaponComparisonPanel` and `WeaponComparisonList` with an equipped baseline weapon and verify the baseline badge uses `.comp-baseline-tag` pill styling without bare-text `.comp-best-tag` overrides, matching `.comp-owned-tag` pill geometry and vertical alignment.

**Acceptance Scenarios**:

1. **Given** a weapon candidate marked `isEquippedBaseline: true`, **When** rendered in `WeaponComparisonPanel` or `WeaponComparisonList`, **Then** its "Current Baseline" badge is styled as a rounded, bordered, padded pill (`border-radius: 999px`, `border: 1px solid ...`, `padding: 0.12rem 0.42rem`, `display: inline-flex`, `align-items: center`, `align-self: center`) matching `Owned`.

---

### User Story 2 - Top 5 Ranked Builds per Weapon in Engine & UI (Priority: P1)

When Weapon Comparison runs, the engine always requests up to 5 builds (`WEAPON_COMPARE_TOP_N = 5`) per weapon regardless of `settings.topN`, evaluates each returned build, and attaches `topBuilds` (ranked `#1..#k`, up to 5) on each `WeaponCompareRowResult`. Expanding a weapon row in `WeaponComparisonList` displays its ranked top builds (up to 5, or fewer if fewer are feasible), each showing its rank, total rotation DMG, equipped artifact pieces, and final stats.

**Why this priority**: A user comparing weapons needs to inspect not just the single #1 artifact combination for a weapon, but the top 5 artifact builds for that weapon (for example, to see closely ranked builds or alternative artifact piece combinations).

**Independent Test**:
1. Run `compareWeapons` with `settings.topN = 1` on a pool with ≥ 5 feasible builds and verify each `'ok'` weapon row carries `topBuilds.length === 5` (sorted descending by `total`, ranked `1..5`), while `'unmet'` rows keep `topBuilds: []` and `bestBuild: null`.
2. Render `WeaponComparisonList` with an expanded weapon row containing multiple top builds and verify all top builds render in rank order with their totals, artifact pieces, and final stats, while the weapon row header keeps the weapon's #1 best total and `%` behind leader.

**Acceptance Scenarios**:

1. **Given** `settings.topN` is set to `1` (or `3` or `10`), **When** `compareWeapons` (or the Optimize page's Weapon Comparison runner) executes, **Then** each weapon solver run requests `topN: 5` and populates `row.topBuilds` with up to 5 evaluated, ranked builds (fewer if fewer builds are feasible).
2. **Given** a weapon comparison row with `status === 'ok'` and multiple builds in `row.topBuilds`, **When** the weapon row is expanded in `WeaponComparisonList`, **Then** it lists all `topBuilds` (up to 5) in rank order (`#1..#k`), each rendered with its total rotation damage, 5 artifact pieces, and 7 core final stats, while the weapon row header continues to show the weapon's #1 best total and `%` behind leader.
3. **Given** a weapon row with `status === 'unmet'`, **When** rendered in `WeaponComparisonList`, **Then** it remains unexpandable and displays `"No build meets constraints"`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `.comp-baseline-tag` in `apps/web/src/app/globals.css` and `apps/web/src/components/OptimizeViews.tsx` MUST share the pill-badge layout properties of `.comp-owned-tag` (`display: inline-flex`, `align-items: center`, `align-self: center`, `padding: 0.12rem 0.42rem`, `border-radius: 999px`, `border: 1px solid ...`, `font-size: 0.68rem`, `font-weight: 700`, `line-height: 1.2`) and vertically center with the weapon name/spec line.
- **FR-002**: `WeaponCompareRowResult` in `packages/engine/src/types.ts` MUST include `topBuilds: WeaponCompareBuildEntry[]` (each entry containing `rank`, `selection`, and `evaluation`), and `compareWeapons` in `packages/engine/src/session.ts` MUST always solve with `topN: 5` (`WEAPON_COMPARE_TOP_N = 5`) regardless of `settings.topN`.
- **FR-003**: `startWeaponComparison` in `apps/web/src/app/optimize/page.tsx` MUST request `topN: 5` per weapon and evaluate all returned builds (up to 5) into `row.topBuilds`.
- **FR-004**: Expanding a weapon row in `WeaponComparisonList` (`apps/web/src/components/OptimizeViews.tsx`) MUST list the weapon's `topBuilds` (up to 5, or fewer if fewer are feasible), ranked `#1..#k`, each displaying its pieces, final stats, total damage, and expandable rotation/stat breakdown details.

## Assumptions

- For backward compatibility with existing callers/tests that construct a `WeaponCompareRowResult` with `bestBuild` and `evaluation` without explicitly passing `topBuilds`, `rankWeaponCompareRows` / `rankWeaponComparisonRows` / `WeaponComparisonList` automatically synthesize a 1-element `topBuilds` array from `bestBuild` and `evaluation`.
- Within an expanded weapon row in `WeaponComparisonList`, build `#1` is expanded for rotation/stat breakdown details by default, and users can toggle details on any of the weapon's top 1–5 builds.

## Success Criteria *(mandatory)*

- **SC-001**: `Current Baseline` badge in weapon comparison config and result rows is styled as a pill badge matching `Owned` in geometry and vertical alignment.
- **SC-002**: `compareWeapons` always fetches up to 5 builds per weapon independent of `settings.topN`, and `WeaponComparisonList` renders all top builds (up to 5) inside an expanded weapon row.
- **SC-003**: Full test suite (`pnpm test`), `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass with zero regressions.
