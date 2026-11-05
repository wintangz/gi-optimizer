# Research & Technical Decisions: Slim Data Pages (`slim-data-pages`)

## R1. Deduplicating & Compacting `statMeta.gen.ts` and Eliminating Runtime `@genshin-optimizer/gi/consts`

- **Decision**:
  1. Generate a single canonical `packages/good/src/statMeta.gen.ts` from `packages/presets/scripts/generate-stat-meta.ts` and delete the duplicate `packages/presets/src/statMeta.gen.ts`.
  2. Encode the raw character, weapon, and artifact set tables compactly in `packages/good/src/statMeta.gen.ts` (e.g. indexed element/weaponType codes or compact tuple maps hydrated at module evaluation) and derive `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, and `charKeyToLocCharKey` directly inside `packages/good/src/statMeta.gen.ts`.
  3. Re-export `statMeta.gen.ts` from `packages/good/src/index.ts`, add `"@gi/good": "workspace:*"` to `packages/presets/package.json`, and update `packages/good/src/parseGood.ts` and `packages/presets/src/{names,metadata,validate,userPreset,schema}.ts` to import from `@gi/good` (or `./statMeta.gen` inside `@gi/good`) with zero runtime imports from `@genshin-optimizer/gi/consts`.
- **Rationale**:
  - In commit `bac8f21`, `statMeta.gen.ts` (~2,100 lines, 35.5 KB raw) existed in both `packages/good/src/statMeta.gen.ts` and `packages/presets/src/statMeta.gen.ts` (71 KB raw combined), and both packages also imported `@genshin-optimizer/gi/consts` at runtime (`637-e2e0e5106f373f0d.js`, 85.8 KB raw), which duplicated all character, weapon, and artifact set key arrays a third time plus GO-internal sheet/formula constants.
  - Because `CHAR_STAT_META`, `WEAPON_STAT_META`, and `ART_SET_STAT_META` already contain every character, weapon, and artifact set key, `Object.keys(...)` (or compact encoded tables) provides `ALL_CHARACTER_KEYS`, `ALL_WEAPON_KEYS`, and `ALL_ARTIFACT_SET_KEYS` with zero key duplication.
  - Encoding `ele` (`0..6` into `['anemo','geo','electro','hydro','pyro','cryo','dendro']`), `weaponType` (`0..4` into `['sword','claymore','polearm','bow','catalyst']`), and `rarity` (`1..5`) as compact 3-character codes or tuples per key shrinks the generated source from 35.5 KB to ~7 KB raw while hydrating the exact `CHAR_STAT_META`, `WEAPON_STAT_META`, and `ART_SET_STAT_META` objects at runtime.
- **Alternatives considered**:
  - Keeping two copies of a compact `statMeta.gen.ts`: Still duplicates ~7–9 KB across chunks when a single canonical module in `@gi/good` is shared by both `/import` and `/presets`.

## R2. Replacing Runtime `zod` v4 with a Zero-Dependency Custom Validator in `packages/presets/src/schema.ts`

- **Decision**: Replace `import { z } from 'zod'` in `packages/presets/src/schema.ts` with a lightweight, self-contained TypeScript schema validator implementing `.parse(input)` and `.safeParse(input)` on `presetSchema` (and exported sub-schemas `memberRequirementSchema`, `tcCharacterSchema`, `tcWeaponSchema`, `tcBuildSchema`, `fixedBuildSchema`, `teamMemberSchema`, `rotationTargetSchema`, `presetSourceSchema`), and remove `"zod"` from `packages/presets/package.json`.
- **Rationale**:
  - `zod` v4 added two runtime chunks totaling `104.3 KB` raw (`748-e41bcafe4c8b59f6.js` 37.8 KB + `461-e2224eabd97fce93.js` 66.5 KB) to every page importing `@gi/presets`.
  - The preset schema (`gi-optimizer/preset@1`) is a fixed, well-defined contract (~150 lines) whose rules are simple type, integer-range, enum-set, regex, default-value, and 5 cross-field `superRefine` checks. A dedicated zero-dependency validator in `packages/presets/src/schema.ts` is ~250 lines (~6 KB raw, <2 KB gzipped) and preserves 100% of the runtime validation behavior, default hydration, error issue structure (`{ code: string, path: (string | number)[], message: string }`), and TypeScript types (`Preset`, `PresetInput`, etc.).
- **Alternatives considered**:
  - `zod/mini` or `valibot`: Adds an external dependency and still ships more runtime code than a direct validator tailored to `presetSchema`.

## R3. Slimming Route Module Graphs on `/import` and `/presets`

- **Decision**:
  1. Add `"sideEffects": false` to `packages/good/package.json` and `packages/presets/package.json`.
  2. Refactor `packages/presets/src/registry.ts` so `BUNDLED_PRESETS` and `VERIFIED_PRESET_IDS` are lazily initialized on first access (`getBundledPresetsInternal()`) rather than calling ` RAW_BUNDLED.map((raw) => presetSchema.parse(raw))` at module top-level.
  3. Update route/shared imports in `apps/web/src/app/import/page.tsx`, `apps/web/src/app/presets/page.tsx`, `apps/web/src/lib/itemMeta.ts`, and `apps/web/src/lib/storage/useGood.ts` so that:
     - `/import` only pulls in `parseGood` + `humanizeKey` from `@gi/good`, `displayName` from `@gi/presets/src/names` (or tree-shaken `@gi/presets`), and `Identifier.tsx` (`metadata.ts`), never `registry.ts` (53.5 KB of preset JSONs) or `match.ts` / `userPreset.ts`.
     - `/presets` only pulls in `humanizeKey` from `@gi/good/src/suggest` (or tree-shaken `@gi/good`) and preset browsing/matching modules from `@gi/presets`, never `parseGood.ts` (26.0 KB raw).
- **Rationale**:
  - In `bac8f21`, `registry.ts` executed `RAW_BUNDLED.map((raw) => presetSchema.parse(raw))` at top-level module evaluation. Because `presetSchema.parse(...)` can throw, webpack treated `registry.ts` (and its 11 static JSON imports, 53.5 KB raw) as having top-level side effects and bundled it into `/import` even though `/import` only used `displayName` and `metadata` from `@gi/presets`.
  - Similarly, `/presets` imported `{ humanizeKey } from '@gi/good'` without `"sideEffects": false`, causing webpack to retain `parseGood.ts` in the shared `@gi/good` chunk loaded by `/presets`.
  - Combining `"sideEffects": false`, lazy `registry.ts` initialization, and targeted imports eliminates both cross-route leaks.
- **Alternatives considered**:
  - Dynamic `import()` for preset JSONs on `/presets`: Unnecessary once `/import` no longer bundles `registry.ts`, and `/presets` genuinely needs the bundled presets on initial render (which are only ~53 KB raw / ~6 kB gzipped).
