import {
  computeArtifactRollValue,
  getSubstatMaxRoll,
} from '@gi/good'
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
  }
})

import {
  ArtifactBadge,
  ArtifactPieceRow,
  BuildComparisonBars,
  CharacterBadge,
  CLOUDINARY_GENSHIN_BASE_URL,
  ElementBadge,
  getCdnArtifactIconUrl,
  getCdnIconUrl,
  ItemIdentifier,
  RarityStars,
  StatChip,
  WeaponBadge,
} from '../src/components/Identifier'
import {
  BackArrowIcon,
  ElementIcon,
  FunnelIcon,
  GearIcon,
  PlayIcon,
  SlotIcon,
  StatIcon,
  UploadIcon,
} from '../src/components/SvgIcons'

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

describe('Shared Visual Identifier Components (visual-identifiers & cdn-icon-images)', () => {
  afterEach(() => {
    hookStore.reset()
  })

  it('constructs Cloudinary icon URLs from one shared base constant without special-casing missing keys', () => {
    expect(CLOUDINARY_GENSHIN_BASE_URL).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'
    )
    expect(getCdnIconUrl('Furina')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png'
    )
    expect(getCdnIconUrl('SplendorOfTranquilWaters')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png'
    )
    expect(getCdnIconUrl('Somnia')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Somnia.png'
    )
    expect(getCdnIconUrl('TravelerCryo')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/TravelerCryo.png'
    )
    expect(getCdnIconUrl('QuantumCatalyst')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/QuantumCatalyst.png'
    )
    expect(getCdnArtifactIconUrl('GoldenTroupe', 'flower')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png'
    )
    expect(getCdnArtifactIconUrl('MarechausseeHunter', 'goblet')).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/MarechausseeHunter-goblet.png'
    )
  })

  it('renders CharacterBadge with element-colour dark background (elementColor.bg), rarity-coloured solid border, +10% larger size (34px default / 27px compact), and never renders a dashed border in the image state (badge-image-state-style & rarity-border-tiles)', () => {
    const targetHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Furina" role="target" />
    )
    expect(targetHtml).toContain('data-identifier-kind="character"')
    expect(targetHtml).toContain('data-element="hydro"')
    expect(targetHtml).toContain('data-rarity="5"')
    expect(targetHtml).toContain('data-simulated="false"')
    expect(targetHtml).toContain('data-role="target"')
    expect(targetHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png"'
    )
    expect(targetHtml).toContain('width:34px;height:34px;min-width:34px')
    // Hydro element dark background (#142a42) + 5★ rarity gold solid border (#f0be5b)
    expect(targetHtml).toContain('background:#142a42')
    expect(targetHtml).toContain('border:2px solid #f0be5b')
    expect(targetHtml).not.toContain('dashed')
    expect(targetHtml).toContain('border-radius:999px')
    expect(targetHtml).toContain('object-fit:cover')
    expect(targetHtml).toContain('Furina')
    expect(targetHtml).toContain('YOUR CHARACTER · TARGET')

    // 4★ character (Fischl, Electro): Electro dark background (#2b1d42) + 4★ purple solid border (#a375db)
    const fischlHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Fischl" role="owned" />
    )
    expect(fischlHtml).toContain('data-element="electro"')
    expect(fischlHtml).toContain('data-rarity="4"')
    expect(fischlHtml).toContain('background:#2b1d42')
    expect(fischlHtml).toContain('border:2px solid #a375db')
    expect(fischlHtml).not.toContain('dashed')

    const ownedHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Neuvillette" role="owned" />
    )
    expect(ownedHtml).toContain('data-role="owned"')
    expect(ownedHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Neuvillette.png"'
    )
    expect(ownedHtml).toContain('width:34px;height:34px;min-width:34px')
    expect(ownedHtml).toContain('border:2px solid #f0be5b')
    expect(ownedHtml).not.toContain('dashed')
    expect(ownedHtml).toContain('YOUR BUILD')

    const simHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="KaedeharaKazuha" simulated />
    )
    expect(simHtml).toContain('data-simulated="true"')
    expect(simHtml).toContain('data-role="simulated"')
    expect(simHtml).toContain('width:34px;height:34px;min-width:34px')
    expect(simHtml).toContain('background:#15352d')
    expect(simHtml).toContain('border:2px solid #f0be5b')
    expect(simHtml).not.toContain('dashed')
    expect(simHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/KaedeharaKazuha.png"'
    )
    expect(simHtml).toContain('SIM · Fixed Preset Build')

    const simCompactHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Baizhu" simulated compact />
    )
    expect(simCompactHtml).toContain('data-simulated="true"')
    expect(simCompactHtml).toContain('width:27px;height:27px;min-width:27px')
    expect(simCompactHtml).toContain('border:2px solid #f0be5b')
    expect(simCompactHtml).not.toContain('dashed')
    expect(simCompactHtml).toContain('>SIM<')
  })

  it('renders WeaponBadge with Cloudinary CDN image, dark surface background (#151821), rarity border colour, and star rating (rarity-border-tiles)', () => {
    const wepHtml = renderToStaticMarkup(
      <WeaponBadge
        weaponKey="SplendorOfTranquilWaters"
        subtitle="Lv. 90 R1"
      />
    )
    expect(wepHtml).toContain('data-identifier-kind="weapon"')
    expect(wepHtml).toContain('data-weapon-type="sword"')
    expect(wepHtml).toContain('data-rarity="5"')
    expect(wepHtml).toContain('data-testid="weapon-chip"')
    expect(wepHtml).toContain('background:#151821')
    expect(wepHtml).toContain('border:1px solid #f0be5b')
    expect(wepHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png"'
    )
    expect(wepHtml).toContain('Splendor of Tranquil Waters')
    expect(wepHtml).toContain('Lv. 90 R1')
  })

  it('falls back to circle + initials with dashed rarity border and exact base size (30px / 24px compact) on CharacterBadge, and WeaponTypeIcon on WeaponBadge when the CDN image errors (cdn-icon-images, badge-image-state-style & rarity-border-tiles)', () => {
    // 1. CharacterBadge image state vs fallback state on image load failure
    hookStore.reset()
    let charTree = renderWithHooks(
      <CharacterBadge characterKey="Furina" role="target" />
    )
    let avatars = findAllElements(
      charTree,
      (el) =>
        el.type === 'span' && el.props['data-testid'] === 'character-avatar'
    )
    expect(avatars).toHaveLength(1)
    let avatarStyle = avatars[0]!.props.style as Record<string, string>
    expect(avatarStyle.width).toBe('34px')
    expect(avatarStyle.height).toBe('34px')
    expect(avatarStyle.background).toBe('#142a42')
    expect(avatarStyle.border).toBe('2px solid #f0be5b')

    let imgs = findAllElements(charTree, (el) => el.type === 'img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png'
    )

    // Trigger onError -> transitions to fallback state (30px + 2px dashed rarity border + initials)
    ;(imgs[0]!.props.onError as () => void)()
    charTree = renderWithHooks(
      <CharacterBadge characterKey="Furina" role="target" />
    )
    expect(findAllElements(charTree, (el) => el.type === 'img')).toHaveLength(0)
    expect(collectText(charTree)).toContain('FU')
    expect(collectText(charTree)).toContain('Furina')
    avatars = findAllElements(
      charTree,
      (el) =>
        el.type === 'span' && el.props['data-testid'] === 'character-avatar'
    )
    avatarStyle = avatars[0]!.props.style as Record<string, string>
    expect(avatarStyle.width).toBe('30px')
    expect(avatarStyle.height).toBe('30px')
    expect(avatarStyle.background).toBe('#142a42')
    expect(avatarStyle.border).toBe('2px dashed #f0be5b')

    // Switching characterKey (and compact=true) resets to image state (27px + solid rarity border), then falls back to 24px + dashed rarity border on error
    charTree = renderWithHooks(
      <CharacterBadge characterKey="Somnia" role="target" compact />
    )
    avatars = findAllElements(
      charTree,
      (el) =>
        el.type === 'span' && el.props['data-testid'] === 'character-avatar'
    )
    avatarStyle = avatars[0]!.props.style as Record<string, string>
    expect(avatarStyle.width).toBe('27px')
    expect(avatarStyle.border).toBe('2px solid #f0be5b')

    imgs = findAllElements(charTree, (el) => el.type === 'img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Somnia.png'
    )
    ;(imgs[0]!.props.onError as () => void)()
    charTree = renderWithHooks(
      <CharacterBadge characterKey="Somnia" role="target" compact />
    )
    expect(findAllElements(charTree, (el) => el.type === 'img')).toHaveLength(0)
    expect(collectText(charTree)).toContain('SO')
    avatars = findAllElements(
      charTree,
      (el) =>
        el.type === 'span' && el.props['data-testid'] === 'character-avatar'
    )
    avatarStyle = avatars[0]!.props.style as Record<string, string>
    expect(avatarStyle.width).toBe('24px')
    expect(avatarStyle.height).toBe('24px')
    expect(avatarStyle.border).toBe('2px dashed #f0be5b')

    // 2. WeaponBadge fallback on image load failure
    hookStore.reset()
    let wepTree = renderWithHooks(
      <WeaponBadge weaponKey="SplendorOfTranquilWaters" subtitle="R1" />
    )
    let wepImgs = findAllElements(wepTree, (el) => el.type === 'img')
    expect(wepImgs).toHaveLength(1)
    expect(wepImgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/SplendorOfTranquilWaters.png'
    )
    expect(
      findAllElements(
        wepTree,
        (el) => el.type === 'svg' && el.props['data-gi-icon'] === 'SwordIcon'
      )
    ).toHaveLength(0)

    // Trigger onError -> falls back to WeaponTypeIcon (SwordIcon)
    ;(wepImgs[0]!.props.onError as () => void)()
    wepTree = renderWithHooks(
      <WeaponBadge weaponKey="SplendorOfTranquilWaters" subtitle="R1" />
    )
    expect(findAllElements(wepTree, (el) => el.type === 'img')).toHaveLength(0)
    const fallbackIcons = findAllElements(
      wepTree,
      (el) => el.type === 'svg' && el.props['data-gi-icon'] === 'SwordIcon'
    )
    expect(fallbackIcons).toHaveLength(1)
    expect(collectText(wepTree)).toContain('Splendor of Tranquil Waters')

    // Switching weaponKey to QuantumCatalyst attempts CDN load then falls back on error
    wepTree = renderWithHooks(<WeaponBadge weaponKey="QuantumCatalyst" />)
    wepImgs = findAllElements(wepTree, (el) => el.type === 'img')
    expect(wepImgs).toHaveLength(1)
    expect(wepImgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/QuantumCatalyst.png'
    )
  })

  it('renders ArtifactBadge with Cloudinary piece image on dark surface background (#151821) with rarity border when slotKey is present and falls back to SlotIcon on error (cdn-artifact-icons & rarity-border-tiles)', () => {
    const artHtml = renderToStaticMarkup(
      <ArtifactBadge
        setKey="GoldenTroupe"
        slotKey="goblet"
        rarity={5}
        subtitle="+20 Hydro DMG%"
      />
    )
    expect(artHtml).toContain('data-identifier-kind="artifact"')
    expect(artHtml).toContain('data-artifact-set="GoldenTroupe"')
    expect(artHtml).toContain('data-slot="goblet"')
    expect(artHtml).toContain('data-rarity="5"')
    expect(artHtml).toContain('background:#151821')
    expect(artHtml).toContain('border:1px solid #f0be5b')
    expect(artHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-goblet.png"'
    )
    expect(artHtml).toContain('Golden Troupe')
    expect(artHtml).toContain('+20 Hydro DMG%')

    // Verify per-key onError fallback to SlotIcon
    hookStore.reset()
    let artTree = renderWithHooks(
      <ArtifactBadge setKey="GoldenTroupe" slotKey="flower" rarity={5} />
    )
    let artImgs = findAllElements(artTree, (el) => el.type === 'img')
    expect(artImgs).toHaveLength(1)
    expect(artImgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png'
    )
    expect(
      findAllElements(
        artTree,
        (el) => el.type === 'svg' && el.props['data-gi-icon'] === 'FlowerIcon'
      )
    ).toHaveLength(0)

    // Trigger onError -> falls back to today's SlotIcon (FlowerIcon)
    ;(artImgs[0]!.props.onError as () => void)()
    artTree = renderWithHooks(
      <ArtifactBadge setKey="GoldenTroupe" slotKey="flower" rarity={5} />
    )
    expect(findAllElements(artTree, (el) => el.type === 'img')).toHaveLength(0)
    expect(
      findAllElements(
        artTree,
        (el) => el.type === 'svg' && el.props['data-gi-icon'] === 'FlowerIcon'
      )
    ).toHaveLength(1)

    // Changing slotKey or setKey resets error state for the new piece
    artTree = renderWithHooks(
      <ArtifactBadge setKey="GoldenTroupe" slotKey="plume" rarity={5} />
    )
    artImgs = findAllElements(artTree, (el) => el.type === 'img')
    expect(artImgs).toHaveLength(1)
    expect(artImgs[0]!.props.src).toBe(
      'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-plume.png'
    )
  })

  it('dispatches ItemIdentifier across character, weapon, and artifact kinds', () => {
    const c = renderToStaticMarkup(
      <ItemIdentifier kind="character" characterKey="HuTao" role="target" />
    )
    const w = renderToStaticMarkup(
      <ItemIdentifier kind="weapon" weaponKey="StaffOfHoma" />
    )
    const a = renderToStaticMarkup(
      <ItemIdentifier
        kind="artifact"
        setKey="CrimsonWitchOfFlames"
        slotKey="flower"
      />
    )
    expect(c).toContain('Hu Tao')
    expect(w).toContain('Staff of Homa')
    expect(a).toContain('Crimson Witch of Flames')
  })

  it('keeps CharacterBadge completely exempt from rarity recolouring and SVG glyphs while rendering GO svgicons, StatChips, RarityStars, and BuildComparisonBars (visual-language-pass)', () => {
    const charHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Furina" role="target" />
    )
    expect(charHtml).not.toContain('<svg')
    expect(charHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/Furina.png"'
    )

    const wepHtml = renderToStaticMarkup(
      <WeaponBadge weaponKey="FavoniusSword" subtitle="R5" />
    )
    expect(wepHtml).toContain('★★★★☆')
    expect(wepHtml).not.toMatch(/4-star|5-star/i)
    expect(wepHtml).toContain('data-testid="rarity-stars"')

    const starsHtml = renderToStaticMarkup(<RarityStars rarity={3} />)
    expect(starsHtml).toContain('★★★☆☆')

    const critChipHtml = renderToStaticMarkup(
      <StatChip statKey="critRate_" value={3.9} compact />
    )
    expect(critChipHtml).toContain('data-gi-icon="CritRateIcon"')
    expect(critChipHtml).toContain('>3.9%<')
    expect(critChipHtml).not.toContain('>CRIT Rate 3.9%<')

    const fallbackChipHtml = renderToStaticMarkup(
      <StatChip statKey="avgHit" value="Avg" compact />
    )
    expect(fallbackChipHtml).toContain('Avg')

    const rowHtml = renderToStaticMarkup(
      <ArtifactPieceRow
        setKey="GoldenTroupe"
        slotKey="flower"
        rarity={5}
        level={20}
        mainStatKey="hp"
        substats={[
          { key: 'critRate_', value: 3.9 },
          { key: 'critDMG_', value: 14.0 },
        ]}
        location="Furina"
        compact
      />
    )
    expect(rowHtml).toContain(
      'src="https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin/GoldenTroupe-flower.png"'
    )
    expect(rowHtml).toContain('data-testid="artifact-slot-strip"')
    expect(rowHtml).toContain('data-testid="artifact-set-chip"')
    expect(rowHtml).toContain('Golden Troupe')
    expect(rowHtml).toContain('data-gi-icon="CritRateIcon"')
    expect(rowHtml).toContain('data-gi-icon="CritDmgIcon"')

    const barsHtml = renderToStaticMarkup(
      <BuildComparisonBars
        currentTotal={500_000}
        optimisedTotal={1_000_000}
        rank={1}
      />
    )
    expect(barsHtml).toContain('data-testid="build-comparison-bars"')
    expect(barsHtml).toContain('width:50.0%')
    expect(barsHtml).toContain('width:100.0%')
    expect(barsHtml).toContain('500,000')
    expect(barsHtml).toContain('1,000,000')
    expect(barsHtml).toContain('+500,000 (+100.00%)')

    const iconsHtml = renderToStaticMarkup(
      <div>
        <SlotIcon slotKey="goblet" />
        <ElementIcon ele="hydro" />
        <StatIcon statKey="enerRech_" />
        <ElementBadge element="pyro" label="Pyro" />
        <UploadIcon />
        <PlayIcon />
        <FunnelIcon />
        <GearIcon />
        <BackArrowIcon />
      </div>
    )
    expect(iconsHtml).toContain('data-gi-icon="GobletIcon"')
    expect(iconsHtml).toContain('data-gi-icon="HydroIcon"')
    expect(iconsHtml).toContain('data-gi-icon="EnerRechIcon"')
    expect(iconsHtml).toContain('data-gi-icon="PyroIcon"')
    expect(iconsHtml).toContain('data-gi-icon="UploadIcon"')
    expect(iconsHtml).toContain('data-gi-icon="PlayIcon"')
    expect(iconsHtml).toContain('data-gi-icon="FunnelIcon"')
    expect(iconsHtml).toContain('data-gi-icon="GearIcon"')
    expect(iconsHtml).toContain('data-gi-icon="BackArrowIcon"')
    expect(iconsHtml).not.toContain('<img')
  })

  it('computes GO-aligned Roll Value (RV) from vendored roll tables and renders ArtifactRvBadge + per-substat roll breakdown details in ArtifactPieceRow (artifact-quality-tooling)', () => {
    expect(getSubstatMaxRoll('critRate_', 5)).toBe(3.89)
    expect(getSubstatMaxRoll('critDMG_', 5)).toBe(7.77)
    expect(getSubstatMaxRoll('hp_', 5)).toBe(5.83)
    expect(getSubstatMaxRoll('enerRech_', 5)).toBe(6.48)

    // 1 max roll of CR (3.9 -> 3.89) + 2 max rolls of CD (15.5 -> 7.77 + 7.77 = 15.54) = 300% RV
    const rvResult = computeArtifactRollValue({
      rarity: 5,
      level: 20,
      substats: [
        { key: 'critRate_', value: 3.9 },
        { key: 'critDMG_', value: 15.5 },
        { key: 'hp_', value: 5.8 },
        { key: 'enerRech_', value: 6.5 },
      ],
    })
    expect(rvResult.substats).toHaveLength(4)
    expect(rvResult.substats[0]!.rollCount).toBe(1)
    expect(rvResult.substats[0]!.rolls).toEqual([3.89])
    expect(rvResult.substats[0]!.rv).toBeCloseTo(100, 2)
    expect(rvResult.substats[1]!.rollCount).toBe(2)
    expect(rvResult.substats[1]!.rolls).toEqual([7.77, 7.77])
    expect(rvResult.substats[1]!.rv).toBeCloseTo(200, 2)
    expect(rvResult.totalRolls).toBe(5)
    expect(rvResult.totalRvRounded).toBe(500)

    const pieceHtml = renderToStaticMarkup(
      <ArtifactPieceRow
        setKey="GoldenTroupe"
        slotKey="flower"
        rarity={5}
        level={20}
        mainStatKey="hp"
        substats={[
          { key: 'critRate_', value: 3.9 },
          { key: 'critDMG_', value: 15.5 },
          { key: 'hp_', value: 5.8 },
          { key: 'enerRech_', value: 6.5 },
        ]}
        location="Furina"
        compact
      />
    )
    expect(pieceHtml).toContain('data-testid="artifact-rv-badge"')
    expect(pieceHtml).toContain('data-rv="500.0"')
    expect(pieceHtml).toContain('data-rv-rounded="500"')
    expect(pieceHtml).toContain('data-total-rolls="5"')
    expect(pieceHtml).toContain('>500% RV<')
    // Per-substat roll breakdown in tooltip & data attributes
    expect(pieceHtml).toContain('data-roll-count="2"')
    expect(pieceHtml).toContain('data-substat-rv="200.0"')
    expect(pieceHtml).toContain('data-max-roll="7.77"')
    expect(pieceHtml).toContain(
      'CD% 15.5%: 2 rolls (7.77 + 7.77 / max 7.77%) = 200% RV'
    )
    expect(pieceHtml).toContain('class="artifact-piece-card"')
    expect(pieceHtml).toContain('class="artifact-piece-slot-icon"')
    expect(pieceHtml).toContain('class="artifact-substat-line"')
    expect(pieceHtml).toContain(
      'data-testid="artifact-piece-owner" title="Equipped on Furina in imported GOOD data"'
    )
    // Substats are compact icon+value items inside .artifact-piece-substats, not .gi-stat-chip pills
    const substatsSection = pieceHtml.split('class="artifact-piece-substats"')[1] ?? ''
    expect(substatsSection).not.toContain('gi-stat-chip')
  })
})
