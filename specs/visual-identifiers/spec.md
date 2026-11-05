# Feature Specification: Visual Identifiers for Characters, Weapons, and Artifacts

**Feature**: `visual-identifiers` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "No character, weapon, or artifact may be shown as text alone anywhere in the UI (/import tables, /presets list & detail team/weapons/requirements, /optimize preset summary, protected characters, excluded sets, artifact slot comparison, /teams member cards & gear). One shared identifier component library (apps/web/src/components/Identifier.tsx + metadata lookup helper in packages/presets/src/metadata.ts) used on every screen: Character Identifier (coloured circle in element colour with 2-letter initials + display name), Simulated Teammate Treatment (dashed ring around avatar circle + prominent 'SIM' pill tag 'SIM · Fixed Preset Build' when simulated={true}, while target/owned members get 'YOURS · TARGET' or 'YOUR BUILD' badge in team rosters), Weapon Identifier (circle in rarity colour 5★ gold, 4★ purple, 3★ blue, 2★ green, 1★ grey with weapon-type SVG/Unicode glyph + display name), Artifact Identifier (circle in set/rarity colour with deterministic hue from set key + rarity border/fill and slot SVG/Unicode glyph + set/slot display name). Consistency across /import, /presets, /optimize, and /teams, with unit/component tests verifying metadata lookup and simulated vs owned rendering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognizable Visual Badges for Every Character, Weapon, and Artifact (Priority: P1)

Across every screen of the application (`/import`, `/presets`, `/optimize`, and `/teams`), whenever a character, weapon, or artifact (individual piece or set) is displayed in a table, card, chip, summary banner, or roster, it is accompanied by a consistent visual badge rather than plain text alone:
- **Character**: A circular avatar badge colored by the character's element (Pyro, Hydro, Electro, Cryo, Anemo, Geo, Dendro) displaying 2-letter initials alongside the character's display name.
- **Weapon**: A circular badge colored by the weapon's rarity (5★ gold, 4★ purple, 3★ blue, 2★ green, 1★ grey) displaying a distinct weapon-type glyph (Sword, Claymore, Polearm, Bow, Catalyst) alongside the weapon's display name.
- **Artifact**: A circular badge colored with a deterministic hue derived from the artifact set key and styled with a rarity border/fill (when rarity is known, or the set's max rarity for set-level badges) displaying a distinct slot glyph (Flower, Plume, Sands, Goblet, Circlet, or a set glyph when representing a set bonus as a whole) alongside the set/slot display name.

**Why this priority**: Scanning dense tables of characters, weapons, and artifact loadouts by text alone is slow and error-prone. Visual badges make element, weapon class, rarity, and artifact slot/set immediately recognizable without external image assets.

**Independent Test**: Load a GOOD file on `/import`, browse `/presets`, run or inspect a build on `/optimize`, and open `/teams`; verify that every rendered character, weapon, and artifact set/piece displays its circular visual badge with matching element/rarity/set color, initials/glyph, and display name.

**Acceptance Scenarios**:

1. **Given** an imported GOOD account on `/import`, **When** the user views the Characters, Weapons, and Artifacts tabs, **Then** every character name, equipped weapon, equipped artifact set, weapon row, weapon location character, artifact set cell, artifact slot cell, and artifact location character is rendered with its corresponding visual identifier badge.
2. **Given** any character key from the supported Genshin Optimizer catalog, **When** rendered by the Character Identifier, **Then** its badge circle uses that character's canonical element color and 2-letter initials derived deterministically from its display name.
3. **Given** any weapon key from the supported catalog, **When** rendered by the Weapon Identifier, **Then** its badge circle uses the weapon's canonical rarity color (1★–5★) and weapon-type glyph (Sword, Claymore, Polearm, Bow, Catalyst).
4. **Given** any artifact piece or artifact set key, **When** rendered by the Artifact Identifier, **Then** its badge circle uses a deterministic hue from the set key, a rarity border/fill corresponding to its 1★–5★ rarity, and the slot glyph (Flower, Plume, Sands, Goblet, Circlet, or set emblem when no specific slot is given).

---

### User Story 2 - Instant Distinction Between Simulated (`tc`) Teammates and Owned Characters (Priority: P1)

When viewing team compositions in `/presets` (preset list cards and detail team table), `/optimize` (preset team summary), and `/teams` (team member cards), users can immediately tell which characters use their own scanned account data (`owned`) versus which teammates are simulated theorycraft builds (`tc`) fixed by the preset:
- **Simulated Teammates (`simulated={true}` / `build.type === 'tc'`)**: Render with a dashed ring around the character's circular avatar and a prominent `"SIM"` pill tag (`SIM` in compact views or `SIM · Fixed Preset Build` in detail views) so the user never mistakes a preset's assumed support character for their own scanned character.
- **Owned / Target Characters**: Render with a solid ring around the avatar circle; when shown in team rosters, the target character displays a `"YOURS · TARGET"` pill badge and owned non-target teammates display a `"YOUR BUILD"` pill badge.

**Why this priority**: Akasha and Official presets pair the user's own target character with simulated (`tc`) teammates whose weapons, constellations, and artifact sets are fixed by the preset. Users must see at a glance which characters and gear come from their own account versus preset simulation.

**Independent Test**: Render a preset containing one `owned` target character (e.g., Furina) and three `tc` teammates (e.g., Neuvillette, Kazuha, Xilonen) on `/presets`, `/optimize`, and `/teams`; verify that the target character has a solid ring + `"YOURS · TARGET"` badge while all `tc` teammates have a dashed ring + `"SIM"` / `"SIM · Fixed Preset Build"` pill tag.

**Acceptance Scenarios**:

1. **Given** a team member with `build.type === 'tc'`, **When** rendered in `/presets`, `/optimize`, or `/teams`, **Then** the Character Identifier displays a dashed outer ring and a prominent `"SIM"` pill tag (`SIM · Fixed Preset Build` in full mode, `SIM` in compact mode).
2. **Given** the target character (`team[0]`, `build.type === 'owned'`), **When** rendered in a team roster on `/presets`, `/optimize`, or `/teams`, **Then** the Character Identifier displays a solid ring and a `"YOURS · TARGET"` pill badge.
3. **Given** a non-target teammate configured with `build.type === 'owned'`, **When** rendered in a team roster on `/presets`, `/optimize`, or `/teams`, **Then** the Character Identifier displays a solid ring and a `"YOUR BUILD"` pill badge.

---

### User Story 3 - Cross-Screen Visual Consistency Across All Four Primary Routes (Priority: P2)

The exact same character, weapon, or artifact set/slot looks identical whether viewed on `/import`, `/presets`, `/optimize`, or `/teams`, because all four screens consume a single shared identifier component library and metadata lookup module.

**Why this priority**: Visual language only aids recognition if colors, initials, and glyphs never drift between pages.

**Independent Test**: Inspect the rendered identifier metadata and markup for a sample character (`Furina`), weapon (`SplendorOfTranquilWaters`), and artifact (`GoldenTroupe` flower) across `/import`, `/presets`, `/optimize`, and `/teams` and confirm identical colors, initials, glyphs, and labels.

**Acceptance Scenarios**:

1. **Given** the `/optimize` page, **When** viewing the preset compatibility & team summary, protected characters chips, excluded artifact sets chips, and slot-by-slot artifact loadout comparison table, **Then** every character, weapon, artifact set, and artifact slot uses the shared identifier badges.
2. **Given** the `/presets` page, **When** viewing preset list cards, account compatibility weapon candidates, and the team & buff assumptions table (including required weapons and TC assumed weapons/artifact sets), **Then** every character, weapon, and artifact set uses the shared identifier badges.
3. **Given** the `/teams` page, **When** viewing team member cards, target/teammate headers, TC assumed weapon and 4-piece artifact set selectors/previews, and rotation header, **Then** every character, weapon, and artifact set uses the shared identifier badges.

### Edge Cases

- **Traveler variants**: `TravelerAnemo`, `TravelerGeo`, `TravelerElectro`, `TravelerDendro`, `TravelerHydro`, `TravelerPyro` (and bare `Traveler` key if present in GOOD imports) must each resolve to their respective element color (defaulting bare `Traveler` to Anemo or neutral element color) and clear 2-letter initials (e.g., `TA`, `TG`, `TE`, `TD`, `TH`, `TP`, or `TR`).
- **Unknown or future keys**: If an unrecognised character, weapon, or artifact set key is passed, the metadata lookup must never throw; it falls back to a deterministic neutral style, humanized display name, 2-letter initials from the humanized key, default 5★/sword or neutral rarity, and deterministic hue from the key string.
- **Set-only vs. Piece-level Artifact Badges**: When an artifact badge represents a 2-piece / 4-piece set bonus (e.g., excluded sets on `/optimize`, active sets on `/import`, or TC 4p set on `/presets` and `/teams`) where no single slot is specified, it renders a dedicated Set emblem glyph (`✦` / 4-point star SVG) and uses the set's maximum rarity from GO stats for its rarity accent.
- **Native `<select>` / `<option>` constraints**: HTML `<option>` elements only permit plain text in standard browsers; therefore, whenever a `<select>` picks a character, weapon, or artifact set, the currently selected value or adjacent preview/chip/row renders the visual identifier badge, and `<option>` text may include concise Unicode glyphs/stars where helpful without breaking valid HTML.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a pure, framework-free metadata lookup module (`packages/presets/src/metadata.ts`, re-exported from `@gi/presets`) that resolves canonical metadata from Genshin Optimizer's stat data (`@genshin-optimizer/gi/stats`) for any character key, weapon key, or artifact set/slot key.
- **FR-002**: For any character key, the metadata lookup MUST return its display name, canonical element (`pyro`, `hydro`, `electro`, `cryo`, `anemo`, `geo`, `dendro`), element color token/hex, character rarity (4★ or 5★), weapon type, and deterministic 2-letter uppercase initials.
- **FR-003**: For any weapon key, the metadata lookup MUST return its display name, canonical weapon type (`sword`, `claymore`, `polearm`, `bow`, `catalyst`), canonical rarity (`1`–`5`), rarity color token/hex, and weapon-type glyph descriptor.
- **FR-004**: For any artifact set key and optional slot (`flower`, `plume`, `sands`, `goblet`, `circlet`) and optional rarity (`1`–`5`), the metadata lookup MUST return the set display name, slot display name, deterministic set hue (`0`–`359` degrees derived from `setKey`), effective rarity (explicit rarity or max rarity from GO's `getArtSetStat(setKey).rarities`), rarity color token/hex, and slot glyph descriptor.
- **FR-005**: The web app MUST provide a shared identifier component library in `apps/web/src/components/Identifier.tsx` exporting `CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, and a unified `ItemIdentifier` (`kind="character" | "weapon" | "artifact"`).
- **FR-006**: `CharacterBadge` MUST render a circular avatar in the character's element color containing 2-letter initials, followed by the character's display name, and MUST support `simulated={true}` (rendering a dashed outer ring and `"SIM"` / `"SIM · Fixed Preset Build"` pill badge) and `roleTag` (`"target"` → `"YOURS · TARGET"`, `"owned"` → `"YOUR BUILD"`).
- **FR-007**: `WeaponBadge` MUST render a circular badge in the weapon's rarity color (5★ gold, 4★ purple, 3★ blue, 2★ green, 1★ grey) containing a distinct SVG/Unicode glyph for its weapon type (Sword, Claymore, Polearm, Bow, Catalyst), followed by the weapon's display name and optional level/refinement metadata.
- **FR-008**: `ArtifactBadge` MUST render a circular badge using the deterministic hue for `setKey` and rarity border/fill, containing a distinct SVG/Unicode glyph for the artifact slot (Flower, Plume, Sands, Goblet, Circlet, or Set emblem when slot is omitted), followed by the set/slot display name and optional level/rarity metadata.
- **FR-009**: Every character, weapon, and artifact display in `/import` (`apps/web/src/app/import/page.tsx`), `/presets` (`apps/web/src/app/presets/page.tsx`), `/optimize` (`apps/web/src/app/optimize/page.tsx`), and `/teams` (`apps/web/src/app/teams/page.tsx`) MUST use the shared identifier components so no character, weapon, or artifact is shown as plain text alone.
- **FR-010**: Automated unit and component tests MUST verify metadata resolution across all GO character, weapon, and artifact set keys as well as rendered output for owned, target, and simulated (`tc`) character states, weapon rarities/types, and artifact slots/sets.

### Key Entities

- **CharacterMeta**: Resolved metadata for a character key (`key`, `displayName`, `initials`, `element`, `elementColor`, `rarity`, `weaponType`).
- **WeaponMeta**: Resolved metadata for a weapon key (`key`, `displayName`, `weaponType`, `rarity`, `rarityColor`, `glyph`).
- **ArtifactMeta**: Resolved metadata for an artifact set/slot (`setKey`, `setDisplayName`, `slotKey`, `slotDisplayName`, `rarity`, `rarityColor`, `hue`, `setColor`, `glyph`).
- **Simulated / Role State**: Visual ownership indicator on character badges (`simulated?: boolean`, `role?: 'target' | 'owned' | 'sim'`, `compact?: boolean`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of characters (`ALL_CHARACTER_KEYS`), weapons (`ALL_WEAPON_KEYS`), and artifact sets (`ALL_ARTIFACT_SET_KEYS`) resolve valid non-empty display names, colors, rarities, and initials/glyphs in unit tests with zero runtime exceptions.
- **SC-002**: 100% of character, weapon, and artifact tables, team rosters, filter chips, and comparison rows across `/import`, `/presets`, `/optimize`, and `/teams` render using the shared identifier badges (`CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, or `ItemIdentifier`).
- **SC-003**: 100% of `tc` (theorycraft / assumed build) teammates rendered in `/presets`, `/optimize`, and `/teams` display the dashed avatar ring and `"SIM"` pill badge, visually distinguishing them from `owned` / `"YOURS · TARGET"` characters.
- **SC-004**: All workspace unit tests (`pnpm -r test`), typechecks (`pnpm -r typecheck`), and static frontend build (`pnpm --filter @gi/web build`) pass with zero errors.

## Assumptions

- **VI-A1 (Metadata Placement)**: Pure metadata lookup (`getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`, color palettes, deterministic set hue hash, initials generator) lives in `packages/presets/src/metadata.ts` and is re-exported from `@gi/presets` (with a thin re-export in `apps/web/src/lib/itemMeta.ts` for convenience) so both Node unit tests and Next.js UI components share the exact same lookup logic without duplicating `@genshin-optimizer/gi/stats` queries.
- **VI-A2 (No External Image Assets)**: In keeping with the static, offline-capable, zero-external-asset design of `gi-optimizer`, all visual identifiers use self-contained CSS + inline SVG / crisp geometric glyphs and deterministic color tokens rather than external CDN images.
- **VI-A3 (Initials Derivation)**: Character 2-letter initials are derived from multi-word display names by taking the first letter of the first two words (e.g., `"Hu Tao"` → `"HT"`, `"Raiden Shogun"` → `"RS"`, `"Kaedehara Kazuha"` → `"KK"`), and for single-word names by taking the first two letters uppercased (e.g., `"Furina"` → `"FU"`, `"Neuvillette"` → `"NE"`). Traveler variants use `"T"` + the first letter of their element (`"TA"`, `"TG"`, `"TE"`, `"TD"`, `"TH"`, `"TP"`), and bare `"Traveler"` uses `"TR"`.
- **VI-A4 (Native `<option>` Elements)**: Because standard HTML `<option>` elements cannot contain child DOM nodes (`<div>`/`<svg>`), dropdown `<select>` controls keep text inside `<option>` tags and display the rich visual badge either in the surrounding label/header/selected preview or in the list/chips/cards that reflect the selection.
- **VI-A5 (Simulated Badge Variants)**: `CharacterBadge` supports a `compact` prop: in tables/cards with ample space it renders `"SIM · Fixed Preset Build"` (or `"YOURS · TARGET"` / `"YOUR BUILD"`), and in compact inline lists (such as preset list cards) it renders the short `"SIM"` pill tag with a `title="SIM · Fixed Preset Build"` tooltip so layouts stay clean without losing clarity.
