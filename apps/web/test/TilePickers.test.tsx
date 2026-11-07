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

import { getBundledPreset, listBundledPresets } from '@gi/presets'
import {
  ArtifactSetTilePicker,
  CharacterTilePicker,
  PresetTilePicker,
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

describe('Image-Led Tile Grid Pickers & Rarity Borders (image-led-pickers & rarity-border-tiles)', () => {
  afterEach(() => {
    hookStore.reset()
  })

  it('WeaponTilePicker renders 60px weapon CDN image tiles on dark surface background (#151821) with rarity borders, non-colour selection (3px border + check marker), fires onChange, and falls back to WeaponTypeIcon per tile on error', () => {
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
    expect(html).toContain('data-testid="tile-selected-check"')
    // Dark surface background (#151821) + 5★ gold border (3px on selected) and 4★ purple border (2px on unselected)
    expect(html).toContain('background:#151821')
    expect(html).toContain('border:3px solid #f0be5b')
    expect(html).toContain('border:2px solid #a375db')
    expect(html).toContain('R5 · Lv.90')

    // Interactive VNode test: selection callback + non-colour check marker + per-tile onError fallback
    hookStore.reset()
    let tree = renderWithHooks(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="SplendorOfTranquilWaters"
        options={options}
        onChange={onChange}
      />
    )

    const splendorTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] ===
          'weapon-picker-tile-SplendorOfTranquilWaters'
    )[0]!
    const favTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'weapon-picker-tile-FavoniusSword'
    )[0]!

    // Selected tile has check marker + 3px rarity border; unselected tile has no check marker + 2px rarity border
    expect(
      findAllElements(
        [splendorTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(1)
    expect(
      findAllElements(
        [favTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(0)

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

  it('CharacterTilePicker renders 60px character CDN portrait tiles on dark element background (elementColor.bg) with rarity borders, distinct non-colour selection, dims/disables ineligible options, fires onChange, and falls back to dashed rarity border + initials on error', () => {
    const onChange = vi.fn()
    const options = [
      { key: 'Furina', label: 'Furina' },
      { key: 'Fischl', label: 'Fischl' },
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
    expect(imgs).toHaveLength(3)
    expect(imgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png'
    )

    const furinaTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'character-picker-tile-Furina'
    )[0]!
    const fischlTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'character-picker-tile-Fischl'
    )[0]!
    const kazuhaTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] === 'character-picker-tile-KaedeharaKazuha'
    )[0]!

    // Furina (5★ Hydro, selected): background #142a42, border 3px solid #f0be5b, check marker present
    const furinaFrame = findAllElements(
      [furinaTile],
      (el) => el.type === 'span' && el.props.className === 'tile-picker-frame'
    )[0]!
    const furinaStyle = furinaFrame.props.style as Record<string, string>
    expect(furinaStyle.background).toBe('#142a42')
    expect(furinaStyle.border).toBe('3px solid #f0be5b')
    expect(
      findAllElements(
        [furinaTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(1)

    // Fischl (4★ Electro, unselected): background #2b1d42, border 2px solid #a375db, no check marker
    const fischlFrame = findAllElements(
      [fischlTile],
      (el) => el.type === 'span' && el.props.className === 'tile-picker-frame'
    )[0]!
    const fischlStyle = fischlFrame.props.style as Record<string, string>
    expect(fischlStyle.background).toBe('#2b1d42')
    expect(fischlStyle.border).toBe('2px solid #a375db')
    expect(
      findAllElements(
        [fischlTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(0)

    expect(kazuhaTile.props.disabled).toBe(true)
    ;(kazuhaTile.props.onClick as () => void)()
    expect(onChange).not.toHaveBeenCalled()

    ;(furinaTile.props.onClick as () => void)()
    expect(onChange).toHaveBeenCalledWith('Furina')

    // Trigger onError on Furina tile -> falls back to FU initials with dashed 5★ rarity border
    ;(imgs[0]!.props.onError as () => void)()
    tree = renderWithHooks(
      <CharacterTilePicker
        ariaLabel="Teammate character"
        value="Furina"
        options={options}
        onChange={onChange}
      />
    )
    expect(findAllElements(tree, (el) => el.type === 'img')).toHaveLength(2)
    expect(collectText(tree)).toContain('FU')
    const furinaFallbackFrame = findAllElements(
      tree,
      (el) =>
        el.type === 'span' &&
        el.props.className === 'tile-picker-frame' &&
        collectText([el]) === 'FU'
    )[0]!
    const fallbackStyle = furinaFallbackFrame.props.style as Record<
      string,
      string
    >
    expect(fallbackStyle.background).toBe('#142a42')
    expect(fallbackStyle.border).toBe('3px dashed #f0be5b')
  })

  it('ArtifactSetTilePicker renders 56px flower piece CDN icons on dark surface background (#151821) with 5-star rarity border, distinct selection check marker, fires onChange, and falls back to SetEmblemIcon on error', () => {
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
    const vvTile = findAllElements(
      tree,
      (el) =>
        el.type === 'button' &&
        el.props['data-testid'] ===
          'artifact-set-picker-tile-ViridescentVenerer'
    )[0]!

    // Unselected GoldenTroupe: dark background (#151821) + 2px solid #f0be5b, no check marker
    const gtFrame = findAllElements(
      [gtTile],
      (el) => el.type === 'span' && el.props.className === 'tile-picker-frame'
    )[0]!
    expect((gtFrame.props.style as Record<string, string>).background).toBe(
      '#151821'
    )
    expect((gtFrame.props.style as Record<string, string>).border).toBe(
      '2px solid #f0be5b'
    )
    expect(
      findAllElements(
        [gtTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(0)

    // Selected ViridescentVenerer: dark background (#151821) + 3px solid #f0be5b + check marker
    const vvFrame = findAllElements(
      [vvTile],
      (el) => el.type === 'span' && el.props.className === 'tile-picker-frame'
    )[0]!
    expect((vvFrame.props.style as Record<string, string>).background).toBe(
      '#151821'
    )
    expect((vvFrame.props.style as Record<string, string>).border).toBe(
      '3px solid #f0be5b'
    )
    expect(
      findAllElements(
        [vvTile],
        (el) => el.props['data-testid'] === 'tile-selected-check'
      )
    ).toHaveLength(1)

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

    // naming-consistency: ArtifactSetTilePicker captions use full display name (e.g. "Crimson Witch of Flames", not "Crimson Witch")
    const cwHtml = renderToStaticMarkup(
      <ArtifactSetTilePicker
        ariaLabel="Artifact Set"
        setKeys={['CrimsonWitchOfFlames', 'EmblemOfSeveredFate']}
        value="CrimsonWitchOfFlames"
        onChange={onChange}
      />
    )
    expect(cwHtml).toContain(
      '<span class="tile-picker-caption">Crimson Witch of Flames</span>'
    )
    expect(cwHtml).toContain(
      '<span class="tile-picker-caption">Emblem of Severed Fate</span>'
    )
  })

  it('PresetTilePicker renders the preset-kind indicator (AKASHA/OFFICIAL) as a styled .tile-picker-kind-badge pill rather than a plain .tile-picker-subcaption (naming-consistency)', () => {
    const officialPreset = getBundledPreset('official/furina-salon-subdps')!
    const akashaPreset = listBundledPresets().find(
      (p) => p.source === 'akasha'
    )!
    const html = renderToStaticMarkup(
      <PresetTilePicker
        ariaLabel="Preset"
        presets={[officialPreset, akashaPreset]}
        value={officialPreset.id}
        onChange={() => {}}
      />
    )
    expect(html).toContain(
      `class="tile-picker-kind-badge is-official" data-testid="preset-picker-badge-${officialPreset.id}" data-badge-kind="official"`
    )
    expect(html).toContain('>OFFICIAL<')
    expect(html).toContain(
      `class="tile-picker-kind-badge is-akasha" data-testid="preset-picker-badge-${akashaPreset.id}" data-badge-kind="akasha"`
    )
    expect(html).toContain('>AKASHA<')
    expect(html).not.toContain('class="tile-picker-subcaption"')
  })

  it('WeaponTilePicker, CharacterTilePicker, and ArtifactSetTilePicker show a zero-match empty message when search matches nothing (responsive-and-small-fixes)', () => {
    // 1. WeaponTilePicker zero-match search
    hookStore.reset()
    let wepTree = renderWithHooks(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="FavoniusSword"
        searchable
        options={[
          {
            id: 'FavoniusSword',
            weaponKey: 'FavoniusSword',
            label: 'Favonius Sword',
          },
        ]}
        onChange={() => {}}
      />
    )
    const wepSearchInput = findAllElements(
      wepTree,
      (el) => el.type === 'input' && el.props.className === 'tile-picker-search'
    )[0]!
    ;(wepSearchInput.props.onChange as (e: { target: { value: string } }) => void)({
      target: { value: 'zzzz-no-match' },
    })
    wepTree = renderWithHooks(
      <WeaponTilePicker
        ariaLabel="Simulated Weapon"
        value="FavoniusSword"
        searchable
        options={[
          {
            id: 'FavoniusSword',
            weaponKey: 'FavoniusSword',
            label: 'Favonius Sword',
          },
        ]}
        onChange={() => {}}
      />
    )
    const wepEmpty = findAllElements(
      wepTree,
      (el) => el.props['data-testid'] === 'weapon-picker-empty'
    )
    expect(wepEmpty).toHaveLength(1)
    expect(collectText(wepEmpty)).toContain('No weapons match “zzzz-no-match”.')

    // 2. CharacterTilePicker zero-match search
    hookStore.reset()
    let charTree = renderWithHooks(
      <CharacterTilePicker
        ariaLabel="Teammate character"
        value="Furina"
        searchable
        options={[{ key: 'Furina', label: 'Furina' }]}
        onChange={() => {}}
      />
    )
    const charSearchInput = findAllElements(
      charTree,
      (el) => el.type === 'input' && el.props.className === 'tile-picker-search'
    )[0]!
    ;(charSearchInput.props.onChange as (e: { target: { value: string } }) => void)({
      target: { value: 'zzzz-no-match' },
    })
    charTree = renderWithHooks(
      <CharacterTilePicker
        ariaLabel="Teammate character"
        value="Furina"
        searchable
        options={[{ key: 'Furina', label: 'Furina' }]}
        onChange={() => {}}
      />
    )
    const charEmpty = findAllElements(
      charTree,
      (el) => el.props['data-testid'] === 'character-picker-empty'
    )
    expect(charEmpty).toHaveLength(1)
    expect(collectText(charEmpty)).toContain('No characters match “zzzz-no-match”.')

    // 3. ArtifactSetTilePicker zero-match search
    hookStore.reset()
    let setTree = renderWithHooks(
      <ArtifactSetTilePicker
        ariaLabel="Artifact Set"
        setKeys={['GoldenTroupe']}
        value="GoldenTroupe"
        allowNone
        searchable
        onChange={() => {}}
      />
    )
    const setSearchInput = findAllElements(
      setTree,
      (el) => el.type === 'input' && el.props.className === 'tile-picker-search'
    )[0]!
    ;(setSearchInput.props.onChange as (e: { target: { value: string } }) => void)({
      target: { value: 'zzzz-no-match' },
    })
    setTree = renderWithHooks(
      <ArtifactSetTilePicker
        ariaLabel="Artifact Set"
        setKeys={['GoldenTroupe']}
        value="GoldenTroupe"
        allowNone
        searchable
        onChange={() => {}}
      />
    )
    const setEmpty = findAllElements(
      setTree,
      (el) => el.props['data-testid'] === 'artifact-set-picker-empty'
    )
    expect(setEmpty).toHaveLength(1)
    expect(collectText(setEmpty)).toContain('No artifact sets match “zzzz-no-match”.')
  })
})
