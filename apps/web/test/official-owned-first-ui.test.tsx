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

const mockEvaluatePresetInWorker = vi.fn(async () => ({
  currentBuild: { weaponId: 'w_furina', artifactIds: {} },
  result: { total: 374658, instances: [], stats: {} },
}))
const mockOptimizePresetInWorker = vi.fn(async () => ({
  builds: [],
  tested: 0,
  skipped: 0,
  durationMs: 10,
}))

vi.mock('@/lib/engine/workerClient', () => ({
  evaluatePresetInWorker: () => mockEvaluatePresetInWorker(),
  optimizePresetInWorker: () => mockOptimizePresetInWorker(),
  getCatalogInWorker: async () => ({
    targetsByChar: {},
    conditionalsByChar: {},
  }),
  exportGODatabaseInWorker: vi.fn(),
  cancelOptimizationInWorker: vi.fn(),
  isEngineSessionHydrated: () => true,
}))

import OptimizePage from '../src/app/optimize/page'

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
  })
})
