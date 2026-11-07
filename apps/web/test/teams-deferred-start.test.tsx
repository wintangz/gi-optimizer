import { createSession } from '@gi/engine'
import type { IGOOD } from '@gi/good'
import { DEFAULT_OPTIMIZER_SETTINGS, listBundledPresets, type Preset } from '@gi/presets'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Harness state for hook-aware rendering in Node ---
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
        const list = hookStore.statesByComp.get(compKey)!
        const prevVal = list[idx] as T
        const nextVal =
          typeof next === 'function' ? (next as (prev: T) => T)(prevVal) : next
        list[idx] = nextVal
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

// --- Mock Next.js navigation, storage hooks, and workerClient ---
let mockSearchParams = new URLSearchParams()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
      talent: { auto: 1, skill: 10, burst: 10 },
    },
  ],
  weapons: [
    {
      id: 'w1',
      key: 'SplendorOfStillWaters',
      level: 90,
      ascension: 6,
      refinement: 1,
      location: 'Furina',
      lock: true,
    },
  ],
  artifacts: [],
}

let mockGoodRecord: { importedAt: string; good: IGOOD } | null = {
  importedAt: '2026-11-05T00:00:00.000Z',
  good: SAMPLE_GOOD,
}

let mockUserPresets: Preset[] = []

const mockSaveUserPreset = vi.fn(async (preset: Preset) => {
  const existingIdx = mockUserPresets.findIndex((p) => p.id === preset.id)
  if (existingIdx >= 0) {
    mockUserPresets = [
      ...mockUserPresets.slice(0, existingIdx),
      preset,
      ...mockUserPresets.slice(existingIdx + 1),
    ]
  } else {
    mockUserPresets = [...mockUserPresets, preset]
  }
})
const mockRemoveUserPreset = vi.fn(async (id: string) => {
  mockUserPresets = mockUserPresets.filter((p) => p.id !== id)
})

vi.mock('@/lib/storage/useGood', () => ({
  useGoodStorage: () => ({
    record: mockGoodRecord,
    loading: false,
  }),
  useOptimizerSettings: () => ({
    settings: DEFAULT_OPTIMIZER_SETTINGS,
    loading: false,
    update: vi.fn(),
  }),
  useUserPresets: () => ({
    presets: mockUserPresets,
    loading: false,
    save: mockSaveUserPreset,
    remove: mockRemoveUserPreset,
  }),
}))

const mockGetCatalogInWorker = vi.fn()
const mockEvaluatePresetInWorker = vi.fn()
const mockIsEngineSessionHydrated = vi.fn(() => false)

vi.mock('@/lib/engine/workerClient', () => ({
  getCatalogInWorker: (...args: unknown[]) => mockGetCatalogInWorker(...args),
  evaluatePresetInWorker: (...args: unknown[]) =>
    mockEvaluatePresetInWorker(...args),
  isEngineSessionHydrated: () => mockIsEngineSessionHydrated(),
}))

import TeamsPage from '../src/app/teams/page'
import PresetsPage from '../src/app/presets/page'

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
      const fn = el.type as ((p: Record<string, unknown>) => unknown) & {
        name?: string
      }
      hookStore.enterComp(fn)
      try {
        const rendered = fn(props)
        return evaluateTree(rendered)
      } finally {
        hookStore.leaveComp()
      }
    }
    if (typeof el.type === 'string') {
      const children = evaluateTree(props.children)
      return [{ type: el.type, props, children }]
    }
    // React.Suspense / Fragment
    return evaluateTree(props.children)
  }
  return []
}

function renderPass(): VNode[] {
  hookStore.active = true
  hookStore.beginRender()
  try {
    const nodes = evaluateTree(React.createElement(TeamsPage))
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

function findAllElements(
  nodes: Array<VNode | string>,
  predicate: (el: VNode) => boolean
): VNode[] {
  const matches: VNode[] = []
  for (const n of nodes) {
    if (typeof n !== 'string') {
      if (predicate(n)) {
        matches.push(n)
      }
      matches.push(...findAllElements(n.children, predicate))
    }
  }
  return matches
}

describe('Deferred Engine Start on Custom Teams Page (teams-deferred-start)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    hookStore.reset()
    mockSearchParams = new URLSearchParams()
    mockUserPresets = []
    mockSaveUserPreset.mockClear()
    mockRemoveUserPreset.mockClear()
    mockGoodRecord = {
      importedAt: '2026-11-05T00:00:00.000Z',
      good: SAMPLE_GOOD,
    }
    mockGetCatalogInWorker.mockReset()
    mockEvaluatePresetInWorker.mockReset()
    mockIsEngineSessionHydrated.mockReset()
    mockIsEngineSessionHydrated.mockReturnValue(false)

    mockGetCatalogInWorker.mockImplementation(async (keys: string[]) => ({
      targetsByChar: Object.fromEntries(
        keys.map((k) => [
          k,
          [
            {
              path: ['skill', 'usherDmg'],
              sheet: k,
              name: 'Gentilhomme Usher DMG',
            },
          ],
        ])
      ),
      conditionalsByChar: Object.fromEntries(
        keys.map((k) => [
          k,
          [
            {
              sheet: k,
              key: 'fanfare',
              name: 'Fanfare Stacks',
              states: [{ key: 'on', name: 'Max Stacks' }],
            },
          ],
        ])
      ),
    }))

    mockEvaluatePresetInWorker.mockResolvedValue({
      result: {
        total: 42500,
        instances: [
          {
            label: 'Gentilhomme Usher DMG',
            count: 1,
            perHit: 42500,
            subtotal: 42500,
          },
        ],
        memberStats: {},
      },
    })
  })

  afterEach(() => {
    hookStore.reset()
    vi.useRealTimers()
  })

  it('US1: mounts /teams without ?fork= or ?edit= with zero worker calls, showing fallback rotation option and "Load Engine & Preview" button', () => {
    const tree = renderPass()
    const text = collectText(tree)

    // Zero worker client calls on initial mount even with an imported GOOD dataset
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()
    expect(mockEvaluatePresetInWorker).not.toHaveBeenCalled()

    // Even after advancing timers past the 150ms debounce window, zero worker calls occur
    vi.advanceTimersByTime(500)
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()
    expect(mockEvaluatePresetInWorker).not.toHaveBeenCalled()

    // Page shell & preset list are rendered immediately
    expect(text).toContain('Custom Team & Preset Builder')
    expect(text).toContain('Load or Fork Existing Preset:')

    // Deferred Live Rotation Preview CTA is rendered instead of a spinner
    expect(text).toContain('Load Engine & Preview')
    expect(text).not.toContain('Loading optimizer engine…')
    const loadBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'load-engine-preview-btn'
    )
    expect(loadBtn).toHaveLength(1)

    // Rotation target <select> preserves the current path via the fallback <option> without raw path suffix
    const fallbackOptions = findAllElements(
      tree,
      (el) => el.type === 'option' && el.props.value === 'skill.usherDmg'
    )
    expect(fallbackOptions).toHaveLength(1)
    expect(collectText(fallbackOptions[0]!.children)).toBe('Normal 1')
    expect(fallbackOptions[0]!.props.title).toBe('skill.usherDmg')
  })

  it('US2: clicking "Load Engine & Preview" starts the engine, shows "Loading optimizer engine…", loads catalogs, and evaluates the live preview', async () => {
    // Keep catalog promise pending initially so we can observe the loading state
    let resolveCatalog!: (val: unknown) => void
    mockGetCatalogInWorker.mockReturnValueOnce(
      new Promise((r) => {
        resolveCatalog = r
      })
    )

    let tree = renderPass()
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()

    const loadBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'load-engine-preview-btn'
    )[0]!
    ;(loadBtn.props.onClick as () => void)()

    // Re-render after click: engineStarted is now true, catalog + preview effects fire
    tree = renderPass()
    // Re-render once more to reflect synchronous setCatalogLoading(true) / setPreviewLoading(true)
    tree = renderPass()

    expect(mockGetCatalogInWorker).toHaveBeenCalledTimes(1)
    expect(mockGetCatalogInWorker).toHaveBeenCalledWith(['Furina'])

    const loadingText = collectText(tree)
    expect(loadingText).toContain('Loading optimizer engine…')
    expect(loadingText).not.toContain('Load Engine & Preview')

    // Resolve catalog and advance the 150ms preview debounce timer
    resolveCatalog({
      targetsByChar: {
        Furina: [
          {
            path: ['skill', 'usherDmg'],
            sheet: 'Furina',
            name: 'Gentilhomme Usher DMG',
          },
        ],
      },
      conditionalsByChar: { Furina: [] },
    })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(200)
    await Promise.resolve()

    tree = renderPass()
    const finalText = collectText(tree)
    expect(mockEvaluatePresetInWorker).toHaveBeenCalledTimes(1)
    expect(finalText).toContain('Total: 42,500 DMG')
    expect(finalText).toContain('Gentilhomme Usher DMG')
    expect(finalText).not.toContain('(skill.usherDmg)')
  })

  it('US2: picking a preset in "Load or Fork Existing Preset" starts the engine on demand', async () => {
    const firstBundledId = listBundledPresets()[0]!.id
    let tree = renderPass()
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()

    const presetSelect = findAllElements(
      tree,
      (el) =>
        el.type === 'select' &&
        findAllElements(
          el.children,
          (c) => c.type === 'option' && c.props.value === firstBundledId
        ).length > 0
    )[0]!

    ;(
      presetSelect.props.onChange as (e: { target: { value: string } }) => void
    )({
      target: { value: firstBundledId },
    })

    tree = renderPass()
    expect(mockGetCatalogInWorker).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(200)
    tree = renderPass()
    expect(mockEvaluatePresetInWorker).toHaveBeenCalledTimes(1)
    expect(collectText(tree)).toContain('Total: 42,500 DMG')
  })

  it('US2: changing target character or adding a teammate or focusing dropdowns starts the engine on demand', async () => {
    let tree = renderPass()
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()

    // Focus the GO Formula Target <select>
    const targetSelect = findAllElements(
      tree,
      (el) => el.type === 'select' && el.props.value === 'skill.usherDmg'
    )[0]!
    ;(targetSelect.props.onFocus as () => void)()

    tree = renderPass()
    expect(mockGetCatalogInWorker).toHaveBeenCalledTimes(1)

    // Reset and test "+ Add Simulated Teammate" button
    hookStore.reset()
    mockGetCatalogInWorker.mockClear()
    tree = renderPass()
    expect(mockGetCatalogInWorker).not.toHaveBeenCalled()

    const addTeammateBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        collectText(el.children).includes('+ Add Simulated Teammate')
    )[0]!
    ;(addTeammateBtn.props.onClick as () => void)()

    tree = renderPass()
    expect(mockGetCatalogInWorker).toHaveBeenCalledTimes(1)
    expect(mockGetCatalogInWorker).toHaveBeenCalledWith([
      'Furina',
      'KaedeharaKazuha',
    ])
  })

  it('US2: mounting with ?fork=<presetId> automatically activates the engine on mount', async () => {
    const firstBundledId = listBundledPresets()[0]!.id
    mockSearchParams = new URLSearchParams(`fork=${firstBundledId}`)

    let tree = renderPass()
    // Re-render to process the fork draft update and loading states
    tree = renderPass()

    expect(mockGetCatalogInWorker).toHaveBeenCalled()
    expect(collectText(tree)).not.toContain('Load Engine & Preview')

    await vi.advanceTimersByTimeAsync(200)
    tree = renderPass()
    expect(mockEvaluatePresetInWorker).toHaveBeenCalled()
    expect(collectText(tree)).toContain('Total: 42,500 DMG')
  })

  it('custom-team-enemy-edit regression: create custom team with non-default enemy RES, save, reopen, change RES, save again, verify reopened editor and engine evaluation reflect new RES', async () => {
    // 1. Create a custom team (starting from a forked preset to also verify ?fork= does not clobber on save)
    const baseOfficial = listBundledPresets().find(
      (p) => p.id === 'official/furina-salon-subdps'
    )!
    expect(baseOfficial.enemy).toEqual({ level: 100, overrides: {} })

    mockSearchParams = new URLSearchParams(`fork=${baseOfficial.id}`)
    let tree = renderPass()
    tree = renderPass()

    const getHydroResInput = (nodes: VNode[]) =>
      findAllElements(
        nodes,
        (el) =>
          el.type === 'input' &&
          el.props['data-testid'] === 'enemy-res-input-hydro_enemyRes_'
      )[0]!

    const getEnemyLevelInput = (nodes: VNode[]) =>
      findAllElements(
        nodes,
        (el) =>
          el.type === 'input' &&
          el.props['data-testid'] === 'enemy-level-input'
      )[0]!

    const getSaveButton = (nodes: VNode[]) =>
      findAllElements(
        nodes,
        (el) =>
          el.type === 'button' && collectText(el.children).trim() === 'Save'
      )[0]!

    // Initial forked preset starts with default 10% Hydro RES and enemy level 100
    expect(getHydroResInput(tree).props.value).toBe(10)
    expect(getEnemyLevelInput(tree).props.value).toBe(100)

    // Set non-default enemy RES (50%) and enemy level (95)
    ;(
      getHydroResInput(tree).props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '50' } })
    ;(
      getEnemyLevelInput(tree).props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '95' } })

    tree = renderPass()
    expect(getHydroResInput(tree).props.value).toBe(50)
    expect(getEnemyLevelInput(tree).props.value).toBe(95)

    // Save the custom team
    await (getSaveButton(tree).props.onClick as () => Promise<void>)()
    tree = renderPass()

    expect(mockSaveUserPreset).toHaveBeenCalledTimes(1)
    expect(mockUserPresets).toHaveLength(1)
    const firstSavedPreset = structuredClone(mockUserPresets[0]!)
    expect(firstSavedPreset.source).toBe('user')
    expect(firstSavedPreset.enemy.level).toBe(95)
    expect(firstSavedPreset.enemy.overrides.hydro_enemyRes_).toBe(50)

    // Editor must NOT reset back to defaults after saving while ?fork= was in the URL
    expect(getHydroResInput(tree).props.value).toBe(50)
    expect(getEnemyLevelInput(tree).props.value).toBe(95)

    // Bundled preset remains untouched
    expect(baseOfficial.enemy).toEqual({ level: 100, overrides: {} })

    // 2. Reopen the saved custom team in the team editor via ?edit=<savedId>
    hookStore.reset()
    mockSearchParams = new URLSearchParams(`edit=${firstSavedPreset.id}`)
    tree = renderPass()
    tree = renderPass()

    // Reopened editor must show saved enemy level (95) and Hydro RES (50), not defaults (100 / 10)
    expect(getHydroResInput(tree).props.value).toBe(50)
    expect(getEnemyLevelInput(tree).props.value).toBe(95)

    // 3. Change the enemy RES to -20% (and enemy level to 85) and save again
    ;(
      getHydroResInput(tree).props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '-20' } })
    ;(
      getEnemyLevelInput(tree).props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: '85' } })

    tree = renderPass()
    expect(getHydroResInput(tree).props.value).toBe(-20)
    expect(getEnemyLevelInput(tree).props.value).toBe(85)

    await (getSaveButton(tree).props.onClick as () => Promise<void>)()
    tree = renderPass()

    expect(mockSaveUserPreset).toHaveBeenCalledTimes(2)
    expect(mockUserPresets).toHaveLength(1)
    const secondSavedPreset = structuredClone(mockUserPresets[0]!)
    expect(secondSavedPreset.id).toBe(firstSavedPreset.id)
    expect(secondSavedPreset.enemy.level).toBe(85)
    expect(secondSavedPreset.enemy.overrides.hydro_enemyRes_).toBe(-20)

    // 4. Reopen the edited custom team again and assert the reopened editor shows the new values
    hookStore.reset()
    mockSearchParams = new URLSearchParams(`edit=${secondSavedPreset.id}`)
    tree = renderPass()
    tree = renderPass()

    expect(getHydroResInput(tree).props.value).toBe(-20)
    expect(getEnemyLevelInput(tree).props.value).toBe(85)

    // 5. Evaluate and optimize with the real engine session and verify the edited enemy RES/level is reflected in the total
    const sessionGood: IGOOD = {
      format: 'GOOD',
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
          id: 'w1',
          key: 'SplendorOfTranquilWaters',
          level: 90,
          ascension: 6,
          refinement: 1,
          location: 'Furina',
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
          substats: [
            { key: 'critRate_', value: 10 },
            { key: 'critDMG_', value: 20 },
          ],
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
          substats: [
            { key: 'critRate_', value: 10 },
            { key: 'critDMG_', value: 20 },
          ],
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
          substats: [
            { key: 'critRate_', value: 10 },
            { key: 'critDMG_', value: 20 },
          ],
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
          substats: [
            { key: 'critRate_', value: 10 },
            { key: 'critDMG_', value: 20 },
          ],
        },
        {
          id: 'a5',
          setKey: 'GoldenTroupe',
          slotKey: 'circlet',
          level: 20,
          rarity: 5,
          mainStatKey: 'critRate_',
          location: 'Furina',
          lock: true,
          substats: [
            { key: 'hp_', value: 10 },
            { key: 'critDMG_', value: 20 },
          ],
        },
      ],
    }

    vi.useRealTimers()
    const session = createSession(sessionGood)
    const evalHighRes = session.evaluate(firstSavedPreset)
    const evalLowRes = session.evaluate(secondSavedPreset)

    expect(evalHighRes.total).toBeGreaterThan(0)
    expect(evalLowRes.total).toBeGreaterThan(evalHighRes.total)

    const optHighRes = await session.optimize(
      firstSavedPreset,
      DEFAULT_OPTIMIZER_SETTINGS,
      { maxWorkers: 1 }
    )
    const optLowRes = await session.optimize(
      secondSavedPreset,
      DEFAULT_OPTIMIZER_SETTINGS,
      { maxWorkers: 1 }
    )
    expect(optHighRes.builds[0]!.total).toBeCloseTo(evalHighRes.total, 2)
    expect(optLowRes.builds[0]!.total).toBeCloseTo(evalLowRes.total, 2)
    expect(optLowRes.builds[0]!.total).toBeGreaterThan(
      optHighRes.builds[0]!.total
    )
  })

  it('delete-preset-confirm: requires explicit confirmation before deleting a user preset on both /teams and /presets, and only navigates away after confirmed delete', async () => {
    const baseOfficial = listBundledPresets()[0]!
    mockSearchParams = new URLSearchParams(`fork=${baseOfficial.id}`)
    let tree = renderPass()
    tree = renderPass()

    // Save the forked preset so it exists in userPresets
    const saveBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' && collectText(el.children).trim() === 'Save'
    )[0]!
    await (saveBtn.props.onClick as () => Promise<void>)()
    tree = renderPass()
    expect(mockUserPresets).toHaveLength(1)
    const savedId = mockUserPresets[0]!.id
    mockPush.mockClear()

    // 1. Teams editor: single click on "Delete Preset" does NOT delete or navigate
    const deleteBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'delete-preset-btn'
    )[0]!
    ;(deleteBtn.props.onClick as () => void)()
    tree = renderPass()

    expect(mockRemoveUserPreset).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(
      findAllElements(
        tree,
        (el) => el.props['data-testid'] === 'delete-preset-confirm-bar'
      )
    ).toHaveLength(1)

    // Cancel dismisses confirmation without deleting
    const cancelBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'cancel-delete-preset-btn'
    )[0]!
    ;(cancelBtn.props.onClick as () => void)()
    tree = renderPass()
    expect(
      findAllElements(
        tree,
        (el) => el.props['data-testid'] === 'delete-preset-confirm-bar'
      )
    ).toHaveLength(0)
    expect(mockUserPresets).toHaveLength(1)

    // Click Delete Preset again, then Confirm Delete -> deletes and navigates to /presets
    const deleteBtnAgain = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'delete-preset-btn'
    )[0]!
    ;(deleteBtnAgain.props.onClick as () => void)()
    tree = renderPass()

    const confirmBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'confirm-delete-preset-btn'
    )[0]!
    await (confirmBtn.props.onClick as () => Promise<void>)()

    expect(mockRemoveUserPreset).toHaveBeenCalledWith(savedId)
    expect(mockPush).toHaveBeenCalledWith('/presets')
    expect(mockUserPresets).toHaveLength(0)

    // 2. Presets page: re-add user preset and verify inline confirmation flow on /presets
    const userPreset: Preset = {
      ...baseOfficial,
      id: 'user/test-confirm-delete',
      name: 'Test Confirm Delete Preset',
      source: 'user',
    }
    mockUserPresets = [userPreset]
    mockRemoveUserPreset.mockClear()

    hookStore.reset()
    const renderPresetsPass = (): VNode[] => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        const nodes = evaluateTree(React.createElement(PresetsPage))
        hookStore.flushEffects()
        return nodes.filter((n): n is VNode => typeof n !== 'string')
      } finally {
        hookStore.active = false
      }
    }

    let presetsTree = renderPresetsPass()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    presetsTree = renderPresetsPass()

    // Filter to Custom User Presets ('user')
    const sourceSelect = findAllElements(
      presetsTree,
      (el) =>
        el.type === 'select' &&
        el.props['aria-label'] === 'Filter presets by source'
    )[0]!
    ;(
      sourceSelect.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: 'user' } })
    presetsTree = renderPresetsPass()

    // Click Delete once -> enters confirmation state, does not call removeUserPreset
    const presetsDeleteBtn = findAllElements(
      presetsTree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'delete-preset-btn'
    )[0]!
    ;(presetsDeleteBtn.props.onClick as () => void)()
    presetsTree = renderPresetsPass()

    expect(mockRemoveUserPreset).not.toHaveBeenCalled()
    const presetsConfirmBtn = findAllElements(
      presetsTree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'confirm-delete-preset-btn'
    )[0]!
    await (presetsConfirmBtn.props.onClick as () => Promise<void>)()
    expect(mockRemoveUserPreset).toHaveBeenCalledWith('user/test-confirm-delete')
  })

  it('user-facing-language: replaces raw conditional keys, drops GO Formula Path column and raw formula option suffixes, removes (Unverified Setup Bundle) banner, and shows short Akasha provenance label', async () => {
    // 1. Teams editor: no "(Unverified Setup Bundle)" banner, provenance badge remains, formula dropdown has no raw "(skill.usherDmg)" suffix
    const teamsTree = renderPass()
    const teamsText = collectText(teamsTree)
    expect(teamsText).not.toContain('(Unverified Setup Bundle)')
    const kindBadge = findAllElements(
      teamsTree,
      (el) => el.props['data-testid'] === 'teams-preset-kind-badge'
    )
    expect(kindBadge).toHaveLength(1)
    expect(collectText(kindBadge[0]!.children)).toBe(
      'Custom — use at your own risk'
    )

    const formulaOptions = findAllElements(
      teamsTree,
      (el) => el.type === 'option' && el.props.value === 'skill.usherDmg'
    )
    expect(formulaOptions).toHaveLength(1)
    expect(collectText(formulaOptions[0]!.children)).toBe('Normal 1')
    expect(formulaOptions[0]!.props.title).toBe('skill.usherDmg')

    // 2. Presets page: Active Conditionals show human-readable labels, rotation table omits "GO Formula Path" column, Akasha link shows short text
    hookStore.reset()
    const renderPresetsPass = (): VNode[] => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        const nodes = evaluateTree(React.createElement(PresetsPage))
        hookStore.flushEffects()
        return nodes.filter((n): n is VNode => typeof n !== 'string')
      } finally {
        hookStore.active = false
      }
    }

    let presetsTree = renderPresetsPass()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    presetsTree = renderPresetsPass()

    const presetsText = collectText(presetsTree)
    expect(presetsText).not.toContain('GO Formula Path')
    // Active conditionals should be human-readable, not raw `GoldenTroupe.set4 = on`
    expect(presetsText).not.toContain('.set4 = on')
    const condCells = findAllElements(
      presetsTree,
      (el) => el.type === 'td' && el.props.className === 'preset-td-conds'
    )
    expect(condCells.length).toBeGreaterThan(0)
    const allCondText = condCells.map((c) => collectText(c.children)).join(' | ')
    expect(allCondText).not.toContain(' = ')

    // Switch to Akasha presets and verify Akasha provenance link visible text is short
    const akashaPreset = listBundledPresets().find((p) => p.akasha)!
    const akashaCard = findAllElements(
      presetsTree,
      (el) =>
        el.type === 'div' &&
        el.props.role === 'button' &&
        collectText(el.children).includes(akashaPreset.name)
    )[0]
    if (akashaCard) {
      ;(akashaCard.props.onClick as () => void)()
      presetsTree = renderPresetsPass()
      const akashaLink = findAllElements(
        presetsTree,
        (el) => el.props['data-testid'] === 'akasha-provenance-link'
      )[0]!
      expect(collectText(akashaLink.children)).toBe('Akasha leaderboard case')
      expect(akashaLink.props.href).toBe(akashaPreset.akasha!.leaderboardUrl)
    }
  })

  it('collapsible-panels: collapses full-roster teammate and target character grids on /teams behind Add/Change controls and selects preset cards on /presets without in-card expansion', async () => {
    // 1. Teams editor: both full-roster CharacterTilePicker grids start collapsed
    let teamsTree = renderPass()
    expect(
      findAllElements(
        teamsTree,
        (el) => el.props['data-testid'] === 'add-teammate-picker-panel'
      )
    ).toHaveLength(0)
    expect(
      findAllElements(
        teamsTree,
        (el) => el.props['data-testid'] === 'change-target-picker-panel'
      )
    ).toHaveLength(0)

    const toggleTeammateBtn = findAllElements(
      teamsTree,
      (el) => el.props['data-testid'] === 'toggle-add-teammate-picker-btn'
    )[0]!
    expect(toggleTeammateBtn.props['aria-expanded']).toBe(false)
    ;(toggleTeammateBtn.props.onClick as () => void)()
    teamsTree = renderPass()
    expect(
      findAllElements(
        teamsTree,
        (el) => el.props['data-testid'] === 'add-teammate-picker-panel'
      )
    ).toHaveLength(1)

    const toggleTargetBtn = findAllElements(
      teamsTree,
      (el) => el.props['data-testid'] === 'toggle-change-target-btn'
    )[0]!
    expect(toggleTargetBtn.props['aria-expanded']).toBe(false)
    ;(toggleTargetBtn.props.onClick as () => void)()
    teamsTree = renderPass()
    expect(
      findAllElements(
        teamsTree,
        (el) => el.props['data-testid'] === 'change-target-picker-panel'
      )
    ).toHaveLength(1)

    // 2. Presets page: clicking a preset card selects it without rendering any in-card expanded section
    hookStore.reset()
    const renderPresetsPass = (): VNode[] => {
      hookStore.active = true
      hookStore.beginRender()
      try {
        const nodes = evaluateTree(React.createElement(PresetsPage))
        hookStore.flushEffects()
        return nodes.filter((n): n is VNode => typeof n !== 'string')
      } finally {
        hookStore.active = false
      }
    }

    let presetsTree = renderPresetsPass()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    presetsTree = renderPresetsPass()

    const secondPreset = listBundledPresets()[1]!
    const secondCard = findAllElements(
      presetsTree,
      (el) => el.props['data-testid'] === `preset-card-${secondPreset.id}`
    )[0]!
    ;(secondCard.props.onClick as () => void)()
    presetsTree = renderPresetsPass()

    const updatedSecondCard = findAllElements(
      presetsTree,
      (el) => el.props['data-testid'] === `preset-card-${secondPreset.id}`
    )[0]!
    expect(String(updatedSecondCard.props.className)).toContain(
      'preset-card-selected'
    )
    expect(
      findAllElements(
        presetsTree,
        (el) => el.props.className === 'preset-card-expanded-desc'
      )
    ).toHaveLength(0)
  })
})
