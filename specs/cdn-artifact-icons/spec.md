# Feature Specification: Cloudinary Artifact Piece Icons (`cdn-artifact-icons`)

**Feature Branch**: `cdn-artifact-icons`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User description: "Feature 1: cdn-artifact-icons. Every artifact piece has an icon on the same Cloudinary base as cdn-icon-images: {CLOUDINARY_GENSHIN_BASE_URL}/{SetKey}-{slot}.png (e.g. GoldenTroupe-flower, slot ∈ flower|plume|sands|goblet|circlet). Add a getCdnArtifactIconUrl(setKey, slotKey) helper next to getCdnIconUrl. Wherever artifact slot badges are rendered today (the build comparison rows, the current-build display, and any other place using the same badge treatment), show the piece's image in the badge with the same per-key onError fallback pattern: on load failure, render exactly today's slot-glyph treatment. Plain img elements, no new dependencies, engine/presets/goldens untouched. Component tests pin the URL for a known set+slot and the fallback on error."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cloudinary Artifact Piece Icons in Slot Badges with Slot-Glyph Fallback (Priority: P1)

Wherever artifact slot badges are rendered via `ArtifactBadge` (with both `setKey` and `slotKey`, such as build comparison rows, current-build display, expanded `ArtifactPieceRow` rows, and `/import` artifact inventory rows), the rarity-coloured slot strip renders the artifact piece's image from `{CLOUDINARY_GENSHIN_BASE_URL}/{SetKey}-{slot}.png` (e.g. `https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png`). If the image fails to load (`onError`), `ArtifactBadge` falls back to its existing `<SlotIcon slotKey={slotKey} />` SVG glyph inside the rarity-coloured strip.

**Why this priority**: Gives immediate visual set+piece recognition across optimizer build comparisons and inventory rows while preserving offline/missing-asset resilience.

**Independent Test**: Render `ArtifactBadge` with `setKey="GoldenTroupe"` and `slotKey="flower"` (or `"goblet"`), verify the rendered `<img>` `src` is `https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png`, then trigger `onError` on the `<img>` and verify `ArtifactBadge` re-renders `<SlotIcon />` (`data-gi-icon="FlowerIcon"`) with no `<img>` element.

**Acceptance Scenarios**:

1. **Given** `ArtifactBadge` is rendered with a valid `setKey` (e.g. `"GoldenTroupe"`) and `slotKey` (`"flower" | "plume" | "sands" | "goblet" | "circlet"`), **When** the image has not errored, **Then** the rarity-coloured `artifact-slot-strip` renders a plain `<img>` with `src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png"`.
2. **Given** `ArtifactBadge` is rendered with `setKey` and `slotKey`, **When** the `<img>`'s `onError` event fires, **Then** `ArtifactBadge` falls back to rendering `<SlotIcon slotKey={slotKey} />` inside `artifact-slot-strip`, identical to the pre-feature slot-glyph treatment.
3. **Given** `ArtifactBadge` is rendered without `slotKey` (set-only badge, e.g. in `ArtifactSetFilter` or 4pc set summaries) or with an empty `setKey` (unequipped slot placeholder in `BuildComparisonList`), **When** rendered, **Then** it continues rendering `<SetEmblemIcon />` or `<SlotIcon />` respectively without attempting a broken CDN URL.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Export `getCdnArtifactIconUrl(setKey: string, slotKey: IdentifierSlotKey): string` next to `getCdnIconUrl` in `apps/web/src/lib/itemMeta.ts` (and re-export from `apps/web/src/components/Identifier.tsx`), returning `${CLOUDINARY_GENSHIN_BASE_URL}/${setKey}-${slotKey}.png`.
- **FR-002**: In `ArtifactBadge` (`apps/web/src/components/Identifier.tsx`), when both `setKey` and `slotKey` are present and the piece key (`${setKey}-${slotKey}`) has not failed to load, render a plain `<img>` with `src={getCdnArtifactIconUrl(setKey, slotKey)}` inside `artifact-slot-strip`.
- **FR-003**: Track image load failure per `${setKey}-${slotKey}` key via `useState<string | null>(null)` so that when `onError` fires, `ArtifactBadge` falls back to `<SlotIcon slotKey={slotKey} iconProps={{ size: iconSize }} />`, and changing `setKey` or `slotKey` automatically resets error state for the new piece.
- **FR-004**: In `BuildComparisonList` (`apps/web/src/components/OptimizeViews.tsx`), pass `setKey=""` on unequipped empty-slot placeholders so empty slots render the `<SlotIcon />` placeholder instead of a Golden Troupe piece icon.
- **FR-005**: Keep `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and golden fixtures completely untouched, with zero new dependencies.

---

## Assumptions Logged

1. **Set-Only vs Slot Badges**: `ArtifactBadge` is called with `slotKey` whenever an artifact piece/slot is displayed (build comparison rows, current-build row, `ArtifactPieceRow`, `/import` artifact rows) and without `slotKey` when representing a set bonus as a whole (`ArtifactSetFilter`, character set summaries). Only badges with both `setKey` and `slotKey` represent a specific artifact piece `{SetKey}-{slot}.png`.
2. **Empty Slot Placeholders**: Unequipped slots in `BuildComparisonList` pass `setKey=""` with `slotKey={slot}` and `slotOnly` so they render the slot glyph rather than a specific set's piece image.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit and component tests in `apps/web/test/Identifier.test.tsx` pin `getCdnArtifactIconUrl('GoldenTroupe', 'flower')` and `ArtifactBadge` `<img>` rendering for a known set+slot, and verify `onError` fallback to `<SlotIcon />`.
- **SC-002**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with 0 errors.
