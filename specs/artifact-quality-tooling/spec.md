# Feature Specification: Artifact Roll Value Tooling (`artifact-quality-tooling`)

**Feature Branch**: `artifact-quality-tooling`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User request — add GO-defined artifact Roll Value (RV) from the vendored GO roll tables as a single shared implementation, surfacing a compact RV badge on artifact pieces everywhere they are listed/displayed and per-substat roll breakdowns in piece details/tooltips.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared GO-Aligned Roll Value (RV) Calculation (Priority: P1)

Artifact Roll Value (RV) is computed from Genshin Optimizer's substat roll tables (`allStats.art.sub` in `vendor/genshin-optimizer/libs/gi/stats/Data/Artifacts/artifact_sub.json`): for each substat on a piece, its rolled value is decomposed against the rarity's roll tiers and divided by that stat's 5★ max single-roll value (`getSubstatValue(key, 5, 'max')`), then summed across all substats on the piece (`100%` = one 5★ max roll, up to `900%` for a 9-roll 5★ piece).

**Why this priority**: Provides a single authoritative RV implementation used across inventory views, optimizer build displays, and (in Feature 3) solver artifact pool filters.

**Independent Test**: Call `computeArtifactRollValue` on 5★ and 4★ artifacts with known substats and verify per-substat `maxRoll`, matched `rolls`, `rv`, and summed `totalRv` match GO's `getArtifactMeta` / `getArtifactEfficiency`.

**Acceptance Scenarios**:

1. **Given** a 5★ artifact with `critRate_: 3.89` (1 max roll) and `critDMG_: 15.5` (2 max rolls: `7.77 + 7.77 = 15.54`), **When** `computeArtifactRollValue` is called, **Then** `critRate_` reports `maxRoll = 3.89`, `rv = 100%`, `critDMG_` reports `maxRoll = 7.77`, `rolls = [7.77, 7.77]`, `rv = 200%`, and the piece's `totalRv` is `300%`.
2. **Given** any artifact piece across `@gi/good`, `@gi/presets`, `@gi/engine`, and `@gi/web`, **When** RV is needed, **Then** the single shared implementation in `@gi/good` (`computeArtifactRollValue`) is used without per-component duplication.

---

### User Story 2 - RV Badge & Per-Substat Roll Breakdown in UI (Priority: P1)

Wherever artifact pieces are listed or displayed (the Artifacts inventory table on `/import`, and `ArtifactPieceRow` in expanded build details of `BuildComparisonList` and `WeaponComparisonList` on `/optimize`), each piece displays a compact RV badge and exposes its per-substat roll breakdown (rolled value, roll count & individual roll tiers vs max roll, and substat RV%) in the piece/substat detail & tooltip.

**Why this priority**: Allows users to inspect artifact quality at a glance in both their inventory and optimizer results without affecting evaluation or solver rankings.

**Independent Test**: Render `ArtifactPieceRow` and the `/import` artifact row markup and verify the compact `artifact-rv-badge` and per-substat roll breakdown details/tooltips are present and accurate.

**Acceptance Scenarios**:

1. **Given** an artifact piece rendered via `ArtifactPieceRow` or in the `/import` inventory table, **When** displayed, **Then** a compact RV badge (`data-testid="artifact-rv-badge"`) shows the piece's total RV% and its detail/tooltip lists each substat's rolled value vs max roll, roll count, and substat RV%.
2. **Given** any evaluation or optimization run, **When** `artifact-quality-tooling` is active, **Then** all damage evaluations, solver rankings, and golden fixtures remain byte-identical.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Implement a single shared RV module in `packages/good/src/rv.ts` (re-exported by `@gi/good`, `@gi/presets`, and `@gi/engine`) using the exact substat roll tier tables from `vendor/genshin-optimizer/libs/gi/stats/Data/Artifacts/artifact_sub.json` and `artSubstatRollData` from `@genshin-optimizer/gi/consts`.
- **FR-002**: Render a compact `ArtifactRvBadge` on artifact pieces in `ArtifactPieceRow` (`apps/web/src/components/Identifier.tsx`) and in the Artifacts inventory table (`apps/web/src/app/import/page.tsx`), including per-substat roll breakdown details/tooltips on both the RV badge and each substat `StatChip`.
- **FR-003**: Display only — no changes to damage evaluation or optimization results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit tests verify `computeArtifactRollValue` against GO roll tables (per-substat roll decomposition, max roll, substat RV, and piece total RV) and verify UI rendering of `ArtifactRvBadge` and per-substat roll breakdown tooltips/details in `Identifier.test.tsx` and `OptimizeViews.test.tsx`.
- **SC-002**: All existing tests, typechecks, and lint checks pass with zero regressions.

## Assumptions

- Following Genshin Optimizer's `getArtifactMeta` / `getArtifactEfficiency` convention, RV is normalized against the 5★ max roll (`100%` per 5★ max roll) and displayed as a percentage (e.g. `450% RV`), while the per-substat breakdown shows both the individual roll tiers for the piece's rarity and the 5★ max roll reference.
