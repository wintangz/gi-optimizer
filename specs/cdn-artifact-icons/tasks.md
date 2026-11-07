# Tasks: Cloudinary Artifact Piece Icons (`cdn-artifact-icons`)

**Input**: Design documents from `specs/cdn-artifact-icons/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Shared Helper & Component Update

- [x] T001 Define and export `getCdnArtifactIconUrl(setKey: string, slotKey: IdentifierSlotKey): string` in `apps/web/src/lib/itemMeta.ts` and re-export from `apps/web/src/components/Identifier.tsx`
- [x] T002 [US1] Update `ArtifactBadge` in `apps/web/src/components/Identifier.tsx` to render `<img src={getCdnArtifactIconUrl(setKey, slotKey)} ... />` inside `artifact-slot-strip` when `setKey` and `slotKey` are present, falling back to `<SlotIcon slotKey={slotKey} />` when `onError` fires, and update empty-slot placeholder in `apps/web/src/components/OptimizeViews.tsx` to pass `setKey=""`

---

## Phase 2: Tests & Verification

- [x] T003 [US1] Update `apps/web/test/Identifier.test.tsx` to pin `getCdnArtifactIconUrl` for known set+slot keys, verify `ArtifactBadge` renders the Cloudinary piece URL when `slotKey` is provided, and verify `onError` falls back to `<SlotIcon />`
- [x] T004 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, then commit as `"feat: cdn-artifact-icons"`
