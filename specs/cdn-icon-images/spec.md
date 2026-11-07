# Feature Specification: Cloudinary Character & Weapon Icon Images (`cdn-icon-images`)

**Feature Branch**: `cdn-icon-images`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User description: "Feature: cdn-icon-images. Run the full Spec Kit flow autonomously (specify → plan → tasks → implement → test) without asking me questions; log assumptions in the spec. Goal: character and weapon icons load from Cloudinary instead of rendering text-only everywhere. Icon URL for an app character/weapon key: https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/{Key}.png (one shared base constant; {Key} is the app's own key, e.g. Furina, SplendorOfTranquilWaters)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cloudinary Character Icons with Circle + Initials Fallback (Priority: P1)

Everywhere a character is rendered via `CharacterBadge` across `/import`, `/presets`, `/teams`, and `/optimize`, the circular avatar slot loads the character's portrait from `https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/{Key}.png` (round-cropped to fill the badge while preserving the element-colour background, solid/dashed element ring, and simulated/ownership pills). If the image fails to load (`onError` due to offline state, CDN outage, or un-hosted keys like `Somnia` or `TravelerCryo`), `CharacterBadge` falls back to its existing circle + 2-letter initials (`meta.initials`) rendering without special-casing any keys.

**Why this priority**: Immediate visual recognition of characters across preset rosters, team setups, and artifact locations while maintaining offline/missing-asset resilience.

**Independent Test**: Render `CharacterBadge` for `Furina` and verify `<img src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png" ...>` is rendered inside the element-coloured circular badge; trigger the `<img>` `onError` handler and verify the badge re-renders with `FU` initials and no `<img>` element.

**Acceptance Scenarios**:

1. **Given** `CharacterBadge` is rendered with `characterKey="Furina"`, **When** the image has not errored, **Then** it renders a plain `<img>` element with `src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png"` filling the circular element-coloured badge (`border-radius: 999px`, `object-fit: cover`), preserving `data-element="hydro"`, element ring/background colors, and role/simulated pills.
2. **Given** `CharacterBadge` is rendered with any key (including `Furina`, `Somnia`, or `TravelerCryo`), **When** the `<img>`'s `onError` event fires, **Then** `CharacterBadge` falls back to rendering the 2-letter initials (`meta.initials`, e.g., `FU`, `SO`, `TC`) inside the element-coloured circle, identical to the pre-feature rendering.

---

### User Story 2 - Cloudinary Weapon Icons with Weapon-Type Glyph Fallback (Priority: P1)

Everywhere a weapon is presented with an icon/badge slot today via `WeaponBadge` (e.g., the Akasha simulated weapon picker on `/presets` and `/optimize`, owned weapon match selectors, preset gear tables, `/teams` TC weapon selectors, and `/import` weapon rows), the rarity-coloured badge slot displays the weapon's icon from `https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/{Key}.png` alongside the weapon name, stars, and subtitle. If the image fails to load (`onError`, e.g., offline or `QuantumCatalyst`), `WeaponBadge` falls back to its existing `<WeaponTypeIcon />` + weapon name treatment.

**Why this priority**: Visual weapon identification across weapon pickers, preset tables, and inventory views with zero-config fallback when offline or when a key lacks a CDN asset.

**Independent Test**: Render `WeaponBadge` for `SplendorOfTranquilWaters` and verify `<img src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png" ...>` is rendered inside the rarity-coloured badge; trigger `onError` on the `<img>` and verify `WeaponBadge` falls back to `<WeaponTypeIcon />` (`data-gi-icon="SwordIcon"`) with no `<img>` element.

**Acceptance Scenarios**:

1. **Given** `WeaponBadge` is rendered with `weaponKey="SplendorOfTranquilWaters"`, **When** the image has not errored, **Then** it renders a plain `<img>` with `src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png"` inside the rarity-coloured badge alongside the weapon display name and rarity stars.
2. **Given** `WeaponBadge` is rendered with any weapon key (including `SplendorOfTranquilWaters` or `QuantumCatalyst`), **When** the `<img>`'s `onError` event fires, **Then** `WeaponBadge` falls back to rendering `<WeaponTypeIcon weaponType={meta.weaponType} />` alongside the weapon display name, identical to the pre-feature treatment.

---

### Edge Cases

- **Keys without hosted CDN images (`Somnia`, `TravelerCryo`, `QuantumCatalyst`)**: Not special-cased in code; they construct the standard `${CLOUDINARY_GENSHIN_BASE_URL}/${key}.png` URL and rely on the `<img>` `onError` handler to fall back to initials or `WeaponTypeIcon`.
- **Dynamic prop updates (`characterKey` or `weaponKey` changes on an mounted badge)**: Error state is tracked by storing the failed key (`failedKey === characterKey` / `failedKey === weaponKey`), so switching a picker to a new character or weapon key automatically attempts to load the new key's CDN image without needing an effect reset.
- **Static export (`next build` -> `apps/web/out`)**: Uses standard HTML `<img>` elements with zero new dependencies and no Next.js image optimization server requirement.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A single shared base constant `CLOUDINARY_GENSHIN_BASE_URL = 'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'` and URL builder `getCdnIconUrl(key: string): string` MUST be exported from `apps/web/src/lib/itemMeta.ts` (and re-exported from `apps/web/src/components/Identifier.tsx`), returning `https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/${key}.png`.
- **FR-002**: `CharacterBadge` MUST render a plain `<img>` pointing to `getCdnIconUrl(characterKey)` filling the circular badge (`borderRadius: '999px'`, `objectFit: 'cover'`) while preserving the element-colour ring/background treatment (`meta.elementColor.bg`, `meta.elementColor.border`, and `simulated` dashed ring).
- **FR-003**: When the `CharacterBadge` `<img>` fires `onError`, `CharacterBadge` MUST fall back to rendering `meta.initials` inside the circular element-coloured badge (exact parity with pre-feature rendering). No character keys (`Somnia`, `TravelerCryo`, etc.) may be hardcoded or special-cased.
- **FR-004**: `WeaponBadge` MUST render a plain `<img>` pointing to `getCdnIconUrl(weaponKey)` inside the rarity-coloured weapon badge alongside the weapon display name while preserving the rarity background/border and `<RarityStars />`.
- **FR-005**: When the `WeaponBadge` `<img>` fires `onError`, `WeaponBadge` MUST fall back to rendering `<WeaponTypeIcon weaponType={meta.weaponType} />` alongside the weapon display name (exact parity with pre-feature rendering). No weapon keys (`QuantumCatalyst`, etc.) may be hardcoded or special-cased.
- **FR-006**: `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and `fixtures` MUST remain completely untouched, and `apps/web` static export (`pnpm build`) MUST succeed with zero new dependencies.

---

## Assumptions Logged

1. **Error State Keying**: Storing `failedKey: string | null` in `useState` inside `CharacterBadge` and `WeaponBadge` (`const imageFailed = failedKey === characterKey`) cleanly handles both initial render (`false`), load-failure fallback (`true` when `onError` fires for the active key), and key changes (`false` as soon as `characterKey` / `weaponKey` prop changes).
2. **Untouched Packages**: Placing `CLOUDINARY_GENSHIN_BASE_URL` and `getCdnIconUrl` in `apps/web/src/lib/itemMeta.ts` keeps `packages/presets`, `packages/engine`, and `fixtures` 100% untouched as required.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unit/component tests in `apps/web/test/Identifier.test.tsx` verify that `CharacterBadge` and `WeaponBadge` render the exact Cloudinary URL for known keys (`Furina`, `SplendorOfTranquilWaters`) as well as un-special-cased edge keys (`Somnia`, `TravelerCryo`, `QuantumCatalyst`).
- **SC-002**: Component tests in `apps/web/test/Identifier.test.tsx` simulate `onError` on the rendered `<img>` in both `CharacterBadge` and `WeaponBadge` and verify they re-render with the exact fallback (`>FU<` initials for `CharacterBadge`, `WeaponTypeIcon` `data-gi-icon="SwordIcon"` for `WeaponBadge`, and no `<img>`).
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` (Next.js static export to `apps/web/out`) all pass with 0 errors.
