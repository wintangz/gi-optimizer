import {
  getBundledPreset,
  listBundledPresets,
  resolvePresetMemberBuildMode,
  setPresetMemberBuildMode,
  type MemberBuildMode,
} from '@gi/presets'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { captureAllGoldenFixtures } from '../scripts/capture-golden'
import { createSession, DEFAULT_OPTIMIZER_SETTINGS } from '../src'

const LEGACY_TC_OFFICIAL_TOTALS: Record<string, number> = {
  'official/furina-salon-subdps': 729116.1377099456,
  'official/mavuika-melt-hypercarry': 266512.077201277,
  'official/neuvillette-hypercarry': 197288.8842440706,
  'official/hutao-double-hydro-vape': 620690.2286762865,
  'official/raiden-hypercarry': 989461.6171055227,
  'official/arlecchino-vaporize': 1504225.1495718248,
}

describe('Official Presets Owned-First Teammate Resolution (official-presets-owned-first)', () => {
  const fullGood = JSON.parse(
    readFileSync(
      resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
      'utf8'
    )
  )
  const session = createSession(fullGood)

  it('re-captures official golden fixtures without touching akasha golden fixtures', () => {
    const count = captureAllGoldenFixtures({ source: 'official' })
    expect(count).toBe(6)
  })

  it('(1) owned member present in GOOD -> uses owned build and actual-build-derived conditionals by default', () => {
    const ownedKeys = new Set<string>(
      fullGood.characters.map((c: { key: string }) => c.key)
    )
    const mavuikaPreset = getBundledPreset('official/mavuika-melt-hypercarry')!

    // All teammates (Citlali, Xilonen, Bennett) exist in Van GOOD and resolve to 'owned' by default
    for (const member of mavuikaPreset.team.slice(1)) {
      const resolved = resolvePresetMemberBuildMode({
        presetSource: mavuikaPreset.source,
        isTarget: false,
        memberBuildType: member.build.type,
        characterKey: member.key,
        ownedCharKeys: ownedKeys,
      })
      expect(resolved).toEqual({
        characterKey: member.key,
        mode: 'owned',
        ownedInGood: true,
        forcedSimulated: false,
      })
    }

    const defaultOwnedEval = session.evaluate(mavuikaPreset)

    // In Van GOOD, Citlali's owned ThrillingTalesOfDragonSlayers is R1 (+24% ATK = +95.9603208 ATK),
    // whereas the preset's simulated TC build assumes R5 (+48% ATK = +191.9206416 ATK).
    // Replacing her equipped weapon in GOOD with a 1* weapon reduces Mavuika's ATK by R1 TTDS (+95.9603208).
    const goodWithCitlali1Star = structuredClone(fullGood)
    for (const w of goodWithCitlali1Star.weapons) {
      if (w.location === 'Citlali') {
        w.key = 'ApprenticesNotes'
        w.refinement = 1
      }
    }
    const sessionCitlali1Star = createSession(goodWithCitlali1Star)
    const evalWithoutOwnedTtds = sessionCitlali1Star.evaluate(mavuikaPreset)

    expect(
      defaultOwnedEval.stats.atk! - evalWithoutOwnedTtds.stats.atk!
    ).toBeCloseTo(95.9603208, 3)
    expect(defaultOwnedEval.total).toBeGreaterThan(evalWithoutOwnedTtds.total)

    // Toggling Citlali alone from 'owned' (R1 TTDS) to 'tc' (R5 TTDS) adds the other +24% ATK (+95.9603208)
    const evalCitlaliTc = session.evaluate(mavuikaPreset, {
      artifactIds: session.currentBuild(mavuikaPreset).artifactIds,
      memberBuildModes: { Citlali: 'tc' },
    })
    expect(evalCitlaliTc.stats.atk! - defaultOwnedEval.stats.atk!).toBeCloseTo(
      95.9603208,
      3
    )

    // Preset-authored conditionals on teammates (e.g. Xilonen's ArchaicPetra={ele:'pyro'})
    // describe the simulated build only and do NOT apply when Xilonen runs as her owned build
    // (she wears 4pc ScrollOfTheHeroOfCinderCity in Van GOOD, not ArchaicPetra).
    expect(defaultOwnedEval.stats.pyro_dmg_).toBeCloseTo(0, 5)
  })

  it('(2) toggle member to simulated (tc) -> reproduces the exact old TC totals and switches conditional source', async () => {
    const officialPresets = listBundledPresets({ source: 'official' })
    expect(officialPresets).toHaveLength(6)

    for (const preset of officialPresets) {
      const allTeammatesTc: Record<string, MemberBuildMode> = {}
      for (const m of preset.team.slice(1)) {
        allTeammatesTc[m.key] = 'tc'
      }

      const tcEval = session.evaluate(preset, {
        artifactIds: session.currentBuild(preset).artifactIds,
        memberBuildModes: allTeammatesTc,
      })
      const expectedLegacyTotal = LEGACY_TC_OFFICIAL_TOTALS[preset.id]!
      expect(tcEval.total).toBeCloseTo(expectedLegacyTotal, 2)
    }

    // Per-member toggle on official/furina-salon-subdps:
    // Toggling Zhongli from 'owned' (Tenacity 4pc, no Petra) to 'tc' (ArchaicPetra 4pc hydro + Zhongli shield)
    // switches his conditional source and adds +35% Hydro DMG to Furina.
    const furinaPreset = getBundledPreset('official/furina-salon-subdps')!
    const evalAllOwned = session.evaluate(furinaPreset)
    const evalZhongliTc = session.evaluate(furinaPreset, {
      artifactIds: session.currentBuild(furinaPreset).artifactIds,
      memberBuildModes: { Zhongli: 'tc' },
    })

    expect(
      evalZhongliTc.stats.hydro_dmg_! - evalAllOwned.stats.hydro_dmg_!
    ).toBeCloseTo(0.35, 5)
    expect(evalZhongliTc.total).toBeGreaterThan(evalAllOwned.total)

    // Also verify settings.memberBuildModes persists and drives session.optimize identically
    const smallGood = {
      ...fullGood,
      artifacts: fullGood.artifacts.filter(
        (a: { location?: string }) => a.location === 'Furina'
      ),
    }
    const smallSession = createSession(smallGood)
    const settingsWithZhongliTc = setPresetMemberBuildMode(
      DEFAULT_OPTIMIZER_SETTINGS,
      furinaPreset.id,
      'Zhongli',
      'tc'
    )
    const optRes = await smallSession.optimize(
      furinaPreset,
      { ...settingsWithZhongliTc, topN: 1 }
    )
    expect(optRes.builds).toHaveLength(1)
    expect(optRes.builds[0]!.memberBuildModes).toEqual({ Zhongli: 'tc' })
    expect(optRes.builds[0]!.total).toBeCloseTo(evalZhongliTc.total, 2)
  })

  it('(3) character absent from GOOD -> automatically runs as simulated (tc) build and flags forcedSimulated', () => {
    const furinaPreset = getBundledPreset('official/furina-salon-subdps')!

    // Remove all non-target teammates (Neuvillette, KaedeharaKazuha, Zhongli) from GOOD characters
    const goodOnlyTarget = {
      ...fullGood,
      characters: fullGood.characters.filter(
        (c: { key: string }) => c.key === 'Furina'
      ),
    }
    const ownedKeys = new Set<string>(
      goodOnlyTarget.characters.map((c: { key: string }) => c.key)
    )

    for (const member of furinaPreset.team.slice(1)) {
      const resolved = resolvePresetMemberBuildMode({
        presetSource: furinaPreset.source,
        isTarget: false,
        memberBuildType: member.build.type,
        characterKey: member.key,
        ownedCharKeys: ownedKeys,
        // Even if overrideMode is 'owned', unowned characters are forced to 'tc'
        overrideMode: 'owned',
      })
      expect(resolved).toEqual({
        characterKey: member.key,
        mode: 'tc',
        ownedInGood: false,
        forcedSimulated: true,
      })
    }

    const sessionOnlyTarget = createSession(goodOnlyTarget)
    const evalUnownedTeammates = sessionOnlyTarget.evaluate(furinaPreset)

    // Because all 3 teammates are absent from GOOD, they all fall back to their simulated TC builds
    // and produce the exact legacy TC rotation total!
    expect(evalUnownedTeammates.total).toBeCloseTo(
      LEGACY_TC_OFFICIAL_TOTALS['official/furina-salon-subdps']!,
      2
    )
  })
})
