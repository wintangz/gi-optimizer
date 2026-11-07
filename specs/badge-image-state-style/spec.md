# Feature Specification: CharacterBadge Image vs. Fallback State Styling (`badge-image-state-style`)

**Feature Branch**: `badge-image-state-style`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User description: "Feature 2: badge-image-state-style. CharacterBadge gets two visual states. When the character's image loads successfully: the badge border is SOLID and the badge renders slightly larger than today (about +10%, e.g. +4px at the default size — keep proportions and layout stable). When the badge is in its fallback state (no image / load failed, initials shown): the border is DASHED and the size stays exactly today's. The dashed border must never appear in the image state. Tests updated/pinned for both states; no other component changes."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Distinct Image State vs. Fallback State on `CharacterBadge` (Priority: P1)

`CharacterBadge` has two distinct visual states based on whether it is rendering the character's image or the initials fallback:
1. **Image State** (`!imageFailed`): The circular badge renders slightly larger than today (`34px` default, `+4px` over `30px`; `27px` compact, `+3px` over `24px`), and the badge border is always **SOLID** (`2px solid ${meta.elementColor.border}`). A dashed border never appears in the image state (including when `simulated={true}`).
2. **Fallback State** (`imageFailed`, no image / load failed, initials shown): The circular badge size stays **exactly today's** (`30px` default, `24px` compact), and the badge border is **DASHED** (`2px dashed ${meta.elementColor.border}`).

**Why this priority**: Gives character portraits slightly more breathing room and a clean solid element-colored frame when an image is present, while reserving the dashed border exclusively for the text-initials fallback state.

**Independent Test**: Render `CharacterBadge` in the image state (both normal and `simulated` / `compact`) and verify `width:34px` (`width:27px` compact), `border:2px solid ...`, and zero occurrences of `dashed`; then trigger `onError` on the `<img>` and verify the fallback state renders `width:30px` (`width:24px` compact), `border:2px dashed ...`, and the character's 2-letter initials.

**Acceptance Scenarios**:

1. **Given** `CharacterBadge` is in the image state (`!imageFailed`), **When** rendered with default or `compact` or `simulated` props, **Then** its circular badge size is `34px` (`27px` when `compact`), its border is `2px solid ${meta.elementColor.border}`, and `dashed` does not appear anywhere in the rendered badge.
2. **Given** `CharacterBadge` transitions to its fallback state (`onError` fired on the `<img>`), **When** re-rendered, **Then** its circular badge size is `30px` (`24px` when `compact`), its border is `2px dashed ${meta.elementColor.border}`, and `meta.initials` is displayed inside the circle.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In `CharacterBadge` (`apps/web/src/components/Identifier.tsx`), when `!imageFailed` (image state), set the circular badge dimensions (`width`, `height`, `minWidth`, and `<img>` `width`/`height`) to `34px` (`27px` when `compact`) and set `border: 2px solid ${meta.elementColor.border}` with `outline: 'none'`.
- **FR-002**: In `CharacterBadge`, when `imageFailed` is `true` (fallback state showing `meta.initials`), set the circular badge dimensions (`width`, `height`, `minWidth`) to `30px` (`24px` when `compact`) and set `border: 2px dashed ${meta.elementColor.border}` with `outline: 'none'`.
- **FR-003**: Ensure no dashed border or outline (`dashed`) ever appears in `CharacterBadge` during the image state (including on `sim-pill`, which uses `1px solid var(--warn)`).
- **FR-004**: Keep all other components (`WeaponBadge`, `ArtifactBadge`, `StatChip`, etc.) and packages untouched.

---

## Assumptions Logged

1. **Compact Image State Size**: Default size increases from `30px` to `34px` (`+4px`, `+13.3%`, as explicitly suggested by `"about +10%, e.g. +4px at the default size"`), and `compact` size increases proportionally from `24px` to `27px` (`+3px`, `+12.5%`). Fallback state keeps `30px` default and `24px` compact.
2. **No Dashed Border in Image State**: Both the avatar circle's `simulated` dashed border/outline and `sim-pill`'s dashed border are replaced so that in the image state `CharacterBadge` never renders a dashed border anywhere, while `data-simulated="true"` and the `SIM` pill text/color remain intact.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Component tests in `apps/web/test/Identifier.test.tsx` pin both states of `CharacterBadge`:
  - Image state: `34px` default (`27px` compact), `2px solid` border, `not.toContain('dashed')`.
  - Fallback state (after `onError`): `30px` default (`24px` compact), `2px dashed` border, initials rendered.
- **SC-002**: Full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) passes with 0 errors.
