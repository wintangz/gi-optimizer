# Implementation Plan: Full Stat Display (`full-stat-display`)

**Branch / Feature**: `specs/full-stat-display` | **Date**: 2026-11-09 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/full-stat-display/spec.md)  
**Input**: Feature specification from `specs/full-stat-display/spec.md`

## Summary

Extend `@gi/engine` stat and breakdown extraction from the previous 20-key list to the full qualified stat universe defined in vendored Genshin Optimizer (`@genshin-optimizer/gi/wr-types` and `@genshin-optimizer/gi/keymap`: 46 Real Stats across `Core` / `DMG%` / `RES%` / `Other`, plus 133 hit-scoped `Additional Buffs`, and 10 explicitly excluded non-combat/intermediate keys guarded by a permanent test). Expose per-member `statBreakdowns` on `RotationResult.memberStats[mKey]`. Update Stage 3 `MemberCompactStatGrid` and Stage 5 `BuildStatComparisonSection` to render GO-style grouped Real Stat tables (`Core` / `DMG%` / `RES%` / `Other`) and active hit-scoped `Additional Buffs` lists with source attribution and diffing.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, strict mode)  
**Primary Dependencies**: `@genshin-optimizer/gi/wr-types`, `@genshin-optimizer/gi/wr`, `@genshin-optimizer/gi/keymap`, `@genshin-optimizer/gi/uidata`, React 19, Next.js 15  
**Storage**: N/A (in-memory calculation graph & session evaluation)  
**Testing**: Vitest (`pnpm --filter @gi/engine test`, `pnpm --filter @gi/web test`)  
**Target Platform**: Web application (Desktop & Mobile responsive within shared `1200px` container)  
**Project Type**: Monorepo (`packages/engine`, `apps/web`)  
**Constraints**:
- Zero per-character or per-case special-casing.
- Byte-identical rotation damage totals and existing golden test outputs on identical inputs.
- Adhere to `apps/web/DESIGN.md` (`0.78rem` minimum font size floor, shared `1200px` outer page container width, high-contrast tabular numbers).

## Constitution Check

*GATE: Must pass before implementation.*

- **I. Deterministic & Exact Math Parity (NON-NEGOTIABLE)**: PASS. Formula evaluation in `session.ts` and `UIData` is untouched; only stat readout and contributor attribution after graph construction are expanded.
- **II. Zero-Mutation Vendored Dependency (`vendor/genshin-optimizer`)**: PASS. No files in `vendor/genshin-optimizer` are modified; we import stat lists and key metadata from `@genshin-optimizer/gi/wr-types` and `@genshin-optimizer/gi/keymap`.
- **III. Strict Layer Boundaries (`presets` → `engine` → `web`)**: PASS. Stat catalog and extraction live in `packages/engine`; presentation components live in `apps/web`.
- **IV. Test-First Verification & Regression Protection**: PASS. Permanent guard test and acceptance spread tests in `packages/engine/test/full-stat-display.test.ts` plus component tests in `apps/web/test/`.

## Project Structure

### Documentation (this feature)

```text
specs/full-stat-display/
├── spec.md              # Feature specification + Assumptions
├── plan.md              # This implementation plan
├── research.md          # GO wr-types / keymap / formula audit findings
├── data-model.md        # Stat catalog, groups, and breakdown types
├── quickstart.md        # Verification commands
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Actionable implementation tasks
```

### Source Code (repository root)

```text
packages/engine/
├── src/
│   ├── stats.ts         # NEW: Full GO stat catalog, groups, labels, unit helpers, exclusion map, source formatter
│   ├── types.ts         # MODIFIED: Re-export stat types; add statBreakdowns to MemberStatSummary
│   ├── breakdown.ts     # MODIFIED: Extract breakdowns for all 179 keys; handle *_enemyRes_ net shred & flat units
│   ├── session.ts       # MODIFIED: Extract all 179 keys & per-member statBreakdowns in evaluate()
│   └── index.ts         # MODIFIED: Export stats catalog & helpers
└── test/
    └── full-stat-display.test.ts # NEW: Permanent guard test + acceptance spread (Zibai/Illuga, Shenhe, YunJin, Nahida C2, RES%/Heal)

apps/web/
├── src/
│   ├── components/
│   │   ├── TeammateFastModePanel.tsx # MODIFIED: Grouped Real Stats table (Core/DMG%/RES%/Other) + Additional Buffs list
│   │   └── OptimizeViews.tsx         # MODIFIED: Grouped Real Stats comparison + Additional Buffs diff comparison
│   └── app/
│       └── globals.css               # MODIFIED: Styles for grouped stat sections & Additional Buffs rows
└── test/
    ├── TeammateFastModePanel.test.tsx # MODIFIED: Tests for grouped real stats & Additional Buffs in Member Editor
    └── OptimizeViews.test.tsx         # MODIFIED: Tests for grouped real stats & Additional Buffs diff in Build Details
```

**Structure Decision**: Centralize the stat universe definitions, group mappings, human-readable labels, unit detection, and source attribution formatting in `packages/engine/src/stats.ts` so both `@gi/engine` and `@gi/web` consume a single source of truth derived from `@genshin-optimizer/gi/wr-types`.
