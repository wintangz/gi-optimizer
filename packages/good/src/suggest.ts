/**
 * Computes Levenshtein distance between two strings (case-insensitive) and returns
 * the closest candidate when within a reasonable edit distance.
 */
export function didYouMean(
  input: string,
  candidates: readonly string[],
  maxDistance = 3
): string | undefined {
  if (!input || typeof input !== 'string') return undefined
  const lower = input.toLowerCase()

  // Exact case-insensitive or underscore-only difference gets top priority
  for (const cand of candidates) {
    if (cand.toLowerCase() === lower || cand.toLowerCase() === `${lower}_`) {
      return cand
    }
  }

  let best: string | undefined
  let bestDist = maxDistance + 1

  for (const cand of candidates) {
    const d = levenshtein(lower, cand.toLowerCase())
    if (d < bestDist) {
      bestDist = d
      best = cand
    }
  }
  return best
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!
  }
  return prev[b.length]!
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  hp_: 'HP%',
  atk: 'ATK',
  atk_: 'ATK%',
  def: 'DEF',
  def_: 'DEF%',
  eleMas: 'Elemental Mastery',
  enerRech_: 'Energy Recharge',
  critRate_: 'CRIT Rate',
  critDMG_: 'CRIT DMG',
  heal_: 'Healing Bonus',
  physical_dmg_: 'Physical DMG Bonus',
  anemo_dmg_: 'Anemo DMG Bonus',
  geo_dmg_: 'Geo DMG Bonus',
  electro_dmg_: 'Electro DMG Bonus',
  hydro_dmg_: 'Hydro DMG Bonus',
  pyro_dmg_: 'Pyro DMG Bonus',
  cryo_dmg_: 'Cryo DMG Bonus',
  dendro_dmg_: 'Dendro DMG Bonus',
}

/**
 * Turns a GO PascalCase key or stat key into a human-readable English label.
 */
export function humanizeKey(key: string): string {
  if (!key) return ''
  if (STAT_LABELS[key]) return STAT_LABELS[key]!
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

