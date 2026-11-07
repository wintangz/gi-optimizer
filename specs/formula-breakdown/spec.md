# Feature Specification: GO-Style Formula & Stat Breakdown (`formula-breakdown`)

**Feature Branch**: `formula-breakdown`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User request — in a build's Details (including Current), let the user expand any rotation damage row and any final stat into its breakdown sourced from the GO calc graph, reconciling within rounding.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Per-Damage-Row Formula Breakdown (Priority: P1)

In any build's expanded Details on `/optimize` (including `Current`, optimized `#1..#N` builds in `BuildComparisonList`, and weapon rows in `WeaponComparisonList`), clicking/expanding a rotation damage row reveals its contributing factors from the GO calculation graph:
- **Base Damage Components**: scaling stat value, talent multiplier %, any special multiplier, and any flat DMG increase / additive reaction bonus (`Spread` / `Aggravate`).
- **DMG Bonus (`1 + DMG%`)**: every active DMG% contributor grouped by source (`character`, `weapon`, `artifactSet`, `teamBuff`, `resonance`).
- **Crit Multiplier**: hit mode (`Avg Hit`, `Crit Hit`, `Hit`), effective CRIT Rate %, CRIT DMG %, and resulting multiplier.
- **Reaction Multiplier**: `1.0×` for non-amplifying hits, or amplifying reaction base multiplier (`1.5×` / `2.0×`), Elemental Mastery bonus %, reaction DMG bonus %, and resulting multiplier for `Melt` / `Vaporize`.
- **Enemy DEF & RES Multipliers**: character level, enemy level, DEF reduction/ignore, enemy elemental RES (base RES + RES shred contributors), and resulting DEF and RES multipliers.

**Why this priority**: Users need full GO-style transparency into why a damage row hits for a given number and which buffs/multipliers are active.

**Independent Test**: Evaluate a sample preset build (e.g., `official/furina-salon-subdps` and `official/mavuika-melt-hypercarry`) and assert that for every rotation damage row, the product of its breakdown factors reconciles with `perHit` (and `perHit * count * repeat` reconciles with `subtotal`) within rounding.

**Acceptance Scenarios**:

1. **Given** a build in `BuildComparisonList` (including `Current`) or `WeaponComparisonList`, **When** the user expands a rotation damage row, **Then** the row's formula breakdown is displayed with factors and contributors grouped by source (`character`, `weapon`, `artifactSet`, `teamBuff`, `resonance`, `enemy`).
2. **Given** any evaluated rotation row, **When** its breakdown factors are multiplied (`outerMulti * (baseDmg + dmgInc) * dmgBonusMulti * critMulti * ampMulti * defMulti * resMulti`), **Then** `reconciledPerHit` matches `perHit` within `1e-2` (and `reconciledSubtotal` matches `subtotal`).

---

### User Story 2 - Per-Final-Stat Breakdown (Priority: P1)

In any build's expanded Details (including `Current`), clicking/expanding any core final stat row (`HP`, `ATK`, `DEF`, `EM`, `ER`, `CR`, `CD`) reveals its base value plus every additive and percentage contribution with its source (`character`, `weapon`, `artifactSet`, `teamBuff`, `resonance`).

**Why this priority**: Lets users verify where every point of HP, ATK, CRIT, ER, or EM comes from (base stats, weapon, artifacts, artifact sets, team buffs, elemental resonance).

**Independent Test**: Evaluate a sample build and assert that for each core stat (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`), the sum of its breakdown contributors reconciles with `stats[statKey]` within rounding.

**Acceptance Scenarios**:

1. **Given** a build's core stat row in Details (`BuildStatComparisonSection`), **When** the user expands the stat row, **Then** the stat's base value and every percentage/additive contributor with its source category and value are displayed.
2. **Given** any evaluated build, **When** the contributors of each core stat are summed (`base + sum(base * pct_i) + sum(flat_j)` for HP/ATK/DEF, or `sum(contributors)` for EM/ER/CR/CD), **Then** `reconciledTotal` matches `stats[statKey]` within `1e-4`.

### Edge Cases

- Identity operands (`0` for `add`, `1` for `mul`) and empty conditional branches (`op.isEmpty`) in `UIData`'s `CalcResult` tree are excluded so only active contributors appear.
- When `teamBuff` nodes are collapsed by `asConst: true` in `uiDataForTeam`, the breakdown un-collapses each member's `teamBuff` node in `origin.child(own[from]).child(target[to])` so elemental resonance (`Resonance`), target self-buffs, and teammate buffs are accurately categorized and attributed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/engine/src/teamData.ts` MUST tag `effectiveResonanceData` with `inferInfoMut(effectiveResonanceData, 'Resonance' as never)` without altering any calculation values.
- **FR-002**: `session.evaluate()` in `packages/engine/src/session.ts` MUST extract `breakdown?: DamageRowBreakdown` on each `InstanceResult` and `statBreakdowns?: Record<string, StatBreakdown>` on `RotationResult` directly from the live `UIData` calculation graph.
- **FR-003**: `BuildComparisonList` (including `Current`), `WeaponComparisonList`, and `BuildStatComparisonSection` in `apps/web/src/components/OptimizeViews.tsx` MUST allow expanding any rotation damage row and any core final stat row to view its breakdown.

## Assumptions

- **A-001**: Equipped artifact raw stats (`input.art[statKey]`) are grouped under `artifactSet` (labeled `"Equipped Artifacts"`) so all 6 required source categories (`character`, `weapon`, `artifactSet`, `teamBuff`, `resonance`, `enemy`) cover every contributor cleanly.

## Success Criteria *(mandatory)*

- **SC-001**: Acceptance tests verify that for sample builds across bundled presets, every rotation damage row's breakdown reconciles with `perHit` and `subtotal`, and every core stat's breakdown reconciles with `stats[statKey]` within rounding.
- **SC-002**: Single-character optimization results and all golden fixtures remain byte-identical.
