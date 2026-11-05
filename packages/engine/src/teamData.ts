import { notEmpty, objMap, toDecimal } from '@genshin-optimizer/common/util'
import type {
  CharacterKey,
  GenderKey,
  MainStatKey,
  SubstatKey,
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
  mergeData,
  percent,
} from '@genshin-optimizer/gi/wr'

declare module '@genshin-optimizer/common/util' {
  export const objMap: any
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

declare module '@genshin-optimizer/gi/wr' {
  export type CharInfo = any
  export type OptNode = any
  export const common: any
  export const constant: any
  export const dataObjForArtifact: any
  export const dataObjForCharacterNew: any
  export const dataObjForWeapon: any
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

export function getBuildTcArtifactData(buildTc: BuildTc): Data {
  const {
    artifact: {
      slots,
      substats: { stats: substats },
      sets,
    },
  } = buildTc
  const allStats: Partial<Record<MainStatKey | SubstatKey, number>> = objMap(
    substats,
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

      let char: Omit<ICharacter, 'key'> = dbChar
      if (overrideChar && isActiveTeamChar) char = overrideChar
      // tcbuild override
      else if (buildType === 'tc' && buildTcId) {
        const tcchar = database.buildTcs.get(buildTcId)!.character
        if (tcchar) char = tcchar
      }

      const { level, constellation, ascension, talent } = char

      const weapon = (() => {
        if (overrideWeapon && isActiveTeamChar) return overrideWeapon
        return database.teams.getLoadoutWeapon(loadoutDatum)
      })()
      const arts = (() => {
        if (overrideArt && isActiveTeamChar) return overrideArt
        if (buildType === 'tc' && buildTcId)
          return getBuildTcArtifactData(database.buildTcs.get(buildTcId)!)
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
        arts
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
  artifacts: ICachedArtifact[] | Data
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
  const artifactData = Array.isArray(artifacts)
    ? artifacts.map((a) => dataObjForArtifact(a, mainStatAssumptionLevel))
    : [artifacts]
  const data = [
    ...artifactData,
    dataObjForCharacterNew(charInfo, useCustom ? sheetData : undefined),
    dataObjForWeapon(weapon),
    sheetData,
    common, // NEED TO PUT THIS AT THE END
    resonanceData,
    reactionData,
  ]
  return { character, weapon, characterSheet, weaponSheet, data }
}
