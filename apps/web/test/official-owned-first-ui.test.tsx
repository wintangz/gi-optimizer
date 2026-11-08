import type { IGOOD } from '@gi/good'
import {
  DEFAULT_OPTIMIZER_SETTINGS,
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
  compStack: [] as Array<{ key: string; stateIdx: number }>,
  statesByComp: new Map<string, unknown[]>(),
  compCounts: new Map<string, number>(),
  refs: [] as { current: unknown }[],
  effects: [] as EffectEntry[],
  pendingEffects: [] as Array<{ idx: number; fn: () => (() => void) | void }>,
  refIdx: 0,
  effectIdx: 0,
  reset() {
    for (const eff of this.effects) {
      if (typeof eff.cleanup === 'function') {
        eff.cleanup()
      }
    }
    this.compStack = []
    this.statesByComp.clear()
    this.compCounts.clear()
    this.refs = []
    this.effects = []
    this.pendingEffects = []
    this.refIdx = 0
    this.effectIdx = 0
  },
  beginRender() {
    this.compStack = []
    this.compCounts.clear()
    this.refIdx = 0
    this.effectIdx = 0
    this.pendingEffects = []
  },
  enterComp(fn: { name?: string }) {
    const name = fn.name || 'Component'
    const count = this.compCounts.get(name) ?? 0
    this.compCounts.set(name, count + 1)
    this.compStack.push({ key: `${name}#${count}`, stateIdx: 0 })
  },
  leaveComp() {
    this.compStack.pop()
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
      const top = hookStore.compStack[hookStore.compStack.length - 1] ?? {
        key: 'Root#0',
        stateIdx: 0,
      }
      const compKey = top.key
      const idx = top.stateIdx++
      let arr = hookStore.statesByComp.get(compKey)
      if (!arr) {
        arr = []
        hookStore.statesByComp.set(compKey, arr)
      }
      if (idx >= arr.length) {
        arr.push(
          typeof initial === 'function' ? (initial as () => T)() : initial
        )
      }
      const setState = (next: T | ((prev: T) => T)) => {
        const targetArr = hookStore.statesByComp.get(compKey)!
        const prevVal = targetArr[idx] as T
        const nextVal =
          typeof next === 'function' ? (next as (prev: T) => T)(prevVal) : next
        targetArr[idx] = nextVal
      }
      return [arr[idx] as T, setState] as const
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

let mockSearchParams = new URLSearchParams('preset=official/furina-salon-subdps')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => React.createElement('a', { href }, children),
}))

// Furina (target), Neuvillette (owned), KaedeharaKazuha (owned); Zhongli is ABSENT from GOOD
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
    {
      key: 'KaedeharaKazuha',
      level: 90,
      constellation: 1,
      ascension: 6,
      talent: { auto: 6, skill: 10, burst: 10 },
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
  ],
  artifacts: [],
}

let mockSettings: OptimizerSettings = structuredClone(DEFAULT_OPTIMIZER_SETTINGS)
const mockUpdateSettings = vi.fn(async (next: OptimizerSettings) => {
  mockSettings = next
})

vi.mock('@/lib/storage/useGood', () => ({
  useGoodStorage: () => ({
    record: {
      importedAt: '2026-11-07T00:00:00.000Z',
      good: SAMPLE_GOOD,
    },
    loading: false,
  }),
  useUserPresets: () => ({
    presets: [],
    loading: false,
  }),
  useOptimizerSettings: () => ({
    settings: mockSettings,
    loading: false,
    update: mockUpdateSettings,
  }),
}))

const mockEvaluatePresetInWorker = vi.fn<
  (args?: unknown) => Promise<{
    currentBuild: { weaponId: string; artifactIds: Record<string, string> }
    result: { total: number; instances: never[]; stats: Record<string, number> }
  }>
>(async () => ({
  currentBuild: { weaponId: 'w_furina', artifactIds: { flower: 'art_1' } },
  result: { total: 374658, instances: [], stats: {} },
}))
const mockOptimizePresetInWorker = vi.fn<
  (args?: unknown) => Promise<{
    builds: never[]
    tested: number
    skipped: number
    durationMs: number
  }>
>(async () => ({
  builds: [],
  tested: 0,
  skipped: 0,
  durationMs: 10,
}))

vi.mock('@/lib/engine/workerClient', () => ({
  evaluatePresetInWorker: (args: unknown) => mockEvaluatePresetInWorker(args),
  optimizePresetInWorker: (args: unknown) => mockOptimizePresetInWorker(args),
  optimizeTeamInWorker: vi.fn(),
  getCatalogInWorker: async () => ({
    targetsByChar: {},
    conditionalsByChar: {},
  }),
  exportGODatabaseInWorker: vi.fn(),
  cancelOptimizationInWorker: vi.fn(),
  isEngineSessionHydrated: () => true,
}))

import OptimizePage from '../src/app/optimize/page'
import { resetSolverPoolFiltersExpandedSession } from '../src/components/OptimizeViews'

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
      hookStore.enterComp(el.type)
      try {
        const rendered = (el.type as (p: Record<string, unknown>) => unknown)(
          props
        )
        return evaluateTree(rendered)
      } finally {
        hookStore.leaveComp()
      }
    }
    if (typeof el.type === 'string') {
      const children = evaluateTree(props.children)
      return [{ type: el.type, props, children }]
    }
    return evaluateTree(props.children)
  }
  return []
}

function renderPass(): VNode[] {
  hookStore.active = true
  hookStore.beginRender()
  try {
    const nodes = evaluateTree(React.createElement(OptimizePage))
    hookStore.flushEffects()
    return nodes.filter((n): n is VNode => typeof n !== 'string')
  } finally {
    hookStore.active = false
  }
}

function collectText(nodes: Array<VNode | string>): string {
  return nodes
    .map((n) => (typeof n === 'string' ? n : collectText(n.children)))
    .join('')
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

function findCharacterBadge(nodes: Array<VNode | string>): VNode | undefined {
  return findAll(nodes, (n) => n.props['data-identifier-kind'] === 'character')[0]
}

describe('Official Presets Owned-First UI (official-presets-owned-first)', () => {
  beforeEach(() => {
    hookStore.reset()
    mockSearchParams = new URLSearchParams(
      'preset=official/furina-salon-subdps'
    )
    mockSettings = structuredClone(DEFAULT_OPTIMIZER_SETTINGS)
    mockUpdateSettings.mockClear()
    mockEvaluatePresetInWorker.mockClear()
  })

  afterEach(() => {
    hookStore.reset()
  })

  it('renders owned teammates as Owned Build (without SIM badge), unowned teammates as Simulated (Not in GOOD) with SIM badge, and persists per-member toggle', async () => {
    const tree1 = renderPass()

    // (1) Owned members (Neuvillette, KaedeharaKazuha) default to 'owned' without SIM badge
    const neuvSlot = findByTestId(tree1, 'preset-team-member-Neuvillette')
    const kazuhaSlot = findByTestId(tree1, 'preset-team-member-KaedeharaKazuha')
    expect(neuvSlot).toBeDefined()
    expect(kazuhaSlot).toBeDefined()

    const neuvBadge = findCharacterBadge([neuvSlot!])!
    const kazuhaBadge = findCharacterBadge([kazuhaSlot!])!
    expect(neuvBadge.props['data-simulated']).toBe('false')
    expect(kazuhaBadge.props['data-simulated']).toBe('false')
    expect(collectText([neuvBadge])).not.toContain('SIM')
    expect(collectText([kazuhaBadge])).not.toContain('SIM')

    const kazuhaToggle = findByTestId(
      tree1,
      'member-build-toggle-KaedeharaKazuha'
    )!
    expect(kazuhaToggle.props['data-build-mode']).toBe('owned')
    expect(kazuhaToggle.props['data-owned-in-good']).toBe('true')
    expect(kazuhaToggle.props['data-forced-simulated']).toBe('false')
    expect(collectText([kazuhaToggle])).toBe('Owned Build')

    // (3) Unowned member (Zhongli is absent from SAMPLE_GOOD) runs as simulated and is visibly labelled
    const zhongliSlot = findByTestId(tree1, 'preset-team-member-Zhongli')!
    const zhongliBadge = findCharacterBadge([zhongliSlot])!
    expect(zhongliBadge.props['data-simulated']).toBe('true')
    expect(collectText([zhongliBadge])).toContain('SIM')

    const zhongliToggle = findByTestId(tree1, 'member-build-toggle-Zhongli')!
    expect(zhongliToggle.props['data-build-mode']).toBe('tc')
    expect(zhongliToggle.props['data-owned-in-good']).toBe('false')
    expect(zhongliToggle.props['data-forced-simulated']).toBe('true')
    expect(collectText([zhongliToggle])).toContain('Simulated (Not in GOOD)')

    // (2) Toggle owned member (KaedeharaKazuha) to simulated ('tc') -> persists in settings and updates badge to SIM
    const onClickKazuha = kazuhaToggle.props.onClick as () => void
    onClickKazuha()

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)
    expect(
      mockSettings.memberBuildModes?.['official/furina-salon-subdps']
        ?.KaedeharaKazuha
    ).toBe('tc')

    const tree2 = renderPass()
    const kazuhaSlotAfter = findByTestId(
      tree2,
      'preset-team-member-KaedeharaKazuha'
    )!
    const kazuhaBadgeAfter = findCharacterBadge([kazuhaSlotAfter])!
    expect(kazuhaBadgeAfter.props['data-simulated']).toBe('true')
    expect(collectText([kazuhaBadgeAfter])).toContain('SIM')

    const kazuhaToggleAfter = findByTestId(
      tree2,
      'member-build-toggle-KaedeharaKazuha'
    )!
    expect(kazuhaToggleAfter.props['data-build-mode']).toBe('tc')
    expect(collectText([kazuhaToggleAfter])).toBe('Simulated (TC)')

    // (4) Protected Characters and Artifact Set Filter sit as a matched pair (optimize-panels-alignment)
    const filterPair = findByTestId(tree2, 'optimize-filter-panels-pair')!
    expect(filterPair).toBeDefined()
    expect(filterPair.props.className).toBe('opt-filter-pair')

    const protectedPanel = findByTestId(tree2, 'protected-characters-panel')!
    const artFilterPanel = findByTestId(tree2, 'artifact-set-filter-panel')!
    expect(protectedPanel).toBeDefined()
    expect(artFilterPanel).toBeDefined()
    expect(protectedPanel.props.className).toBe('opt-filter-panel')
    expect(artFilterPanel.props.className).toBe('opt-filter-panel')

    // Both panels have matched header, subbar, search toolbar, and tile-picker-grid
    for (const panel of [protectedPanel, artFilterPanel]) {
      expect(
        findAll([panel], (n) => n.props.className === 'opt-filter-panel-header')
      ).toHaveLength(1)
      expect(
        findAll([panel], (n) => n.props.className === 'opt-filter-panel-subbar')
      ).toHaveLength(1)
      expect(
        findAll([panel], (n) => n.props.className === 'tile-picker-toolbar')
      ).toHaveLength(1)
      expect(
        findAll([panel], (n) => n.props.className === 'tile-picker-grid')
      ).toHaveLength(1)
    }
  })

  it('renders the target weapon picker on official presets, keeps default weapon when untouched, and passes weaponOverride to Current build evaluation and optimizer when chosen (official-preset-weapon-picker)', async () => {
    mockOptimizePresetInWorker.mockClear()
    const tree1 = renderPass()
    await Promise.resolve()
    await Promise.resolve()

    // (1) Official preset renders the target weapon picker showing Furina's equipped SplendorOfTranquilWaters by default
    const weaponPickerBox = findByTestId(
      tree1,
      'official-target-weapon-picker'
    )
    expect(weaponPickerBox).toBeDefined()
    const modeStatus = findByTestId(tree1, 'target-weapon-mode-status')
    expect(collectText([modeStatus!])).toContain('Default Weapon')
    expect(findByTestId(tree1, 'reset-target-weapon-btn')).toBeUndefined()

    // Default evaluation did NOT need a second re-eval with weaponOverride
    expect(mockEvaluatePresetInWorker).toHaveBeenCalledTimes(1)
    expect(
      (mockEvaluatePresetInWorker.mock.calls[0]?.[0] as { selection?: unknown })
        ?.selection
    ).toBeUndefined()

    // (2) Select an unowned sword (KeyOfKhajNisut) in the target weapon picker tile grid
    const keyTile = findByTestId(tree1, 'weapon-picker-tile-KeyOfKhajNisut')
    expect(keyTile).toBeDefined()
    ;(keyTile!.props.onClick as () => void)()

    mockEvaluatePresetInWorker.mockClear()
    const tree2 = renderPass()
    await Promise.resolve()
    await Promise.resolve()

    const modeStatusAfterPick = findByTestId(tree2, 'target-weapon-mode-status')
    expect(collectText([modeStatusAfterPick!])).toContain(
      'Override: Key of Khaj Nisut R1'
    )
    expect(findByTestId(tree2, 'reset-target-weapon-btn')).toBeDefined()

    // Current build evaluation now re-evaluates with weaponOverride: KeyOfKhajNisut Lv.90 A6 R1
    expect(mockEvaluatePresetInWorker).toHaveBeenCalledTimes(2)
    const reEvalCall = mockEvaluatePresetInWorker.mock.calls[1]?.[0] as {
      selection?: { weaponOverride?: unknown; weaponId?: string }
    }
    expect(reEvalCall.selection?.weaponOverride).toEqual({
      key: 'KeyOfKhajNisut',
      level: 90,
      ascension: 6,
      refinement: 1,
    })
    expect(reEvalCall.selection?.weaponId).toBeUndefined()

    // (3) Change Refinement dropdown to R5 -> updates weaponOverride to R5
    const refSelect = findByTestId(tree2, 'target-weapon-refinement-select')
    expect(refSelect).toBeDefined()
    ;(
      refSelect!.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '5' } })

    mockEvaluatePresetInWorker.mockClear()
    const tree3 = renderPass()
    await Promise.resolve()
    await Promise.resolve()

    expect(
      collectText([findByTestId(tree3, 'target-weapon-mode-status')!])
    ).toContain('Override: Key of Khaj Nisut R5')

    // Click "Optimize" and verify optimizePresetInWorker receives weaponOverride: KeyOfKhajNisut Lv.90 A6 R5
    const runBtn = findByTestId(tree3, 'run-optimize-btn')
    expect(runBtn).toBeDefined()
    await (runBtn!.props.onClick as () => Promise<void>)()

    expect(mockOptimizePresetInWorker).toHaveBeenCalledTimes(1)
    const optCall = mockOptimizePresetInWorker.mock.calls[0]?.[0] as {
      weaponOverride?: unknown
      weaponId?: string
    }
    expect(optCall.weaponOverride).toEqual({
      key: 'KeyOfKhajNisut',
      level: 90,
      ascension: 6,
      refinement: 5,
    })
    expect(optCall.weaponId).toBeUndefined()

    // (4) Click "Reset to Default" -> clears override and returns to Default Weapon
    const resetBtn = findByTestId(tree3, 'reset-target-weapon-btn')
    expect(resetBtn).toBeDefined()
    ;(resetBtn!.props.onClick as () => void)()

    const tree4 = renderPass()
    expect(
      collectText([findByTestId(tree4, 'target-weapon-mode-status')!])
    ).toContain('Default Weapon')
    expect(findByTestId(tree4, 'reset-target-weapon-btn')).toBeUndefined()
  })

  it('orders the optimize page into the locked 5-stage flow: (1) Preset picker -> (2) Mode selection -> (3) Team & Buffs -> (4) Artifact settings -> (5) Run & Results, adapting sections below to the chosen mode (flow-stage-layout)', () => {
    const tree = renderPass()
    const orderedTestIds = findAll(
      tree,
      (n) => typeof n.props['data-testid'] === 'string'
    ).map((n) => n.props['data-testid'] as string)

    const idxStage1Preset = orderedTestIds.indexOf('setup-card')
    const idxStage2Mode = orderedTestIds.indexOf('mode-selection-card')
    const idxWeaponModeBar = orderedTestIds.indexOf('optimize-weapon-mode-bar')
    const idxStage3TeamBuffs = orderedTestIds.indexOf('team-buffs-stage')
    const idxTeamRoster = orderedTestIds.indexOf('preset-team-roster')
    const idxBuffsPanel = orderedTestIds.indexOf('conditional-toggle-panel')
    const idxStage4Artifacts = orderedTestIds.indexOf('artifact-settings-card')
    const idxFilterPair = orderedTestIds.indexOf('optimize-filter-panels-pair')
    const idxConstraintsCard = orderedTestIds.indexOf('constraints-card')
    const idxStage5Results = orderedTestIds.indexOf('results-card')
    const idxTopNBuilds = orderedTestIds.indexOf('top-n-builds-select')
    const idxRunOptimizeBtn = orderedTestIds.indexOf('run-optimize-btn')

    expect(idxStage1Preset).toBeGreaterThanOrEqual(0)
    expect(idxStage2Mode).toBeGreaterThan(idxStage1Preset)
    expect(idxWeaponModeBar).toBeGreaterThan(idxStage2Mode)
    expect(idxStage3TeamBuffs).toBeGreaterThan(idxWeaponModeBar)
    expect(idxTeamRoster).toBeGreaterThan(idxStage3TeamBuffs)
    expect(idxBuffsPanel).toBeGreaterThan(idxTeamRoster)
    expect(idxStage4Artifacts).toBeGreaterThan(idxBuffsPanel)
    expect(idxFilterPair).toBeGreaterThan(idxStage4Artifacts)
    expect(idxConstraintsCard).toBeGreaterThan(idxFilterPair)
    expect(idxStage5Results).toBeGreaterThan(idxConstraintsCard)
    expect(idxTopNBuilds).toBeGreaterThan(idxStage5Results)
    expect(idxRunOptimizeBtn).toBeGreaterThan(idxStage5Results)

    // Mode buttons render with the expected labels in Stage 2
    expect(
      collectText([findByTestId(tree, 'optimize-mode-single')!])
    ).toBe('Optimize 1 Character')
    expect(
      collectText([findByTestId(tree, 'optimize-mode-compare')!])
    ).toContain('Compare Weapons')
    expect(
      collectText([findByTestId(tree, 'optimize-mode-team')!])
    ).toBe('Optimize Team')

    // In default 'single' mode: WeaponComparisonPanel is hidden, TeammateFastModePanel and Top N Builds are shown
    expect(findByTestId(tree, 'weapon-compare-panel')).toBeUndefined()
    expect(findByTestId(tree, 'teammate-fast-mode-panel')).toBeDefined()
    expect(findByTestId(tree, 'top-n-builds-select')).toBeDefined()

    // Switch to 'compare' mode: WeaponComparisonPanel appears, single-mode target picker and Top N Builds hide
    const compareBtn = findByTestId(tree, 'optimize-mode-compare')!
    ;(compareBtn.props.onClick as () => void)()
    const compareTree = renderPass()
    expect(findByTestId(compareTree, 'weapon-compare-panel')).toBeDefined()
    expect(
      findByTestId(compareTree, 'official-target-weapon-picker')
    ).toBeUndefined()
    expect(findByTestId(compareTree, 'top-n-builds-select')).toBeUndefined()
    expect(findByTestId(compareTree, 'run-weapon-compare-btn')).toBeDefined()

    // Switch to 'team' mode: TeammateFastModePanel and WeaponComparisonPanel hide, Optimize Team button renders
    const teamBtn = findByTestId(compareTree, 'optimize-mode-team')!
    ;(teamBtn.props.onClick as () => void)()
    const teamTree = renderPass()
    expect(findByTestId(teamTree, 'weapon-compare-panel')).toBeUndefined()
    expect(findByTestId(teamTree, 'teammate-fast-mode-panel')).toBeUndefined()
    expect(findByTestId(teamTree, 'top-n-builds-select')).toBeUndefined()
    expect(findByTestId(teamTree, 'run-team-optimize-btn')).toBeDefined()

    // Switch back to 'single' mode
    const singleBtn = findByTestId(teamTree, 'optimize-mode-single')!
    ;(singleBtn.props.onClick as () => void)()
    const singleTree = renderPass()

    // single-level-range-control & collapsible-panels: SolverPoolFiltersPanel starts collapsed when unrestricted with summary visible; expanding it exposes Artifact Level Range
    expect(findByTestId(singleTree, 'solver-pool-filters-summary')).toBeDefined()
    expect(findByTestId(singleTree, 'pool-filter-level-low')).toBeUndefined()
    const poolToggle = findByTestId(singleTree, 'solver-pool-filters-toggle')!
    expect(poolToggle.props['aria-expanded']).toBe(false)
    ;(poolToggle.props.onClick as () => void)()
    const expandedTree = renderPass()
    expect(findByTestId(expandedTree, 'pool-filter-level-low')).toBeDefined()
    expect(findByTestId(expandedTree, 'pool-filter-level-high')).toBeDefined()
    expect(
      findAll(expandedTree, (n) => n.props['aria-label'] === 'Artifact Level Min')
    ).toHaveLength(0)
    expect(
      findAll(expandedTree, (n) => n.props['aria-label'] === 'Artifact Level Max')
    ).toHaveLength(0)
    resetSolverPoolFiltersExpandedSession()
  })

  it('weapon-compare-minimum: requires at least 2 weapon candidates to enable Compare Weapons button, shows visible reason below 2, and enables at 2+', async () => {
    mockOptimizePresetInWorker.mockClear()
    const tree1 = renderPass()

    // Switch to Compare Weapons mode; official/furina-salon-subdps seeds 1 candidate (equipped SplendorOfTranquilWaters)
    const compareModeBtn = findByTestId(tree1, 'optimize-mode-compare')!
    ;(compareModeBtn.props.onClick as () => void)()
    const tree2 = renderPass()

    // 1. With 1 candidate selected (< 2), run-weapon-compare-btn is disabled and reason is visible
    const runCompareBtn1 = findByTestId(tree2, 'run-weapon-compare-btn')!
    expect(runCompareBtn1.props.disabled).toBe(true)
    expect(collectText([runCompareBtn1])).toContain('Compare Weapons (1)')
    expect(runCompareBtn1.props.title).toBe(
      'Select at least 2 weapons to run a comparison'
    )

    const minReason = findByTestId(tree2, 'weapon-compare-min-reason')
    expect(minReason).toBeDefined()
    expect(collectText([minReason!])).toContain(
      'Select at least 2 weapons above to run a comparison (currently 1 selected).'
    )
    expect(
      findByTestId(tree2, 'weapon-compare-minimum-notice')
    ).toBeDefined()

    // Clicking the disabled handler directly is a no-op
    await (runCompareBtn1.props.onClick as () => Promise<void>)()
    expect(mockOptimizePresetInWorker).not.toHaveBeenCalled()

    // 2. Deselect the 1 weapon -> 0 candidates selected (< 2): still disabled with visible reason
    const removeSplendorBtn = findByTestId(
      tree2,
      'weapon-compare-remove-SplendorOfTranquilWaters'
    )!
    ;(removeSplendorBtn.props.onClick as () => void)()
    const tree3 = renderPass()
    const runCompareBtn0 = findByTestId(tree3, 'run-weapon-compare-btn')!
    expect(runCompareBtn0.props.disabled).toBe(true)
    expect(
      collectText([findByTestId(tree3, 'weapon-compare-min-reason')!])
    ).toContain(
      'Select at least 2 weapons above to run a comparison (currently 0 selected).'
    )

    // 3. Select 2 weapons (SplendorOfTranquilWaters and FavoniusSword) -> button becomes enabled and runs comparison
    const pickSplendor = findByTestId(
      tree3,
      'weapon-picker-tile-SplendorOfTranquilWaters'
    )!
    ;(pickSplendor.props.onClick as () => void)()
    const tree4 = renderPass()
    const pickFav = findByTestId(tree4, 'weapon-picker-tile-FavoniusSword')!
    ;(pickFav.props.onClick as () => void)()
    const tree5 = renderPass()

    const runCompareBtn2 = findByTestId(tree5, 'run-weapon-compare-btn')!
    expect(runCompareBtn2.props.disabled).toBe(false)
    expect(collectText([runCompareBtn2])).toContain('Compare Weapons (2)')
    expect(findByTestId(tree5, 'weapon-compare-min-reason')).toBeUndefined()
    expect(
      findByTestId(tree5, 'weapon-compare-minimum-notice')
    ).toBeUndefined()

    await (runCompareBtn2.props.onClick as () => Promise<void>)()
    expect(mockOptimizePresetInWorker).toHaveBeenCalledTimes(2)
  })
})
