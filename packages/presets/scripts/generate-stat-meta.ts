import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const allStatPath = resolve(GO_ROOT, 'libs/gi/stats/src/allStat_gen.json')
const allStat = JSON.parse(readFileSync(allStatPath, 'utf8'))

function extractConstArray(relPath: string, exportName: string): string[] {
  const src = readFileSync(resolve(GO_ROOT, relPath), 'utf8')
  const re = new RegExp(
    `export const ${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`
  )
  const m = re.exec(src)
  if (!m) throw new Error(`Could not find ${exportName} in ${relPath}`)
  return Array.from(m[1]!.matchAll(/'([^']+)'/g), (x) => x[1]!)
}

const ELE = [
  'anemo',
  'geo',
  'electro',
  'hydro',
  'pyro',
  'cryo',
  'dendro',
] as const
const WT = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'] as const

const nonTravelerCharKeys = extractConstArray(
  'libs/gi/consts/src/character.ts',
  'nonTravelerCharacterKeys'
)
const rawChars: Record<string, string> = {}
for (const k of [...nonTravelerCharKeys, 'Traveler']) {
  const v = allStat.char?.data?.[k]
  const eleIdx = Math.max(0, ELE.indexOf(v?.ele ?? 'anemo'))
  const rarity = v?.rarity === 4 ? '4' : '5'
  const wtIdx = Math.max(0, WT.indexOf(v?.weaponType ?? 'sword'))
  rawChars[k] = `${eleIdx}${rarity}${wtIdx}`
}

const allWeaponKeysOrdered = [
  ...extractConstArray('libs/gi/consts/src/weapon.ts', 'allWeaponSwordKeys'),
  ...extractConstArray('libs/gi/consts/src/weapon.ts', 'allWeaponClaymoreKeys'),
  ...extractConstArray('libs/gi/consts/src/weapon.ts', 'allWeaponPolearmKeys'),
  ...extractConstArray('libs/gi/consts/src/weapon.ts', 'allWeaponBowKeys'),
  ...extractConstArray('libs/gi/consts/src/weapon.ts', 'allWeaponCatalystKeys'),
]

const rawWeapons: Record<string, string> = {}
for (const k of allWeaponKeysOrdered) {
  const v = allStat.weapon?.data?.[k]
  const wt = v?.weaponType ?? 'sword'
  const wtIdx = Math.max(0, WT.indexOf(wt))
  const r = Math.max(1, Math.min(5, Math.round(v?.rarity ?? 4)))
  rawWeapons[k] = `${wtIdx}${r}`
}

const sortedArtKeys = extractConstArray(
  'libs/gi/consts/src/artifact.ts',
  'allArtifactSetKeys'
)
const rawArts: Record<string, string> = {}
for (const k of sortedArtKeys) {
  const v = allStat.art.data[k]
  const rarities: number[] = Array.isArray(v?.rarities) ? v.rarities : [5]
  rawArts[k] = rarities.join('')
}

const charCompactStr = Object.entries(rawChars)
  .map(([k, v]) => `${k}:${v}`)
  .join(',')
const weaponCompactStr = Object.entries(rawWeapons)
  .map(([k, v]) => `${k}:${v}`)
  .join(',')
const artCompactStr = Object.entries(rawArts)
  .map(([k, v]) => `${k}:${v}`)
  .join(',')

const output = `/**
 * Auto-generated compact character, weapon, and artifact-set metadata and key
 * constants extracted from @genshin-optimizer/gi/stats and @genshin-optimizer/gi/consts.
 */
export interface CompactCharStat {
  ele: string
  rarity: 4 | 5
  weaponType: string
}

export interface CompactWeaponStat {
  weaponType: string
  rarity: 1 | 2 | 3 | 4 | 5
}

export interface CompactArtSetStat {
  rarities: readonly number[]
}

const ELE = ['anemo', 'geo', 'electro', 'hydro', 'pyro', 'cryo', 'dendro'] as const
const WT = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'] as const

const RAW_CHARS = ${JSON.stringify(charCompactStr)}
const RAW_WEAPONS = ${JSON.stringify(weaponCompactStr)}
const RAW_ARTS = ${JSON.stringify(artCompactStr)}

export const CHAR_STAT_META: Readonly<Record<string, CompactCharStat>> = Object.fromEntries(
  RAW_CHARS.split(',').map((pair) => {
    const [k, c] = pair.split(':') as [string, string]
    return [
      k,
      {
        ele: ELE[Number(c[0])] ?? 'anemo',
        rarity: c[1] === '4' ? 4 : 5,
        weaponType: WT[Number(c[2])] ?? 'sword',
      },
    ]
  })
)

export const WEAPON_STAT_META: Readonly<Record<string, CompactWeaponStat>> = Object.fromEntries(
  RAW_WEAPONS.split(',').map((pair) => {
    const [k, w] = pair.split(':') as [string, string]
    return [
      k,
      {
        weaponType: WT[Number(w[0])] ?? 'sword',
        rarity: Number(w[1]) as 1 | 2 | 3 | 4 | 5,
      },
    ]
  })
)

export const ART_SET_STAT_META: Readonly<Record<string, CompactArtSetStat>> = Object.fromEntries(
  RAW_ARTS.split(',').map((pair) => {
    const [k, r] = pair.split(':') as [string, string]
    return [
      k,
      {
        rarities: Array.from(r, Number),
      },
    ]
  })
)

export const ALL_TRAVELER_KEYS = [
  'TravelerAnemo',
  'TravelerGeo',
  'TravelerElectro',
  'TravelerDendro',
  'TravelerHydro',
  'TravelerPyro',
  'TravelerCryo',
] as const

const NON_TRAVELER_KEYS = Object.keys(CHAR_STAT_META).filter((k) => k !== 'Traveler')

export const ALL_CHARACTER_KEYS: readonly string[] = [
  ...NON_TRAVELER_KEYS,
  ...ALL_TRAVELER_KEYS,
]

export const ALL_LOCATION_CHARACTER_KEYS: readonly string[] = [
  ...NON_TRAVELER_KEYS,
  'Traveler',
]

export const ALL_WEAPON_KEYS: readonly string[] = Object.keys(WEAPON_STAT_META)

export const ALL_ARTIFACT_SET_KEYS: readonly string[] = Object.keys(ART_SET_STAT_META)

export const ALL_ARTIFACT_SLOT_KEYS = [
  'flower',
  'plume',
  'sands',
  'goblet',
  'circlet',
] as const

export const ALL_MAIN_STAT_KEYS = [
  'hp',
  'hp_',
  'atk',
  'atk_',
  'def_',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
  'physical_dmg_',
  'anemo_dmg_',
  'geo_dmg_',
  'electro_dmg_',
  'hydro_dmg_',
  'pyro_dmg_',
  'cryo_dmg_',
  'dendro_dmg_',
  'heal_',
] as const

export const ALL_SUBSTAT_KEYS = [
  'hp',
  'hp_',
  'atk',
  'atk_',
  'def',
  'def_',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
] as const

export const ART_MAX_LEVEL: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 4,
  2: 4,
  3: 12,
  4: 16,
  5: 20,
}

export const ART_SLOT_MAIN_KEYS = {
  flower: ['hp'] as readonly string[],
  plume: ['atk'] as readonly string[],
  sands: ['hp_', 'def_', 'atk_', 'eleMas', 'enerRech_'] as readonly string[],
  goblet: [
    'hp_',
    'def_',
    'atk_',
    'eleMas',
    'physical_dmg_',
    'anemo_dmg_',
    'geo_dmg_',
    'electro_dmg_',
    'hydro_dmg_',
    'pyro_dmg_',
    'cryo_dmg_',
    'dendro_dmg_',
  ] as readonly string[],
  circlet: [
    'hp_',
    'def_',
    'atk_',
    'eleMas',
    'critRate_',
    'critDMG_',
    'heal_',
  ] as readonly string[],
} as const

export function charKeyToLocCharKey(charKey: string): string {
  if ((ALL_TRAVELER_KEYS as readonly string[]).includes(charKey)) {
    return 'Traveler'
  }
  return charKey
}

const TRAVELER_ELE_PREFIX: ReadonlyArray< readonly [string, string] > = [
  ['TravelerAnemo', 'anemo'],
  ['TravelerGeo', 'geo'],
  ['TravelerElectro', 'electro'],
  ['TravelerDendro', 'dendro'],
  ['TravelerHydro', 'hydro'],
  ['TravelerPyro', 'pyro'],
  ['TravelerCryo', 'cryo'],
]

export function getCharStatMeta(charKey: string): CompactCharStat | undefined {
  if (!charKey) return undefined
  if (charKey === 'Traveler') {
    return {
      ...(CHAR_STAT_META['Traveler'] ?? { ele: 'anemo', rarity: 5, weaponType: 'sword' }),
      ele: 'anemo',
    }
  }
  for (const [prefix, ele] of TRAVELER_ELE_PREFIX) {
    if (charKey.startsWith(prefix)) {
      return {
        ...(CHAR_STAT_META['Traveler'] ?? { ele, rarity: 5, weaponType: 'sword' }),
        ele,
      }
    }
  }
  return CHAR_STAT_META[charKey]
}

export function getWeaponStatMeta(
  weaponKey: string
): CompactWeaponStat | undefined {
  return WEAPON_STAT_META[weaponKey]
}

export function getArtSetStatMeta(
  setKey: string
): CompactArtSetStat | undefined {
  return ART_SET_STAT_META[setKey]
}
`

const presetsDuplicate = resolve(here, '../src/statMeta.gen.ts')
if (existsSync(presetsDuplicate)) {
  unlinkSync(presetsDuplicate)
}

const goodTarget = resolve(here, '../../good/src/statMeta.gen.ts')
writeFileSync(goodTarget, output, 'utf8')
console.log(
  `Generated statMeta.gen.ts (${Buffer.byteLength(output)} bytes) in @gi/good`
)
