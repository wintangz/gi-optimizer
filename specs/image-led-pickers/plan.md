# Implementation Plan: Image-Led Tile Grid Pickers (`image-led-pickers`)

**Branch**: `image-led-pickers` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/image-led-pickers/spec.md)  
**Input**: Feature specification from `specs/image-led-pickers/spec.md`

## Summary

Replace list-style item pickers across `/optimize`, `/presets`, and `/teams` with image-led tile grids (`WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`, and tile-grid `ArtifactSetFilter`) where each tile displays a `56–60px` item image on its rarity-colour background, the item's name as a small caption below, a clear selected ring, hover/focus-visible states, dimmed disabled tiles, and per-tile `onError` fallback to the previous glyph/initials treatment.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (static export)  
**Primary Dependencies**: React (`useState`, `useMemo`), existing `@gi/presets` metadata & CDN URL helpers (`getCdnIconUrl`, `getCdnArtifactIconUrl`, `getRarityColor`, `getWeaponMeta`, `getCharacterMeta`, `getArtifactMeta`)  
**Testing**: Vitest (`apps/web/test/TilePickers.test.tsx`, `apps/web/test/ArtifactSetFilter.test.tsx`)  
**Constraints**: Plain `<img>` elements, zero new dependencies, `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and golden fixtures untouched.

## Project Structure

### Documentation (this feature)

```text
specs/image-led-pickers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css            # .tile-picker-* grid, tile, image frame, caption, selected ring, hover/focus/disabled styles
│   │   ├── optimize/page.tsx      # Use PresetTilePicker, WeaponTilePicker (Akasha & Owned), CharacterTilePicker (Protected)
│   │   ├── presets/page.tsx       # Use CharacterTilePicker (Target filter), WeaponTilePicker (Akasha & Owned)
│   │   └── teams/page.tsx         # Use CharacterTilePicker (Target & Add Teammate), WeaponTilePicker (TC), ArtifactSetTilePicker (TC)
│   └── components/
│       ├── ArtifactSetFilter.tsx  # Convert set list to image-led flower-icon tile grid with 2pc/4pc/Both controls
│       └── TilePickers.tsx        # Shared WeaponTilePicker, CharacterTilePicker, ArtifactSetTilePicker, PresetTilePicker
└── test/
    ├── ArtifactSetFilter.test.tsx # Verify ArtifactSetFilter tile grid + flower CDN URLs + piece controls + fallback
    └── TilePickers.test.tsx       # Verify WeaponTilePicker, CharacterTilePicker, ArtifactSetTilePicker CDN URLs, selection callbacks, disabled state, and onError fallback
```
