import {
  DEFAULT_OPTIMIZER_SETTINGS,
  getBundledPreset,
  type OptimizerSettings,
} from '@gi/presets'
import type { IArtifact } from '@gi/good'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const hookStore = {
  active: false,
  states: [] as unknown[],
  stateIdx: 0,
  reset() {
    this.states = []
    this.stateIdx = 0
  },
  beginRender() {
    this.stateIdx = 0
  },
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState<T>(initial: T | (() => T)) {
      if (!hookStore.active) {
        return actual.useState(initial)
      }
      const idx = hookStore.stateIdx++
      if (idx >= hookStore.states.length) {
        hookStore.states.push(
          typeof initial === 'function' ? (initial as () => T)() : initial
        )
      }
      const setState = (next: T | ((prev: T) => T)) => {
        const prevVal = hookStore.states[idx] as T
        const nextVal =
          typeof next === 'function' ? (next as (prev: T) => T)(prevVal) : next
        hookStore.states[idx] = nextVal
      }
      return [hookStore.states[idx] as T, setState] as const
    },
  }
})

import {
  BuildComparisonList,
  ConstraintsCard,
  formatCoreStatComparison,
  formatRelativeDelta,
  rankWeaponComparisonRows,
  resolveWeaponCompareCandidate,
  WeaponComparisonList,
  WeaponComparisonPanel,
} from '../src/components/OptimizeViews'

interface VNode {
  type: string
  props: Record<string, unknown>
  children: Array<VNode | string>
}

function evaluateTree(node: unknown): Array<VNode | string> {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return []
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)]
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => evaluateTree(child))
  }
  if (typeof node === 'object' && 'type' in (node as Record<string, unknown>)) {
    const el = node as {
      type: unknown
      props?: Record<string, unknown>
    }
    const props = el.props ?? {}
    if (typeof el.type === 'function') {
      const rendered = (el.type as (p: Record<string, unknown>) => unknown)(
        props
      )
      return evaluateTree(rendered)
    }
    if (typeof el.type === 'string') {
      const children = evaluateTree(props.children)
      return [{ type: el.type, props, children }]
    }
    return evaluateTree(props.children)
  }
  return []
}

function findByTestId(
  nodes: Array<VNode | string>,
  testId: string
): VNode | undefined {
  for (const n of nodes) {
    if (typeof n === 'string') continue
    if (n.props['data-testid'] === testId) return n
    const found = findByTestId(n.children, testId)
    if (found) return found
  }
  return undefined
}

describe('Optimize Experience UI Components (optimize-experience-ui)', () => {
  afterEach(() => {
    hookStore.reset()
  })
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

  it('stat-constraint-input-fix: typing "1" in a percent-stat field leaves "1" (commits as 1, not 100), holds raw text while focused, and clearing a bound removes it', () => {
    let currentSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      constraints: [
        { stat: 'critRate_', min: 60, max: 90 },
        { stat: 'enerRech_', min: 160 },
      ],
    }

    function renderCard(): VNode[] {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          React.createElement(ConstraintsCard, {
            settings: currentSettings,
            onChange: (next) => {
              currentSettings = next
            },
          })
        ).filter((n): n is VNode => typeof n !== 'string')
      } finally {
        hookStore.active = false
      }
    }

    // 1. Type "1" into critRate_ Min -> stays "1" while focused and commits as 1 (never "100")
    let tree = renderCard()
    const crMinInput = findByTestId(tree, 'constraint-min-critRate_')!
    expect(crMinInput.props.value).toBe('60')

    ;(crMinInput.props.onFocus as () => void)()
    tree = renderCard()
    ;(
      findByTestId(tree, 'constraint-min-critRate_')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '1' } })

    tree = renderCard()
    expect(findByTestId(tree, 'constraint-min-critRate_')!.props.value).toBe(
      '1'
    )
    expect(currentSettings.constraints?.[0]?.min).toBe(1)

    // Blur commits "1" and keeps displayed value as "1" (not "100")
    ;(
      findByTestId(tree, 'constraint-min-critRate_')!.props.onBlur as () => void
    )()
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-min-critRate_')!.props.value).toBe(
      '1'
    )
    expect(currentSettings.constraints?.[0]?.min).toBe(1)

    // Same for enerRech_ Min: typing "1" (e.g. first keystroke of "175") stays "1", never "100"
    const erMinInput = findByTestId(tree, 'constraint-min-enerRech_')!
    ;(erMinInput.props.onFocus as () => void)()
    tree = renderCard()
    ;(
      findByTestId(tree, 'constraint-min-enerRech_')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '1' } })
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-min-enerRech_')!.props.value).toBe(
      '1'
    )
    expect(currentSettings.constraints?.[1]?.min).toBe(1)

    // Raw text with trailing decimal ("175.") is preserved while focused until blur
    ;(
      findByTestId(tree, 'constraint-min-enerRech_')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '175.' } })
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-min-enerRech_')!.props.value).toBe(
      '175.'
    )
    ;(
      findByTestId(tree, 'constraint-min-enerRech_')!.props.onBlur as () => void
    )()
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-min-enerRech_')!.props.value).toBe(
      '175'
    )
    expect(currentSettings.constraints?.[1]?.min).toBe(175)

    // 2. Clearing a bound (deleting every character to "") removes that bound and never snaps back
    const crMaxInput = findByTestId(tree, 'constraint-max-critRate_')!
    expect(crMaxInput.props.value).toBe('90')
    ;(crMaxInput.props.onFocus as () => void)()
    tree = renderCard()
    ;(
      findByTestId(tree, 'constraint-max-critRate_')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '' } })
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-max-critRate_')!.props.value).toBe('')
    ;(
      findByTestId(tree, 'constraint-max-critRate_')!.props.onBlur as () => void
    )()
    tree = renderCard()
    expect(findByTestId(tree, 'constraint-max-critRate_')!.props.value).toBe('')
    expect(currentSettings.constraints?.[0]?.max).toBeUndefined()
    expect('max' in (currentSettings.constraints?.[0] ?? {})).toBe(false)
    expect(currentSettings.constraints?.[0]).toEqual({
      stat: 'critRate_',
      min: 1,
    })
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

  it('weapon-compare: renders WeaponComparisonPanel with multi-select weapon tiles, owned GOOD copy vs Lv.90/A6/R1 unowned defaults, per-weapon Level/Ascension/Refinement controls, and WeaponComparisonList with ranked rows, % behind leader, Current Baseline marker, and "No build meets constraints"', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const sampleGood = {
      format: 'GOOD' as const,
      version: 2,
      source: 'test',
      characters: [],
      weapons: [
        {
          id: 'w_fav_furina',
          key: 'FavoniusSword',
          level: 80,
          ascension: 5 as const,
          refinement: 4 as const,
          location: 'Furina',
          lock: true,
        },
      ],
      artifacts: [],
    }

    const favCand = resolveWeaponCompareCandidate(
      'FavoniusSword',
      'Furina',
      sampleGood
    )
    const splendorCand = resolveWeaponCompareCandidate(
      'SplendorOfTranquilWaters',
      'Furina',
      sampleGood
    )

    // Owned weapon defaults to GOOD copy (Lv.80 / A5 / R4, equipped baseline)
    expect(favCand).toEqual({
      weaponKey: 'FavoniusSword',
      level: 80,
      ascension: 5,
      refinement: 4,
      isOwned: true,
      ownedWeaponId: 'w_fav_furina',
      isEquippedBaseline: true,
    })

    // Unowned weapon defaults to Lv.90 / A6 / R1
    expect(splendorCand).toEqual({
      weaponKey: 'SplendorOfTranquilWaters',
      level: 90,
      ascension: 6,
      refinement: 1,
      isOwned: false,
      isEquippedBaseline: false,
    })

    const panelHtml = renderToStaticMarkup(
      <WeaponComparisonPanel
        targetCharacterKey="Furina"
        good={sampleGood}
        selectedCandidates={[favCand, splendorCand]}
        onChangeCandidates={() => {}}
      />
    )

    expect(panelHtml).toContain('data-testid="weapon-compare-panel"')
    expect(panelHtml).toContain('data-testid="weapon-compare-config-FavoniusSword"')
    expect(panelHtml).toContain(
      'data-testid="weapon-compare-config-SplendorOfTranquilWaters"'
    )
    expect(panelHtml).toContain(
      'data-testid="weapon-compare-config-baseline-FavoniusSword"'
    )
    expect(panelHtml).toContain(
      'data-testid="weapon-compare-config-unowned-SplendorOfTranquilWaters"'
    )
    expect(panelHtml).toContain('data-testid="weapon-compare-level-FavoniusSword"')
    expect(panelHtml).toContain(
      'data-testid="weapon-compare-ascension-FavoniusSword"'
    )
    expect(panelHtml).toContain(
      'data-testid="weapon-compare-refinement-FavoniusSword"'
    )

    // Ranked comparison results: #1 FavoniusSword (400,000, Current Baseline), #2 FleuveCendreFerryman (360,000 -> -10.0% behind leader), and SplendorOfTranquilWaters ('unmet' -> "No build meets constraints")
    const fleuveCand = {
      weaponKey: 'FleuveCendreFerryman',
      level: 90,
      ascension: 6,
      refinement: 5,
      isOwned: false,
      isEquippedBaseline: false,
    }
    const baseStats = {
      hp: 39000,
      atk: 1200,
      def: 850,
      eleMas: 40,
      enerRech_: 2.05,
      critRate_: 0.8,
      critDMG_: 1.75,
    }
    const ranked = rankWeaponComparisonRows([
      {
        candidate: splendorCand,
        status: 'unmet',
        rank: null,
        total: null,
        percentBehindLeader: null,
        bestBuild: null,
        evaluation: null,
        tested: 12,
        skipped: 4,
        durationMs: 5,
      },
      {
        candidate: fleuveCand,
        status: 'ok',
        rank: null,
        total: 360000,
        percentBehindLeader: null,
        bestBuild: {
          weaponOverride: {
            key: 'FleuveCendreFerryman',
            level: 90,
            ascension: 6,
            refinement: 5,
          },
          artifactIds: {},
          total: 360000,
        },
        evaluation: {
          total: 360000,
          stats: baseStats,
          instances: [],
        },
        tested: 20,
        skipped: 5,
        durationMs: 8,
      },
      {
        candidate: favCand,
        status: 'ok',
        rank: null,
        total: 400000,
        percentBehindLeader: null,
        bestBuild: {
          weaponOverride: {
            key: 'FavoniusSword',
            level: 80,
            ascension: 5,
            refinement: 4,
          },
          artifactIds: {},
          total: 400000,
        },
        evaluation: {
          total: 400000,
          stats: baseStats,
          instances: [
            {
              label: 'Gentilhomme Usher DMG',
              path: ['skill', 'usherDmg'],
              count: 7,
              perHit: 25000,
              subtotal: 175000,
            },
          ],
        },
        tested: 20,
        skipped: 5,
        durationMs: 8,
      },
    ])

    const listHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={ranked}
        artifactById={new Map()}
      />
    )

    // Order: #1 FavoniusSword, #2 FleuveCendreFerryman, then unmet SplendorOfTranquilWaters
    const favIdx = listHtml.indexOf(
      'data-testid="weapon-compare-row-FavoniusSword"'
    )
    const fleuveIdx = listHtml.indexOf(
      'data-testid="weapon-compare-row-FleuveCendreFerryman"'
    )
    const splendorIdx = listHtml.indexOf(
      'data-testid="weapon-compare-row-SplendorOfTranquilWaters"'
    )
    expect(favIdx).toBeGreaterThan(-1)
    expect(fleuveIdx).toBeGreaterThan(favIdx)
    expect(splendorIdx).toBeGreaterThan(fleuveIdx)

    // Current Baseline badge on FavoniusSword, -10.0% behind leader on FleuveCendreFerryman, and "No build meets constraints" on SplendorOfTranquilWaters
    expect(listHtml).toContain(
      'data-testid="weapon-compare-baseline-badge-FavoniusSword"'
    )
    expect(listHtml).toContain('>Current Baseline<')
    expect(listHtml).toContain('data-delta-ascii="-10.0%"')
    expect(listHtml).toContain('>−10.0%<')
    expect(listHtml).toContain(
      'data-testid="weapon-compare-unmet-SplendorOfTranquilWaters"'
    )
    expect(listHtml).toContain('>No build meets constraints<')
    expect(listHtml).toContain('data-testid="weapon-compare-details-FavoniusSword"')
  })

  it('formats core stat comparisons with current -> build -> signed diff and ok/error/muted classes', () => {
    // Flat stat increase
    expect(formatCoreStatComparison('hp', 41200, 38500)).toEqual({
      currentText: (38500).toLocaleString(),
      buildText: (41200).toLocaleString(),
      diffText: `+${(2700).toLocaleString()}`,
      asciiDiffText: `+${(2700).toLocaleString()}`,
      sign: '+',
      cls: 'ok',
    })

    // Flat stat decrease
    expect(formatCoreStatComparison('atk', 1150, 1210)).toEqual({
      currentText: (1210).toLocaleString(),
      buildText: (1150).toLocaleString(),
      diffText: '−60',
      asciiDiffText: '-60',
      sign: '-',
      cls: 'error',
    })

    // Flat stat unchanged
    expect(formatCoreStatComparison('def', 850, 850)).toEqual({
      currentText: '850',
      buildText: '850',
      diffText: '0',
      asciiDiffText: '0',
      sign: '0',
      cls: 'muted',
    })

    // Percent stat increase
    expect(formatCoreStatComparison('critDMG_', 2.15, 1.924)).toEqual({
      currentText: '192.4%',
      buildText: '215.0%',
      diffText: '+22.6%',
      asciiDiffText: '+22.6%',
      sign: '+',
      cls: 'ok',
    })

    // Percent stat decrease
    expect(formatCoreStatComparison('enerRech_', 1.5, 1.62)).toEqual({
      currentText: '162.0%',
      buildText: '150.0%',
      diffText: '−12.0%',
      asciiDiffText: '-12.0%',
      sign: '-',
      cls: 'error',
    })

    // Percent stat unchanged
    expect(formatCoreStatComparison('critRate_', 0.785, 0.785)).toEqual({
      currentText: '78.5%',
      buildText: '78.5%',
      diffText: '0.0%',
      asciiDiffText: '0.0%',
      sign: '0',
      cls: 'muted',
    })

    // Plain mode (no baseline)
    expect(formatCoreStatComparison('critRate_', 0.785)).toEqual({
      currentText: null,
      buildText: '78.5%',
      diffText: null,
      asciiDiffText: null,
      sign: null,
      cls: 'muted',
    })
  })

  it('shows core stat diffs in BuildComparisonList and WeaponComparisonList expanded Details against Current, and plain stats when the row IS Current or no Current baseline exists', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const currentStats = {
      hp: 38500,
      atk: 1210,
      def: 850,
      eleMas: 40,
      enerRech_: 1.62,
      critRate_: 0.785,
      critDMG_: 1.924,
    }
    const optStats = {
      hp: 41200, // +2,700 (ok)
      atk: 1150, // -60 (error)
      def: 850, // 0 (muted)
      eleMas: 80, // +40 (ok)
      enerRech_: 1.5, // -12.0% (error)
      critRate_: 0.785, // 0.0% (muted)
      critDMG_: 2.15, // +22.6% (ok)
    }

    // 1. BuildComparisonList: expanded optimized build (#1) with Current baseline
    const optExpandedHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 300000, stats: currentStats, instances: [] },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 330000,
            evaluation: { total: 330000, stats: optStats, instances: [] },
          },
        ]}
      />
    )

    expect(optExpandedHtml).toContain(
      'data-testid="comp-stat-diffs-opt-0" data-mode="diff"'
    )
    expect(optExpandedHtml).toContain('Core Stat Comparison vs. Current')
    // All 7 core stats present with current -> build -> signed diff
    for (const statKey of [
      'hp',
      'atk',
      'def',
      'eleMas',
      'enerRech_',
      'critRate_',
      'critDMG_',
    ]) {
      expect(optExpandedHtml).toContain(
        `data-testid="comp-stat-row-opt-0-${statKey}"`
      )
      expect(optExpandedHtml).toContain(
        `data-testid="comp-stat-current-opt-0-${statKey}"`
      )
      expect(optExpandedHtml).toContain(
        `data-testid="comp-stat-value-opt-0-${statKey}"`
      )
      expect(optExpandedHtml).toContain(
        `data-testid="comp-stat-diff-opt-0-${statKey}"`
      )
    }
    // Check green (ok), red (error), grey (muted) classes and signed values
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta ok" data-testid="comp-stat-diff-opt-0-hp" data-diff-sign="+" data-diff-ascii="+2,700">+2,700<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta error" data-testid="comp-stat-diff-opt-0-atk" data-diff-sign="-" data-diff-ascii="-60">−60<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-def" data-diff-sign="0" data-diff-ascii="0">0<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta error" data-testid="comp-stat-diff-opt-0-enerRech_" data-diff-sign="-" data-diff-ascii="-12.0%">−12.0%<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-critRate_" data-diff-sign="0" data-diff-ascii="0.0%">0.0%<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta ok" data-testid="comp-stat-diff-opt-0-critDMG_" data-diff-sign="+" data-diff-ascii="+22.6%">+22.6%<'
    )

    // 2. BuildComparisonList: expanded Current build row shows plain stats with no diff column
    const currentExpandedHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="current"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 300000, stats: currentStats, instances: [] },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 330000,
            evaluation: { total: 330000, stats: optStats, instances: [] },
          },
        ]}
      />
    )
    expect(currentExpandedHtml).toContain(
      'data-testid="comp-stat-diffs-current" data-mode="plain"'
    )
    expect(currentExpandedHtml).toContain('Core Build Stats')
    expect(currentExpandedHtml).not.toContain(
      'data-testid="comp-stat-diff-current-hp"'
    )
    expect(currentExpandedHtml).toContain(
      'data-testid="comp-stat-value-current-hp"'
    )

    // 3. BuildComparisonList: no Current baseline exists (currentBuild={null}) -> plain stats with no diff column
    const noBaselineHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        currentBuild={null}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 330000,
            evaluation: { total: 330000, stats: optStats, instances: [] },
          },
        ]}
      />
    )
    expect(noBaselineHtml).toContain(
      'data-testid="comp-stat-diffs-opt-0" data-mode="plain"'
    )
    expect(noBaselineHtml).not.toContain(
      'data-testid="comp-stat-diff-opt-0-hp"'
    )

    // 4. WeaponComparisonList: expanded weapon row shows stat diffs against Current build when currentBuild is provided, and plain stats when currentBuild is null
    const rankedWeapons = rankWeaponComparisonRows([
      {
        candidate: {
          weaponKey: 'SplendorOfTranquilWaters',
          level: 90,
          ascension: 6,
          refinement: 1,
          isOwned: false,
          isEquippedBaseline: false,
        },
        status: 'ok',
        rank: null,
        total: 420000,
        percentBehindLeader: null,
        bestBuild: {
          weaponOverride: {
            key: 'SplendorOfTranquilWaters',
            level: 90,
            ascension: 6,
            refinement: 1,
          },
          artifactIds: {},
          total: 420000,
        },
        evaluation: {
          total: 420000,
          stats: optStats,
          instances: [],
        },
        tested: 10,
        skipped: 2,
        durationMs: 4,
      },
    ])

    const weaponDiffHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 300000, stats: currentStats, instances: [] },
        }}
      />
    )
    expect(weaponDiffHtml).toContain(
      'data-testid="comp-stat-diffs-SplendorOfTranquilWaters" data-mode="diff"'
    )
    expect(weaponDiffHtml).toContain(
      'data-testid="comp-stat-diff-SplendorOfTranquilWaters-critDMG_" data-diff-sign="+" data-diff-ascii="+22.6%">+22.6%<'
    )

    const weaponPlainHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
        currentBuild={null}
      />
    )
    expect(weaponPlainHtml).toContain(
      'data-testid="comp-stat-diffs-SplendorOfTranquilWaters" data-mode="plain"'
    )
    expect(weaponPlainHtml).not.toContain(
      'data-testid="comp-stat-diff-SplendorOfTranquilWaters-critDMG_"'
    )
  })
})
