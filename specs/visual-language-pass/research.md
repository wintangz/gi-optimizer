# Research: Visual Language Pass (`visual-language-pass`)

## 1. Copying GO `svgicons` Without Un-Stubbing GO's UI Layer

- **Decision**: Copy all 25 vector icon components from `vendor/genshin-optimizer/libs/gi/svgicons/src/icons/` (`FlowerIcon`, `PlumeIcon`, `SandsIcon`, `GobletIcon`, `CircletIcon`, `AnemoIcon`, `CryoIcon`, `DendroIcon`, `ElectroIcon`, `GeoIcon`, `HydroIcon`, `PhysicalIcon`, `PyroIcon`, `AtkIcon`, `CdRedIcon`, `CritDmgIcon`, `CritRateIcon`, `DefIcon`, `EleMasIcon`, `EnerRechIcon`, `HealAddIcon`, `HealingBonusIcon`, `HpIcon`, `ShieldStrIcon`, `StaminaIcon`) and their dispatchers (`SlotIcon`, `StatIcon`, `ElementIcon`) into `apps/web/src/components/SvgIcons.tsx` as pure React `<svg>` components with `vendor/genshin-optimizer/LICENSE` (MIT, `Copyright (c) 2020-present, frzyc`) preserved at the top of the file.
- **Rationale**: `vendor/genshin-optimizer/libs/gi/svgicons` wraps SVG paths in `@mui/material`'s `createSvgIcon` and imports `@genshin-optimizer/gi/consts`. Converting the wrapper to a lightweight `createGiSvgIcon` helper using standard React `<svg viewBox="0 0 24 24" fill="currentColor">` eliminates any `@mui/material` or submodule dependency while preserving every path coordinate identically (and fixing the stray comma text node in GO's `HpIcon.tsx`).

## 2. Flat Genshin Rarity Colours & Contrast Rules

- **Decision**: Define `RARITY_COLORS` once in `packages/presets/src/metadata.ts` (and export via `@gi/presets` and `apps/web/src/lib/itemMeta.ts`):
  - `5` (5-star gold): `{ bg: '#d89c3a', fg: '#1a1206', border: '#f0be5b' }` (flat gold background, dark text)
  - `4` (4-star purple): `{ bg: '#7b52ab', fg: '#ffffff', border: '#a375db' }` (flat purple background, white text)
  - `3` (3-star blue): `{ bg: '#4180c4', fg: '#ffffff', border: '#6ca6e8' }` (flat blue background, white text)
  - `2` (2-star green): `{ bg: '#4ea876', fg: '#0d1f15', border: '#72cca0' }` (flat green background, dark text)
  - `1` (1-star grey): `{ bg: '#78808c', fg: '#ffffff', border: '#9aa2b0' }` (flat grey background, white text)
- **Rationale**: Matches Genshin Impact's item rarity palette with flat, simple shades and high-contrast readable text (dark on 5★ gold and 2★ green, white on 4★ purple, 3★ blue, and 1★ grey). `CharacterBadge` continues to use `ELEMENT_COLORS` exclusively.

## 3. Stroke-Style Action Icons in the Same Module

- **Decision**: Add stroke-style SVG icons (`UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, `DownloadIcon`, `PlusIcon`, `TrashIcon`, `CopyIcon`, `StopIcon`) in `apps/web/src/components/SvgIcons.tsx` using `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"` and matching default `1em` sizing with `SlotIcon` / `StatIcon` / `ElementIcon`.

## 4. Stats Without a Dedicated GO Stat Glyph

- **Decision**: Every stat in GO's stat system (`hp`, `hp_`, `base_hp`, `atk`, `atk_`, `base_atk`, `def`, `def_`, `base_def`, `eleMas`, `critRate_`, `critDMG_`, `enerRech_`, `heal_`, `incHeal_`, `cdRed_`, `shield_`, `stamina`, and all 8 `*_dmg_` / `*_enemyRes_` elemental/physical keys) has a glyph in `StatIcon` (either a `Stats/*` icon or an `Element/*` icon). Only non-stat rotation fields—specifically **Hit Mode** (`avgHit`, `critHit`, `hit`) and **Amplifying/Additive Reaction** (`vaporize`, `melt`, `aggravate`, `spread`, where we pair the triggering element icon + short reaction name)—lack a dedicated stat glyph and therefore keep their concise short text label inside a chip.
