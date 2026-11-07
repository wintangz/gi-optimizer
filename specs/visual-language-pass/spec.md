# Feature Specification: Visual Language Pass (`visual-language-pass`)

**Feature**: `visual-language-pass` (slug; the git commit is the version)

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "The UI explains too much in words. Replace spelt-out text with icons, chips and bars wherever a glyph says it faster. Character presentation does NOT change: the circle badge with 2-letter initials on an element-coloured background stays exactly as it is everywhere. SOURCE OF GLYPHS: the vendored GO submodule contains a vector icon library at vendor/genshin-optimizer/libs/gi/svgicons (element, artifact-slot and stat SVG React components, MIT-licensed like the rest of GO). COPY the components you need into the web app (or a shared UI package in this repo), keeping GO's copyright/license notice with the copied code. Do NOT un-stub GO's UI layer wholesale, and never reference the submodule paths at runtime or build time. RARITY COLOURS: item backgrounds use Genshin's rarity colours, the way the game shows them: 2-star green, 3-star blue, 4-star purple, 5-star gold (1-star grey if any 1-star item can appear). Define them once as shared constants (rarity -> colour) so every surface uses the same values, flat and simple, close to the game's shades. Keep text on them readable (dark text on gold/green, white on purple/blue). Character badges are EXEMPT — they keep their element colour."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Artifact Rows with Rarity-Backed Slot Glyphs, Compact Set Chips, and Stat Icon Chips (Priority: P1)

Across every artifact surface (import artifact list and character equipped sets, current build and optimised build loadout tables on `/optimize`, set-filter panel on `/optimize`, and TC set chips on `/presets` and `/teams`):
- Each artifact row leads with the Genshin Optimizer artifact-slot SVG glyph (`flower`, `plume`, `sands`, `goblet`, `circlet`) on a flat rarity-coloured strip/background (`1★` grey, `2★` green, `3★` blue, `4★` purple, `5★` gold with high-contrast text/icon color), instead of spelt-out slot/set text lines.
- The artifact set renders as a compact coloured chip displaying the set's short name (`setShortName`, with full name in tooltip/`title`).
- Main stats and substats render as compact icon chips (`<StatChip>`): the stat's SVG glyph from the copied GO `svgicons` Stats/Element set + formatted value (e.g. CRIT Rate glyph + `"3.9%"`), not `"CRIT Rate 3.9%"` text lines. Stats without a glyph in `svgicons` keep their short label inside the chip.

**Why this priority**: Artifact tables and comparison rows are the densest surfaces in the app; replacing spelt-out slot names, set names, and stat text with GO's canonical slot/stat glyphs and rarity strips makes builds scannable at a glance.

**Independent Test**: Render `ArtifactBadge`, `StatChip`, `ArtifactSetFilter`, `/import` artifact rows, and `/optimize` artifact loadout rows in unit tests and verify slot SVG icons, rarity background colours, compact set chips, and stat icon chips.

**Acceptance Scenarios**:

1. **Given** an artifact row in `/import`, `/optimize` (current and optimised builds), or `ArtifactSetFilter`, **When** rendered, **Then** a slot SVG glyph (`FlowerIcon`, `PlumeIcon`, `SandsIcon`, `GobletIcon`, `CircletIcon`, or `SetEmblemIcon` for set-only badges) sits on a flat rarity-coloured strip/background (`RARITY_COLORS[rarity]`) leading the row, and the set appears as a compact coloured chip with its short name.
2. **Given** any artifact main stat or substat, **When** rendered in `/import`, `/optimize`, `/presets`, or `/teams`, **Then** it renders as an icon chip with the corresponding SVG glyph from GO's `svgicons` (`HpIcon`, `AtkIcon`, `DefIcon`, `EleMasIcon`, `CritRateIcon`, `CritDmgIcon`, `EnerRechIcon`, `HealingBonusIcon`, `HealAddIcon`, `CdRedIcon`, `ShieldStrIcon`, `StaminaIcon`, or `ElementIcon` for elemental/physical DMG bonuses) plus the formatted value or short unit label.
3. **Given** any `CharacterBadge` anywhere in the application, **When** rendered, **Then** its presentation is completely unchanged (circle badge with 2-letter initials on an element-coloured background, never recoloured by rarity and containing no SVG glyphs).

---

### User Story 2 - Rarity-Coloured Weapon Badges & Star Rows Without "5-star" Text (Priority: P1)

Across all weapon rows and weapon selectors (`/import` characters and weapons tables, `/presets` Akasha weapon selector, qualifying weapon selector, and team assumptions table, `/optimize` Akasha weapon selector and qualifying weapon selector, and `/teams` TC weapon selector):
- The weapon badge background uses the weapon's flat Genshin rarity colour (`RARITY_COLORS[rarity]`: 5★ gold with dark text/icon, 4★ purple with white text/icon, 3★ blue with white text/icon, 2★ green with dark text/icon, 1★ grey with white text/icon).
- A row of star characters (filled `★` vs empty `☆`, e.g. `★★★★★` or `★★★★☆`) sits beside or under the weapon badge, and no `"5-star"` / `"4-star"` text appears anywhere.

**Why this priority**: Rarity background shades and star rows communicate weapon tier faster than text labels.

**Independent Test**: Render `WeaponBadge` across rarities 1–5 and inspect weapon selectors across `/import`, `/presets`, `/optimize`, and `/teams`; confirm flat rarity background colours, readable foreground contrast, filled/empty star rows (`★`/`☆`), and zero occurrences of `"5-star"` text.

**Acceptance Scenarios**:

1. **Given** a weapon of rarity `R` (`1..5`), **When** rendered by `WeaponBadge`, **Then** its badge background uses `RARITY_COLORS[R].bg` with readable foreground `RARITY_COLORS[R].fg` (dark `#1a1206` / `#0d1f15` on 5★ gold and 2★ green; white `#ffffff` on 4★ purple, 3★ blue, and 1★ grey) and displays a 5-character star row (`★`.repeat(R) + `☆`.repeat(5 - R)).
2. **Given** any weapon row or weapon selector across the app, **When** rendered, **Then** no `"5-star"` (or `"N-star"`) text appears anywhere.

---

### User Story 3 - Collapsible Preset Details, Proportional Build Comparison Bars, Action Button Icons, and Element Glyphs (Priority: P1)

Across `/presets`, `/optimize`, `/import`, `/teams`, and navigation:
- **Preset cards & detail assumptions**: Preset cards show the unchanged team circle badges (`CharacterBadge`), target marker, preset kind badge, and a concise one-line summary; long description/assumption text collapses by default and expands on click/tap.
- **Optimize results comparison bars**: On `/optimize`, current build vs optimised build totals are compared as two proportional horizontal bars scaled to the larger total (`max(current, optimised)` = 100% width), with the big formatted total numbers at the right ends of the bars and explanatory paragraphs shrunk to a single caption line each.
- **Main action buttons**: Primary and navigation action buttons (import/upload, optimize/run, set filter, settings/customize, back/navigation, export/download) render a crisp stroke-style SVG glyph (`UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, etc., from the same copied icon module with consistent `24×24` viewBox and stroke styling) paired with a short label.
- **Element indicators**: Anywhere an element or damage type is indicated in text (elemental DMG bonus stats, enemy elemental RES overrides on `/teams`, reaction/element badges, target filter captions), the GO `ElementIcon` (`PyroIcon`, `HydroIcon`, `ElectroIcon`, `CryoIcon`, `AnemoIcon`, `GeoIcon`, `DendroIcon`, `PhysicalIcon`) is shown alone or next to the short label.

**Why this priority**: Completes the visual language pass across preset browsing, build comparison, action controls, and elemental indicators.

**Independent Test**: Render `/presets`, `/optimize`, `/import`, and `/teams`; verify collapsible preset descriptions/assumptions, proportional horizontal comparison bars on `/optimize`, stroke-style SVG icons on main action buttons, and `ElementIcon` glyphs on elemental DMG and enemy RES indicators.

**Acceptance Scenarios**:

1. **Given** a preset card or preset header with long description/assumption text, **When** viewed initially, **Then** it shows the team circles, target marker, preset kind, and a one-line summary, and clicking/tapping expands the full detail.
2. **Given** an optimization result on `/optimize`, **When** current and optimised totals are displayed, **Then** two proportional horizontal bars scaled to `max(currentTotal, optimisedTotal)` are rendered with the large total numbers at the bar ends and single-line captions.
3. **Given** main action buttons across `/import`, `/presets`, `/optimize`, `/teams`, and `ArtifactSetFilter`, **When** rendered, **Then** each displays its stroke-style SVG icon (`UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, etc.) alongside a short label.
4. **Given** elemental damage bonus rows or enemy elemental resistance overrides, **When** rendered, **Then** the corresponding `ElementIcon` SVG glyph is displayed next to the short label.

### Edge Cases

- **Stats or reactions without a dedicated GO stat glyph**: Reaction multipliers (`vaporize`, `melt`, `aggravate`, `spread`) and hit modes (`avgHit`, `critHit`, `hit`) do not have dedicated glyphs in `libs/gi/svgicons/src/icons/Stats`; reaction labels pair with their triggering `ElementIcon` where applicable (e.g. Pyro/Hydro/Electro/Dendro) and hit modes keep their concise short text chip (`Avg`, `Crit`, `Non-Crit`), explicitly documented in the completion report.
- **Native `<select>` / `<option>` elements**: Because HTML `<option>` tags only allow text content, `<option>` labels use concise short text + Unicode stars (`★★★★☆` / `★★★★★`) while the adjacent badge/chip renders the inline SVG component.
- **Zero or missing current build in Akasha artifact-only mode**: When no current build is equipped on the target character, the proportional bar comparison gracefully renders the optimised build bar at 100% width (or shows `0` for current if compared) without division-by-zero (`maxTotal = Math.max(currentTotal, optimisedTotal, 1)`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web app MUST include a self-contained SVG icon module (`apps/web/src/components/SvgIcons.tsx`) containing the 25 copied Genshin Optimizer vector icon components from `vendor/genshin-optimizer/libs/gi/svgicons` (5 `ArtifactSlot` icons + `SlotIcon`, 8 `Element` icons + `ElementIcon`, 12 `Stats` icons + `StatIcon`) with GO's MIT copyright and license notice preserved in the file header, plus stroke-style action SVG icons (`UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, `DownloadIcon`, `PlusIcon`, `TrashIcon`, `CopyIcon`, `StopIcon`) and weapon-type SVG icons, with zero runtime or build-time imports from `vendor/genshin-optimizer` or `@mui/material`.
- **FR-002**: `packages/presets/src/metadata.ts` MUST define shared flat Genshin rarity colour constants (`RARITY_COLORS`: 5★ gold `#d89c3a` with dark `#1a1206` text, 4★ purple `#7b52ab` with white `#ffffff` text, 3★ blue `#4180c4` with white `#ffffff` text, 2★ green `#4ea876` with dark `#0d1f15` text, 1★ grey `#78808c` with white `#ffffff` text), a `formatRarityStars(rarity)` helper returning filled/empty stars (`★` / `☆`), and a `getArtifactSetShortName(setKey)` helper returning each set's compact short name.
- **FR-003**: `CharacterBadge` MUST remain completely unchanged (element-coloured circle with 2-letter initials, never recoloured by rarity, no glyphs inside).
- **FR-004**: Every artifact row (in `/import`, `/optimize` current and optimised builds, and `ArtifactSetFilter`) MUST lead with the `SlotIcon` SVG glyph on a flat rarity-coloured strip/background and display the artifact set as a compact coloured chip with the set's short name.
- **FR-005**: Every artifact main stat, substat, and character stat row MUST render with a `StatChip` component displaying the stat's `StatIcon` SVG glyph + formatted value (or short unit/label when no numeric value or glyph exists).
- **FR-006**: Every weapon badge (`WeaponBadge`) and weapon selector MUST use the weapon's flat rarity background colour (`RARITY_COLORS[rarity]`) and display a row of filled/empty star characters (`★★★★★`, `★★★★☆`, etc.) beside or under it, with zero `"5-star"` text anywhere.
- **FR-007**: Preset cards and preset assumption blocks MUST collapse long descriptions/assumptions behind a click/tap toggle, showing team circles, target marker, preset kind, and a one-line summary by default.
- **FR-008**: `/optimize` results MUST compare current build vs optimised build rotation totals using two proportional horizontal bars scaled to the larger total, with the large total numbers at the bar ends and single-line captions.
- **FR-009**: Main action buttons (import/upload, optimize/run, set filter, settings/customize, back/navigation) MUST render stroke-style SVG icons + short labels.
- **FR-010**: Anywhere an element is indicated in text (damage bonus stats, enemy resistance overrides, team/target element indicators), the `ElementIcon` SVG glyph MUST be rendered alone or next to the short label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero external images, zero image files added, zero new runtime dependencies, and `git status vendor/genshin-optimizer` is completely clean.
- **SC-002**: All 11 golden fixture files in `packages/engine/test/golden/` remain byte-identical and all damage evaluation / solver tests pass with identical numbers.
- **SC-003**: Static export total size (`apps/web/out`) delta is near-zero (well under 100 KB compared to the `3,753,872`-byte baseline).
- **SC-004**: All unit and component tests across `@gi/good`, `@gi/presets`, `@gi/engine`, and `@gi/web` pass (`pnpm test`, `pnpm typecheck`, `pnpm build`).

## Assumptions

- **VLP-A1 (Porting GO `svgicons` Without MUI)**: Because `apps/web` is a lightweight React 19 + CSS static app without `@mui/material`, copying the 25 icon components from `vendor/genshin-optimizer/libs/gi/svgicons` means copying their exact SVG `<path>` geometries into pure React `<svg viewBox="0 0 24 24">` components in `apps/web/src/components/SvgIcons.tsx` while preserving GO's MIT copyright and permission notice (`Copyright (c) 2020-present, frzyc`).
- **VLP-A2 (Accessibility & Existing Test Selectors)**: Preserving `aria-label`, `title`, and `data-*` attributes on `CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, and `ArtifactSetFilter` keeps accessibility intact and ensures backward compatibility with existing DOM assertions while replacing verbose visible text with glyphs, chips, and bars.
- **VLP-A3 (Preset Card Click/Tap Expansion)**: On `/presets`, each preset card shows the preset kind badge, target marker, team circle badges, and a single clamped summary line; clicking/tapping a card selects it and toggles inline expansion of its description/assumption summary (and on `/presets` detail and `/optimize` preset header, long assumption paragraphs collapse into a single summary line with an inline click/tap details toggle).
