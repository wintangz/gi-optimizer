# Research: Optimize Filter Panels Matched Pair Alignment (`optimize-panels-alignment`)

## Root Cause of Misalignment

1. **Missing Outer Card on `ArtifactSetFilter`**:
   - In `apps/web/src/app/optimize/page.tsx`, the left column was wrapped in `<div className="preset-provenance-box">` (`background: #151821; border: 1px solid var(--border); padding: 0.75rem;`) while the right column (`<ArtifactSetFilter />`) rendered a bare flex `<div>` with no border, background, or padding.
2. **Mismatched Vertical Rows Above `.tile-picker-grid`**:
   - `ArtifactSetFilter` rendered 3 rows above `.tile-picker-grid`: (1) title + summary, (2) 3-button mode selector, (3) search input + bulk buttons.
   - Protected Characters rendered a single text div followed by `<CharacterTilePicker>`, which omitted its search input when `options.length <= 8` (`searchable = options.length > 8`) and had no subbar row corresponding to the mode selector.
3. **Unaligned Grid Stretching**:
   - `.tile-picker-grid` used `max-height: 256px` without a fixed matched height or `align-content: start`, causing panels with fewer tiles to be shorter than panels with 41 artifact sets.

## Solution Design

- Introduce `.opt-filter-pair` (`grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 1rem;`) and `.opt-filter-panel` (`background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.85rem; display: flex; flex-direction: column; gap: 0.55rem; height: 100%;`).
- Give both panels 4 aligned vertical slots:
  1. `.opt-filter-panel-header` (`height: 1.5rem`)
  2. `.opt-filter-panel-subbar` (`height: 2rem`)
  3. `.tile-picker-toolbar` (`height: 2.1rem`)
  4. `.tile-picker-grid` (`flex: 1 1 auto; height: 260px; max-height: 260px; overflow-y: auto; align-content: start;`)
- Flatten `CharacterTilePicker`'s wrapper inside `.opt-filter-panel` (`flex: 1; display: flex; flex-direction: column; gap: 0.55rem; min-height: 0;`) and always pass `searchable={true}` so `.tile-picker-toolbar` and `.tile-picker-grid` align pixel-for-pixel with `ArtifactSetFilter`.
