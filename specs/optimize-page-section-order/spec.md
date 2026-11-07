# Feature Specification: Optimize Page Section Order (`optimize-page-section-order`)

**Feature Branch**: `main`  
**Created**: 2026-11-08  
**Status**: Draft  
**Input**: User description: "Reorder the optimize page's settings into a logical top-to-bottom flow. Currently it runs: weapon picker → artifact set filter → Buffs & Passives → constraints → Optimize. Change the section order to: 1. Team & buffing settings first: the team members (owned/sim choices) and the Buffs & Passives panel — everything that comes from other team members. 2. Weapon selection next: the target's weapon picker, including the single/compare mode switch. 3. Artifact settings after that: the artifact set filter + protected characters panels (kept as their matched pair) together with the stat constraints card. 4. The Optimize action and results last. This is a pure reorder/regrouping of existing sections: no change to any setting's behaviour, state, defaults, or persistence, and no change to results rendering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Logical Top-to-Bottom Section Flow on Optimize Page (Priority: P1)

When configuring an optimization run on `/optimize`, the page sections appear in a logical top-to-bottom order:
1. **Team & buffing settings**: Preset selection, team member roster (with owned/simulated toggles), rotation summary, and the Buffs & Passives (`ConditionalTogglePanel`) panel.
2. **Weapon selection**: Optimization mode switch (`Single Weapon` / `Compare Weapons` / `Optimize Team`) and the target's weapon picker (`WeaponComparisonPanel` in compare mode, target weapon picker on Akasha/official presets, and target character/weapon requirement check).
3. **Artifact settings**: Artifact pool controls, the Protected Characters + Artifact Set Filter matched pair, deep solver pool filters, and the Final Stat Constraints (`ConstraintsCard`) card.
4. **Optimize action and results**: The Results card containing the Optimize / Compare Weapons / Optimize Team action button and build comparison results.

**Independent Test**: Render `/optimize` and verify the top-to-bottom DOM order of the sections matches `Team & Buffs & Passives → Weapon Selection (mode switch + weapon picker) → Artifact Settings (Protected Characters + Artifact Set Filter pair + Stat Constraints) → Optimize Action & Results`, while all interactive controls preserve their existing state and behavior.

**Acceptance Scenarios**:

1. **Given** an active preset on `/optimize`, **When** the page renders, **Then** the team member roster (`preset-team-roster`) and Buffs & Passives panel (`conditional-toggle-panel`) appear before the weapon mode switcher (`optimize-weapon-mode-bar`) and target weapon picker.
2. **Given** an active preset on `/optimize`, **When** the page renders, **Then** the weapon mode switcher and target weapon picker appear before the Protected Characters + Artifact Set Filter matched pair (`optimize-filter-panels-pair`) and the Constraints card (`constraints-card`).
3. **Given** an active preset on `/optimize`, **When** the page renders, **Then** the Protected Characters + Artifact Set Filter matched pair and the Constraints card appear before the Optimize action button (`run-optimize-btn`) and Results card (`results-card`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Optimize page MUST render team & buffing settings first: preset selector, team member roster (`preset-team-roster` with owned/simulated toggles), rotation summary, and the Buffs & Passives panel (`ConditionalTogglePanel`).
- **FR-002**: The Optimize page MUST render weapon selection second: the weapon optimization mode bar (`optimize-weapon-mode-bar`) and target weapon picker / weapon comparison panel / weapon requirement check.
- **FR-003**: The Optimize page MUST render artifact settings third: artifact pool settings, the Protected Characters + Artifact Set Filter matched pair (`optimize-filter-panels-pair`), deep artifact pool filters (`SolverPoolFiltersPanel`), and the Final Stat Constraints card (`ConstraintsCard`).
- **FR-004**: The Optimize page MUST render the Optimize action and results card (`results-card`) fourth (last).
- **FR-005**: All setting behaviors, state, defaults, persistence, and results rendering MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Top-to-bottom DOM order on `/optimize` strictly satisfies: `preset-team-roster` < `conditional-toggle-panel` < `optimize-weapon-mode-bar` < target weapon picker < `optimize-filter-panels-pair` < `constraints-card` < `results-card` (`run-optimize-btn`).
- **SC-002**: All existing unit, UI, and golden fixture tests pass without regression.
