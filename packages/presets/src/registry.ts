import furinaPjcC0 from '../data/akasha/furina-salon-pjc-c0.json'
import furinaSplendorC2 from '../data/akasha/furina-splendor-c2.json'
import hutaoHomaC1 from '../data/akasha/hutao-double-hydro-homa-c1.json'
import neuvProtoAmberC0 from '../data/akasha/neuvillette-hypercarry-protoamber-c0.json'
import raidenScarletC0 from '../data/akasha/raiden-hypercarry-scarlet-c0.json'
import arlecchinoVape from '../data/official/arlecchino-vaporize.json'
import furinaSubdps from '../data/official/furina-salon-subdps.json'
import hutaoVape from '../data/official/hutao-double-hydro-vape.json'
import mavuikaMelt from '../data/official/mavuika-melt-hypercarry.json'
import neuvHyper from '../data/official/neuvillette-hypercarry.json'
import raidenHyper from '../data/official/raiden-hypercarry.json'
import { presetSchema, type Preset } from './schema'

const RAW_BUNDLED: unknown[] = [
  furinaPjcC0,
  furinaSplendorC2,
  neuvProtoAmberC0,
  hutaoHomaC1,
  raidenScarletC0,
  neuvHyper,
  furinaSubdps,
  hutaoVape,
  raidenHyper,
  arlecchinoVape,
  mavuikaMelt,
]

let cachedPresets: Preset[] | null = null

function getBundledPresetsInternal(): Preset[] {
  if (!cachedPresets) {
    cachedPresets = RAW_BUNDLED.map((raw) => presetSchema.parse(raw))
  }
  return cachedPresets
}

/**
 * IDs of presets backed by golden reference fixtures in `packages/engine/test/golden/`.
 * Initialized without invoking `presetSchema.parse()` at module load time so
 * webpack can tree-shake `registry.ts` out of routes that do not call its functions.
 */
export const VERIFIED_PRESET_IDS: ReadonlySet<string> = /*#__PURE__*/ new Set([
  'akasha/furina-salon-pjc-c0',
  'akasha/furina-splendor-c2',
  'akasha/neuvillette-hypercarry-protoamber-c0',
  'akasha/hutao-double-hydro-homa-c1',
  'akasha/raiden-hypercarry-scarlet-c0',
  'official/neuvillette-hypercarry',
  'official/furina-salon-subdps',
  'official/hutao-double-hydro-vape',
  'official/raiden-hypercarry',
  'official/arlecchino-vaporize',
  'official/mavuika-melt-hypercarry',
])

export interface PresetBadge {
  kind: 'akasha' | 'official' | 'user'
  label: string
  verified: boolean
  warning?: string
}

export function getPresetBadge(preset: Preset): PresetBadge {
  if (preset.source === 'akasha') {
    const label = preset.akasha?.label
      ? `Akasha · ${preset.akasha.label}`
      : 'Akasha'
    return {
      kind: 'akasha',
      label,
      verified: VERIFIED_PRESET_IDS.has(preset.id),
    }
  }
  if (preset.source === 'official') {
    return {
      kind: 'official',
      label: 'Official',
      verified: VERIFIED_PRESET_IDS.has(preset.id),
    }
  }
  return {
    kind: 'user',
    label: 'Custom — use at your own risk',
    verified: false,
    warning:
      'User presets are unverified setup bundles — numbers depend on your own setup and artifacts.',
  }
}

export function listBundledPresets(filter?: {
  source?: 'akasha' | 'official'
  target?: string
}): Preset[] {
  return getBundledPresetsInternal().filter((p) => {
    if (filter?.source && p.source !== filter.source) return false
    if (filter?.target && p.target !== filter.target) return false
    return true
  })
}

export function getBundledPreset(id: string): Preset | undefined {
  return getBundledPresetsInternal().find((p) => p.id === id)
}
