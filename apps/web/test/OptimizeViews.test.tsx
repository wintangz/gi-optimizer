import {
  DEFAULT_OPTIMIZER_SETTINGS,
  getBundledPreset,
  type OptimizerSettings,
} from '@gi/presets'
import type { IArtifact } from '@gi/good'
import fs from 'node:fs'
import path from 'node:path'
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
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      if (!hookStore.active) {
        return actual.useMemo(factory, deps ?? [])
      }
      return factory()
    },
    useEffect(fn: () => void | (() => void), deps?: readonly unknown[]) {
      if (!hookStore.active) {
        return actual.useEffect(fn, deps)
      }
    },
  }
})

import type { WeaponCompareCandidate } from '@gi/engine'
import { formatHumanConditionalEntry } from '../src/components/ConditionalTogglePanel'
import {
  BuildComparisonList,
  ConstraintsCard,
  formatCoreStatComparison,
  formatParseIssuePlain,
  formatRelativeDelta,
  formatRotationRowLabel,
  humanizeFormulaPath,
  PresetRotationSummary,
  rankWeaponComparisonRows,
  resetSolverPoolFiltersExpandedSession,
  resolveWeaponCompareCandidate,
  SolverPoolFiltersPanel,
  TeamOptimizationList,
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
    resetSolverPoolFiltersExpandedSession()
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

    // Current badge on FavoniusSword, -10.0% behind leader on FleuveCendreFerryman, and "No build meets constraints" on SplendorOfTranquilWaters
    expect(listHtml).toContain(
      'data-testid="weapon-compare-baseline-badge-FavoniusSword"'
    )
    expect(listHtml).toContain('>Current<')
    expect(listHtml).not.toContain('>Current Baseline<')
    expect(listHtml).toContain('data-delta-ascii="-10.0%"')
    expect(listHtml).toContain('>−10.0% vs. leader<')
    expect(listHtml).toContain(
      'data-testid="weapon-compare-unmet-SplendorOfTranquilWaters"'
    )
    expect(listHtml).toContain('>No build meets constraints<')
    expect(listHtml).toContain('data-testid="weapon-compare-details-FavoniusSword"')
  })

  it('formats core stat comparisons with current -> build -> signed diff and ok/error/muted classes', () => {
    // Flat stat increase: relative % by default, raw signed delta in rawDiffText (stat-diff-percent)
    expect(formatCoreStatComparison('hp', 41200, 38500)).toEqual({
      currentText: (38500).toLocaleString(),
      buildText: (41200).toLocaleString(),
      diffText: '+7.0%',
      asciiDiffText: '+7.0%',
      rawDiffText: `+${(2700).toLocaleString()}`,
      asciiRawDiffText: `+${(2700).toLocaleString()}`,
      sign: '+',
      cls: 'ok',
    })

    // +489 HP on 18,554 -> +2.6% with raw +489
    expect(formatCoreStatComparison('hp', 19043, 18554)).toEqual({
      currentText: (18554).toLocaleString(),
      buildText: (19043).toLocaleString(),
      diffText: '+2.6%',
      asciiDiffText: '+2.6%',
      rawDiffText: '+489',
      asciiRawDiffText: '+489',
      sign: '+',
      cls: 'ok',
    })

    // Flat stat decrease
    expect(formatCoreStatComparison('atk', 1150, 1210)).toEqual({
      currentText: (1210).toLocaleString(),
      buildText: (1150).toLocaleString(),
      diffText: '−5.0%',
      asciiDiffText: '-5.0%',
      rawDiffText: '−60',
      asciiRawDiffText: '-60',
      sign: '-',
      cls: 'muted',
    })

    // Flat stat unchanged
    expect(formatCoreStatComparison('def', 850, 850)).toEqual({
      currentText: '850',
      buildText: '850',
      diffText: '0.0%',
      asciiDiffText: '0.0%',
      rawDiffText: '0',
      asciiRawDiffText: '0',
      sign: '0',
      cls: 'muted',
    })

    // Flat stat with 0 Current baseline (e.g. 0 EM -> 40 EM) falls back to raw number
    expect(formatCoreStatComparison('eleMas', 40, 0)).toEqual({
      currentText: '0',
      buildText: '40',
      diffText: '+40',
      asciiDiffText: '+40',
      rawDiffText: '+40',
      asciiRawDiffText: '+40',
      sign: '+',
      cls: 'ok',
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
      cls: 'muted',
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
    // Check green (ok) and neutral/muted (muted) classes, relative % for flat stats + raw delta tooltip, and point diffs for % stats
    expect(optExpandedHtml).toContain(
      `class="comp-stat-num comp-stat-diff-delta ok" data-testid="comp-stat-diff-opt-0-hp" data-diff-sign="+" data-diff-ascii="+7.0%" data-raw-diff="+${(2700).toLocaleString()}" data-raw-diff-ascii="+${(2700).toLocaleString()}" title="+${(2700).toLocaleString()}">+7.0%<`
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-atk" data-diff-sign="-" data-diff-ascii="-5.0%" data-raw-diff="−60" data-raw-diff-ascii="-60" title="−60">−5.0%<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-def" data-diff-sign="0" data-diff-ascii="0.0%" data-raw-diff="0" data-raw-diff-ascii="0" title="0">0.0%<'
    )
    expect(optExpandedHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-enerRech_" data-diff-sign="-" data-diff-ascii="-12.0%">−12.0%<'
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

  it('surfaces reaction chips (styled by element), explicit "No reaction" markers, and hit modes from structured rotation fields without relying on label text (rotation-breakdown-reactions)', () => {
    const basePreset = getBundledPreset('official/mavuika-melt-hypercarry')!
    // Strip any "(Melt)" or "(No Reaction)" from labels to prove we read rt.reaction and rt.hitMode, not label text
    const preset = {
      ...basePreset,
      rotation: {
        ...basePreset.rotation,
        targets: [
          {
            path: ['burst', 'skillDmg'],
            count: 1,
            label: 'Plain Label Alpha',
            hitMode: 'avgHit' as const,
            reaction: 'melt' as const,
            bonusStats: {},
          },
          {
            path: ['skill', 'chargedCyclicDmg'],
            count: 4,
            label: 'Plain Label Beta',
            hitMode: 'critHit' as const,
            bonusStats: {},
          },
          {
            path: ['skill', 'chargedFinalDmg'],
            count: 1,
            label: 'Plain Label Gamma',
            hitMode: 'hit' as const,
            reaction: 'vaporize' as const,
            bonusStats: {},
          },
        ],
      },
    }

    const sampleInstances = [
      {
        label: 'Plain Label Alpha',
        path: ['burst', 'skillDmg'],
        count: 1,
        perHit: 400000,
        subtotal: 400000,
      },
      {
        label: 'Plain Label Beta',
        path: ['skill', 'chargedCyclicDmg'],
        count: 4,
        perHit: 50000,
        subtotal: 200000,
      },
      {
        label: 'Plain Label Gamma',
        path: ['skill', 'chargedFinalDmg'],
        count: 1,
        perHit: 120000,
        subtotal: 120000,
      },
    ]

    // 1. PresetRotationSummary
    const summaryHtml = renderToStaticMarkup(
      <PresetRotationSummary preset={preset} />
    )
    expect(summaryHtml).toContain('data-testid="preset-rotation-summary"')
    expect(summaryHtml).toContain(
      'data-testid="rotation-reaction-chip" data-reaction="melt" data-element="cryo"'
    )
    expect(summaryHtml).toContain('>Melt<')
    expect(summaryHtml).toContain(
      'data-testid="rotation-no-reaction" data-reaction="none"'
    )
    expect(summaryHtml).toContain('>No reaction<')
    expect(summaryHtml).toContain(
      'data-testid="rotation-reaction-chip" data-reaction="vaporize" data-element="hydro"'
    )
    expect(summaryHtml).toContain('>Vaporize<')
    expect(summaryHtml).toContain(
      'data-testid="rotation-hit-mode" data-hit-mode="avgHit"'
    )
    expect(summaryHtml).toContain('>Avg Hit<')
    expect(summaryHtml).toContain(
      'data-testid="rotation-hit-mode" data-hit-mode="critHit"'
    )
    expect(summaryHtml).toContain('>Crit Hit<')
    expect(summaryHtml).toContain(
      'data-testid="rotation-hit-mode" data-hit-mode="hit"'
    )
    expect(summaryHtml).toContain('>Hit<')

    // 2. BuildComparisonList: expanded Current build and expanded #1 optimized build
    const currentExpanded = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="current"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 720000, stats: {}, instances: sampleInstances },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 750000,
            evaluation: { total: 750000, stats: {}, instances: sampleInstances },
          },
        ]}
      />
    )
    expect(currentExpanded).toContain('data-testid="comp-instance-row-current-0"')
    expect(currentExpanded).toContain(
      'data-testid="rotation-reaction-chip" data-reaction="melt" data-element="cryo"'
    )
    expect(currentExpanded).toContain(
      'data-testid="rotation-no-reaction" data-reaction="none"'
    )
    expect(currentExpanded).toContain('>No reaction<')

    const optExpanded = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 720000, stats: {}, instances: sampleInstances },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 750000,
            evaluation: { total: 750000, stats: {}, instances: sampleInstances },
          },
        ]}
      />
    )
    expect(optExpanded).toContain('data-testid="comp-instance-row-opt-0-0"')
    expect(optExpanded).toContain(
      'data-testid="rotation-reaction-chip" data-reaction="melt" data-element="cryo"'
    )
    expect(optExpanded).toContain(
      'data-testid="rotation-no-reaction" data-reaction="none"'
    )

    // 3. WeaponComparisonList: expanded weapon row
    const weaponHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        artifactById={new Map()}
        result={rankWeaponComparisonRows([
          {
            candidate: {
              weaponKey: 'AThousandBlazingSuns',
              level: 90,
              ascension: 6,
              refinement: 1,
              isOwned: false,
              isEquippedBaseline: false,
            },
            status: 'ok',
            rank: null,
            total: 750000,
            percentBehindLeader: null,
            bestBuild: {
              weaponOverride: {
                key: 'AThousandBlazingSuns',
                level: 90,
                ascension: 6,
                refinement: 1,
              },
              artifactIds: {},
              total: 750000,
            },
            evaluation: {
              total: 750000,
              stats: {},
              instances: sampleInstances,
            },
            tested: 5,
            skipped: 0,
            durationMs: 2,
          },
        ])}
      />
    )
    expect(weaponHtml).toContain(
      'data-testid="weapon-compare-instance-row-AThousandBlazingSuns-0"'
    )
    expect(weaponHtml).toContain(
      'data-testid="rotation-reaction-chip" data-reaction="melt" data-element="cryo"'
    )
    expect(weaponHtml).toContain(
      'data-testid="rotation-no-reaction" data-reaction="none"'
    )
  })

  it('renders SolverPoolFiltersPanel and updates mainStatKeys, requiredSubstats, requiredSubstatsMode, minRarity, and minRv (solver-filters-deep)', () => {
    let latestSettings = { ...DEFAULT_OPTIMIZER_SETTINGS }
    const renderTree = () => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          <SolverPoolFiltersPanel
            settings={latestSettings}
            onChange={(next) => {
              latestSettings = next
            }}
          />
        )
      } finally {
        hookStore.active = false
      }
    }

    let tree = renderTree()
    const summaryNode = findByTestId(tree, 'solver-pool-filters-summary')
    expect(summaryNode?.children).toContain('All pieces allowed')

    // collapsible-panels: starts collapsed by default when unrestricted, keeping summary visible
    const toggleBtn = findByTestId(tree, 'solver-pool-filters-toggle')!
    expect(toggleBtn).toBeDefined()
    expect(toggleBtn.props['aria-expanded']).toBe(false)
    expect(findByTestId(tree, 'mainstat-chip-sands-enerRech_')).toBeUndefined()

    // Click toggle button to expand -> persists in session
    ;(toggleBtn.props.onClick as () => void)()
    tree = renderTree()
    expect(
      findByTestId(tree, 'solver-pool-filters-toggle')!.props['aria-expanded']
    ).toBe(true)

    // Click ER main stat chip on Sands
    const sandsErChip = findByTestId(tree, 'mainstat-chip-sands-enerRech_')
    expect(sandsErChip).toBeDefined()
    ;(sandsErChip!.props.onClick as () => void)()
    expect(latestSettings.mainStatKeys).toEqual({ sands: ['enerRech_'] })

    // Re-render with updated settings and toggle required substat + mode
    tree = renderTree()
    const subCritRate = findByTestId(tree, 'required-substat-chip-critRate_')
    expect(subCritRate).toBeDefined()
    ;(subCritRate!.props.onClick as () => void)()
    expect(latestSettings.requiredSubstats).toEqual(['critRate_'])

    tree = renderTree()
    const modeAnyBtn = findByTestId(tree, 'required-substats-mode-any')
    ;(modeAnyBtn!.props.onClick as () => void)()
    expect(latestSettings.requiredSubstatsMode).toBe('any')

    // Minimum rarity 5★
    tree = renderTree()
    const rarity5Btn = findByTestId(tree, 'pool-filter-rarity-5')
    ;(rarity5Btn!.props.onClick as () => void)()
    expect(latestSettings.minRarity).toBe(5)

    // Minimum RV input (draft-text pattern: commits on blur)
    tree = renderTree()
    const rvInput = findByTestId(tree, 'pool-filter-min-rv')
    expect(rvInput).toBeDefined()
    ;(
      rvInput!.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '450' } })
    tree = renderTree()
    ;(findByTestId(tree, 'pool-filter-min-rv')!.props.onBlur as () => void)()
    expect(latestSettings.minRv).toBe(450)

    // Reset Pool Filters button restores unrestricted defaults
    tree = renderTree()
    const resetBtn = findByTestId(tree, 'solver-pool-filters-reset')
    expect(resetBtn).toBeDefined()
    ;(resetBtn!.props.onClick as () => void)()
    expect(latestSettings.mainStatKeys).toEqual({})
    expect(latestSettings.requiredSubstats).toEqual([])
    expect(latestSettings.minRarity).toBe(1)
    expect(latestSettings.minRv).toBe(0)
  })

  it('single-level-range-control: numeric inputs in SolverPoolFiltersPanel and WeaponComparisonPanel hold raw draft text while focused (including cleared empty state) and clamp + commit on blur', () => {
    let latestSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      levelLow: 12,
      levelHigh: 20,
      minRv: 200,
    }
    const renderFilters = () => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          <SolverPoolFiltersPanel
            settings={latestSettings}
            onChange={(next) => {
              latestSettings = next
            }}
          />
        )
      } finally {
        hookStore.active = false
      }
    }

    // 1. SolverPoolFiltersPanel: clear levelLow to "" while editing -> stays "" without snapping to 0, then type "16" and blur -> commits 16
    let filterTree = renderFilters()
    const lowInput = findByTestId(filterTree, 'pool-filter-level-low')!
    expect(lowInput.props.value).toBe('12')
    ;(lowInput.props.onFocus as () => void)()
    filterTree = renderFilters()
    ;(
      findByTestId(filterTree, 'pool-filter-level-low')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '' } })
    filterTree = renderFilters()
    expect(findByTestId(filterTree, 'pool-filter-level-low')!.props.value).toBe('')
    expect(latestSettings.levelLow).toBe(12)

    // Out-of-range "99" stays "99" while focused, clamps to 20 on blur
    ;(
      findByTestId(filterTree, 'pool-filter-level-low')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '99' } })
    filterTree = renderFilters()
    expect(findByTestId(filterTree, 'pool-filter-level-low')!.props.value).toBe('99')
    expect(latestSettings.levelLow).toBe(12)
    ;(findByTestId(filterTree, 'pool-filter-level-low')!.props.onBlur as () => void)()
    filterTree = renderFilters()
    expect(latestSettings.levelLow).toBe(20)
    expect(findByTestId(filterTree, 'pool-filter-level-low')!.props.value).toBe('20')

    // Clearing levelHigh to "" and blurring restores default 20
    ;(findByTestId(filterTree, 'pool-filter-level-high')!.props.onFocus as () => void)()
    filterTree = renderFilters()
    ;(
      findByTestId(filterTree, 'pool-filter-level-high')!.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '' } })
    filterTree = renderFilters()
    expect(findByTestId(filterTree, 'pool-filter-level-high')!.props.value).toBe('')
    ;(findByTestId(filterTree, 'pool-filter-level-high')!.props.onBlur as () => void)()
    filterTree = renderFilters()
    expect(latestSettings.levelHigh).toBe(20)

    // 2. WeaponComparisonPanel: weapon level input holds "" and intermediate "8" while typing without snapping to 1, and clamps on blur
    hookStore.reset()
    let candidates: WeaponCompareCandidate[] = [
      {
        weaponKey: 'FavoniusSword',
        level: 90,
        ascension: 6,
        refinement: 5,
        isOwned: true,
        ownedWeaponId: 'w_fav',
        isEquippedBaseline: true,
      },
    ]
    const renderComparePanel = () => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          <WeaponComparisonPanel
            targetCharacterKey="Furina"
            good={null}
            selectedCandidates={candidates}
            onChangeCandidates={(next) => {
              candidates = next
            }}
          />
        )
      } finally {
        hookStore.active = false
      }
    }

    let compareTree = renderComparePanel()
    const wepLvlInput = findByTestId(
      compareTree,
      'weapon-compare-level-FavoniusSword'
    )!
    expect(wepLvlInput.props.value).toBe('90')
    ;(wepLvlInput.props.onFocus as () => void)()
    compareTree = renderComparePanel()
    ;(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '' } })
    compareTree = renderComparePanel()
    // Field stays empty while editing (never snaps to "1")
    expect(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .value
    ).toBe('')
    expect(candidates[0]!.level).toBe(90)

    // Type "0" while focused -> stays "0" until blur clamps it to 1
    ;(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '0' } })
    compareTree = renderComparePanel()
    expect(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .value
    ).toBe('0')
    ;(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .onBlur as () => void
    )()
    compareTree = renderComparePanel()
    expect(candidates[0]!.level).toBe(1)
    expect(
      findByTestId(compareTree, 'weapon-compare-level-FavoniusSword')!.props
        .value
    ).toBe('1')

    // weapon-compare-minimum: when only 1 weapon candidate is selected, WeaponComparisonPanel displays the minimum-2 notice and count
    expect(
      findByTestId(compareTree, 'weapon-compare-minimum-notice')
    ).toBeDefined()
    expect(
      findByTestId(compareTree, 'weapon-compare-selected-count')?.children.join(
        ''
      )
    ).toContain('1 selected (select at least 2 to compare)')
  })

  it('expands per-instance damage formula breakdown and core stat breakdown on Current and optimized builds with source attribution badges (formula-breakdown)', () => {
    const preset = getBundledPreset('official/mavuika-melt-hypercarry')!
    const sampleDamageBreakdown = {
      element: 'pyro',
      move: 'burst',
      hitMode: 'avgHit',
      reaction: 'melt',
      baseDmg: 25000,
      dmgInc: 0,
      basePlusFlat: 25000,
      dmgBonus: 1.05,
      dmgBonusMulti: 2.05,
      critRate: 0.95,
      critDMG: 2.2,
      critMulti: 3.09,
      ampMulti: 2.35,
      defMulti: 0.5,
      resMulti: 1.23,
      outerMulti: 1,
      reconciledPerHit: 25000 * 2.05 * 3.09 * 2.35 * 0.5 * 1.23,
      reconciledSubtotal: 25000 * 2.05 * 3.09 * 2.35 * 0.5 * 1.23,
      factors: [
        {
          key: 'baseDamage' as const,
          label: 'Base Damage',
          value: 25000,
          unit: '' as const,
          formulaSummary: '25,000',
          contributors: [
            {
              category: 'character' as const,
              sourceKey: 'Mavuika',
              label: 'Mavuika Talent Base DMG',
              value: 25000,
              unit: '' as const,
            },
          ],
        },
        {
          key: 'dmgBonus' as const,
          label: 'DMG Bonus Multiplier',
          value: 2.05,
          unit: '×' as const,
          formulaSummary: '1 + 105.0%',
          contributors: [
            {
              category: 'artifactSet' as const,
              sourceKey: 'Artifacts',
              label: 'Equipped Artifacts',
              value: 0.466,
              unit: '%' as const,
            },
            {
              category: 'teamBuff' as const,
              sourceKey: 'Citlali',
              label: 'Citlali · Scroll of the Hero of Cinder City',
              value: 0.4,
              unit: '%' as const,
            },
          ],
        },
        {
          key: 'crit' as const,
          label: 'Crit Multiplier (avgHit)',
          value: 3.09,
          unit: '×' as const,
          contributors: [
            {
              category: 'character' as const,
              sourceKey: 'Mavuika',
              label: 'Effective CRIT Rate (avgHit)',
              value: 0.95,
              unit: '%' as const,
            },
          ],
        },
        {
          key: 'reaction' as const,
          label: 'Reaction Multiplier',
          value: 2.35,
          unit: '×' as const,
          contributors: [
            {
              category: 'character' as const,
              sourceKey: 'Mavuika',
              label: 'Melt Base Multiplier',
              value: 2.0,
              unit: '' as const,
            },
          ],
        },
        {
          key: 'enemyDef' as const,
          label: 'Enemy DEF Multiplier',
          value: 0.5,
          unit: '×' as const,
          contributors: [
            {
              category: 'enemy' as const,
              sourceKey: 'Enemy',
              label: 'Enemy Level (Lv. 100)',
              value: 100,
              unit: '' as const,
            },
          ],
        },
        {
          key: 'enemyRes' as const,
          label: 'Enemy Pyro RES Multiplier',
          value: 1.23,
          unit: '×' as const,
          contributors: [
            {
              category: 'enemy' as const,
              sourceKey: 'Enemy',
              label: 'Enemy Base RES',
              value: 0.1,
              unit: '%' as const,
            },
            {
              category: 'teamBuff' as const,
              sourceKey: 'Citlali',
              label: 'Citlali (Team Buff)',
              value: -0.2,
              unit: '%' as const,
            },
          ],
        },
      ],
    }

    const sampleAtkBreakdown = {
      statKey: 'atk',
      total: 3150,
      unit: '' as const,
      base: 1100,
      baseContributors: [
        {
          category: 'character' as const,
          sourceKey: 'Mavuika',
          label: 'Mavuika (Character Base / Ascension)',
          value: 359,
          unit: '' as const,
        },
        {
          category: 'weapon' as const,
          sourceKey: 'AThousandBlazingSuns',
          label: 'A Thousand Blazing Suns (Weapon Stat)',
          value: 741,
          unit: '' as const,
        },
      ],
      percentContributors: [
        {
          category: 'resonance' as const,
          sourceKey: 'Resonance',
          label: 'Elemental Resonance',
          value: 275,
          percentValue: 0.25,
          unit: '' as const,
          note: '1,100 Base × 25.0%',
        },
      ],
      flatContributors: [
        {
          category: 'teamBuff' as const,
          sourceKey: 'Bennett',
          label: 'Bennett (Team Buff)',
          value: 1200,
          unit: '' as const,
        },
      ],
      contributors: [
        {
          category: 'character' as const,
          sourceKey: 'Mavuika',
          label: 'Mavuika (Character Base / Ascension)',
          value: 359,
          unit: '' as const,
        },
        {
          category: 'weapon' as const,
          sourceKey: 'AThousandBlazingSuns',
          label: 'A Thousand Blazing Suns (Weapon Stat)',
          value: 741,
          unit: '' as const,
        },
        {
          category: 'resonance' as const,
          sourceKey: 'Resonance',
          label: 'Elemental Resonance',
          value: 275,
          percentValue: 0.25,
          unit: '' as const,
          note: '1,100 Base × 25.0%',
        },
        {
          category: 'teamBuff' as const,
          sourceKey: 'Bennett',
          label: 'Bennett (Team Buff)',
          value: 1200,
          unit: '' as const,
        },
      ],
      reconciledTotal: 2575,
    }

    const evaluation = {
      total: 500000,
      stats: {
        hp: 18000,
        atk: 3150,
        def: 850,
        eleMas: 250,
        enerRech_: 1.1,
        critRate_: 0.95,
        critDMG_: 2.2,
      },
      statBreakdowns: {
        atk: sampleAtkBreakdown,
      },
      instances: [
        {
          label: 'Hour of Burning Skies: Sunfell Slice (Melt)',
          path: ['burst', 'skillDmg'],
          count: 1,
          perHit: sampleDamageBreakdown.reconciledPerHit,
          subtotal: sampleDamageBreakdown.reconciledSubtotal,
          breakdown: sampleDamageBreakdown,
        },
      ],
    }

    hookStore.active = true
    const renderList = () => {
      hookStore.beginRender()
      return evaluateTree(
        <BuildComparisonList
          preset={preset}
          artifactById={new Map()}
          initialExpandedRowId="opt-0"
          currentBuild={{
            selection: { weaponId: 'w1', artifactIds: {} },
            evaluation,
          }}
          optimizedBuilds={[
            {
              selection: { weaponId: 'w1', artifactIds: {} },
              total: 500000,
              evaluation,
            },
          ]}
        />
      )
    }

    let tree = renderList()
    // Initially damage row breakdown and stat breakdown are collapsed
    expect(findByTestId(tree, 'damage-breakdown-opt-0-0')).toBeUndefined()
    expect(findByTestId(tree, 'stat-breakdown-opt-0-atk')).toBeUndefined()

    // Click damage row to expand its formula breakdown; chevron is a plain span, not a button
    const instChevron = findByTestId(tree, 'comp-instance-toggle-opt-0-0')
    expect(instChevron).toBeDefined()
    expect(instChevron!.type).toBe('span')
    expect(instChevron!.props.className).toBe('comp-row-chevron')
    const instRow = findByTestId(tree, 'comp-instance-row-opt-0-0')!
    expect(instRow.props['aria-expanded']).toBe(false)
    ;(instRow.props.onClick as () => void)()

    tree = renderList()
    expect(findByTestId(tree, 'damage-breakdown-opt-0-0')).toBeDefined()
    expect(
      findByTestId(tree, 'comp-instance-toggle-opt-0-0')!.props.className
    ).toBe('comp-row-chevron is-expanded')
    expect(
      findByTestId(tree, 'damage-factor-opt-0-0-baseDamage')
    ).toBeDefined()
    expect(findByTestId(tree, 'damage-factor-opt-0-0-dmgBonus')).toBeDefined()
    expect(findByTestId(tree, 'damage-factor-opt-0-0-crit')).toBeDefined()
    expect(findByTestId(tree, 'damage-factor-opt-0-0-reaction')).toBeDefined()
    expect(findByTestId(tree, 'damage-factor-opt-0-0-enemyDef')).toBeDefined()
    expect(findByTestId(tree, 'damage-factor-opt-0-0-enemyRes')).toBeDefined()

    // Click ATK stat row to expand its breakdown; chevron is a plain span, not a button
    const atkChevron = findByTestId(tree, 'comp-stat-toggle-opt-0-atk')
    expect(atkChevron).toBeDefined()
    expect(atkChevron!.type).toBe('span')
    expect(atkChevron!.props.className).toBe('comp-row-chevron')
    const atkRow = findByTestId(tree, 'comp-stat-row-opt-0-atk')!
    expect(atkRow.props['aria-expanded']).toBe(false)
    ;(atkRow.props.onClick as () => void)()

    tree = renderList()
    expect(findByTestId(tree, 'stat-breakdown-opt-0-atk')).toBeDefined()
    expect(
      findByTestId(tree, 'comp-stat-toggle-opt-0-atk')!.props.className
    ).toBe('comp-row-chevron is-expanded')
    const resonanceContrib = findByTestId(
      tree,
      'stat-contributor-opt-0-atk-2'
    )!
    expect(resonanceContrib.props['data-source-category']).toBe('resonance')
    const teamBuffContrib = findByTestId(tree, 'stat-contributor-opt-0-atk-3')!
    expect(teamBuffContrib.props['data-source-category']).toBe('teamBuff')
    hookStore.active = false
  })

  it('renders TeamOptimizationList with combined team total, optimized member builds, and skipped 0-row members', () => {
    const basePreset = getBundledPreset('official/neuvillette-hypercarry')!
    const multiPreset = {
      ...basePreset,
      rotation: {
        ...basePreset.rotation,
        targets: [
          ...basePreset.rotation.targets,
          {
            member: 'Furina',
            path: ['skill', 'chevalmarineDmg'],
            count: 6,
            label: 'Surintendante Chevalmarine',
            hitMode: 'avgHit' as const,
            bonusStats: {},
          },
        ],
      },
    }

    const summaryHtml = renderToStaticMarkup(
      <PresetRotationSummary preset={multiPreset} />
    )
    expect(
      summaryHtml.includes(
        `data-testid="preset-rotation-member-${basePreset.rotation.targets.length}"`
      )
    ).toBe(true)

    const teamResult = {
      teamTotal: 1450000,
      currentTeamTotal: 1200000,
      tested: 1240,
      skipped: 800,
      durationMs: 120,
      members: [
        {
          memberKey: 'Neuvillette',
          memberIndex: 0,
          skippedSolver: false,
          rotationRowCount: basePreset.rotation.targets.length,
          selection: {
            weaponId: 'w_neuv',
            artifactIds: { flower: 'art_1' },
          },
          currentSelection: {
            weaponId: 'w_neuv',
            artifactIds: {},
          },
          subtotal: 1050000,
          currentSubtotal: 900000,
          evaluation: {
            total: 1050000,
            stats: {
              hp: 42000,
              atk: 1200,
              def: 800,
              eleMas: 40,
              enerRech_: 1.3,
              critRate_: 0.64,
              critDMG_: 2.6,
            },
            instances: [
              {
                label: 'Equitable Judgment Tick',
                path: ['charged', 'judgmentDmg'],
                count: 8,
                perHit: 60000,
                subtotal: 480000,
              },
            ],
          },
          currentEvaluation: null,
          tested: 800,
          skipped: 500,
          durationMs: 70,
        },
        {
          memberKey: 'Furina',
          memberIndex: 1,
          skippedSolver: false,
          rotationRowCount: 1,
          selection: {
            weaponId: 'w_furina',
            artifactIds: { flower: 'art_2' },
          },
          currentSelection: {
            weaponId: 'w_furina',
            artifactIds: {},
          },
          subtotal: 400000,
          currentSubtotal: 300000,
          evaluation: {
            total: 400000,
            stats: {
              hp: 38000,
              atk: 1100,
              def: 750,
              eleMas: 20,
              enerRech_: 1.75,
              critRate_: 0.85,
              critDMG_: 1.9,
            },
            instances: [
              {
                label: 'Surintendante Chevalmarine',
                path: ['skill', 'chevalmarineDmg'],
                count: 6,
                perHit: 25000,
                subtotal: 150000,
              },
            ],
          },
          currentEvaluation: null,
          tested: 440,
          skipped: 300,
          durationMs: 50,
        },
        {
          memberKey: 'KaedeharaKazuha',
          memberIndex: 2,
          skippedSolver: true,
          rotationRowCount: 0,
          selection: { artifactIds: {} },
          currentSelection: { artifactIds: {} },
          subtotal: 0,
          currentSubtotal: 0,
          evaluation: null,
          currentEvaluation: null,
          tested: 0,
          skipped: 0,
          durationMs: 0,
        },
      ],
    }

    const html = renderToStaticMarkup(
      <TeamOptimizationList
        preset={multiPreset}
        result={teamResult}
        artifactById={new Map()}
      />
    )
    expect(html).toContain('data-testid="team-optimization-list"')
    expect(html).toContain('data-testid="team-opt-total"')
    expect(html).toContain('1,450,000')
    expect(html).toContain('data-testid="team-opt-member-Neuvillette"')
    expect(html).toContain('data-testid="team-opt-subtotal-Neuvillette"')
    expect(html).toContain('1,050,000')
    expect(html).toContain('data-testid="team-opt-member-Furina"')
    expect(html).toContain('data-testid="team-opt-subtotal-Furina"')
    expect(html).toContain('400,000')
    expect(html).toContain('data-testid="team-opt-skipped-KaedeharaKazuha"')
    expect(html).toContain(
      'No rotation rows — kept current/simulated gear (solver skipped)'
    )
  })

  it('styles Current Baseline as a pill badge (.comp-baseline-tag without .comp-best-tag) and renders up to 5 ranked top builds inside an expanded weapon row (weapon-compare-followups)', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const sampleFlower = {
      id: 'art_f_1',
      setKey: 'GoldenTroupe',
      slotKey: 'flower' as const,
      level: 20,
      rarity: 5 as const,
      mainStatKey: 'hp',
      location: 'Furina',
      lock: true,
      substats: [
        { key: 'critRate_', value: 10.5 },
        { key: 'critDMG_', value: 21.0 },
      ],
    }
    const artifactMap = new Map([[sampleFlower.id, sampleFlower]])

    const baseStats = {
      hp: 40000,
      atk: 1200,
      def: 850,
      eleMas: 40,
      enerRech_: 1.8,
      critRate_: 0.85,
      critDMG_: 1.9,
    }

    const fiveBuilds = [420000, 412000, 405000, 398000, 390000].map(
      (tot, idx) => ({
        rank: idx + 1,
        selection: {
          weaponOverride: {
            key: 'FavoniusSword',
            level: 90,
            ascension: 6,
            refinement: 5,
          },
          artifactIds: { flower: 'art_f_1' },
          total: tot,
        },
        evaluation: {
          total: tot,
          stats: { ...baseStats, hp: 40000 - idx * 500 },
          instances: [
            {
              label: 'Gentilhomme Usher DMG',
              path: ['skill', 'usherDmg'],
              count: 7,
              perHit: tot / 7,
              subtotal: tot,
            },
          ],
        },
      })
    )

    const ranked = rankWeaponComparisonRows([
      {
        candidate: {
          weaponKey: 'FavoniusSword',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: true,
          ownedWeaponId: 'w_fav',
          isEquippedBaseline: true,
        },
        status: 'ok',
        rank: null,
        total: 420000,
        percentBehindLeader: null,
        bestBuild: fiveBuilds[0]!.selection,
        evaluation: fiveBuilds[0]!.evaluation,
        topBuilds: fiveBuilds,
        tested: 120,
        skipped: 30,
        durationMs: 12,
      },
    ])

    const html = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={ranked}
        artifactById={artifactMap}
      />
    )

    // 1. Pill badge styling: Current uses class="comp-baseline-tag" (not comp-best-tag)
    expect(html).toContain(
      'class="comp-baseline-tag" data-testid="weapon-compare-baseline-badge-FavoniusSword" title="Your currently equipped build">Current<'
    )
    expect(html).not.toContain('comp-best-tag comp-baseline-tag')

    // 2. Expanded weapon row renders all 5 ranked top builds (#1..#5) with pieces, final stats, and totals
    expect(html).toContain('Top 5 Builds for Favonius Sword')
    expect(html).toContain('data-testid="weapon-compare-top-builds-FavoniusSword"')

    const expectedTotals = ['420,000', '412,000', '405,000', '398,000', '390,000']
    for (let i = 0; i < 5; i++) {
      expect(html).toContain(
        `data-testid="weapon-compare-build-FavoniusSword-${i}" data-build-rank="${i + 1}"`
      )
      expect(html).toContain(
        `data-testid="weapon-compare-build-rank-FavoniusSword-${i}">#${i + 1}<`
      )
      expect(html).toContain(
        `data-testid="weapon-compare-build-total-FavoniusSword-${i}">${expectedTotals[i]}<`
      )
      expect(html).toContain(
        `data-testid="weapon-compare-build-artifacts-FavoniusSword-${i}"`
      )
      expect(html).toContain(
        `data-testid="weapon-compare-build-stats-FavoniusSword-${i}"`
      )
      expect(html).toContain(
        `data-testid="weapon-compare-build-pieces-FavoniusSword-${i}"`
      )
    }
  })

  it('lays out build Details with compact right-aligned damage numeric cluster, spaced stat comparison hint, and 5-card artifact grid with owner/lock legend & tooltips (build-details-layout)', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const sampleFlower = {
      id: 'art_f_layout',
      setKey: 'GoldenTroupe',
      slotKey: 'flower' as const,
      level: 20,
      rarity: 5 as const,
      mainStatKey: 'hp',
      location: 'Furina',
      lock: true,
      substats: [
        { key: 'critRate_', value: 10.5 },
        { key: 'critDMG_', value: 21.0 },
      ],
    }
    const artifactMap = new Map([[sampleFlower.id, sampleFlower]])

    const evaluation = {
      total: 420000,
      stats: {
        hp: 40000,
        atk: 1200,
        def: 850,
        eleMas: 40,
        enerRech_: 1.8,
        critRate_: 0.85,
        critDMG_: 1.9,
      },
      statBreakdowns: {},
      instances: [
        {
          label: 'Gentilhomme Usher DMG',
          path: ['skill', 'usherDmg'],
          count: 7,
          perHit: 60000,
          subtotal: 420000,
        },
      ],
    }

    const html = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={artifactMap}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: { flower: 'art_f_layout' } },
          evaluation: { ...evaluation, total: 400000 },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: { flower: 'art_f_layout' } },
            total: 420000,
            evaluation,
          },
        ]}
      />
    )

    // 1. Damage table uses .comp-damage-table with .comp-dmg-col-name and right-aligned .comp-dmg-col-num cluster
    expect(html).toContain('class="gi-table comp-damage-table"')
    expect(html).toContain('class="comp-dmg-col-name">Damage Instance<')
    expect(html).toContain('class="comp-dmg-col-num">Per-Hit DMG<')
    expect(html).toContain('class="comp-dmg-col-num">Subtotal DMG<')
    expect(html).toContain('class="comp-dmg-col-num comp-dmg-col-delta">vs. Current<')

    // 2. Core Stat Comparison heading and hint are separated with .comp-details-subhint
    expect(html).toContain('class="comp-details-subheader"')
    expect(html).toContain('class="muted comp-details-subhint"')
    expect(html).toContain('Click a stat row to inspect its source breakdown')

    // 3. Artifacts heading, legend, and piece cards with owner/lock tooltips
    expect(html).toContain('class="comp-details-artifacts-section"')
    expect(html).toContain('>Artifacts<')
    expect(html).toContain('data-testid="artifacts-legend-opt-0"')
    expect(html).toContain(
      'Character badge = equipped owner in imported data · 🔒 = locked in imported data'
    )
    expect(html).toContain('class="artifact-piece-card"')
    expect(html).toContain(
      'data-testid="artifact-piece-owner" title="Equipped on Furina in imported GOOD data"'
    )
    expect(html).toContain(
      'data-testid="artifact-piece-lock" title="Locked in imported GOOD data"'
    )
  })

  it('strips redundant trailing reaction and hit-count parentheticals from rotation row labels and uses plain rotating chevrons instead of buttons on expandable rows (build-details-dedupe)', () => {
    expect(
      formatRotationRowLabel('Hour of Burning Skies: Sunfell Slice (Melt)')
    ).toBe('Hour of Burning Skies: Sunfell Slice')
    expect(
      formatRotationRowLabel('Flamestrider Charged Cyclic (Melt ×4)')
    ).toBe('Flamestrider Charged Cyclic')
    expect(
      formatRotationRowLabel('Flamestrider Charged Cyclic (No Reaction ×4)')
    ).toBe('Flamestrider Charged Cyclic')
    expect(formatRotationRowLabel('Masque 1-Hit (Vaporize ×3)')).toBe(
      'Masque 1-Hit'
    )
    expect(
      formatRotationRowLabel('Masque 4-Hit (Vaporize ×3, Normal ×3)')
    ).toBe('Masque 4-Hit')
    expect(formatRotationRowLabel('Gentilhomme Usher DMG (×7)')).toBe(
      'Gentilhomme Usher DMG'
    )
    expect(formatRotationRowLabel('Equitable Judgment Ticks (3×8)')).toBe(
      'Equitable Judgment Ticks'
    )
    // Non-redundant ability-part parentheticals stay untouched
    expect(formatRotationRowLabel('O Tears, I Shall Repay (Skill)')).toBe(
      'O Tears, I Shall Repay (Skill)'
    )
    expect(
      formatRotationRowLabel('O Tides, I Have Returned (Burst Initial)')
    ).toBe('O Tides, I Have Returned (Burst Initial)')

    const mavuikaPreset = getBundledPreset('official/mavuika-melt-hypercarry')!
    // Preset JSON data itself remains untouched
    expect(mavuikaPreset.rotation.targets[0]!.label).toBe(
      'Hour of Burning Skies: Sunfell Slice (Melt)'
    )

    const summaryHtml = renderToStaticMarkup(
      <PresetRotationSummary preset={mavuikaPreset} />
    )
    expect(summaryHtml).toContain('>Hour of Burning Skies: Sunfell Slice<')
    expect(summaryHtml).toContain('>Flamestrider Charged Cyclic<')
    expect(summaryHtml).not.toContain('(Melt)')
    expect(summaryHtml).not.toContain('(Melt ×4)')
    expect(summaryHtml).not.toContain('(No Reaction ×4)')

    const detailsHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={mavuikaPreset}
        artifactById={new Map()}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: {
            total: 900000,
            stats: { hp: 18000, atk: 2400 },
            instances: [
              {
                label: 'Hour of Burning Skies: Sunfell Slice (Melt)',
                path: ['burst', 'skillDmg'],
                count: 1,
                perHit: 500000,
                subtotal: 500000,
              },
            ],
          },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 950000,
            evaluation: {
              total: 950000,
              stats: { hp: 18000, atk: 2500 },
              statBreakdowns: {
                atk: {
                  statKey: 'atk',
                  total: 2500,
                  unit: '' as const,
                  base: 1000,
                  baseContributors: [],
                  percentContributors: [],
                  flatContributors: [],
                  contributors: [],
                  reconciledTotal: 2500,
                },
              },
              instances: [
                {
                  label: 'Hour of Burning Skies: Sunfell Slice (Melt)',
                  path: ['burst', 'skillDmg'],
                  count: 1,
                  perHit: 530000,
                  subtotal: 530000,
                },
              ],
            },
          },
        ]}
      />
    )
    expect(detailsHtml).toContain('>Hour of Burning Skies: Sunfell Slice<')
    expect(detailsHtml).not.toContain('(Melt)')
    expect(detailsHtml).not.toContain('comp-inline-breakdown-btn')
    expect(detailsHtml).toContain('class="comp-row-chevron"')
  })

  it('styles negative relative deltas with neutral muted class instead of red error class across build rows, weapon rows, team member rows, and stat diffs while reserving error for actual unmet constraints (delta-styling-tiers)', () => {
    expect(formatRelativeDelta(99500, 100000)).toEqual({
      text: '−0.5%',
      asciiText: '-0.5%',
      sign: '-',
      cls: 'muted',
    })
    expect(formatRelativeDelta(100500, 100000)).toEqual({
      text: '+0.5%',
      asciiText: '+0.5%',
      sign: '+',
      cls: 'ok',
    })
    expect(formatRelativeDelta(100000, 100000)).toEqual({
      text: '0.0%',
      asciiText: '0.0%',
      sign: '0',
      cls: 'muted',
    })

    const preset = getBundledPreset('official/furina-salon-subdps')!
    const buildHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: {
            total: 400000,
            stats: { hp: 40000, atk: 1200 },
            instances: [
              {
                label: 'Gentilhomme Usher DMG',
                path: ['skill', 'usherDmg'],
                count: 7,
                perHit: 57142,
                subtotal: 400000,
              },
            ],
          },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 398000,
            evaluation: {
              total: 398000,
              stats: { hp: 39000, atk: 1180 },
              instances: [
                {
                  label: 'Gentilhomme Usher DMG',
                  path: ['skill', 'usherDmg'],
                  count: 7,
                  perHit: 56857,
                  subtotal: 398000,
                },
              ],
            },
          },
        ]}
      />
    )
    expect(buildHtml).toContain(
      'class="comp-row-delta muted" data-testid="comp-delta-opt-0" data-delta-sign="-" data-delta-ascii="-0.5%"'
    )
    expect(buildHtml).not.toContain('comp-row-delta error')
    expect(buildHtml).not.toContain('comp-dmg-col-delta error')
    expect(buildHtml).not.toContain('comp-stat-diff-delta error')

    const rankedWeapons = rankWeaponComparisonRows([
      {
        candidate: {
          weaponKey: 'FavoniusSword',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: true,
          isEquippedBaseline: true,
        },
        status: 'ok',
        rank: null,
        total: 400000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 400000 },
        evaluation: { total: 400000, stats: {}, instances: [] },
        topBuilds: [
          {
            rank: 1,
            selection: { artifactIds: {}, total: 400000 },
            evaluation: { total: 400000, stats: {}, instances: [] },
          },
          {
            rank: 2,
            selection: { artifactIds: {}, total: 396000 },
            evaluation: { total: 396000, stats: {}, instances: [] },
          },
        ],
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
      {
        candidate: {
          weaponKey: 'FleuveCendreFerryman',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: false,
          isEquippedBaseline: false,
        },
        status: 'ok',
        rank: null,
        total: 380000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 380000 },
        evaluation: { total: 380000, stats: {}, instances: [] },
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
      {
        candidate: {
          weaponKey: 'SplendorOfTranquilWaters',
          level: 90,
          ascension: 6,
          refinement: 1,
          isOwned: false,
          isEquippedBaseline: false,
        },
        status: 'unmet',
        rank: null,
        total: null,
        percentBehindLeader: null,
        bestBuild: null,
        evaluation: null,
        tested: 0,
        skipped: 10,
        durationMs: 1,
      },
    ])
    const weaponHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
      />
    )
    // Trailing weapon delta and #2 top-build delta use muted, not error
    expect(weaponHtml).toContain(
      'class="comp-row-delta muted" data-testid="weapon-compare-delta-FleuveCendreFerryman"'
    )
    expect(weaponHtml).toContain(
      'class="comp-row-delta muted" data-testid="weapon-compare-build-delta-FavoniusSword-1"'
    )
    expect(weaponHtml).not.toContain('comp-row-delta error')
    // Actual unmet-constraint message still uses error
    expect(weaponHtml).toContain(
      'class="error" data-testid="weapon-compare-unmet-SplendorOfTranquilWaters"'
    )
  })

  it('styles team-wide member rows according to each member actual outcome rather than giving every non-skipped member is-best and ok styling (team-result-status)', () => {
    const preset = getBundledPreset('official/neuvillette-hypercarry')!
    const multiPreset = {
      ...preset,
      rotation: {
        ...preset.rotation,
        targets: [
          {
            ...preset.rotation.targets[0]!,
            memberKey: 'Neuvillette',
          },
          {
            label: 'Surintendante Chevalmarine',
            memberKey: 'Furina',
            path: ['skill', 'chevalmarineDmg'],
            count: 6,
            hitMode: 'avgHit' as const,
            bonusStats: {},
          },
          {
            label: 'Kazuha Slash',
            memberKey: 'KaedeharaKazuha',
            path: ['burst', 'dmg'],
            count: 1,
            hitMode: 'avgHit' as const,
            bonusStats: {},
          },
        ],
      },
    }

    const html = renderToStaticMarkup(
      <TeamOptimizationList
        preset={multiPreset}
        artifactById={new Map()}
        result={{
          teamTotal: 1320000,
          currentTeamTotal: 1300000,
          tested: 100,
          skipped: 0,
          durationMs: 25,
          members: [
            // Slot 1: Improved (+10.0%) -> earns is-best / comp-rank-best and ok subtotal
            {
              memberKey: 'Neuvillette',
              memberIndex: 0,
              skippedSolver: false,
              rotationRowCount: 1,
              selection: { artifactIds: {} },
              currentSelection: { artifactIds: {} },
              subtotal: 990000,
              currentSubtotal: 900000,
              evaluation: { total: 990000, stats: {}, instances: [] },
              currentEvaluation: null,
              tested: 50,
              skipped: 0,
              durationMs: 10,
            },
            // Slot 2: Decreased (-10.0%) -> no is-best / comp-rank-best, muted subtotal and muted delta
            {
              memberKey: 'Furina',
              memberIndex: 1,
              skippedSolver: false,
              rotationRowCount: 1,
              selection: { artifactIds: {} },
              currentSelection: { artifactIds: {} },
              subtotal: 270000,
              currentSubtotal: 300000,
              evaluation: { total: 270000, stats: {}, instances: [] },
              currentEvaluation: null,
              tested: 30,
              skipped: 0,
              durationMs: 10,
            },
            // Slot 3: Unchanged (0.0%) -> no is-best / comp-rank-best, neutral subtotal, muted delta
            {
              memberKey: 'KaedeharaKazuha',
              memberIndex: 2,
              skippedSolver: false,
              rotationRowCount: 1,
              selection: { artifactIds: {} },
              currentSelection: { artifactIds: {} },
              subtotal: 60000,
              currentSubtotal: 60000,
              evaluation: { total: 60000, stats: {}, instances: [] },
              currentEvaluation: null,
              tested: 20,
              skipped: 0,
              durationMs: 5,
            },
          ],
        }}
      />
    )

    // Improved member (Neuvillette) earns is-best and ok, rank pill shows member display name
    expect(html).toContain(
      'data-testid="team-opt-member-Neuvillette" data-member-key="Neuvillette" data-skipped-solver="false" data-member-status="improved" data-member-delta-sign="+"'
    )
    expect(html).toContain(
      'class="comp-rank-pill comp-rank-best is-best" data-testid="team-opt-rank-Neuvillette">Neuvillette<'
    )
    expect(html).toContain(
      'class="comp-row-total ok" data-testid="team-opt-subtotal-Neuvillette">990,000<'
    )
    expect(html).toContain(
      'class="comp-row-delta ok" data-testid="team-opt-member-delta-Neuvillette" data-delta-sign="+">+10.0%<'
    )

    // Decreased member (Furina) does NOT get is-best or ok; gets neutral rank pill with member display name and muted subtotal + delta
    expect(html).toContain(
      'data-testid="team-opt-member-Furina" data-member-key="Furina" data-skipped-solver="false" data-member-status="decreased" data-member-delta-sign="-"'
    )
    expect(html).toContain(
      'class="comp-rank-pill" data-testid="team-opt-rank-Furina">Furina<'
    )
    expect(html).toContain(
      'class="comp-row-total muted" data-testid="team-opt-subtotal-Furina">270,000<'
    )
    expect(html).toContain(
      'class="comp-row-delta muted" data-testid="team-opt-member-delta-Furina" data-delta-sign="-">−10.0%<'
    )

    // Unchanged member (KaedeharaKazuha) does NOT get is-best or ok; gets neutral rank pill with member display name and neutral subtotal
    expect(html).toContain(
      'data-testid="team-opt-member-KaedeharaKazuha" data-member-key="KaedeharaKazuha" data-skipped-solver="false" data-member-status="unchanged" data-member-delta-sign="0"'
    )
    expect(html).toContain(
      'class="comp-rank-pill" data-testid="team-opt-rank-KaedeharaKazuha">Kaedehara Kazuha<'
    )
    expect(html).toContain(
      'class="comp-row-total" data-testid="team-opt-subtotal-KaedeharaKazuha">60,000<'
    )
    expect(html).toContain(
      'class="comp-row-delta muted" data-testid="team-opt-member-delta-KaedeharaKazuha" data-delta-sign="0">0.0%<'
    )
  })

  it('renders result bar widths as true proportions of the leader without a 4% floor (proportional-result-bars)', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!

    // 1. BuildComparisonList: 5,000 vs 1,000,000 is 0.5% (not 4.0%)
    const buildHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 5000, stats: {}, instances: [] },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 1000000,
            evaluation: { total: 1000000, stats: {}, instances: [] },
          },
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 15000,
            evaluation: { total: 15000, stats: {}, instances: [] },
          },
        ]}
      />
    )
    expect(buildHtml).toContain(
      'data-testid="comp-bar-fill-opt-0" style="width:100.0%"'
    )
    expect(buildHtml).toContain(
      'data-testid="comp-bar-fill-opt-1" style="width:1.5%"'
    )
    expect(buildHtml).toContain(
      'data-testid="comp-bar-fill-current" style="width:0.5%"'
    )
    expect(buildHtml).toContain('title="5,000 Total Rotation DMG (0.5% of best)"')
    expect(buildHtml).not.toContain('width:4.0%')

    // 2. WeaponComparisonList: weapon row and top-build card at 0.5% and 2.0%
    const rankedWeapons = rankWeaponComparisonRows([
      {
        candidate: {
          weaponKey: 'FavoniusSword',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: true,
          isEquippedBaseline: true,
        },
        status: 'ok',
        rank: null,
        total: 1000000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 1000000 },
        evaluation: { total: 1000000, stats: {}, instances: [] },
        topBuilds: [
          {
            rank: 1,
            selection: { artifactIds: {}, total: 1000000 },
            evaluation: { total: 1000000, stats: {}, instances: [] },
          },
          {
            rank: 2,
            selection: { artifactIds: {}, total: 20000 },
            evaluation: { total: 20000, stats: {}, instances: [] },
          },
        ],
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
      {
        candidate: {
          weaponKey: 'FleuveCendreFerryman',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: false,
          isEquippedBaseline: false,
        },
        status: 'ok',
        rank: null,
        total: 5000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 5000 },
        evaluation: { total: 5000, stats: {}, instances: [] },
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
    ])

    const weaponHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
      />
    )
    expect(weaponHtml).toContain(
      'data-testid="weapon-compare-bar-FavoniusSword" style="width:100.0%"'
    )
    expect(weaponHtml).toContain(
      'data-testid="weapon-compare-bar-FleuveCendreFerryman" style="width:0.5%"'
    )
    expect(weaponHtml).toContain(
      'title="5,000 Total Rotation DMG (0.5% of leader)"'
    )
    expect(weaponHtml).toContain(
      'title="20,000 Total Rotation DMG (2.0% of weapon best)"'
    )
    expect(weaponHtml).not.toContain('width:4.0%')
  })

  it('labels weapon comparison row deltas as vs. leader and expanded top-build deltas as vs. weapon best so their reference baselines are unambiguous (compare-delta-labels)', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const rankedWeapons = rankWeaponComparisonRows([
      {
        candidate: {
          weaponKey: 'FavoniusSword',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: true,
          isEquippedBaseline: true,
        },
        status: 'ok',
        rank: null,
        total: 400000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 400000 },
        evaluation: { total: 400000, stats: {}, instances: [] },
        topBuilds: [
          {
            rank: 1,
            selection: { artifactIds: {}, total: 400000 },
            evaluation: { total: 400000, stats: {}, instances: [] },
          },
          {
            rank: 2,
            selection: { artifactIds: {}, total: 392000 },
            evaluation: { total: 392000, stats: {}, instances: [] },
          },
        ],
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
      {
        candidate: {
          weaponKey: 'FleuveCendreFerryman',
          level: 90,
          ascension: 6,
          refinement: 5,
          isOwned: false,
          isEquippedBaseline: false,
        },
        status: 'ok',
        rank: null,
        total: 360000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 360000 },
        evaluation: { total: 360000, stats: {}, instances: [] },
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
    ])

    const html = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
      />
    )

    // Weapon-level deltas explicitly label "vs. leader" and carry data-delta-scope="leader"
    expect(html).toContain(
      'data-testid="weapon-compare-delta-FavoniusSword" data-delta-scope="leader" data-pct-behind="0.0" data-delta-ascii="0.0%" title="Leading weapon total (0.0% vs. #1 leader weapon)">0.0% vs. leader<'
    )
    expect(html).toContain(
      'data-testid="weapon-compare-delta-FleuveCendreFerryman" data-delta-scope="leader" data-pct-behind="10.0" data-delta-ascii="-10.0%" title="-10.0% vs. #1 leader weapon">−10.0% vs. leader<'
    )

    // Expanded top-build deltas explicitly label "vs. weapon best" and carry data-delta-scope="weapon-best"
    expect(html).toContain(
      'data-testid="weapon-compare-build-delta-FavoniusSword-0" data-delta-scope="weapon-best" data-delta-ascii="0.0%" title="Best build for this weapon (0.0% vs. weapon best)">0.0% vs. weapon best<'
    )
    expect(html).toContain(
      'data-testid="weapon-compare-build-delta-FavoniusSword-1" data-delta-scope="weapon-best" data-delta-ascii="-2.0%" title="-2.0% vs. this weapon&#x27;s best build">−2.0% vs. weapon best<'
    )
  })

  it('unifies current build terminology on "Current" across rank pills, delta chips, and weapon comparison badges with "Your currently equipped build" tooltips (current-build-naming)', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!

    // 1. BuildComparisonList: both rank pill and delta chip use "Current" (not "Baseline")
    const buildHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: { total: 300000, stats: {}, instances: [] },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 330000,
            evaluation: { total: 330000, stats: {}, instances: [] },
          },
        ]}
      />
    )
    expect(buildHtml).toContain(
      'class="comp-rank-pill comp-rank-current" data-testid="comp-rank-current" title="Your currently equipped build">Current<'
    )
    expect(buildHtml).toContain(
      'class="comp-row-delta muted" data-testid="comp-delta-current" data-delta-sign="baseline" data-delta-ascii="Current" title="Your currently equipped build">Current<'
    )
    expect(buildHtml).not.toContain('>Baseline<')
    expect(buildHtml).not.toContain('>Current Baseline<')

    // 2. WeaponComparisonPanel and WeaponComparisonList: badge uses "Current" (not "Current Baseline")
    const favCand = {
      weaponKey: 'FavoniusSword',
      level: 90,
      ascension: 6,
      refinement: 5,
      isOwned: true,
      ownedWeaponId: 'w_fav',
      isEquippedBaseline: true,
    }
    const panelHtml = renderToStaticMarkup(
      <WeaponComparisonPanel
        targetCharacterKey="Furina"
        good={null}
        selectedCandidates={[favCand]}
        onChangeCandidates={() => {}}
      />
    )
    expect(panelHtml).toContain(
      'class="comp-baseline-tag" data-testid="weapon-compare-config-baseline-FavoniusSword" title="Your currently equipped build">Current<'
    )
    expect(panelHtml).not.toContain('>Current Baseline<')

    const rankedWeapons = rankWeaponComparisonRows([
      {
        candidate: favCand,
        status: 'ok',
        rank: null,
        total: 400000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 400000 },
        evaluation: { total: 400000, stats: {}, instances: [] },
        tested: 10,
        skipped: 0,
        durationMs: 1,
      },
    ])
    const listHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedWeapons}
        artifactById={new Map()}
      />
    )
    expect(listHtml).toContain(
      'class="comp-baseline-tag" data-testid="weapon-compare-baseline-badge-FavoniusSword" title="Your currently equipped build">Current<'
    )
    expect(listHtml).not.toContain('>Current Baseline<')
  })

  it('uses plain user-facing language for conditionals, rotation labels, parse diagnostics, and team results (user-facing-language)', () => {
    // 1. Human-readable conditional formatting
    const gtEntry = formatHumanConditionalEntry('GoldenTroupe', 'set4', 'on')
    expect(gtEntry).toBe(
      'Golden Troupe: Character is off-field (Active (On))'
    )

    const mhEntry = formatHumanConditionalEntry(
      'MarechausseeHunter',
      'set4',
      '3'
    )
    expect(mhEntry).toBe('Marechaussee Hunter: After HP changes (3 Stacks)')

    // 2. Rotation row label falls back to human formula name and never renders raw dot paths
    expect(formatRotationRowLabel('skill.0', ['skill', '0'])).toBe(
      'Elemental Skill — 1-Hit DMG'
    )
    expect(formatRotationRowLabel('', ['normal', '2'])).toBe(
      'Normal Attack — 3-Hit DMG'
    )
    expect(humanizeFormulaPath(['skill', 'usherDmg'])).toBe(
      'Elemental Skill — Usher DMG'
    )

    // 3. Plain-language import parse diagnostics (1-based index + plain description)
    const artIssue = formatParseIssuePlain({
      severity: 'warning',
      path: 'artifacts[812].substats[1].key',
      message: "Unrecognized substat key 'critRate'; substat ignored.",
    })
    expect(artIssue.entryLabel).toBe('Artifact #813')
    expect(artIssue.description).toBe(
      "a substat has an unknown type ('critRate')"
    )

    const charIssue = formatParseIssuePlain({
      severity: 'error',
      path: 'characters[0].key',
      message: 'Character is missing a string "key".',
    })
    expect(charIssue.entryLabel).toBe('Character #1')
    expect(charIssue.description).toBe('Character is missing a name.')

    // 4. TeamOptimizationList uses "Artifacts assigned without overlap" and member names instead of SLOT 1/2
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const teamHtml = renderToStaticMarkup(
      <TeamOptimizationList
        preset={preset}
        artifactById={new Map()}
        result={{
          teamTotal: 500000,
          currentTeamTotal: 450000,
          tested: 100,
          skipped: 0,
          durationMs: 10,
          members: [
            {
              memberKey: 'Furina',
              memberIndex: 0,
              skippedSolver: false,
              rotationRowCount: 1,
              selection: { artifactIds: {} },
              currentSelection: { artifactIds: {} },
              subtotal: 500000,
              currentSubtotal: 450000,
              evaluation: { total: 500000, stats: {}, instances: [] },
              currentEvaluation: null,
              tested: 100,
              skipped: 0,
              durationMs: 10,
            },
          ],
        }}
      />
    )
    expect(teamHtml).toContain('Artifacts assigned without overlap')
    expect(teamHtml).not.toContain('Disjoint 5pc Assignment')
    expect(teamHtml).toContain('data-testid="team-opt-rank-Furina">Furina<')
    expect(teamHtml).not.toContain('>SLOT 1<')
  })

  it('collapses SolverPoolFiltersPanel by default when unrestricted, keeps summary visible, and persists expanded state per session (collapsible-panels)', () => {
    resetSolverPoolFiltersExpandedSession()
    const renderTree = (settings: OptimizerSettings) => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          <SolverPoolFiltersPanel settings={settings} onChange={() => {}} />
        )
      } finally {
        hookStore.active = false
      }
    }

    // 1. Fresh session + unrestricted -> starts collapsed, summary visible
    let tree = renderTree(DEFAULT_OPTIMIZER_SETTINGS)
    expect(
      findByTestId(tree, 'solver-pool-filters-summary')?.children
    ).toContain('All pieces allowed')
    expect(
      findByTestId(tree, 'solver-pool-filters-toggle')?.props['aria-expanded']
    ).toBe(false)
    expect(findByTestId(tree, 'solver-pool-filters-body')).toBeUndefined()

    // 2. Expand in session -> body is rendered
    ;(
      findByTestId(tree, 'solver-pool-filters-toggle')!.props.onClick as () => void
    )()
    tree = renderTree(DEFAULT_OPTIMIZER_SETTINGS)
    expect(
      findByTestId(tree, 'solver-pool-filters-toggle')?.props['aria-expanded']
    ).toBe(true)
    expect(findByTestId(tree, 'solver-pool-filters-body')).toBeDefined()

    // 3. Re-mount component in the same session (hookStore reset simulates unmounting & remounting) -> stays expanded
    hookStore.reset()
    const remountedTree = renderTree(DEFAULT_OPTIMIZER_SETTINGS)
    expect(
      findByTestId(remountedTree, 'solver-pool-filters-toggle')?.props[
        'aria-expanded'
      ]
    ).toBe(true)
    expect(
      findByTestId(remountedTree, 'solver-pool-filters-body')
    ).toBeDefined()
  })

  it('aligns 5 artifact cards horizontally including off-piece Shimenawa Reminiscence and highlights active Level Range filter in SolverPoolFiltersPanel when only a level range is set (visual-design-pass)', () => {
    // 1. Build with 4pc Golden Troupe + off-piece Shimenawa's Reminiscence produces 5 cards with identical 5-zone structure
    const preset = getBundledPreset('official/furina-salon-subdps')!
    const pieces: IArtifact[] = [
      {
        id: 'a-flower',
        setKey: 'GoldenTroupe',
        slotKey: 'flower',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 10.5 },
          { key: 'critDMG_', value: 14.0 },
          { key: 'hp_', value: 9.9 },
          { key: 'enerRech_', value: 11.0 },
        ],
      },
      {
        id: 'a-plume',
        setKey: 'GoldenTroupe',
        slotKey: 'plume',
        level: 20,
        rarity: 5,
        mainStatKey: 'atk',
        location: 'Furina',
        lock: true,
        substats: [
          { key: 'critRate_', value: 7.8 },
          { key: 'critDMG_', value: 21.0 },
          { key: 'hp_', value: 5.8 },
          { key: 'enerRech_', value: 6.5 },
        ],
      },
      {
        id: 'a-sands',
        setKey: 'GoldenTroupe',
        slotKey: 'sands',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: 'Furina',
        lock: false,
        substats: [
          { key: 'critRate_', value: 11.7 },
          { key: 'critDMG_', value: 13.2 },
          { key: 'enerRech_', value: 16.2 },
        ],
      },
      {
        id: 'a-goblet',
        setKey: 'GoldenTroupe',
        slotKey: 'goblet',
        level: 20,
        rarity: 5,
        mainStatKey: 'hp_',
        location: '',
        lock: true,
        substats: [
          { key: 'critRate_', value: 9.7 },
          { key: 'critDMG_', value: 19.4 },
          { key: 'enerRech_', value: 11.7 },
          { key: 'hp', value: 508 },
        ],
      },
      {
        id: 'a-circlet',
        setKey: 'ShimenawasReminiscence',
        slotKey: 'circlet',
        level: 20,
        rarity: 5,
        mainStatKey: 'critDMG_',
        location: 'HuTao',
        lock: true,
        substats: [
          { key: 'critRate_', value: 14.0 },
          { key: 'hp_', value: 10.5 },
          { key: 'enerRech_', value: 12.3 },
          { key: 'eleMas', value: 23 },
        ],
      },
    ]
    const artMap = new Map(pieces.map((p) => [p.id, p]))
    const fullSelection = {
      weaponId: 'w1',
      artifactIds: {
        flower: 'a-flower',
        plume: 'a-plume',
        sands: 'a-sands',
        goblet: 'a-goblet',
        circlet: 'a-circlet',
      },
    }

    const detailsHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={artMap}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: fullSelection,
          evaluation: { total: 350000, stats: { hp: 39000 }, instances: [] },
        }}
        optimizedBuilds={[
          {
            selection: fullSelection,
            total: 380000,
            evaluation: { total: 380000, stats: { hp: 41000 }, instances: [] },
          },
        ]}
      />
    )

    // Verify all 5 cards render the 5-zone template and numeric stat headers carry right-aligned comp-stat-num
    expect(detailsHtml).toContain('Shimenawa&#x27;s Reminiscence')
    expect(detailsHtml.match(/data-testid="artifact-piece-header"/g)).toHaveLength(5)
    expect(detailsHtml.match(/data-testid="artifact-piece-rv-row"/g)).toHaveLength(5)
    expect(detailsHtml.match(/data-testid="artifact-piece-main-row"/g)).toHaveLength(5)
    expect(detailsHtml.match(/data-testid="artifact-piece-substats"/g)).toHaveLength(5)
    expect(detailsHtml.match(/data-testid="artifact-piece-owner-row"/g)).toHaveLength(5)
    expect(detailsHtml).toContain('<th class="comp-stat-col-label">Stat</th>')
    expect(detailsHtml).toContain('<th class="comp-stat-num">Current</th>')
    expect(detailsHtml).toContain('<th class="comp-stat-num">This Build</th>')
    expect(detailsHtml).toContain('<th class="comp-stat-num">Diff</th>')

    // 2. Pool Filters panel with ONLY a level range set (16..20) marks only the level range control as active
    resetSolverPoolFiltersExpandedSession()
    const levelOnlyHtml = renderToStaticMarkup(
      <SolverPoolFiltersPanel
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          levelLow: 16,
          levelHigh: 20,
        }}
        onChange={() => {}}
      />
    )
    expect(levelOnlyHtml).toContain('1 pool filter active')
    expect(levelOnlyHtml).toContain(
      'class="opt-pool-filter-field is-active" data-testid="pool-filter-field-level" data-active="true"'
    )
    expect(levelOnlyHtml).toContain(
      'class="opt-pool-active-pill" data-testid="pool-filter-active-level">Lv. 16–20<'
    )
    expect(levelOnlyHtml).toContain(
      'class="opt-pool-filter-field" data-testid="pool-filter-field-rarity" data-active="false"'
    )
    expect(levelOnlyHtml).toContain(
      'class="opt-pool-filter-field" data-testid="pool-filter-field-rv" data-active="false"'
    )
  })

  it('enforces full-width stat table, readable global type scale floors, and balanced Goblet DMG% chip sub-group without orphan chips (visual-design-followup)', () => {
    const cssPath = path.resolve(__dirname, '../src/app/globals.css')
    const cssText = fs.readFileSync(cssPath, 'utf-8')

    // 1. Stat table spans full width (no max-width: 680px)
    const statTableBlockMatch = cssText.match(
      /\.comp-stat-diff-table\s*\{([^}]*)\}/
    )
    expect(statTableBlockMatch).not.toBeNull()
    expect(statTableBlockMatch![1]).toContain('width: 100%')
    expect(statTableBlockMatch![1]).not.toContain('max-width')

    // 2. Global type scale floors in globals.css:
    //    - --font-body is 0.95rem
    //    - no font-size declaration in globals.css is below 0.78rem
    expect(cssText).toContain('--font-body: 0.95rem;')
    const fontSizeMatches = [
      ...cssText.matchAll(/font-size:\s*([0-9.]+)rem/g),
    ]
    expect(fontSizeMatches.length).toBeGreaterThan(20)
    for (const m of fontSizeMatches) {
      const remVal = Number(m[1])
      expect(remVal).toBeGreaterThanOrEqual(0.78)
    }

    // 3. Goblet main-stat row balances core stats (4 chips) and elemental/physical DMG% stats (8 chips in 4-col grid)
    resetSolverPoolFiltersExpandedSession()
    const gobletHtml = renderToStaticMarkup(
      <SolverPoolFiltersPanel
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          mainStatKeys: { goblet: ['hydro_dmg_'] },
        }}
        onChange={() => {}}
      />
    )
    expect(gobletHtml).toContain('data-testid="mainstat-core-subgroup-goblet"')
    expect(gobletHtml).toContain('data-testid="mainstat-dmg-subgroup-goblet"')
    expect(gobletHtml).toContain(
      'data-testid="mainstat-chip-goblet-hydro_dmg_" aria-pressed="true" class="constraint-picker-chip is-selected"'
    )
  })

  it('supports per-candidate Effects expander, independent target conditional toggles, Setup differs indicator with detailed tooltip, and Reset Effects in weapon comparison (weapon-compare-effects-setup)', () => {
    const preset = getBundledPreset('akasha/furina-salon-pjc-c0')!
    const furinaCatalog = [
      {
        sheet: 'SplendorOfTranquilWaters',
        key: 'selfHpChange',
        name: 'Splendor of Tranquil Waters — After HP changes',
        states: [
          { key: '1', name: '1 Time' },
          { key: '2', name: '2 Times' },
          { key: '3', name: '3 Times' },
        ],
        canShow: true,
        category: 'weapon' as const,
      },
      {
        sheet: 'GoldenTroupe',
        key: 'set4',
        name: 'Golden Troupe — Character is off-field',
        states: [{ key: 'on', name: 'Active (On)' }],
        canShow: true,
        category: 'artifact' as const,
      },
      {
        sheet: 'Furina',
        key: 'burstFanfare',
        name: 'Furina — Fanfare',
        states: [
          { key: '150', name: '150 Stacks' },
          { key: '300', name: '300 Stacks' },
        ],
        canShow: true,
        category: 'character' as const,
      },
      {
        sheet: 'Furina',
        key: 'c2Overstack',
        name: 'Furina — Fanfare above the limit',
        states: [{ key: '400', name: '400 Stacks' }],
        canShow: true,
        category: 'constellation' as const,
      },
    ]

    const goodWithGoldenTroupe = {
      format: 'GOOD' as const,
      version: 2,
      source: 'test',
      characters: [
        {
          key: 'Furina',
          level: 90,
          constellation: 0,
          ascension: 6,
          talent: { auto: 1, skill: 10, burst: 10 },
        },
      ],
      weapons: [
        {
          id: 'w_fav',
          key: 'FavoniusSword',
          level: 90,
          ascension: 6,
          refinement: 5,
          location: 'Furina',
          lock: true,
        },
      ],
      artifacts: [
        {
          id: 'a1',
          setKey: 'GoldenTroupe',
          slotKey: 'flower' as const,
          level: 20,
          rarity: 5,
          mainStatKey: 'hp',
          location: 'Furina',
          lock: true,
          substats: [],
        },
        {
          id: 'a2',
          setKey: 'GoldenTroupe',
          slotKey: 'plume' as const,
          level: 20,
          rarity: 5,
          mainStatKey: 'atk',
          location: 'Furina',
          lock: true,
          substats: [],
        },
      ],
    }

    let candidates = [
      resolveWeaponCompareCandidate(
        'FavoniusSword',
        'Furina',
        goodWithGoldenTroupe,
        {}
      ),
      resolveWeaponCompareCandidate(
        'SplendorOfTranquilWaters',
        'Furina',
        goodWithGoldenTroupe,
        {}
      ),
      resolveWeaponCompareCandidate(
        'FleuveCendreFerryman',
        'Furina',
        goodWithGoldenTroupe,
        {}
      ),
    ]

    hookStore.reset()
    const renderPanel = () => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        return evaluateTree(
          <WeaponComparisonPanel
            targetCharacterKey="Furina"
            good={goodWithGoldenTroupe}
            preset={preset}
            settings={DEFAULT_OPTIMIZER_SETTINGS}
            conditionalsByChar={{ Furina: furinaCatalog }}
            selectedCandidates={candidates}
            onChangeCandidates={(next) => {
              candidates = next
            }}
          />
        )
      } finally {
        hookStore.active = false
      }
    }

    // 1. Initially all 3 candidates match their seeded state -> no Setup differs badges
    let tree = renderPanel()
    expect(
      findByTestId(tree, 'weapon-compare-setup-differs-FavoniusSword')
    ).toBeUndefined()
    expect(
      findByTestId(
        tree,
        'weapon-compare-setup-differs-SplendorOfTranquilWaters'
      )
    ).toBeUndefined()
    expect(
      findByTestId(tree, 'weapon-compare-setup-differs-FleuveCendreFerryman')
    ).toBeUndefined()

    // 2. Open Effects expander on Candidate 2 (SplendorOfTranquilWaters)
    const effectsBtn2 = findByTestId(
      tree,
      'weapon-compare-effects-toggle-SplendorOfTranquilWaters'
    )!
    expect(effectsBtn2.props['aria-expanded']).toBe(false)
    ;(effectsBtn2.props.onClick as () => void)()

    tree = renderPanel()
    expect(
      findByTestId(
        tree,
        'weapon-compare-effects-panel-SplendorOfTranquilWaters'
      )
    ).toBeDefined()
    expect(
      findByTestId(
        tree,
        'weapon-compare-effects-weapon-SplendorOfTranquilWaters'
      )
    ).toBeDefined()
    expect(
      findByTestId(
        tree,
        'weapon-compare-effects-artifact-SplendorOfTranquilWaters'
      )
    ).toBeDefined()
    expect(
      findByTestId(
        tree,
        'weapon-compare-effects-character-SplendorOfTranquilWaters'
      )
    ).toBeDefined()
    expect(
      findByTestId(
        tree,
        'weapon-compare-effects-constellation-SplendorOfTranquilWaters'
      )
    ).toBeDefined()

    // 3. Configure Candidate 2's weapon stacks (SplendorOfTranquilWaters.selfHpChange -> '1')
    //    AND artifact-set conditional (GoldenTroupe.set4 -> 'off')
    const wepSelect = findByTestId(
      tree,
      'weapon-compare-cond-SplendorOfTranquilWaters-select-Furina-SplendorOfTranquilWaters-selfHpChange'
    )!
    ;(
      wepSelect.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '1' } })

    tree = renderPanel()
    const artToggle = findByTestId(
      tree,
      'weapon-compare-cond-SplendorOfTranquilWaters-toggle-Furina-GoldenTroupe-set4'
    )!
    ;(artToggle.props.onClick as () => void)()

    tree = renderPanel()

    // Candidates 1 and 3 remain untouched; Candidate 2 has both overrides
    expect(candidates[0]!.targetConditionals).toEqual({})
    expect(candidates[2]!.targetConditionals).toEqual({})
    expect(candidates[1]!.targetConditionals).toEqual({
      SplendorOfTranquilWaters: { selfHpChange: '1' },
      GoldenTroupe: { set4: 'off' },
    })

    // 4. Setup differs badge appears ONLY on Candidate 2 with tooltip listing both differences
    expect(
      findByTestId(tree, 'weapon-compare-setup-differs-FavoniusSword')
    ).toBeUndefined()
    expect(
      findByTestId(tree, 'weapon-compare-setup-differs-FleuveCendreFerryman')
    ).toBeUndefined()

    const differsBadge2 = findByTestId(
      tree,
      'weapon-compare-setup-differs-SplendorOfTranquilWaters'
    )!
    expect(differsBadge2).toBeDefined()
    const tooltipText = String(differsBadge2.props.title ?? '')
    expect(tooltipText).toContain('Setup differs from seeded Buffs & Passives state:')
    expect(tooltipText).toContain(
      'Splendor of Tranquil Waters — After HP changes: 1 Time (seeded: 3 Times)'
    )
    expect(tooltipText).toContain(
      'Golden Troupe — Character is off-field: Off (seeded: Active (On))'
    )

    // 5. WeaponComparisonList also renders the Setup differs indicator on Candidate 2's result row
    const rankedResult = rankWeaponComparisonRows(
      candidates.map((cand, idx) => ({
        candidate: cand,
        status: 'ok' as const,
        rank: null,
        total: 400000 - idx * 20000,
        percentBehindLeader: null,
        bestBuild: { artifactIds: {}, total: 400000 - idx * 20000 },
        evaluation: {
          total: 400000 - idx * 20000,
          stats: {},
          instances: [],
        },
        tested: 10,
        skipped: 0,
        durationMs: 1,
      }))
    )
    const listHtml = renderToStaticMarkup(
      <WeaponComparisonList
        preset={preset}
        result={rankedResult}
        artifactById={new Map()}
        settings={DEFAULT_OPTIMIZER_SETTINGS}
        good={goodWithGoldenTroupe}
        conditionalsByChar={{ Furina: furinaCatalog }}
      />
    )
    expect(listHtml).toContain(
      'data-testid="weapon-compare-result-setup-differs-SplendorOfTranquilWaters"'
    )
    expect(listHtml).not.toContain(
      'data-testid="weapon-compare-result-setup-differs-FavoniusSword"'
    )
    expect(listHtml).not.toContain(
      'data-testid="weapon-compare-result-setup-differs-FleuveCendreFerryman"'
    )

    // 6. Clicking Reset Effects on Candidate 2 restores seeded state and clears Setup differs
    const resetEffectsBtn2 = findByTestId(
      tree,
      'weapon-compare-effects-reset-SplendorOfTranquilWaters'
    )!
    expect(resetEffectsBtn2.props.disabled).toBe(false)
    ;(resetEffectsBtn2.props.onClick as () => void)()

    tree = renderPanel()
    expect(candidates[1]!.targetConditionals).toEqual({})
    expect(
      findByTestId(
        tree,
        'weapon-compare-setup-differs-SplendorOfTranquilWaters'
      )
    ).toBeUndefined()
  })

  it('extended-stat-display: renders "Additional Bonuses" group with non-zero elemental and talent-type DMG% bonuses, omits zero entries, and shows vs. Current diffs in the established format', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!

    const currentStats = {
      hp: 38000,
      atk: 1200,
      def: 850,
      eleMas: 40,
      enerRech_: 1.6,
      critRate_: 0.8,
      critDMG_: 1.9,
      hydro_dmg_: 0.466,
      pyro_dmg_: 0,
      normal_dmg_: 0,
      charged_dmg_: 0,
      plunging_dmg_: 0,
      skill_dmg_: 0.7,
      burst_dmg_: 0,
    }

    const shimenawaBuildStats = {
      hp: 39500,
      atk: 1280,
      def: 850,
      eleMas: 40,
      enerRech_: 1.65,
      critRate_: 0.82,
      critDMG_: 2.05,
      hydro_dmg_: 0.466, // 0.0% diff vs Current
      pyro_dmg_: 0, // zero -> omitted
      electro_dmg_: 0, // zero -> omitted
      normal_dmg_: 0.5, // +50.0% vs Current (Shimenawa 4pc)
      charged_dmg_: 0.5, // +50.0% vs Current (Shimenawa 4pc)
      plunging_dmg_: 0.5, // +50.0% vs Current (Shimenawa 4pc)
      skill_dmg_: 0.55, // -15.0% vs Current (0.70 -> 0.55)
      burst_dmg_: 0, // zero -> omitted
    }

    // 1. Comparison mode (opt-0 expanded vs Current)
    const diffHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="opt-0"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: {
            total: 350000,
            stats: currentStats,
            instances: [],
          },
        }}
        optimizedBuilds={[
          {
            selection: { weaponId: 'w1', artifactIds: {} },
            total: 380000,
            evaluation: {
              total: 380000,
              stats: shimenawaBuildStats,
              instances: [],
            },
          },
        ]}
      />
    )

    expect(diffHtml).toContain('data-testid="comp-additional-bonuses-opt-0"')
    expect(diffHtml).toContain(
      'data-testid="comp-additional-bonuses-header-opt-0"'
    )
    expect(diffHtml).toContain('>Additional Bonuses<')

    // Non-zero elemental & talent-type bonuses are rendered with labels, values, and diffs
    expect(diffHtml).toContain('data-testid="comp-stat-row-opt-0-hydro_dmg_"')
    expect(diffHtml).toContain('>Hydro DMG Bonus<')
    expect(diffHtml).toContain(
      'data-testid="comp-stat-current-opt-0-hydro_dmg_">46.6%<'
    )
    expect(diffHtml).toContain(
      'data-testid="comp-stat-value-opt-0-hydro_dmg_"><strong>46.6%</strong><'
    )
    expect(diffHtml).toContain(
      'data-testid="comp-stat-diff-opt-0-hydro_dmg_" data-diff-sign="0" data-diff-ascii="0.0%">0.0%<'
    )

    expect(diffHtml).toContain('data-testid="comp-stat-row-opt-0-normal_dmg_"')
    expect(diffHtml).toContain('>Normal DMG Bonus<')
    expect(diffHtml).toContain(
      'data-testid="comp-stat-current-opt-0-normal_dmg_">0.0%<'
    )
    expect(diffHtml).toContain(
      'data-testid="comp-stat-value-opt-0-normal_dmg_"><strong>50.0%</strong><'
    )
    expect(diffHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta ok" data-testid="comp-stat-diff-opt-0-normal_dmg_" data-diff-sign="+" data-diff-ascii="+50.0%">+50.0%<'
    )

    expect(diffHtml).toContain('data-testid="comp-stat-row-opt-0-charged_dmg_"')
    expect(diffHtml).toContain('>Charged DMG Bonus<')
    expect(diffHtml).toContain(
      'data-testid="comp-stat-row-opt-0-plunging_dmg_"'
    )
    expect(diffHtml).toContain('>Plunging DMG Bonus<')

    expect(diffHtml).toContain('data-testid="comp-stat-row-opt-0-skill_dmg_"')
    expect(diffHtml).toContain('>Skill DMG Bonus<')
    expect(diffHtml).toContain(
      'class="comp-stat-num comp-stat-diff-delta muted" data-testid="comp-stat-diff-opt-0-skill_dmg_" data-diff-sign="-" data-diff-ascii="-15.0%">−15.0%<'
    )

    // Zero entries are omitted
    expect(diffHtml).not.toContain('data-testid="comp-stat-row-opt-0-pyro_dmg_"')
    expect(diffHtml).not.toContain(
      'data-testid="comp-stat-row-opt-0-electro_dmg_"'
    )
    expect(diffHtml).not.toContain(
      'data-testid="comp-stat-row-opt-0-burst_dmg_"'
    )

    // 2. Plain mode (Current build expanded)
    const plainHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="current"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: {
            total: 350000,
            stats: currentStats,
            instances: [],
          },
        }}
        optimizedBuilds={[]}
      />
    )
    expect(plainHtml).toContain('data-testid="comp-additional-bonuses-current"')
    expect(plainHtml).toContain(
      'data-testid="comp-stat-value-current-hydro_dmg_"><strong>46.6%</strong><'
    )
    expect(plainHtml).toContain(
      'data-testid="comp-stat-value-current-skill_dmg_"><strong>70.0%</strong><'
    )
    expect(plainHtml).not.toContain(
      'data-testid="comp-stat-row-current-normal_dmg_"'
    )

    // 3. When all extended bonuses are zero, the Additional Bonuses group is omitted
    const zeroBonusesHtml = renderToStaticMarkup(
      <BuildComparisonList
        preset={preset}
        artifactById={new Map()}
        initialExpandedRowId="current"
        currentBuild={{
          selection: { weaponId: 'w1', artifactIds: {} },
          evaluation: {
            total: 350000,
            stats: {
              hp: 38000,
              atk: 1200,
              def: 850,
              eleMas: 40,
              enerRech_: 1.6,
              critRate_: 0.8,
              critDMG_: 1.9,
            },
            instances: [],
          },
        }}
        optimizedBuilds={[]}
      />
    )
    expect(zeroBonusesHtml).not.toContain(
      'data-testid="comp-additional-bonuses-current"'
    )
  })
})
