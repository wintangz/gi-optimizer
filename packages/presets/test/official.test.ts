import { describe, expect, it } from 'vitest'
import { getPresetBadge, listBundledPresets } from '../src/registry'
import { presetSchema } from '../src/schema'
import { validatePreset } from '../src/validate'

describe('Official Presets (official-presets)', () => {
  const officialPresets = listBundledPresets({ source: 'official' })

  it('includes all bundled official presets', () => {
    expect(officialPresets).toHaveLength(9)
    const ids = officialPresets.map((p) => p.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'official/neuvillette-hypercarry',
        'official/furina-salon-subdps',
        'official/hutao-double-hydro-vape',
        'official/raiden-hypercarry',
        'official/arlecchino-vaporize',
        'official/mavuika-melt-hypercarry',
        'official/mavuika-overload',
        'official/skirk-freeze',
        'official/nefer-lunar-bloom',
      ])
    )
  })

  it('validates every official preset against presetSchema and domain rules', () => {
    for (const preset of officialPresets) {
      const parsed = presetSchema.safeParse(preset)
      expect(parsed.success, `Schema check failed for ${preset.id}`).toBe(true)

      const v = validatePreset(preset)
      expect(v.ok, `Validation failed for ${preset.id}: ${JSON.stringify(v.issues)}`).toBe(true)
      expect(v.issues).toEqual([])

      expect(preset.source).toBe('official')
      expect(preset.author).toBe('gi-optimizer')
      expect(preset.akasha).toBeUndefined()

      // Official presets leave weapon and constellation unconstrained so any owner can run them
      const targetMember = preset.team[0]!
      expect(targetMember.key).toBe(preset.target)
      expect(targetMember.build.type).toBe('owned')
      expect(targetMember.requirement?.constellation).toBeUndefined()
      expect(targetMember.requirement?.weapon).toBeUndefined()

      // Supporting teammates use self-contained TC builds
      for (const teammate of preset.team.slice(1)) {
        expect(teammate.build.type).toBe('tc')
        if (teammate.build.type === 'tc') {
          expect(teammate.build.tc).toBeDefined()
        }
      }

      // Badge check
      const badge = getPresetBadge(preset)
      expect(badge).toEqual({
        kind: 'official',
        label: 'Official',
        verified: true,
      })
    }
  })
})
