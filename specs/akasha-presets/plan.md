# Implementation Plan: Akasha Presets (`akasha-presets`)

**Branch**: `akasha-presets` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/akasha-presets/spec.md`

## Summary

The bundled Akasha preset JSON data and `matchAccount` matcher already model supporting teammates as fixed `tc` builds (`build.type === 'tc'`) and only check the target character (`team[0]`). This review fix pass updates the UI across `/presets`, `/optimize`, and `/teams` and adds regression tests in `packages/engine` and `packages/presets`:
1. Visually mark the target as `"Your Character · Target"` and every `build.type === 'tc'` teammate as a simulated preset build (`SIM` badge + dashed ring + `"Simulated / Assumed Preset Build (Not Your Account)"`) everywhere a preset team is shown (`/presets` list cards, `/presets` detail table, `/optimize` preset bar), never rendering a flat list of 4 equal names.
2. Update the compatibility check UI on `/presets` and `/optimize` to `"Target Character & Weapon Check"` and `"Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset"`, removing any wording that implies the user's teammates are checked or required.
3. Add an engine teammate-isolation regression test (`packages/engine/test/akasha-isolation.test.ts`) proving `session.evaluate` and `session.optimize` return identical results for two GOOD files that differ only in the teammates.
4. Ensure forked presets on `/teams` (`?fork=`) keep `build.type === 'tc'` teammates clearly labelled `"Simulated / Assumed Preset Build (Not Your Account)"` and editable as assumed builds, backed by a unit test in `packages/presets/test/userPreset.test.ts` verifying `forkPresetToUser` preserves `build.type === 'tc'` and all `tc` stats on every teammate.

## Technical Context

**Language/Version**: TypeScript 5 (strict), pnpm workspace
**Primary Dependencies**: `zod`, `@genshin-optimizer/gi/*` (vendored GO engine), React 19, Next.js 16 App Router (static export)
**Storage**: Bundled JSON (`packages/presets/data/akasha/*.json`) + IndexedDB via `idb` (`presets` and `good` stores)
**Testing**: Vitest (`packages/presets/test/*.test.ts`, `packages/engine/test/*.test.ts`), Playwright for UI smoke
**Target Platform**: Browser client-side only (no server, no API routes)
**Project Type**: Monorepo (`packages/presets`, `packages/engine`, `apps/web`)
**Performance Goals**: Instant (`<50ms`) account matching on 80-character / 1,000-artifact GOOD payloads
**Constraints**: Zero silent substitutions; zero influence of user's GOOD teammates on `tc` teammate calculations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — all preset loading, matching, team building, and optimization run client-side in `apps/web` static export.
- **II. GO Formula Fidelity**: PASS — uses GO's `ArtCharDatabase`, `buildTcs`, and `getTeamData`; every bundled Akasha preset has a golden fixture verified against GO.
- **III. Import Is GOOD Only**: PASS — matcher and engine consume GOOD data only.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — uses `gi-optimizer/preset@1`; target mismatches are shown part-by-part; `tc` teammates are explicitly badged as simulated preset builds and never silently substituted.
- **V. Single-Character Objective**: PASS — single target character (`team[0]`) per preset; ER never weighted in objective.

## Project Structure

### Documentation (this feature)

```text
specs/akasha-presets/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 design & review-fix decisions
├── data-model.md        # Matcher, registry & UI presentation contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Actionable tasks for foundational + review fix pass
```

### Source Code (repository root)

```text
packages/presets/
├── data/akasha/*.json          # Bundled Akasha leaderboard preset JSONs
├── src/
│   ├── match.ts                # Target-only account matcher
│   ├── names.ts                # GO display-name lookup helpers
│   ├── registry.ts             # Bundled preset registry & badge helpers
│   ├── userPreset.ts           # forkPresetToUser (preserves tc teammates)
│   └── validate.ts             # Schema + catalog validator
└── test/
    ├── bundled.test.ts         # Bundled preset validation tests
    ├── match.test.ts           # Matcher unit tests
    └── userPreset.test.ts      # forkPresetToUser tc-preservation unit test

packages/engine/
└── test/
    └── akasha-isolation.test.ts # Regression test: evaluate & optimize teammate isolation

apps/web/src/app/
├── presets/page.tsx            # Presets browser: Target vs SIM badges & Target Character & Weapon Check copy
├── optimize/page.tsx           # Optimizer page: Target vs SIM badges & Target Character & Weapon Check copy
└── teams/page.tsx              # Custom team builder: Simulated / Assumed Preset Build (Not Your Account) labelling on forked tc teammates
```

**Structure Decision**: Existing monorepo layout (`packages/presets`, `packages/engine`, `apps/web`). No new packages or dependencies introduced.
