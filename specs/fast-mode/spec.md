# Feature Specification: Fast Mode (Per-Teammate Virtual 6th Artifact)

**Feature Branch**: `fast-mode`
**Created**: 2026-11-08
**Status**: Approved
**Input**: User description: "Add 'Fast Mode': a per-teammate what-if tool that behaves like giving the teammate a virtual 6th artifact."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inject Virtual 6th Artifact Stat Lines on Non-Target Teammates (Priority: P1)

As a theorycrafter or player optimizing a target character, I want to add positive or negative stat lines onto a virtual 6th artifact piece for any non-target teammate (flat HP/ATK/DEF, HP%, ATK%, DEF%, EM, ER%, CR%, CD%) so that the teammate's final stats and every scaling team buff recompute as if their real artifacts carried those extra rolls, without modifying their equipped artifacts, weapon, artifact sets, constellation, or conditional toggles.

**Why this priority**: Core mathematical and evaluation behavior of Fast Mode; required for accurate "what-if" teammate investment analysis (e.g. "+40 EM on Kazuha", "+20% HP on Furina", "+15% ATK on Shenhe").

**Independent Test**: Evaluate a preset with a Kazuha teammate (e.g. `official/neuvillette-hypercarry`), add `+40 EM` (`eleMas: 40`) to Kazuha via Fast Mode, and verify Kazuha's final EM increases by `40`, Kazuha's A4 Poetics of Fuubutsu DMG% buff increases by `1.6%`, and the target's rotation total matches giving Kazuha a real `+40 EM` artifact change bit-for-bit.

**Acceptance Scenarios**:

1. **Given** any preset with all Fast Mode values empty, **When** evaluated or optimized, **Then** every existing golden fixture is byte-identical.
2. **Given** a preset with a Kazuha non-target teammate, **When** `+40 EM` (`eleMas: 40`) is added to Kazuha's Fast Mode virtual piece, **Then** the target's rotation total changes by the exact same amount as giving that Kazuha a real `+40 EM` artifact change (`tc` substat or `owned` artifact substat).
3. **Given** a non-target teammate with negative Fast Mode values (e.g. `-40 EM` or `-10% HP`), **When** evaluated or optimized, **Then** the negative stat lines subtract at the artifact layer (`art` namespace) and reduce the teammate's final stats and scaling buffs accordingly.
4. **Given** the optimization target (slot 0 / `preset.target`), **When** parsing a preset, resolving settings, or evaluating/optimizing, **Then** the optimization target can never receive a virtual piece.
5. **Given** Single Weapon optimize mode (`optimizeMode === 'single'`) or Weapon Compare mode (`optimizeMode === 'compare'`), **When** optimization runs, **Then** Fast Mode values apply to non-target teammates (set once and shared across weapon compare candidates); **Given** Team Optimize mode (`optimizeMode === 'team'` / `session.optimizeTeam`), **Then** Fast Mode is not available and any stored Fast Mode values are suppressed.

---

### User Story 2 - Teammate Cards with Base & Final Stats, Fast Mode Badge, Typed Lines, and Reset (Priority: P2)

As a user on the Optimize page (`/optimize`) or Teams editor (`/teams`), I want teammate cards to display both Base and Final stats (where Finals reflect the virtual piece), visibly badge any member with Fast Mode values, show the typed stat lines, allow adding/editing/removing stat lines, and provide a per-member reset button.

**Why this priority**: Surfaces both Base and Final teammate stats (improving on GO which only shows Final stats) and gives users direct, transparent control over each teammate's virtual 6th artifact.

**Independent Test**: Render the Optimize page with a preset loaded, verify each non-target teammate card displays both Base and Final stats (`HP`, `ATK`, `DEF`, `EM`, `ER%`, `CR%`, `CD%`), enter `+40 EM` on a teammate, verify the `Fast Mode` badge and `+40 EM` stat line render, verify Final EM updates while Base EM stays unchanged, and verify clicking the per-member Reset button clears the virtual piece and badge.

**Acceptance Scenarios**:

1. **Given** a preset loaded on `/optimize`, **When** viewing the Team section in `single` or `compare` mode, **Then** each non-target teammate card displays both **Base** and **Final** stats and Fast Mode controls, while the target character has no Fast Mode controls.
2. **Given** a teammate with one or more non-zero Fast Mode stat lines, **When** rendered, **Then** the teammate card shows a visible `Fast Mode` badge, displays the typed stat lines with their formatted values, and enables the per-member Reset button.
3. **Given** the user switches `/optimize` to `Optimize Team` mode (`optimizeMode === 'team'`), **When** viewing the page, **Then** Fast Mode controls are hidden/unavailable.

---

### User Story 3 - Persistence in Preset Data (User Presets) & Per-Preset Settings (Bundled Presets) (Priority: P3)

As a user, I want Fast Mode values to be saved with the preset — stored inside the preset data (`member.fastMode`) for user presets and stored in the per-preset `OptimizerSettings` layer (`fastModeByPreset`) for bundled Official and Akasha presets — so my what-if adjustments persist across reloads without mutating bundled preset JSON files.

**Why this priority**: Ensures seamless persistence across user-created and bundled presets while respecting the read-only bundled preset invariant.

**Independent Test**: Save Fast Mode values on a bundled preset (stored in `OptimizerSettings.fastModeByPreset[presetId]`) and on a user preset (stored in `preset.team[idx].fastMode`), reload, and verify both persist and round-trip cleanly.

**Acceptance Scenarios**:

1. **Given** a bundled preset (`source === 'official' | 'akasha'`), **When** the user edits Fast Mode values on `/optimize`, **Then** the values are saved in `OptimizerSettings.fastModeByPreset[preset.id]` in IndexedDB and bundled preset data remains untouched.
2. **Given** a user preset (`source === 'user'`), **When** the user edits Fast Mode values on `/optimize` or `/teams`, **Then** the values are saved on `preset.team[idx].fastMode` in the user preset data.

### Edge Cases

- Entering `0`, empty string, or `NaN` for a Fast Mode stat line removes that stat key rather than storing a zero-valued entry; when all stat keys are removed, the member is no longer badged as having Fast Mode.
- Percentage artifact stats (`hp_`, `atk_`, `def_`, `enerRech_`, `critRate_`, `critDMG_`) are authored and stored in human percentage points (e.g. `20` = `+20%`, `-10` = `-10%`), matching `TcBuild.artifact.substats.stats` and `StatConstraint`, and converted via `toDecimal(v, k)` (`v / 100`) to `percent(v / 100)` when injected into GO's `art` namespace.
- Flat artifact stats (`hp`, `atk`, `def`, `eleMas`) are authored and stored as raw numbers (e.g. `40` = `+40 EM`, `-100` = `-100 ATK`) and injected as `constant(v)` into GO's `art` namespace.
- If a user changes the target character in `/teams` (`setTargetChar`), any `fastMode` on the newly promoted slot-0 target member is stripped so the optimization target can never hold a virtual piece.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Support the 10 artifact stat types (`hp`, `hp_`, `atk`, `atk_`, `def`, `def_`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`) with positive or negative finite numbers on a per-teammate virtual 6th artifact (`FastModeStats`).
- **FR-002**: Inject non-target teammate Fast Mode values at the `art` namespace of that member's GO `Data` bundle in `getTeamData` / `getCharDataBundle`, leaving real artifacts, `artSet` counts, weapon, character, constellation, and conditional toggles untouched.
- **FR-003**: Enforce that the optimization target (slot 0 / `preset.target`) can never receive a virtual piece in schema parsing, settings resolution, evaluation, or optimization.
- **FR-004**: Apply Fast Mode in single-character optimize (`optimize`), evaluation (`evaluate`), and weapon comparison (`compareWeapons`, shared across candidates), and suppress Fast Mode in team-wide optimization (`optimizeTeam`) and when `optimizeMode === 'team'`.
- **FR-005**: Compute and expose both `base` and `final` stats (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`) for every team member in `RotationResult.memberStats`, where `final` reflects any active Fast Mode virtual piece.
- **FR-006**: Render teammate cards displaying both Base and Final stats, a visible `Fast Mode` badge when active, the typed stat lines, inline editing controls for adding/updating/removing stat lines, and a per-member Reset button.
- **FR-007**: Persist Fast Mode values in `TeamMember.fastMode` for user presets (`source === 'user'`) and in `OptimizerSettings.fastModeByPreset[presetId]` for bundled presets (`source === 'official' | 'akasha'`).

### Key Entities

- **`FastModeStatKey`**: One of `'hp' | 'hp_' | 'atk' | 'atk_' | 'def' | 'def_' | 'eleMas' | 'enerRech_' | 'critRate_' | 'critDMG_'`.
- **`FastModeStats`**: `Partial<Record<FastModeStatKey, number>>` mapping artifact stat keys to non-zero finite values (human percentage points for `_*` keys, flat values for `hp`/`atk`/`def`/`eleMas`).
- **`PresetFastModeMap`**: `Record<string, FastModeStats>` keyed by teammate `characterKey`.
- **`MemberStatSummary`**: `{ base: Record<string, number>; final: Record<string, number> }` for each team member on `RotationResult.memberStats`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With all Fast Mode values empty, 100% of existing golden fixtures in `packages/engine/test/golden/` remain byte-identical.
- **SC-002**: Adding `+40 EM` to a Kazuha teammate via Fast Mode produces the exact same target rotation total change as giving that Kazuha a real `+40 EM` artifact change.
- **SC-003**: Teammate cards display both Base and Final stats (`HP`, `ATK`, `DEF`, `EM`, `ER%`, `CR%`, `CD%`), badge active Fast Mode members, list typed lines, and reset per member.

## Assumptions

- **A-001**: Percentage stats in `FastModeStats` use human percentage points (`20` = `+20%`), consistent with `TcBuild.artifact.substats.stats` and `StatConstraint` across `@gi/presets`.
- **A-002**: For `MemberStatSummary`, `base` reports `input.base.hp`, `input.base.atk`, `input.base.def` (character + weapon base) and pre-artifact character+weapon baseline (`input.premod[k] - input.art[k]`) for `eleMas`, `enerRech_`, `critRate_`, `critDMG_`; `final` reports `input.total[k]` for all 7 core stats (`hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`).
