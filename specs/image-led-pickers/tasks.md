# Tasks: Image-Led Tile Grid Pickers (`image-led-pickers`)

**Input**: Design documents from `specs/image-led-pickers/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Shared Tile Picker Components & Styles

- [x] T001 Add `.tile-picker-*` CSS classes (grid, tile button, `56–60px` rarity-backed image box, small caption, selected ring, hover/focus-visible states, and dimmed disabled state) in `apps/web/src/app/globals.css`
- [x] T002 [US1] [US2] [US3] Create `apps/web/src/components/TilePickers.tsx` implementing `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, and `PresetTilePicker` with `56–60px` CDN images on rarity backgrounds, small captions underneath, search filtering, selected ring, disabled state, and per-tile `onError` fallback

---

## Phase 2: Convert App Pickers Across `/optimize`, `/presets`, and `/teams`

- [x] T003 [US3] Convert `ArtifactSetFilter` in `apps/web/src/components/ArtifactSetFilter.tsx` from a text-row checkbox list to an image-led tile grid using `getCdnArtifactIconUrl(setKey, 'flower')` at `56px` on a 5★ rarity background with `SetEmblemIcon` fallback and `Both / 2pc / 4pc` piece-count buttons on selected tiles
- [x] T004 [US1] [US2] Convert pickers in `apps/web/src/app/optimize/page.tsx` (Preset picker, Akasha weapon picker, Owned qualifying weapon copy picker, and Protected characters picker) to use `PresetTilePicker`, `WeaponTilePicker`, and `CharacterTilePicker`
- [x] T005 [US1] [US2] Convert pickers in `apps/web/src/app/presets/page.tsx` (Target character filter picker, Akasha weapon picker, and Owned qualifying weapon copy picker) to use `CharacterTilePicker` and `WeaponTilePicker`
- [x] T006 [US1] [US2] [US3] Convert pickers in `apps/web/src/app/teams/page.tsx` (Target character picker, Add Simulated Teammate character picker, TC Assumed Weapon picker, and TC Assumed 4-Piece Set picker) to use `CharacterTilePicker`, `WeaponTilePicker`, and `ArtifactSetTilePicker`

---

## Phase 3: Tests & Full Verification

- [x] T007 [US1] [US2] [US3] Create `apps/web/test/TilePickers.test.tsx` and update `apps/web/test/ArtifactSetFilter.test.tsx` to verify that weapon, character, and artifact-set pickers render tiles with the correct Cloudinary CDN image URLs (not text rows), fire the same selection callbacks on click, respect disabled tiles, and fall back to glyph/initials on `onError`
- [x] T008 Run full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), commit as `"feat: image-led-pickers"`, and push to `origin main`
