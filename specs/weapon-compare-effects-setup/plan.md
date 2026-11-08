# Implementation Plan: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

**Branch**: `weapon-compare-effects-setup` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/weapon-compare-effects-setup/spec.md`

## Summary

Give each weapon comparison candidate its own independent copy of the optimization target's conditional state (candidate weapon passives, target character/constellation conditionals, and target artifact-set conditionals):
1. Seeded from the target's current effective Buffs & Passives panel state when the candidate is added, and completely independent thereafter.
2. Editable per candidate via an **Effects** expander on each candidate row in `WeaponComparisonPanel` using the same switch/select controls and human-readable labels as `ConditionalTogglePanel`.
3. Badged with a visible **Setup differs** indicator (and detailed tooltip listing every differing conditional and its value) whenever a candidate's effect state differs from its seeded panel state.
4. Applied strictly to that candidate's optimization and build evaluations during `compareWeapons` (while keeping teammate conditionals, elemental resonance, Fast Mode, stat constraints, and pool filters shared across candidates).
5. Persisted with the candidate list in `OptimizerSettings.weaponCompareCandidatesByPreset` and reset together with it.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19, Next.js 16 (App Router, static export)  
**Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*`  
**Storage**: Browser IndexedDB (`OptimizerSettings.weaponCompareCandidatesByPreset`)  
**Testing**: Vitest (`@gi/presets`, `@gi/engine`, `@gi/web`)  
**Target Platform**: Browser (Web Worker + static export) & Node.js test runner  
**Project Type**: Monorepo (`packages/good`, `packages/presets`, `packages/engine`, `apps/web`)  
**Performance Goals**: Zero overhead on single-weapon optimize; `<1.2 MB` raw worker bundle budget  
**Constraints**: Zero changes to `vendor/genshin-optimizer` or bundled preset JSON files; all existing golden fixtures byte-identical.

## Constitution Check

- **Vendor Immutability**: Pass — `vendor/genshin-optimizer` is untouched.
- **Golden Parity**: Pass — Single-weapon optimize and existing `compareWeapons` calls without per-candidate overrides produce bit-identical results.
- **Worker Bundle Budget**: Pass — `settings.ts` helpers are tiny pure functions.

## Project Structure

### Documentation (this feature)

```text
specs/weapon-compare-effects-setup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   ├── settings.ts          # WeaponCompareCandidateSpec, weaponCompareCandidatesByPreset, seed & resolve helpers
│   └── index.ts             # Re-export new types and helpers
└── test/
    └── settings.test.ts     # Unit tests for candidate seeding, override resolution, and persistence

packages/engine/
├── src/
│   ├── types.ts             # Extend WeaponCompareCandidate with targetConditionals & seededTargetConditionals
│   ├── session.ts           # Apply resolveCandidateMemberConditionals per candidate in compareWeapons
│   └── index.ts             # Re-export candidate conditional helpers
└── test/
    └── weapon-compare.test.ts # Acceptance test: 3 candidates, modify candidate 2 weapon stacks + set conditional

apps/web/
├── src/
│   ├── components/
│   │   ├── ConditionalTogglePanel.tsx # Export reusable target conditional derivation, row renderer, and diff helpers
│   │   └── OptimizeViews.tsx          # Per-candidate Effects expander & Setup differs badge/tooltip in WeaponComparisonPanel & WeaponComparisonList
│   └── app/
│       ├── optimize/page.tsx          # Seed, persist, reset, and pass per-candidate targetConditionals in weapon comparison
│       └── globals.css                # Styling for candidate Effects expander and Setup differs badge
└── test/
    └── OptimizeViews.test.tsx         # Component tests for per-candidate Effects expander, independence, Setup differs tooltip, and reset
```

## Complexity Tracking

No constitution violations.
