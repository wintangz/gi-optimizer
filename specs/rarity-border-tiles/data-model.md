# Data Model & Component Contract: Unified Identity Backgrounds & Rarity Borders (`rarity-border-tiles`)

## Shared Surface Constant (`apps/web/src/lib/itemMeta.ts`)

```ts
/** Standard app dark surface colour (--surface in globals.css) used for weapon & artifact tiles/chips. */
export const ITEM_DARK_SURFACE_BG = '#151821'
```

## Colour Mapping Matrix

| Component | Element / Sub-element | Background | Border Width & Style | Border Colour | Selection Indicator |
|---|---|---|---|---|---|
| `CharacterBadge` | `[data-testid="character-avatar"]` (image state) | `meta.elementColor.bg` | `2px solid` (`34px` / `27px`) | `getRarityColor(meta.rarity).border` | N/A |
| `CharacterBadge` | `[data-testid="character-avatar"]` (fallback state) | `meta.elementColor.bg` | `2px dashed` (`30px` / `24px`) | `getRarityColor(meta.rarity).border` | N/A |
| `WeaponBadge` | `[data-testid="weapon-chip"]` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `1px solid` | `meta.rarityColor.border` | N/A |
| `ArtifactBadge` | `[data-testid="artifact-slot-strip"]` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `1px solid` | `meta.rarityColor.border` | N/A |
| `ArtifactBadge` | `[data-testid="artifact-set-chip"]` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `1px solid` | `meta.rarityColor.border` | N/A |
| `CharacterTilePicker` | `.tile-picker-frame` | `meta.elementColor.bg` | `2px` (`3px` when selected), `solid` (image) / `dashed` (fallback) | `getRarityColor(opt.rarity ?? meta.rarity).border` | `3px` border + `[data-testid="tile-selected-check"]` (`✓`) + `.is-selected` |
| `PresetTilePicker` | `.tile-picker-frame` | `meta.elementColor.bg` | `2px` (`3px` when selected), `solid` (image) / `dashed` (fallback) | `getRarityColor(meta.rarity).border` | `3px` border + `[data-testid="tile-selected-check"]` (`✓`) + `.is-selected` |
| `WeaponTilePicker` | `.tile-picker-frame` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `2px solid` (`3px solid` when selected) | `meta.rarityColor.border` | `3px` border + `[data-testid="tile-selected-check"]` (`✓`) + `.is-selected` |
| `ArtifactSetTilePicker` | `.tile-picker-frame` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `2px solid` (`3px solid` when selected) | `meta.rarityColor.border` | `3px` border + `[data-testid="tile-selected-check"]` (`✓`) + `.is-selected` |
| `ArtifactSetFilter` | `.tile-picker-frame` | `ITEM_DARK_SURFACE_BG` (`#151821`) | `2px solid` (`3px solid` when selected) | `meta.rarityColor.border` | `3px` border + `[data-testid="tile-selected-check"]` (`✓`) + `.is-selected` |
