# Implementation Plan: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

**Branch**: `main` (`official-presets-owned-first`) | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/official-presets-owned-first/spec.md)

## Summary

Resolve non-target teammates (`i > 0`) of official presets (`preset.source === 'official'`) against the user's imported GOOD characters (`owned`-first by default when owned in GOOD, falling back to visibly labelled `tc` simulated build when absent from GOOD), with a persisted per-member `Owned` / `Simulated (TC)` toggle in the UI and build-source-appropriate conditional derivation (`getDefaultTargetArtifactSetConditionals()` + equipped weapon conditionals for `'owned'`; preset-authored `member.conditional` for `'tc'`).

## Technical Context

- **Language/Version**: TypeScript 5.6, React 19, Next.js 15 (`output: 'export'`)
- **Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*` (vendored read-only submodule)
- **Testing**: Vitest (`packages/presets`, `packages/engine`, `apps/web`)
- **Constraints**: Never modify `vendor/genshin-optimizer`; keep Akasha presets and `packages/engine/test/golden/akasha__*.json` byte-identical.

## Project Structure

```text
packages/presets/src/
├── settings.ts                  # MemberBuildMode, OptimizerSettings.memberBuildModes, resolvePresetMemberBuildMode
└── index.ts                     # Re-export new types and helpers

packages/engine/src/
├── types.ts                     # BuildSelection.memberBuildModes, optimize opts.memberBuildModes
├── session.ts                   # Owned-first official teammate resolution + conditional derivation in hydratePresetTeam
└── solver.ts                    # Propagate memberBuildModes on returned BuildSelection entries

packages/engine/scripts/
└── capture-golden.ts            # Match official-preset owned-first resolution in computeDirectGOGolden

packages/engine/test/
├── golden/official__*.json      # Re-baselined official golden fixtures (Akasha fixtures untouched)
├── buff-coverage.test.ts        # Pass explicit TC memberBuildModes where testing TC-authored conditionals
└── official-owned-first.test.ts # Pin (1) owned default, (2) TC toggle = old TC totals, (3) absent from GOOD = TC

apps/web/src/
├── lib/engine/workerClient.ts   # Pass memberBuildModes through worker messages if needed
├── app/optimize/page.tsx        # Per-member Owned / Simulated (TC) toggle + SIM / Not in GOOD badges
└── app/presets/page.tsx         # Official preset team member build source toggle & resolved status display
```
