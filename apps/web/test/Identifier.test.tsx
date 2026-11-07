import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ArtifactBadge,
  ArtifactPieceRow,
  BuildComparisonBars,
  CharacterBadge,
  ElementBadge,
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

describe('Shared Visual Identifier Components (visual-identifiers)', () => {
  it('renders CharacterBadge with element color, 2-letter initials, and role pills for target vs owned vs simulated (tc)', () => {
    const targetHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Furina" role="target" />
    )
    expect(targetHtml).toContain('data-identifier-kind="character"')
    expect(targetHtml).toContain('data-element="hydro"')
    expect(targetHtml).toContain('data-simulated="false"')
    expect(targetHtml).toContain('data-role="target"')
    expect(targetHtml).toContain('>FU<')
    expect(targetHtml).toContain('Furina')
    expect(targetHtml).toContain('YOUR CHARACTER · TARGET')

    const ownedHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Neuvillette" role="owned" />
    )
    expect(ownedHtml).toContain('data-role="owned"')
    expect(ownedHtml).toContain('YOUR BUILD')

    const simHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="KaedeharaKazuha" simulated />
    )
    expect(simHtml).toContain('data-simulated="true"')
    expect(simHtml).toContain('data-role="simulated"')
    expect(simHtml).toContain('dashed')
    expect(simHtml).toContain('SIM · Fixed Preset Build')

    const simCompactHtml = renderToStaticMarkup(
      <CharacterBadge characterKey="Baizhu" simulated compact />
    )
    expect(simCompactHtml).toContain('data-simulated="true"')
    expect(simCompactHtml).toContain('>SIM<')
  })

  it('renders WeaponBadge with rarity color and weapon-type glyph', () => {
    const wepHtml = renderToStaticMarkup(
      <WeaponBadge
        weaponKey="SplendorOfTranquilWaters"
        subtitle="Lv. 90 R1"
      />
    )
    expect(wepHtml).toContain('data-identifier-kind="weapon"')
    expect(wepHtml).toContain('data-weapon-type="sword"')
    expect(wepHtml).toContain('data-rarity="5"')
    expect(wepHtml).toContain('Splendor of Tranquil Waters')
    expect(wepHtml).toContain('Lv. 90 R1')
  })

  it('renders ArtifactBadge with deterministic set hue, rarity border, and slot glyph', () => {
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
    expect(artHtml).toContain('Golden Troupe')
    expect(artHtml).toContain('+20 Hydro DMG%')
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
    expect(charHtml).toContain('>FU<')

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
    expect(rowHtml).toContain('data-gi-icon="FlowerIcon"')
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
})

