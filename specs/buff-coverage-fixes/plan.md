# Implementation Plan: Buff Coverage Fixes (`buff-coverage-fixes`)

**Feature**: `buff-coverage-fixes` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

Fix all 5 buff-coverage audit findings across preset data (`official/mavuika-melt-hypercarry`, `official/furina-salon-subdps`), owned-target weapon swap conditional auto-population, target boolean artifact-set conditional defaults, custom team resonance defaults, and default TC teammate conditionals (`NoblesseOblige.set4 = "on"`). Re-capture only the 2 affected golden fixtures (`official__mavuika-melt-hypercarry.json` and `official__furina-salon-subdps.json`), keeping the other 9 golden fixtures byte-identical, and add comprehensive regression tests.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict), Node.js >= 20
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*` (bundled via `packages/engine/scripts/build-engine.mjs`)
**Testing**: Vitest (`packages/engine/test/`, `packages/presets/test/`)
**Constraints**: Zero edits inside `vendor/genshin-optimizer`; zero damage-formula changes; only `official__mavuika-melt-hypercarry.json` and `official__furina-salon-subdps.json` golden fixtures may change.

## Constitution Check

- **I. Spec-Driven Development**: `spec.md`, `research.md`, `data-model.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` completed.
- **II. Upstream Fidelity**: Uses GO's real `TeamData` and conditional sheets (`ThrillingTalesOfDragonSlayers`, `ArchaicPetra`, `NoblesseOblige`, `Resonance`); zero edits in `vendor/genshin-optimizer`.
- **III. Verification**: Regression tests in `packages/engine/test/buff-coverage.test.ts` and `packages/presets/test/userPreset.test.ts`.

## Project Structure

```text
packages/presets/
├── data/official/
│   ├── furina-salon-subdps.json          # Add Zhongli ArchaicPetra conditional
│   └── mavuika-melt-hypercarry.json      # Add Citlali TTDS + Xilonen ArchaicPetra conditionals
├── src/userPreset.ts                     # Export DEFAULT_TC_TEAMMATE_CONDITIONAL & createDefaultTcTeammate
└── test/userPreset.test.ts               # Test default TC teammate conditional

packages/engine/
├── src/
│   ├── catalog.ts                        # Export getDefaultTargetArtifactSetConditionals
│   ├── session.ts                        # Owned weapon swap auto-conds, target boolean set conds, resonance fill
│   └── teamData.ts                       # Respect explicit resonance 'off' overrides in resonanceData
└── test/
    ├── golden/
    │   ├── official__furina-salon-subdps.json
    │   └── official__mavuika-melt-hypercarry.json
    └── buff-coverage.test.ts             # Regression tests for all buff coverage fixes

apps/web/
└── src/app/teams/page.tsx                # Populate DEFAULT_TC_TEAMMATE_CONDITIONAL on new/switched TC teammates
```
