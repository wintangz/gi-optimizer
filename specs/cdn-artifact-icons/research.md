# Research: Cloudinary Artifact Piece Icons (`cdn-artifact-icons`)

## Decision 1: URL Helper Signature & Location
- **Decision**: Add `getCdnArtifactIconUrl(setKey: string, slotKey: IdentifierSlotKey): string` next to `getCdnIconUrl` in `apps/web/src/lib/itemMeta.ts` and re-export it from `apps/web/src/components/Identifier.tsx`.
- **Rationale**: Reuses `CLOUDINARY_GENSHIN_BASE_URL` in the same module while keeping `packages/presets` and `packages/engine` untouched.

## Decision 2: Per-Key `onError` Fallback in `ArtifactBadge`
- **Decision**: Compute `const pieceKey = setKey && slotKey ? `${setKey}-${slotKey}` : null` and track `const [failedKey, setFailedKey] = useState<string | null>(null)` inside `ArtifactBadge`. When `pieceKey && failedKey !== pieceKey`, render `<img src={getCdnArtifactIconUrl(setKey, slotKey!)} ... onError={() => setFailedKey(pieceKey)} />` inside `artifact-slot-strip`; otherwise render `<SlotIcon slotKey={slotKey} iconProps={{ size: iconSize }} />` (or `<SetEmblemIcon />` when `slotKey` is omitted).
- **Rationale**: Matches the exact per-key `onError` fallback pattern established in `cdn-icon-images`.
