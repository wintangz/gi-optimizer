import { getCharStatMeta, getWeaponStatMeta } from '@gi/good'
import { presetSchema, type Preset } from './schema'

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidatePresetResult {
  ok: boolean
  preset?: Preset
  issues: ValidationIssue[]
}

function getCharWeaponType(charKey: string): string | undefined {
  return getCharStatMeta(charKey)?.weaponType
}

function getWeaponType(weaponKey: string): string | undefined {
  return getWeaponStatMeta(weaponKey)?.weaponType
}

/**
 * Validates a preset document against `presetSchema` AND checks weapon-type
 * compatibility and Akasha-specific structural rules.
 */
export function validatePreset(input: unknown): ValidatePresetResult {
  const issues: ValidationIssue[] = []
  const parsed = presetSchema.safeParse(input)
  if (!parsed.success) {
    for (const iss of parsed.error.issues) {
      issues.push({
        path: iss.path.join('.') || 'root',
        message: iss.message,
      })
    }
    return { ok: false, issues }
  }

  const preset = parsed.data

  // Check weapon types for every member
  for (let i = 0; i < preset.team.length; i++) {
    const member = preset.team[i]!
    const charWType = getCharWeaponType(member.key)
    if (!charWType) continue

    if (member.requirement?.weapon) {
      const reqWKey = member.requirement.weapon.key
      const wType = getWeaponType(reqWKey)
      if (wType && wType !== charWType) {
        issues.push({
          path: `team.${i}.requirement.weapon.key`,
          message: `Weapon '${reqWKey}' (${wType}) does not match character '${member.key}' weapon type (${charWType}).`,
        })
      }
    }

    if (member.build.type === 'fixed') {
      const fixedWKey = member.build.weapon.key
      const wType = getWeaponType(fixedWKey)
      if (wType && wType !== charWType) {
        issues.push({
          path: `team.${i}.build.weapon.key`,
          message: `Fixed target weapon '${fixedWKey}' (${wType}) does not match character '${member.key}' weapon type (${charWType}).`,
        })
      }
    }

    if (member.build.type === 'tc') {
      const tcWKey = member.build.tc.weapon.key
      const wType = getWeaponType(tcWKey)
      if (wType && wType !== charWType) {
        issues.push({
          path: `team.${i}.build.tc.weapon.key`,
          message: `Assumed TC weapon '${tcWKey}' (${wType}) does not match character '${member.key}' weapon type (${charWType}).`,
        })
      }
    }
  }

  // Akasha preset rules:
  if (preset.source === 'akasha') {
    const targetMember = preset.team[0]!
    if (targetMember.build.type !== 'fixed') {
      issues.push({
        path: 'team.0.build.type',
        message: "Akasha preset target member must use a fixed 'fixed' build spec.",
      })
    }
    for (let i = 1; i < preset.team.length; i++) {
      if (preset.team[i]!.build.type !== 'tc') {
        issues.push({
          path: `team.${i}.build.type`,
          message: "Akasha preset teammates must use fixed 'tc' builds.",
        })
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, preset, issues: [] }
}

