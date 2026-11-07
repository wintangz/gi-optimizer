# Data Model: Image-Led Tile Grid Pickers (`image-led-pickers`)

## Shared Tile Picker Props (`apps/web/src/components/TilePickers.tsx`)

### `WeaponTileOption` & `WeaponTilePickerProps`
- `id`: `string` (unique tile identifier: weapon key for simulated pickers, or weapon instance ID for owned inventory pickers)
- `weaponKey`: `string` (used for `getCdnIconUrl(weaponKey)` and `getWeaponMeta(weaponKey)`)
- `label?`: `string` (defaults to `meta.displayName`)
- `subcaption?`: `string` (e.g., `R1 · Lv.90` or `(on Furina)`)
- `disabled?`: `boolean`
- `options`: ` readonly WeaponTileOption[]`
- `value`: `string` (currently selected `id`)
- `onChange`: `(nextId: string) => void`
- `searchable?`: `boolean`
- `ariaLabel`: `string`

### `CharacterTileOption` & `CharacterTilePickerProps`
- `key`: `string` (character key, or `""` for an `"All"` option)
- `label?`: `string`
- `subcaption?`: `string`
- `disabled?`: `boolean`
- `options`: `readonly CharacterTileOption[]`
- `value`: `string | readonly string[]` (supports single-select `value: string` or multi-select `selectedKeys: readonly string[]`)
- `onChange`: `(characterKey: string) => void`
- `searchable?`: `boolean`
- `ariaLabel`: `string`

### `ArtifactSetTilePickerProps`
- `setKeys`: `readonly string[]`
- `value`: `string` (`""` for none, or a setKey)
- `onChange`: `(nextSetKey: string) => void`
- `allowNone?`: `boolean` (renders a `"No 4p Set"` tile when true)
- `searchable?`: `boolean`
- `ariaLabel`: `string`
