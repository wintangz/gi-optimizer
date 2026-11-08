# Implementation Plan: Full Damage Display (`full-damage-display`)

**Branch**: `main` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/full-damage-display/spec.md`

## Summary

Extend `@gi/engine` and `@gi/web` so that for any displayed build (`current` build and result builds across Single-Character, Weapon Comparison, and Team Optimization modes), the target character's complete damage formula list (`fullDamage`) is computed from their GO sheet data (`normal`, `charged`, `plunging`, `skill`, `burst`, passives, constellations, equipped weapon/artifact passive hits, and `reaction` entries) in sheet order, omitting untriggerable (`node.isEmpty === true`) formulas as GO does, and rendered in an expandable `"Full Damage"` section in Build Details where every row expands to `DamageRowBreakdownView`.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js 20+, React 18.3, Next.js 15  
**Primary Dependencies**: `@genshin-optimizer/gi/*` (vendored GO sheets, wr, uidata, keymap), `@gi/presets`, `@gi/engine`, `@gi/web`  
**Testing**: Vitest (`packages/engine/test`, `apps/web/test`)  
**Target Platform**: Browser + Web Worker (`optimizer.worker.js` <= 1.2 MB raw budget)  
**Performance Goals**: Zero solver overhead (`GOSolver` untouched; `< 1 ms` per displayed build in `session.evaluate()`)  
**Constraints**: All existing golden tests and rotation totals byte-identical; `0.78rem` minimum font size floor and shared `1200px` outer page container per `apps/web/DESIGN.md`.

## Constitution Check

- **Zero Solver Regression**: `session.evaluate()` is only called for displayed builds, never in `GOSolver` / `BackgroundWorker`. Rotation totals and golden snapshots remain byte-identical.
- **No Character Special-Casing**: Section ordering, formula filtering (`!node.isEmpty`), values, and breakdowns are driven 100% by `targetUiData.getDisplay()` and `targetUiData.data`.
- **Design System Compliance**: Adheres to `apps/web/DESIGN.md` (`>= 0.78rem` font size floor, semantic tokens, tabular numerals).

## Project Structure

### Documentation (this feature)

```text
specs/full-damage-display/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
packages/engine/
├── src/
│   ├── types.ts        # FullDamageFormulaEntry, FullDamageSection, RotationResult.fullDamage
│   ├── breakdown.ts    # findHitUiDataForFormula, extractFormulaBreakdown, extractFullDamageSections
│   ├── session.ts      # Populate fullDamage on RotationResult in evaluate()
│   └── index.ts        # Export FullDamageFormulaEntry, FullDamageSection, extractFullDamageSections
└── test/
    └── full-damage-display.test.ts  # Narrow-rotation preset optimization + direct evaluate parity + isEmpty tests

apps/web/
├── src/
│   ├── components/
│   │   └── OptimizeViews.tsx  # FullDamageSectionView in BuildComparisonList, WeaponComparisonList, TeamOptimizationList
│   └── app/
│       └── globals.css        # Styling for Full Damage section & group headers
└── test/
    └── OptimizeViews.test.tsx # UI tests for Full Damage section, sheet order, vs. Current delta, and breakdown expansion
```
