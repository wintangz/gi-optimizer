# Data Model: Full Stat Display (`full-stat-display`)

## Entities & Constants (`packages/engine/src/stats.ts`)

### 1. `RealStatGroupKey`
```ts
export type RealStatGroupKey = 'core' | 'dmg' | 'res' | 'other';
```

### 2. `REAL_STAT_KEYS_BY_GROUP`
- **`core` (7 keys)**:
  `['hp', 'atk', 'def', 'eleMas', 'enerRech_', 'critRate_', 'critDMG_']`
- **`dmg` (18 keys)**:
  `['pyro_dmg_', 'hydro_dmg_', 'dendro_dmg_', 'electro_dmg_', 'anemo_dmg_', 'cryo_dmg_', 'geo_dmg_', 'physical_dmg_', 'all_dmg_', 'normal_dmg_', 'charged_dmg_', 'plunging_dmg_', 'plunging_collision_dmg_', 'plunging_impact_dmg_', 'skill_dmg_', 'burst_dmg_', 'elemental_dmg_', 'normalEle_dmg_']`
- **`res` (8 keys)**:
  `['pyro_res_', 'hydro_res_', 'dendro_res_', 'electro_res_', 'anemo_res_', 'cryo_res_', 'geo_res_', 'physical_res_']`
- **`other` (13 keys)**:
  `['heal_', 'incHeal_', 'healInc', 'shield_', 'cdRed_', 'moveSPD_', 'atkSPD_', 'weakspotDMG_', 'dmgRed_', 'staminaDec_', 'staminaSprintDec_', 'staminaGlidingDec_', 'staminaChargedDec_']`

### 3. `ALL_ADDITIONAL_BUFF_KEYS` (133 keys)
Ordered logically by family:
1. **Per-Element CRIT Rate & CRIT DMG (16 keys)**:
   `${ele}_critRate_`, `${ele}_critDMG_` for `anemo`, `geo`, `electro`, `hydro`, `pyro`, `cryo`, `dendro`, `physical`
2. **Per-Move CRIT Rate & CRIT DMG (16 keys)**:
   `${move}_critRate_`, `${move}_critDMG_` for `normal`, `charged`, `plunging`, `plunging_collision`, `plunging_impact`, `skill`, `burst`, `elemental`
3. **Flat DMG Increase (41 keys)**:
   - `all_dmgInc`
   - `${ele}_dmgInc` (8 keys)
   - `${move}_dmgInc` (8 keys)
   - `${transformative}_dmgInc` (14 keys)
   - `${lunar}_reactionDmgInc`, `${lunar}_directDmgInc` (6 keys)
   - `${stellar}_reactionDmgInc`, `${stellar}_directDmgInc` (4 keys)
4. **Reaction DMG Bonuses & Multipliers (30 keys)**:
   - `${reaction}_dmg_` (18 keys: transformative, amplifying, additive)
   - `${lunar}_baseDmg_`, `${lunar}_specialDmg_` (6 keys)
   - `${stellar}_baseDmg_`, `${stellar}_specialDmg_`, `${stellar}_mult_` (6 keys)
5. **Reaction CRIT Rate & CRIT DMG (20 keys)**:
   - `${crittableReaction}_critRate_`, `${crittableReaction}_critDMG_` (20 keys)
6. **Enemy DEF & RES Modifiers (10 keys)**:
   - `${ele}_enemyRes_` (8 keys)
   - `enemyDefRed_`, `enemyDefIgn_` (2 keys)

### 4. `EXCLUDED_GO_STAT_KEYS` (10 keys)
Record mapping each excluded key in `allInputPremodKeys` to a mandatory 1-line explanation:
- `hp_`: `"Percentage HP scaling modifier folded into total HP panel stat and its percentContributors breakdown."`
- `atk_`: `"Percentage ATK scaling modifier folded into total ATK panel stat and its percentContributors breakdown."`
- `def_`: `"Percentage DEF scaling modifier folded into total DEF panel stat and its percentContributors breakdown."`
- `base_hp`: `"Base HP stat folded into total HP panel stat and its baseContributors breakdown."`
- `base_atk`: `"Base ATK stat folded into total ATK panel stat and its baseContributors breakdown."`
- `base_def`: `"Base DEF stat folded into total DEF panel stat and its baseContributors breakdown."`
- `autoBoost`: `"Normal Attack talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier."`
- `skillBoost`: `"Elemental Skill talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier."`
- `burstBoost`: `"Elemental Burst talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier."`
- `stamina`: `"Fixed 100 base stamina constant in GO formula.ts; stamina consumption modifiers (staminaDec_*) are extracted in Other."`

### 5. `MemberStatSummary` (`packages/engine/src/types.ts`)
```ts
export interface MemberStatSummary {
  base: Record<string, number>;
  final: Record<string, number>;
  statBreakdowns?: Record<string, StatBreakdown>;
}
```
