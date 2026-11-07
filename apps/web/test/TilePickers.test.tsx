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
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      if (!hookStore.active) {
        return actual.useMemo(factory, deps ?? [])
      }
      return factory()
    },
  }
})

import {
  ArtifactSetTilePicker,
  CharacterTilePicker,
  WeaponTilePicker,
} from '../src/components/TilePickers'

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

function renderWithHooks(element: React.ReactElement): VNode[] {
  hookStore.active = true
  hookStore.beginRender()
  try {
    return evaluateTree(element).filter(
      (n): n is VNode => typeof n !== 'string'
    )
  } finally {
    hookStore.active = false
  }
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

function collectText(nodes: Array<VNode | string>): string {
  return nodes
    .map((n) => (typeof n === 'string' ? n : collectText(n.children)))
    .join('')
}

describe('Image-Led Tile Grid Pickers (image-led-pickers)', () => {
  afterEach(() => {
    hookStore.reset()
  })

  it('WeaponTilePicker renders 60px weapon CDN image tiles on rarity backgrounds (not text rows), fires onChange on selection, and falls back to WeaponTypeIcon per tile on error', () => {
    const onChange = vi.fn()
    const options = [
      {
        id: 'SplendorOfTranquilWaters',
        weaponKey: 'SplendorOfTranquilWaters',
        label: 'Splendor of Tranquil Waters',
      },
      {
        id: 'FavoniusSword',
        weaponKey: 'FavoniusSword',
        label: 'Favonius Sword',
        subcaption: 'R5 · Lv.90',
      },
    ]

    const html = renderToStaticMarkup(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="SplendorOfTranquilWaters"
        options={options}
        onChange={onChange}
      />
    )

    // Renders tile buttons with 60x60 CDN images and captions (no <select>/<option> text rows)
    expect(html).not.toContain('<select')
    expect(html).not.toContain('<option')
    expect(html).toContain('data-testid="weapon-tile-picker"')
    expect(html).toContain(
      'data-testid="weapon-picker-tile-SplendorOfTranquilWaters"'
    )
    expect(html).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png"'
    )
    expect(html).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/FavoniusSword.png"'
    )
    expect(html).toContain('width="60" height="60"')
    expect(html).toContain('class="tile-picker-item is-selected"')
    expect(html).toContain('R5 · Lv.90')

    // Interactive VNode test: selection callback + per-tile onError fallback
    hookStore.reset()
    let tree = renderWithHooks(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="SplendorOfTranquilWaters"
        options={options}
        onChange={onChange}
      />
    )

    const favTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'weapon-picker-tile-FavoniusSword'
    )[0]!
    ;(favTile.props.onClick as () => void)()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('FavoniusSword')

    // Trigger onError on the first weapon tile's <img> -> falls back to SwordIcon while the second tile keeps its <img>
    const imgs = findAllElements(tree, (el) => el.type === 'img')
    expect(imgs).toHaveLength(2)
    ;(imgs[0]!.props.onError as () => void)()

    tree = renderWithHooks(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="SplendorOfTranquilWaters"
        options={options}
        onChange={onChange}
      />
    )
    const remainingImgs = findAllElements(tree, (el) => el.type === 'img')
    expect(remainingImgs).toHaveLength(1)
    expect(remainingImgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/FavoniusSword.png'
    )
    const swordFallbacks = findAllElements(
      tree,
      (el) => el.type === 'svg' && el.props['data-gi-icon'] === 'SwordIcon'
    )
    expect(swordFallbacks).toHaveLength(1)
  })

  it('CharacterTilePicker renders 60px character CDN portrait tiles, dims/disables ineligible options, fires onChange, and falls back to initials on error', () => {
    const onChange = vi.fn()
    const options = [
      { key: 'Furina', label: 'Furina' },
      { key: 'KaedeharaKazuha', label: 'Kaedehara Kazuha', disabled: true },
    ]

    hookStore.reset()
    let tree = renderWithHooks(
      <CharacterTilePicker
        ariaLabel="Teammate character"
        value="Furina"
        options={options}
        onChange={onChange}
      />
    )

    const imgs = findAllElements(tree, (el) => el.type === 'img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png'
    )

    const kazuhaTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'character-picker-tile-KaedeharaKazuha'
    )[0]!
    expect(kazuhaTile.props.disabled).toBe(true)
    ;(kazuhaTile.props.onClick as () => void)()
    expect(onChange).not.toHaveBeenCalled()

    const furinaTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'character-picker-tile-Furina'
    )[0]!
    ;(furinaTile.props.onClick as () => void)()
    expect(onChange).toHaveBeenCalledWith('Furina')

    // Trigger onError on Furina tile -> falls back to FU initials
    ;(imgs[0]!.props.onError as () => void)()
    tree = renderWithHooks(
      <CharacterTilePicker
        ariaLabel="Teammate character"
        value="Furina"
        options={options}
        onChange={onChange}
      />
    )
    expect(findAllElements(tree, (el) => el.type === 'img')).toHaveLength(1)
    expect(collectText(tree)).toContain('FU')
  })

  it('ArtifactSetTilePicker renders 56px flower piece CDN icons on 5-star rarity background, fires onChange, and falls back to SetEmblemIcon on error', () => {
    const onChange = vi.fn()
    hookStore.reset()
    let tree = renderWithHooks(
      <ArtifactSetTilePicker
        ariaLabel="Assumed 4-Piece Artifact Set"
        setKeys={['GoldenTroupe', 'ViridescentVenerer']}
        value="ViridescentVenerer"
        allowNone
        onChange={onChange}
      />
    )

    const imgs = findAllElements(tree, (el) => el.type === 'img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png'
    )

    const gtTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'artifact-set-picker-tile-GoldenTroupe'
    )[0]!
    ;(gtTile.props.onClick as () => void)()
    expect(onChange).toHaveBeenCalledWith('GoldenTroupe')

    // Trigger onError -> falls back to SetEmblemIcon
    ;(imgs[0]!.props.onError as () => void)()
    tree = renderWithHooks(
      <ArtifactSetTilePicker
        ariaLabel="Assumed 4-Piece Artifact Set"
        setKeys={['GoldenTroupe', 'ViridescentVenerer']}
        value="ViridescentVenerer"
        allowNone
        onChange={onChange}
      />
    )
    expect(findAllElements(tree, (el) => el.type === 'img')).toHaveLength(1)
    expect(
      findAllElements(
        tree,
        (el) =>
          el.type === 'svg' && el.props['data-gi-icon'] === 'SetEmblemIcon'
      )
    ).toHaveLength(1)
  })
})
