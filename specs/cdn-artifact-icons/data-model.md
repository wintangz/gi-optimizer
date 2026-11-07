# Data Model: Cloudinary Artifact Piece Icons (`cdn-artifact-icons`)

## Functions (`apps/web/src/lib/itemMeta.ts`)

| Symbol | Type | Description |
|---|---|---|
| `getCdnArtifactIconUrl(setKey, slotKey)` | `(setKey: string, slotKey: IdentifierSlotKey) => string` | Returns `${CLOUDINARY_GENSHIN_BASE_URL}/${setKey}-${slotKey}.png` (e.g. `.../Genshin/GoldenTroupe-flower.png`). |

## Component State (`apps/web/src/components/Identifier.tsx`)

### `ArtifactBadge`
- **Props**: `ArtifactBadgeProps` (`setKey`, `slotKey`, `rarity`, `compact`, `slotOnly`, `subtitle`).
- **Internal State**: `failedKey: string | null` (initialized to `null`).
- **Derived Values**:
  - `pieceKey = setKey && slotKey ? `${setKey}-${slotKey}` : null`
  - `imageFailed = pieceKey !== null && failedKey === pieceKey`
- **Rendering inside `data-testid="artifact-slot-strip"`**:
  - If `slotKey` and `setKey` and `!imageFailed`: renders `<img src={getCdnArtifactIconUrl(setKey, slotKey)} alt={`${meta.setDisplayName} · ${meta.slotDisplayName}`} width={stripSize} height={stripSize} loading="lazy" decoding="async" onError={() => setFailedKey(pieceKey)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />`.
  - Else if `slotKey`: renders `<SlotIcon slotKey={slotKey} iconProps={{ size: iconSize }} />`.
  - Else: renders `<SetEmblemIcon size={iconSize} />`.
