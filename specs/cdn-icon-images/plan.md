# Implementation Plan: Cloudinary Character & Weapon Icon Images (`cdn-icon-images`)

**Branch**: `cdn-icon-images` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/cdn-icon-images/spec.md)  
**Input**: Feature specification from `specs/cdn-icon-images/spec.md`

## Summary

Load character and weapon icons from Cloudinary (`https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/{Key}.png`) via one shared base constant in `apps/web/src/lib/itemMeta.ts`, updating `CharacterBadge` and `WeaponBadge` in `apps/web/src/components/Identifier.tsx` to render plain `<img>` elements that gracefully fall back on `onError` to the exact current rendering (`meta.initials` circle for `CharacterBadge`, `<WeaponTypeIcon />` for `WeaponBadge`).

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (App Router with `output: 'export'`)  
**Primary Dependencies**: React (`useState`), existing `@gi/presets` metadata helpers (`getCharacterMeta`, `getWeaponMeta`)  
**Storage**: N/A  
**Testing**: Vitest (`apps/web/test/Identifier.test.tsx`)  
**Target Platform**: Static web export (`apps/web/out`)  
**Project Type**: pnpm monorepo (`apps/web`)  
**Constraints**: Zero new dependencies; plain `<img>` elements; `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and `fixtures` untouched; no special-casing of keys missing CDN images (`Somnia`, `TravelerCryo`, `QuantumCatalyst`).

## Constitution Check

- **Submodule Integrity**: `vendor/genshin-optimizer` untouched.
- **Static Export**: Plain `<img>` elements require no server runtime; `next build` static export continues working identically.
- **Engine & Golden Fixtures**: `packages/engine`, `packages/presets`, and `fixtures` untouched.

## Project Structure

### Documentation (this feature)

```text
specs/cdn-icon-images/
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
│   │   └── itemMeta.ts            # Export CLOUDINARY_GENSHIN_BASE_URL and getCdnIconUrl(key)
│   └── components/
│       └── Identifier.tsx         # CharacterBadge and WeaponBadge CDN <img> + onError fallback
└── test/
    └── Identifier.test.tsx        # CDN URL rendering + onError fallback component coverage
```
