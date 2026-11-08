# Research: Per-Effect Elemental Resonance Controls (`resonance-effects`)

## Decision 1: Sourcing Resonance Names & Descriptions from Vendored GO Data

- **Decision**: Import `vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en/elementalResonance_gen.json` and `vendor/genshin-optimizer/libs/gi/localization/assets/locales/en/elementalResonance.json` directly in `packages/presets/src/settings.ts` to populate `TriggeredResonanceDescriptor.name`, `TriggeredResonanceDescriptor.desc`, and secondary condition text (`conditionText`), paired with a concise plain-language stat summary (`plainSummary`).
- **Rationale**:
  1. `elementalResonance_gen.json` is a 70-line static JSON file containing the official names and descriptions for all 8 elemental resonances (`ProtectiveCanopy`, `FerventFlames`, `SoothingWater`, `ShatteringIce`, `HighVoltage`, `ImpetuousWinds`, `EnduringRock`, `SprawlingGreenery`).
  2. `elementalResonance.json` contains the secondary condition strings for `EnduringRock` (`baseCond`, `hitCond`) and `SprawlingGreenery` (`cond2ele`, `cond3ele`).
  3. Importing them in `@gi/presets` keeps both `@gi/engine` and `@gi/web` aligned on a single source of truth from vendored GO data without any hardcoded resonance names or descriptions from memory.

## Decision 2: Independent Per-Effect Filtering in `getEffectiveResonanceData`

- **Decision**: In `vendor/genshin-optimizer/libs/gi/sheets/src/Resonance.tsx`, `resonanceData` places each resonance's buffs on disjoint keys of `teamBuff.premod` and `teamBuff.total`:
  - `ProtectiveCanopy` → `premod.${ele}_res_` (`anemo_res_`, `geo_res_`, `electro_res_`, `hydro_res_`, `pyro_res_`, `cryo_res_`, `dendro_res_`, `physical_res_`)
  - `FerventFlames` → `premod.atk_`
  - `SoothingWater` → `premod.hp_`
  - `ShatteringIce` → `total.critRate_`
  - `HighVoltage` → no stat node (particle generation effect)
  - `ImpetuousWinds` → `premod.staminaDec_`, `premod.moveSPD_`, `premod.cdRed_`
  - `EnduringRock` → `premod.shield_`, `premod.all_dmg_`, `premod.geo_enemyRes_`
  - `SprawlingGreenery` → `premod.eleMas`
  In `getEffectiveResonanceData` (`packages/engine/src/teamData.ts`), each resonance effect checks whether it is explicitly disabled in `resCond` (by canonical key e.g. `ShatteringIce: 'off'` or element key `Cryo: 'off'` / `cryo: 'off'`). When disabled, only that resonance's keys are deleted from `premod`/`total` (and skipped in `smallTeamEleCounts`).
- **Rationale**: Because the stat keys in `resonanceData` are completely disjoint across the 8 resonances, deleting a disabled resonance's keys removes 100% of its contribution while leaving every other active resonance's `NumNode`s untouched. When all triggered resonances are ON and Master is ON, `getEffectiveResonanceData` returns `resonanceData` directly, guaranteeing zero performance overhead and byte-identical golden fixtures.
