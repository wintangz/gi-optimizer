# Research: Image-Led Tile Grid Pickers (`image-led-pickers`)

## Decision 1: Shared Tile Picker Component Architecture
- **Decision**: Create `apps/web/src/components/TilePickers.tsx` exporting `WeaponTilePicker`, `CharacterTilePicker`, `ArtifactSetTilePicker`, and `PresetTilePicker`, backed by shared `.tile-picker-*` CSS rules in `apps/web/src/app/globals.css`.
- **Rationale**: Ensures every picker across `/optimize`, `/presets`, and `/teams` shares the exact same `56–60px` rarity-backed image tile layout, selected ring, hover/focus-visible styling, keyboard-accessible `<button type="button">` semantics, and per-tile `onError` fallback.

## Decision 2: Picker-Level `failedKeys` State Map
- **Decision**: Track `const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({})` once per picker component rather than calling `useState` inside each rendered tile.
- **Rationale**: Keeps the number of React hook calls per picker constant regardless of how many tiles are rendered or filtered by search, avoiding hook-index shifts in lightweight Node VNode test harnesses (`teams-deferred-start.test.tsx`) and reducing per-tile memory overhead.
