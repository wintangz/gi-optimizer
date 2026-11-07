# Research: Preset Conditional GO Alignment (`preset-conditional-go-alignment`)

## 1. Exhaustive Audit of All 11 Bundled Presets vs. Vendored GO Sheets

Every bundled preset in `packages/presets/data/akasha/*.json` (5 files) and `packages/presets/data/official/*.json` (6 files) was audited against `vendor/genshin-optimizer/libs/gi/sheets/src/`.

### 1.1 Complete Mismatch Table (`member.conditional`)

| Preset File | Member | Authored `{ sheetKey: { condKey: condVal } }` | Issue | Authoritative GO `{ sheetKey: { condKey: condVal } }` | GO Sheet Source |
|---|---|---|---|---|---|
| `akasha/furina-salon-pjc-c0.json` | `0: Furina` | `GoldenTroupe: { "offField": "on" }` | Unknown key `offField` (blocks default-on fallback) | `GoldenTroupe: { "set4": "on" }` | `Artifacts/GoldenTroupe/index.tsx` (`cond('GoldenTroupe', 'set4')`) |
| `akasha/furina-salon-pjc-c0.json` | `3: Zhongli` | `ArchaicPetra: { "ele": "hydro" }` | Unknown key `ele` | `ArchaicPetra: { "element": "hydro" }` | `Artifacts/ArchaicPetra/index.tsx` (`cond('ArchaicPetra', 'element')`) |
| `akasha/furina-splendor-c2.json` | `0: Furina` | `SplendorOfTranquilWaters: { "hpChanges": "3", "otherHpChanges": "2" }` | Unknown keys `hpChanges`, `otherHpChanges` (blocks weapon auto-populate) | `SplendorOfTranquilWaters: { "selfHpChange": "3", "teamHpChange": "2" }` | `Weapons/Sword/SplendorOfTranquilWaters/index.tsx` |
| `akasha/furina-splendor-c2.json` | `0: Furina` | `GoldenTroupe: { "offField": "on" }` | Unknown key `offField` (blocks default-on fallback) | `GoldenTroupe: { "set4": "on" }` | `Artifacts/GoldenTroupe/index.tsx` |
| `akasha/hutao-double-hydro-homa-c1.json` | `3: Zhongli` | `TenacityOfTheMillelith: { "set4": "on" }` | Unknown key `set4` and value `on` | `TenacityOfTheMillelith: { "skill": "cast" }` | `Artifacts/TenacityOfTheMillelith/index.tsx` (`cond('TenacityOfTheMillelith', 'skill')` -> `'cast'`) |
| `akasha/neuvillette-hypercarry-protoamber-c0.json` | `0: Neuvillette` | `Neuvillette: { "a4Hp": "80" }` | Invalid value `80` (`range(1, 50)` where `50` = 80% HP) | `Neuvillette: { "a4Hp": "50" }` | `Characters/Neuvillette/index.tsx` (`cond('Neuvillette', 'a4Hp')`) |
| `akasha/neuvillette-hypercarry-protoamber-c0.json` | `0: Neuvillette` | `MarechausseeHunter: { "stacks": "3" }` | Unknown key `stacks` | `MarechausseeHunter: { "set4": "3" }` | `Artifacts/MarechausseeHunter/index.tsx` (`cond('MarechausseeHunter', 'set4')`) |
| `akasha/neuvillette-hypercarry-protoamber-c0.json` | `3: Zhongli` | `ArchaicPetra: { "ele": "hydro" }` | Unknown key `ele` | `ArchaicPetra: { "element": "hydro" }` | `Artifacts/ArchaicPetra/index.tsx` |
| `akasha/raiden-hypercarry-scarlet-c0.json` | `0: RaidenShogun` | `RaidenShogun: { "skillEye": "on" }` | Invalid value `on` | `RaidenShogun: { "skillEye": "skillEye" }` | `Characters/RaidenShogun/index.tsx` (`equal('skillEye', condSkillEye, ...)`) |
| `akasha/raiden-hypercarry-scarlet-c0.json` | `1: KujouSara` | `KujouSara: { "TenguJuuraiAmbush": "on", "c6": "on" }` | Invalid values `on` | `KujouSara: { "TenguJuuraiAmbush": "TenguJuuraiAmbush", "c6": "c6" }` | `Characters/KujouSara/index.tsx` |
| `akasha/raiden-hypercarry-scarlet-c0.json` | `3: Bennett` | `Bennett: { "activeInArea": "active" }` | Invalid value `active` | `Bennett: { "activeInArea": "activeInArea" }` | `Characters/Bennett/index.tsx` (`equal('activeInArea', condInArea, ...)`) |
| `official/arlecchino-vaporize.json` | `2: Bennett` | `Bennett: { "activeInArea": "active" }` | Invalid value `active` | `Bennett: { "activeInArea": "activeInArea" }` | `Characters/Bennett/index.tsx` |
| `official/arlecchino-vaporize.json` | `3: Zhongli` | `TenacityOfTheMillelith: { "set4": "on" }` | Unknown key `set4` and value `on` | `TenacityOfTheMillelith: { "skill": "cast" }` | `Artifacts/TenacityOfTheMillelith/index.tsx` |
| `official/furina-salon-subdps.json` | `0: Furina` | `GoldenTroupe: { "offField": "on" }` | Unknown key `offField` (blocks default-on fallback) | `GoldenTroupe: { "set4": "on" }` | `Artifacts/GoldenTroupe/index.tsx` |
| `official/furina-salon-subdps.json` | `3: Zhongli` | `ArchaicPetra: { "ele": "hydro", "element": "hydro" }` | Dead duplicate key `ele` alongside `element` | `ArchaicPetra: { "element": "hydro" }` | `Artifacts/ArchaicPetra/index.tsx` |
| `official/hutao-double-hydro-vape.json` | `3: Zhongli` | `TenacityOfTheMillelith: { "set4": "on" }` | Unknown key `set4` and value `on` | `TenacityOfTheMillelith: { "skill": "cast" }` | `Artifacts/TenacityOfTheMillelith/index.tsx` |
| `official/mavuika-melt-hypercarry.json` | `0: Mavuika` | `ObsidianCodex: { "set2": "on", "set4": "on" }` | Unknown keys `set2`, `set4` (blocks default-on fallback) | `ObsidianCodex: { "2NightsoulBlessing": "on", "4NightsoulConsume": "on" }` | `Artifacts/ObsidianCodex/index.tsx` |
| `official/mavuika-melt-hypercarry.json` | `1: Citlali` | `ScrollOfTheHeroOfCinderCity: { "nsReact": "on", "afterReact": "on" }` | Unknown keys `nsReact`, `afterReact` and value `on` | `ScrollOfTheHeroOfCinderCity: { "react_pyro": "pyro", "nightsoul_pyro": "pyro" }` | `Artifacts/ScrollOfTheHeroOfCinderCity/index.tsx` |
| `official/mavuika-melt-hypercarry.json` | `2: Xilonen` | `ArchaicPetra: { "ele": "pyro", "element": "pyro" }` | Dead duplicate key `ele` alongside `element` | `ArchaicPetra: { "element": "pyro" }` | `Artifacts/ArchaicPetra/index.tsx` |
| `official/mavuika-melt-hypercarry.json` | `3: Bennett` | `Bennett: { "activeInArea": "active" }` | Invalid value `active` | `Bennett: { "activeInArea": "activeInArea" }` | `Characters/Bennett/index.tsx` |
| `official/neuvillette-hypercarry.json` | `0: Neuvillette` | `Neuvillette: { "a4Hp": "80" }` | Invalid value `80` (`range(1, 50)`) | `Neuvillette: { "a4Hp": "50" }` | `Characters/Neuvillette/index.tsx` |
| `official/neuvillette-hypercarry.json` | `0: Neuvillette` | `MarechausseeHunter: { "stacks": "3" }` | Unknown key `stacks` | `MarechausseeHunter: { "set4": "3" }` | `Artifacts/MarechausseeHunter/index.tsx` |
| `official/neuvillette-hypercarry.json` | `3: Zhongli` | `ArchaicPetra: { "ele": "hydro" }` | Unknown key `ele` | `ArchaicPetra: { "element": "hydro" }` | `Artifacts/ArchaicPetra/index.tsx` |
| `official/raiden-hypercarry.json` | `0: RaidenShogun` | `RaidenShogun: { "skillEye": "on" }` | Invalid value `on` | `RaidenShogun: { "skillEye": "skillEye" }` | `Characters/RaidenShogun/index.tsx` |
| `official/raiden-hypercarry.json` | `0: RaidenShogun` | `EngulfingLightning: { "enerRech": "on" }` | Unknown key `enerRech` | `EngulfingLightning: { "TimelessDream": "on" }` | `Weapons/Polearm/EngulfingLightning/index.tsx` (`cond('EngulfingLightning', 'TimelessDream')`) |
| `official/raiden-hypercarry.json` | `1: KujouSara` | `KujouSara: { "TenguJuuraiAmbush": "on", "c6": "on" }` | Invalid values `on` | `KujouSara: { "TenguJuuraiAmbush": "TenguJuuraiAmbush", "c6": "c6" }` | `Characters/KujouSara/index.tsx` |
| `official/raiden-hypercarry.json` | `3: Bennett` | `Bennett: { "activeInArea": "active" }` | Invalid value `active` | `Bennett: { "activeInArea": "activeInArea" }` | `Characters/Bennett/index.tsx` |

### 1.2 Effects Without a GO Conditional Equivalent (`teamConditional.resonance`)

In `vendor/genshin-optimizer/libs/gi/sheets/src/Resonance.tsx`, GO only defines conditional toggles for:
- `ShatteringIce` (`states: { on }`)
- `EnduringRock` (`states: { on }`)
- `EnduringRockHit` (`states: { on }`)
- `SprawlingCanopy2ele` (`states: { on }`)
- `SprawlingCanopy3ele` (`states: { on }`)

Fervent Flames (`Pyro` resonance: `+25% ATK`) and Soothing Waters (`Hydro` resonance: `+25% HP`) have **no GO conditional toggle** — GO applies them unconditionally whenever `teamSize >= 4` and `tally.pyro >= 2` / `tally.hydro >= 2`.
Therefore, `"resonance": { "Hydro": "on" }` (in `akasha/furina-salon-pjc-c0.json`, `akasha/furina-splendor-c2.json`, `akasha/hutao-double-hydro-homa-c1.json`, `akasha/neuvillette-hypercarry-protoamber-c0.json`, `official/furina-salon-subdps.json`, `official/hutao-double-hydro-vape.json`, `official/neuvillette-hypercarry.json`) and `"resonance": { "Pyro": "on" }` (in `official/arlecchino-vaporize.json`, `official/mavuika-melt-hypercarry.json`) have no GO conditional equivalent and are normalized to `"resonance": {}`.

## 2. Dynamic `states: (data: UIData) => ...` in `ScrollOfTheHeroOfCinderCity`

In `vendor/genshin-optimizer/libs/gi/sheets/src/Artifacts/ScrollOfTheHeroOfCinderCity/index.tsx`:
- Section 1 (`react_${ele}`) filters `allElementKeys.filter((ele) => data.get(input.charEle).value !== ele)`.
- Section 2 (`nightsoul_${ele}`) filters `allElementKeys.filter((ele) => data.get(condReacts[ele]).value)`.

When `getGlobalConditionalBuckets` in `packages/engine/src/catalog.ts` evaluates `sec.states(uiData)` on a scratch `UIData`, wrapping `uiData` in a proxy that returns `{ value: '' }` for `input.charEle` and `{ value: 'on' }` for `ScrollOfTheHeroOfCinderCity` `react_*` conditional nodes allows `getGlobalConditionalBuckets` to collect all 7 `react_${ele}` and all 7 `nightsoul_${ele}` descriptors from GO's sheet without modifying the submodule.
