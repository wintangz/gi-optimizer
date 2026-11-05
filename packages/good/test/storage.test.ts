import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  clearGood,
  deleteUserPreset,
  listUserPresets,
  loadGood,
  loadSettings,
  saveGood,
  saveSettings,
  saveUserPreset,
} from '../../../apps/web/src/lib/storage/db'
import { parseGood } from '../src/parseGood'

describe('IndexedDB Storage Contract (db.ts)', () => {
  it('persists, replaces, and clears GOOD data while keeping presets and settings isolated', async () => {
    const raw = {
      format: 'GOOD',
      version: 3,
      source: 'Irminsul',
      characters: [
        {
          key: 'Furina',
          level: 90,
          ascension: 6,
          constellation: 0,
          talent: { auto: 6, skill: 10, burst: 10 },
        },
      ],
      weapons: [],
      artifacts: [],
    }
    const parsed = parseGood(raw)
    expect(parsed.ok).toBe(true)

    await saveGood({
      good: parsed.good!,
      importedAt: '2026-05-01T00:00:00.000Z',
      fileName: 'scan.json',
      source: parsed.good!.source,
      summary: parsed.summary,
    })

    const loaded = await loadGood()
    expect(loaded).toBeDefined()
    expect(loaded?.fileName).toBe('scan.json')
    expect(loaded?.good.characters).toHaveLength(1)

    // Save a user preset and optimizer settings
    const fakePreset = {
      schema: 'gi-optimizer/preset@1' as const,
      id: 'user/test-preset',
      name: 'Test Preset',
      description: '',
      source: 'user' as const,
      author: 'local',
      target: 'Furina' as const,
      team: [],
      enemy: { level: 100, overrides: {} },
      teamConditional: { resonance: {}, reaction: {} },
      rotation: { name: 'Rot', repeat: 1, targets: [] },
    }
    await saveUserPreset(fakePreset as never)
    await saveSettings({
      includeEquippedOnOthers: false,
      excludedCharacters: ['Neuvillette'],
      mainStatAssumptionLevel: 20,
      levelLow: 16,
      levelHigh: 20,
      topN: 5,
    })

    // Clearing GOOD data must NOT affect user presets or optimizer settings
    await clearGood()
    expect(await loadGood()).toBeUndefined()

    const presets = await listUserPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0]?.id).toBe('user/test-preset')

    const settings = await loadSettings()
    expect(settings?.mainStatAssumptionLevel).toBe(20)
    expect(settings?.includeEquippedOnOthers).toBe(false)

    await deleteUserPreset('user/test-preset')
    expect(await listUserPresets()).toHaveLength(0)
  })
})

