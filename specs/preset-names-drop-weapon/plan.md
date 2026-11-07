# Implementation Plan: Bundled Preset Display Names Without Weapon References (`preset-names-drop-weapon`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Remove weapon and refinement references from all bundled preset display names (`packages/presets/data/akasha/*.json`) while preserving character, constellation, Fanfare, team/rotation descriptors, preset IDs, file names, and `akasha` provenance notes.

## Technical Context

- **Language/Version**: TypeScript 5.x, JSON preset definitions
- **Testing**: Vitest (`packages/presets/test/match.test.ts`, `packages/engine/test/golden.test.ts`)
- **Constraints**: Never edit `vendor/genshin-optimizer`; preserve golden fixture parity.

## Project Structure

- `packages/presets/data/akasha/*.json`: Update `name` in all 5 Akasha preset JSON files.
- `packages/engine/src/teamData.ts`: Support the new `"Furina — Salon Solitaire C2"` team name in `getTeamData`.
- `packages/presets/test/match.test.ts`: Add a test asserting the exact weapon-free display names and guarding against weapon names or `R1`–`R5` tokens in bundled preset `name`s.
