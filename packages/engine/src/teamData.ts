import { notEmpty, objMap, toDecimal } from '@genshin-optimizer/common/util'
import {
  allElementWithPhyKeys,
  type CharacterKey,
  type GenderKey,
  type MainStatKey,
  type SubstatKey,
} from '@genshin-optimizer/gi/consts'
import type {
  ArtCharDatabase,
  BuildTc,
  ICachedArtifact,
  ICachedCharacter,
  ICachedWeapon,
} from '@genshin-optimizer/gi/db'
import type { CharacterSheet, WeaponSheet } from '@genshin-optimizer/gi/sheets'
import {
  allArtifactData,
  displayDataMap,
  getCharSheet,
  getWeaponSheet,
  reactionData,
  resonanceData,
} from '@genshin-optimizer/gi/sheets'
import { getCharStat } from '@genshin-optimizer/gi/stats'
import { uiDataForTeam, type UIData } from '@genshin-optimizer/gi/uidata'
import { getMainStatValue } from '@genshin-optimizer/gi/util'
import type { CharInfo, Data } from '@genshin-optimizer/gi/wr'
import {
  common,
  constant,
  dataObjForArtifact,
  dataObjForCharacterNew,
  dataObjForWeapon,
  inferInfoMut,
  mergeData,
  percent,
} from '@genshin-optimizer/gi/wr'
import {
  ELEMENT_TO_RESONANCE_KEY,
  normalizeConstellationValue,
  normalizeFastModeStats,
  type FastModeStats,
  type MemberConstellationOverridesMap,
  type PresetFastModeMap,
} from '@gi/presets'

const dbFastModeByChar = new WeakMap<object, PresetFastModeMap>()
const dbConstellationsByChar = new WeakMap<
  object,
  MemberConstellationOverridesMap
>()

export function setDbFastMode(
  db: ArtCharDatabase,
  fastMode: PresetFastModeMap | undefined
): void {
  if (!fastMode || Object.keys(fastMode).length === 0) {
    dbFastModeByChar.delete(db as object)
  } else {
    dbFastModeByChar.set(db as object, fastMode)
  }
}

export function getDbFastMode(
  db: ArtCharDatabase
): PresetFastModeMap | undefined {
  return dbFastModeByChar.get(db as object)
}

export function setDbMemberConstellations(
  db: ArtCharDatabase,
  memberConstellations: MemberConstellationOverridesMap | undefined
): void {
  if (!memberConstellations || Object.keys(memberConstellations).length === 0) {
    dbConstellationsByChar.delete(db as object)
  } else {
    dbConstellationsByChar.set(db as object, memberConstellations)
  }
}

export function getDbMemberConstellations(
  db: ArtCharDatabase
): MemberConstellationOverridesMap | undefined {
  return dbConstellationsByChar.get(db as object)
}

export function getFastModeArtifactData(
  fastMode: FastModeStats | undefined
): Data | undefined {
  const norm = normalizeFastModeStats(fastMode)
  if (!norm) return undefined
  const decimalStats = objMap(norm, (v: number, k: SubstatKey) =>
    toDecimal(v, k)
  )
  return {
    art: objMap(decimalStats, (v: number, k: string) =>
      k.endsWith('_') ? percent(v) : constant(v)
    ),
  }
}

declare module '@genshin-optimizer/common/util' {
  export const objMap: any
  export const objPathValue: any
  export const toDecimal: any
}

declare module '@genshin-optimizer/gi/consts' {
  export type GenderKey = 'F' | 'M'
}

declare module '@genshin-optimizer/gi/db' {
  export type BuildTc = any
}

type ICharacter = ICachedCharacter

declare module '@genshin-optimizer/gi/sheets' {
  export type CharacterSheet = any
  export type WeaponSheet = any
  export const allArtifactData: any
  export const displayDataMap: any
  export const reactionData: any
  export const resonanceData: any
}

declare module '@genshin-optimizer/gi/uidata' {
  export type CalcResult<V = number> = {
    value: V
    meta: {
      op: string
      ops: CalcResult<number>[]
      conds: (readonly string[])[]
    }
    info: {
      path?: string
      prefix?: string
      source?: string
      variant?: string
      subVariant?: string
      unit?: string
      pivot?: boolean
      asConst?: boolean
      isTeamBuff?: boolean
    }
    isEmpty: boolean
  }
}

declare module '@genshin-optimizer/gi/wr' {
  export type CharInfo = any
  export type DataNode<T = any> = any
  export type OptNode = any
  export type StrNode = any
  export const common: any
  export const constant: any
  export const dataObjForArtifact: any
  export const dataObjForCharacterNew: any
  export const dataObjForWeapon: any
  export const inferInfoMut: any
  export const percent: any
}

export type TeamData = Partial<
  Record<
    CharacterKey,
    {
      target: UIData
      buffs: Partial<Record<CharacterKey, UIData>>
      character: ICachedCharacter
      weapon: ICachedWeapon
      characterSheet: CharacterSheet
      weaponSheet: WeaponSheet
      totalArt?: Data
      weaponData?: Data
      charData?: Data
    }
  >
>

export type CharBundle = {
  character: ICachedCharacter
  weapon: ICachedWeapon
  characterSheet: CharacterSheet
  weaponSheet: WeaponSheet
  data: Data[]
}

export type TeamDataBundle = {
  teamData: Partial<Record<CharacterKey, Data[]>>
  teamBundle: Partial<Record<CharacterKey, CharBundle>>
}

export function getBuildTcArtifactData(
  buildTc: BuildTc,
  fastMode?: FastModeStats
): Data {
  const {
    artifact: {
      slots,
      substats: { stats: substats },
      sets,
    },
  } = buildTc
  const normFast = normalizeFastModeStats(fastMode)
  const combinedSubstats: Record<string, number> = normFast
    ? (() => {
        const merged: Record<string, number> = { ...substats }
        for (const [k, v] of Object.entries(normFast)) {
          if (typeof v === 'number' && Number.isFinite(v) && v !== 0) {
            merged[k] = (merged[k] ?? 0) + v
          }
        }
        return merged
      })()
    : substats
  const allStats: Partial<Record<MainStatKey | SubstatKey, number>> = objMap(
    combinedSubstats,
    (v: number, k: SubstatKey) => toDecimal(v, k)
  )
  ;(
    Object.values(slots) as Array<{
      statKey: MainStatKey
      rarity: number
      level: number
    }>
  ).forEach(
    ({ statKey, rarity, level }) =>
      (allStats[statKey] =
        (allStats[statKey] ?? 0) +
        getMainStatValue(statKey, rarity as never, level))
  )
  return {
    art: objMap(allStats, (v: number, k: string) =>
      k.endsWith('_') ? percent(v) : constant(v)
    ),
    artSet: objMap(sets, (v: number) => constant(v)),
  }
}

export function getBuildTcWeaponData(buildTc: BuildTc): ICachedWeapon {
  const {
    weapon: { key, level, ascension, refinement },
  } = buildTc
  return {
    id: '',
    location: '',
    key,
    level,
    ascension,
    refinement,
    lock: false,
  }
}

export function getTeamDataCalc(
  database: ArtCharDatabase,
  teamId: string | '',
  gender: GenderKey,
  overrideTeamCharId = '',
  mainStatAssumptionLevel = 0,
  overrideArt?: ICachedArtifact[] | Data,
  overrideWeapon?: ICachedWeapon,
  overrideChar?: Omit<ICharacter, 'key'>
): TeamData | undefined {
  if (!teamId) return undefined
  const activeChar = database.teams.getActiveTeamChar(teamId)
  if (!activeChar) return undefined

  const { teamData, teamBundle } =
    getTeamData(
      database,
      teamId,
      overrideTeamCharId,
      mainStatAssumptionLevel,
      overrideArt,
      overrideWeapon,
      overrideChar
    ) ?? {}
  if (!teamData || !teamBundle) return undefined

  const calcData = uiDataForTeam(teamData, gender, activeChar.key)

  const data = objMap(calcData, (obj: Record<string, unknown>, ck: CharacterKey) => {
    const { data: _, ...rest } = teamBundle[ck]!
    return { ...obj, ...rest }
  })
  return data
}

function isResonanceExplicitlyOff(
  resCond: Record<string, string> | undefined,
  ele: string
): boolean {
  if (!resCond) return false
  const capEle = ele.charAt(0).toUpperCase() + ele.slice(1)
  const resKey =
    ELEMENT_TO_RESONANCE_KEY[ele as keyof typeof ELEMENT_TO_RESONANCE_KEY]
  const effectOffVal = resKey ? resCond[`__effectOff_${resKey}`] : undefined
  if (effectOffVal !== undefined && effectOffVal !== 'on') return true
  const directResVal =
    resKey && resKey !== 'EnduringRock' ? resCond[resKey] : undefined
  const val = directResVal ?? resCond[capEle] ?? resCond[ele]
  return val !== undefined && val !== 'on'
}

function isResonanceExplicitlyOn(
  resCond: Record<string, string> | undefined,
  ele: string
): boolean {
  if (!resCond) return false
  if (isResonanceExplicitlyOff(resCond, ele)) return false
  const capEle = ele.charAt(0).toUpperCase() + ele.slice(1)
  const resKey =
    ELEMENT_TO_RESONANCE_KEY[ele as keyof typeof ELEMENT_TO_RESONANCE_KEY]
  const val =
    resCond[capEle] ??
    resCond[ele] ??
    (resKey ? resCond[resKey] : undefined)
  return val === 'on'
}

function isMasterResonanceOff(
  resCond: Record<string, string> | undefined
): boolean {
  return Boolean(
    resCond && (resCond.__masterOff === 'off' || resCond.all === 'off')
  )
}

function getEffectiveResonanceData(
  resCond: Record<string, string> | undefined,
  smallTeamEleCounts?: Record<string, number>,
  isActiveTeamChar = false
): Data {
  if (isMasterResonanceOff(resCond)) {
    return {} as Data
  }

  const offProtectiveCanopy = Boolean(
    resCond &&
      ((resCond.__effectOff_ProtectiveCanopy !== undefined &&
        resCond.__effectOff_ProtectiveCanopy !== 'on') ||
        (resCond.ProtectiveCanopy !== undefined &&
          resCond.ProtectiveCanopy !== 'on'))
  )
  const offPyro = isResonanceExplicitlyOff(resCond, 'pyro')
  const offHydro = isResonanceExplicitlyOff(resCond, 'hydro')
  const offCryo = isResonanceExplicitlyOff(resCond, 'cryo')
  const offGeo = isResonanceExplicitlyOff(resCond, 'geo')
  const offDendro = isResonanceExplicitlyOff(resCond, 'dendro')
  const offAnemo = isResonanceExplicitlyOff(resCond, 'anemo')

  const hasSmallTeamBuffs =
    isActiveTeamChar &&
    smallTeamEleCounts &&
    Object.values(smallTeamEleCounts).some((c) => c >= 2)

  if (
    !offProtectiveCanopy &&
    !offPyro &&
    !offHydro &&
    !offCryo &&
    !offGeo &&
    !offDendro &&
    !offAnemo &&
    !hasSmallTeamBuffs
  ) {
    return resonanceData
  }

  const premod: Record<string, unknown> = {
    ...(resonanceData.teamBuff?.premod ?? {}),
  }
  const total: Record<string, unknown> = {
    ...(resonanceData.teamBuff?.total ?? {}),
  }

  if (offProtectiveCanopy) {
    for (const e of allElementWithPhyKeys) {
      delete premod[`${e}_res_`]
    }
  }
  if (offPyro) delete premod.atk_
  if (offHydro) delete premod.hp_
  if (offCryo) delete total.critRate_
  if (offGeo) {
    delete premod.shield_
    delete premod.geo_enemyRes_
    delete premod.all_dmg_
  }
  if (offDendro) delete premod.eleMas
  if (offAnemo) {
    delete premod.staminaDec_
    delete premod.moveSPD_
    delete premod.cdRed_
  }

  const baseFiltered: Data = {
    ...resonanceData,
    teamBuff: {
      ...resonanceData.teamBuff,
      premod,
      total,
    },
  }

  if (!hasSmallTeamBuffs || !smallTeamEleCounts) {
    return baseFiltered
  }

  const extraPremod: Record<string, unknown> = {}
  const extraTotal: Record<string, unknown> = {}
  if (
    (smallTeamEleCounts.pyro ?? 0) >= 2 &&
    isResonanceExplicitlyOn(resCond, 'pyro')
  ) {
    extraPremod.atk_ = percent(0.25)
  }
  if (
    (smallTeamEleCounts.hydro ?? 0) >= 2 &&
    isResonanceExplicitlyOn(resCond, 'hydro')
  ) {
    extraPremod.hp_ = percent(0.25)
  }
  if (
    (smallTeamEleCounts.cryo ?? 0) >= 2 &&
    isResonanceExplicitlyOn(resCond, 'cryo')
  ) {
    extraTotal.critRate_ = percent(0.15)
  }
  if (
    (smallTeamEleCounts.geo ?? 0) >= 2 &&
    isResonanceExplicitlyOn(resCond, 'geo')
  ) {
    extraPremod.shield_ = percent(0.15)
    extraPremod.all_dmg_ = percent(0.15)
    extraPremod.geo_enemyRes_ = percent(-0.2)
  }
  if (
    (smallTeamEleCounts.dendro ?? 0) >= 2 &&
    isResonanceExplicitlyOn(resCond, 'dendro')
  ) {
    extraPremod.eleMas = constant(100)
  }

  if (
    Object.keys(extraPremod).length === 0 &&
    Object.keys(extraTotal).length === 0
  ) {
    return baseFiltered
  }

  return mergeData([
    baseFiltered,
    {
      teamBuff: {
        premod: extraPremod,
        total: extraTotal,
      },
    } as Data,
  ])
}

export function getTeamData(
  database: ArtCharDatabase,
  teamId: string | '',
  activeTeamCharId = '',
  mainStatAssumptionLevel = 0,
  // OverrideArt/overrideWeapon is only applied to the teamchar of activeTeamCharId
  overrideArt?: ICachedArtifact[] | Data,
  overrideWeapon?: ICachedWeapon,
  overrideChar?: Omit<ICharacter, 'key'>
): TeamDataBundle | undefined {
  if (!teamId) return undefined
  const team = database.teams.get(teamId)
  if (!team) return undefined
  const { loadoutData, enemyOverride, conditional: teamConditional } = team
  const activeLoadouts = (loadoutData as Array<any>).filter(Boolean)
  let smallTeamEleCounts: Record<string, number> | undefined
  if (
    activeLoadouts.length < 4 &&
    team.name !== 'Furina — Salon Solitaire C2' &&
    team.name !== 'Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)'
  ) {
    smallTeamEleCounts = {}
    for (const ld of activeLoadouts) {
      const tc = database.teamChars.get(ld.teamCharId)
      if (!tc) continue
      const ele = (getCharStat(tc.key) as { ele?: string } | undefined)?.ele
      if (ele) {
        smallTeamEleCounts[ele] = (smallTeamEleCounts[ele] ?? 0) + 1
      }
    }
  }
  const teamBundleArr = (loadoutData as Array<any>)
    .map((loadoutDatum) => {
      if (!loadoutDatum) return undefined
      const { teamCharId, buildType, buildTcId } = loadoutDatum
      const teamChar = database.teamChars.get(teamCharId)
      if (!teamChar) return undefined
      const {
        key: characterKey,
        infusionAura,
        customMultiTargets,
        conditional,
        bonusStats,
        hitMode,
        reaction,
      } = teamChar
      const dbChar = database.chars.get(characterKey)
      if (!dbChar) return undefined

      const isActiveTeamChar = teamCharId === activeTeamCharId
      const memberFastMode = !isActiveTeamChar
        ? getDbFastMode(database)?.[characterKey]
        : undefined

      let char: Omit<ICharacter, 'key'> = dbChar
      if (overrideChar && isActiveTeamChar) char = overrideChar
      // tcbuild override
      else if (buildType === 'tc' && buildTcId) {
        const tcchar = database.buildTcs.get(buildTcId)!.character
        if (tcchar) char = tcchar
      }

      const { level, ascension, talent } = char
      const overriddenConstellation = normalizeConstellationValue(
        getDbMemberConstellations(database)?.[characterKey]
      )
      const constellation = overriddenConstellation ?? char.constellation

      const weapon = (() => {
        if (overrideWeapon && isActiveTeamChar) return overrideWeapon
        return database.teams.getLoadoutWeapon(loadoutDatum)
      })()
      const arts = (() => {
        if (overrideArt && isActiveTeamChar) return overrideArt
        if (buildType === 'tc' && buildTcId)
          return getBuildTcArtifactData(
            database.buildTcs.get(buildTcId)!,
            memberFastMode
          )
        return Object.values(
          database.teams.getLoadoutArtifacts(loadoutDatum)
        ).filter(notEmpty) as ICachedArtifact[]
      })()
      const mainLevel = (() => {
        if (mainStatAssumptionLevel && isActiveTeamChar)
          return mainStatAssumptionLevel
        return 0
      })()

      return getCharDataBundle(
        database,
        isActiveTeamChar,
        mainLevel,
        {
          key: characterKey,
          level,
          constellation,
          ascension,
          talent,

          infusionAura,
          customMultiTargets,
          conditional: { ...conditional, ...teamConditional },
          bonusStats,

          enemyOverride,
          hitMode,
          reaction,
        },
        weapon,
        arts,
        smallTeamEleCounts,
        memberFastMode
      )
    })
    .filter((bundle) => bundle) as CharBundle[]

  const teamBundle = Object.fromEntries(
    (teamBundleArr.filter((b) => b) as CharBundle[]).map((bundle) => [
      bundle.character.key,
      bundle,
    ])
  )
  const teamData = objMap(teamBundle, ({ data }: CharBundle) => data)
  return { teamData, teamBundle }
}

function getCharDataBundle(
  database: ArtCharDatabase,
  useCustom = false,
  mainStatAssumptionLevel: number,
  charInfo: CharInfo,
  weapon: ICachedWeapon,
  artifacts: ICachedArtifact[] | Data,
  smallTeamEleCounts?: Record<string, number>,
  memberFastMode?: FastModeStats
): CharBundle | undefined {
  const character = database.chars.get(charInfo.key)!
  const characterSheet = getCharSheet(charInfo.key, database.gender)
  if (!characterSheet) return undefined
  const weaponSheet = getWeaponSheet(weapon.key)
  if (!weaponSheet) return undefined

  const weaponSheetsDataOfType =
    displayDataMap[getCharStat(charInfo.key).weaponType]

  const weaponSheetsData = useCustom
    ? (() => {
        // display is included in WeaponSheet.getAllDataOfType
        const { display: _, ...restWeaponSheetData } = weaponSheet.data
        return mergeData([restWeaponSheetData, weaponSheetsDataOfType])
      })()
    : weaponSheet.data

  const sheetData = mergeData([
    characterSheet.data,
    weaponSheetsData,
    allArtifactData,
  ])
  const fastModeArtData =
    !useCustom && Array.isArray(artifacts)
      ? getFastModeArtifactData(memberFastMode)
      : undefined
  const artifactData = Array.isArray(artifacts)
    ? [
        ...artifacts.map((a) => dataObjForArtifact(a, mainStatAssumptionLevel)),
        ...(fastModeArtData ? [fastModeArtData] : []),
      ]
    : [artifacts]
  const effectiveResonanceData = inferInfoMut(
    getEffectiveResonanceData(
      charInfo.conditional?.resonance as Record<string, string> | undefined,
      smallTeamEleCounts,
      useCustom
    ),
    'Resonance' as never
  )
  const data = [
    ...artifactData,
    dataObjForCharacterNew(charInfo, useCustom ? sheetData : undefined),
    dataObjForWeapon(weapon),
    sheetData,
    common, // NEED TO PUT THIS AT THE END
    effectiveResonanceData,
    reactionData,
  ]
  return { character, weapon, characterSheet, weaponSheet, data }
}
