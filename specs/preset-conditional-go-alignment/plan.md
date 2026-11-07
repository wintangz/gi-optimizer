# Implementation Plan: Preset Conditional GO Alignment (`preset-conditional-go-alignment`)

**Branch**: `[preset-conditional-go-alignment]` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/preset-conditional-go-alignment/spec.md)

## Summary

Audit and align all 11 bundled presets (`5 akasha + 6 official`) so every conditional sheet key, conditional key, and state value in `member.conditional` and `teamConditional` matches the authoritative Genshin Optimizer sheets in `vendor/genshin-optimizer`, re-baseline all affected golden fixtures, and add a permanent catalogue validation guard test (`validatePresetConditionalsAgainstGO`) so dead conditional keys or values can never ship silently again.

## Technical Context

- **Language/Version**: TypeScript 5.x (strict), Node.js 20+
- **Primary Dependencies**: `@gi/good`, `@gi/presets`, `@gi/engine`, `@genshin-optimizer/gi/*` (vendored, read-only)
- **Testing**: Vitest (`packages/good`, `packages/presets`, `packages/engine`, `apps/web`)
- **Constraints**: Never edit `vendor/genshin-optimizer`. Keep `apps/web` static export clean.

## Constitution Check

- **I. Frontend-Only Client**: Pass — no server code or API routes touched.
- **II. GO Formula Fidelity**: Pass — directly improves GO formula fidelity by fixing dead conditional keys/values in bundled presets and re-capturing golden fixtures from the vendored GO engine.
- **III. Import Is GOOD Only**: Pass — untouched.
- **IV. Presets Are Plain JSON Setup Bundles**: Pass — updates bundled preset JSON files to match GO's exact conditional keys and values.
- **V. Single-Character, Akasha-Style Objective**: Pass — untouched.

## Project Structure

```text
packages/presets/
└── data/
    ├── akasha/
    │   ├── furina-salon-pjc-c0.json
    │   ├── furina-splendor-c2.json
    │   ├── hutao-double-hydro-homa-c1.json
    │   ├── neuvillette-hypercarry-protoamber-c0.json
    │   └── raiden-hypercarry-scarlet-c0.json
    └── official/
        ├── arlecchino-vaporize.json
        ├── furina-salon-subdps.json
        ├── hutao-double-hydro-vape.json
        ├── mavuika-melt-hypercarry.json
        ├── neuvillette-hypercarry.json
        └── raiden-hypercarry.json

packages/engine/
├── src/
│   ├── catalog.ts
│   ├── session.ts
│   └── index.ts
└── test/
    ├── golden/*.json
    ├── preset-conditional-go-alignment.test.ts
    ├── buff-coverage.test.ts
    ├── official-owned-first.test.ts
    └── conditional-toggle-panel.test.ts
```
