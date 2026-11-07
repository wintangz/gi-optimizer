# Specification Quality Checklist: Visual Design Pass (`visual-design-pass`)

- [x] Design tokens defined in `globals.css` (spacing scale, border radii, 3 surface levels, text hierarchy, single accent usage rule)
- [x] Fixed 5-zone card template for artifact cards in build Details (reserved header height, 2-line set name wrap, `+level` pinned top-right, fixed rows for RV, main stat, substats, and owner)
- [x] Stat tables use compact density and fixed-width right-aligned numeric columns directly under headers
- [x] Selected chips and toggle groups are unmistakably distinct from unselected states
- [x] Pool Filters panel active filter count corresponds to visibly active controls (including level range only)
- [x] Pool Filters slot label column has fixed width so Sands/Goblet/Circlet chips start at the same `x`, and bottom controls group tightly with unified styling
- [x] Zero behaviour, data, or computation changes; golden fixtures byte-identical
