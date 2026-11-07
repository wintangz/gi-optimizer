# Tasks: CharacterBadge Image vs. Fallback State Styling (`badge-image-state-style`)

**Input**: Design documents from `specs/badge-image-state-style/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

## Phase 1: `CharacterBadge` Two-State Visual Styling

- [x] T001 [US1] Update `CharacterBadge` in `apps/web/src/components/Identifier.tsx` so the image state (`!imageFailed`) uses `size = compact ? 27 : 34` and a `2px solid` border (with no dashed borders anywhere in the image state), and the fallback state (`imageFailed`) uses `size = compact ? 24 : 30` and a `2px dashed` border

---

## Phase 2: Tests & Full Verification

- [x] T002 [US1] Update and pin component tests in `apps/web/test/Identifier.test.tsx` for both states of `CharacterBadge` (solid border + larger size `34px`/`27px` + zero `dashed` in image state; dashed border + `30px`/`24px` size + initials in fallback state)
- [x] T003 Run full verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), commit as `"feat: badge-image-state-style"`, and push to `origin main`
