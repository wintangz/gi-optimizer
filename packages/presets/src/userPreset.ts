import { CHAR_STAT_META } from '@gi/good'
import {
  PRESET_SCHEMA_ID,
  presetSchema,
  type Preset,
  type TcBuild,
} from './schema'

export interface PresetImportIssue {
  path: string
  message: string
}

export type ParsePresetImportResult =
  | {
      ok: true
      preset: Preset
      convertedFromSource?: 'akasha' | 'official'
    }
  | {
      ok: false
      issues: PresetImportIssue[]
    }

export const MAX_PRESET_JSON_BYTES = 1024 * 1024

const DEFAULT_WEAPON_BY_TYPE: Record<string, string> = {
  sword: 'FavoniusSword',
  claymore: 'FavoniusGreatsword',
  polearm: 'FavoniusLance',
  bow: 'FavoniusWarbow',
  catalyst: 'FavoniusCodex',
}

function randomBase36(len = 6): string {
  let out = ''
  while (out.length < len) {
    out += Math.random().toString(36).slice(2)
  }
  return out.slice(0, len)
}

export function slugifyPresetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export function generateUserPresetId(name: string): string {
  const slug = slugifyPresetName(name)
  const suffix = randomBase36(6)
  if (!slug) {
    return `user/custom-${suffix}`
  }
  return `user/${slug}-${suffix}`
}

export function defaultTcBuildForCharacter(characterKey: string): TcBuild {
  const lookupKey = characterKey.startsWith('Traveler') ? 'Traveler' : characterKey
  const wType = CHAR_STAT_META[lookupKey]?.weaponType ?? 'sword'
  const weaponKey = DEFAULT_WEAPON_BY_TYPE[wType] ?? 'FavoniusSword'

  return {
    character: {
      level: 90,
      ascension: 6,
      constellation: 0,
      talent: { auto: 9, skill: 9, burst: 9 },
    },
    weapon: {
      key: weaponKey,
      level: 90,
      ascension: 6,
      refinement: 5,
    },
    artifact: {
      slots: {
        flower: { statKey: 'hp', level: 20, rarity: 5 },
        plume: { statKey: 'atk', level: 20, rarity: 5 },
        sands: { statKey: 'enerRech_', level: 20, rarity: 5 },
        goblet: { statKey: 'atk_', level: 20, rarity: 5 },
        circlet: { statKey: 'critRate_', level: 20, rarity: 5 },
      },
      substats: {
        type: 'max',
        rarity: 5,
        stats: {
          hp: 0,
          hp_: 19.8,
          atk: 0,
          atk_: 19.8,
          def: 0,
          def_: 0,
          eleMas: 79.2,
          enerRech_: 22.0,
          critRate_: 23.3,
          critDMG_: 46.6,
        },
      },
      sets: {
        NoblesseOblige: 4,
      },
    },
  }
}

export const DEFAULT_TC_TEAMMATE_CONDITIONAL: Record<
  string,
  Record<string, string>
> = {
  NoblesseOblige: { set4: 'on' },
}

export function createDefaultTcTeammate(characterKey: string) {
  return {
    key: characterKey,
    build: {
      type: 'tc' as const,
      tc: defaultTcBuildForCharacter(characterKey),
    },
    requirement: {},
    conditional: {
      NoblesseOblige: { set4: 'on' },
    },
    bonusStats: {},
    hitMode: 'avgHit' as const,
  }
}

export function createBlankUserPreset(
  target: string,
  name = `${target} Custom Setup`,
  firstTargetPath: string[] = [target, 'normal', '0']
): Preset {
  const id = generateUserPresetId(name)
  return presetSchema.parse({
    schema: PRESET_SCHEMA_ID,
    id,
    name,
    description: '',
    source: 'user',
    author: 'You',
    target,
    team: [
      {
        key: target,
        build: { type: 'owned' },
        requirement: {},
        conditional: {},
        bonusStats: {},
        hitMode: 'avgHit',
      },
    ],
    enemy: { level: 100, overrides: {} },
    teamConditional: { resonance: {}, reaction: {} },
    rotation: {
      name: 'Rotation',
      repeat: 1,
      targets: [
        {
          path: firstTargetPath,
          count: 1,
          label: 'Normal 1',
          hitMode: 'avgHit',
          bonusStats: {},
        },
      ],
    },
  })
}

/**
 * Forks any preset (Akasha, Official, or User) into a new independent User preset.
 * Strips Akasha leaderboard metadata and assigns a new `user/` id.
 */
export function forkPresetToUser(sourcePreset: Preset, newName?: string): Preset {
  const cloned = structuredClone(sourcePreset) as unknown as Record<string, unknown>
  delete cloned.akasha
  const finalName = (newName ?? `${sourcePreset.name} (copy)`).slice(0, 200)
  cloned.id = generateUserPresetId(finalName)
  cloned.name = finalName
  cloned.source = 'user'
  cloned.author = 'You'
  if (Array.isArray(cloned.team) && cloned.team[0] && typeof cloned.team[0] === 'object') {
    const t0 = cloned.team[0] as Record<string, unknown>
    t0.build = { type: 'owned' }
  }
  return presetSchema.parse(cloned)
}

export function serializePresetJson(preset: Preset): string {
  return JSON.stringify(preset, null, 2)
}

export function parsePresetJson(rawText: string): ParsePresetImportResult {
  if (typeof rawText !== 'string') {
    return { ok: false, issues: [{ path: 'root', message: 'Input must be a JSON string.' }] }
  }
  if (rawText.length > MAX_PRESET_JSON_BYTES) {
    return {
      ok: false,
      issues: [
        {
          path: 'root',
          message: `File size exceeds 1 MB limit (${(rawText.length / 1024).toFixed(0)} KB).`,
        },
      ],
    }
  }

  let parsedObj: unknown
  try {
    parsedObj = JSON.parse(rawText)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      issues: [{ path: 'json', message: `This file is not valid JSON: ${msg}` }],
    }
  }

  if (typeof parsedObj !== 'object' || parsedObj === null || Array.isArray(parsedObj)) {
    return {
      ok: false,
      issues: [{ path: 'root', message: 'Expected a single preset JSON object.' }],
    }
  }

  const candidate = structuredClone(parsedObj) as Record<string, unknown>
  let convertedFromSource: 'akasha' | 'official' | undefined

  if (candidate.source === 'akasha' || candidate.source === 'official') {
    convertedFromSource = candidate.source
    delete candidate.akasha
    candidate.source = 'user'
    const baseName = typeof candidate.name === 'string' && candidate.name ? candidate.name : 'Imported Preset'
    candidate.id = generateUserPresetId(baseName)
    candidate.author = 'You'
    if (Array.isArray(candidate.team) && candidate.team[0] && typeof candidate.team[0] === 'object') {
      const t0 = candidate.team[0] as Record<string, unknown>
      t0.build = { type: 'owned' }
    }
  }

  const res = presetSchema.safeParse(candidate)
  if (!res.success) {
    return {
      ok: false,
      issues: res.error.issues.map((i) => ({
        path: i.path.join(' › ') || 'root',
        message: i.message,
      })),
    }
  }

  return {
    ok: true,
    preset: res.data,
    convertedFromSource,
  }
}

