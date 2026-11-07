# Implementation Plan: Buffs & Passives Human-Readable Labels (`buff-panel-labels`)

**Branch**: `main` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/buff-panel-labels/spec.md)  
**Input**: Feature specification from `specs/buff-panel-labels/spec.md`

## Summary

Replace raw engine conditional keys (`hpChange`, `otherHpChange`, `numOffer`, `fanfarePoints`, `charOffField`, `c2Points`, `afterUse.skill`) in `ConditionalTogglePanel` with human-readable effect names sourced directly from Genshin Optimizer's conditional metadata and English localization in the vendored submodule (`vendor/genshin-optimizer`), surfaced through `packages/engine/src/catalog.ts`. Provide a prettified key fallback (`prettifyConditionalKey`) when a conditional has no user-facing name in GO's data, and expose the raw conditional key in each row label's `title` tooltip for debugging.

## Technical Context

**Language/Version**: TypeScript 5.8, React 18.3, Next.js 15  
**Primary Dependencies**: `@gi/engine`, `@gi/presets`, `@gi/good`, vendored `@genshin-optimizer/gi/*`  
**Storage**: N/A (display-only)  
**Testing**: Vitest (`packages/engine/test/conditional-toggle-panel.test.ts` and `apps/web/test/ConditionalTogglePanel.test.tsx`)  
**Target Platform**: Browser + Web Worker (`optimizer.worker.js` < 1.2 MB raw budget) + Node/Vitest  
**Constraints**: Never edit `vendor/genshin-optimizer`; do not maintain a hand-curated per-character conditional map in `apps/web`; keep `optimizer.worker.js` well under its 1.2 MB raw size budget.

## Constitution Check

- **Vendored Submodule Integrity**: `vendor/genshin-optimizer` is read-only. Localization strings are read from `vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/*.json` and `vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en/*.json`.
- **Bundle Budget**: In `packages/engine/scripts/build-engine.mjs`, inject a compact virtual module (`@gi/go-i18n-en` / `tooling/go-stubs/i18n.ts`) containing only the English localization entries referenced by GO sheets (compressed with `unzipFromB64Gzip` just like `allStat_gen.json`), adding only ~12 KB to `optimizer.worker.js` (well under the 1.2 MB limit). In Node/Vitest (`tooling/go-stubs/i18n.ts`), load the English locale JSON files on demand from `vendor/genshin-optimizer`.

## Project Structure

### Documentation (this feature)

```text
specs/buff-panel-labels/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
tooling/go-stubs/
└── i18n.ts                                       # Resolve GO <Translate ns key18 values /> against vendored English locales
packages/engine/
├── scripts/
│   └── build-engine.mjs                          # Prepack sheet-referenced English locale strings for browser/worker bundles
├── src/
│   ├── catalog.ts                                # Extract human-readable conditional & state labels + prettified fallback
│   └── index.ts                                  # Export prettifyConditionalKey helper if needed
└── test/
    └── conditional-toggle-panel.test.ts          # Assert human-readable GO labels & fallback prettification
apps/web/
├── src/components/
│   └── ConditionalTogglePanel.tsx                # Render human-readable label with prettified fallback and raw key in title tooltip
└── test/
    └── ConditionalTogglePanel.test.tsx           # Assert human-readable labels, fallback prettification, and raw key in title tooltip
```

## Design Details

1. **GO English Localization Resolution (`tooling/go-stubs/i18n.ts` & `packages/engine/scripts/build-engine.mjs`)**:
   - Provide `translateGOKey(ns: string, key18: string, values?: Record<string, unknown>): string | undefined` in `@genshin-optimizer/gi/i18n` (`tooling/go-stubs/i18n.ts`).
   - Supports nested dot-path lookup in `ns` (`sheet`, `sheet_gen`, `elementalResonance`, `elementalResonance_gen`, `reaction_gen`, `char_<Key>`, `char_<Key>_gen`, `weapon_<Key>`, `weapon_<Key>_gen`, `artifact_<Key>`, `artifact_<Key>_gen`), i18next plural suffixes (`_one` / `_other` when `values.count` is numeric), `{{var}}` interpolation, array-joined paragraphs (when a `.description` key points to a string array), and stripping of GO markup tags (`<pyro>...</pyro>`, `<strong>...</strong>`, `<0>...</0>`).
   - In Node/Vitest, `tooling/go-stubs/i18n.ts` lazily reads the JSON files from `vendor/genshin-optimizer/libs/gi/localization/assets/locales/en` and `vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en`.
   - In `packages/engine/scripts/build-engine.mjs`, pre-extract the subset of `(ns, key18)` strings referenced by `vendor/genshin-optimizer/libs/gi/sheets/src/**` (plus `sheet.json`, `sheet_gen.json`, `elementalResonance*.json`, `reaction_gen.json`, and all `char_*` / `weapon_*` / `artifact_*` non-gen localization files) into a `b64Gzip` payload injected into `@genshin-optimizer/gi/i18n` at bundle time so browser workers have zero `node:fs` dependency and minimal bundle overhead (~10–15 KB).

2. **Catalogue Conditional Name & State Label Extraction (`packages/engine/src/catalog.ts`)**:
   - Update `extractReactNodeText(node, fallback)` to call `translateGOKey(ns, key18, values)` when encountering a `<Translate>` element (`typeof props.key18 === 'string'`).
   - When `sec.name` is missing on a conditional section (e.g., single-state conditionals where the label is on `rawStates[onlyKey].name` or `sec.header.title`), check:
     1. `sec.name`
     2. Single-state `rawStates[onlyKey].name` (when `Object.keys(rawStates).length === 1`)
     3. `sec.header?.title`
     4. `prettifyConditionalKey(key)` fallback
   - If the extracted text is empty or still matches a raw identifier/key (e.g. `sheet:passive` or an untranslated camelCase/dot key), fall back to `prettifyConditionalKey(key)`.
   - Export `prettifyConditionalKey(key: string): string` so both the engine catalogue and `ConditionalTogglePanel` share consistent fallback formatting.

3. **UI Rendering & Raw Key Tooltip (`apps/web/src/components/ConditionalTogglePanel.tsx`)**:
   - Update `cleanConditionalLabel(rawName, sheetDisplayName, fallbackKey)` to strip the `${sheetDisplayName} — ` prefix and, if the remaining label equals `fallbackKey` or looks like an untranslated raw key (`camelCase`, `dot.path`, `snake_case` without spaces), format it with `prettifyConditionalKey`.
   - Set `title={`${sheetName} — ${label} (${cond.key})`}` on `.gi-buff-row-label` so the raw key (`cond.key`) is always visible in the tooltip for debugging.
