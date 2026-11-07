import { SandboxStorage } from '@genshin-optimizer/common/database'
import type {
  ArtifactSetKey,
  CharacterKey,
  WeaponKey,
} from '@genshin-optimizer/gi/consts'
import { allArtifactSetKeys, allWeaponKeys } from '@genshin-optimizer/gi/consts'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import {
  getArtSheet,
  getCharSheet,
  getWeaponSheet,
  reactionConditionals,
  resonanceSheets,
  type DocumentSection,
} from '@genshin-optimizer/gi/sheets'
import { getCharStat, getWeaponStat } from '@genshin-optimizer/gi/stats'
import { uiDataForTeam, type UIData } from '@genshin-optimizer/gi/uidata'
import { input } from '@genshin-optimizer/gi/wr'
import { displayName, type Preset } from '@gi/presets'
import { getTeamData } from './teamData'
import type {
  ConditionalDescriptor,
  ConditionalSourceCategory,
  ConditionalStateDescriptor,
  TargetDescriptor,
} from './types'

export interface PresetConditionalIssue {
  path: string
  message: string
}

const DISPLAY_SECTIONS = [
  'normal',
  'charged',
  'plunging',
  'skill',
  'burst',
  'passive1',
  'passive2',
  'passive3',
  'constellation1',
  'constellation2',
  'constellation3',
  'constellation4',
  'constellation5',
  'constellation6',
] as const

const SECTION_LABELS: Record<string, string> = {
  normal: 'Normal Attack',
  charged: 'Charged Attack',
  plunging: 'Plunging Attack',
  skill: 'Elemental Skill',
  burst: 'Elemental Burst',
  passive1: 'Ascension 1 Passive',
  passive2: 'Ascension 4 Passive',
  passive3: 'Utility Passive',
  constellation1: 'Constellation 1',
  constellation2: 'Constellation 2',
  constellation3: 'Constellation 3',
  constellation4: 'Constellation 4',
  constellation5: 'Constellation 5',
  constellation6: 'Constellation 6',
}

function humanizeTargetKey(section: string, key: string): string {
  const secLabel = SECTION_LABELS[section] ?? section
  if (/^\d+$/.test(key)) {
    return `${secLabel} — ${Number(key) + 1}-Hit DMG`
  }
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
  return `${secLabel} — ${spaced}`
}

function extractReactNodeText(node: unknown, fallback: string): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (node && typeof node === 'object') {
    const props = (node as { props?: Record<string, unknown> }).props
    if (props) {
      if (typeof props.key18 === 'string') {
        const k = props.key18
        const vals = props.values as Record<string, unknown> | undefined
        if (vals && Object.keys(vals).length > 0) {
          return `${k} (${Object.entries(vals)
            .map(([vk, vv]) => `${vk}: ${vv}`)
            .join(', ')})`
        }
        return k
      }
      if (props.children !== undefined) {
        if (Array.isArray(props.children)) {
          return props.children
            .map((c) => extractReactNodeText(c, ''))
            .filter(Boolean)
            .join(' ')
        }
        return extractReactNodeText(props.children, fallback)
      }
    }
  }
  return fallback
}

// Module-level caches for catalog queries
const targetCache = new Map<string, TargetDescriptor[]>()
const conditionalCache = new Map<string, ConditionalDescriptor[]>()
const uiDataCache = new Map<string, UIData>()
let sharedScratchDb: ArtCharDatabase | null = null

function getScratchUiData(characterKey: string): UIData | undefined {
  const cKey = (
    characterKey === 'Traveler' ? 'TravelerAnemo' : characterKey
  ) as CharacterKey
  const cached = uiDataCache.get(cKey)
  if (cached) return cached

  if (!sharedScratchDb) {
    sharedScratchDb = new ArtCharDatabase(1, new SandboxStorage())
  }
  const db = sharedScratchDb
  db.teams.clear()
  db.teamChars.clear()

  if (!db.chars.get(cKey)) {
    db.chars.set(cKey, {
      key: cKey,
      level: 90,
      ascension: 6,
      constellation: 6,
      talent: { auto: 10, skill: 10, burst: 10 },
    })
  }
  const tcId = db.teamChars.new(cKey, {})
  const teamId = db.teams.new({
    loadoutData: [
      {
        teamCharId: tcId,
        buildType: 'equipped',
        buildId: '',
        buildTcId: '',
        compare: false,
        compareType: 'equipped',
        compareBuildId: '',
        compareBuildTcId: '',
      },
      undefined as never,
      undefined as never,
      undefined as never,
    ],
  })
  const bundle = getTeamData(db, teamId, tcId, 0, [])
  if (!bundle) return undefined
  const calc = uiDataForTeam(bundle.teamData, 'F', cKey)
  const targetUi = calc[cKey]?.target
  if (targetUi) {
    uiDataCache.set(cKey, targetUi)
  }
  return targetUi
}

export function listTargetsForCharacter(
  characterKey: string,
  _baseDb?: ArtCharDatabase
): TargetDescriptor[] {
  const cKey = characterKey === 'Traveler' ? 'TravelerAnemo' : characterKey
  const hit = targetCache.get(cKey)
  if (hit) return hit

  const uiData = getScratchUiData(cKey)
  if (!uiData) return []
  const display = uiData.getDisplay()
  const out: TargetDescriptor[] = []

  for (const section of DISPLAY_SECTIONS) {
    const secObj = display[section] as
      | Record<string, { value?: number }>
      | undefined
    if (!secObj) continue
    for (const [key, calcRes] of Object.entries(secObj)) {
      if (!calcRes || typeof calcRes.value !== 'number') continue
      out.push({
        path: [section, key],
        name: humanizeTargetKey(section, key),
        section,
      })
    }
  }
  targetCache.set(cKey, out)
  return out
}

interface CollectConditionalsOptions {
  defaultCategory?: ConditionalSourceCategory
  section?: string
}

function resolveSectionCategory(
  sec: DocumentSection,
  key: string,
  opts?: CollectConditionalsOptions
): { category?: ConditionalSourceCategory; section?: string } {
  const defaultCategory = opts?.defaultCategory
  const baseSection = opts?.section
  if (defaultCategory !== 'character' && defaultCategory !== 'constellation') {
    return { category: defaultCategory, section: baseSection }
  }

  const headerAction = extractReactNodeText(
    (sec as { header?: { action?: unknown } }).header?.action,
    ''
  )
  const secName = extractReactNodeText(sec.name, '')
  const constMatch =
    headerAction.match(/constellation[1-6]/i)?.[0]?.toLowerCase() ??
    (baseSection?.startsWith('constellation') ? baseSection : undefined)

  if (
    constMatch ||
    headerAction.toLowerCase().includes('constellation') ||
    secName.toLowerCase().includes('constellation') ||
    /^c[1-6](?:[A-Z0-9_p]|$)/.test(key)
  ) {
    const inferredConst =
      constMatch ??
      (/^c([1-6])/.test(key)
        ? `constellation${key.match(/^c([1-6])/)?.[1]}`
        : baseSection)
    return {
      category: 'constellation',
      section: inferredConst ?? 'constellation',
    }
  }

  return {
    category: 'character',
    section: baseSection,
  }
}

function collectConditionalsFromSections(
  sections: DocumentSection[] | undefined,
  uiData: UIData,
  seen: Set<string>,
  out: ConditionalDescriptor[],
  opts?: CollectConditionalsOptions
) {
  if (!sections) return
  for (const sec of sections) {
    if (!sec || !('states' in sec) || !sec.states) continue
    const isTeamBuff = Boolean(sec.teamBuff)
    const rawStates =
      typeof sec.states === 'function' ? sec.states(uiData) : sec.states
    if (!rawStates) continue

    if ('path' in sec && Array.isArray(sec.path) && sec.path.length >= 2) {
      const sheet = String(sec.path[0])
      const key = String(sec.path[1])
      const id = `${sheet}:${key}`
      if (seen.has(id)) continue
      seen.add(id)

      const { category, section } = resolveSectionCategory(sec, key, opts)
      const states: ConditionalStateDescriptor[] = Object.entries(
        rawStates
      ).map(([stKey, stVal]) => ({
        key: stKey,
        name: extractReactNodeText(
          (stVal as { name?: unknown })?.name,
          stKey === 'on' ? 'Active (On)' : stKey
        ),
      }))
      out.push({
        sheet,
        key,
        name: `${displayName(sheet)} — ${extractReactNodeText(sec.name, key)}`,
        states,
        canShow: true,
        isTeamBuff,
        ...(category ? { category } : {}),
        ...(section ? { section } : {}),
      })
    } else {
      // MultipleConditionalStates (e.g. Kazuha swirl elements, ScrollOfTheHeroOfCinderCity reactions)
      for (const [stKey, stVal] of Object.entries(rawStates)) {
        const multi = stVal as {
          path?: readonly string[]
          name?: unknown
        }
        if (!multi?.path || multi.path.length < 2) continue
        const sheet = String(multi.path[0])
        const key = String(multi.path[1])
        const id = `${sheet}:${key}`
        if (seen.has(id)) continue
        seen.add(id)
        const { category, section } = resolveSectionCategory(sec, key, opts)
        const stateValue = key.startsWith('swirl')
          ? key.slice('swirl'.length)
          : stKey || 'on'
        out.push({
          sheet,
          key,
          name: `${displayName(sheet)} — ${extractReactNodeText(multi.name, key)}`,
          states: [
            {
              key: stateValue,
              name: extractReactNodeText(multi.name, stateValue),
            },
          ],
          canShow: true,
          isTeamBuff,
          ...(category ? { category } : {}),
          ...(section ? { section } : {}),
        })
      }
    }
  }
}

interface GlobalConditionalBuckets {
  artifactConditionals: ConditionalDescriptor[]
  weaponByType: Map<string, ConditionalDescriptor[]>
  allWeapons: ConditionalDescriptor[]
  resonanceAndReaction: ConditionalDescriptor[]
}

let globalBuckets: GlobalConditionalBuckets | null = null

function createArtifactCatalogUiData(baseUiData: UIData): UIData {
  return new Proxy(baseUiData, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return (node: unknown) => {
          if (node === input.charEle) {
            return { value: '' }
          }
          const res = target.get(node as never)
          if (res && res.value !== undefined) return res
          const nodeObj = node as { path?: readonly string[] } | undefined
          if (
            nodeObj?.path &&
            nodeObj.path[0] === 'conditional' &&
            nodeObj.path[1] === 'ScrollOfTheHeroOfCinderCity'
          ) {
            return { ...res, value: 'on' }
          }
          return res
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

function getGlobalConditionalBuckets(uiData: UIData): GlobalConditionalBuckets {
  if (globalBuckets) return globalBuckets

  const artifactConditionals: ConditionalDescriptor[] = []
  const artSeen = new Set<string>()
  const artUiData = createArtifactCatalogUiData(uiData)
  for (const setKey of allArtifactSetKeys as readonly ArtifactSetKey[]) {
    const artSheet = getArtSheet(setKey)
    if (!artSheet?.setEffects) continue
    for (const [setNum, entry] of Object.entries(
      artSheet.setEffects
    ) as Array<[string, { document?: DocumentSection[] }]>) {
      if (entry?.document) {
        collectConditionalsFromSections(
          entry.document,
          artUiData,
          artSeen,
          artifactConditionals,
          { defaultCategory: 'artifact', section: `set${setNum}` }
        )
      }
    }
  }

  const weaponByType = new Map<string, ConditionalDescriptor[]>()
  const allWeapons: ConditionalDescriptor[] = []
  const wepSeen = new Set<string>()
  for (const wKey of allWeaponKeys as readonly WeaponKey[]) {
    const wSheet = getWeaponSheet(wKey)
    if (!wSheet?.document) continue
    const wTemp: ConditionalDescriptor[] = []
    collectConditionalsFromSections(wSheet.document, uiData, wepSeen, wTemp, {
      defaultCategory: 'weapon',
      section: 'weapon',
    })
    if (wTemp.length === 0) continue
    allWeapons.push(...wTemp)
    const wType = (getWeaponStat(wKey) as { weaponType?: string } | undefined)
      ?.weaponType
    if (wType) {
      const list = weaponByType.get(wType) ?? []
      list.push(...wTemp)
      weaponByType.set(wType, list)
    }
  }

  const resonanceAndReaction: ConditionalDescriptor[] = []
  const resSeen = new Set<string>()
  for (const res of resonanceSheets) {
    collectConditionalsFromSections(
      res.sections,
      uiData,
      resSeen,
      resonanceAndReaction,
      { defaultCategory: 'character', section: 'resonance' }
    )
  }
  collectConditionalsFromSections(
    reactionConditionals,
    uiData,
    resSeen,
    resonanceAndReaction,
    { defaultCategory: 'character', section: 'reaction' }
  )

  globalBuckets = {
    artifactConditionals,
    weaponByType,
    allWeapons,
    resonanceAndReaction,
  }
  return globalBuckets
}

let defaultTargetArtSetCondsCache: Record<
  string,
  Record<string, string>
> | null = null
const singleWeaponCondCache = new Map<string, ConditionalDescriptor[]>()

function collectStaticOrLazyConditionals(
  sections: DocumentSection[] | undefined,
  seen: Set<string>,
  out: ConditionalDescriptor[],
  opts?: CollectConditionalsOptions
) {
  if (!sections) return
  for (const sec of sections) {
    if (!sec || !('states' in sec) || !sec.states) continue
    const isTeamBuff = Boolean(sec.teamBuff)
    let rawStates: Record<string, unknown> | undefined
    if (typeof sec.states === 'function') {
      const uiData = getScratchUiData('Furina' as CharacterKey)
      if (!uiData) continue
      rawStates = sec.states(uiData) as Record<string, unknown> | undefined
    } else {
      rawStates = sec.states as Record<string, unknown>
    }
    if (!rawStates) continue

    if ('path' in sec && Array.isArray(sec.path) && sec.path.length >= 2) {
      const sheet = String(sec.path[0])
      const key = String(sec.path[1])
      const id = `${sheet}:${key}`
      if (seen.has(id)) continue
      seen.add(id)

      const { category, section } = resolveSectionCategory(sec, key, opts)
      const states: ConditionalStateDescriptor[] = Object.entries(
        rawStates
      ).map(([stKey, stVal]) => ({
        key: stKey,
        name: extractReactNodeText(
          (stVal as { name?: unknown })?.name,
          stKey === 'on' ? 'Active (On)' : stKey
        ),
      }))
      out.push({
        sheet,
        key,
        name: `${displayName(sheet)} — ${extractReactNodeText(sec.name, key)}`,
        states,
        canShow: true,
        isTeamBuff,
        ...(category ? { category } : {}),
        ...(section ? { section } : {}),
      })
    }
  }
}

/**
 * Returns a map of `{ [setKey]: { [condKey]: 'on' } }` for all artifact sets
 * that have boolean on/off conditionals (`states.length === 1 && states[0].key === 'on'`),
 * excluding multi-path reaction selectors (`ScrollOfTheHeroOfCinderCity.react_*`).
 * Stack/ranged/numeric/element conditionals are omitted.
 */
export function getDefaultTargetArtifactSetConditionals(): Record<
  string,
  Record<string, string>
> {
  if (defaultTargetArtSetCondsCache) return defaultTargetArtSetCondsCache
  const artifactConditionals: ConditionalDescriptor[] = []
  const artSeen = new Set<string>()
  for (const setKey of allArtifactSetKeys as readonly ArtifactSetKey[]) {
    const artSheet = getArtSheet(setKey)
    if (!artSheet?.setEffects) continue
    for (const [setNum, entry] of Object.entries(
      artSheet.setEffects
    ) as Array<[string, { document?: DocumentSection[] }]>) {
      if (entry?.document) {
        collectStaticOrLazyConditionals(
          entry.document,
          artSeen,
          artifactConditionals,
          { defaultCategory: 'artifact', section: `set${setNum}` }
        )
      }
    }
  }

  const out: Record<string, Record<string, string>> = {}
  for (const cond of artifactConditionals) {
    if (
      cond.sheet === 'ScrollOfTheHeroOfCinderCity' &&
      (cond.key.startsWith('react_') || cond.key.startsWith('nightsoul_'))
    ) {
      continue
    }
    if (cond.states.length === 1 && cond.states[0]?.key === 'on') {
      if (!out[cond.sheet]) {
        out[cond.sheet] = {}
      }
      out[cond.sheet]![cond.key] = 'on'
    }
  }
  defaultTargetArtSetCondsCache = out
  return out
}

export function validatePresetConditionalsAgainstGO(
  preset: Preset
): PresetConditionalIssue[] {
  const issues: PresetConditionalIssue[] = []
  const uiData = getScratchUiData('Furina' as CharacterKey)
  if (!uiData) return issues
  const buckets = getGlobalConditionalBuckets(uiData)

  for (let i = 0; i < preset.team.length; i++) {
    const member = preset.team[i]!
    const charConds = listConditionalsForCharacter(member.key)
    const bySheet = new Map<string, Map<string, ConditionalDescriptor>>()
    for (const c of [...charConds, ...buckets.allWeapons]) {
      let sheetMap = bySheet.get(c.sheet)
      if (!sheetMap) {
        sheetMap = new Map()
        bySheet.set(c.sheet, sheetMap)
      }
      sheetMap.set(c.key, c)
    }

    for (const [sheetKey, authoredConds] of Object.entries(
      member.conditional ?? {}
    )) {
      const sheetMap = bySheet.get(sheetKey)
      if (!sheetMap) {
        issues.push({
          path: `team.${i}.conditional.${sheetKey}`,
          message: `Unknown GO conditional sheet '${sheetKey}' on member '${member.key}'.`,
        })
        continue
      }
      for (const [condKey, condVal] of Object.entries(authoredConds ?? {})) {
        const desc = sheetMap.get(condKey)
        if (!desc) {
          const validKeys = [...sheetMap.keys()].join(', ')
          issues.push({
            path: `team.${i}.conditional.${sheetKey}.${condKey}`,
            message: `Unknown GO conditional key '${condKey}' in sheet '${sheetKey}' on member '${member.key}' (valid keys: ${validKeys}).`,
          })
          continue
        }
        const validVals = desc.states.map((s) => s.key)
        if (!validVals.includes(condVal)) {
          issues.push({
            path: `team.${i}.conditional.${sheetKey}.${condKey}`,
            message: `Invalid GO conditional state value '${condVal}' for '${sheetKey}.${condKey}' on member '${member.key}' (valid values: ${validVals.join(', ')}).`,
          })
        }
      }
    }
  }

  const resonanceMap = new Map<string, ConditionalDescriptor>()
  const reactionMap = new Map<string, ConditionalDescriptor>()
  for (const c of buckets.resonanceAndReaction) {
    if (c.sheet === 'resonance') {
      resonanceMap.set(c.key, c)
    } else if (c.sheet === 'reaction') {
      reactionMap.set(c.key, c)
    }
  }

  for (const [resKey, resVal] of Object.entries(
    preset.teamConditional?.resonance ?? {}
  )) {
    const desc = resonanceMap.get(resKey)
    if (!desc) {
      const validKeys = [...resonanceMap.keys()].join(', ')
      issues.push({
        path: `teamConditional.resonance.${resKey}`,
        message: `Unknown GO resonance conditional key '${resKey}' (valid keys: ${validKeys}).`,
      })
      continue
    }
    const validVals = desc.states.map((s) => s.key)
    if (!validVals.includes(resVal)) {
      issues.push({
        path: `teamConditional.resonance.${resKey}`,
        message: `Invalid GO resonance conditional state value '${resVal}' for 'resonance.${resKey}' (valid values: ${validVals.join(', ')}).`,
      })
    }
  }

  for (const [reactKey, reactVal] of Object.entries(
    preset.teamConditional?.reaction ?? {}
  )) {
    const desc = reactionMap.get(reactKey)
    if (!desc) {
      const validKeys = [...reactionMap.keys()].join(', ')
      issues.push({
        path: `teamConditional.reaction.${reactKey}`,
        message: `Unknown GO reaction conditional key '${reactKey}' (valid keys: ${validKeys}).`,
      })
      continue
    }
    const validVals = desc.states.map((s) => s.key)
    if (!validVals.includes(reactVal)) {
      issues.push({
        path: `teamConditional.reaction.${reactKey}`,
        message: `Invalid GO reaction conditional state value '${reactVal}' for 'reaction.${reactKey}' (valid values: ${validVals.join(', ')}).`,
      })
    }
  }

  return issues
}

export function listWeaponConditionals(
  weaponKey: string
): ConditionalDescriptor[] {
  const hit = singleWeaponCondCache.get(weaponKey)
  if (hit) return hit
  const wSheet = getWeaponSheet(weaponKey as WeaponKey)
  if (!wSheet?.document) {
    singleWeaponCondCache.set(weaponKey, [])
    return []
  }
  const out: ConditionalDescriptor[] = []
  const seen = new Set<string>()
  collectStaticOrLazyConditionals(wSheet.document, seen, out, {
    defaultCategory: 'weapon',
    section: 'weapon',
  })
  const filtered = out.filter(
    (c) => c.sheet === weaponKey && c.states.length > 0
  )
  singleWeaponCondCache.set(weaponKey, filtered)
  return filtered
}

export function listConditionalsForCharacter(
  characterKey: string,
  _baseDb?: ArtCharDatabase
): ConditionalDescriptor[] {
  const cKey = (
    characterKey === 'Traveler' ? 'TravelerAnemo' : characterKey
  ) as CharacterKey
  const hit = conditionalCache.get(cKey)
  if (hit) return hit

  const uiData = getScratchUiData(cKey)
  if (!uiData) return []
  const seen = new Set<string>()
  const out: ConditionalDescriptor[] = []

  // 1. Character sheet conditionals
  const charSheet = getCharSheet(cKey, 'F')
  if (charSheet?.sheet) {
    for (const [sectionKey, talentEl] of Object.entries(
      charSheet.sheet
    ) as Array<[string, { sections?: DocumentSection[] }]>) {
      if (talentEl?.sections) {
        collectConditionalsFromSections(
          talentEl.sections,
          uiData,
          seen,
          out,
          {
            defaultCategory: sectionKey.startsWith('constellation')
              ? 'constellation'
              : 'character',
            section: sectionKey,
          }
        )
      }
    }
  }

  // 2. Precomputed Artifact Set + Matching Weapon Type + Resonance/Reaction conditionals
  const buckets = getGlobalConditionalBuckets(uiData)
  const charWeaponType = (
    getCharStat(cKey) as { weaponType?: string } | undefined
  )?.weaponType
  const matchingWeapons = charWeaponType
    ? (buckets.weaponByType.get(charWeaponType) ?? [])
    : buckets.allWeapons

  for (const list of [
    buckets.artifactConditionals,
    matchingWeapons,
    buckets.resonanceAndReaction,
  ]) {
    for (const cond of list) {
      const id = `${cond.sheet}:${cond.key}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push(cond)
    }
  }

  conditionalCache.set(cKey, out)
  return out
}
