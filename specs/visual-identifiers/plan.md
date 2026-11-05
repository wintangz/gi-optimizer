# Implementation Plan: Visual Identifiers (`visual-identifiers`)

**Branch**: `visual-identifiers` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/visual-identifiers/spec.md`

## Summary

Replace all text-only character, weapon, and artifact references across `/import`, `/presets`, `/optimize`, and `/teams` with a unified visual identifier system backed by Genshin Optimizer's canonical metadata (`@genshin-optimizer/gi/stats`). Implement pure metadata lookup helpers (`getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`, element/rarity/set color tokens, 2-letter initials, weapon-type & slot glyphs) in `packages/presets/src/metadata.ts` (re-exported via `@gi/presets` and `apps/web/src/lib/itemMeta.ts`) and shared React components (`CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, `ItemIdentifier`) in `apps/web/src/components/Identifier.tsx`, including prominent dashed-ring + `"SIM"` / `"SIM · Fixed Preset Build"` styling for simulated (`tc`) teammates and `"YOURS · TARGET"` / `"YOUR BUILD"` tags for owned characters.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: `@gi/presets`, `@genshin-optimizer/gi/stats`, `@genshin-optimizer/gi/consts`, React 19, Next.js 16 (App Router, static export)
**Storage**: N/A (pure presentation & metadata lookup over existing GOOD / preset structures)
**Testing**: Vitest (`packages/presets/test/metadata.test.ts` and `apps/web/test/Identifier.test.tsx`)
**Target Platform**: Browser static web client (`apps/web`) + Node test runner (`packages/presets`)
**Project Type**: Monorepo pnpm workspace (`packages/presets` + `apps/web`)
**Performance Goals**: O(1) synchronous metadata lookup per badge; zero network requests or external image fetches
**Constraints**: Frontend-only static export, offline-capable inline SVG/Unicode glyphs, zero text-only characters/weapons/artifacts across `/import`, `/presets`, `/optimize`, and `/teams`
**Scale/Scope**: All ~100+ GO characters, ~200+ weapons, ~55+ artifact sets across 4 primary routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — purely client-side React components and static metadata from vendored GO JSON; no server or external image fetches.
- **II. GO Formula Fidelity**: PASS — character element, rarity, weapon type, weapon rarity, and artifact set rarities come directly from vendored `@genshin-optimizer/gi/stats` (`vendor/genshin-optimizer/libs/gi/stats/src/index.ts`).
- **III. Import Is GOOD Only**: PASS — `/import` renders GOOD characters, weapons, and artifacts with visual badges without altering import formats.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — preset schema is untouched; `tc` teammates are visually badged as simulated (`SIM · Fixed Preset Build`) so preset assumptions are transparent at a glance.
- **V. Single-Character, Akasha-Style Objective**: PASS — target character is explicitly badged `"YOURS · TARGET"` in team rosters.

## Project Structure

### Documentation (this feature)

```text
specs/visual-identifiers/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research & color/glyph decisions
├── data-model.md        # Phase 1 TypeScript interfaces & component contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 dependency-ordered implementation tasks
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   ├── metadata.ts      # Pure metadata lookup (getCharacterMeta, getWeaponMeta, getArtifactMeta)
│   └── index.ts         # Re-exports ./metadata
└── test/
    └── metadata.test.ts # Exhaustive unit tests for all characters, weapons, and artifact sets

apps/web/
├── src/
│   ├── lib/
│   │   └── itemMeta.ts           # Re-exports metadata helpers from @gi/presets
│   ├── components/
│   │   └── Identifier.tsx        # Shared CharacterBadge, WeaponBadge, ArtifactBadge, ItemIdentifier
│   └── app/
│       ├── import/page.tsx       # Character, Weapon, and Artifact tables with visual badges
│       ├── presets/page.tsx      # Preset list cards, compatibility weapons, Team & Buff table with SIM/TARGET badges
│       ├── optimize/page.tsx     # Preset team summary, protected chars, excluded sets, slot-by-slot artifact comparison
│       └── teams/page.tsx        # Team member cards (TARGET/YOUR BUILD/SIM), TC weapon & 4p set previews, rotation header
└── test/
    └── Identifier.test.tsx       # Component rendering tests for CharacterBadge (SIM vs OWNED/TARGET), WeaponBadge, ArtifactBadge
```

**Structure Decision**: Place the pure GO stats lookup (`metadata.ts`) in `packages/presets` alongside `names.ts` so both Node tests and `apps/web` share one source of truth, and place the shared React badge components in `apps/web/src/components/Identifier.tsx` with a convenience module at `apps/web/src/lib/itemMeta.ts`.

## Complexity Tracking

No constitution violations. No new third-party dependencies required (`react-dom/server` already in `apps/web` can render components in Vitest unit tests).
