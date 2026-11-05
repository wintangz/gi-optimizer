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
import { displayName } from '@gi/presets'
import { getTeamData } from './teamData'
import type {
  ConditionalDescriptor,
  ConditionalStateDescriptor,
  TargetDescriptor,
} from './types'

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

function collectConditionalsFromSections(
  sections: DocumentSection[] | undefined,
  uiData: UIData,
  seen: Set<string>,
  out: ConditionalDescriptor[]
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
      })
    } else {
      // MultipleConditionalStates (e.g. Kazuha swirl elements)
      for (const [, stVal] of Object.entries(rawStates)) {
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
        const stateValue = key.startsWith('swirl')
          ? key.slice('swirl'.length)
          : 'on'
        out.push({
          sheet,
          key,
          name: `${displayName(sheet)} — ${extractReactNodeText(multi.name, key)}`,
          states: [{ key: stateValue, name: stateValue }],
          canShow: true,
          isTeamBuff,
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

function getGlobalConditionalBuckets(uiData: UIData): GlobalConditionalBuckets {
  if (globalBuckets) return globalBuckets

  const artifactConditionals: ConditionalDescriptor[] = []
  const artSeen = new Set<string>()
  for (const setKey of allArtifactSetKeys as readonly ArtifactSetKey[]) {
    const artSheet = getArtSheet(setKey)
    if (!artSheet?.setEffects) continue
    for (const entry of Object.values(artSheet.setEffects) as Array<{
      document?: DocumentSection[]
    }>) {
      if (entry?.document) {
        collectConditionalsFromSections(
          entry.document,
          uiData,
          artSeen,
          artifactConditionals
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
    collectConditionalsFromSections(wSheet.document, uiData, wepSeen, wTemp)
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
      resonanceAndReaction
    )
  }
  collectConditionalsFromSections(
    reactionConditionals,
    uiData,
    resSeen,
    resonanceAndReaction
  )

  globalBuckets = {
    artifactConditionals,
    weaponByType,
    allWeapons,
    resonanceAndReaction,
  }
  return globalBuckets
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
    for (const talentEl of Object.values(charSheet.sheet) as Array<{
      sections?: DocumentSection[]
    }>) {
      if (talentEl?.sections) {
        collectConditionalsFromSections(talentEl.sections, uiData, seen, out)
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
