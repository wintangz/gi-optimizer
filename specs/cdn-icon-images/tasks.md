# Tasks: Cloudinary Character & Weapon Icon Images (`cdn-icon-images`)

**Input**: Design documents from `specs/cdn-icon-images/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: Shared CDN URL Constant & Helper

- [x] T001 Define and export `CLOUDINARY_GENSHIN_BASE_URL` (`'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'`) and `getCdnIconUrl(key: string): string` in `apps/web/src/lib/itemMeta.ts` and re-export from `apps/web/src/components/Identifier.tsx`

---

## Phase 2: User Story 1 & 2 - `CharacterBadge` and `WeaponBadge` CDN Images & Fallbacks

**Goal**: Render Cloudinary `<img>` icons in `CharacterBadge` and `WeaponBadge` with automatic `onError` fallback to the existing circle + initials and `<WeaponTypeIcon />` treatments.

- [x] T002 [US1] Update `CharacterBadge` in `apps/web/src/components/Identifier.tsx` to render a round-cropped `<img>` with `src={getCdnIconUrl(characterKey)}` inside the element-coloured avatar ring/background, falling back to `{meta.initials}` when `onError` fires
- [x] T003 [US2] Update `WeaponBadge` in `apps/web/src/components/Identifier.tsx` to render an `<img>` with `src={getCdnIconUrl(weaponKey)}` inside the rarity-coloured badge slot alongside the weapon name, falling back to `<WeaponTypeIcon />` when `onError` fires

---

## Phase 3: Tests & Verification

- [x] T004 [US1] [US2] Update and expand `apps/web/test/Identifier.test.tsx` to test `getCdnIconUrl`, `CharacterBadge` and `WeaponBadge` CDN `<img>` URLs (including `Furina`, `SplendorOfTranquilWaters`, `Somnia`, `TravelerCryo`, `QuantumCatalyst`), and `onError` fallback rendering (`>FU<` initials for `CharacterBadge`, `<WeaponTypeIcon />` for `WeaponBadge`)
- [x] T005 Run full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) and verify `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and `fixtures` have zero diff
