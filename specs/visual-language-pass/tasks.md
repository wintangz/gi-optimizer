# Tasks: Visual Language Pass (`visual-language-pass`)

**Input**: Design documents from `/specs/visual-language-pass/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Foundational Metadata Constants & Copied GO SVG Icon Library

**Purpose**: Establish shared flat Genshin rarity colours (`RARITY_COLORS`), star formatting (`formatRarityStars`), compact set short names (`getArtifactSetShortName`), short stat labels (`shortStatLabel`), and the self-contained `SvgIcons.tsx` module containing GO's 25 MIT-licensed vector icons plus stroke-style action glyphs.

- [x] T001 Update `packages/presets/src/metadata.ts` (and re-exports in `packages/presets/src/index.ts` and `apps/web/src/lib/itemMeta.ts`) to export `RARITY_COLORS` with flat Genshin rarity shades and readable foreground contrast (dark text on 5★ gold `#d89c3a` and 2★ green `#4ea876`; white text on 4★ purple `#7b52ab`, 3★ blue `#4180c4`, and 1★ grey `#78808c`), `formatRarityStars`, `getArtifactSetShortName`, `shortStatLabel`, and `setShortName` on `ArtifactMeta`
- [x] T002 [P] Create `apps/web/src/components/SvgIcons.tsx` containing the 25 copied SVG icon components from `vendor/genshin-optimizer/libs/gi/svgicons` (`FlowerIcon`, `PlumeIcon`, `SandsIcon`, `GobletIcon`, `CircletIcon`, `SlotIcon`, `AnemoIcon`, `CryoIcon`, `DendroIcon`, `ElectroIcon`, `GeoIcon`, `HydroIcon`, `PhysicalIcon`, `PyroIcon`, `ElementIcon`, `AtkIcon`, `CdRedIcon`, `CritDmgIcon`, `CritRateIcon`, `DefIcon`, `EleMasIcon`, `EnerRechIcon`, `HealAddIcon`, `HealingBonusIcon`, `HpIcon`, `ShieldStrIcon`, `StaminaIcon`, `StatIcon`) with GO's MIT copyright/license notice preserved, plus `WeaponTypeIcon`, `SetEmblemIcon`, and stroke-style action icons (`UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, `DownloadIcon`, `PlusIcon`, `TrashIcon`, `CopyIcon`, `StopIcon`)

---

## Phase 2: Shared Visual Language Components (`Identifier.tsx`, `ArtifactSetFilter.tsx`, `Nav.tsx`, `globals.css`)

**Purpose**: Implement rarity-backed slot glyph strips, compact set chips, `StatChip`, `RarityStars`, `WeaponBadge` on rarity backgrounds, `BuildComparisonBars`, and stroke-style nav/filter icons while keeping `CharacterBadge` 100% unchanged.

- [x] T003 [US1] [US2] [US3] Update `apps/web/src/components/Identifier.tsx` (keeping `CharacterBadge` completely unchanged) to use `SlotIcon` on a flat rarity-coloured strip + compact set-short-name chip in `ArtifactBadge`, flat rarity-coloured badge background + `WeaponTypeIcon` + `RarityStars` (`★`/`☆`) in `WeaponBadge`, and export `StatChip`, `RarityStars`, `ArtifactPieceRow`, and `BuildComparisonBars`
- [x] T004 [P] [US1] [US3] Update `apps/web/src/components/ArtifactSetFilter.tsx` and `apps/web/src/components/Nav.tsx` to use `FunnelIcon` and stroke-style navigation/action glyphs with compact set chips
- [x] T005 [P] [US1] [US2] [US3] Add visual-language CSS classes in `apps/web/src/app/globals.css` for stat chips, rarity strips, star rows, proportional horizontal comparison bars, collapsible preset cards/details, and icon+label action buttons

---

## Phase 3: Cross-Screen Visual Language Pass (`/import`, `/presets`, `/optimize`, `/teams`)

**Purpose**: Apply all 7 visual language requirements across the 4 primary screens.

- [x] T006 [P] [US1] [US2] [US3] Update `apps/web/src/app/import/page.tsx` to use artifact slot glyph + rarity strip + compact set chip + `StatChip` main/substat icon chips in the Artifacts table, rarity-coloured `WeaponBadge` with star rows in Characters/Weapons tables, and stroke-style SVG icons (`UploadIcon`, `PlayIcon`, `TrashIcon`, `BackArrowIcon`) on action buttons
- [x] T007 [P] [US1] [US2] [US3] Update `apps/web/src/app/presets/page.tsx` to collapse long preset descriptions and assumption boxes into click/tap expandable summaries (cards show unchanged team `CharacterBadge` circles, target marker, preset kind, and a one-line summary), use rarity-coloured `WeaponBadge` + star rows on weapon selectors (no `"5-star"` text), render `ElementIcon` / `StatChip` on rotation & gear rows, and add stroke-style SVG icons on main action buttons
- [x] T008 [P] [US1] [US2] [US3] Update `apps/web/src/app/optimize/page.tsx` to compare current vs optimised builds with two proportional horizontal bars (`BuildComparisonBars`) scaled to the larger total with big numbers at the ends, shrink explanatory paragraphs to single-line captions, render artifact loadout rows with `SlotIcon` rarity strip + compact set chip + `StatChip` main/substats, render `StatChip` / `ElementIcon` in Final Character Stats, use rarity-coloured `WeaponBadge` + star rows in weapon selectors, and add stroke-style SVG icons on main action buttons
- [x] T009 [P] [US1] [US2] [US3] Update `apps/web/src/app/teams/page.tsx` to render `ElementIcon` on all enemy resistance override fields (`pyro`..`physical`) and reaction selectors, use rarity-coloured `WeaponBadge` + star rows in TC weapon selectors, and add stroke-style SVG icons on main action buttons while preserving all existing test hooks (`data-testid="load-engine-preview-btn"`, etc.)

---

## Phase 4: Verification & Test Suite Updates

- [x] T010 [P] Update and expand unit tests in `packages/presets/test/metadata.test.ts` and `apps/web/test/Identifier.test.tsx` to verify flat `RARITY_COLORS` contrast rules, `formatRarityStars`, `getArtifactSetShortName`, `SvgIcons` (`SlotIcon`, `StatIcon`, `ElementIcon`), `StatChip`, `BuildComparisonBars`, `WeaponBadge` star rows, `ArtifactBadge` slot glyph strip + set chip, and `CharacterBadge` invariance
- [x] T011 Run full parallel `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`, verify golden fixtures are byte-identical, and measure `apps/web/out` static export size delta
