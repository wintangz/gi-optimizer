# Phase 0 Research: Trim Genshin Optimizer Runtime (`trim-go-runtime`)

## 1. Root Cause of the 123.52 MB (2,732 PNGs) Static Export Bloat

- **Decision**: Alias `@genshin-optimizer/gi/assets` and `@genshin-optimizer/gi/assets-data` to `tooling/go-stubs/assets.ts` across all build and test environments (`tooling/go-paths.mjs` and `packages/engine/scripts/build-engine.mjs`).
- **Rationale**:
  - In baseline (`bac8f21`), `apps/web/out` is `128,964,040` bytes (`~128.96 MB`), of which `123,518,632` bytes (`~123.52 MB`) consists of `2,732` PNG files under `apps/web/out/_next/static/media`.
  - `@genshin-optimizer/gi/sheets` imports `artifactDefIcon`, `characterAsset`, `imgAssets`, and `weaponAsset` from `@genshin-optimizer/gi/assets` (`vendor/genshin-optimizer/libs/gi/assets/src/index.ts`), which statically imports every character, weapon, and artifact PNG in `vendor/genshin-optimizer/libs/gi/assets/src/gen/`.
  - `apps/web` never renders GO's PNG assets (it renders its own text/color identifier badges).
  - Because `talentTem` in `vendor/genshin-optimizer/libs/gi/sheets/src/Characters/characterUtil.tsx` indexes into `imgAssets` (e.g. `imgAssets.weaponTypes.claymore`), `imgAssets` and `AssetData` in `tooling/go-stubs/assets.ts` use a recursive callable `Proxy` returning `""` so nested property lookups never throw `TypeError`.
- **Alternatives Considered**:
  - Webpack `IgnorePlugin` or `null-loader` on `.png` files: Rejected because `null-loader` breaks nested object lookups on `imgAssets.weaponTypes[weaponTypeKey]` inside `talentTem`, whereas stubbing `@genshin-optimizer/gi/assets` and `@genshin-optimizer/gi/assets-data` cuts the entire 2,732-module subgraph before `.png` files are ever resolved.

## 2. Cutting GO UI, Material UI, Emotion, and i18next from the Engine Graph

- **Decision**:
  1. Port the headless functions `getTeamData`, `getTeamDataCalc`, `getBuildTcArtifactData`, and `getBuildTcWeaponData` (and types `TeamData`, `TeamDataBundle`, `CharBundle`) from `vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData.ts` into `packages/engine/src/teamData.ts`, dropping `useTeamData` and its `react`, `@genshin-optimizer/common/react-util`, and `@genshin-optimizer/gi/db-ui` imports.
  2. Provide lightweight stubs in `tooling/go-stubs/` (`ui.ts`, `i18n.ts`, `db-ui.ts`) for `@genshin-optimizer/common/ui`, `@genshin-optimizer/common/svgicons`, `@genshin-optimizer/gi/i18n`, `@genshin-optimizer/gi/ui`, `@genshin-optimizer/gi/db-ui`, and `@genshin-optimizer/gi/svgicons`, plus stubbing `react`, `react/jsx-runtime`, `@emotion/react/jsx-runtime`, and `@mui/material` inside `build-engine.mjs`.
- **Rationale**:
  - `packages/engine/src/catalog.ts` (`extractReactNodeText`) traverses React element trees (`{ type, props }`) produced by character/weapon/artifact sheets (`Translate`, `ColorText`, `SqBadge`).
  - Furthermore, `vendor/genshin-optimizer/libs/gi/sheets/tsconfig.json` sets `"jsxImportSource": "@emotion/react"`, so `.tsx` files in `libs/gi/sheets/src/` compile JSX into `@emotion/react/jsx-runtime` calls (`jsx`, `jsxs`, `Fragment`), while `Reaction.tsx` and `Resonance.tsx` import `Box` from `@mui/material`, and `ElementCycle.tsx` imports `useEffect, useState` from `react`.
  - Routing all of these to `tooling/go-stubs/ui.ts` (where `jsx = (type, props) => ({ type, props: props || {} })` and `Translate = 'Translate'`, `ColorText = 'ColorText'`, `SqBadge = 'SqBadge'`) keeps `extractReactNodeText` working identically (18 formulas and 105 conditionals extracted for `HuTao`, matching baseline) while eliminating 100% of `@mui/material`, `@emotion/*`, `i18next`, and `react` from the engine and worker bundles.
- **Alternatives Considered**:
  - Keeping real `react` and `@emotion/react` in the worker bundle: Rejected because a Web Worker has no DOM and needs only `{ type, props }` objects for `catalog.ts` node traversal.

## 3. Shrinking `optimizer.worker.js` from ~2.4 MB Raw to ≤ 1.2 MB Raw (Verified 1.00 MB Raw / 335.7 KB Gzip)

- **Decision**: Prebuild `apps/web/public/workers/optimizer.worker.js` and `packages/engine/dist/index.mjs` via `esbuild` in `packages/engine/scripts/build-engine.mjs` with three targeted `onLoad`/`onResolve` plugins:
  1. **`allStat_gen.json` material removal + gzip-in-JS transform**: Delete `raw.material` (7,987 material item keys, `430,275` bytes raw, never referenced by any formula) and gzip-compress `{ char, weapon, art }` at build time, emitting `import { unzipFromB64Gzip } from '@genshin-optimizer/common/util'; const data = JSON.parse(unzipFromB64Gzip('<b64>')); export const { char, weapon, art } = data; export default data;`. Because `@genshin-optimizer/common/util` already bundles `fflate` (`unzipFromB64Gzip`), this adds zero runtime dependencies and shrinks `allStat_gen.json` in the raw bundle from `~960 KB` to `~115 KB` (`-845 KB` raw).
  2. **UI-only `fields: [...]` stripping in `libs/gi/sheets/src/**/*.tsx`**: Replace `fields: [...]` talent/weapon/artifact card row descriptions with `fields: []` at bundle time while keeping `states` (conditionals) and `CharacterSheet.data` / `WeaponSheet.data` / `allArtifactData` (WASM/WR formula nodes) intact (`-220 KB` raw).
  3. **Lightweight `zod` normalizer stub (`tooling/go-stubs/zod.ts`) and `@gi/presets` code-only resolution**: Replace `zod@4.6.7` (`455 KB` raw of 45 human-language error locales and JSON-schema generators) with `tooling/go-stubs/zod.ts` (`~3 KB`) implementing GO's schema coercion chains (`.parse()`, `.safeParse()`, `.default()`, `.catch()`, `.transform()`, `.pipe()`, `.object()`, `.looseObject()`, etc.), and resolve `@gi/presets` inside the worker to `names.ts` + `settings.ts` so bundled preset JSON files (`~55 KB`) are not duplicated inside the worker.
- **Rationale**:
  - Verified in-memory with `esbuild`:
    - Baseline worker chunk: `~2,400,000` bytes (`~2.40 MB` raw, `~644 KB` gzip).
    - After UI/asset stubs + `build-engine.mjs` transforms: **`1,050,445` bytes (`1.00 MB` raw, `343,725` bytes / `335.7 KB` gzip)** — comfortably under the `≤ 1.2 MB` raw (`1,258,291` bytes) acceptance threshold.
    - Verified against all `11/11` golden fixtures in `packages/engine/test/golden/*.json`: `0%` relative error across all presets, instances, and stats.
- **Alternatives Considered**:
  - Minification + tree-shaking alone without `allStat_gen.json` or `zod` trimming: Produced `~2.28 MB` raw because `allStat_gen.json` (`960 KB`), `libs/gi/sheets` (`835 KB`), and `zod@4.6.7` (`455 KB`) are all reachable from `ArtCharDatabase` and `getTeamData`. The three targeted transforms are necessary and sufficient to reach `1.00 MB` raw without touching `vendor/genshin-optimizer`.

## 4. Decoupling Next.js (`apps/web/next.config.ts`) from Raw GO and `@gi/engine` TypeScript

- **Decision**:
  - `packages/engine/scripts/build-engine.mjs` emits:
    - `apps/web/public/workers/optimizer.worker.js` (browser IIFE bundle)
    - `packages/engine/dist/index.mjs` (ESM bundle for `@gi/engine`)
    - `packages/engine/dist/gi-consts.mjs` (ESM bundle for `@genshin-optimizer/gi/consts`, `~14 KB`, so `@gi/good` and `@gi/presets` do not pull raw GO TypeScript into Next.js even before sibling feature `slim-data-pages` lands)
  - Update `packages/engine/package.json` `"main": "./dist/index.mjs"` (retaining `"types": "./src/index.ts"` for TypeScript IDE/typecheck).
  - Update `apps/web/src/lib/engine/workerClient.ts` to instantiate `new Worker('/workers/optimizer.worker.js')`.
  - Update `apps/web/next.config.ts` to remove `@gi/engine` from `transpilePackages`, remove `goAliases()`, and alias `@gi/engine` to `packages/engine/dist/index.mjs` (and `@genshin-optimizer/gi/consts` to `packages/engine/dist/gi-consts.mjs`).
- **Rationale**:
  - Ensures neither `next dev` nor `next build` ever compiles files from `vendor/genshin-optimizer` or `packages/engine/src`.

