# Feature Specification: Image-Led Tile Grid Pickers (`image-led-pickers`)

**Feature Branch**: `image-led-pickers`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User description: "Feature: image-led-pickers. Run the full Spec Kit flow autonomously (specify → plan → tasks → implement → test) without asking me questions; log assumptions in the spec. Run after cdn-artifact-icons and badge-image-state-style are in. Commit as 'feat: image-led-pickers' and push to origin main. Problem: pickers still read as text lists with tiny icons (the weapon image renders at 18–22px). Goal: every picker in the app becomes an image-led tile grid where the picture is the primary content and text is just a caption."

---

## Complete Picker Inventory Across the App

| # | Surface & Location | Picker Purpose | Item Type | Status / Action |
|---|---|---|---|---|
| 1 | `/optimize` (`apps/web/src/app/optimize/page.tsx`) | **Akasha Simulated Weapon Picker** (`Simulated Weapon`) | Weapon (`listWeaponsForType`) | **Converted** to `WeaponTilePicker` (`60×60px` weapon CDN icon on rarity background + name caption + search) |
| 2 | `/presets` (`apps/web/src/app/presets/page.tsx`) | **Akasha Simulated Weapon Picker** (`Akasha Simulated Weapon`) | Weapon (`listWeaponsForType`) | **Converted** to `WeaponTilePicker` (`60×60px` weapon CDN icon on rarity background + name caption + search) |
| 3 | `/optimize` (`apps/web/src/app/optimize/page.tsx`) | **Owned-Build Qualifying Weapon Copy Picker** (`Qualifying Weapon Copy`) | Owned Weapon (`matchReport` candidates) | **Converted** to `WeaponTilePicker` (`60×60px` weapon CDN icon on rarity background + name & `R{r} Lv.{lv}` caption) |
| 4 | `/presets` (`apps/web/src/app/presets/page.tsx`) | **Owned-Build Qualifying Weapon Copy Picker** (`Qualifying weapon copy in your inventory`) | Owned Weapon (`activeMatch` candidates) | **Converted** to `WeaponTilePicker` (`60×60px` weapon CDN icon on rarity background + name & `R{r} Lv.{lv}` caption) |
| 5 | `/teams` (`apps/web/src/app/teams/page.tsx`) | **TC Teammate Assumed Weapon Picker** (`Assumed Weapon`) | Weapon (`ALL_WEAPON_KEYS`) | **Converted** to `WeaponTilePicker` (`60×60px` weapon CDN icon on rarity background + name caption + search) |
| 6 | `/teams` (`apps/web/src/app/teams/page.tsx`) | **Target Character Picker** (`Change Target Character`) | Character (`ALL_CHARACTER_KEYS`) | **Converted** to `CharacterTilePicker` (`60×60px` character CDN portrait on rarity/element background + name caption + search) |
| 7 | `/teams` (`apps/web/src/app/teams/page.tsx`) | **Add Simulated Teammate Character Picker** (`newMemberKey`) | Character (`ALL_CHARACTER_KEYS`) | **Converted** to `CharacterTilePicker` with already-in-team characters disabled/dimmed |
| 8 | `/presets` (`apps/web/src/app/presets/page.tsx`) | **Target Character Filter Picker** (`Filter presets by target character`) | Character (`availableTargets` + All) | **Converted** to `CharacterTilePicker` (with `"All Characters"` tile + target character portrait tiles) |
| 9 | `/optimize` (`apps/web/src/app/optimize/page.tsx`) | **Protected Characters Picker** (`Protect character`) | Owned Character (`record.good.characters`) | **Converted** to `CharacterTilePicker` (toggles/adds character protection with active selected ring on protected characters) |
| 10 | `/optimize` (`apps/web/src/components/ArtifactSetFilter.tsx`) | **Multi-Mode Artifact Set Filter** (`Artifact sets`) | Artifact Set (`ALL_ARTIFACT_SET_KEYS`) | **Converted** from text-row checkbox list to image-led tile grid (`56×56px` `{SetKey}-flower.png` on 5★ rarity background + name caption + `Both / 2pc / 4pc` piece buttons when selected) |
| 11 | `/teams` (`apps/web/src/app/teams/page.tsx`) | **TC Teammate Assumed 4-Piece Set Picker** (`Assumed 4-Piece Artifact Set`) | Artifact Set (`ALL_ARTIFACT_SET_KEYS`) | **Converted** to `ArtifactSetTilePicker` (`56×56px` `{SetKey}-flower.png` on 5★ rarity background + name caption + `"No 4p Set"` tile + search) |
| 12 | `/optimize` (`apps/web/src/app/optimize/page.tsx`) | **Rotation Preset Picker** (`Preset`) | Preset (Target Character portrait) | **Converted** to `PresetTilePicker` (`56×56px` target character portrait on rarity/element background + preset name & source badge caption) |
| 13 | `/optimize` (`apps/web/src/components/OptimizeViews.tsx`) | **Constraint Stat Picker** (`ConstraintsCard`) | Final Stat (`STAT_PICKER_OPTIONS`) | **Retained** as stat-chip grid (stats use vector SVG glyphs rather than 60px PNG portraits; already a grid of selectable chips with disabled state) |
| 14 | `/optimize`, `/presets`, `/teams`, `/import` | **Scalar / Formula / Table Filter Selects** (`Refinement R1–R5`, `Cons C0–C6`, `Assumption Level`, `Top N`, `Hit Mode`, `Reaction`, `GO Formula Target`, `GO Conditionals`, `/teams` Quick-Fork bar, `/import` table column filters) | Scalar numbers, formula paths, or table filter bars | **Cannot be image tile grids**: these select scalar numbers (`R1–R5`, `C0–C6`, `Top 1–10`), abstract formula paths (`skill.usherDmg`), or compact table column filters that have no character/weapon/artifact portrait asset. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Image-Led Weapon Tile Pickers (Priority: P1)

Wherever the user selects a weapon (Akasha simulated weapon picker on `/optimize` and `/presets`, owned qualifying weapon copy picker on `/optimize` and `/presets`, and TC teammate weapon picker on `/teams`), options are presented as an image-led tile grid (`WeaponTilePicker`). Each tile features a `60×60px` weapon image from `{CLOUDINARY_GENSHIN_BASE_URL}/{WeaponKey}.png` on the weapon's rarity-colour background (`getRarityColor(meta.rarity)`), the weapon's display name (and optional copy metadata like `R1 Lv.90`) as a small caption underneath, and a bright accent ring on the selected tile. If a weapon image fails to load (`onError`), that tile falls back to `<WeaponTypeIcon />` inside the same `60×60px` rarity frame.

**Why this priority**: Directly solves the problem where weapon pickers read as text lists with tiny 18–22px icons.

**Independent Test**: Render `WeaponTilePicker` with a list of weapons, verify each tile renders a `60×60px` `<img>` with the Cloudinary weapon URL on its rarity background and caption underneath (no text-row layout), verify clicking a tile invokes `onChange` with the selected weapon key/id, and verify triggering `onError` on a tile's `<img>` falls back to `<WeaponTypeIcon />`.

---

### User Story 2 - Image-Led Character & Target Tile Pickers (Priority: P1)

Wherever the user picks a character (target character selector and add-teammate selector on `/teams`, target character filter on `/presets`, and protected characters selector on `/optimize`, plus the preset selector on `/optimize`), options are presented as an image-led tile grid (`CharacterTilePicker` / `PresetTilePicker`). Each tile features a `56–60px` character portrait from `{CLOUDINARY_GENSHIN_BASE_URL}/{CharacterKey}.png` on the character's rarity/element background, the character's name as a caption beneath, a clear selected ring, and visually dimmed disabled state for ineligible/already-added characters. On `onError`, the tile falls back to the character's 2-letter initials with a dashed element border.

**Why this priority**: Makes character and preset selection visually scannable across `/teams`, `/presets`, and `/optimize`.

**Independent Test**: Render `CharacterTilePicker` with known character keys and a `disabledKeys` set, verify `<img>` CDN URLs, verify disabled tiles have `disabled` attribute and dimmed styling, verify clicking an enabled tile fires `onChange`, and verify `onError` falls back to initials.

---

### User Story 3 - Image-Led Artifact Set Tile Pickers (Priority: P1)

In `ArtifactSetFilter` (on `/optimize`) and `ArtifactSetTilePicker` (TC 4pc set picker on `/teams`), artifact sets are rendered as an image-led tile grid where each tile displays the set's flower piece icon (`getCdnArtifactIconUrl(setKey, 'flower')`) at `56×56px` on a 5-star rarity background (`getRarityColor(5)`), with the set's name as a small caption underneath, a clear ring when selected, and (in `ArtifactSetFilter`) the `Both / 2pc / 4pc` piece-count buttons when selected. On `onError`, the tile falls back to `<SetEmblemIcon />`.

**Why this priority**: Replaces the text-row checkbox list in `ArtifactSetFilter` and `<select>` in `/teams` with visual artifact-piece tiles while preserving search, bulk actions (`Select all`, `Clear`, `Invert`), and `2pc/4pc/Both` piece-count toggles.

**Independent Test**: Render `ArtifactSetFilter` and `ArtifactSetTilePicker`, verify tiles render `{CLOUDINARY_GENSHIN_BASE_URL}/{SetKey}-flower.png`, verify clicking a tile toggles selection, verify `2pc/4pc/Both` controls appear on selected sets in `ArtifactSetFilter`, and verify `onError` falls back to `SetEmblemIcon`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Create reusable image-led tile picker components (`WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`) in `apps/web/src/components/TilePickers.tsx` styled via shared `.tile-picker-*` classes in `apps/web/src/app/globals.css`.
- **FR-002**: Each tile MUST render its primary image at `56–60px` (`width` & `height` `56` or `60`) on the item's rarity-colour background (`getRarityColor`), with the item's name as a small caption under the image, a clear ring when selected (`is-selected`), hover/focus-visible states, and dimmed disabled state (`is-disabled`).
- **FR-003**: Convert all weapon pickers (Akasha weapon pickers on `/optimize` and `/presets`, owned weapon candidate pickers on `/optimize` and `/presets`, and TC weapon picker on `/teams`), character pickers (target & teammate pickers on `/teams`, target filter on `/presets`, protected characters picker on `/optimize`), preset picker on `/optimize`, and artifact-set pickers (`ArtifactSetFilter` on `/optimize` and TC 4pc set picker on `/teams`) to use these tile grids.
- **FR-004**: Every tile MUST handle `onError` per tile key by falling back to the previous glyph/initials treatment (`<WeaponTypeIcon />` for weapons, `meta.initials` with dashed element border for characters, `<SetEmblemIcon />` for artifact sets).
- **FR-005**: Preserve all existing search/filter, ownership/simulated states, disabled/ineligible states, keyboard accessibility (`<button type="button">` tiles with `aria-pressed` / `aria-label`), and selection callbacks. Keep `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and golden fixtures untouched.

---

## Assumptions Logged

1. **Character Rarity Background**: Characters in Genshin are 4★ or 5★; `CharacterTilePicker` uses the character's element colour border (`meta.elementColor.border`) with the 5★/element-tinted tile frame so both rarity and element identity remain clear, and falls back to `meta.initials` with a `2px dashed` element border if the portrait fails to load.
2. **Searchable Scrollable Grid**: Pickers with many items (e.g. `ALL_WEAPON_KEYS`, `ALL_CHARACTER_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `listWeaponsForType`) include a compact search input and a scrollable CSS grid (`grid-template-columns: repeat(auto-fill, minmax(84px, 1fr))`) so the page height remains compact while showing full `56–60px` image tiles.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Component tests in `apps/web/test/TilePickers.test.tsx` and `apps/web/test/ArtifactSetFilter.test.tsx` verify that weapon, character, and artifact-set pickers render tiles with the correct Cloudinary CDN URLs (not text rows), fire the same selection callbacks on click, dim/disable ineligible tiles, and fall back to glyph/initials when a tile image errors.
- **SC-002**: Full test suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) passes with 0 errors.
