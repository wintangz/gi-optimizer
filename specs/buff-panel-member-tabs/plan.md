# Implementation Plan: Buffs & Passives Member Switcher Tabs & Worn-Set Filtering (`buff-panel-member-tabs`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Rework `ConditionalTogglePanel` to show one team member at a time using a GO-style 4-member tile switcher bar at the top, and restrict each member's `Artifact Set Effects` group to only sets worn as `2pc` or `4pc` (`count >= 2`) in the current build context.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`apps/web/test/ConditionalTogglePanel.test.tsx`)
- **Constraints**: Display change only; no change to how overrides apply to evaluate/optimize; never edit `vendor/genshin-optimizer`.

## Project Structure

- `apps/web/src/components/ConditionalTogglePanel.tsx`: Add `selectedMemberKey` state, render `[data-testid="buff-panel-member-tabs"]` with `[data-testid="member-buffs-tab-{characterKey}"]` tiles, render only the active member's `[data-testid="member-buffs-panel-{characterKey}"]`, and filter `visibleArtifactConditionals` strictly by `(memberArtSets[c.sheet] ?? 0) >= 2`.
- `apps/web/src/app/globals.css`: Add `.gi-buffs-member-tabs` and `.gi-buffs-member-tab` styles.
- `apps/web/test/ConditionalTogglePanel.test.tsx`: Update and expand unit tests to verify single-member tab rendering, tab switching, override preservation across tabs, and hiding of `0pc`/`1pc` artifact sets vs showing `2pc`/`4pc` sets.
