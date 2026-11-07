# Research: Buffs & Passives Member Switcher Tabs & Worn-Set Filtering (`buff-panel-member-tabs`)

## Current Implementation Analysis

1. **Multi-Member Stacking**:
   - `apps/web/src/components/ConditionalTogglePanel.tsx` currently maps over `preset.team.slice(0, 4)` inside `.gi-buffs-member-grid` and renders all 4 member cards simultaneously, with per-member `collapsedMembers` show/hide buttons.
2. **Artifact Set Filtering**:
   - Lines 445–470 of `ConditionalTogglePanel.tsx` previously built `relevantArtSetKeys` using `cnt >= 2 || isTarget` (which allowed 1pc sets on the target), plus `Object.keys(member.conditional)` and `Object.keys(settings.setFilterSelection)`, and included a `showAllArtSetsByMember` button (`All Artifact Sets (N) ▾`).

## Design Decisions

1. **GO-Style Member Tile Switcher (`gi-buffs-member-tabs`)**:
   - Compute resolved build, active counts, and override status for all 4 team members so each member tab tile (`data-testid="member-buffs-tab-{mKey}"`) shows:
     - `CharacterBadge` (`compact`, with `TARGET` / `SIM` role tag)
     - `{activeCount} active` pill and `Modified` indicator when overridden
   - Render only the selected member's `.gi-buffs-member-card` (`data-testid="member-buffs-panel-{mKey}"`, `role="tabpanel"`) below `.gi-buffs-member-tabs`.
   - Remove the obsolete per-member collapse button (`collapsedMembers`).
2. **Strict 2pc / 4pc Worn-Set Gate**:
   - Replace `relevantArtSetKeys` and `showAllArtSetsByMember` with:
     ```ts
     const visibleArtifactConditionals = memberCatalog.filter(
       (c) => c.category === 'artifact' && (memberArtSets[c.sheet] ?? 0) >= 2
     )
     ```
   - This guarantees that any set with `0` or `1` piece worn in the current build context never appears in the `Artifact Set Effects` group.
