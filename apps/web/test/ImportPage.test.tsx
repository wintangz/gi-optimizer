import type { IGOOD } from '@gi/good'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hookStore = {
  active: false,
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  stateIdx: 0,
  refIdx: 0,
  reset() {
    this.states = []
    this.refs = []
    this.stateIdx = 0
    this.refIdx = 0
  },
  beginRender() {
    this.stateIdx = 0
    this.refIdx = 0
  },
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState<T>(initial: T | (() => T)) {
      if (!hookStore.active) return actual.useState(initial)
      const idx = hookStore.stateIdx++
      if (idx >= hookStore.states.length) {
        hookStore.states.push(
          typeof initial === 'function' ? (initial as () => T)() : initial
        )
      }
      const setState = (next: T | ((prev: T) => T)) => {
        const prevVal = hookStore.states[idx] as T
        hookStore.states[idx] =
          typeof next === 'function' ? (next as (prev: T) => T)(prevVal) : next
      }
      return [hookStore.states[idx] as T, setState] as const
    },
    useRef<T>(initial: T) {
      if (!hookStore.active) return actual.useRef(initial)
      const idx = hookStore.refIdx++
      if (idx >= hookStore.refs.length) {
        hookStore.refs.push({ current: initial })
      }
      return hookStore.refs[idx] as { current: T }
    },
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      if (!hookStore.active) return actual.useMemo(factory, deps ?? [])
      return factory()
    },
  }
})

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => React.createElement('a', { href }, children),
}))

let mockRecord: {
  good: IGOOD
  importedAt: string
  fileName?: string
  source: string
} | null = null
const mockSave = vi.fn()
const mockClear = vi.fn()

vi.mock('@/lib/storage/useGood', () => ({
  useGoodStorage: () => ({
    record: mockRecord,
    loading: false,
    save: mockSave,
    clear: mockClear,
  }),
}))

import ImportPage from '../src/app/import/page'

interface VNode {
  type: string
  props: Record<string, unknown>
  children: Array<VNode | string>
}

function evaluateTree(node: unknown): Array<VNode | string> {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap((c) => evaluateTree(c))
  if (typeof node === 'object' && 'type' in (node as Record<string, unknown>)) {
    const el = node as { type: unknown; props?: Record<string, unknown> }
    const props = el.props ?? {}
    if (typeof el.type === 'function') {
      return evaluateTree(
        (el.type as (p: Record<string, unknown>) => unknown)(props)
      )
    }
    if (typeof el.type === 'string') {
      return [{ type: el.type, props, children: evaluateTree(props.children) }]
    }
    return evaluateTree(props.children)
  }
  return []
}

function renderPass(): VNode[] {
  hookStore.active = true
  hookStore.beginRender()
  try {
    return evaluateTree(React.createElement(ImportPage)).filter(
      (n): n is VNode => typeof n !== 'string'
    )
  } finally {
    hookStore.active = false
  }
}

function findAllElements(
  nodes: Array<VNode | string>,
  pred: (el: VNode) => boolean
): VNode[] {
  const out: VNode[] = []
  for (const n of nodes) {
    if (typeof n !== 'string') {
      if (pred(n)) out.push(n)
      out.push(...findAllElements(n.children, pred))
    }
  }
  return out
}

function collectText(nodes: Array<VNode | string>): string {
  return nodes
    .map((n) => (typeof n === 'string' ? n : collectText(n.children)))
    .join('')
}

describe('ImportPage (import-table-honesty)', () => {
  beforeEach(() => {
    hookStore.reset()
    mockSave.mockReset()
    mockClear.mockReset()
  })

  afterEach(() => {
    hookStore.reset()
  })

  it('import-table-honesty: states truncation explicitly when filtered rows exceed 300 and matches rendered tbody row count across characters, weapons, and artifacts', () => {
    const largeArtifacts = Array.from({ length: 350 }, (_, i) => ({
      id: `art_${i}`,
      setKey: i < 50 ? 'MarechausseeHunter' : 'GoldenTroupe',
      slotKey: 'flower' as const,
      level: 20,
      rarity: 5 as const,
      mainStatKey: 'hp',
      location: '',
      lock: false,
      substats: [{ key: 'critRate_', value: 3.9 }],
    }))
    const largeWeapons = Array.from({ length: 320 }, (_, i) => ({
      id: `wep_${i}`,
      key: 'FavoniusSword',
      level: 90,
      ascension: 6,
      refinement: 5,
      location: '',
      lock: false,
    }))

    mockRecord = {
      importedAt: '2026-11-08T00:00:00.000Z',
      fileName: 'large.json',
      source: 'Irminsul',
      good: {
        format: 'GOOD',
        version: 3,
        source: 'Irminsul',
        characters: [
          {
            key: 'Furina',
            level: 90,
            constellation: 0,
            ascension: 6,
            talent: { auto: 1, skill: 10, burst: 10 },
          },
        ],
        weapons: largeWeapons,
        artifacts: largeArtifacts,
      },
    }

    // 1. Characters tab (1 of 1, not truncated)
    let tree = renderPass()
    const charCountEl = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-characters-count'
    )[0]!
    expect(collectText(charCountEl.children)).toBe('Showing 1 of 1')
    expect(charCountEl.props['data-truncated']).toBe('false')

    // 2. Switch to Weapons tab (320 weapons -> truncated to first 300)
    const weaponsTabBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props.role === 'tab' &&
        collectText(el.children).includes('Weapons (320)')
    )[0]!
    ;(weaponsTabBtn.props.onClick as () => void)()
    tree = renderPass()

    const wepCountEl = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-weapons-count'
    )[0]!
    expect(collectText(wepCountEl.children)).toBe(
      'Showing first 300 of 320 — refine the filter to see more'
    )
    expect(wepCountEl.props['data-shown-count']).toBe(300)
    const wepTable = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-weapons-table'
    )[0]!
    const wepTbody = findAllElements(
      wepTable.children,
      (el) => el.type === 'tbody'
    )[0]!
    expect(
      findAllElements(wepTbody.children, (el) => el.type === 'tr')
    ).toHaveLength(300)

    // 3. Switch to Artifacts tab (350 artifacts -> truncated to first 300)
    const artifactsTabBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props.role === 'tab' &&
        collectText(el.children).includes('Artifacts (350)')
    )[0]!
    ;(artifactsTabBtn.props.onClick as () => void)()
    tree = renderPass()

    const artCountEl = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-artifacts-count'
    )[0]!
    expect(collectText(artCountEl.children)).toBe(
      'Showing first 300 of 350 — refine the filter to see more'
    )
    expect(artCountEl.props['data-shown-count']).toBe(300)
    const artTable = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-artifacts-table'
    )[0]!
    const artTbody = findAllElements(
      artTable.children,
      (el) => el.type === 'tbody'
    )[0]!
    expect(
      findAllElements(artTbody.children, (el) => el.type === 'tr')
    ).toHaveLength(300)

    // 4. Filter artifacts by MarechausseeHunter (50 artifacts -> not truncated)
    const setFilterSelect = findAllElements(
      tree,
      (el) =>
        el.type === 'select' &&
        el.props['aria-label'] === 'Filter artifacts by set'
    )[0]!
    ;(
      setFilterSelect.props.onChange as (e: {
        target: { value: string }
      }) => void
    )({ target: { value: 'MarechausseeHunter' } })
    tree = renderPass()

    const narrowedCountEl = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'import-artifacts-count'
    )[0]!
    expect(collectText(narrowedCountEl.children)).toBe('Showing 50 of 350')
    expect(narrowedCountEl.props['data-truncated']).toBe('false')
  })

  it('import-file-repick: resets the file input value after each pick so selecting the same filename again triggers onChange and imports updated data', async () => {
    mockRecord = null
    mockSave.mockResolvedValue(undefined)

    // Stub FileReader for Node test environment
    let nextFileText = ''
    const OriginalFileReader = globalThis.FileReader
    class MockFileReader {
      result: string | null = null
      onload: (() => void) | null = null
      readAsText() {
        this.result = nextFileText
        if (this.onload) this.onload()
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader

    try {
      const tree = renderPass()
      const fileInput = findAllElements(
        tree,
        (el) => el.type === 'input' && el.props.type === 'file'
      )[0]!
      expect(fileInput).toBeDefined()

      const fakeInputTarget = {
        value: 'C:\\fakepath\\good_export.json',
        files: [{ name: 'good_export.json' }],
      }

      // First pick of good_export.json
      nextFileText = JSON.stringify({
        format: 'GOOD',
        version: 3,
        source: 'Irminsul',
        characters: [
          {
            key: 'Furina',
            level: 90,
            constellation: 0,
            ascension: 6,
            talent: { auto: 1, skill: 10, burst: 10 },
          },
        ],
        weapons: [],
        artifacts: [],
      })
      ;(fileInput.props.onChange as (e: { target: typeof fakeInputTarget }) => void)({
        target: fakeInputTarget,
      })

      // Input value must be reset to '' immediately so picking the same file again fires change
      expect(fakeInputTarget.value).toBe('')
      await vi.waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
      expect(mockSave.mock.calls[0]![0].fileName).toBe('good_export.json')
      expect(mockSave.mock.calls[0]![0].good.characters[0].constellation).toBe(0)

      // User edits good_export.json on disk (e.g. Furina C2) and picks the SAME file path again
      fakeInputTarget.value = 'C:\\fakepath\\good_export.json'
      nextFileText = JSON.stringify({
        format: 'GOOD',
        version: 3,
        source: 'Irminsul',
        characters: [
          {
            key: 'Furina',
            level: 90,
            constellation: 2,
            ascension: 6,
            talent: { auto: 1, skill: 10, burst: 10 },
          },
        ],
        weapons: [],
        artifacts: [],
      })
      ;(fileInput.props.onChange as (e: { target: typeof fakeInputTarget }) => void)({
        target: fakeInputTarget,
      })

      expect(fakeInputTarget.value).toBe('')
      await vi.waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
      expect(mockSave.mock.calls[1]![0].good.characters[0].constellation).toBe(2)
    } finally {
      globalThis.FileReader = OriginalFileReader
    }
  })
})
