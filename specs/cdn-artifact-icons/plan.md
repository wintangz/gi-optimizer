# Implementation Plan: Cloudinary Artifact Piece Icons (`cdn-artifact-icons`)

**Branch**: `cdn-artifact-icons` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/cdn-artifact-icons/spec.md)  
**Input**: Feature specification from `specs/cdn-artifact-icons/spec.md`

## Summary

Add `getCdnArtifactIconUrl(setKey, slotKey)` next to `getCdnIconUrl` in `apps/web/src/lib/itemMeta.ts` and update `ArtifactBadge` in `apps/web/src/components/Identifier.tsx` so artifact slot badges render the piece's Cloudinary PNG (`{CLOUDINARY_GENSHIN_BASE_URL}/{SetKey}-{slot}.png`) inside the rarity-coloured strip with per-key `onError` fallback to the existing `<SlotIcon />` glyph.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (static export)  
**Primary Dependencies**: React (`useState`), existing `@gi/presets` metadata helpers  
**Testing**: Vitest (`apps/web/test/Identifier.test.tsx`)  
**Constraints**: Plain `<img>` elements, zero new dependencies, `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and golden fixtures untouched.

## Project Structure

### Documentation (this feature)

```text
specs/cdn-artifact-icons/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   └── itemMeta.ts            # Export getCdnArtifactIconUrl(setKey, slotKey)
│   └── components/
│       ├── Identifier.tsx         # ArtifactBadge CDN <img> + per-key onError fallback to SlotIcon
│       └── OptimizeViews.tsx      # Empty slot placeholder passes setKey=""
└── test/
    └── Identifier.test.tsx        # Pin getCdnArtifactIconUrl + ArtifactBadge CDN URL & onError fallback
```
