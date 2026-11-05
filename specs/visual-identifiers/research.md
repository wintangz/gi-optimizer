# Research: Visual Identifiers (`visual-identifiers`)

## Decisions

### 1. Canonical Item Metadata Lookup via Vendored GO Stats (`packages/presets/src/metadata.ts`)
- **Decision**: Implement pure metadata lookup functions (`getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`, `getElementColor`, `getRarityColor`, `getCharacterInitials`, `getSetHue`) in `packages/presets/src/metadata.ts`, re-exported from `packages/presets/src/index.ts` (`@gi/presets`) and mirrored via `apps/web/src/lib/itemMeta.ts`.
- **Rationale**:
  - `@genshin-optimizer/gi/stats` (`vendor/genshin-optimizer/libs/gi/stats/src/index.ts`) already provides `getCharEle(ck)`, `getCharStat(ck)`, `getWeaponStat(wk)`, and `getArtSetStat(sk)` backed by `allStat_gen.json`.
  - Placing the lookup in `@gi/presets` keeps it framework-free, directly testable in Node with Vitest (`packages/presets/test/metadata.test.ts`), and accessible to `apps/web` without pulling in GO's heavy UI/sheet graph (`allStat_gen.json` is lightweight static JSON already used in `packages/presets/src/userPreset.ts`).
- **Alternatives considered**:
  - Maintaining a hardcoded table of elements/rarities/weapon types in `apps/web`: Rejected because it duplicates GO data and risks drifting when new characters/weapons are added.
  - Loading GO character/weapon sheets from `@gi/engine`: Rejected because sheets are heavy and `docs/architecture.md` mandates keeping `@gi/engine` dynamically loaded only on `/optimize` and `/teams`, whereas `/import` and `/presets` also need visual identifiers.

### 2. Element, Rarity, and Artifact Set Color System
- **Decision**:
  - **Element Colors (`ElementKey`)**:
    - `pyro`: `#ef7938` (bg `#3b2016`, ring `#ef7938`)
    - `hydro`: `#3b9dff` (bg `#142a42`, ring `#3b9dff`)
    - `electro`: `#b57cff` (bg `#2b1d42`, ring `#b57cff`)
    - `cryo`: `#73d8e8` (bg `#16333b`, ring `#73d8e8`)
    - `anemo`: `#5cd4b0` (bg `#15352d`, ring `#5cd4b0`)
    - `geo`: `#e8b84b` (bg `#382c14`, ring `#e8b84b`)
    - `dendro`: `#88d64c` (bg `#203515`, ring `#88d64c`)
  - **Rarity Colors (`1 | 2 | 3 | 4 | 5`)**:
    - `5` (5★ Gold): `#d99838` (bg `#382914`, border `#e8ad4f`)
    - `4` (4★ Purple): `#9f6be8` (bg `#291c3d`, border `#b485f2`)
    - `3` (3★ Blue): `#4fa3e3` (bg `#162b3d`, border `#66b5f0`)
    - `2` (2★ Green): `#4bb883` (bg `#153024`, border `#5ecf98`)
    - `1` (1★ Grey): `#8a91a4` (bg `#232630`, border `#a0a7ba`)
  - **Artifact Set Deterministic Hue**:
    - Compute a deterministic integer hue `0..359` from `setKey` via FNV-1a / DJB2 string hash (`getSetHue(setKey)`), producing a consistent HSL fill `hsl(<hue>, 45%, 24%)` paired with the rarity border color (using explicit artifact rarity `1..5`, or `Math.max(...getArtSetStat(setKey).rarities)` when displaying a set-level badge).
- **Rationale**: Guarantees high contrast against `--bg: #12141a` and `--panel: #1b1e27` while making every element, rarity tier, and artifact set immediately distinguishable.
- **Alternatives considered**:
  - Random or index-based set colors: Rejected because index order can shift; hashing `setKey` is 100% deterministic across routes and sessions.

### 3. Shared React Identifier Component Library (`apps/web/src/components/Identifier.tsx`)
- **Decision**: Create `apps/web/src/components/Identifier.tsx` providing:
  - `CharacterBadge`: Renders the element-colored circular avatar with 2-letter initials, character display name, optional subtitle/meta (e.g. `Lv. 90 C0`), and ownership/simulation treatment:
    - When `simulated={true}` (i.e. `member.build.type === 'tc'`): Renders a dashed outer ring (`2px dashed`) around the avatar circle plus a prominent `"SIM"` pill badge (`SIM · Fixed Preset Build` by default, or `"SIM"` when `compact={true}` with `title="SIM · Fixed Preset Build"`).
    - When `role="target"`: Renders a solid outer ring plus a `"YOURS · TARGET"` pill badge (`"TARGET"` when `compact={true}`).
    - When `role="owned"`: Renders a solid outer ring plus a `"YOUR BUILD"` pill badge (`"YOURS"` when `compact={true}`).
  - `WeaponBadge`: Renders a rarity-colored circle with an inline SVG + accessible Unicode glyph for the weapon type (`sword`, `claymore`, `polearm`, `bow`, `catalyst`), weapon display name, and optional refinement/level/location suffix.
  - `ArtifactBadge`: Renders a circle with deterministic set hue fill + rarity border, an inline SVG + accessible glyph for the slot (`flower`, `plume`, `sands`, `goblet`, `circlet`, or `set` when `slotKey` is omitted), and the set/slot display name + optional piece details (`5★ +20`, main stat, substats, equipped location badge).
  - `ItemIdentifier`: Polymorphic wrapper dispatching `kind="character" | "weapon" | "artifact"` to `CharacterBadge`, `WeaponBadge`, or `ArtifactBadge`.
- **Rationale**: One component module enforces identical DOM structure, `data-*` test attributes (`data-identifier-kind`, `data-simulated`, `data-role`, `data-element`, `data-rarity`, `data-weapon-type`, `data-slot`), and visual styling across `/import`, `/presets`, `/optimize`, and `/teams`.
- **Alternatives considered**:
  - Separate per-page badge snippets: Rejected by Requirement 2 & 3 (must be a single shared component library).
