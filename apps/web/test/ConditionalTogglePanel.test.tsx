import type { ConditionalDescriptor } from '@gi/engine'
import type { IGOOD } from '@gi/good'
import {
  DEFAULT_OPTIMIZER_SETTINGS,
  getBundledPreset,
  getPresetConditionalOverrides,
  hasMemberConditionalOverrides,
  type OptimizerSettings,
} from '@gi/presets'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface EffectEntry {
  deps: readonly unknown[] | undefined
  cleanup?: (() => void) | void
}

const hookStore = {
  active: false,
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  effects: [] as EffectEntry[],
  pendingEffects: [] as Array<{ idx: number; fn: () => (() => void) | void }>,
  stateIdx: 0,
  refIdx: 0,
  effectIdx: 0,
  reset() {
    for (const eff of this.effects) {
      if (typeof eff.cleanup === 'function') {
        eff.cleanup()
      }
    }
    this.states = []
    this.refs = []
    this.effects = []
    this.pendingEffects = []
    this.stateIdx = 0
    this.refIdx = 0
    this.effectIdx = 0
  },
  beginRender() {
    this.stateIdx = 0
    this.refIdx = 0
    this.effectIdx = 0
    this.pendingEffects = []
  },
  flushEffects() {
    const queue = [...this.pendingEffects]
    this.pendingEffects = []
    for (const item of queue) {
      const prev = this.effects[item.idx]
      if (prev && typeof prev.cleanup === 'function') {
        prev.cleanup()
      }
      const cleanup = item.fn()
      if (this.effects[item.idx]) {
        this.effects[item.idx]!.cleanup = cleanup
      }
    }
  },
}

function depsChanged(
  prev: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined
): boolean {
  if (!prev || !next) return true
  if (prev.length !== next.length) return true
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true
  }
  return false
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
    useRef<T>(initial: T) {
      if (!hookStore.active) {
        return actual.useRef(initial)
      }
      const idx = hookStore.refIdx++
      if (idx >= hookStore.refs.length) {
        hookStore.refs.push({ current: initial })
      }
      return hookStore.refs[idx] as { current: T }
    },
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      if (!hookStore.active) {
        return actual.useMemo(factory, deps ?? [])
      }
      return factory()
    },
    useEffect(
      effect: () => (() => void) | void,
      deps?: readonly unknown[]
    ) {
      if (!hookStore.active) {
        return actual.useEffect(effect, deps)
      }
      const idx = hookStore.effectIdx++
      const existing = hookStore.effects[idx]
      if (!existing || depsChanged(existing.deps, deps)) {
        hookStore.effects[idx] = {
          deps: deps ? [...deps] : undefined,
          cleanup: existing?.cleanup,
        }
        hookStore.pendingEffects.push({ idx, fn: effect })
      }
    },
  }
})

import { ConditionalTogglePanel } from '../src/components/ConditionalTogglePanel'

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

function findAll(
  nodes: Array<VNode | string>,
  pred: (n: VNode) => boolean
): VNode[] {
  const out: VNode[] = []
  for (const n of nodes) {
    if (typeof n === 'string') continue
    if (pred(n)) out.push(n)
    out.push(...findAll(n.children, pred))
  }
  return out
}

function findByTestId(
  nodes: Array<VNode | string>,
  testId: string
): VNode | undefined {
  return findAll(nodes, (n) => n.props['data-testid'] === testId)[0]
}

const SAMPLE_CATALOG: Record<string, ConditionalDescriptor[]> = {
  Furina: [
    {
      sheet: 'SplendorOfTranquilWaters',
      key: 'hpIncrease',
      name: 'Splendor of Tranquil Waters — Max HP Increase',
      states: [
        { key: '1', name: '1 Stack' },
        { key: '2', name: '2 Stacks' },
      ],
      canShow: true,
      category: 'weapon',
      section: 'weapon',
    },
    {
      sheet: 'SplendorOfTranquilWaters',
      key: 'eleSkillDmg',
      name: 'Splendor of Tranquil Waters — Skill DMG Increase',
      states: [
        { key: '1', name: '1 Stack' },
        { key: '2', name: '2 Stacks' },
        { key: '3', name: '3 Stacks' },
      ],
      canShow: true,
      category: 'weapon',
      section: 'weapon',
    },
    {
      sheet: 'NoblesseOblige',
      key: 'set4',
      name: 'Noblesse Oblige — Elemental Burst Used',
      states: [{ key: 'on', name: 'Active (On)' }],
      canShow: true,
      isTeamBuff: true,
      category: 'artifact',
      section: 'set4',
    },
    {
      sheet: 'Furina',
      key: 'burstFanfare',
      name: 'Furina — Fanfare Stacks',
      states: [
        { key: '200', name: '200 Fanfare' },
        { key: '250', name: '250 Fanfare' },
        { key: '300', name: '300 Fanfare' },
      ],
      canShow: true,
      isTeamBuff: true,
      category: 'character',
      section: 'burst',
    },
    {
      sheet: 'Furina',
      key: 'c2Overstack',
      name: 'Furina — C2 Overstack Fanfare',
      states: [{ key: '400', name: '400 Overstack' }],
      canShow: true,
      category: 'constellation',
      section: 'constellation2',
    },
  ],
  Neuvillette: [
    {
      sheet: 'TomeOfTheEternalFlow',
      key: 'caDmg',
      name: 'Tome of the Eternal Flow — Charged Attack DMG',
      states: [
        { key: '1', name: '1 Stack' },
        { key: '2', name: '2 Stacks' },
        { key: '3', name: '3 Stacks' },
      ],
      canShow: true,
      category: 'weapon',
      section: 'weapon',
    },
    {
      sheet: 'MarechausseeHunter',
      key: 'set4',
      name: 'Marechaussee Hunter — HP Change Stacks',
      states: [
        { key: '1', name: '1 Stack' },
        { key: '2', name: '2 Stacks' },
        { key: '3', name: '3 Stacks' },
      ],
      canShow: true,
      category: 'artifact',
      section: 'set4',
    },
  ],
  KaedeharaKazuha: [
    {
      sheet: 'FreedomSworn',
      key: 'MillennialMovement',
      name: 'Freedom-Sworn — Millennial Movement: Song of Resistance',
      states: [{ key: 'on', name: 'Active (On)' }],
      canShow: true,
      isTeamBuff: true,
      category: 'weapon',
      section: 'weapon',
    },
    {
      sheet: 'ViridescentVenerer',
      key: 'swirlhydro',
      name: 'Viridescent Venerer — Swirl Hydro',
      states: [{ key: 'hydro', name: 'Hydro' }],
      canShow: true,
      isTeamBuff: true,
      category: 'artifact',
      section: 'set4',
    },
    {
      sheet: 'KaedeharaKazuha',
      key: 'swirlhydro',
      name: 'Kaedehara Kazuha — Poetics of Fuubutsu (Hydro)',
      states: [{ key: 'hydro', name: 'Hydro' }],
      canShow: true,
      isTeamBuff: true,
      category: 'character',
      section: 'passive2',
    },
    {
      sheet: 'KaedeharaKazuha',
      key: 'c2',
      name: 'Kaedehara Kazuha — Yamaarashi Tailwind (C2)',
      states: [{ key: 'on', name: 'Active (On)' }],
      canShow: true,
      isTeamBuff: true,
      category: 'constellation',
      section: 'constellation2',
    },
  ],
  Zhongli: [
    {
      sheet: 'ArchaicPetra',
      key: 'element',
      name: 'Archaic Petra — Crystallize Shard Element',
      states: [
        { key: 'pyro', name: 'Pyro' },
        { key: 'hydro', name: 'Hydro' },
      ],
      canShow: true,
      isTeamBuff: true,
      category: 'artifact',
      section: 'set4',
    },
    {
      sheet: 'Zhongli',
      key: 'skill',
      name: 'Zhongli — Jade Shield RES Shred',
      states: [{ key: 'on', name: 'Active (On)' }],
      canShow: true,
      isTeamBuff: true,
      category: 'character',
      section: 'skill',
    },
  ],
}

const SAMPLE_GOOD: IGOOD = {
  format: 'GOOD',
  version: 2,
  source: 'test',
  characters: [
    {
      key: 'Furina',
      level: 90,
      constellation: 0,
      ascension: 6,
      talent: { auto: 6, skill: 10, burst: 10 },
    },
    {
      key: 'Neuvillette',
      level: 90,
      constellation: 0,
      ascension: 6,
      talent: { auto: 10, skill: 10, burst: 10 },
    },
  ],
  weapons: [
    {
      id: 'w_furina',
      key: 'SplendorOfTranquilWaters',
      level: 90,
      ascension: 6,
      refinement: 1,
      location: 'Furina',
      lock: true,
    },
    {
      id: 'w_neuv',
      key: 'TomeOfTheEternalFlow',
      level: 90,
      ascension: 6,
      refinement: 1,
      location: 'Neuvillette',
      lock: true,
    },
  ],
  artifacts: [
    {
      id: 'a1',
      setKey: 'GoldenTroupe',
      slotKey: 'flower',
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
      slotKey: 'plume',
      level: 20,
      rarity: 5,
      mainStatKey: 'atk',
      location: 'Furina',
      lock: true,
      substats: [],
    },
    {
      id: 'a3',
      setKey: 'GoldenTroupe',
      slotKey: 'sands',
      level: 20,
      rarity: 5,
      mainStatKey: 'hp_',
      location: 'Furina',
      lock: true,
      substats: [],
    },
    {
      id: 'a4',
      setKey: 'GoldenTroupe',
      slotKey: 'goblet',
      level: 20,
      rarity: 5,
      mainStatKey: 'hydro_dmg_',
      location: 'Furina',
      lock: true,
      substats: [],
    },
  ],
}

describe('ConditionalTogglePanel Component (conditional-toggle-panel)', () => {
  beforeEach(() => {
    hookStore.reset()
  })

  afterEach(() => {
    hookStore.reset()
  })

  it('renders a Buffs & Passives panel for every team member grouped by weapon, artifact, character, and constellation, and supports toggling and reset', () => {
    const preset = getBundledPreset('official/furina-salon-subdps')!
    let currentSettings: OptimizerSettings = structuredClone(
      DEFAULT_OPTIMIZER_SETTINGS
    )

    function renderPanel(): VNode[] {
      hookStore.active = true
      hookStore.beginRender()
      try {
        const nodes = evaluateTree(
          React.createElement(ConditionalTogglePanel, {
            preset,
            settings: currentSettings,
            onChangeSettings: (next) => {
              currentSettings = next
            },
            good: SAMPLE_GOOD,
            activeTargetWeaponKey: 'SplendorOfTranquilWaters',
            conditionalsByChar: SAMPLE_CATALOG,
          })
        )
        hookStore.flushEffects()
        return nodes.filter((n): n is VNode => typeof n !== 'string')
      } finally {
        hookStore.active = false
      }
    }

    const tree1 = renderPanel()
    const root = findByTestId(tree1, 'conditional-toggle-panel')
    expect(root).toBeDefined()

    // Every team member (Furina, Neuvillette, KaedeharaKazuha, Zhongli) has its own member buffs panel
    for (const member of preset.team) {
      const memberPanel = findByTestId(tree1, `member-buffs-panel-${member.key}`)
      expect(memberPanel).toBeDefined()
      expect(findByTestId(tree1, `buff-group-weapon-${member.key}`)).toBeDefined()
      expect(
        findByTestId(tree1, `buff-group-artifact-${member.key}`)
      ).toBeDefined()
      expect(
        findByTestId(tree1, `buff-group-character-${member.key}`)
      ).toBeDefined()
      expect(
        findByTestId(tree1, `buff-group-constellation-${member.key}`)
      ).toBeDefined()
    }

    // Default state: Furina's SplendorOfTranquilWaters.hpIncrease is '2', NoblesseOblige.set4 is 'on' (via target boolean set defaults), Furina.burstFanfare is '250'
    const allArtToggle = findByTestId(tree1, 'toggle-all-art-conds-Furina')!
    ;(allArtToggle.props.onClick as () => void)()
    const tree1Expanded = renderPanel()

    const splendorToggle = findByTestId(
      tree1Expanded,
      'cond-toggle-Furina-SplendorOfTranquilWaters-hpIncrease'
    )!
    expect(splendorToggle.props['aria-checked']).toBe(true)
    expect(splendorToggle.props['data-state-value']).toBe('2')

    const noToggle = findByTestId(
      tree1Expanded,
      'cond-toggle-Furina-NoblesseOblige-set4'
    )!
    expect(noToggle.props['aria-checked']).toBe(true)
    expect(noToggle.props['data-state-value']).toBe('on')

    const qDmgSelect = findByTestId(
      tree1Expanded,
      'cond-select-Furina-Furina-burstFanfare'
    )!
    expect(qDmgSelect.props.value).toBe('250')

    // Zhongli (not in SAMPLE_GOOD -> runs as simulated 'tc') has ArchaicPetra.element = 'hydro' and Zhongli.skill = 'on'
    const zhongliPetraSelect = findByTestId(
      tree1,
      'cond-select-Zhongli-ArchaicPetra-element'
    )!
    expect(zhongliPetraSelect.props.value).toBe('hydro')
    const zhongliShieldToggle = findByTestId(
      tree1,
      'cond-toggle-Zhongli-Zhongli-skill'
    )!
    expect(zhongliShieldToggle.props['aria-checked']).toBe(true)

    // Flip Furina's SplendorOfTranquilWaters.hpIncrease off via the switch
    const onFlipSplendor = splendorToggle.props.onClick as () => void
    onFlipSplendor()

    expect(
      hasMemberConditionalOverrides(currentSettings, preset.id, 'Furina')
    ).toBe(true)
    expect(getPresetConditionalOverrides(currentSettings, preset.id)).toEqual({
      Furina: {
        SplendorOfTranquilWaters: {
          hpIncrease: 'off',
        },
      },
    })

    // Re-render and verify switch is now OFF and Reset button is enabled
    const tree2 = renderPanel()
    const splendorToggleAfter = findByTestId(
      tree2,
      'cond-toggle-Furina-SplendorOfTranquilWaters-hpIncrease'
    )!
    expect(splendorToggleAfter.props['aria-checked']).toBe(false)
    expect(splendorToggleAfter.props['data-state-value']).toBe('off')

    const resetBtn = findByTestId(tree2, 'reset-member-conditionals-Furina')!
    expect(resetBtn.props.disabled).toBe(false)

    // Click Reset -> restores Furina's default state ('2') and clears override
    const onResetFurina = resetBtn.props.onClick as () => void
    onResetFurina()

    expect(
      hasMemberConditionalOverrides(currentSettings, preset.id, 'Furina')
    ).toBe(false)

    const tree3 = renderPanel()
    const splendorToggleRestored = findByTestId(
      tree3,
      'cond-toggle-Furina-SplendorOfTranquilWaters-hpIncrease'
    )!
    expect(splendorToggleRestored.props['aria-checked']).toBe(true)
    expect(splendorToggleRestored.props['data-state-value']).toBe('2')
  })
})
