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

    // (1) Member selector tabs show Owned members (Neuvillette, KaedeharaKazuha) without SIM badge and Unowned member (Zhongli) with SIM badge
    const neuvTab = findByTestId(tree1, 'member-buffs-tab-Neuvillette')
    const kazuhaTab = findByTestId(tree1, 'member-buffs-tab-KaedeharaKazuha')
    const zhongliTab = findByTestId(tree1, 'member-buffs-tab-Zhongli')
    expect(neuvTab).toBeDefined()
    expect(kazuhaTab).toBeDefined()
    expect(zhongliTab).toBeDefined()

    const neuvBadge = findCharacterBadge([neuvTab!])!
    const kazuhaBadge = findCharacterBadge([kazuhaTab!])!
    const zhongliBadge = findCharacterBadge([zhongliTab!])!
    expect(neuvBadge.props['data-simulated']).toBe('false')
    expect(kazuhaBadge.props['data-simulated']).toBe('false')
    expect(zhongliBadge.props['data-simulated']).toBe('true')
    expect(collectText([neuvBadge])).not.toContain('SIM')
    expect(collectText([kazuhaBadge])).not.toContain('SIM')
    expect(collectText([zhongliBadge])).toContain('SIM')

    // Switch to Zhongli's tab -> his editor shows Simulated (Not in GOOD)
    ;(zhongliTab!.props.onClick as () => void)()
    const treeZhongli = renderPass()
    const zhongliToggle = findByTestId(
      treeZhongli,
      'member-build-toggle-Zhongli'
    )!
    expect(zhongliToggle.props['data-build-mode']).toBe('tc')
    expect(zhongliToggle.props['data-owned-in-good']).toBe('false')
    expect(zhongliToggle.props['data-forced-simulated']).toBe('true')
    expect(collectText([zhongliToggle])).toContain('Simulated (Not in GOOD)')

    // Switch to KaedeharaKazuha's tab -> his editor shows Owned Build toggle
    ;(
      findByTestId(treeZhongli, 'member-buffs-tab-KaedeharaKazuha')!.props
        .onClick as () => void
    )()
    const treeKazuha = renderPass()
    const kazuhaToggle = findByTestId(
      treeKazuha,
      'member-build-toggle-KaedeharaKazuha'
    )!
    expect(kazuhaToggle.props['data-build-mode']).toBe('owned')
    expect(kazuhaToggle.props['data-owned-in-good']).toBe('true')
    expect(kazuhaToggle.props['data-forced-simulated']).toBe('false')
    expect(collectText([kazuhaToggle])).toBe('Owned Build')

    // (2) Toggle owned member (KaedeharaKazuha) to simulated ('tc') -> persists in settings and updates tab badge to SIM
    const onClickKazuha = kazuhaToggle.props.onClick as () => void
    onClickKazuha()

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)
    expect(
      mockSettings.memberBuildModes?.['official/furina-salon-subdps']
        ?.KaedeharaKazuha
    ).toBe('tc')

    const tree2 = renderPass()
    const kazuhaTabAfter = findByTestId(
      tree2,
      'member-buffs-tab-KaedeharaKazuha'
    )!
    const kazuhaBadgeAfter = findCharacterBadge([kazuhaTabAfter])!
    expect(kazuhaBadgeAfter.props['data-simulated']).toBe('true')
    expect(collectText([kazuhaBadgeAfter])).toContain('SIM')

    const kazuhaToggleAfter = findByTestId(
      tree2,
      'member-build-toggle-KaedeharaKazuha'
    )!
    expect(kazuhaToggleAfter.props['data-build-mode']).toBe('tc')
    expect(collectText([kazuhaToggleAfter])).toBe('Simulated (TC)')

    // (4) Protected Characters and Artifact Set Filter sit as a matched pair inside collapsible-sets-protected (optimize-panels-alignment)
    const setsProtectedToggle = findByTestId(
      tree2,
      'sets-protected-collapsible-toggle'
    )!
    expect(setsProtectedToggle).toBeDefined()
    ;(setsProtectedToggle.props.onClick as () => void)()
    const tree2Expanded = renderPass()

    const filterPair = findByTestId(
      tree2Expanded,
      'optimize-filter-panels-pair'
    )!
    expect(filterPair).toBeDefined()
    expect(filterPair.props.className).toBe('opt-filter-pair')

    const protectedPanel = findByTestId(
      tree2Expanded,
      'protected-characters-panel'
    )!
    const artFilterPanel = findByTestId(
      tree2Expanded,
      'artifact-set-filter-panel'
    )!
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

  it('merges Stage 3 into one Team & Buffs section with member selector tabs, unified member editor, and modal weapon-picking for any member (teammates fixed on Akasha) (team-buffs-merge / flow-team-stage)', async () => {
    mockOptimizePresetInWorker.mockClear()
    const tree1 = renderPass()
    await Promise.resolve()
    await Promise.resolve()

    // (1) Separate member card grid and separate Buffs & Passives sub-panel are gone
    expect(findByTestId(tree1, 'preset-team-roster')).toBeUndefined()
    expect(findByTestId(tree1, 'buffs-collapsible-toggle')).toBeUndefined()
    expect(findByTestId(tree1, 'buffs-collapsible-summary')).toBeUndefined()

    const stage3 = findByTestId(tree1, 'team-buffs-stage')!
    expect(stage3).toBeDefined()
    expect(findByTestId([stage3], 'team-resonance-master-row')).toBeDefined()
    expect(findByTestId([stage3], 'buff-panel-member-tabs')).toBeDefined()

    // Each member appears EXACTLY ONCE in Stage 3 (as a tab in buff-panel-member-tabs)
    for (const key of ['Furina', 'Neuvillette', 'KaedeharaKazuha', 'Zhongli']) {
      expect(findByTestId([stage3], `member-buffs-tab-${key}`)).toBeDefined()
      const charBadgesInStage = findAll(
        [stage3],
        (n) =>
          n.props['data-identifier-kind'] === 'character' &&
          n.props['data-character-key'] === key
      )
      expect(charBadgesInStage).toHaveLength(1)
    }

    // Furina (Target) is selected initially; her editor shows her weapon row
    expect(findByTestId(tree1, 'member-buffs-panel-Furina')).toBeDefined()
    expect(findByTestId(tree1, 'member-weapon-trigger-Furina')).toBeDefined()
    const modeStatus = findByTestId(tree1, 'target-weapon-mode-status')
    expect(collectText([modeStatus!])).toContain('Default Weapon')
    expect(findByTestId(tree1, 'reset-target-weapon-btn')).toBeUndefined()
    expect(findByTestId(tree1, 'member-weapon-modal')).toBeUndefined()

    // Default evaluation did NOT need a second re-eval with weaponOverride
    expect(mockEvaluatePresetInWorker).toHaveBeenCalledTimes(1)
    expect(
      (mockEvaluatePresetInWorker.mock.calls[0]?.[0] as { selection?: unknown })
        ?.selection
    ).toBeUndefined()

    // (2) Click Furina's weapon trigger -> opens weapon picker modal for Furina
    const furinaWeaponBtn = findByTestId(tree1, 'member-weapon-trigger-Furina')
    expect(furinaWeaponBtn).toBeDefined()
    ;(furinaWeaponBtn!.props.onClick as () => void)()

    const treeModal = renderPass()
    const weaponModal = findByTestId(treeModal, 'member-weapon-modal')
    expect(weaponModal).toBeDefined()
    expect(weaponModal!.props['data-member-key']).toBe('Furina')
    expect(findByTestId(treeModal, 'official-target-weapon-picker')).toBeDefined()

    // Select an unowned sword (KeyOfKhajNisut) in the modal weapon picker tile grid
    const keyTile = findByTestId(treeModal, 'weapon-picker-tile-KeyOfKhajNisut')
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

    // (3) Change Refinement dropdown inside modal to R5 -> updates weaponOverride to R5
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

    // Close modal via Done button
    const closeModalBtn = findByTestId(tree3, 'close-weapon-modal-btn')
    expect(closeModalBtn).toBeDefined()
    ;(closeModalBtn!.props.onClick as () => void)()

    const treeClosed = renderPass()
    expect(findByTestId(treeClosed, 'member-weapon-modal')).toBeUndefined()

    // Click "Optimize" and verify optimizePresetInWorker receives weaponOverride: KeyOfKhajNisut Lv.90 A6 R5
    const runBtn = findByTestId(treeClosed, 'run-optimize-btn')
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

    // (4) Click "Reset" -> clears override and returns to Default Weapon
    const resetBtn = findByTestId(treeClosed, 'reset-target-weapon-btn')
    expect(resetBtn).toBeDefined()
    ;(resetBtn!.props.onClick as () => void)()

    const tree4 = renderPass()
    expect(
      collectText([findByTestId(tree4, 'target-weapon-mode-status')!])
    ).toContain('Default Weapon')
    expect(findByTestId(tree4, 'reset-target-weapon-btn')).toBeUndefined()

    // (5) Switch to KaedeharaKazuha's tab and click his weapon row -> opens weapon-picker modal for KaedeharaKazuha
    ;(
      findByTestId(tree4, 'member-buffs-tab-KaedeharaKazuha')!.props
        .onClick as () => void
    )()
    const treeKazuhaSelected = renderPass()
    const kazuhaWeaponBtn = findByTestId(
      treeKazuhaSelected,
      'member-weapon-trigger-KaedeharaKazuha'
    )
    expect(kazuhaWeaponBtn).toBeDefined()
    ;(kazuhaWeaponBtn!.props.onClick as () => void)()

    const treeTeammateModal = renderPass()
    const teammateModal = findByTestId(treeTeammateModal, 'member-weapon-modal')
    expect(teammateModal).toBeDefined()
    expect(teammateModal!.props['data-member-key']).toBe('KaedeharaKazuha')
    const teammateTile = findByTestId(
      treeTeammateModal,
      'weapon-picker-tile-KeyOfKhajNisut'
    )
    expect(teammateTile).toBeDefined()
    ;(teammateTile!.props.onClick as () => void)()

    const treeTeammatePicked = renderPass()
    expect(
      collectText([
        findByTestId(
          treeTeammatePicked,
          'member-weapon-status-KaedeharaKazuha'
        )!,
      ])
    ).toContain('Override: Key of Khaj Nisut R5')
    const resetTeammateBtn = findByTestId(
      treeTeammatePicked,
      'reset-member-weapon-btn-KaedeharaKazuha'
    )
    expect(resetTeammateBtn).toBeDefined()
    ;(resetTeammateBtn!.props.onClick as () => void)()
    ;(
      findByTestId(treeTeammatePicked, 'close-weapon-modal-btn')!.props
        .onClick as () => void
    )()

    // (6) On an Akasha preset, target weapon trigger is enabled while teammates' weapons stay fixed by the case
    const treeAfterReset = renderPass()
    const akashaBtn = findAll(
      treeAfterReset,
      (n) =>
        n.type === 'button' &&
        typeof n.props['data-preset-id'] === 'string' &&
        String(n.props['data-preset-id']).startsWith('akasha/') &&
        n.props['data-character-key'] === 'Furina'
    )[0]
    expect(akashaBtn).toBeDefined()
    ;(akashaBtn!.props.onClick as () => void)()

    // Switch back to Furina tab to verify target weapon trigger is enabled
    const treeAkasha1 = renderPass()
    ;(
      findByTestId(treeAkasha1, 'member-buffs-tab-Furina')!.props
        .onClick as () => void
    )()
    const treeAkashaTarget = renderPass()
    const akashaTargetWeaponBtn = findByTestId(
      treeAkashaTarget,
      'member-weapon-trigger-Furina'
    )
    expect(akashaTargetWeaponBtn).toBeDefined()
    expect(akashaTargetWeaponBtn!.props.disabled).toBe(false)

    // Switch to each Akasha teammate tab and verify their weapon row is locked
    for (const tmKey of ['Neuvillette', 'KaedeharaKazuha', 'Zhongli'] as const) {
      ;(
        findByTestId(treeAkashaTarget, `member-buffs-tab-${tmKey}`)!.props
          .onClick as () => void
      )()
      const treeTm = renderPass()
      const tmBtn = findByTestId(treeTm, `member-weapon-trigger-${tmKey}`)!
      expect(tmBtn).toBeDefined()
      expect(tmBtn.props.disabled).toBe(true)
      expect(tmBtn.props['data-weapon-locked']).toBe('true')
    }
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
    const idxResonanceRow = orderedTestIds.indexOf('team-resonance-master-row')
    const idxMemberTabs = orderedTestIds.indexOf('buff-panel-member-tabs')
    const idxActiveMemberPanel = orderedTestIds.indexOf(
      'member-buffs-panel-Furina'
    )
    const idxStage4Artifacts = orderedTestIds.indexOf('artifact-settings-card')
    const idxSetsProtected = orderedTestIds.indexOf(
      'collapsible-sets-protected'
    )
    const idxPoolFilters = orderedTestIds.indexOf('solver-pool-filters-panel')
    const idxConstraintsCard = orderedTestIds.indexOf('constraints-card')
    const idxStage5Results = orderedTestIds.indexOf('results-card')
    const idxTopNBuilds = orderedTestIds.indexOf('top-n-builds-select')
    const idxRunOptimizeBtn = orderedTestIds.indexOf('run-optimize-btn')

    expect(idxStage1Preset).toBeGreaterThanOrEqual(0)
    expect(idxStage2Mode).toBeGreaterThan(idxStage1Preset)
    expect(idxWeaponModeBar).toBeGreaterThan(idxStage2Mode)
    expect(idxStage3TeamBuffs).toBeGreaterThan(idxWeaponModeBar)
    expect(idxResonanceRow).toBeGreaterThan(idxStage3TeamBuffs)
    expect(idxMemberTabs).toBeGreaterThan(idxResonanceRow)
    expect(idxActiveMemberPanel).toBeGreaterThan(idxMemberTabs)
    expect(idxStage4Artifacts).toBeGreaterThan(idxActiveMemberPanel)
    expect(idxSetsProtected).toBeGreaterThan(idxStage4Artifacts)
    expect(idxPoolFilters).toBeGreaterThan(idxSetsProtected)
    expect(idxConstraintsCard).toBeGreaterThan(idxPoolFilters)
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

    // Target's editor (Furina) has NO Fast Mode row
    expect(findByTestId(tree, 'fast-mode-expander-toggle-Furina')).toBeUndefined()

    // Select KaedeharaKazuha's tab to verify Fast Mode visibility across modes
    ;(
      findByTestId(tree, 'member-buffs-tab-KaedeharaKazuha')!.props
        .onClick as () => void
    )()
    const kazuhaTree = renderPass()

    // In default 'single' mode: WeaponComparisonPanel is hidden, teammate's Fast Mode row and Top N Builds are shown
    expect(findByTestId(kazuhaTree, 'weapon-compare-panel')).toBeUndefined()
    expect(findByTestId(kazuhaTree, 'teammate-fast-mode-panel')).toBeUndefined()
    expect(
      findByTestId(kazuhaTree, 'fast-mode-expander-toggle-KaedeharaKazuha')
    ).toBeDefined()
    expect(findByTestId(kazuhaTree, 'top-n-builds-select')).toBeDefined()

    // Switch to 'compare' mode: WeaponComparisonPanel appears, single-mode target picker and Top N Builds hide
    const compareBtn = findByTestId(kazuhaTree, 'optimize-mode-compare')!
    ;(compareBtn.props.onClick as () => void)()
    const compareTree = renderPass()
    expect(findByTestId(compareTree, 'weapon-compare-panel')).toBeDefined()
    expect(
      findByTestId(compareTree, 'official-target-weapon-picker')
    ).toBeUndefined()
    expect(
      findByTestId(compareTree, 'fast-mode-expander-toggle-KaedeharaKazuha')
    ).toBeDefined()
    expect(findByTestId(compareTree, 'top-n-builds-select')).toBeUndefined()
    expect(findByTestId(compareTree, 'run-weapon-compare-btn')).toBeDefined()

    // Switch to 'team' mode: Fast Mode expanders and WeaponComparisonPanel hide, Optimize Team button renders
    const teamBtn = findByTestId(compareTree, 'optimize-mode-team')!
    ;(teamBtn.props.onClick as () => void)()
    const teamTree = renderPass()
    expect(findByTestId(teamTree, 'weapon-compare-panel')).toBeUndefined()
    expect(findByTestId(teamTree, 'teammate-fast-mode-panel')).toBeUndefined()
    expect(
      findByTestId(teamTree, 'fast-mode-expander-toggle-KaedeharaKazuha')
    ).toBeUndefined()
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

  it('flow-collapsible-stages: groups Artifact settings into 3 Wikipedia-style collapsible sections with live one-line summaries, moves Main-Stat Assumption Level into Pool Filters, Top N Builds into Run & Results, and Resonance toggle into Team & Buffs', () => {
    resetSolverPoolFiltersExpandedSession()
    const tree1 = renderPass()

    // (1) At defaults, all 3 Artifact settings sections start closed with one-line summaries and show/hide toggles
    const setsToggle = findByTestId(tree1, 'sets-protected-collapsible-toggle')!
    const setsSummary = findByTestId(
      tree1,
      'sets-protected-collapsible-summary'
    )!
    expect(setsToggle.props['aria-expanded']).toBe(false)
    expect(setsToggle.props['aria-controls']).toBe(
      'sets-protected-collapsible-body'
    )
    expect(
      findAll(
        [setsToggle],
        (n) =>
          n.props['data-gi-icon'] === 'ChevronIcon' &&
          n.props['data-chevron-state'] === 'closed'
      )
    ).toHaveLength(1)
    expect(collectText([setsSummary])).toContain(
      'Artifact Set Filter & Protected Characters — All sets allowed · None protected'
    )
    expect(findByTestId(tree1, 'sets-protected-collapsible-body')).toBeUndefined()

    const poolToggle = findByTestId(tree1, 'solver-pool-filters-toggle')!
    const poolSummary = findByTestId(tree1, 'solver-pool-filters-summary')!
    expect(poolToggle.props['aria-expanded']).toBe(false)
    expect(collectText([poolSummary])).toContain('Pool Filters — unrestricted')
    expect(findByTestId(tree1, 'solver-pool-filters-body')).toBeUndefined()
    // Main-Stat Assumption Level is not rendered outside Pool Filters when Pool Filters is collapsed
    expect(
      findByTestId(tree1, 'pool-filter-main-stat-assumption')
    ).toBeUndefined()

    const constraintsToggle = findByTestId(
      tree1,
      'constraints-collapsible-toggle'
    )!
    const constraintsSummary = findByTestId(
      tree1,
      'constraints-collapsible-summary'
    )!
    expect(constraintsToggle.props['aria-expanded']).toBe(false)
    expect(constraintsToggle.props['aria-controls']).toBe(
      'constraints-collapsible-body'
    )
    expect(
      findAll(
        [constraintsToggle],
        (n) =>
          n.props['data-gi-icon'] === 'ChevronIcon' &&
          n.props['data-chevron-state'] === 'closed'
      )
    ).toHaveLength(1)
    expect(collectText([constraintsSummary])).toBe('Stat Constraints — none')
    expect(findByTestId(tree1, 'constraints-collapsible-body')).toBeUndefined()

    // (2) Top N Builds sits inside Run & Results (Stage 5) and Resonance toggle sits inside Team & Buffs (Stage 3)
    const stage3 = findByTestId(tree1, 'team-buffs-stage')!
    const stage5 = findByTestId(tree1, 'results-card')!
    expect(findByTestId([stage3], 'resonance-master-toggle')).toBeDefined()
    expect(findByTestId([stage5], 'top-n-builds-select')).toBeDefined()

    // (3) Open Pool Filters modal via Edit button -> Main-Stat Assumption Level lives inside Pool Filters modal
    expect(findByTestId(tree1, 'pool-filters-edit-btn')).toBeDefined()
    expect(findByTestId(tree1, 'pool-filters-modal')).toBeUndefined()
    ;(poolToggle.props.onClick as () => void)()
    const treePoolExpanded = renderPass()
    const poolModal = findByTestId(treePoolExpanded, 'pool-filters-modal')!
    expect(poolModal).toBeDefined()
    expect(poolModal.props.role).toBe('dialog')
    expect(poolModal.props['aria-modal']).toBe('true')
    const poolBody = findByTestId(treePoolExpanded, 'solver-pool-filters-body')!
    expect(poolBody).toBeDefined()
    expect(
      findByTestId([poolBody], 'pool-filter-main-stat-assumption')
    ).toBeDefined()
    // Close Pool Filters modal via Done button
    ;(
      findByTestId(treePoolExpanded, 'close-pool-filters-modal-btn')!.props
        .onClick as () => void
    )()
    const treePoolClosed = renderPass()
    expect(findByTestId(treePoolClosed, 'pool-filters-modal')).toBeUndefined()

    // (4) Open Stat Constraints modal via Edit button -> add ER >= 200% live and verify summary row updates
    expect(findByTestId(treePoolClosed, 'constraints-edit-btn')).toBeDefined()
    expect(findByTestId(treePoolClosed, 'constraints-modal')).toBeUndefined()
    ;(
      findByTestId(treePoolClosed, 'constraints-collapsible-toggle')!.props
        .onClick as () => void
    )()
    const treeConstraintsModal = renderPass()
    const constraintsModal = findByTestId(
      treeConstraintsModal,
      'constraints-modal'
    )!
    expect(constraintsModal).toBeDefined()
    expect(constraintsModal.props.role).toBe('dialog')
    expect(constraintsModal.props['aria-modal']).toBe('true')
    ;(
      findByTestId(treeConstraintsModal, 'add-constraint-btn')!.props
        .onClick as () => void
    )()
    const treeWithPicker = renderPass()
    ;(
      findByTestId(treeWithPicker, 'picker-stat-enerRech_')!.props
        .onClick as () => void
    )()
    const treeWithErRow = renderPass()
    ;(
      findByTestId(treeWithErRow, 'constraint-min-enerRech_')!.props
        .onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '200' } })
    const treeWithEr200 = renderPass()
    expect(
      collectText([
        findByTestId(treeWithEr200, 'constraints-collapsible-summary')!,
      ])
    ).toBe('Stat Constraints — ER ≥ 200%')
    ;(
      findByTestId(treeWithEr200, 'close-constraints-modal-btn')!.props
        .onClick as () => void
    )()
    const treeAfterModalClose = renderPass()
    expect(
      findByTestId(treeAfterModalClose, 'constraints-modal')
    ).toBeUndefined()
    expect(
      collectText([
        findByTestId(treeAfterModalClose, 'constraints-collapsible-summary')!,
      ])
    ).toBe('Stat Constraints — ER ≥ 200%')

    // (5) Non-default settings: remaining Set Filter + Protected Characters collapsible starts open on fresh mount, while modal editors stay closed with live summary rows
    hookStore.reset()
    resetSolverPoolFiltersExpandedSession()
    mockSettings = {
      ...structuredClone(DEFAULT_OPTIMIZER_SETTINGS),
      excludedCharacters: ['Neuvillette'],
      mainStatAssumptionLevel: 20,
      constraints: [{ stat: 'enerRech_', min: 200 }],
    }

    const treeNonDefault = renderPass()
    expect(
      findByTestId(treeNonDefault, 'sets-protected-collapsible-toggle')!.props[
        'aria-expanded'
      ]
    ).toBe(true)
    expect(
      collectText([
        findByTestId(treeNonDefault, 'sets-protected-collapsible-summary')!,
      ])
    ).toContain('1 protected')

    expect(
      findByTestId(treeNonDefault, 'solver-pool-filters-toggle')!.props[
        'aria-expanded'
      ]
    ).toBe(false)
    expect(
      findByTestId(treeNonDefault, 'pool-filters-modal')
    ).toBeUndefined()
    expect(
      collectText([
        findByTestId(treeNonDefault, 'solver-pool-filters-summary')!,
      ])
    ).toContain('Assume Lv. 20+')

    expect(
      findByTestId(treeNonDefault, 'constraints-collapsible-toggle')!.props[
        'aria-expanded'
      ]
    ).toBe(false)
    expect(findByTestId(treeNonDefault, 'constraints-modal')).toBeUndefined()
    expect(
      collectText([
        findByTestId(treeNonDefault, 'constraints-collapsible-summary')!,
      ])
    ).toBe('Stat Constraints — ER ≥ 200%')

    mockSettings = {
      ...mockSettings,
      constraints: [
        { stat: 'enerRech_', min: 200 },
        { stat: 'critRate_', min: 70, max: 100 },
      ],
    }
    const treeLiveSummary = renderPass()
    expect(
      findByTestId(treeLiveSummary, 'constraints-collapsible-toggle')!.props[
        'aria-expanded'
      ]
    ).toBe(false)
    expect(
      collectText([
        findByTestId(treeLiveSummary, 'constraints-collapsible-summary')!,
      ])
    ).toBe('Stat Constraints — ER ≥ 200%, CRIT Rate 70%–100%')
  })

  it('team-buffs-merge / team-stage-member-cards: merges Stage 3 into one section where each member appears once as a tab (Furina with Target marker), and each member editor displays weapon row, single build-state label, Base->Final stats, Fast Mode modal trigger (teammates only), and buff switches', () => {
    mockSearchParams = new URLSearchParams('preset=akasha/furina-salon-pjc-c0')
    const tree1 = renderPass()

    // (1) Separate member card grid and separate Buffs & Passives sub-panel are gone
    expect(findByTestId(tree1, 'teammate-fast-mode-panel')).toBeUndefined()
    expect(findByTestId(tree1, 'preset-team-roster')).toBeUndefined()
    expect(findByTestId(tree1, 'buffs-collapsible-toggle')).toBeUndefined()

    const stage3 = findByTestId(tree1, 'team-buffs-stage')!
    expect(stage3).toBeDefined()
    expect(findByTestId([stage3], 'team-resonance-master-row')).toBeDefined()
    const tablist = findByTestId([stage3], 'buff-panel-member-tabs')!
    expect(tablist).toBeDefined()

    const memberKeys = [
      'Furina',
      'Neuvillette',
      'KaedeharaKazuha',
      'Zhongli',
    ] as const

    // Each member appears EXACTLY ONCE in Stage 3 (in their tab), and Furina's tab carries the Target marker
    for (const mKey of memberKeys) {
      const tab = findByTestId([tablist], `member-buffs-tab-${mKey}`)!
      expect(tab).toBeDefined()
      const charBadgesInStage = findAll(
        [stage3],
        (n) =>
          n.props['data-identifier-kind'] === 'character' &&
          n.props['data-character-key'] === mKey
      )
      expect(charBadgesInStage).toHaveLength(1)
      if (mKey === 'Furina') {
        expect(collectText([tab])).toContain('Target')
      } else {
        expect(collectText([tab])).not.toContain('Target')
      }
    }

    // Target (Furina) editor has NO Fast Mode row
    expect(findByTestId(tree1, 'fast-mode-section-Furina')).toBeUndefined()
    expect(
      findByTestId(tree1, 'fast-mode-expander-toggle-Furina')
    ).toBeUndefined()

    for (const mKey of memberKeys) {
      ;(
        findByTestId(tree1, `member-buffs-tab-${mKey}`)!.props
          .onClick as () => void
      )()
      const treeMember = renderPass()
      const editor = findByTestId(treeMember, `member-buffs-panel-${mKey}`)!
      expect(editor).toBeDefined()

      // Build-state label appears EXACTLY ONCE in the member editor
      const statePill = findByTestId([editor], `member-build-state-${mKey}`)!
      expect(statePill).toBeDefined()
      if (mKey === 'Furina') {
        expect(collectText([statePill])).toContain('Fixed Spec · Lv.90 C0')
      } else {
        expect(collectText([statePill])).toBe('Fixed by Case')
        const editorText = collectText([editor])
        expect(editorText.split('Fixed by Case').length - 1).toBe(1)
      }

      // Uniform single-row weapon badge inside the weapon trigger
      const weaponBtn = findByTestId([editor], `member-weapon-trigger-${mKey}`)!
      expect(weaponBtn).toBeDefined()
      const weaponRowBadge = findAll(
        [weaponBtn],
        (n) => n.props['data-identifier-kind'] === 'weapon'
      )[0]!
      expect(weaponRowBadge).toBeDefined()
      expect(weaponRowBadge.props.className).toContain(
        'preset-weapon-badge-row'
      )

      // Compact base -> final stat grid lives inside the member editor
      expect(findByTestId([editor], `teammate-stats-${mKey}`)).toBeDefined()
      expect(
        findByTestId([editor], `teammate-stat-base-${mKey}-hp`)
      ).toBeDefined()
      expect(
        findByTestId([editor], `teammate-stat-final-${mKey}-hp`)
      ).toBeDefined()

      // Buff/passive groups live in the same member editor
      expect(findByTestId([editor], `buff-group-weapon-${mKey}`)).toBeDefined()
      expect(
        findByTestId([editor], `buff-group-artifact-${mKey}`)
      ).toBeDefined()
      expect(
        findByTestId([editor], `buff-group-character-${mKey}`)
      ).toBeDefined()
      expect(
        findByTestId([editor], `buff-group-constellation-${mKey}`)
      ).toBeDefined()

      // Fast Mode row on teammates starts closed by default with "Not set" and "Edit" button
      if (mKey !== 'Furina') {
        const expToggle = findByTestId(
          [editor],
          `fast-mode-expander-toggle-${mKey}`
        )!
        expect(expToggle).toBeDefined()
        expect(expToggle.props['aria-expanded']).toBe(false)
        expect(expToggle.props['aria-controls']).toBe(
          `fast-mode-editor-${mKey}`
        )
        expect(
          findAll(
            [expToggle],
            (n) =>
              n.props['data-gi-icon'] === 'ChevronIcon' &&
              n.props['data-chevron-state'] === 'closed'
          )
        ).toHaveLength(1)
        expect(
          collectText([findByTestId([editor], `fast-mode-summary-${mKey}`)!])
        ).toBe('Not set')
        expect(
          collectText([findByTestId([editor], `fast-mode-edit-btn-${mKey}`)!])
        ).toBe('Edit')
        expect(
          findByTestId(treeMember, `fast-mode-modal-${mKey}`)
        ).toBeUndefined()
        expect(
          findByTestId(treeMember, `fast-mode-editor-${mKey}`)
        ).toBeUndefined()
        expect(
          findByTestId(treeMember, `fast-mode-reset-${mKey}`)
        ).toBeUndefined()
      }
    }

    // (2) Select KaedeharaKazuha's tab, open his Fast Mode modal, and enter +200 EM -> Reset Fast Mode appears in modal and Fast Mode badge appears on Kazuha's tab
    ;(
      findByTestId(tree1, 'member-buffs-tab-KaedeharaKazuha')!.props
        .onClick as () => void
    )()
    const treeKazuha = renderPass()
    ;(
      findByTestId(treeKazuha, 'fast-mode-expander-toggle-KaedeharaKazuha')!
        .props.onClick as () => void
    )()
    const treeExpanded = renderPass()
    expect(
      findByTestId(treeExpanded, 'fast-mode-expander-toggle-KaedeharaKazuha')!
        .props['aria-expanded']
    ).toBe(true)
    const fastModal = findByTestId(
      treeExpanded,
      'fast-mode-modal-KaedeharaKazuha'
    )!
    expect(fastModal).toBeDefined()
    expect(fastModal.props['aria-label']).toBe('Fast Mode — Kaedehara Kazuha')
    const emInput = findByTestId(
      treeExpanded,
      'fast-mode-input-KaedeharaKazuha-eleMas'
    )!
    expect(emInput).toBeDefined()
    ;(
      emInput.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '200' } })

    const treeWithFastMode = renderPass()
    expect(
      collectText([
        findByTestId(treeWithFastMode, 'fast-mode-summary-KaedeharaKazuha')!,
      ])
    ).toBe('+200 EM')
    expect(
      findByTestId(treeWithFastMode, 'fast-mode-reset-KaedeharaKazuha')
    ).toBeDefined()
    // Fast Mode badge renders on KaedeharaKazuha's tab
    const kazuhaTabWithFastMode = findByTestId(
      treeWithFastMode,
      'member-buffs-tab-KaedeharaKazuha'
    )!
    expect(
      findByTestId([kazuhaTabWithFastMode], 'fast-mode-badge-KaedeharaKazuha')
    ).toBeDefined()

    // Clicking Reset Fast Mode clears KaedeharaKazuha's Fast Mode values and hides the button & tab badge again
    ;(
      findByTestId(treeWithFastMode, 'fast-mode-reset-KaedeharaKazuha')!.props
        .onClick as () => void
    )()
    const treeReset = renderPass()
    expect(
      findByTestId(treeReset, 'fast-mode-reset-KaedeharaKazuha')
    ).toBeUndefined()
    expect(
      findByTestId(treeReset, 'fast-mode-badge-KaedeharaKazuha')
    ).toBeUndefined()

    // (3) Stage 2 mode selection keeps Compare Weapons (N) count
    const compareModeBtn = findByTestId(treeReset, 'optimize-mode-compare')!
    expect(collectText([compareModeBtn])).toMatch(/^Compare Weapons \(\d+\)$/)

    // (4) stage-spacing-basics: all 5 stages have consistent header structure (first child of .gi-card-header is the title/subtitle div) so section headers align to the same left edge
    for (const stageId of [
      'setup-card',
      'mode-selection-card',
      'team-buffs-stage',
      'artifact-settings-card',
      'results-card',
    ] as const) {
      const stageSection = findByTestId(treeReset, stageId)!
      expect(stageSection).toBeDefined()
      const headerDiv = stageSection.children.find(
        (c): c is VNode =>
          typeof c !== 'string' &&
          typeof c.props.className === 'string' &&
          c.props.className.includes('gi-card-header')
      )!
      expect(headerDiv).toBeDefined()
      const firstHeaderChild = headerDiv.children.find(
        (c): c is VNode => typeof c !== 'string'
      )!
      expect(firstHeaderChild).toBeDefined()
      expect(firstHeaderChild.type).toBe('div')
      const titleH2 = firstHeaderChild.children.find(
        (c): c is VNode => typeof c !== 'string' && c.type === 'h2'
      )!
      expect(titleH2).toBeDefined()
      expect(titleH2.props.className).toContain('gi-card-title')
    }
  })
})
