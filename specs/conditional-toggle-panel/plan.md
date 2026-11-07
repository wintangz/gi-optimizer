# Implementation Plan: Team-Wide Conditional Buffs & Passives Toggle Panel (`conditional-toggle-panel`)

**Branch**: `main` (`conditional-toggle-panel`) | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/conditional-toggle-panel/spec.md)

## Summary

Expose every team member's conditionals (`weapon`, `artifact`, `character`, `constellation`) in an image-led "Buffs & Passives" panel (`ConditionalTogglePanel`), initialized to today's exact derived defaults, with immediate per-member override propagation to `evaluate` and `optimize`, persistence in `OptimizerSettings.memberConditionalOverrides`, and per-member reset to defaults.

## Technical Context

- **Language/Version**: TypeScript 5.6, React 19, Next.js 15 (`output: 'export'`)
- **Primary Dependencies**: `@gi/presets`, `@gi/engine`, `@gi/good`, `@genshin-optimizer/gi/*` (vendored read-only submodule)
- **Testing**: Vitest (`packages/presets`, `packages/engine`, `apps/web`)
- **Constraints**: Never modify `vendor/genshin-optimizer`; all golden fixtures (`packages/engine/test/golden/*.json`) must remain byte-identical on the default path.

## Project Structure

```text
packages/presets/src/
├── settings.ts                         # MemberConditionalsMap, OptimizerSettings.memberConditionalOverrides + helpers
└── index.ts                            # Re-export new types and helpers

packages/engine/src/
├── types.ts                            # ConditionalSourceCategory, BuildSelection.memberConditionals, optimize opts
├── catalog.ts                          # Populate category ('weapon'|'artifact'|'character'|'constellation') & section
├── session.ts                          # computeDefaultMemberConditionals, applyMemberConditionalOverrides, readEffectiveConditionalValue
├── solver.ts                           # Propagate memberConditionals on returned BuildSelection entries
└── index.ts                            # Export new conditional helpers and types

apps/web/src/
├── components/ConditionalTogglePanel.tsx # Image-led team-wide Buffs & Passives panel with grouped sections & reset
├── app/optimize/page.tsx                 # Render ConditionalTogglePanel & pass memberConditionals to worker evaluation/optimization
└── app/presets/page.tsx                  # Render ConditionalTogglePanel in preset detail view
```
