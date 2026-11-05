import { displayName } from './names'
import type { MemberRequirement, Preset } from './schema'

export type MatchPartKind =
  | 'owned'
  | 'constellation'
  | 'weapon'
  | 'refinement'
  | 'level'
  | 'talent.auto'
  | 'talent.skill'
  | 'talent.burst'

export interface WeaponCandidate {
  id: string
  key: string
  name: string
  level: number
  ascension: number
  refinement: number
  location: string
  qualifies: boolean
}

export interface MatchPartResult {
  characterKey: string
  part: MatchPartKind
  expected: string
  actual: string
  ok: boolean
  message: string
  candidates?: WeaponCandidate[]
}

export interface MatchReport {
  presetId: string
  canRun: boolean
  selectedWeaponId?: string
  parts: MatchPartResult[]
}

export interface AccountCharLike {
  key: string
  level: number
  ascension: number
  constellation: number
  talent: { auto: number; skill: number; burst: number }
}

export interface AccountWeaponLike {
  id?: string
  key: string
  level: number
  ascension: number
  refinement: number
  location?: string
}

export interface AccountDataLike {
  characters?: AccountCharLike[]
  weapons?: AccountWeaponLike[]
}

function inRangeOrExact(
  val: number,
  req: number | { min: number; max: number }
): boolean {
  if (typeof req === 'number') return val === req
  return val >= req.min && val <= req.max
}

function formatRangeOrExact(
  prefix: string,
  req: number | { min: number; max: number }
): string {
  if (typeof req === 'number') return `${prefix}${req}`
  if (req.min === req.max) return `${prefix}${req.min}`
  return `${prefix}${req.min}–${prefix}${req.max}`
}

export function formatConstellationReq(
  req: number | { min: number; max: number }
): string {
  return formatRangeOrExact('C', req)
}

export function formatRefinementReq(
  req: number | { min: number; max: number }
): string {
  return formatRangeOrExact('R', req)
}

function isTravelerKey(key: string): boolean {
  return key.startsWith('Traveler')
}

function matchesLocation(weaponLoc: string | undefined, charKey: string): boolean {
  if (!weaponLoc) return false
  if (weaponLoc === charKey) return true
  if (weaponLoc === 'Traveler' && isTravelerKey(charKey)) return true
  return false
}

/**
 * Compares a preset's owned member requirements against the user's scanned GOOD account.
 * Teammates with `build.type === 'tc'` are fixed assumed builds and are never checked.
 * Never silently substitutes units, constellations, weapons, or refinements.
 */
export function matchAccount(
  preset: Preset,
  account: AccountDataLike,
  opts?: { selectedWeaponId?: string }
): MatchReport {
  const parts: MatchPartResult[] = []
  const chars = account.characters ?? []
  const weapons = (account.weapons ?? []).map((w, idx) => ({
    ...w,
    id: w.id || `weapon_${idx}`,
    location: w.location ?? '',
  }))

  let resolvedWeaponId: string | undefined

  for (let mIdx = 0; mIdx < preset.team.length; mIdx++) {
    const member = preset.team[mIdx]!
    if (member.build.type !== 'owned') continue

    const charKey = member.key
    const charName = displayName(charKey)
    const req: MemberRequirement = member.requirement ?? {}

    const ownedChar = chars.find((c) => c.key === charKey)
    if (!ownedChar) {
      parts.push({
        characterKey: charKey,
        part: 'owned',
        expected: charName,
        actual: 'Not owned',
        ok: false,
        message: `Preset needs ${charName} — ${charName} is not in your imported account.`,
      })
      continue
    }

    parts.push({
      characterKey: charKey,
      part: 'owned',
      expected: charName,
      actual: `${charName} (Lv. ${ownedChar.level}, C${ownedChar.constellation})`,
      ok: true,
      message: `${charName} is in your imported account.`,
    })

    // Constellation check
    if (req.constellation !== undefined) {
      const expStr = formatRangeOrExact('C', req.constellation)
      const actStr = `C${ownedChar.constellation}`
      const ok = inRangeOrExact(ownedChar.constellation, req.constellation)
      parts.push({
        characterKey: charKey,
        part: 'constellation',
        expected: expStr,
        actual: actStr,
        ok,
        message: ok
          ? `${charName} constellation matches (${actStr}).`
          : `Preset needs ${charName} ${expStr} — you have ${actStr}.`,
      })
    }

    // Level check
    if (req.minLevel !== undefined) {
      const expStr = `Lv. ${req.minLevel}+`
      const actStr = `Lv. ${ownedChar.level}`
      const ok = ownedChar.level >= req.minLevel
      parts.push({
        characterKey: charKey,
        part: 'level',
        expected: expStr,
        actual: actStr,
        ok,
        message: ok
          ? `${charName} level meets requirement (${actStr}).`
          : `Preset needs ${charName} at least Lv. ${req.minLevel} — you have ${actStr}.`,
      })
    }

    // Talent checks
    if (req.minTalent) {
      const talentLabels: Array<{
        key: 'auto' | 'skill' | 'burst'
        part: 'talent.auto' | 'talent.skill' | 'talent.burst'
        label: string
      }> = [
        { key: 'auto', part: 'talent.auto', label: 'Normal Attack' },
        { key: 'skill', part: 'talent.skill', label: 'Skill' },
        { key: 'burst', part: 'talent.burst', label: 'Burst' },
      ]
      for (const { key, part, label } of talentLabels) {
        const minVal = req.minTalent[key]
        if (minVal === undefined) continue
        const actualVal = ownedChar.talent?.[key] ?? 1
        const ok = actualVal >= minVal
        parts.push({
          characterKey: charKey,
          part,
          expected: `${label} ${minVal}+`,
          actual: `${label} ${actualVal}`,
          ok,
          message: ok
            ? `${charName} ${label} talent meets requirement (${actualVal}).`
            : `Preset needs ${charName} ${label} talent ${minVal}+ — you have ${label} ${actualVal}.`,
        })
      }
    }

    // Weapon & refinement check (for target mIdx === 0 we allow opts.selectedWeaponId)
    const equippedWeapon = weapons.find((w) => matchesLocation(w.location, charKey))
    const chosenWeapon =
      mIdx === 0 && opts?.selectedWeaponId
        ? weapons.find((w) => w.id === opts.selectedWeaponId) ?? equippedWeapon
        : equippedWeapon

    if (mIdx === 0 && chosenWeapon) {
      resolvedWeaponId = chosenWeapon.id
    }

    if (req.weapon) {
      const reqWKey = req.weapon.key
      const reqWName = displayName(reqWKey)
      const reqRef = req.weapon.refinement

      // Find all owned instances of reqWKey in inventory
      const matchingKeyInventory: WeaponCandidate[] = weapons
        .filter((w) => w.key === reqWKey)
        .map((w) => ({
          id: w.id,
          key: w.key,
          name: displayName(w.key),
          level: w.level,
          ascension: w.ascension,
          refinement: w.refinement,
          location: w.location,
          qualifies: reqRef === undefined ? true : inRangeOrExact(w.refinement, reqRef),
        }))
        .sort((a, b) => Number(b.qualifies) - Number(a.qualifies) || b.level - a.level)

      const weaponKeyMatches = chosenWeapon?.key === reqWKey
      const actualWeaponDesc = chosenWeapon
        ? `${displayName(chosenWeapon.key)} R${chosenWeapon.refinement} (Lv. ${chosenWeapon.level})`
        : 'no weapon equipped'

      if (!weaponKeyMatches) {
        const qualifyingAlt = matchingKeyInventory.find((c) => c.qualifies)
        const anyAlt = matchingKeyInventory[0]
        const expRefSuffix = reqRef !== undefined ? ` ${formatRangeOrExact('R', reqRef)}` : ''
        let hint = `you do not own ${reqWName} in your imported account.`
        if (qualifyingAlt) {
          const locDesc = qualifyingAlt.location
            ? `equipped on ${displayName(qualifyingAlt.location)}`
            : 'unequipped'
          hint = `you own ${reqWName} R${qualifyingAlt.refinement} ${locDesc}, select it to continue.`
        } else if (anyAlt) {
          hint = `you only own ${reqWName} at R${anyAlt.refinement}.`
        }

        parts.push({
          characterKey: charKey,
          part: 'weapon',
          expected: `${reqWName}${expRefSuffix}`,
          actual: actualWeaponDesc,
          ok: false,
          message: `Preset needs ${reqWName}${expRefSuffix} — ${charName} has ${actualWeaponDesc}; ${hint}`,
          candidates: matchingKeyInventory,
        })
      } else {
        parts.push({
          characterKey: charKey,
          part: 'weapon',
          expected: reqWName,
          actual: `${reqWName} (Lv. ${chosenWeapon.level})`,
          ok: true,
          message: `${charName} has ${reqWName} selected.`,
          candidates: matchingKeyInventory.length > 1 ? matchingKeyInventory : undefined,
        })

        if (reqRef !== undefined) {
          const expRefStr = formatRangeOrExact('R', reqRef)
          const actRefStr = `R${chosenWeapon.refinement}`
          const refOk = inRangeOrExact(chosenWeapon.refinement, reqRef)
          const qualifyingAlt = matchingKeyInventory.find(
            (c) => c.qualifies && c.id !== chosenWeapon.id
          )
          const altHint = qualifyingAlt
            ? `; you own another ${reqWName} R${qualifyingAlt.refinement} (${qualifyingAlt.location ? `equipped on ${displayName(qualifyingAlt.location)}` : 'unequipped'}), select it to continue.`
            : '.'
          parts.push({
            characterKey: charKey,
            part: 'refinement',
            expected: expRefStr,
            actual: actRefStr,
            ok: refOk,
            message: refOk
              ? `${reqWName} refinement matches (${actRefStr}).`
              : `Preset needs ${reqWName} ${expRefStr} — selected ${reqWName} is ${actRefStr}${altHint}`,
            candidates: !refOk ? matchingKeyInventory : undefined,
          })
        }
      }
    }
  }

  return {
    presetId: preset.id,
    canRun: parts.every((p) => p.ok),
    selectedWeaponId: resolvedWeaponId,
    parts,
  }
}
