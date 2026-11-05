import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const allStatPath = resolve(GO_ROOT, 'libs/gi/stats/src/allStat_gen.json')
const allStat = JSON.parse(readFileSync(allStatPath, 'utf8'))

const charMeta: Record<
  string,
  { ele: string; rarity: 4 | 5; weaponType: string }
> = {}

for (const [k, v] of Object.entries<any>(allStat.char?.data ?? {})) {
  charMeta[k] = {
    ele: v.ele ?? 'anemo',
    rarity: v.rarity === 4 ? 4 : 5,
    weaponType: v.weaponType ?? 'sword',
  }
}

const weaponMeta: Record<
  string,
  { weaponType: string; rarity: 1 | 2 | 3 | 4 | 5 }
> = {}

for (const [k, v] of Object.entries<any>(allStat.weapon?.data ?? {})) {
  const r = Math.max(1, Math.min(5, Math.round(v.rarity ?? 4))) as
    | 1
    | 2
    | 3
    | 4
    | 5
  weaponMeta[k] = {
    weaponType: v.weaponType ?? 'sword',
    rarity: r,
  }
}

const artSetMeta: Record<string, { rarities: number[] }> = {}
for (const [k, v] of Object.entries<any>(allStat.art?.data ?? {})) {
  artSetMeta[k] = {
    rarities: Array.isArray(v.rarities) ? v.rarities : [5],
  }
}

const output = `/**
 * Auto-generated compact character, weapon, and artifact-set metadata extracted
 * from @genshin-optimizer/gi/stats (allStat_gen.json) so @gi/presets and @gi/good
 * never bundle the 2.4 MB skillParam tables into page chunks.
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

export const CHAR_STAT_META: Readonly<Record<string, CompactCharStat>> = ${JSON.stringify(charMeta, null, 2)}

export const WEAPON_STAT_META: Readonly<Record<string, CompactWeaponStat>> = ${JSON.stringify(weaponMeta, null, 2)}

export const ART_SET_STAT_META: Readonly<Record<string, CompactArtSetStat>> = ${JSON.stringify(artSetMeta, null, 2)}

export function getCharStatMeta(charKey: string): CompactCharStat | undefined {
  if (!charKey) return undefined
  if (charKey === 'Traveler' || charKey.startsWith('TravelerAnemo')) {
    return {
      ...(CHAR_STAT_META['TravelerAnemo'] ?? {
        ele: 'anemo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'anemo',
    }
  }
  if (charKey.startsWith('TravelerGeo')) {
    return {
      ...(CHAR_STAT_META['TravelerGeo'] ?? {
        ele: 'geo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'geo',
    }
  }
  if (charKey.startsWith('TravelerElectro')) {
    return {
      ...(CHAR_STAT_META['TravelerElectro'] ?? {
        ele: 'electro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'electro',
    }
  }
  if (charKey.startsWith('TravelerDendro')) {
    return {
      ...(CHAR_STAT_META['TravelerDendro'] ?? {
        ele: 'dendro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'dendro',
    }
  }
  if (charKey.startsWith('TravelerHydro')) {
    return {
      ...(CHAR_STAT_META['TravelerHydro'] ?? {
        ele: 'hydro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'hydro',
    }
  }
  if (charKey.startsWith('TravelerPyro')) {
    return {
      ...(CHAR_STAT_META['TravelerPyro'] ?? {
        ele: 'pyro',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'pyro',
    }
  }
  if (charKey.startsWith('TravelerCryo')) {
    return {
      ...(CHAR_STAT_META['TravelerCryo'] ?? {
        ele: 'cryo',
        rarity: 5,
        weaponType: 'sword',
      }),
      ele: 'cryo',
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

const presetsTarget = resolve(here, '../src/statMeta.gen.ts')
const goodTarget = resolve(here, '../../good/src/statMeta.gen.ts')
writeFileSync(presetsTarget, output, 'utf8')
writeFileSync(goodTarget, output, 'utf8')
console.log(
  `Generated statMeta.gen.ts (${Buffer.byteLength(output)} bytes) in @gi/presets and @gi/good`
)
