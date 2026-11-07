# Tasks: Unified Identity Backgrounds & Rarity Borders (`rarity-border-tiles`)

**Input**: Design documents from `specs/rarity-border-tiles/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Shared Constants, Badge Components & Picker Styles

- [x] T001 Export `ITEM_DARK_SURFACE_BG = '#151821'` from `apps/web/src/lib/itemMeta.ts` and re-export from `apps/web/src/components/Identifier.tsx`
- [x] T002 [US1] [US2] Update `CharacterBadge`, `WeaponBadge`, and `ArtifactBadge` in `apps/web/src/components/Identifier.tsx` so `CharacterBadge` uses `meta.elementColor.bg` + `getRarityColor(meta.rarity).border` (`2px solid` in image state, `2px dashed` in fallback state) and `WeaponBadge`/`ArtifactBadge` bordered chips use `ITEM_DARK_SURFACE_BG` (`#151821`) + `meta.rarityColor.border`
- [x] T003 [US3] Update `.tile-picker-item`, `.tile-picker-item.is-selected`, `.tile-picker-frame`, and `.tile-picker-check` styles in `apps/web/src/app/globals.css` to support the non-colour selection mechanism (check marker badge + thicker frame border + subtle elevation)

---

## Phase 2: Tile Pickers & Artifact Set Filter

- [x] T004 [US1] [US2] [US3] Update `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, and `PresetTilePicker` in `apps/web/src/components/TilePickers.tsx` to use `meta.elementColor.bg` + rarity border for characters, `ITEM_DARK_SURFACE_BG` + rarity border for weapons/sets, and `3px` border + `[data-testid="tile-selected-check"]` (`✓`) when selected
- [x] T005 [US2] [US3] Update `ArtifactSetFilter` in `apps/web/src/components/ArtifactSetFilter.tsx` so set tiles use `ITEM_DARK_SURFACE_BG` (`#151821`) + `meta.rarityColor.border` (`2px solid` unselected, `3px solid` selected) and render `[data-testid="tile-selected-check"]` (`✓`) when selected

---

## Phase 3: Component Tests & Full Verification

- [x] T006 [US1] [US2] [US3] Update `apps/web/test/Identifier.test.tsx`, `apps/web/test/TilePickers.test.tsx`, and `apps/web/test/ArtifactSetFilter.test.tsx` to pin the new background and border colour sources and verify the non-colour selection mechanism (`3px` border + `[data-testid="tile-selected-check"]`)
- [x] T007 Run full verification (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), measure `apps/web/out` byte size, commit as `"feat: rarity-border-tiles"`, and push to `origin main`
