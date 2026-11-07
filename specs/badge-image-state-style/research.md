# Research: CharacterBadge Image vs. Fallback State Styling (`badge-image-state-style`)

## Decision 1: Dimensions for Image vs. Fallback States
- **Decision**:
  - Fallback state (`imageFailed === true`): `size = compact ? 24 : 30` (exact pre-existing dimensions).
  - Image state (`imageFailed === false`): `size = compact ? 27 : 34` (`+4px` at default `30 -> 34`, `+3px` at compact `24 -> 27`, ~+12.5%–13.3%).
- **Rationale**: Matches the prompt's explicit guidance (`"about +10%, e.g. +4px at the default size — keep proportions and layout stable"`) while keeping fallback dimensions identical to today's (`30px` / `24px`).

## Decision 2: Solid vs. Dashed Border Exclusivity
- **Decision**:
  - Avatar circle `border`: `imageFailed ? '2px dashed ${meta.elementColor.border}' : '2px solid ${meta.elementColor.border}'`, with `outline: 'none'`.
  - `sim-pill` `border`: `'1px solid var(--warn)'` (consistent with `target-pill` `'1px solid var(--ok)'` and `owned-pill` `'1px solid var(--accent)'`).
- **Rationale**: Guarantees that in the image state (`!imageFailed`), a dashed border never appears anywhere in `CharacterBadge` (even when `simulated={true}`), while in the fallback state (`imageFailed`), the badge border is always `2px dashed`.
