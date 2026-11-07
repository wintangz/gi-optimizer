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
      sheet: 'GoldenTroupe',
      key: 'set4',
      name: 'Golden Troupe — Not on the Field',
      states: [{ key: 'on', name: 'Active (On)' }],
      canShow: true,
      category: 'artifact',
      section: 'set4',
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
    {
      id: 'a5_1pc_offpiece',
      setKey: 'MarechausseeHunter',
      slotKey: 'circlet',
      level: 20,
      rarity: 5,
      mainStatKey: 'critDMG_',
      location: 'Furina',
      lock: true,
      substats: [],
    },
  ],
}

describe('ConditionalTogglePanel Component (conditional-toggle-panel & buff-panel-member-tabs)', () => {
  beforeEach(() => {
    hookStore.reset()
  })

  afterEach(() => {
    hookStore.reset()
  })

  it('renders a top member tab switcher showing ONE member at a time, hides unworn (0pc) and single-piece (1pc) artifact sets while showing 2pc/4pc sets, and preserves overrides across tab switches', () => {
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

    // 1. Top member switcher tabs exist for all 4 team members
    const tablist = findByTestId(tree1, 'buff-panel-member-tabs')
    expect(tablist).toBeDefined()
    for (const member of preset.team) {
      const tab = findByTestId(tree1, `member-buffs-tab-${member.key}`)
      expect(tab).toBeDefined()
      expect(tab!.props['aria-selected']).toBe(member.key === 'Furina')
    }

    // 2. Only ONE member's buffs panel (Furina, slot 0) is rendered initially
    expect(findByTestId(tree1, 'member-buffs-panel-Furina')).toBeDefined()
    expect(findByTestId(tree1, 'member-buffs-panel-Neuvillette')).toBeUndefined()
    expect(
      findByTestId(tree1, 'member-buffs-panel-KaedeharaKazuha')
    ).toBeUndefined()
    expect(findByTestId(tree1, 'member-buffs-panel-Zhongli')).toBeUndefined()

    // Furina's 4 groups are rendered with responsive column grids (buff-panel-columns)
    expect(findByTestId(tree1, 'buff-group-weapon-Furina')).toBeDefined()
    expect(findByTestId(tree1, 'buff-group-artifact-Furina')).toBeDefined()
    expect(findByTestId(tree1, 'buff-group-character-Furina')).toBeDefined()
    expect(findByTestId(tree1, 'buff-group-constellation-Furina')).toBeDefined()

    for (const groupSlug of ['weapon', 'artifact', 'character', 'constellation']) {
      const gridContainer = findByTestId(
        tree1,
        `buff-group-grid-${groupSlug}-Furina`
      )!
      expect(gridContainer).toBeDefined()
      expect(gridContainer.props.className).toBe('gi-buffs-rows gi-buffs-grid')
    }
    const sampleCell = findByTestId(
      tree1,
      'cond-row-Furina-SplendorOfTranquilWaters-hpIncrease'
    )!
    expect(String(sampleCell.props.className)).toContain('gi-buff-cell')

    // 3. Artifact set filtering:
    // - GoldenTroupe (4pc worn on Furina) IS shown and active ('on')
    const gtToggle = findByTestId(
      tree1,
      'cond-toggle-Furina-GoldenTroupe-set4'
    )!
    expect(gtToggle).toBeDefined()
    expect(gtToggle.props['aria-checked']).toBe(true)
    expect(gtToggle.props['data-state-value']).toBe('on')

    // - MarechausseeHunter (1pc off-piece worn on Furina) MUST NOT appear at all
    expect(
      findByTestId(tree1, 'cond-row-Furina-MarechausseeHunter-set4')
    ).toBeUndefined()

    // - NoblesseOblige (0pc unworn on Furina) MUST NOT appear at all
    expect(
      findByTestId(tree1, 'cond-row-Furina-NoblesseOblige-set4')
    ).toBeUndefined()

    // Default state: Furina's SplendorOfTranquilWaters.hpIncrease is '2', Furina.burstFanfare is '250'
    const splendorToggle = findByTestId(
      tree1,
      'cond-toggle-Furina-SplendorOfTranquilWaters-hpIncrease'
    )!
    expect(splendorToggle.props['aria-checked']).toBe(true)
    expect(splendorToggle.props['data-state-value']).toBe('2')

    const qDmgSelect = findByTestId(
      tree1,
      'cond-select-Furina-Furina-burstFanfare'
    )!
    expect(qDmgSelect.props.value).toBe('250')

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

    // 4. Switch to Zhongli tab -> shows ONLY Zhongli's panel while preserving Furina's override
    const zhongliTab = findByTestId(tree1, 'member-buffs-tab-Zhongli')!
    ;(zhongliTab.props.onClick as () => void)()

    const treeZhongli = renderPanel()
    expect(
      findByTestId(treeZhongli, 'member-buffs-panel-Furina')
    ).toBeUndefined()
    expect(
      findByTestId(treeZhongli, 'member-buffs-panel-Zhongli')
    ).toBeDefined()
    expect(
      findByTestId(treeZhongli, 'member-tab-modified-Furina')
    ).toBeDefined()

    // Zhongli (not in SAMPLE_GOOD -> runs as simulated 'tc' with 4pc ArchaicPetra) has ArchaicPetra.element = 'hydro' and Zhongli.skill = 'on'
    const zhongliPetraSelect = findByTestId(
      treeZhongli,
      'cond-select-Zhongli-ArchaicPetra-element'
    )!
    expect(zhongliPetraSelect.props.value).toBe('hydro')
    const zhongliShieldToggle = findByTestId(
      treeZhongli,
      'cond-toggle-Zhongli-Zhongli-skill'
    )!
    expect(zhongliShieldToggle.props['aria-checked']).toBe(true)

    // Switch back to Furina tab -> Furina's override is still active and Reset button works
    const furinaTab = findByTestId(treeZhongli, 'member-buffs-tab-Furina')!
    ;(furinaTab.props.onClick as () => void)()

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
