# Data Model: Visual Language Pass (`visual-language-pass`)

## 1. Shared Metadata Constants & Helpers (`packages/presets/src/metadata.ts`)

```ts
export const RARITY_COLORS: Record<IdentifierRarity, ColorTokens> = {
  5: { fg: '#1a1206', bg: '#d89c3a', border: '#f0be5b' },
  4: { fg: '#ffffff', bg: '#7b52ab', border: '#a375db' },
  3: { fg: '#ffffff', bg: '#4180c4', border: '#6ca6e8' },
  2: { fg: '#0d1f15', bg: '#4ea876', border: '#72cca0' },
  1: { fg: '#ffffff', bg: '#78808c', border: '#9aa2b0' },
}

export function formatRarityStars(rarity: number): string // e.g. "★★★★★", "★★★★☆"
export function getArtifactSetShortName(setKey: string): string // e.g. "Golden Troupe", "Crimson Witch"
export function shortStatLabel(statKey: string): string // e.g. "CR", "CD", "ER", "EM", "HP%", "Pyro%"
```

`ArtifactMeta` is extended with `setShortName: string`.

## 2. Copied GO SVG Icon Components (`apps/web/src/components/SvgIcons.tsx`)

- **ArtifactSlot**: `FlowerIcon`, `PlumeIcon`, `SandsIcon`, `GobletIcon`, `CircletIcon`, `SlotIcon`, `SetEmblemIcon`
- **Element**: `AnemoIcon`, `CryoIcon`, `DendroIcon`, `ElectroIcon`, `GeoIcon`, `HydroIcon`, `PhysicalIcon`, `PyroIcon`, `ElementIcon`, `hasElementIcon`, `resolveStatElement`
- **Stats**: `AtkIcon`, `CdRedIcon`, `CritDmgIcon`, `CritRateIcon`, `DefIcon`, `EleMasIcon`, `EnerRechIcon`, `HealAddIcon`, `HealingBonusIcon`, `HpIcon`, `ShieldStrIcon`, `StaminaIcon`, `StatIcon`, `hasStatIcon`
- **Weapon Silhouette Icons**: `SwordIcon`, `ClaymoreIcon`, `PolearmIcon`, `BowIcon`, `CatalystIcon`, `WeaponTypeIcon`
- **Action Stroke Icons**: `UploadIcon`, `PlayIcon`, `FunnelIcon`, `GearIcon`, `BackArrowIcon`, `DownloadIcon`, `PlusIcon`, `TrashIcon`, `CopyIcon`, `StopIcon`

## 3. Shared Visual Language UI Components (`apps/web/src/components/Identifier.tsx`)

- `CharacterBadge`: **UNCHANGED** (circle + 2-letter initials + element colour + SIM/TARGET/OWNED pills).
- `RarityStars({ rarity, size })`: Renders filled `★` and empty `☆` stars (`data-testid="rarity-stars"`).
- `WeaponBadge`: Renders weapon-type SVG icon + weapon name inside a flat rarity-coloured badge (`RARITY_COLORS[rarity]`) with `RarityStars` beside/under it and optional compact subtitle; zero `"5-star"` text.
- `ArtifactBadge`: Renders `SlotIcon` (or `SetEmblemIcon` when `slotKey` is omitted) on a flat rarity-coloured strip/badge (`RARITY_COLORS[rarity]`), followed by a compact set-coloured chip showing `meta.setShortName` (unless `slotOnly` is true).
- `StatChip({ statKey, value, showLabel, compact })`: Renders `StatIcon` (coloured by element when `statKey` is an elemental stat) + formatted value (e.g. `3.9%` or `299`) or short label when no value/glyph is present.
- `BuildComparisonBars({ currentTotal, optimisedTotal, rank })`: Renders two proportional horizontal bars scaled to `Math.max(currentTotal ?? 0, optimisedTotal ?? 0, 1)` with large formatted total numbers at the bar ends and single-line captions.
