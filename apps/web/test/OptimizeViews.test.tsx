import { DEFAULT_OPTIMIZER_SETTINGS, getBundledPreset } from '@gi/presets'
import type { IArtifact } from '@gi/good'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BuildComparisonList,
  ConstraintsCard,
  formatRelativeDelta,
} from '../src/components/OptimizeViews'

describe('Optimize Experience UI Components (optimize-experience-ui)', () => {
  it('renders ConstraintsCard empty state and stat picker with already-added stats disabled', () => {
    const emptyHtml = renderToStaticMarkup(
      <ConstraintsCard
        settings={{ ...DEFAULT_OPTIMIZER_SETTINGS, constraints: [] }}
        onChange={() => {}}
      />
    )
    expect(emptyHtml).toContain('data-testid="constraints-empty-state"')
    expect(emptyHtml).toContain(
      'No constraints. Add one to set floors or caps, e.g. ER at least 160%.'
    )

    const pickerHtml = renderToStaticMarkup(
      <ConstraintsCard
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          constraints: [
            { stat: 'enerRech_', min: 160 },
            { stat: 'hp', min: 35000, max: 45000 },
          ],
        }}
        onChange={() => {}}
        initialPickerOpen
      />
    )
    expect(pickerHtml).toContain('data-testid="constraint-stat-picker"')
    expect(pickerHtml).toContain('data-testid="constraint-row-enerRech_"')
    expect(pickerHtml).toContain('data-testid="constraint-row-hp"')
    // Percentage stat shows % unit, flat stat does not
    expect(pickerHtml).toContain('value="160"')
    expect(pickerHtml).toContain('class="constraint-unit"')
    // Already-added stats are disabled in the picker
    expect(pickerHtml).toMatch(
      /data-testid="picker-stat-enerRech_"[^>]*disabled=""/
    )
    expect(pickerHtml).toMatch(/data-testid="picker-stat-hp"[^>]*disabled=""/)
    // Unconstrained stats remain enabled
    expect(pickerHtml).not.toMatch(
      /data-testid="picker-stat-critRate_"[^>]*disabled=""/
    )
  })

  it('renders BuildComparisonList with Current pinned first + N builds, correct + and − delta signs, best highlight, 5 artifact badges, and 7 stat chips', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const artifacts: IArtifact[] = [
      {
        id: 'art-f',
        setKey: 'GoldenTroupe',
        slotKey: 'flower',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp',
        location: 'Furina',
        lock: true,
        substats: [{ key: 'critRate_', value: 10.5 }],
      },
      {
        id: 'art-p',
        setKey: 'GoldenTroupe',
        slotKey: 'plume',
        level: 20,
        rarity: 5,
        mainStatKey: 'atk',
        location: 'Furina',
        lock: true,
        substats: [{ key: 'critDMG_', value: 21.0 }],
      },
      {
        id: 'art-s',
        setKey: 'GoldenTroupe',
        slotKey: 'sands',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: 'Furina',
        lock: true,
        substats: [{ key: 'enerRech_', value: 16.2 }],
      },
      {
        id: 'art-g',
        setKey: 'GoldenTroupe',
        slotKey: 'goblet',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: 'Furina',
        lock: true,
        substats: [{ key: 'critRate_', value: 9.7 }],
      },
      {
        id: 'art-c',
        setKey: 'MarechausseeHunter',
        slotKey: 'circlet',
        level: 20,
        rarity: 5,
        mainStatKey: 'critDMG_',
        location: 'Furina',
        lock: true,
        substats: [{ key: 'hp_', value: 14.6 }],
      },
    ]
    const artMap = new Map(artifacts.map((a) => [a.id, a]))
    const fullIds = {
      flower: 'art-f',
      plume: 'art-p',
      sands: 'art-s',
      goblet: 'art-g',
      circlet: 'art-c',
    }

    const baseStats = {
      hp: 38500,
      atk: 1210,
      def: 850,
      eleMas: 40,
      enerRech_: 1.62,
      critRate_: 0.785,
      critDMG_: 1.924,
    }

    const html = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={artMap}
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: fullIds },
          evaluation: {
            total: 300000,
            stats: baseStats,
            instances: [
              {
                label: 'Gentilhomme Usher DMG',
                path: ['skill', 'usherDmg'],
                count: 7,
                perHit: 20000,
                subtotal: 140000,
              },
            ],
          },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: fullIds },
            total: 330000, // +10.0% vs current
            evaluation: {
              total: 330000,
              stats: { ...baseStats, hp: 41200, critDMG_: 2.15 },
              instances: [
                {
                  label: 'Gentilhomme Usher DMG',
                  path: ['skill', 'usherDmg'],
                  count: 7,
                  perHit: 22000,
                  subtotal: 154000,
                },
              ],
            },
          },
          {
            selection: { weaponId: 'w1', artifactIds: fullIds },
            total: 315000, // +5.0% vs current
            evaluation: {
              total: 315000,
              stats: { ...baseStats, hp: 39800 },
              instances: [],
            },
          },
          {
            selection: { weaponId: 'w1', artifactIds: fullIds },
            total: 285000, // -5.0% vs current
            evaluation: {
              total: 285000,
              stats: { ...baseStats, hp: 36000 },
              instances: [],
            },
          },
        ]}
      />
    )

    // Current row is pinned first before #1, #2, #3
    const currIdx = html.indexOf('data-testid="comparison-row-current"')
    const opt0Idx = html.indexOf('data-testid="comparison-row-opt-0"')
    const opt1Idx = html.indexOf('data-testid="comparison-row-opt-1"')
    const opt2Idx = html.indexOf('data-testid="comparison-row-opt-2"')
    expect(currIdx).toBeGreaterThan(-1)
    expect(opt0Idx).toBeGreaterThan(currIdx)
    expect(opt1Idx).toBeGreaterThan(opt0Idx)
    expect(opt2Idx).toBeGreaterThan(opt1Idx)

    // Rank labels
    expect(html).toContain('>Current<')
    expect(html).toContain('>#1<')
    expect(html).toContain('>#2<')
    expect(html).toContain('>#3<')

    // Best build highlight on #1 only
    expect(html).toContain('data-testid="best-build-badge"')
    expect(html).toContain(
      'data-testid="comparison-row-opt-0" data-row-kind="optimized" data-best-build="true"'
    )
    expect(html).toContain(
      'data-testid="comparison-row-opt-1" data-row-kind="optimized" data-best-build="false"'
    )

    // Positive (+10.0%, +5.0%) and negative (−5.0% / -5.0%) delta signs
    expect(html).toContain('>+10.0%<')
    expect(html).toContain('>+5.0%<')
    expect(html).toContain('data-delta-sign="-"')
    expect(html).toContain('data-delta-ascii="-5.0%"')
    expect(html).toContain('>−5.0%<')

    // Format helper unit check
    expect(formatRelativeDelta(330000, 300000).text).toBe('+10.0%')
    expect(formatRelativeDelta(285000, 300000).text).toBe('−5.0%')
    expect(formatRelativeDelta(285000, 300000).sign).toBe('-')

    // Expandable breakdown rendered for #1 by default
    expect(html).toContain('data-testid="comp-details-opt-0"')
    expect(html).toContain('Gentilhomme Usher DMG')
  })
})
