# Research: Unified Identity Backgrounds & Rarity Borders (`rarity-border-tiles`)

## Decision 1: Background & Rarity Border Colour Sources

- **Decision**:
  - **Characters (`CharacterBadge`, `CharacterTilePicker`, `PresetTilePicker`)**:
    - Background: `meta.elementColor.bg` (from `ELEMENT_COLORS` in `@gi/presets/src/metadata`, e.g. `#142a42` for Hydro, `#3b2016` for Pyro, `#2b1d42` for Electro).
    - Border colour: `getRarityColor(meta.rarity).border` (`#f0be5b` for 5★, `#a375db` for 4★).
    - Border style: `solid` when the CDN portrait image is active, `dashed` when `onError` triggers the 2-letter initials fallback (`meta.elementColor.fg`).
  - **Weapons & Artifacts (`WeaponTilePicker`, `ArtifactSetTilePicker`, `ArtifactSetFilter`, `WeaponBadge`, `ArtifactBadge`)**:
    - Background: `ITEM_DARK_SURFACE_BG = '#151821'` (matching `--surface: #151821` in `apps/web/src/app/globals.css`).
    - Foreground (for SVG fallback icons and chip text): `'var(--fg)'`.
    - Border colour: `meta.rarityColor.border` (`#f0be5b` for 5★, `#a375db` for 4★, `#6ca6e8` for 3★, `#72cca0` for 2★, `#9aa2b0` for 1★).
- **Rationale**: Character portraits have a baked-in dark background that clashes with bright gold/purple rarity fill colours. Using `elementColor.bg` for characters and `#151821` for weapons/artifacts while moving rarity to the border unifies item presentation across every badge and picker tile.
- **Alternatives Considered**:
  - Semi-transparent rarity gradients behind character portraits — rejected because the specification explicitly defines the rule: *"background carries identity, border carries rarity"*.

## Decision 2: Non-Colour Picker Selection Indicator

- **Decision**: Selected picker tiles combine:
  1. A thicker rarity border on `.tile-picker-frame` (`3px` when selected vs `2px` when unselected, keeping the item's rarity border colour and `solid`/`dashed` state).
  2. A corner check marker badge (`<span data-testid="tile-selected-check" aria-hidden="true" className="tile-picker-check">✓</span>`) anchored to the top-right corner of the selected tile.
  3. Subtle elevation/overlay on `.tile-picker-item.is-selected` in `apps/web/src/app/globals.css`.
- **Rationale**: Because the frame border colour encodes rarity (`5★` gold, `4★` purple, `3★` blue, etc.), selection must never rely on changing the border colour alone. Combining a `3px` frame border with an explicit `✓` check marker badge makes selection unmistakable both visually and in component tests.
