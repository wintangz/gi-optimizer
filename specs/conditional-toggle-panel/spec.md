# Feature Specification: Team-Wide Conditional Buffs & Passives Toggle Panel (`conditional-toggle-panel`)

**Feature Branch**: `main` (`conditional-toggle-panel`)  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "Feature: conditional-toggle-panel. Run the full Spec Kit flow autonomously (specify → plan → tasks → implement → test) without asking me questions; log assumptions in the spec. Run after official-presets-owned-first. Commit as 'feat: conditional-toggle-panel' and push to origin main."

## Clarifications & Logged Assumptions

- **Catalog Source Grouping (`category` & `section`)**: `ConditionalDescriptor` (`packages/engine/src/types.ts` and `packages/engine/src/catalog.ts`) is enriched with `category?: 'weapon' | 'artifact' | 'character' | 'constellation'` and `section?: string`. Character sheet conditionals are classified as `'constellation'` when their GO sheet header action (`talents.constellation1..6`), outer talent key, or key prefix (`c1..c6`) belongs to a constellation, and `'character'` for normal/charged/plunging/skill/burst/passive1/passive2/passive3/resonance sections. Weapon sheet conditionals have `category: 'weapon'`, and artifact set sheet conditionals have `category: 'artifact'`.
- **Default Panel State Parity**: A shared pure helper `computeDefaultMemberConditionals` (`packages/engine/src/session.ts`) computes the exact pre-override conditional map for any team member `i` (`0..3`) — combining preset-authored conditionals (when applicable) with auto-derived boolean artifact-set conditionals (`getDefaultTargetArtifactSetConditionals()`), auto-populated weapon conditionals at max state (`listWeaponConditionals(activeWeaponKey)`), and the `ArchaicPetra` `ele -> element` bridge. When no user conditional overrides exist (`memberConditionalOverrides` empty), `applyMemberConditionalOverrides` returns the derived default map untouched, guaranteeing 100% byte-identical golden fixtures across all official and Akasha presets.
- **Per-Member Override Persistence & Engine Propagation**:
  - `OptimizerSettings` (`packages/presets/src/settings.ts`) gains `memberConditionalOverrides?: Record<string, PresetMemberConditionalOverrides>` keyed by `[presetId][characterKey][sheetKey][condKey]`.
  - Setting a conditional to `'off'` (or `''`) explicitly disables that conditional (and removes any legacy alias key on the same sheet, e.g., `GoldenTroupe.offField`, `MarechausseeHunter.stacks`, `ObsidianCodex.set2`/`set4`, `ArchaicPetra.ele`, `Zhongli.nearShield`) even when the preset or auto-derivation defaulted it to `'on'`.
  - Setting a conditional to an active state key (e.g., `'on'`, `'activeInArea'`, `'hydro'`, `'200'`, `'3'`) activates that state in both `session.evaluate` and `session.optimize` (where `GOSolver` scores candidate builds under the user's conditional state, including the target's own set conditionals).
  - Each member's panel provides a per-member **Reset** button (`resetMemberConditionalOverrides(settings, presetId, characterKey)`) that clears that member's overrides and restores the derived default state and rotation total.
- **Presentation & Visual Design**: The `ConditionalTogglePanel` component (`apps/web/src/components/ConditionalTogglePanel.tsx`) renders on `/optimize` (and `/presets`), presenting each team member with an image-led `CharacterBadge` header, active weapon/set badges (`WeaponBadge`, `ArtifactBadge`), grouped sections with SVG glyphs (`WeaponTypeIcon`, `SetEmblemIcon`, `ElementIcon`), boolean switch buttons (`role="switch"`) for single-state conditionals, and state/stack `<select>` pickers (plus quick on/off switch) for multi-state conditionals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Panel State Matches Derived Defaults & Preserves All Totals (Priority: P1)

When opening the "Buffs & Passives" panel for any bundled Official, Akasha, or User preset without making changes, every team member (`0..3`) displays their effective conditionals (preset-authored + auto-derived weapon and artifact-set conditionals), and both evaluation and optimization reproduce today's exact totals.

**Why this priority**: Ensures complete transparency of active buffs without altering default rotation math or breaking golden/isolation invariants.

**Independent Test**: Compute default panel state and evaluate both a bundled Official preset (`official/furina-salon-subdps`, `official/mavuika-melt-hypercarry`) and a bundled Akasha preset (`akasha/furina-splendor-c2`, `akasha/hutao-double-hydro-homa-c1`); assert totals are identical to the baseline golden fixtures.

**Acceptance Scenarios**:

1. **Given** a bundled Official preset and a bundled Akasha preset, **When** `ConditionalTogglePanel` renders with default settings (no overrides), **Then** each member's panel reflects the exact effective conditionals and `session.evaluate` / `session.optimize` produce the exact baseline totals.

---

### User Story 2 - Toggling Any Conditional Immediately Updates Evaluation & Optimization for Any Member (Priority: P1)

When the user toggles a conditional (such as a weapon passive, artifact set effect, character talent/passive, or constellation effect) on the target or any supporting teammate, the override applies immediately to both `session.evaluate` and `session.optimize`.

**Why this priority**: Gives users full control over every buff assumption in their rotation and solver search, just like Genshin Optimizer.

**Independent Test**: Flip a named weapon conditional off (e.g. `SplendorOfTranquilWaters` on Furina, `StaffOfHoma` on Hu Tao, or `ThrillingTalesOfDragonSlayers` on Citlali) and assert the target's evaluated and optimized rotation total decreases; flip a disabled buff on and assert the total increases.

**Acceptance Scenarios**:

1. **Given** a preset where a member has an active weapon conditional (e.g. `ThrillingTalesOfDragonSlayers.Heritage = 'on'` on Citlali or `StaffOfHoma.es50 = 'on'` on Hu Tao or `SplendorOfTranquilWaters.hpChange = '3'` on Furina), **When** that weapon conditional is flipped to `'off'`, **Then** `session.evaluate` and `session.optimize` immediately reflect the lower total without that weapon passive.
2. **Given** a target character wearing or optimizing for `GoldenTroupe`, **When** the user toggles `GoldenTroupe.set4` to `'off'`, **Then** both `evaluate` and `optimize` score builds with `GoldenTroupe` 4pc off-field bonus disabled.

---

### User Story 3 - Persistence Across Settings Round-Trip & Per-Member Reset (Priority: P1)

User conditional overrides persist in `OptimizerSettings.memberConditionalOverrides` across settings save/load round-trips, and clicking a member's **Reset** button clears that member's overrides and restores the exact default total.

**Why this priority**: Preserves user customization across sessions while providing a one-click escape hatch back to preset/derived defaults.

**Independent Test**: Save `OptimizerSettings` with a conditional override, serialize/deserialize through `migrateOptimizerSettings`, verify the override is preserved and produces the overridden total, then call `resetMemberConditionalOverrides` (or click Reset in the UI) and assert the default total is restored.

**Acceptance Scenarios**:

1. **Given** a conditional override applied via `setMemberConditionalOverride`, **When** settings are saved and reloaded via `migrateOptimizerSettings`, **Then** the override survives intact and produces the same overridden total.
2. **Given** a member with one or more conditional overrides, **When** the user clicks **Reset** on that member's panel, **Then** that member's overrides are removed and the rotation total returns to the exact default baseline.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ConditionalDescriptor` (`packages/engine/src/types.ts`, `packages/engine/src/catalog.ts`) MUST classify every catalog conditional into `category: 'weapon' | 'artifact' | 'character' | 'constellation'`.
- **FR-002**: `OptimizerSettings` (`packages/presets/src/settings.ts`) MUST persist per-preset, per-member conditional overrides in `memberConditionalOverrides?: Record<string, PresetMemberConditionalOverrides>` and expose helpers `getPresetConditionalOverrides`, `setMemberConditionalOverride`, `resetMemberConditionalOverrides`, and `hasMemberConditionalOverrides`.
- **FR-003**: `hydratePresetTeam`, `evaluate`, `optimize`, and `exportGODatabase` (`packages/engine/src/session.ts`) MUST apply `memberConditionals` overrides on top of derived default conditionals for all team members (`0..3`) and include `memberConditionals` in `presetTeamFingerprint`.
- **FR-004**: `ConditionalTogglePanel` (`apps/web/src/components/ConditionalTogglePanel.tsx`) MUST render a "Buffs & Passives" panel for every team member (`0..3`), grouped by source (`Weapon Passives`, `Artifact Set Effects`, `Character Talents & Passives`, `Constellation Effects`), with image-led member headers (`CharacterBadge`), source icons, boolean switches (`role="switch"`), multi-state `<select>` pickers, and per-member **Reset** buttons.
- **FR-005**: With no overrides, all 11 golden fixtures (`packages/engine/test/golden/*.json`) and Akasha isolation tests MUST remain 100% unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New tests pin: (a) default panel state reproduces current totals for a bundled official and a bundled Akasha preset; (b) flipping a named weapon conditional off changes the target's total in the expected direction; (c) an override survives a settings save/load round-trip; (d) reset restores the default total.
- **SC-002**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with zero errors and all golden fixtures remain byte-identical.
