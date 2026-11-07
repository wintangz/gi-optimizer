import {
  ALL_ARTIFACT_SET_KEYS,
  DEFAULT_OPTIMIZER_SETTINGS,
  type OptimizerSettings,
} from '@gi/presets'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

let hookActive = false
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState<T>(initial: T | (() => T)) {
      if (!hookActive) return actual.useState(initial)
      const val =
        typeof initial === 'function' ? (initial as () => T)() : initial
      return [val, () => {}] as const
    },
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      if (!hookActive) return actual.useMemo(factory, deps ?? [])
      return factory()
    },
  }
})

import { ArtifactSetFilter } from '../src/components/ArtifactSetFilter'

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

describe('ArtifactSetFilter Component (artifact-set-filter, image-led-pickers & rarity-border-tiles)', () => {
  it('renders mode switcher, search, bulk actions, image-led flower-icon tile grid on dark surface (#151821) with rarity borders, and summary line in "all" mode', () => {
    const html = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={DEFAULT_OPTIMIZER_SETTINGS}
        onChange={() => {}}
      />
    )
    expect(html).toContain('data-testid="artifact-set-filter-panel"')
    expect(html).toContain('class="opt-filter-panel"')
    expect(html).toContain('class="opt-filter-panel-header"')
    expect(html).toContain('class="opt-filter-panel-subbar"')
    expect(html).toContain('class="tile-picker-toolbar"')
    expect(html).toContain('data-testid="artifact-set-filter-summary"')
    expect(html).toContain(
      `All ${ALL_ARTIFACT_SET_KEYS.length} artifact sets allowed`
    )
    expect(html).toContain('>All sets<')
    expect(html).toContain('>Exclude selected<')
    expect(html).toContain('>Only these sets<')
    expect(html).toContain('aria-label="Search artifact sets"')
    expect(html).toContain('>Select all<')
    expect(html).toContain('>Clear<')
    expect(html).toContain('>Invert<')
    expect(html).toContain('aria-label="Artifact sets"')
    expect(html).toContain('class="tile-picker-grid"')
    expect(html).toContain('background:#151821')
    expect(html).toContain('border:2px solid #f0be5b')
    expect(html).not.toContain('data-testid="tile-selected-check"')
    expect(html).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png"'
    )
    // naming-consistency: full display name in captions (not truncated 2-word short name)
    expect(html).toContain(
      '<span class="tile-picker-caption">Crimson Witch of Flames</span>'
    )
    expect(html).toContain(
      '<span class="tile-picker-caption">Emblem of Severed Fate</span>'
    )
    expect(html).not.toContain('type="checkbox"')
  })

  it('renders checked sets with non-colour selection (3px rarity border + check marker) and 2pc/4pc/Both piece-count controls in "exclude" mode', () => {
    const html = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'exclude',
          setFilterSelection: {
            GoldenTroupe: [2, 4],
            MarechausseeHunter: [4],
          },
        }}
        onChange={() => {}}
      />
    )
    expect(html).toContain(
      `${ALL_ARTIFACT_SET_KEYS.length - 1} of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed (2 excluded)`
    )
    expect(html).toContain('border:3px solid #f0be5b')
    expect(html).toContain('data-testid="tile-selected-check"')
    expect(html).toContain('aria-label="Golden Troupe piece count"')
    expect(html).toContain('aria-label="Marechaussee Hunter piece count"')
    expect(html).toContain('>Both<')
    expect(html).toContain('>2pc<')
    expect(html).toContain('>4pc<')
  })

  it('renders allowed count summary in "include" mode for 0 and 3 sets', () => {
    const emptyIncludeHtml = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'include',
          setFilterSelection: {},
        }}
        onChange={() => {}}
      />
    )
    expect(emptyIncludeHtml).toContain(
      `Only 0 of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed`
    )

    const threeIncludeHtml = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'include',
          setFilterSelection: {
            GoldenTroupe: [2, 4],
            MarechausseeHunter: [4],
            EmblemOfSeveredFate: [2, 4],
          },
        }}
        onChange={() => {}}
      />
    )
    expect(threeIncludeHtml).toContain(
      `Only 3 of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed`
    )
  })

  it('set-filter-click-semantics: clicking a set tile or changing piece count in "all" mode never flips setFilterMode to "exclude", and summary plainly states the selection behavior', () => {
    let currentSettings: OptimizerSettings = {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      setFilterMode: 'all',
      setFilterSelection: {},
    }

    const renderFilter = () => {
      hookActive = true
      try {
        return evaluateTree(
          <ArtifactSetFilter
            settings={currentSettings}
            onChange={(next) => {
              currentSettings = next
            }}
          />
        )
      } finally {
        hookActive = false
      }
    }

    let tree = renderFilter()

    // Click GoldenTroupe tile while mode is 'all'
    const gtTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'artifact-set-tile-GoldenTroupe'
    )[0]!
    ;(gtTile.props.onClick as () => void)()

    // Mode MUST remain 'all' (never silently flipped to 'exclude')
    expect(currentSettings.setFilterMode).toBe('all')
    expect(currentSettings.setFilterSelection).toEqual({
      GoldenTroupe: [2, 4],
    })
    expect(currentSettings.setExclusion).toEqual({})

    // Re-render and change piece count to 4pc while mode is still 'all'
    tree = renderFilter()
    const summaryEl = findAllElements(
      tree,
      (el) => el.props['data-testid'] === 'artifact-set-filter-summary'
    )[0]!
    expect(collectText(summaryEl.children)).toBe(
      `All ${ALL_ARTIFACT_SET_KEYS.length} artifact sets allowed (1 selected — choose Exclude selected or Only these sets to apply)`
    )

    const pieceGroup = findAllElements(
      tree,
      (el) =>
        el.type === 'div' &&
        el.props['aria-label'] === 'Golden Troupe piece count'
    )[0]!
    const fourPcBtn = findAllElements(
      pieceGroup.children,
      (el) => el.type === 'button' && collectText(el.children) === '4pc'
    )[0]!
    ;(fourPcBtn.props.onClick as () => void)()

    expect(currentSettings.setFilterMode).toBe('all')
    expect(currentSettings.setFilterSelection).toEqual({
      GoldenTroupe: [4],
    })

    // Mode only changes when clicking the explicit mode button (e.g. "Only these sets")
    tree = renderFilter()
    const includeModeBtn = findAllElements(
      tree,
      (el) =>
        el.type === 'button' && collectText(el.children) === 'Only these sets'
    )[0]!
    ;(includeModeBtn.props.onClick as () => void)()
    expect(currentSettings.setFilterMode).toBe('include')
    expect(currentSettings.setFilterSelection).toEqual({
      GoldenTroupe: [4],
    })
  })
})
