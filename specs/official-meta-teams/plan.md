# Implementation Plan: Official Meta Teams Expansion (`official-meta-teams`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

## Summary
Expand the bundled Official preset library with 7 new meta team presets (`official/mavuika-overload`, `official/skirk-freeze`, `official/nefer-lunar-bloom`, `official/flins-lunar-charged`, `official/zibai-lunar-crystallize`, `official/sandrone-stellar-conduct`, `official/vesna-stellar-swirl`) alongside the verified `official/mavuika-melt-hypercarry` preset, each backed by GO conditional validation and a golden fixture, committed one preset per commit (`feat: preset-<preset-id>`).

## Technical Context
- **Preset Data**: `packages/presets/data/official/*.json`
- **Registry & Names**: `packages/presets/src/registry.ts`, `packages/presets/src/names.ts`
- **Golden Fixtures**: `packages/engine/test/golden/official__*.json`
- **Verification**: `packages/presets/test/official.test.ts`, `packages/presets/test/match.test.ts`, `packages/engine/test/preset-conditional-go-alignment.test.ts`, `packages/engine/test/golden.test.ts`, `packages/engine/test/official-owned-first.test.ts`
