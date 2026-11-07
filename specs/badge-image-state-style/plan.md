# Implementation Plan: CharacterBadge Image vs. Fallback State Styling (`badge-image-state-style`)

**Branch**: `badge-image-state-style` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/badge-image-state-style/spec.md)  
**Input**: Feature specification from `specs/badge-image-state-style/spec.md`

## Summary

Update `CharacterBadge` in `apps/web/src/components/Identifier.tsx` so that:
- In the **image state** (`!imageFailed`), the badge renders slightly larger (`34px` default, `27px` compact) with a **solid** border (`2px solid ${meta.elementColor.border}`) and no dashed border anywhere.
- In the **fallback state** (`imageFailed`), the badge stays at today's size (`30px` default, `24px` compact) with a **dashed** border (`2px dashed ${meta.elementColor.border}`).

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (static export)  
**Primary Dependencies**: React (`useState`)  
**Testing**: Vitest (`apps/web/test/Identifier.test.tsx`)  
**Constraints**: No other component changes; `vendor/genshin-optimizer`, `packages/engine`, `packages/presets`, and golden fixtures untouched.

## Project Structure

### Documentation (this feature)

```text
specs/badge-image-state-style/
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
│   └── components/
│       └── Identifier.tsx         # CharacterBadge image vs. fallback state size & border
└── test/
    └── Identifier.test.tsx        # Pin both states of CharacterBadge
```
