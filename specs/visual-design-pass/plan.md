# Implementation Plan: Visual Design Pass (`visual-design-pass`)

## Technical Approach

1. **Design Tokens (`apps/web/src/app/globals.css`)**:
   - Define `:root` CSS custom properties for spacing (`--space-1`..`--space-6`), radii (`--radius-xs`..`--radius-pill`), 3 distinct surface levels (`--surface-page: #0d1017`, `--surface-panel: #161b26`, `--surface-card: #202736`, plus `--surface-inset: #11151f` and `--control: #273044`), text hierarchy (`--text-title`, `--text-section`, `--text-body`, `--text-muted`), and single accent rule (`--accent`, `--accent-strong`, `--accent-bg`, `--accent-bg-strong`, `--accent-border`, `--accent-fg`).
   - Refactor component rules across `globals.css` to reference these tokens instead of ad-hoc hex colors and pixel values.

2. **Fixed 5-Zone Artifact Card Template (`apps/web/src/components/Identifier.tsx` & `apps/web/src/app/globals.css`)**:
   - Update `ArtifactPieceRow` to render 5 explicit zones inside `.artifact-piece-card`:
     - `.artifact-piece-header` (`data-testid="artifact-piece-header"`): 2-column grid (`minmax(0, 1fr) auto`) with reserved height (`2.65rem`); `.artifact-piece-identity` holds slot icon + `ArtifactBadge` (allowing `[data-testid="artifact-set-chip"]` inside `.artifact-piece-card` to wrap up to 2 lines), while `.artifact-piece-level` (`+{level}`) is pinned to the top-right cell (`align-self: start`).
     - `.artifact-piece-rv-row` (`data-testid="artifact-piece-rv-row"`): fixed-height row (`1.55rem`) containing `ArtifactRvBadge` and optional `.artifact-piece-lock`.
     - `.artifact-piece-main-row` (`data-testid="artifact-piece-main-row"`): fixed-height row (`1.75rem`) containing the main-stat `StatChip`.
     - `.artifact-piece-substats` (`data-testid="artifact-piece-substats"`): fixed-height 2×2 grid (`2.9rem`, `grid-template-rows: repeat(2, 1.3rem)`) so 3-substat and 4-substat pieces have identical height.
     - `.artifact-piece-owner-row` (`data-testid="artifact-piece-owner-row"`): fixed-height bottom row (`1.85rem`) showing either `.artifact-piece-owner` (`CharacterBadge`) or a muted `.artifact-piece-unequipped` placeholder (`Unequipped`).

3. **Compact Right-Aligned Stat Tables (`OptimizeViews.tsx` & `globals.css`)**:
   - Update `BuildStatComparisonSection` (`<thead>` and `<tbody>` in `.comp-stat-diff-table`) so numeric `<th>` headers (`Current`, `This Build`, `Diff`, `Value`) carry `className="comp-stat-num"` and align right directly above their `<td>` cells.
   - Constrain `.comp-stat-diff-table` width (`max-width: 680px`) with `.comp-stat-col-label { width: 100%; }` and `.comp-stat-num { text-align: right; width: 1%; min-width: 88px; white-space: nowrap; }` plus compact row padding (`0.26rem 0.6rem`).

4. **Chip States & Pool Filters Tidy-Up (`OptimizeViews.tsx` & `globals.css`)**:
   - Add `.constraint-picker-chip` and `.constraint-picker-chip.is-selected` rules with strong accent background (`var(--accent-bg-strong)`), bright accent border (`var(--accent-border)`), and high-contrast text (`var(--accent-fg)`).
   - Add `.gi-toggle-btn` / `button[aria-pressed="true"]` styling so toggle groups (`All of` / `Any of`, `Minimum Rarity`, weapon compare mode bar, set filter mode buttons) have unmistakable active states.
   - In `SolverPoolFiltersPanel`:
     - Compute `levelFilterActive = (settings.levelLow ?? 0) > 0 || (settings.levelHigh ?? 20) < 20`, `rarityFilterActive = minRarity > 1`, `rvFilterActive = minRv > 0`, and `substatsFilterActive = requiredSubstats.length > 0`.
     - Annotate the 3 bottom-row `.opt-pool-filter-field` cards (`data-testid="pool-filter-field-level"`, `data-testid="pool-filter-field-rarity"`, `data-testid="pool-filter-field-rv"`) with `data-active={active ? 'true' : 'false'}` and `.is-active`, plus a visible `ACTIVE` pill badge on active bottom-row filter cards and active accent border on their inputs.
     - Fix `.opt-pool-slot-row` label column width (`156px`, `flex-wrap: nowrap`) so Sands, Goblet, and Circlet chip rows start at the exact same `x`.
