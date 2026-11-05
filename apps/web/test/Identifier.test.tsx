import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ArtifactBadge,
  CharacterBadge,
  ItemIdentifier,
  WeaponBadge,
} from '../src/components/Identifier'

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
})

