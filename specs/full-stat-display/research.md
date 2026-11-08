# Research: Full Stat Display (`full-stat-display`)

## 1. Auditing Vendored GO Stat Definitions

### Source Files Inspected
- `vendor/genshin-optimizer/libs/gi/wr-types/src/keys.ts`
- `vendor/genshin-optimizer/libs/gi/keymap/src/KeyMap.ts`
- `vendor/genshin-optimizer/libs/gi/keymap/src/StatConstants.ts`
- `vendor/genshin-optimizer/libs/gi/wr/src/formula.ts`
- `vendor/genshin-optimizer/libs/gi/wr/src/api.ts`

### Findings
- `@genshin-optimizer/gi/wr-types` exports `allModStats` (186 keys) and `allNonModStats` (3 keys: `base_hp`, `base_atk`, `base_def`), combined into `allInputPremodKeys` (189 keys).
- Every key in `allInputPremodKeys` is wired into `input.total[key]` in `formula.ts` (`read` node with `accu: 'add'`).
- Specifically:
  - **Real (Panel) Stats (46 keys)**:
    - `core` (7): `hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`
    - `dmg` (18): `allEleDmgKeys` (8: `pyro_dmg_`, `hydro_dmg_`, `dendro_dmg_`, `electro_dmg_`, `anemo_dmg_`, `cryo_dmg_`, `geo_dmg_`, `physical_dmg_`), `all_dmg_`, `normal_dmg_`, `charged_dmg_`, `plunging_dmg_`, `plunging_collision_dmg_`, `plunging_impact_dmg_`, `skill_dmg_`, `burst_dmg_`, `elemental_dmg_`, `normalEle_dmg_`
    - `res` (8): `allEleResKeys` (`pyro_res_`, `hydro_res_`, `dendro_res_`, `electro_res_`, `anemo_res_`, `cryo_res_`, `geo_res_`, `physical_res_`)
    - `other` (13): `heal_`, `incHeal_`, `healInc`, `shield_`, `cdRed_`, `moveSPD_`, `atkSPD_`, `weakspotDMG_`, `dmgRed_`, `staminaDec_`, `staminaSprintDec_`, `staminaGlidingDec_`, `staminaChargedDec_`
  - **Hit-Scoped Additional Buffs (133 keys)**:
    - Elemental CRIT (16): `${ele}_critRate_`, `${ele}_critDMG_` for `allElements`
    - Move CRIT (16): `${move}_critRate_`, `${move}_critDMG_` for `[...allMoves, 'plunging']`
    - Flat DMG Increase (41): `all_dmgInc`, `${ele}_dmgInc`, `${move}_dmgInc`, `${trans}_dmgInc`, `${lunar}_reactionDmgInc`, `${lunar}_directDmgInc`, `${stellar}_reactionDmgInc`, `${stellar}_directDmgInc`
    - Reaction DMG Bonuses & Multipliers (30): `${reaction}_dmg_` (18), `${lunar}_baseDmg_` (3), `${lunar}_specialDmg_` (3), `${stellar}_baseDmg_` (2), `${stellar}_specialDmg_` (2), `${stellar}_mult_` (2)
    - Reaction CRIT (20): `${crittableReaction}_critRate_`, `${crittableReaction}_critDMG_` for `crittableTransformativeReactions` (`lunarcharged`, `burning`, `bloom`, `burgeon`, `hyperbloom`, `lunarbloom`, `swirl`, `lunarcrystallize`, `stellarconduct`, `stellarswirl`)
    - Enemy DEF/RES Modifiers (10): `${ele}_enemyRes_` (8), `enemyDefRed_`, `enemyDefIgn_`
  - **Excluded Keys (10 keys)**:
    - `hp_`, `atk_`, `def_`, `base_hp`, `base_atk`, `base_def`, `autoBoost`, `skillBoost`, `burstBoost`, `stamina`.

## 2. Enemy Resistance (`${ele}_enemyRes_`) Baseline Handling

### Decision
Subtract `memberUi.get(input.enemy[`${ele}_res_`]).value` from `memberUi.get(input.total[`${ele}_enemyRes_`]).value` and filter out `c.category === 'enemy'` from `contributors` in `extractStatBreakdowns`.

### Rationale
In `vendor/genshin-optimizer/libs/gi/wr/src/formula.ts`:
```ts
... objKeyValMap(allElements, (ele) => [
  `${ele}_enemyRes_`,
  sum(input.enemy[`${ele}_res_`], customBonus[`${ele}_enemyRes_`], premod[`${ele}_enemyRes_`]),
])
```
And in `api.ts`, `enemy.${ele}_res_` defaults to `0.10` (`10%`) for all 8 elements. Subtracting `input.enemy.${ele}_res_` yields `0` when no enemy RES modifiers are active and the exact net modifier (e.g. `-0.20` for Geo Resonance) when active.

## 3. Character Sheet Verification for Acceptance Spread

- **Zibai & Illuga (`official/zibai-lunar-crystallize`)**:
  - `Illuga/index.tsx` registers `teamBuff.premod.geo_critRate_` (`+10%` with Moonsign Ascendant Gleam when `a1AfterSkillBurst` is `'on'`) and `teamBuff.premod.geo_critDMG_` (`+30%` with Moonsign Ascendant Gleam when `a1AfterSkillBurst` is `'on'`).
  - `Resonance.tsx` registers `teamBuff.premod.shield_` (`+15%`), `teamBuff.premod.all_dmg_` (`+15%`), and `teamBuff.premod.geo_enemyRes_` (`-20%`) when `condEnduringRock` is `'shield'`.
- **Shenhe (`Shenhe/index.tsx`)**:
  - Registers `teamBuff.premod.cryo_dmgInc` when `press` (`'press'`) or `hold` (`'hold'`) conditional is active.
- **Yun Jin (`YunJin/index.tsx`)**:
  - Registers `teamBuff.premod.normal_dmgInc` when `q` (`'on'`) conditional is active.
- **Nahida C2 (`Nahida/index.tsx`)**:
  - At `constellation >= 2` with conditional `c2.crit === 'crit'`, registers `teamBuff.premod` for `burning_critRate_` (`20%`), `bloom_critRate_` (`20%`), `hyperbloom_critRate_` (`20%`), `burgeon_critRate_` (`20%`), `lunarbloom_critRate_` (`10%`), and their corresponding `_critDMG_` (`100%` / `20%`).
