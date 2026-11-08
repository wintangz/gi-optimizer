# Feature Specification: Per-Effect Elemental Resonance Controls (`resonance-effects`)

**Feature Branch**: `main`  
**Created**: 2026-11-08  
**Status**: Ready  
**Input**: User description: "PROMPT 2 — resonance-effects. Replace the single vague 'Elemental Resonance' on/off row with a per-effect resonance list, the way Genshin Optimizer presents it:
- The resonance area lists EVERY resonance the current team composition triggers, one row per resonance: its name (e.g. Shattering Ice, Soothing Water — take names and effect descriptions from the vendored GO resonance data, never from memory), a plain-language line stating what it gives (e.g. '+15% CRIT Rate against Frozen enemies'), and its OWN on/off switch.
- A resonance whose trigger condition involves a further condition (e.g. Cryo resonance's Frozen requirement) keeps that condition visible in its description; its existing trigger conditional, if any, stays as it is.
- The existing master 'Elemental Resonance' switch stays above the list as an all-on/all-off control. Master ON + every effect ON = current behaviour, byte-identical: all existing goldens pass unchanged.
- Per-effect states are USER SETTINGS layered on the preset (same settings layer as the master switch) — never written into bundled preset data. Changing presets or team composition re-derives which resonances are listed; a stored per-effect state applies only while that resonance is triggered by the team.
- Evaluation honours each effect's switch independently in EVERY path: single-character evaluate/optimize, weapon compare, team-wide optimization, and the Current-build baseline. Resonance effects are independent — turning one off must not affect another resonance's contribution.
ACCEPTANCE: on the Skirk freeze preset, the list shows Shattering Ice with its +15% CRIT Rate vs Frozen description; switching only it off drops the target's CRIT Rate by exactly 15.0% and lowers the total, switching it back restores the original total bit-for-bit. On a team triggering two resonances, each is listed and toggles independently (prove with a test where one is off and the other's contribution is unchanged). Full test suite green, goldens byte-identical at defaults."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Per-Effect Triggered Elemental Resonance List & Switches in Stage 3 (Priority: P1)

Users configuring a preset or custom team in Stage 3 (`Team & Buffs`) see the master `"Elemental Resonance"` switch at the top of the resonance area followed by one row for each elemental resonance triggered by the current 4-member team composition (e.g. `Shattering Ice` on `official/skirk-freeze`, `Soothing Water` on double-Hydro teams, or two rows on 2+2 dual-resonance teams). Each row displays the resonance's canonical name and description sourced from vendored Genshin Optimizer localization data (`elementalResonance_gen.json` and `elementalResonance.json`), a plain-language summary of what it grants (preserving any secondary condition such as Frozen/Cryo-affected opponents for `Shattering Ice`, shield/Moondrift state for `Enduring Rock`, or Dendro reaction triggers for `Sprawling Greenery`), and its own independent `ON`/`OFF` switch.

**Why this priority**: A single all-or-nothing resonance toggle forces players on dual-resonance teams (such as 2 Hydro + 2 Cryo, 2 Pyro + 2 Hydro, or 2 Pyro + 2 Electro) to disable reliable resonances (like `+25% Max HP` from `Soothing Water` or `+25% ATK` from `Fervent Flames`) just to turn off an conditional resonance (like `+15% CRIT Rate` against Frozen enemies from `Shattering Ice` against unfreezable bosses), and hides which resonances the team actually activates.

**Independent Test**: Render `ConditionalTogglePanel` for `official/skirk-freeze` and for a dual-resonance team (e.g. 2 Pyro + 2 Hydro or 2 Cryo + 2 Hydro). Verify the triggered resonance rows render with vendored GO names, plain-language + condition descriptions, and individual `role="switch"` controls that persist per preset in `OptimizerSettings` without mutating bundled preset JSON.

**Acceptance Scenarios**:

1. **Given** `official/skirk-freeze` (`Skirk`, `Escoffier`, `Furina`, `Shenhe` — 3 Cryo + 1 Hydro), **When** the resonance area renders, **Then** the master `"Elemental Resonance"` switch (`ON`) is shown above a single triggered resonance row for `"Shattering Ice"` displaying its `+15% CRIT Rate` against Frozen / Cryo-affected opponents description and its own `ON` switch (`aria-checked="true"`).
2. **Given** a team composition triggering two resonances (e.g. 2 Pyro + 2 Hydro triggering `"Fervent Flames"` and `"Soothing Water"`, or 2 Cryo + 2 Hydro triggering `"Soothing Water"` and `"Shattering Ice"`), **When** the resonance area renders, **Then** both triggered resonances are listed in canonical GO order with their own independent `ON`/`OFF` switches.
3. **Given** the user switches a single resonance effect `OFF`, **When** settings update, **Then** the per-effect state is stored in `OptimizerSettings.resonanceEffectsByPreset[presetId]` without modifying the bundled preset JSON or other resonance effects' states.
4. **Given** a preset or team composition changes, **When** the resonance list re-derives from the active team members, **Then** only resonances triggered by the current team are listed and applied; any stored per-effect state for a non-triggered resonance remains inert unless the team triggers that resonance.

---

### User Story 2 - Independent Per-Effect Resonance Evaluation Across All Engine & UI Paths (Priority: P1)

When an individual elemental resonance effect is switched `OFF` (while the master switch is `ON`), the engine suppresses only that resonance's stat and damage contributions across Current build evaluation, single-character optimization, weapon comparison, and team-wide optimization, while leaving all other triggered resonances' contributions completely unchanged. When the master switch is `ON` and all triggered effects are `ON` (default), evaluation and optimization remain 100% bit-for-bit identical to existing golden fixtures.

**Why this priority**: Per-effect switches must be honoured consistently in every evaluation and optimization mode so that build rankings, stat displays, and `Vs. Current` deltas always reflect the exact combination of enabled resonances.

**Independent Test**:
1. On `official/skirk-freeze`, evaluate with default settings (`Shattering Ice` ON), switch only `Shattering Ice` OFF (`resonanceEffects: { ShatteringIce: false }`), verify Skirk's `stats.critRate_` drops by `0.15` (`15.0%`) and `total` decreases, then switch `Shattering Ice` back ON and verify `stats.critRate_` and `total` match the original values bit-for-bit.
2. On a dual-resonance team (e.g. 2 Pyro + 2 Hydro triggering `Fervent Flames` `+25% ATK` and `Soothing Water` `+25% Max HP`, or 2 Cryo + 2 Hydro triggering `Shattering Ice` `+15% CRIT Rate` and `Soothing Water` `+25% Max HP`), toggle one resonance OFF and verify its stat contribution drops to `0` while the other resonance's stat contribution (`+25% Max HP` or `+25% ATK`) remains bit-for-bit identical across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.

**Acceptance Scenarios**:

1. **Given** `official/skirk-freeze` with Master ON, **When** `ShatteringIce` is switched OFF, **Then** Skirk's final CRIT Rate (`stats.critRate_`) drops by exactly `15.0%` (`0.15`), total rotation damage decreases, and switching `ShatteringIce` back ON restores the original CRIT Rate and total damage bit-for-bit.
2. **Given** a team triggering two resonances (`FerventFlames` and `SoothingWater`, or `SoothingWater` and `ShatteringIce`), **When** one resonance is switched OFF and the other remains ON, **Then** the disabled resonance contributes `0` while the enabled resonance's stat contribution is unchanged across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.
3. **Given** Master ON and all per-effect switches at default (ON), **When** the golden fixture test suite runs, **Then** all golden fixtures pass byte-identically.

---

### Edge Cases

- **Master switch interaction with per-effect switches**:
  - When Master `"Elemental Resonance"` is switched `OFF`, all resonance effects are suppressed (`resonanceEnabled = false`) and all listed effect rows display `OFF`.
  - When Master `"Elemental Resonance"` is switched back `ON`, it acts as an all-on control: if any per-effect switches were `OFF` (or when toggling Master from `OFF` to `ON`), all triggered effects are restored to `ON`.
  - If Master is `OFF` and the user clicks an individual effect's switch to turn that effect `ON`, Master becomes `ON` with that clicked effect `ON` (and other triggered effects `OFF`).
- **4-distinct-element teams (`Protective Canopy`)**: A 4-member team with 4 distinct elements triggers `Protective Canopy` (`+15% All Elemental RES & +15% Physical RES`), which can also be toggled `ON`/`OFF` independently.
- **Preservation of existing trigger conditionals**: Turning `ShatteringIce`, `EnduringRock`, or `SprawlingGreenery` `OFF` via the user settings layer never mutates `preset.teamConditional.resonance` or discards authored trigger conditional states (`ShatteringIce`, `EnduringRock`, `EnduringRockHit`, `SprawlingCanopy2ele`, `SprawlingCanopy3ele`).
- **Sub-preset evaluation (`buildMemberSubPreset`)**: Sub-presets created for multi-member rotations or `optimizeTeam` (`${preset.id}__member_${memberKey}`) inherit `resonanceEffectsByPreset` from the root `preset.id` (just like `resonanceEnabledByPreset`).
- **Reset All to Defaults**: Clicking `"Reset All to Defaults"` in Stage 3 clears both `resonanceEnabledByPreset[presetId]` and `resonanceEffectsByPreset[presetId]`, restoring Master and all resonance effects to `ON`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `@gi/presets` MUST consume resonance names and descriptions from the vendored Genshin Optimizer localization files (`vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en/elementalResonance_gen.json` and `vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/elementalResonance.json`) and expose `listTriggeredResonances(teamOrPreset)` returning every resonance triggered by a team composition in canonical GO order (`ProtectiveCanopy`, `FerventFlames`, `SoothingWater`, `ShatteringIce`, `HighVoltage`, `ImpetuousWinds`, `EnduringRock`, `SprawlingGreenery`).
- **FR-002**: Each `TriggeredResonanceDescriptor` returned by `listTriggeredResonances` MUST include the canonical `key` (`ResonanceEffectKey`), `element`, vendored GO `name`, vendored GO `desc`, a plain-language summary line (`plainSummary`) stating the buff and keeping any secondary trigger condition visible (e.g. `"+15% CRIT Rate against Frozen or Cryo-affected enemies"` for `Shattering Ice`), and `triggerConditionalKeys`.
- **FR-003**: `OptimizerSettings` in `@gi/presets` MUST support per-preset, per-effect user settings via `resonanceEffectsByPreset?: Record<string, ResonanceEffectsStateMap>` and optional run-level `resonanceEffects?: ResonanceEffectsStateMap` (defaulting to all `true` / `{}` in `DEFAULT_OPTIMIZER_SETTINGS`), with helpers `getPresetResonanceEffects`, `isPresetResonanceEffectEnabled`, `setPresetResonanceEffectEnabled`, and `hasDisabledResonanceEffects`.
- **FR-004**: `resetMemberConditionalOverrides(settings, presetId)` (when resetting all overrides for a preset) MUST also clear `resonanceEffectsByPreset[presetId]` alongside `resonanceEnabledByPreset[presetId]`.
- **FR-005**: `BuildSelection`, `HydratePresetTeamOptions`, `hydratePresetTeam`, `hydrateTeamIntoDb`, `getEffectiveResonanceData`, `evaluate`, `optimize`, `compareWeapons`, `optimizeTeam`, and `runSolver` in `@gi/engine` MUST honour `resonanceEffects` independently for each resonance effect so disabling one resonance removes only that resonance's nodes while leaving other triggered resonances untouched.
- **FR-006**: `ConditionalTogglePanel` in `apps/web/src/components/ConditionalTogglePanel.tsx` MUST render the master `"Elemental Resonance"` switch above the list of triggered resonances (`data-testid="team-resonance-effects-list"`), where each triggered resonance row (`data-testid="resonance-effect-row-<key>"`) displays its name, plain-language + vendored GO description (with any further condition visible), and its own `ON`/`OFF` switch (`data-testid="resonance-effect-toggle-<key>"`).
- **FR-007**: `apps/web/src/app/optimize/page.tsx` MUST propagate `activeResonanceEffects` across Current build evaluation, single-character optimization + top-N build evaluation, weapon comparison + top-5 build evaluation, and team-wide optimization.

### Key Entities

- **`ResonanceEffectKey`**: `'ProtectiveCanopy' | 'FerventFlames' | 'SoothingWater' | 'ShatteringIce' | 'HighVoltage' | 'ImpetuousWinds' | 'EnduringRock' | 'SprawlingGreenery'`.
- **`ResonanceEffectsStateMap`**: `Partial<Record<ResonanceEffectKey, boolean>>`.
- **`TriggeredResonanceDescriptor`**: Metadata and plain-language/vendored GO description for a resonance triggered by a team composition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On `official/skirk-freeze`, Stage 3 lists `Shattering Ice` with its `+15% CRIT Rate` vs Frozen description; switching only `Shattering Ice` OFF drops Skirk's evaluated CRIT Rate by `15.0%` (`0.15`) and lowers total rotation damage; switching it back ON restores the original CRIT Rate and total damage bit-for-bit.
- **SC-002**: On a team triggering two resonances, both resonances are listed in the UI and toggle independently; in engine evaluation and optimization (`evaluate`, `optimize`, `compareWeapons`, `optimizeTeam`), turning one resonance OFF removes only its contribution while the other resonance's contribution remains bit-for-bit unchanged.
- **SC-003**: With Master ON and all per-effect switches at default (ON), all golden fixtures are 100% byte-identical and `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

## Assumptions

- When a team has fewer than 4 members or triggers no 2-of-an-element / 4-distinct-element resonance, the triggered resonance list is empty (or shows a muted note that no elemental resonance is active) while the master row remains visible.
- Clicking the master `"Elemental Resonance"` switch to turn it ON clears any `false` per-effect overrides for that preset so that turning the master switch ON acts as a true all-on control.
