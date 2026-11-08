import { displayName } from '@gi/presets'
import { KeyMap } from '@genshin-optimizer/gi/keymap'
import type { StatBreakdown } from './types'

export type RealStatGroupKey = 'core' | 'dmg' | 'res' | 'other'

export interface RealStatGroupDescriptor {
  key: RealStatGroupKey
  label: string
  statKeys: readonly string[]
}

export const CORE_REAL_STAT_KEYS = [
  'hp',
  'atk',
  'def',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
] as const

export const DMG_REAL_STAT_KEYS = [
  'pyro_dmg_',
  'hydro_dmg_',
  'dendro_dmg_',
  'electro_dmg_',
  'anemo_dmg_',
  'cryo_dmg_',
  'geo_dmg_',
  'physical_dmg_',
  'all_dmg_',
  'normal_dmg_',
  'charged_dmg_',
  'plunging_dmg_',
  'plunging_collision_dmg_',
  'plunging_impact_dmg_',
  'skill_dmg_',
  'burst_dmg_',
  'elemental_dmg_',
  'normalEle_dmg_',
] as const

export const RES_REAL_STAT_KEYS = [
  'pyro_res_',
  'hydro_res_',
  'dendro_res_',
  'electro_res_',
  'anemo_res_',
  'cryo_res_',
  'geo_res_',
  'physical_res_',
] as const

export const OTHER_REAL_STAT_KEYS = [
  'heal_',
  'incHeal_',
  'healInc',
  'shield_',
  'cdRed_',
  'moveSPD_',
  'atkSPD_',
  'weakspotDMG_',
  'dmgRed_',
  'staminaDec_',
  'staminaSprintDec_',
  'staminaGlidingDec_',
  'staminaChargedDec_',
] as const

export const REAL_STAT_KEYS_BY_GROUP: Record<
  RealStatGroupKey,
  readonly string[]
> = {
  core: CORE_REAL_STAT_KEYS,
  dmg: DMG_REAL_STAT_KEYS,
  res: RES_REAL_STAT_KEYS,
  other: OTHER_REAL_STAT_KEYS,
}

export const REAL_STAT_GROUPS: readonly RealStatGroupDescriptor[] = [
  { key: 'core', label: 'Core', statKeys: CORE_REAL_STAT_KEYS },
  { key: 'dmg', label: 'DMG%', statKeys: DMG_REAL_STAT_KEYS },
  { key: 'res', label: 'RES%', statKeys: RES_REAL_STAT_KEYS },
  { key: 'other', label: 'Other', statKeys: OTHER_REAL_STAT_KEYS },
] as const

export const ALL_REAL_STAT_KEYS = [
  ...CORE_REAL_STAT_KEYS,
  ...DMG_REAL_STAT_KEYS,
  ...RES_REAL_STAT_KEYS,
  ...OTHER_REAL_STAT_KEYS,
] as const

export type RealStatKey = (typeof ALL_REAL_STAT_KEYS)[number]

/**
 * Hit-scoped modifiers ("Additional Buffs") that never enter panel stats.
 * Derived from @genshin-optimizer/gi/wr-types and @genshin-optimizer/gi/keymap:
 * - Per-element + Physical CRIT Rate & CRIT DMG (16)
 * - Per-move-type CRIT Rate & CRIT DMG (16)
 * - Per-element, per-move-type, common, and reaction flat DMG Increase (41)
 * - Reaction DMG bonuses & Lunar/Stellar base/special/multiplier bonuses (30)
 * - Reaction CRIT Rate & CRIT DMG (20)
 * - Enemy DEF & per-element RES modifiers (10)
 */
export const ALL_ADDITIONAL_BUFF_KEYS = [
  // Per-Element + Physical CRIT Rate & CRIT DMG (16)
  'pyro_critRate_',
  'pyro_critDMG_',
  'hydro_critRate_',
  'hydro_critDMG_',
  'dendro_critRate_',
  'dendro_critDMG_',
  'electro_critRate_',
  'electro_critDMG_',
  'anemo_critRate_',
  'anemo_critDMG_',
  'cryo_critRate_',
  'cryo_critDMG_',
  'geo_critRate_',
  'geo_critDMG_',
  'physical_critRate_',
  'physical_critDMG_',

  // Per-Move-Type CRIT Rate & CRIT DMG (16)
  'normal_critRate_',
  'normal_critDMG_',
  'charged_critRate_',
  'charged_critDMG_',
  'plunging_critRate_',
  'plunging_critDMG_',
  'plunging_collision_critRate_',
  'plunging_collision_critDMG_',
  'plunging_impact_critRate_',
  'plunging_impact_critDMG_',
  'skill_critRate_',
  'skill_critDMG_',
  'burst_critRate_',
  'burst_critDMG_',
  'elemental_critRate_',
  'elemental_critDMG_',

  // Flat DMG Increase: Common, Elemental, Move-Type, Reaction, Lunar, Stellar (41)
  'all_dmgInc',
  'pyro_dmgInc',
  'hydro_dmgInc',
  'dendro_dmgInc',
  'electro_dmgInc',
  'anemo_dmgInc',
  'cryo_dmgInc',
  'geo_dmgInc',
  'physical_dmgInc',
  'normal_dmgInc',
  'charged_dmgInc',
  'plunging_dmgInc',
  'plunging_collision_dmgInc',
  'plunging_impact_dmgInc',
  'skill_dmgInc',
  'burst_dmgInc',
  'elemental_dmgInc',
  'overloaded_dmgInc',
  'shattered_dmgInc',
  'electrocharged_dmgInc',
  'lunarcharged_dmgInc',
  'superconduct_dmgInc',
  'swirl_dmgInc',
  'burning_dmgInc',
  'bloom_dmgInc',
  'burgeon_dmgInc',
  'hyperbloom_dmgInc',
  'lunarbloom_dmgInc',
  'lunarcrystallize_dmgInc',
  'stellarconduct_dmgInc',
  'stellarswirl_dmgInc',
  'lunarcharged_reactionDmgInc',
  'lunarcharged_directDmgInc',
  'lunarbloom_reactionDmgInc',
  'lunarbloom_directDmgInc',
  'lunarcrystallize_reactionDmgInc',
  'lunarcrystallize_directDmgInc',
  'stellarconduct_reactionDmgInc',
  'stellarconduct_directDmgInc',
  'stellarswirl_reactionDmgInc',
  'stellarswirl_directDmgInc',

  // Reaction DMG Bonuses & Lunar/Stellar Modifiers (30)
  'vaporize_dmg_',
  'melt_dmg_',
  'spread_dmg_',
  'aggravate_dmg_',
  'overloaded_dmg_',
  'shattered_dmg_',
  'electrocharged_dmg_',
  'lunarcharged_dmg_',
  'superconduct_dmg_',
  'swirl_dmg_',
  'burning_dmg_',
  'bloom_dmg_',
  'burgeon_dmg_',
  'hyperbloom_dmg_',
  'lunarbloom_dmg_',
  'lunarcrystallize_dmg_',
  'stellarconduct_dmg_',
  'stellarswirl_dmg_',
  'lunarcharged_baseDmg_',
  'lunarcharged_specialDmg_',
  'lunarbloom_baseDmg_',
  'lunarbloom_specialDmg_',
  'lunarcrystallize_baseDmg_',
  'lunarcrystallize_specialDmg_',
  'stellarconduct_baseDmg_',
  'stellarconduct_specialDmg_',
  'stellarconduct_mult_',
  'stellarswirl_baseDmg_',
  'stellarswirl_specialDmg_',
  'stellarswirl_mult_',

  // Reaction CRIT Rate & CRIT DMG (20)
  'burning_critRate_',
  'burning_critDMG_',
  'bloom_critRate_',
  'bloom_critDMG_',
  'burgeon_critRate_',
  'burgeon_critDMG_',
  'hyperbloom_critRate_',
  'hyperbloom_critDMG_',
  'swirl_critRate_',
  'swirl_critDMG_',
  'lunarcharged_critRate_',
  'lunarcharged_critDMG_',
  'lunarbloom_critRate_',
  'lunarbloom_critDMG_',
  'lunarcrystallize_critRate_',
  'lunarcrystallize_critDMG_',
  'stellarconduct_critRate_',
  'stellarconduct_critDMG_',
  'stellarswirl_critRate_',
  'stellarswirl_critDMG_',

  // Enemy DEF & RES Modifiers (10)
  'pyro_enemyRes_',
  'hydro_enemyRes_',
  'dendro_enemyRes_',
  'electro_enemyRes_',
  'anemo_enemyRes_',
  'cryo_enemyRes_',
  'geo_enemyRes_',
  'physical_enemyRes_',
  'enemyDefRed_',
  'enemyDefIgn_',
] as const

export type AdditionalBuffStatKey = (typeof ALL_ADDITIONAL_BUFF_KEYS)[number]

export const ALL_EXTRACTED_STAT_KEYS = [
  ...ALL_REAL_STAT_KEYS,
  ...ALL_ADDITIONAL_BUFF_KEYS,
] as const

export type ExtractedStatKey = (typeof ALL_EXTRACTED_STAT_KEYS)[number]

/**
 * Explicit exclusion list for the remaining keys in @genshin-optimizer/gi/wr-types
 * `allInputPremodKeys` (`[...allModStats, ...allNonModStats]`), each with a 1-line reason.
 */
export const EXCLUDED_GO_STAT_KEYS: Record<string, string> = {
  hp_: 'Percentage HP scaling modifier folded into total HP panel stat and its percentContributors breakdown.',
  atk_: 'Percentage ATK scaling modifier folded into total ATK panel stat and its percentContributors breakdown.',
  def_: 'Percentage DEF scaling modifier folded into total DEF panel stat and its percentContributors breakdown.',
  base_hp:
    'Base HP stat folded into total HP panel stat and its baseContributors breakdown.',
  base_atk:
    'Base ATK stat folded into total ATK panel stat and its baseContributors breakdown.',
  base_def:
    'Base DEF stat folded into total DEF panel stat and its baseContributors breakdown.',
  autoBoost:
    'Normal Attack talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier.',
  skillBoost:
    'Elemental Skill talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier.',
  burstBoost:
    'Elemental Burst talent level boost (+3 levels) reflected in talent level display, not a combat stat or hit modifier.',
  stamina:
    'Fixed 100 base stamina constant in GO formula.ts; stamina consumption modifiers (staminaDec_*) are extracted in Other.',
}

const ELEMENT_DISPLAY_NAMES: Record<string, string> = {
  pyro: 'Pyro',
  hydro: 'Hydro',
  dendro: 'Dendro',
  electro: 'Electro',
  anemo: 'Anemo',
  cryo: 'Cryo',
  geo: 'Geo',
  physical: 'Physical',
}

const MOVE_DISPLAY_NAMES: Record<string, string> = {
  normal: 'Normal Attack',
  charged: 'Charged Attack',
  plunging: 'Plunging Attack',
  plunging_collision: 'Plunging Collision',
  plunging_impact: 'Plunging Impact',
  skill: 'Elemental Skill',
  burst: 'Elemental Burst',
  elemental: 'Elemental Attack',
}

const REACTION_DISPLAY_NAMES: Record<string, string> = {
  vaporize: 'Vaporize',
  melt: 'Melt',
  spread: 'Spread',
  aggravate: 'Aggravate',
  overloaded: 'Overloaded',
  shattered: 'Shattered',
  electrocharged: 'Electro-Charged',
  lunarcharged: 'Lunar-Charged',
  superconduct: 'Superconduct',
  swirl: 'Swirl',
  burning: 'Burning',
  bloom: 'Bloom',
  burgeon: 'Burgeon',
  hyperbloom: 'Hyperbloom',
  lunarbloom: 'Lunar-Bloom',
  lunarcrystallize: 'Lunar-Crystallize',
  stellarconduct: 'Stellar-Conduct',
  stellarswirl: 'Stellar Swirl',
}

function buildStatLabels(): Record<string, string> {
  const labels: Record<string, string> = {
    // Core (7)
    hp: 'HP',
    atk: 'ATK',
    def: 'DEF',
    eleMas: 'Elemental Mastery',
    enerRech_: 'Energy Recharge',
    critRate_: 'CRIT Rate',
    critDMG_: 'CRIT DMG',

    // DMG% (18)
    pyro_dmg_: 'Pyro DMG Bonus',
    hydro_dmg_: 'Hydro DMG Bonus',
    dendro_dmg_: 'Dendro DMG Bonus',
    electro_dmg_: 'Electro DMG Bonus',
    anemo_dmg_: 'Anemo DMG Bonus',
    cryo_dmg_: 'Cryo DMG Bonus',
    geo_dmg_: 'Geo DMG Bonus',
    physical_dmg_: 'Physical DMG Bonus',
    all_dmg_: 'All DMG Bonus',
    normal_dmg_: 'Normal DMG Bonus',
    charged_dmg_: 'Charged DMG Bonus',
    plunging_dmg_: 'Plunging DMG Bonus',
    plunging_collision_dmg_: 'Plunging Collision DMG Bonus',
    plunging_impact_dmg_: 'Plunging Impact DMG Bonus',
    skill_dmg_: 'Skill DMG Bonus',
    burst_dmg_: 'Burst DMG Bonus',
    elemental_dmg_: 'Elemental DMG Bonus',
    normalEle_dmg_: 'Normal Elemental DMG Bonus',

    // RES% (8)
    pyro_res_: 'Pyro RES',
    hydro_res_: 'Hydro RES',
    dendro_res_: 'Dendro RES',
    electro_res_: 'Electro RES',
    anemo_res_: 'Anemo RES',
    cryo_res_: 'Cryo RES',
    geo_res_: 'Geo RES',
    physical_res_: 'Physical RES',

    // Other (13)
    heal_: 'Healing Bonus',
    incHeal_: 'Incoming Healing Bonus',
    healInc: 'Healing Increase',
    shield_: 'Shield Strength',
    cdRed_: 'CD Reduction',
    moveSPD_: 'Movement SPD',
    atkSPD_: 'ATK SPD',
    weakspotDMG_: 'Weakspot DMG',
    dmgRed_: 'DMG Reduction',
    staminaDec_: 'Stamina Consumption Reduction',
    staminaSprintDec_: 'Sprint Stamina Reduction',
    staminaGlidingDec_: 'Gliding Stamina Reduction',
    staminaChargedDec_: 'Charged Stamina Reduction',

    // Common flat DMG Inc & Enemy DEF
    all_dmgInc: 'All DMG Increase',
    enemyDefRed_: 'Enemy DEF Reduction',
    enemyDefIgn_: 'Enemy DEF Ignore',
  }

  for (const [ele, eleName] of Object.entries(ELEMENT_DISPLAY_NAMES)) {
    labels[`${ele}_critRate_`] = `${eleName} CRIT Rate`
    labels[`${ele}_critDMG_`] = `${eleName} CRIT DMG`
    labels[`${ele}_dmgInc`] = `${eleName} DMG Increase`
    labels[`${ele}_enemyRes_`] = `Enemy ${eleName} RES`
  }

  for (const [move, moveName] of Object.entries(MOVE_DISPLAY_NAMES)) {
    labels[`${move}_critRate_`] = `${moveName} CRIT Rate`
    labels[`${move}_critDMG_`] = `${moveName} CRIT DMG`
    labels[`${move}_dmgInc`] = `${moveName} DMG Increase`
  }

  for (const [rx, rxName] of Object.entries(REACTION_DISPLAY_NAMES)) {
    labels[`${rx}_dmg_`] = `${rxName} DMG Bonus`
    labels[`${rx}_dmgInc`] = `${rxName} DMG Increase`
    labels[`${rx}_critRate_`] = `${rxName} CRIT Rate`
    labels[`${rx}_critDMG_`] = `${rxName} CRIT DMG`
    labels[`${rx}_baseDmg_`] = `${rxName} Base DMG Bonus`
    labels[`${rx}_specialDmg_`] = `${rxName} Special DMG Bonus`
    labels[`${rx}_reactionDmgInc`] = `${rxName} Reaction DMG Increase`
    labels[`${rx}_directDmgInc`] = `${rxName} Direct DMG Increase`
    labels[`${rx}_mult_`] = `${rxName} Multiplier`
  }

  return labels
}

export const STAT_LABELS: Record<string, string> = buildStatLabels()

export function getStatLabel(statKey: string): string {
  return STAT_LABELS[statKey] ?? KeyMap.getStr(statKey) ?? statKey
}

export function isPercentStatKey(statKey: string): boolean {
  return statKey.endsWith('_')
}

export function isEnemyResStatKey(statKey: string): boolean {
  return statKey.endsWith('_enemyRes_')
}

/**
 * Formats a signed hit-scoped modifier value (e.g. "+10%", "+12.5%", "-20%", "+1,250").
 * Integer percentages omit trailing ".0" to match GO / user display conventions ("Geo CRIT Rate +10%"),
 * while fractional percentages keep 1 decimal place ("+12.5%").
 */
export function formatSignedBuffValue(statKey: string, value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (isPercentStatKey(statKey)) {
    const pctTenths = Math.round(value * 1000) / 10
    const sign = pctTenths > 0 ? '+' : ''
    if (Math.abs(pctTenths - Math.round(pctTenths)) < 1e-6) {
      return `${sign}${Math.round(pctTenths)}%`
    }
    return `${sign}${pctTenths.toFixed(1)}%`
  }
  const rounded = Math.round(value)
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString()}`
}

/**
 * Derives concise source attribution for an active stat/buff from its StatBreakdown
 * (e.g. "Illuga", "Shenhe", "Yun Jin", "Elemental Resonance").
 */
export function formatBuffSourceAttribution(
  breakdown: StatBreakdown | undefined
): string {
  if (!breakdown || !breakdown.contributors) return ''
  const sources: string[] = []
  const seen = new Set<string>()

  for (const c of breakdown.contributors) {
    if (Math.abs(c.value) <= 1e-9) continue
    if (c.category === 'enemy') continue

    let name = ''
    const rawLabel =
      c.label ?? (c as unknown as { source?: string }).source ?? ''
    if (c.category === 'resonance') {
      name = 'Elemental Resonance'
    } else if (c.sourceKey) {
      name = displayName(c.sourceKey)
    } else {
      name = rawLabel.replace(/\s*\([^()]+\)\s*$/, '').trim()
    }

    if (name && !seen.has(name)) {
      seen.add(name)
      sources.push(name)
    }
  }

  return sources.join(', ')
}
