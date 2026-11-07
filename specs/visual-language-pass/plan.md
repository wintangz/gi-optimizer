# Implementation Plan: Visual Language Pass (`visual-language-pass`)

**Branch**: `visual-language-pass` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/visual-language-pass/spec.md`

## Summary

Replace verbose spelt-out UI text across `/import`, `/presets`, `/optimize`, `/teams`, `Identifier.tsx`, `ArtifactSetFilter.tsx`, and `Nav.tsx` with inline SVG icons (copied from `vendor/genshin-optimizer/libs/gi/svgicons` under GO's MIT license plus matching stroke-style action glyphs), flat Genshin rarity-coloured backgrounds with readable foreground contrast (`RARITY_COLORS`), compact artifact set chips, stat icon chips (`StatChip`), filled/empty weapon rarity star rows (`RarityStars`), collapsible preset descriptions/assumptions, and proportional horizontal build comparison bars (`BuildComparisonBars`), while keeping `CharacterBadge` 100% unchanged.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, Next.js 16 (App Router, static export), `@gi/presets`, `@gi/good` (zero new dependencies)
**Storage**: N/A (pure presentation layer)
**Testing**: Vitest (`packages/presets/test/metadata.test.ts`, `apps/web/test/Identifier.test.tsx`, `apps/web/test/ArtifactSetFilter.test.tsx`, `apps/web/test/teams-deferred-start.test.tsx`)
**Target Platform**: Browser static export (`apps/web/out`)
**Project Type**: Monorepo pnpm workspace (`packages/presets`, `apps/web`)
**Performance Goals**: Near-zero static export bundle delta (< 100 KB vs `3,753,872` B baseline); zero external asset requests
**Constraints**: Zero changes to `CharacterBadge`; zero external images or `<img>` tags; zero runtime/build-time imports from `vendor/genshin-optimizer/libs/gi/svgicons`; zero engine/worker/data/submodule changes; golden fixtures byte-identical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — all changes are client-side React components and shared metadata constants; static export verified.
- **II. GO Formula Fidelity**: PASS — zero changes to `@gi/engine` or formulas; golden fixtures verified byte-identical.
- **III. Import Is GOOD Only**: PASS — `/import` UI only changes how imported artifacts, weapons, and action buttons are displayed.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — preset JSON files and schema are untouched.
- **V. Single-Character, Akasha-Style Objective**: PASS — single-character rotation totals are now compared with proportional horizontal bars.

## Project Structure

### Documentation (this feature)

```text
specs/visual-language-pass/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 icon inventory, rarity palette & component design
├── data-model.md        # Phase 1 TypeScript interfaces & component props
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   └── metadata.ts      # Flat Genshin RARITY_COLORS, formatRarityStars, getArtifactSetShortName, shortStatLabel
└── test/
    └── metadata.test.ts # Unit tests for RARITY_COLORS contrast, stars, and set short names

apps/web/
├── src/
│   ├── lib/
│   │   └── itemMeta.ts                # Re-exports RARITY_COLORS, formatRarityStars, getArtifactSetShortName, shortStatLabel
│   ├── components/
│   │   ├── SvgIcons.tsx               # 25 copied GO svgicons (MIT license header) + stroke action icons + weapon icons
│   │   ├── Identifier.tsx             # Unchanged CharacterBadge; updated WeaponBadge, ArtifactBadge, StatChip, RarityStars, BuildComparisonBars
│   │   ├── ArtifactSetFilter.tsx      # FunnelIcon header, slot/set glyph strip + compact set chip rows
│   │   └── Nav.tsx                    # Stroke-style icons on navigation links
│   └── app/
│       ├── globals.css                # Utility styles for chips, rarity strips, star rows, comparison bars, collapsible cards
│       ├── import/page.tsx            # Action button icons, WeaponBadge with stars, Artifact rows with SlotIcon strip + set chip + StatChips
│       ├── presets/page.tsx           # Collapsible preset cards & assumption boxes, action icons, WeaponBadge with stars, StatChips
│       ├── optimize/page.tsx          # Proportional horizontal comparison bars, single-line captions, Artifact rows with StatChips, action icons
│       └── teams/page.tsx             # Action icons, ElementIcon on enemy RES & reactions, WeaponBadge with stars, StatChips
└── test/
    └── Identifier.test.tsx            # Tests for SvgIcons, StatChip, RarityStars, BuildComparisonBars, WeaponBadge, ArtifactBadge, CharacterBadge invariance
```

## Complexity Tracking

No constitution violations. Zero new dependencies.
