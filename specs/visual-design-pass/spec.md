# Feature Specification: Visual Design Pass (`visual-design-pass`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Approved

## Summary

A cohesive, design-only pass across the app (`apps/web/src/app/globals.css`, `Identifier.tsx`, `OptimizeViews.tsx`, `ArtifactSetFilter.tsx`, `TilePickers.tsx`) to establish a consistent visual hierarchy, token system, fixed-template artifact cards, compact right-aligned stat tables, unmistakable chip/toggle states, and a tidy Pool Filters panel—with zero changes to behaviour, data, or computation, and byte-identical golden fixtures.

## Requirements

1. **Design Tokens First (`apps/web/src/app/globals.css`)**:
   - Define and apply a consistent token system in `:root`:
     - **Spacing scale**: `--space-1` (`0.25rem`), `--space-2` (`0.5rem`), `--space-3` (`0.75rem`), `--space-4` (`1rem`), `--space-5` (`1.25rem`), `--space-6` (`1.75rem`).
     - **Border radii**: `--radius-xs` (`4px`), `--radius-sm` (`6px`), `--radius-md` (`8px`), `--radius-lg` (`12px`), `--radius-pill` (`999px`).
     - **3 Surface Levels** with visibly distinct backgrounds:
       - Level 0 (Page): `--surface-page` / `--bg` (`#0d1017`)
       - Level 1 (Panel): `--surface-panel` / `--panel` (`#161b26`)
       - Level 2 (Raised Card / Sub-panel): `--surface-card` / `--surface-raised` / `--surface` (`#202736`), plus `--surface-inset` (`#11151f`) and `--control` (`#273044`)
     - **Text Hierarchy**: `--text-title`, `--text-section`, `--text-body`, `--text-muted` (`--muted`).
     - **Single Accent Usage Rule**: `--accent` (`#6ea0ff`), `--accent-strong` (`#8db6ff`), `--accent-bg` (`rgba(110, 160, 255, 0.18)`), `--accent-bg-strong` (`rgba(110, 160, 255, 0.28)`), `--accent-border` (`#6ea0ff`), `--accent-fg` (`#eef4ff`).
   - Existing components adopt these tokens instead of ad-hoc hex/pixel values.

2. **Fixed Card Template for Artifact Cards in Build Details (`ArtifactPieceRow` in `Identifier.tsx` + `.artifact-piece-card` in `globals.css`)**:
   - Header zone (`.artifact-piece-header`) has a reserved height (`2.65rem`) where the set name may wrap to 2 lines inside it, while the `+level` badge (`.artifact-piece-level`) stays pinned at the header's top-right (`align-self: start`), never pushed to a new line.
   - Followed by fixed rows (`grid-template-rows`) for:
     1. Header zone (`2.65rem`)
     2. RV row (`.artifact-piece-rv-row`, `1.55rem`)
     3. Main stat row (`.artifact-piece-main-row`, `1.75rem`)
     4. Substats block (`.artifact-piece-substats`, `2.9rem` / 2×2 grid)
     5. Owner row (`.artifact-piece-owner-row`, `1.85rem` — character badge or `"Unequipped"` placeholder + lock badge)
   - All 5 cards in `.comp-details-pieces` align horizontally across every zone regardless of set name length (including `"Shimenawa's Reminiscence"`).

3. **Stat Tables (`.comp-stat-diff-table` and label/value tables)**:
   - Numeric columns (`Current`, `This Build`, `Diff`, `Value`) sit in fixed-width right-aligned columns directly under their `<th>` headers (`text-align: right` on both `<th>` and `<td>`, fixed `width: 1%` / `min-width`, `white-space: nowrap`, `font-variant-numeric: tabular-nums`) with no large empty middle ground.
   - Row height is tightened to a compact density.

4. **Chip States Everywhere (Pool Filters, Set Filter, Pickers, Toggle Groups)**:
   - Selected chips (`.constraint-picker-chip.is-selected`, `.tile-picker-item.is-selected`, `.tile-picker-piece-btn[aria-pressed="true"]`, `.opt-filter-mode-group button[aria-pressed="true"]`, toggle groups like `All of` / `Any of`, `Minimum Rarity`, etc.) use a strong accent fill, bright accent border, and high-contrast foreground text so selected vs. unselected is unmistakable.
   - A panel's `"filters active"` count corresponds to visibly-active controls: in `SolverPoolFiltersPanel`, when `levelLow > 0 || levelHigh < 20`, `minRarity > 1`, or `minRv > 0`, the corresponding filter control card (`.opt-pool-filter-field.is-active`, `data-active="true"`) and active badge highlight unmistakably; when `requiredSubstats.length === 0`, the `All of` / `Any of` sub-mode toggle is styled as a secondary/neutral segmented control so it does not falsely appear as an active filter when 0 substats are selected.

5. **Pool Filters Panel Tidy-Up (`SolverPoolFiltersPanel` in `OptimizeViews.tsx` + `globals.css`)**:
   - Slot label column (`.opt-pool-slot-row`) gets a fixed width (`156px`) with `flex-wrap: nowrap` so chip rows for Sands, Goblet, and Circlet start at the exact same horizontal position (`x`).
   - Chip groups wrap cleanly as a block.
   - Bottom control row (`.opt-pool-filters-bottom-row`: level range, minimum rarity, minimum RV) uses one unified control card style and groups tightly (`justify-content: flex-start`, compact gap).

## Verification Cases

1. A build whose off-piece set name is long (`Shimenawa's Reminiscence`) produces 5 horizontally aligned artifact cards with identical zone heights and `+level` pinned top-right.
2. The Pool Filters panel with ONLY a level range set (`levelLow: 16, levelHigh: 20`) makes it visually obvious that the level range control is the active filter (`data-active="true"`, `.is-active`).
