# Implementation Plan: Unified Identity Backgrounds & Rarity Borders (`rarity-border-tiles`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/rarity-border-tiles/spec.md)  
**Input**: Feature specification from `/specs/rarity-border-tiles/spec.md`

## Summary

Unify how item imagery sits in badges and picker tiles across `@gi/web` so that **background carries identity** and **border carries rarity**:
1. **Characters (`CharacterBadge`, `CharacterTilePicker`, `PresetTilePicker`)**: `background = meta.elementColor.bg`, `border colour = getRarityColor(rarity).border`. `CharacterBadge` preserves its exact `badge-image-state-style` rules (`2px solid` + `34px`/`27px` when image loads; `2px dashed` + `30px`/`24px` on `onError` initials fallback).
2. **Weapons & Artifacts (`WeaponTilePicker`, `ArtifactSetTilePicker`, `ArtifactSetFilter`, `WeaponBadge`, `ArtifactBadge`)**: `background = ITEM_DARK_SURFACE_BG` (`#151821`), `border colour = meta.rarityColor.border`.
3. **Non-Colour Picker Selection**: Selected tiles render a thicker rarity border on `.tile-picker-frame` (`3px` vs `2px`) plus an explicit check marker badge (`[data-testid="tile-selected-check"]` displaying `✓`) and `.tile-picker-item.is-selected` container elevation.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 16 (`output: 'export'`)  
**Primary Dependencies**: None added (existing `@gi/presets`, `@gi/good`, React 19)  
**Storage**: N/A  
**Testing**: Vitest (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`)  
**Target Platform**: Static web export (`apps/web/out`)  
**Project Type**: pnpm monorepo web application (`apps/web`)  
**Constraints**: Never edit `vendor/genshin-optimizer`; keep `packages/engine`, `packages/presets`, and golden fixtures untouched; zero new dependencies.

## Constitution Check

- **Zero submodule edits**: `vendor/genshin-optimizer` untouched.
- **Engine/presets/goldens untouched**: Only `apps/web` files and `specs/rarity-border-tiles/` are modified.
- **Static export compatibility**: Plain `<img>` and inline/CSS styles; Next.js static export builds cleanly.

## Project Structure

### Documentation (this feature)

```text
specs/rarity-border-tiles/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   └── globals.css
│   ├── components/
│   │   ├── ArtifactSetFilter.tsx
│   │   ├── Identifier.tsx
│   │   └── TilePickers.tsx
│   └── lib/
│       └── itemMeta.ts
└── test/
    ├── ArtifactSetFilter.test.tsx
    ├── Identifier.test.tsx
    └── TilePickers.test.tsx
```

**Structure Decision**: Update the shared metadata helper (`itemMeta.ts`), badge components (`Identifier.tsx`), tile pickers (`TilePickers.tsx`, `ArtifactSetFilter.tsx`), and picker CSS (`globals.css`), then update and expand component tests.
