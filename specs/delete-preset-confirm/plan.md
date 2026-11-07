# Implementation Plan: Delete Preset Confirmation

**Branch**: `main` (`specs/delete-preset-confirm`) | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary

1. **Presets Page (`apps/web/src/app/presets/page.tsx`)**:
   - Add `confirmDeletePresetId` state (`string | null`, default `null`).
   - Replace the single-click `Delete` button with an inline confirmation toggle scoped to `activePreset.id`: clicking `Delete` (`data-testid="delete-preset-btn"`) sets `confirmDeletePresetId = activePreset.id`, revealing `Confirm Delete` (`data-testid="confirm-delete-preset-btn"`) and `Cancel` (`data-testid="cancel-delete-preset-btn"`).
   - Clicking `Confirm Delete` awaits `removeUserPreset(activePreset.id)` and clears `confirmDeletePresetId`.
2. **Teams Editor (`apps/web/src/app/teams/page.tsx`)**:
   - Add `confirmDeletePresetId` state (`string | null`, default `null`).
   - Replace the single-click `Delete Preset` button with an inline confirmation toggle scoped to `draft.id`: clicking `Delete Preset` (`data-testid="delete-preset-btn"`) sets `confirmDeletePresetId = draft.id`, revealing `Confirm Delete` (`data-testid="confirm-delete-preset-btn"`) and `Cancel` (`data-testid="cancel-delete-preset-btn"`).
   - Clicking `Confirm Delete` awaits `removeUserPreset(draft.id)`, clears `confirmDeletePresetId`, sets the status message, and only then calls `router.push('/presets')`.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`pnpm --filter @gi/web test`)
