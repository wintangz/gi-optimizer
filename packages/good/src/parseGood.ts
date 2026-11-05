import {
  allArtifactSetKeys,
  allArtifactSlotKeys,
  allCharacterKeys,
  allLocationCharacterKeys,
  allMainStatKeys,
  allSubstatKeys,
  allTravelerKeys,
  allWeaponKeys,
  artMaxLevel,
  artSlotMainKeys,
} from '@genshin-optimizer/gi/consts'
import { allStats } from '@genshin-optimizer/gi/stats'
import { didYouMean } from './suggest'
import type {
  ArtifactSlotKey,
  GoodSummary,
  IArtifact,
  ICharacter,
  IGOOD,
  IssueSeverity,
  IWeapon,
  ParseGoodResult,
  ParseIssue,
} from './types'

export const MAX_GOOD_BYTES = 20 * 1024 * 1024

const KNOWN_TOP_KEYS = new Set([
  'format',
  'version',
  'source',
  'characters',
  'weapons',
  'artifacts',
])

const GO_EXTRA_KEYS = new Set([
  'dbVersion',
  'generatedBuildList',
  'optConfigs',
  'buildTcs',
  'charMetas',
  'builds',
  'teamchars',
  'teams',
  'dbMeta',
  'display_weapon',
  'display_artifact',
  'display_character',
  'display_tool',
  'display_team',
  'display_archive',
])

const CHAR_KEYS_SET = new Set<string>(allCharacterKeys as readonly string[])
const LOC_KEYS_SET = new Set<string>(allLocationCharacterKeys as readonly string[])
const WEAPON_KEYS_SET = new Set<string>(allWeaponKeys as readonly string[])
const ART_SET_KEYS_SET = new Set<string>(allArtifactSetKeys as readonly string[])
const ART_SLOT_KEYS_SET = new Set<string>(allArtifactSlotKeys as readonly string[])
const MAIN_STAT_KEYS_SET = new Set<string>(allMainStatKeys as readonly string[])
const SUBSTAT_KEYS_SET = new Set<string>(allSubstatKeys as readonly string[])

function emptySummary(): GoodSummary {
  return {
    characters: { read: 0, imported: 0, skipped: 0, adjusted: 0 },
    weapons: { read: 0, imported: 0, skipped: 0, adjusted: 0 },
    artifacts: { read: 0, imported: 0, skipped: 0, adjusted: 0 },
    issueCounts: { fatal: 0, error: 0, warning: 0, info: 0 },
  }
}

function computeLineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1
  let col = 1
  const limit = Math.min(Math.max(0, pos), text.length)
  for (let i = 0; i < limit; i++) {
    if (text[i] === '\n') {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, col }
}

/**
 * Extracts the end index of the first complete top-level JSON value if trailing
 * garbage exists.
 */
function findFirstJsonValueEnd(text: string): number {
  let depth = 0
  let inString = false
  let escape = false
  let started = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === '[') {
      depth++
      started = true
    } else if (ch === '}' || ch === ']') {
      depth--
      if (started && depth === 0) {
        return i + 1
      }
    }
  }
  return -1
}

export function parseGood(input: string | unknown): ParseGoodResult {
  const summary = emptySummary()
  const issues: ParseIssue[] = []

  const addIssue = (
    severity: IssueSeverity,
    path: string,
    message: string,
    suggestion?: string
  ) => {
    summary.issueCounts[severity]++
    const fullMsg = suggestion ? `${message} — did you mean '${suggestion}'?` : message
    issues.push({ severity, path, message: fullMsg, suggestion })
  }

  let root: unknown = input

  if (typeof input === 'string') {
    if (input.length > MAX_GOOD_BYTES) {
      addIssue(
        'fatal',
        'root',
        `File size (${(input.length / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`
      )
      return { ok: false, summary, issues }
    }

    // Strip UTF-8 BOM silently (spec edge case)
    const stripped = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
    const trimmed = stripped.trim()
    if (!trimmed) {
      addIssue('fatal', 'root', 'The file is empty.')
      return { ok: false, summary, issues }
    }

    try {
      root = JSON.parse(trimmed)
    } catch (err) {
      // Check if there is a valid JSON object followed by trailing garbage
      const endIdx = findFirstJsonValueEnd(trimmed)
      if (endIdx > 0 && endIdx < trimmed.length) {
        try {
          root = JSON.parse(trimmed.slice(0, endIdx))
          const trailingCount = trimmed.length - endIdx
          const { line, col } = computeLineCol(trimmed, endIdx)
          addIssue(
            'warning',
            `line ${line}, col ${col}`,
            `Ignored ${trailingCount} trailing character(s) after the JSON object starting at line ${line}, col ${col}.`
          )
        } catch {
          // Fall through to normal syntax error
        }
      }

      if (typeof root === 'string') {
        const msg = err instanceof Error ? err.message : String(err)
        const posMatch = /position\s+(\d+)/i.exec(msg)
        const lineColMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(msg)
        let loc = 'line 1, col 1'
        if (lineColMatch) {
          loc = `line ${lineColMatch[1]}, col ${lineColMatch[2]}`
        } else if (posMatch) {
          const { line, col } = computeLineCol(trimmed, Number(posMatch[1]))
          loc = `line ${line}, col ${col}`
        }
        addIssue('fatal', loc, `Invalid JSON at ${loc}: ${msg}`)
        return { ok: false, summary, issues }
      }
    }
  }

  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    addIssue(
      'fatal',
      'root',
      Array.isArray(root)
        ? 'Expected a GOOD JSON object at the root, but found an array.'
        : 'Expected a GOOD JSON object at the root.'
    )
    return { ok: false, summary, issues }
  }

  const obj = root as Record<string, unknown>

  // Detect Enka.Network / UID showcase JSON explicitly (Constitution III)
  if ('avatarInfoList' in obj || 'playerInfo' in obj || 'uid' in obj) {
    addIssue(
      'fatal',
      'format',
      'This looks like UID / Enka.Network showcase data. Showcase data only contains up to 8 characters and cannot be optimised — please import a GOOD file from a scanner (e.g. Irminsul, Inventory Kamera, or Genshin Optimizer export).'
    )
    return { ok: false, summary, issues }
  }

  if (obj.format !== 'GOOD') {
    addIssue(
      'fatal',
      'format',
      `Expected format "GOOD", got ${JSON.stringify(obj.format ?? null)}. Only GOOD scanner exports are supported.`
    )
    return { ok: false, summary, issues }
  }

  const version = typeof obj.version === 'number' ? obj.version : 1
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) {
    addIssue(
      'warning',
      'version',
      `Unrecognized GOOD version ${JSON.stringify(obj.version)}; treating as version 2.`
    )
  }

  const source =
    typeof obj.source === 'string' && obj.source.trim().length > 0
      ? obj.source.trim()
      : 'Unknown'
  if (typeof obj.source !== 'string' || !obj.source.trim()) {
    addIssue('warning', 'source', 'Missing "source" field; defaulted to "Unknown".')
  }

  // Check for GO extra sections or unknown top-level keys
  const goExtrasFound: string[] = []
  const unknownTopFound: string[] = []
  for (const k of Object.keys(obj)) {
    if (KNOWN_TOP_KEYS.has(k)) continue
    if (GO_EXTRA_KEYS.has(k)) goExtrasFound.push(k)
    else unknownTopFound.push(k)
  }
  if (goExtrasFound.length > 0) {
    addIssue(
      'info',
      'root',
      `Ignored Genshin Optimizer database section(s): ${goExtrasFound.join(', ')}.`
    )
  }
  if (unknownTopFound.length > 0) {
    addIssue(
      'info',
      'root',
      `Ignored unknown top-level field(s): ${unknownTopFound.join(', ')}.`
    )
  }

  for (const sec of ['characters', 'weapons', 'artifacts'] as const) {
    if (obj[sec] !== undefined && !Array.isArray(obj[sec])) {
      addIssue('fatal', sec, `Expected "${sec}" to be an array.`)
      return { ok: false, summary, issues }
    }
  }

  const rawChars = (obj.characters as unknown[] | undefined) ?? []
  const rawWeapons = (obj.weapons as unknown[] | undefined) ?? []
  const rawArts = (obj.artifacts as unknown[] | undefined) ?? []

  summary.characters.read = rawChars.length
  summary.weapons.read = rawWeapons.length
  summary.artifacts.read = rawArts.length

  // --- Characters ---
  const charMap = new Map<string, { char: ICharacter; index: number }>()
  for (let i = 0; i < rawChars.length; i++) {
    const cPath = `characters[${i}]`
    const item = rawChars[i]
    if (typeof item !== 'object' || item === null) {
      summary.characters.skipped++
      addIssue('error', cPath, 'Character entry is not an object.')
      continue
    }
    const rec = item as Record<string, unknown>
    const rawKey = typeof rec.key === 'string' ? rec.key : ''

    if (!rawKey) {
      summary.characters.skipped++
      addIssue('error', `${cPath}.key`, 'Character is missing a string "key".')
      continue
    }

    // Legacy Traveler expansion (spec edge case GI-7)
    const keysToImport: string[] =
      rawKey === 'Traveler' ? [...(allTravelerKeys as readonly string[])] : [rawKey]

    if (rawKey === 'Traveler') {
      addIssue(
        'info',
        `${cPath}.key`,
        'Expanded legacy "Traveler" entry into elemental Traveler variants.'
      )
    } else if (!CHAR_KEYS_SET.has(rawKey)) {
      summary.characters.skipped++
      const sug = didYouMean(rawKey, allCharacterKeys as readonly string[])
      addIssue(
        'warning',
        `${cPath}.key`,
        `Unknown character key '${rawKey}' (skipped; may be from a newer game version)`,
        sug
      )
      continue
    }

    let adjusted = false
    let level = typeof rec.level === 'number' && Number.isFinite(rec.level) ? Math.round(rec.level) : 1
    if (level < 1 || level > 100) {
      const clamped = Math.min(100, Math.max(1, level))
      addIssue(
        'warning',
        `${cPath}.level`,
        `Character level ${rec.level} is outside 1–100; adjusted to ${clamped}.`
      )
      level = clamped
      adjusted = true
    }

    const minAsc =
      level > 80 ? 6 : level > 70 ? 5 : level > 60 ? 4 : level > 50 ? 3 : level > 40 ? 2 : level > 20 ? 1 : 0
    const maxAsc =
      level < 20 ? 0 : level < 40 ? 1 : level < 50 ? 2 : level < 60 ? 3 : level < 70 ? 4 : level < 80 ? 5 : 6
    let ascension =
      typeof rec.ascension === 'number' && Number.isFinite(rec.ascension)
        ? Math.round(rec.ascension)
        : minAsc
    if (ascension < minAsc || ascension > maxAsc) {
      const clamped = Math.min(maxAsc, Math.max(minAsc, ascension))
      addIssue(
        'warning',
        `${cPath}.ascension`,
        `Character ascension ${rec.ascension} is incompatible with level ${level}; adjusted to ${clamped}.`
      )
      ascension = clamped
      adjusted = true
    }

    let constellation =
      typeof rec.constellation === 'number' && Number.isFinite(rec.constellation)
        ? Math.round(rec.constellation)
        : 0
    if (constellation < 0 || constellation > 6) {
      const clamped = Math.min(6, Math.max(0, constellation))
      addIssue(
        'warning',
        `${cPath}.constellation`,
        `Constellation ${rec.constellation} is outside 0–6; adjusted to ${clamped}.`
      )
      constellation = clamped
      adjusted = true
    }

    const talentMaxPerAsc = [1, 1, 2, 4, 6, 8, 10][ascension] ?? 10
    const rawTalent =
      typeof rec.talent === 'object' && rec.talent !== null
        ? (rec.talent as Record<string, unknown>)
        : {}
    const talent = { auto: 1, skill: 1, burst: 1 }
    for (const tk of ['auto', 'skill', 'burst'] as const) {
      const rawVal = rawTalent[tk]
      let tv = typeof rawVal === 'number' && Number.isFinite(rawVal) ? Math.round(rawVal) : 1
      if (tv < 1 || tv > talentMaxPerAsc) {
        const clamped = Math.min(talentMaxPerAsc, Math.max(1, tv))
        addIssue(
          'warning',
          `${cPath}.talent.${tk}`,
          `Talent '${tk}' value ${rawVal} is outside 1–${talentMaxPerAsc} for ascension ${ascension} (GOOD uses base talent levels excluding +3 constellation bonuses); adjusted to ${clamped}.`
        )
        tv = clamped
        adjusted = true
      }
      talent[tk] = tv
    }

    if (adjusted) summary.characters.adjusted++

    for (const ck of keysToImport) {
      const prev = charMap.get(ck)
      if (prev && rawKey !== 'Traveler') {
        addIssue(
          'warning',
          `${cPath}.key`,
          `Duplicate character '${ck}' (previously at characters[${prev.index}]); the later entry replaced the earlier one.`
        )
      }
      charMap.set(ck, {
        char: { key: ck, level, ascension, constellation, talent: { ...talent } },
        index: i,
      })
    }
  }

  const characters = Array.from(charMap.values()).map((v) => v.char)
  summary.characters.imported = characters.length
  const ownedCharKeys = new Set(characters.map((c) => c.key))

  // --- Weapons ---
  const weapons: IWeapon[] = []
  const usedWeaponIds = new Set<string>()
  const weaponEquippedByChar = new Map<string, number>() // location -> index in weapons[]
  let nextWeaponAutoId = 0

  for (let i = 0; i < rawWeapons.length; i++) {
    const wPath = `weapons[${i}]`
    const item = rawWeapons[i]
    if (typeof item !== 'object' || item === null) {
      summary.weapons.skipped++
      addIssue('error', wPath, 'Weapon entry is not an object.')
      continue
    }
    const rec = item as Record<string, unknown>
    const key = typeof rec.key === 'string' ? rec.key : ''
    if (!key) {
      summary.weapons.skipped++
      addIssue('error', `${wPath}.key`, 'Weapon is missing a string "key".')
      continue
    }
    if (!WEAPON_KEYS_SET.has(key)) {
      summary.weapons.skipped++
      const sug = didYouMean(key, allWeaponKeys as readonly string[])
      addIssue(
        'warning',
        `${wPath}.key`,
        `Unknown weapon key '${key}' (skipped; may be from a newer game version)`,
        sug
      )
      continue
    }

    const wStat = allStats.weapon.data[key as keyof typeof allStats.weapon.data]
    const rarity: number = wStat?.rarity ?? 4
    const maxLevel = rarity <= 2 ? 70 : 90
    const maxAsc = rarity <= 2 ? 4 : 6

    let adjusted = false
    let level = typeof rec.level === 'number' && Number.isFinite(rec.level) ? Math.round(rec.level) : 1
    if (level < 1 || level > maxLevel) {
      const clamped = Math.min(maxLevel, Math.max(1, level))
      addIssue(
        'warning',
        `${wPath}.level`,
        `Weapon level ${rec.level} is outside 1–${maxLevel} for ${rarity}★ weapon '${key}'; adjusted to ${clamped}.`
      )
      level = clamped
      adjusted = true
    }

    const minAsc =
      level > 80 ? 6 : level > 70 ? 5 : level > 60 ? 4 : level > 50 ? 3 : level > 40 ? 2 : level > 20 ? 1 : 0
    const upperAsc = Math.min(
      maxAsc,
      level < 20 ? 0 : level < 40 ? 1 : level < 50 ? 2 : level < 60 ? 3 : level < 70 ? 4 : level < 80 ? 5 : 6
    )
    let ascension =
      typeof rec.ascension === 'number' && Number.isFinite(rec.ascension)
        ? Math.round(rec.ascension)
        : minAsc
    if (ascension < minAsc || ascension > upperAsc) {
      const clamped = Math.min(upperAsc, Math.max(minAsc, ascension))
      addIssue(
        'warning',
        `${wPath}.ascension`,
        `Weapon ascension ${rec.ascension} is incompatible with level ${level}; adjusted to ${clamped}.`
      )
      ascension = clamped
      adjusted = true
    }

    let refinement =
      typeof rec.refinement === 'number' && Number.isFinite(rec.refinement)
        ? Math.round(rec.refinement)
        : 1
    if (rarity <= 2) {
      refinement = 1
    } else if (refinement < 1 || refinement > 5) {
      const clamped = Math.min(5, Math.max(1, refinement))
      addIssue(
        'warning',
        `${wPath}.refinement`,
        `Weapon refinement ${rec.refinement} is outside 1–5; adjusted to ${clamped}.`
      )
      refinement = clamped
      adjusted = true
    }

    let location = typeof rec.location === 'string' ? rec.location : ''
    if (location && !LOC_KEYS_SET.has(location)) {
      addIssue(
        'warning',
        `${wPath}.location`,
        `Unknown weapon location '${location}'; unequipped.`
      )
      location = ''
      adjusted = true
    }

    // Check weapon type vs character weapon type
    if (location) {
      const charKeyForStat =
        location === 'Traveler' ? 'TravelerAnemo' : location
      const cStat = allStats.char.data[charKeyForStat as keyof typeof allStats.char.data]
      if (cStat && wStat && cStat.weaponType !== wStat.weaponType) {
        summary.weapons.skipped++
        addIssue(
          'error',
          `${wPath}.location`,
          `Weapon '${key}' (${wStat.weaponType}) cannot be equipped on '${location}' (${cStat.weaponType}); skipped.`
        )
        continue
      }
      if (
        location !== 'Traveler' &&
        !ownedCharKeys.has(location)
      ) {
        addIssue(
          'warning',
          `${wPath}.location`,
          `Weapon '${key}' is equipped on '${location}', which is not in the characters list.`
        )
      }
      const prevEquippedIdx = weaponEquippedByChar.get(location)
      if (prevEquippedIdx !== undefined) {
        weapons[prevEquippedIdx]!.location = ''
        addIssue(
          'warning',
          `${wPath}.location`,
          `Multiple weapons equipped on '${location}'; earlier weapon '${weapons[prevEquippedIdx]!.id}' was unequipped.`
        )
      }
    }

    let id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : ''
    if (!id || usedWeaponIds.has(id)) {
      const oldId = id
      while (usedWeaponIds.has(`weapon_${nextWeaponAutoId}`)) nextWeaponAutoId++
      id = `weapon_${nextWeaponAutoId++}`
      if (oldId) {
        addIssue(
          'warning',
          `${wPath}.id`,
          `Duplicate weapon id '${oldId}'; assigned '${id}'.`
        )
        adjusted = true
      }
    }
    usedWeaponIds.add(id)

    if (adjusted) summary.weapons.adjusted++
    const wEntry: IWeapon = {
      id,
      key,
      level,
      ascension,
      refinement,
      location,
      lock: Boolean(rec.lock),
    }
    if (location) weaponEquippedByChar.set(location, weapons.length)
    weapons.push(wEntry)
  }
  summary.weapons.imported = weapons.length

  // --- Artifacts ---
  const artifacts: IArtifact[] = []
  const usedArtIds = new Set<string>()
  const artEquippedByCharSlot = new Map<string, number>()
  let nextArtAutoId = 0

  for (let i = 0; i < rawArts.length; i++) {
    const aPath = `artifacts[${i}]`
    const item = rawArts[i]
    if (typeof item !== 'object' || item === null) {
      summary.artifacts.skipped++
      addIssue('error', aPath, 'Artifact entry is not an object.')
      continue
    }
    const rec = item as Record<string, unknown>

    const setKey = typeof rec.setKey === 'string' ? rec.setKey : ''
    if (!setKey) {
      summary.artifacts.skipped++
      addIssue('error', `${aPath}.setKey`, 'Artifact is missing a string "setKey".')
      continue
    }
    if (!ART_SET_KEYS_SET.has(setKey)) {
      summary.artifacts.skipped++
      const sug = didYouMean(setKey, allArtifactSetKeys as readonly string[])
      addIssue(
        'warning',
        `${aPath}.setKey`,
        `Unknown artifact set '${setKey}' (skipped; may be from a newer game version)`,
        sug
      )
      continue
    }

    const slotKey = typeof rec.slotKey === 'string' ? rec.slotKey : ''
    if (!ART_SLOT_KEYS_SET.has(slotKey)) {
      summary.artifacts.skipped++
      const sug = didYouMean(slotKey, allArtifactSlotKeys as readonly string[])
      addIssue(
        'error',
        `${aPath}.slotKey`,
        `'${slotKey}' is not a valid artifact slot`,
        sug
      )
      continue
    }

    const rarity =
      typeof rec.rarity === 'number' && Number.isFinite(rec.rarity) ? Math.round(rec.rarity) : 0
    if (rarity < 3 || rarity > 5) {
      summary.artifacts.skipped++
      addIssue(
        'error',
        `${aPath}.rarity`,
        `Artifact rarity ${JSON.stringify(rec.rarity)} is not supported (must be 3, 4, or 5).`
      )
      continue
    }

    const maxLevel = artMaxLevel[rarity as 3 | 4 | 5] ?? 20
    const level =
      typeof rec.level === 'number' && Number.isFinite(rec.level) ? Math.round(rec.level) : -1
    if (level < 0 || level > maxLevel) {
      summary.artifacts.skipped++
      addIssue(
        'error',
        `${aPath}.level`,
        `Artifact level ${JSON.stringify(rec.level)} is outside 0–${maxLevel} for ${rarity}★ rarity.`
      )
      continue
    }

    let adjusted = false
    let mainStatKey = typeof rec.mainStatKey === 'string' ? rec.mainStatKey : ''
    if (!MAIN_STAT_KEYS_SET.has(mainStatKey)) {
      summary.artifacts.skipped++
      const sug = didYouMean(mainStatKey, allMainStatKeys as readonly string[])
      addIssue(
        'error',
        `${aPath}.mainStatKey`,
        `'${mainStatKey}' is not a valid main stat`,
        sug
      )
      continue
    }

    const validSlotMains = artSlotMainKeys[slotKey as ArtifactSlotKey] as readonly string[]
    if (slotKey === 'flower' && mainStatKey !== 'hp') {
      addIssue(
        'warning',
        `${aPath}.mainStatKey`,
        `Flower main stat was '${mainStatKey}'; corrected to 'hp'.`
      )
      mainStatKey = 'hp'
      adjusted = true
    } else if (slotKey === 'plume' && mainStatKey !== 'atk') {
      addIssue(
        'warning',
        `${aPath}.mainStatKey`,
        `Plume main stat was '${mainStatKey}'; corrected to 'atk'.`
      )
      mainStatKey = 'atk'
      adjusted = true
    } else if (!validSlotMains.includes(mainStatKey)) {
      summary.artifacts.skipped++
      addIssue(
        'error',
        `${aPath}.mainStatKey`,
        `Main stat '${mainStatKey}' is not valid for slot '${slotKey}'.`
      )
      continue
    }

    // Substats
    const rawSubs = Array.isArray(rec.substats) ? rec.substats : []
    const substats: { key: string; value: number }[] = []
    let substatFatal = false
    const seenSubKeys = new Set<string>()

    if (rawSubs.length > 4) {
      addIssue(
        'warning',
        `${aPath}.substats`,
        `Artifact has ${rawSubs.length} substats; only the first 4 are kept.`
      )
      adjusted = true
    }

    for (let sIdx = 0; sIdx < Math.min(rawSubs.length, 4); sIdx++) {
      const sPath = `${aPath}.substats[${sIdx}]`
      const sub = rawSubs[sIdx]
      if (typeof sub !== 'object' || sub === null) continue
      const sRec = sub as Record<string, unknown>
      const sKey = typeof sRec.key === 'string' ? sRec.key : ''
      if (!sKey) continue // GO uses empty key "" for unused substat slots

      if (!SUBSTAT_KEYS_SET.has(sKey)) {
        const sug = didYouMean(sKey, allSubstatKeys as readonly string[])
        addIssue(
          'error',
          `${sPath}.key`,
          `'${sKey}' is not a valid substat`,
          sug
        )
        substatFatal = true
        break
      }

      if (sKey === mainStatKey) {
        addIssue(
          'error',
          `${sPath}.key`,
          `Substat '${sKey}' duplicates the artifact's main stat '${mainStatKey}'.`
        )
        substatFatal = true
        break
      }

      if (seenSubKeys.has(sKey)) {
        addIssue(
          'warning',
          `${sPath}.key`,
          `Duplicate substat '${sKey}' on the same artifact; skipped duplicate.`
        )
        adjusted = true
        continue
      }
      seenSubKeys.add(sKey)

      const rawVal = typeof sRec.value === 'number' && Number.isFinite(sRec.value) ? sRec.value : 0
      substats.push({ key: sKey, value: rawVal })
    }

    if (substatFatal) {
      summary.artifacts.skipped++
      continue
    }

    let location = typeof rec.location === 'string' ? rec.location : ''
    if (location && !LOC_KEYS_SET.has(location)) {
      addIssue(
        'warning',
        `${aPath}.location`,
        `Unknown artifact location '${location}'; unequipped.`
      )
      location = ''
      adjusted = true
    }

    if (location) {
      if (location !== 'Traveler' && !ownedCharKeys.has(location)) {
        addIssue(
          'warning',
          `${aPath}.location`,
          `Artifact is equipped on '${location}', which is not in the characters list.`
        )
      }
      const locSlot = `${location}:${slotKey}`
      const prevIdx = artEquippedByCharSlot.get(locSlot)
      if (prevIdx !== undefined) {
        artifacts[prevIdx]!.location = ''
        addIssue(
          'warning',
          `${aPath}.location`,
          `Multiple '${slotKey}' artifacts equipped on '${location}'; earlier artifact '${artifacts[prevIdx]!.id}' was unequipped.`
        )
      }
    }

    let id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : ''
    if (!id || usedArtIds.has(id)) {
      const oldId = id
      while (usedArtIds.has(`artifact_${nextArtAutoId}`)) nextArtAutoId++
      id = `artifact_${nextArtAutoId++}`
      if (oldId) {
        addIssue(
          'warning',
          `${aPath}.id`,
          `Duplicate artifact id '${oldId}'; assigned '${id}'.`
        )
        adjusted = true
      }
    }
    usedArtIds.add(id)

    if (adjusted) summary.artifacts.adjusted++
    const artEntry: IArtifact = {
      id,
      setKey,
      slotKey: slotKey as ArtifactSlotKey,
      level,
      rarity,
      mainStatKey,
      location,
      lock: Boolean(rec.lock),
      substats,
    }
    if (location) artEquippedByCharSlot.set(`${location}:${slotKey}`, artifacts.length)
    artifacts.push(artEntry)
  }
  summary.artifacts.imported = artifacts.length

  if (characters.length === 0 && weapons.length === 0 && artifacts.length === 0) {
    addIssue('fatal', 'root', 'Nothing to import: no valid characters, weapons, or artifacts found.')
    return { ok: false, summary, issues }
  }

  return {
    ok: true,
    good: {
      format: 'GOOD',
      version,
      source,
      characters,
      weapons,
      artifacts,
    },
    summary,
    issues,
  }
}

