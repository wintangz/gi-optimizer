# Feature Specification: Buffs & Passives Member Switcher Tabs & Worn-Set Filtering (`buff-panel-member-tabs`)

**Feature Branch**: `main` (`buff-panel-member-tabs`)  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature 2: buff-panel-member-tabs. The Buffs & Passives panel currently stacks all 4 members' toggles in one long section — overwhelming. Rework it: 1. Show ONE member at a time, with a character switcher at the top (member tiles like GO's team UI). Switching members preserves each member's toggle state and overrides — display change only, no change to how overrides apply to evaluate/optimize. 2. Only show an artifact set's toggles when that member actually wears 2pc or 4pc of the set in the current build context. A set worn as a single piece (or not worn) must not appear at all. 3. Everything else about the panel (grouping by source, toggle/state controls, reset to defaults) stays as is."

## Clarifications & Logged Assumptions

- **Single-Member View with Top Character Switcher (`gi-buffs-member-tabs`)**:
  - `ConditionalTogglePanel` renders a horizontal 4-member tile switcher bar (`role="tablist"`, `data-testid="buff-panel-member-tabs"`) at the top of the card, with one tab button per team member (`role="tab"`, `data-testid="member-buffs-tab-{characterKey}"`, `aria-selected`).
  - Each member tab tile displays the member's `CharacterBadge` (with `TARGET` / `SIM` role indicator), active buff count pill, and a `Modified` dot/badge if that member has active conditional overrides.
  - Default selected member is `preset.team[0]` (the target character). If the user switches presets and the previously selected character is not in the new team, selection falls back to `preset.team[0]`.
  - Only the active member's panel (`data-testid="member-buffs-panel-{characterKey}"`) is rendered below the tab switcher.
- **Override State Preservation**:
  - Per-member overrides remain stored in `settings.memberConditionals[preset.id][characterKey]`. Switching tabs only changes local UI tab state (`selectedMemberKey`) and never clears or alters any member's overrides or how `evaluatePreset` / `optimizePreset` consumes them.
- **2pc / 4pc Worn Artifact Set Gate**:
  - For any team member, an artifact set `setKey` is considered worn in the current build context if and only if that member's resolved piece count for `setKey` is `>= 2` (`(memberArtSets[setKey] ?? 0) >= 2`).
  - For the target (`idx === 0`) and `owned`-mode teammates, `memberArtSets` counts pieces equipped on that character in `good.artifacts`. For `tc`-mode simulated teammates, `memberArtSets` reads `member.build.tc.artifact.sets`.
  - Only artifact set conditionals whose `cond.sheet` has `(memberArtSets[cond.sheet] ?? 0) >= 2` are rendered in the `Artifact Set Effects` group. Sets worn as a single piece (`count === 1`) or not worn (`count === 0`) are never shown, and the previous "All Artifact Sets" expansion toggle is removed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Between Team Members One at a Time (Priority: P1)

When inspecting Buffs & Passives on `/optimize`, the user sees a 4-member tile switcher at the top and only the selected member's buffs panel below it, preventing a long 4-member wall of toggles while keeping every member's overrides intact across tab switches.

**Why this priority**: Directly addresses the overwhelming height and visual density of stacking all 4 team members' conditional groups simultaneously.

**Independent Test**: Render `ConditionalTogglePanel` with a 4-member preset; verify all 4 `member-buffs-tab-*` buttons render, only `member-buffs-panel-{team[0].key}` renders initially, toggling a buff on member 0 and clicking `member-buffs-tab-{team[3].key}` renders only member 3's panel, and switching back to member 0 preserves member 0's override.

**Acceptance Scenarios**:

1. **Given** `ConditionalTogglePanel` for `official/furina-salon-subdps`, **When** initially rendered, **Then** all 4 member tabs (`Furina`, `Neuvillette`, `KaedeharaKazuha`, `Zhongli`) are present in `[data-testid="buff-panel-member-tabs"]`, and only `[data-testid="member-buffs-panel-Furina"]` is rendered.
2. **Given** an override toggled on `Furina`, **When** the user clicks `[data-testid="member-buffs-tab-Zhongli"]`, **Then** `[data-testid="member-buffs-panel-Zhongli"]` renders, `[data-testid="member-buffs-panel-Furina"]` is not rendered, and `settings.memberConditionals` retains `Furina`'s override.

---

### User Story 2 - Hide Unworn and Single-Piece Artifact Sets (Priority: P1)

When viewing a member's `Artifact Set Effects` group, only artifact sets where that member wears at least 2 pieces (`2pc` or `4pc`) in the current build context appear. Sets with `0` or `1` pieces equipped do not appear at all.

**Why this priority**: Prevents irrelevant or inactive 1-piece off-set and unworn set toggles from cluttering the member's Artifact Set Effects section.

**Independent Test**: Render `ConditionalTogglePanel` where `Furina` wears 4pc `GoldenTroupe`, 1pc `MarechausseeHunter`, and 0pc `NoblesseOblige`; verify `GoldenTroupe` conditional row renders while neither `MarechausseeHunter` nor `NoblesseOblige` renders.

**Acceptance Scenarios**:

1. **Given** a member wearing 4pc `GoldenTroupe` (`count = 4`), 1pc `MarechausseeHunter` (`count = 1`), and 0pc `NoblesseOblige` (`count = 0`), **When** viewing that member's `Artifact Set Effects` group, **Then** `GoldenTroupe`'s toggle is shown and `MarechausseeHunter` and `NoblesseOblige` do not appear at all.
2. **Given** a member wearing 2pc `GoldenTroupe` (`count = 2`), **When** viewing that member's `Artifact Set Effects` group, **Then** `GoldenTroupe`'s toggle is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ConditionalTogglePanel` MUST render a top member tab switcher (`[data-testid="buff-panel-member-tabs"]`, `role="tablist"`) with one tile tab per team member (`[data-testid="member-buffs-tab-{characterKey}"]`, `role="tab"`).
- **FR-002**: `ConditionalTogglePanel` MUST render only the currently selected member's buffs panel (`[data-testid="member-buffs-panel-{characterKey}"]`) at a time, defaulting to `preset.team[0].key`.
- **FR-003**: Switching the active member tab MUST preserve all members' conditional states and overrides in `OptimizerSettings`.
- **FR-004**: `ConditionalTogglePanel` MUST filter each member's `category === 'artifact'` conditionals to only those sets where `(memberArtSets[cond.sheet] ?? 0) >= 2` in the current build context; sets with `0` or `1` piece worn MUST NOT appear at all.
- **FR-005**: Grouping by source (`weapon`, `artifact`, `character`, `constellation`), toggle/state controls, per-member Reset, and Reset All to Defaults MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit tests in `apps/web/test/ConditionalTogglePanel.test.tsx` verify single-member tab display, tab switching, override preservation across tabs, and hiding of `0pc` and `1pc` artifact sets while showing `2pc` and `4pc` artifact sets.
- **SC-002**: Full repository verification (`pnpm typecheck`, `pnpm lint`, `pnpm test`) passes with zero errors.
