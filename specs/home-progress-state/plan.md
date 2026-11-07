# Implementation Plan: Home Progress State (`home-progress-state`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/home-progress-state/spec.md)

## Summary

1. **`apps/web/src/app/page.tsx`**:
   - Convert to client component (`'use client'`) and read `{ record }` from `useGoodStorage()`.
   - When `record?.good` is present:
     - Render Step 1 (`data-testid="home-step-1"`, `data-step-status="done"`) with `.gi-step-number.is-done` (`✓`), `"Done"` status pill, stored character/weapon/artifact counts (`data-testid="home-step-1-counts"`), and a `"Re-import Account Data"` link (`data-testid="home-step-1-reimport"`).
     - Highlight Step 2 (`data-testid="home-step-2"`, `data-step-status="next"`) with a `"Next Step"` pill (`data-testid="home-step-2-next-pill"`) and primary CTA styling on `"Browse Presets"`.
2. **`apps/web/src/app/globals.css`**:
   - Add `.gi-step-card.is-done`, `.gi-step-card.is-next`, and `.gi-step-number.is-done` styles.
3. **`apps/web/test/HomePage.test.tsx`**:
   - Add unit tests verifying `Home` when `record === null` vs when `record` has stored GOOD data.
