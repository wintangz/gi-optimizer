# Feature Specification: Unified Identity Backgrounds & Rarity Borders (`rarity-border-tiles`)

**Feature Branch**: `main` (`rarity-border-tiles`)  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "Feature: rarity-border-tiles. Run the full Spec Kit flow autonomously (specify → plan → tasks → implement → test) without asking me questions; log assumptions in the spec. Commit as 'feat: rarity-border-tiles' and push to origin main."

## Clarifications & Logged Assumptions

- **Standard Dark Surface Colour (`ITEM_DARK_SURFACE_BG`)**: The app's standard dark surface colour in `apps/web/src/app/globals.css` is `--surface: #151821`. A shared constant `ITEM_DARK_SURFACE_BG = '#151821'` is exported from `apps/web/src/lib/itemMeta.ts` (and re-exported from `apps/web/src/components/Identifier.tsx`) and used as the `background` on weapon tiles, artifact-set tiles, `WeaponBadge` chips, and `ArtifactBadge` slot strips and set chips.
- **Character Background & Rarity Border**: Both `CharacterBadge` (`apps/web/src/components/Identifier.tsx`) and character picker tiles (`CharacterTilePicker` and `PresetTilePicker` in `apps/web/src/components/TilePickers.tsx`) use `meta.elementColor.bg` (the character's dark element shade, e.g. `#142a42` for Hydro / Furina) as their background colour and `getRarityColor(meta.rarity).border` (e.g. `#f0be5b` for 5★, `#a375db` for 4★) as their border colour.
- **Preservation of `badge-image-state-style`**: `CharacterBadge` retains its exact two-state sizing and border style rules: when the CDN portrait loads, the avatar renders at `34px` (`27px` compact) with a `2px solid <rarityColor.border>`; when the image errors (initials fallback), the avatar renders at `30px` (`24px` compact) with a `2px dashed <rarityColor.border>`. Character picker tiles follow the same `solid` (image state) vs `dashed` (initials fallback state) rarity border rule.
- **Non-Colour Selection Mechanism**: Because border colour now encodes rarity across all tiles, selected picker tiles (`WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`, and `ArtifactSetFilter`) combine a thicker rarity border on `.tile-picker-frame` (`3px` when selected vs `2px` when unselected) with an explicit corner check marker badge (`<span data-testid="tile-selected-check" aria-hidden="true" className="tile-picker-check">✓</span>`) and a raised card overlay (`.tile-picker-item.is-selected`).
- **Engine, Presets & Golden Isolation**: `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and `packages/good` are untouched; zero new dependencies are added.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Character Badges & Character Tiles Use Dark Element Background + Rarity Border (Priority: P1)

When viewing a `CharacterBadge` or selecting a character/preset in `CharacterTilePicker` or `PresetTilePicker`, the portrait sits on the character's dark element colour (`elementColor.bg`) so it harmonises with the portrait's own dark shading, while the border colour indicates the character's rarity (`#f0be5b` for 5★, `#a375db` for 4★). On `CharacterBadge`, the border remains `solid` at `+10%` size (`34px` / `27px`) when the image loads and `dashed` at base size (`30px` / `24px`) in the initials fallback state.

**Why this priority**: Directly resolves the visual clash between bright rarity fill backgrounds and character portraits' baked-in dark backgrounds while preserving element identity and rarity legibility.

**Independent Test**: Render `CharacterBadge` and `CharacterTilePicker` for a known 5★ Hydro character (`Furina`) and 4★ Electro character (`Fischl`) and assert `background: #142a42` / `#2b1d42` (`elementColor.bg`), `border` colour `#f0be5b` / `#a375db` (`rarityColor.border`), and solid-to-dashed transition on `onError`.

**Acceptance Scenarios**:

1. **Given** `CharacterBadge` rendered for `Furina` (5★ Hydro), **When** the image is active, **Then** `[data-testid="character-avatar"]` has `background: #142a42` (`elementColor.bg`), `border: 2px solid #f0be5b` (`rarityColor.border`), and size `34px` (`27px` compact).
2. **Given** `CharacterBadge` rendered for `Furina`, **When** `onError` fires on the `<img>`, **Then** `[data-testid="character-avatar"]` transitions to `background: #142a42`, `border: 2px dashed #f0be5b`, and size `30px` (`24px` compact) showing `"FU"`.
3. **Given** `CharacterTilePicker` rendered with `Furina` (5★ Hydro) and `Fischl` (4★ Electro), **When** inspected, **Then** each tile's `.tile-picker-frame` uses `meta.elementColor.bg` for `background` and `getRarityColor(meta.rarity).border` for its border colour.

---

### User Story 2 - Weapon & Artifact Tiles and Badge Chips Use Dark Surface Background + Rarity Border (Priority: P1)

When viewing weapon tiles (`WeaponTilePicker`), artifact-set tiles (`ArtifactSetTilePicker`, `ArtifactSetFilter`), or bordered weapon/artifact badge chips (`WeaponBadge`, `ArtifactBadge`), the item sits on the app's standard dark surface colour (`#151821`) with its border coloured by the item's rarity (`getRarityColor(rarity).border`).

**Why this priority**: Unifies weapon and artifact presentation across pickers and build rows so backgrounds stay dark and consistent while borders carry rarity.

**Independent Test**: Render `WeaponTilePicker`, `ArtifactSetTilePicker`, `ArtifactSetFilter`, `WeaponBadge`, and `ArtifactBadge` for known 5★ and 4★ items and assert `background: #151821` and `border` colour matching `getRarityColor(rarity).border`.

**Acceptance Scenarios**:

1. **Given** `WeaponTilePicker` with `SplendorOfTranquilWaters` (5★) and `FavoniusSword` (4★), **When** rendered, **Then** each tile frame has `background: #151821` and border colour `#f0be5b` (5★) or `#a375db` (4★).
2. **Given** `ArtifactSetTilePicker` and `ArtifactSetFilter` with `GoldenTroupe` (5★), **When** rendered, **Then** each set tile frame has `background: #151821` and border colour `#f0be5b`.
3. **Given** `WeaponBadge` and `ArtifactBadge`, **When** rendered, **Then** their bordered badge chips (`[data-testid="weapon-chip"]`, `[data-testid="artifact-slot-strip"]`, `[data-testid="artifact-set-chip"]`) use `background: #151821` and `border: 1px solid <rarityColor.border>`.

---

### User Story 3 - Unmistakable Non-Colour Picker Selection (Priority: P1)

When an option is selected in any tile picker (`WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`, or `ArtifactSetFilter`), the selected tile is distinguished by a thicker frame border (`3px` vs `2px`) plus an explicit check marker badge (`[data-testid="tile-selected-check"]` showing `✓`) and selected container styling, never relying on border colour alone.

**Why this priority**: Because every tile has a coloured rarity border, selection must be immediately recognizable without overriding or confusing the rarity border colour.

**Independent Test**: Render each picker with one selected option and one unselected option; assert the selected tile renders `[data-testid="tile-selected-check"]` (`✓`), a `3px` rarity border on its frame, `is-selected`, and `aria-pressed="true"`, while unselected tiles have a `2px` rarity border and no check marker.

**Acceptance Scenarios**:

1. **Given** a selected tile in `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`, or `ArtifactSetFilter`, **When** rendered, **Then** it contains `[data-testid="tile-selected-check"]` (`✓`), has a `3px` rarity border on `.tile-picker-frame`, and has `data-selected="true"` and `aria-pressed="true"`.
2. **Given** an unselected tile in the same picker, **When** rendered, **Then** it has a `2px` rarity border on `.tile-picker-frame` and does not render `[data-testid="tile-selected-check"]`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `CharacterBadge` (`apps/web/src/components/Identifier.tsx`) MUST render its avatar circle with `background: meta.elementColor.bg` and border colour `getRarityColor(meta.rarity).border`, using `2px solid` at `34px`/`27px` when the CDN image is shown and `2px dashed` at `30px`/`24px` in the initials fallback state.
- **FR-002**: `CharacterTilePicker` and `PresetTilePicker` (`apps/web/src/components/TilePickers.tsx`) MUST render character portrait frames with `background: meta.elementColor.bg` and border colour `getRarityColor(rarity).border` (`solid` when image is shown, `dashed` on image error).
- **FR-003**: `WeaponTilePicker`, `ArtifactSetTilePicker` (`apps/web/src/components/TilePickers.tsx`), and `ArtifactSetFilter` (`apps/web/src/components/ArtifactSetFilter.tsx`) MUST render item tile frames with `background: ITEM_DARK_SURFACE_BG` (`#151821`) and border colour `meta.rarityColor.border`.
- **FR-004**: `WeaponBadge` and `ArtifactBadge` (`apps/web/src/components/Identifier.tsx`) MUST render their bordered badge chips (`[data-testid="weapon-chip"]`, `[data-testid="artifact-slot-strip"]`, `[data-testid="artifact-set-chip"]`) with `background: ITEM_DARK_SURFACE_BG` (`#151821`) and `border: 1px solid ${meta.rarityColor.border}`.
- **FR-005**: All tile pickers (`WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, `PresetTilePicker`, `ArtifactSetFilter`) MUST indicate selection via a non-colour mechanism: a thicker frame border (`3px` vs `2px`) preserving the item's rarity border colour, plus a visible check marker badge (`[data-testid="tile-selected-check"]` displaying `✓`) and `.tile-picker-item.is-selected` styling.
- **FR-006**: Tile sizes, captions, search/filter inputs, disabled/ineligible tile dimming (`is-disabled`), `onError` fallbacks, `packages/engine`, `packages/presets`, `packages/good`, and `vendor/genshin-optimizer` MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Component tests in `apps/web/test/Identifier.test.tsx`, `apps/web/test/TilePickers.test.tsx`, and `apps/web/test/ArtifactSetFilter.test.tsx` pin the exact background and border colours (`elementColor.bg` + `rarityColor.border` for characters; `#151821` + `rarityColor.border` for weapons and artifact sets/pieces) and verify the non-colour selection mechanism (`3px` border + `[data-testid="tile-selected-check"]`).
- **SC-002**: Full repository verification (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) passes with zero errors and static export (`apps/web/out`) builds cleanly.
