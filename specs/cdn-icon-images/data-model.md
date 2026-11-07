# Data Model: Cloudinary Character & Weapon Icon Images (`cdn-icon-images`)

## Constants & Pure Functions (`apps/web/src/lib/itemMeta.ts`)

| Symbol | Type | Description |
|---|---|---|
| `CLOUDINARY_GENSHIN_BASE_URL` | `'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'` | Shared base URL constant for character and weapon PNG assets on Cloudinary. |
| `getCdnIconUrl(key: string)` | `(key: string) => string` | Returns `${CLOUDINARY_GENSHIN_BASE_URL}/${key}.png` using the app's character or weapon key directly without special-casing any keys. |

## Component State (`apps/web/src/components/Identifier.tsx`)

### `CharacterBadge`
- **Props**: `CharacterBadgeProps` (`characterKey`, `simulated`, `role`, `compact`, `subtitle`).
- **Internal State**: `failedKey: string | null` (initialized to `null`).
- **Derived Flag**: `imageFailed = failedKey === characterKey`.
- **Rendering**:
  - Outer avatar `<span>` retains element background (`meta.elementColor.bg`), foreground (`meta.elementColor.fg`), element border (`2px dashed` when `simulated`, `2px solid` otherwise), `borderRadius: '999px'`, `overflow: 'hidden'`, and dimensions (`24px` compact, `30px` default).
  - If `!imageFailed`: renders `<img src={getCdnIconUrl(characterKey)} alt={meta.displayName} width={size} height={size} loading="lazy" decoding="async" onError={() => setFailedKey(characterKey)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px', display: 'block' }} />`.
  - If `imageFailed`: renders `{meta.initials}`.

### `WeaponBadge`
- **Props**: `WeaponBadgeProps` (`weaponKey`, `rarityOverride`, `compact`, `subtitle`).
- **Internal State**: `failedKey: string | null` (initialized to `null`).
- **Derived Flag**: `imageFailed = failedKey === weaponKey`.
- **Rendering**:
  - Rarity-coloured pill `<span>` retains `background: meta.rarityColor.bg`, `color: meta.rarityColor.fg`, `border: 1px solid ${meta.rarityColor.border}`.
  - If `!imageFailed`: renders `<img src={getCdnIconUrl(weaponKey)} alt={meta.displayName} width={imgSize} height={imgSize} loading="lazy" decoding="async" onError={() => setFailedKey(weaponKey)} style={{ width: `${imgSize}px`, height: `${imgSize}px`, objectFit: 'contain', display: 'block', flexShrink: 0 }} />` before `<strong>{meta.displayName}</strong>`.
  - If `imageFailed`: renders `<WeaponTypeIcon weaponType={meta.weaponType} iconProps={{ size: iconSize }} />` before `<strong>{meta.displayName}</strong>`.
