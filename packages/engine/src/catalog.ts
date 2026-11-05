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
import { getTeamData } from '@genshin-optimizer/gi/ui/useTeamData'
import { uiDataForTeam, type UIData } from '@genshin-optimizer/gi/uidata'
import { displayName } from '@gi/presets'
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
            .map(([ vk, vv ]) => `${vk}: ${vv}`)
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

function buildScratchUiData(characterKey: string, baseDb?: ArtCharDatabase): UIData | undefined {
  const db = new ArtCharDatabase(1, new SandboxStorage())
  if (baseDb) {
    const exported = baseDb.exportGOOD()
    db.importGOOD(exported as never, false, false, false)
  }
  const cKey = (characterKey === 'Traveler' ? 'TravelerAnemo' : characterKey) as CharacterKey
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
  return calc[cKey]?.target
}

export function listTargetsForCharacter(
  characterKey: string,
  baseDb?: ArtCharDatabase
): TargetDescriptor[] {
  const uiData = buildScratchUiData(characterKey, baseDb)
  if (!uiData) return []
  const display = uiData.getDisplay()
  const out: TargetDescriptor[] = []

  for (const section of DISPLAY_SECTIONS) {
    const secObj = display[section] as Record<string, { value?: number }> | undefined
    if (!secObj) continue
    for (const [key, calcRes] of Object.entries(secObj)) {
      if (!calcRes || typeof calcRes.value !== 'number') continue
      // Include all targetable nodes in talent/passive/constellation sections
      out.push({
        path: [section, key],
        name: humanizeTargetKey(section, key),
        section,
      })
    }
  }
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

      const states: ConditionalStateDescriptor[] = Object.entries(rawStates).map(
        ([stKey, stVal]) => ({
          key: stKey,
          name: extractReactNodeText(
            (stVal as { name?: unknown })?.name,
            stKey === 'on' ? 'Active (On)' : stKey
          ),
        })
      )
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
        // MultipleConditionalStates in GO uses the state key as the value (e.g. 'hydro' for 'swirlhydro')
        const stateValue = key.startsWith('swirl') ? key.slice('swirl'.length) : 'on'
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

export function listConditionalsForCharacter(
  characterKey: string,
  baseDb?: ArtCharDatabase
): ConditionalDescriptor[] {
  const uiData = buildScratchUiData(characterKey, baseDb)
  if (!uiData) return []
  const cKey = (characterKey === 'Traveler' ? 'TravelerAnemo' : characterKey) as CharacterKey
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

  // 2. Artifact set conditionals (all 5* sets commonly used in builds/teams)
  for (const setKey of allArtifactSetKeys as readonly ArtifactSetKey[]) {
    const artSheet = getArtSheet(setKey)
    if (!artSheet?.setEffects) continue
    for (const entry of Object.values(artSheet.setEffects) as Array<{
      document?: DocumentSection[]
    }>) {
      if (entry?.document) {
        collectConditionalsFromSections(entry.document, uiData, seen, out)
      }
    }
  }

  // 3. Weapon conditionals (matching character's weapon type if possible, or all weapons)
  for (const wKey of allWeaponKeys as readonly WeaponKey[]) {
    const wSheet = getWeaponSheet(wKey)
    if (wSheet?.document) {
      collectConditionalsFromSections(wSheet.document, uiData, seen, out)
    }
  }

  // 4. Resonance & Reaction conditionals
  for (const res of resonanceSheets) {
    collectConditionalsFromSections(res.sections, uiData, seen, out)
  }
  collectConditionalsFromSections(reactionConditionals, uiData, seen, out)

  return out
}
