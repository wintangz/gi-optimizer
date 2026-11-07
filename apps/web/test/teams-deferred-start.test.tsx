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

    // Rotation target <select> preserves the current path via the fallback <option>
    const fallbackOptions = findAllElements(
      tree,
      (el) => el.type === 'option' && el.props.value === 'skill.usherDmg'
    )
    expect(fallbackOptions).toHaveLength(1)
    expect(collectText(fallbackOptions[0]!.children)).toBe(
      'Normal 1 (skill.usherDmg)'
    )
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
    expect(finalText).toContain('Gentilhomme Usher DMG (skill.usherDmg)')
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
})
