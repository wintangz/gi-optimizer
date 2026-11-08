# Feature Specification: Master Elemental Resonance Toggle (`resonance-master-toggle`)

**Feature Branch**: `main`  
**Created**: 2026-11-08  
**Status**: Ready  
**Input**: User description: "Feature: resonance-master-toggle — Add a master Elemental Resonance on/off control to the optimize flow: (1) The toggle lives with the per-preset optimizer settings (same persistence as the Buffs & Passives panel overrides — it is a user setting layered on the preset, never stored inside bundled preset data). (2) When OFF, no elemental resonance contributes anything for any element, regardless of team composition or trigger conditionals (Pyro ATK, Hydro HP, Cryo CR vs Frozen, Geo DMG, Dendro EM all suppressed). The existing per-trigger conditionals stay as they are and simply have no effect while the master is off. (3) Default is ON, which must reproduce current behaviour exactly: all existing golden fixtures byte-identical with the toggle untouched. (4) Applies consistently everywhere the setup is evaluated: single optimize, weapon compare, team-wide optimization, and the Current build evaluation — the Current baseline and the results must always use the same resonance state. (5) The control is visible in the Buffs & Passives area as a team-level switch labelled 'Elemental Resonance', showing ON/OFF state unambiguously; when off, the formula breakdown contains no Elemental Resonance group. (6) Acceptance: on the Skirk freeze preset, toggling resonance off drops the target's CR by exactly the resonance amount (15.0% vs Frozen) and reduces the rotation total; toggling back on restores the original totals bit-for-bit."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Per-Preset Master Elemental Resonance Toggle in Buffs & Passives (Priority: P1)

Users optimizing a character or team can toggle a team-level master "Elemental Resonance" switch (ON/OFF) inside the Buffs & Passives panel. The toggle defaults to ON and persists per preset in user optimizer settings alongside conditional overrides without modifying bundled preset definitions or discarding individual resonance trigger conditional states.

**Why this priority**: Players frequently want to evaluate or optimize builds without assuming elemental resonance (e.g., in co-op, Theater, Stygian Onslaught, or when Cryo resonance uptime against unfreezable bosses is unreliable) without having to edit team members or lose per-trigger conditional settings.

**Independent Test**: Render `ConditionalTogglePanel` for a preset, verify the team-level "Elemental Resonance" switch is visible and defaults to `ON` (`aria-checked="true"`), toggle it to `OFF` (`aria-checked="false"`), verify the per-preset setting is persisted in `OptimizerSettings` while existing per-trigger conditionals remain intact, and toggle it back `ON`.

**Acceptance Scenarios**:

1. **Given** a preset loaded in the Optimize flow with default settings, **When** the Buffs & Passives panel renders, **Then** a team-level switch labelled `"Elemental Resonance"` is displayed with an unambiguous `ON` state (`aria-checked="true"`).
2. **Given** the `"Elemental Resonance"` switch is clicked, **When** it transitions to `OFF` (`aria-checked="false"`), **Then** the override is saved under the active preset ID in `OptimizerSettings` without mutating the preset object or erasing any per-trigger conditional values.
3. **Given** the user switches to another preset and returns, **When** the original preset is selected again, **Then** its saved `"Elemental Resonance"` ON/OFF state is restored for that preset while other presets retain their own independent state (defaulting to `ON`).

---

### User Story 2 - Complete Suppression of All Elemental Resonances Across Evaluation & Optimization Modes (Priority: P1)

When the master Elemental Resonance toggle is OFF for a preset, no elemental resonance contributes any stat or damage bonus for any element (Pyro +25% ATK, Hydro +25% HP, Cryo +15% CRIT Rate vs Frozen/Cryo, Geo +15% Shield Strength / +15% DMG / -20% Geo RES, Dendro +50/+30/+20 EM, Anemo stamina/movement/CD reduction, and 4-element Protective Canopy RES) across Current build evaluation, single-character optimization, weapon comparison, and team-wide optimization. When OFF, neither stat breakdowns nor damage formula breakdowns include an `Elemental Resonance` contributor. When ON (default), all calculations and golden fixtures remain bit-for-bit identical.

**Why this priority**: Consistent evaluation between the Current build baseline and all optimization modes is essential so deltas (`Vs. Current`) and rankings are honest and never compare a resonance-on baseline against resonance-off results (or vice versa).

**Independent Test**: On `official/skirk-freeze` (and multi-element teams covering Pyro, Hydro, Cryo, Geo, and Dendro resonances), evaluate and optimize with resonance ON (default), then toggle resonance OFF and verify:
- On `official/skirk-freeze`, Skirk's final CRIT Rate drops by exactly `0.15` (`15.0%`), rotation total damage decreases accordingly, and no `Elemental Resonance` contributor appears in any damage factor or stat breakdown.
- Toggling resonance back ON restores the original CRIT Rate and rotation total bit-for-bit.
- Single optimize, weapon compare, team-wide optimization, and Current build evaluation all honor the same resonance state.

**Acceptance Scenarios**:

1. **Given** the `official/skirk-freeze` preset with default settings (`Elemental Resonance` ON), **When** `Elemental Resonance` is toggled OFF, **Then** Skirk's evaluated CRIT Rate (`stats.critRate_`) decreases by `15.0%` (`0.15`), the rotation total decreases, and the breakdown contains no `Elemental Resonance` (`category: 'resonance'`) entries.
2. **Given** `Elemental Resonance` is toggled back ON on `official/skirk-freeze`, **When** re-evaluated or re-optimized, **Then** Skirk's stats, instance damages, and rotation total match the initial ON values bit-for-bit.
3. **Given** teams with 2+ Pyro, 2+ Hydro, 2+ Cryo, 2+ Geo, or 2+ Dendro characters (including teams with explicit `teamConditional.resonance` trigger conditionals), **When** `Elemental Resonance` is OFF, **Then** every elemental resonance stat contribution is `0` across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.
4. **Given** `Elemental Resonance` is left at its default (ON / untouched), **When** the golden fixture suite runs, **Then** every golden fixture is byte-identical.

### Edge Cases

- **Explicitly authored `teamConditional.resonance` triggers in a preset**: Even if a preset or team conditional explicitly sets `Pyro: 'on'`, `ShatteringIce: 'on'`, `EnduringRock: 'on'`, `EnduringRockHit: 'on'`, `SprawlingCanopy2ele: 'on'`, or `SprawlingCanopy3ele: 'on'`, turning the master Elemental Resonance toggle OFF suppresses all resonance effects while preserving those trigger values in the preset/conditionals so they take effect again as soon as the master toggle is turned back ON.
- **Small teams (< 4 members) with 2+ same-element characters**: The small-team resonance synthesis path (`smallTeamEleCounts`) is also suppressed when the master toggle is OFF.
- **Sub-preset evaluation during multi-member rotations and Team-Wide Optimization (`buildMemberSubPreset`)**: Because sub-presets use a derived ID (`${preset.id}__member_${memberKey}`), resonance lookup resolves against both the sub-preset and root preset ID (and `BuildSelection.resonanceEnabled`), ensuring non-target rotation rows and team-wide optimization members always share the preset's master resonance state.
- **Reset All to Defaults in Buffs & Passives**: Clicking "Reset All to Defaults" in the Buffs & Passives panel resets the preset's master Elemental Resonance toggle back to ON alongside per-member conditional overrides.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `OptimizerSettings` in `@gi/presets` MUST support per-preset persistence of the master Elemental Resonance state (`resonanceEnabledByPreset?: Record<string, boolean>` and optional run-level `resonanceEnabled?: boolean`), defaulting to `true` (ON) when omitted, and never mutating bundled preset JSON data.
- **FR-002**: `@gi/presets` (and re-exports in `@gi/engine`) MUST provide helpers `getPresetResonanceEnabled(settings, presetId)` and `setPresetResonanceEnabled(settings, presetId, enabled)`, and `resetMemberConditionalOverrides(settings, presetId)` (when resetting all overrides for a preset) MUST also restore the preset's master resonance setting to default (`true`).
- **FR-003**: `BuildSelection`, `HydratePresetTeamOptions`, `optimize`, `compareWeapons`, and `optimizeTeam` in `@gi/engine` MUST propagate the effective `resonanceEnabled` boolean so that `hydratePresetTeam` and `getTeamData` / `getEffectiveResonanceData` suppress all elemental resonance buffs (`resonanceData` and small-team resonance buffs) whenever `resonanceEnabled === false`.
- **FR-004**: When `resonanceEnabled === false`, `extractDamageRowBreakdown` and `extractStatBreakdowns` MUST NOT emit any contributor with `category: 'resonance'` (`label: 'Elemental Resonance'`).
- **FR-005**: `ConditionalTogglePanel` in `apps/web/src/components/ConditionalTogglePanel.tsx` MUST render a team-level switch labelled `"Elemental Resonance"` showing its `ON` / `OFF` state unambiguously (`role="switch"`, `aria-checked`), wired to `setPresetResonanceEnabled`.
- **FR-006**: `apps/web/src/app/optimize/page.tsx` MUST include the active preset's `resonanceEnabled` state in Current build evaluation, single-weapon optimization + top-N build evaluation, weapon comparison + top-5 build evaluation, and team-wide optimization so baseline and results always use the same resonance state.

### Key Entities

- **`OptimizerSettings.resonanceEnabledByPreset`**: Map of `presetId -> boolean` stored in user optimizer settings in IndexedDB (`DEFAULT_OPTIMIZER_SETTINGS` has `{}` so all presets default to `true`).
- **`BuildSelection.resonanceEnabled`**: Optional boolean carried on evaluated/optimized build selections (`true` by default; `false` when master resonance is disabled for the run).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On `official/skirk-freeze`, toggling `Elemental Resonance` from ON to OFF reduces Skirk's evaluated CRIT Rate by exactly `15.0%` (`0.15`), removes `Elemental Resonance` from the breakdown, and reduces total rotation damage; toggling back to ON restores the original numbers bit-for-bit.
- **SC-002**: With `Elemental Resonance` OFF, Pyro, Hydro, Cryo, Geo, Dendro, Anemo, and 4-element Protective Canopy resonances contribute `0` across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.
- **SC-003**: With `Elemental Resonance` at its default (ON), all existing golden fixtures remain 100% byte-identical and the full test suite (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`) passes.

## Assumptions

- The master `"Elemental Resonance"` switch is placed in the team-level header area of the `Buffs & Passives` panel (`ConditionalTogglePanel`) so it is immediately visible regardless of which team member tab is currently selected.
- When a preset's `"Elemental Resonance"` is switched OFF, the `"Reset All to Defaults"` action in `ConditionalTogglePanel` becomes available even if no per-member conditional has been overridden, allowing one-click restoration of all Buffs & Passives defaults.
