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
  formatRelativeDelta,
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
})
