import {
  DEFAULT_OPTIMIZER_SETTINGS,
  createBlankUserPreset,
  createDefaultTcTeammate,
  getBundledPreset,
  resetPresetMemberFastMode,
  resolveEffectiveFastMode,
  setPresetMemberFastModeStat,
  validatePreset,
  type OptimizerSettings,
  type Preset,
  type TeamMember,
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

import {
  MemberCompactStatGrid,
  TeammateFastModePanel,
  formatFastModeLine,
  formatMemberStatSourceTooltip,
  formatTeammateStatValue,
} from '@/components/TeammateFastModePanel'
import {
  computeViewportClampedTooltipPlacement,
  syncElementTruncationTooltip,
} from '@/components/TruncationTooltipManager'

interface VNode {
  type: string
  props: Record<string, unknown>
  children: Array<VNode | string>
}

function evaluateTree(node: unknown): Array<VNode | string> {
  hookActive = true
  try {
    return evaluateTreeInner(node)
  } finally {
    hookActive = false
  }
}

function evaluateTreeInner(node: unknown): Array<VNode | string> {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap((c) => evaluateTreeInner(c))
  if (typeof node === 'object' && 'type' in (node as Record<string, unknown>)) {
    const el = node as { type: unknown; props?: Record<string, unknown> }
    const props = el.props ?? {}
    if (typeof el.type === 'function') {
      return evaluateTreeInner(
        (el.type as (p: Record<string, unknown>) => unknown)(props)
      )
    }
    if (typeof el.type === 'string') {
      return [
        { type: el.type, props, children: evaluateTreeInner(props.children) },
      ]
    }
    return evaluateTreeInner(props.children)
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

function findByTestId(
  nodes: Array<VNode | string>,
  testId: string
): VNode | undefined {
  return findAllElements(nodes, (el) => el.props['data-testid'] === testId)[0]
}

function collectText(nodes: Array<VNode | string>): string {
  return nodes
    .map((n) => (typeof n === 'string' ? n : collectText(n.children)))
    .join('')
}

describe('TeammateFastModePanel & Fast Mode UI (fast-mode)', () => {
  const neuvPreset = getBundledPreset('official/neuvillette-hypercarry')!

  const sampleMemberStats = {
    Neuvillette: {
      base: {
        hp: 14695,
        atk: 750,
        def: 576,
        eleMas: 0,
        enerRech_: 1.0,
        critRate_: 0.05,
        critDMG_: 0.884,
      },
      final: {
        hp: 38420,
        atk: 1120,
        def: 650,
        eleMas: 40,
        enerRech_: 1.25,
        critRate_: 0.64,
        critDMG_: 2.75,
      },
    },
    Furina: {
      base: {
        hp: 15307,
        atk: 754,
        def: 696,
        eleMas: 0,
        enerRech_: 1.0,
        critRate_: 0.242,
        critDMG_: 0.5,
      },
      final: {
        hp: 39500,
        atk: 1100,
        def: 760,
        eleMas: 0,
        enerRech_: 1.65,
        critRate_: 0.75,
        critDMG_: 1.6,
      },
    },
    KaedeharaKazuha: {
      base: {
        hp: 13348,
        atk: 806,
        def: 807,
        eleMas: 115.2,
        enerRech_: 1.0,
        critRate_: 0.05,
        critDMG_: 0.5,
      },
      final: {
        hp: 18128,
        atk: 1197,
        def: 873,
        eleMas: 985,
        enerRech_: 1.6,
        critRate_: 0.25,
        critDMG_: 0.7,
      },
    },
    Zhongli: {
      base: {
        hp: 14695,
        atk: 795,
        def: 738,
        eleMas: 0,
        enerRech_: 1.0,
        critRate_: 0.05,
        critDMG_: 0.5,
      },
      final: {
        hp: 48200,
        atk: 1150,
        def: 950,
        eleMas: 0,
        enerRech_: 1.4,
        critRate_: 0.35,
        critDMG_: 0.9,
      },
    },
  }

  it('formats Base & Final stat values and Fast Mode stat lines cleanly', () => {
    expect(formatTeammateStatValue(985.2, false)).toBe('985')
    expect(formatTeammateStatValue(1.65, true)).toBe('165.0%')
    expect(formatTeammateStatValue(undefined, false)).toBe('—')

    expect(formatFastModeLine('eleMas', 40)).toBe('+40 EM')
    expect(formatFastModeLine('enerRech_', -15)).toBe('-15% ER')
    expect(formatFastModeLine('atk_', 20)).toBe('+20% ATK')
  })

  it('renders both Base and Final stats for non-target teammates only (never for the optimization target)', () => {
    const tree = evaluateTree(
      <TeammateFastModePanel
        preset={neuvPreset}
        ownedCharKeys={
          new Set(['Neuvillette', 'Furina', 'KaedeharaKazuha', 'Zhongli'])
        }
        memberStats={sampleMemberStats}
        effectiveFastMode={{}}
        optimizeMode="single"
        onChangeMemberStat={() => {}}
        onResetMember={() => {}}
      />
    )

    // Slot 0 optimization target (Neuvillette) must never have a teammate Fast Mode card
    expect(findByTestId(tree, 'teammate-card-Neuvillette')).toBeUndefined()

    // Non-target teammates (Furina, KaedeharaKazuha, Zhongli) render with both Base and Final rows
    expect(findByTestId(tree, 'teammate-card-Furina')).toBeDefined()
    expect(findByTestId(tree, 'teammate-card-KaedeharaKazuha')).toBeDefined()
    expect(findByTestId(tree, 'teammate-card-Zhongli')).toBeDefined()

    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-base-KaedeharaKazuha-eleMas')!,
      ])
    ).toBe('115')
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-final-KaedeharaKazuha-eleMas')!,
      ])
    ).toBe('985')
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-base-KaedeharaKazuha-enerRech_')!,
      ])
    ).toBe('100.0%')
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-final-KaedeharaKazuha-enerRech_')!,
      ])
    ).toBe('160.0%')
  })

  it('renders GO-style grouped real-stat table (Core / DMG% / RES% / Other) with own element first in DMG% and omits zero groups, plus Additional Buffs with source attribution only when active', () => {
    const kazuhaStats = {
      base: sampleMemberStats.KaedeharaKazuha.base,
      final: {
        ...sampleMemberStats.KaedeharaKazuha.final,
        pyro_dmg_: 0.394,
        hydro_dmg_: 0.394,
        anemo_dmg_: 0.15,
        plunging_dmg_: 0.2,
        cryo_dmg_: 0,
        pyro_res_: 0.15,
        heal_: 0.22,
      },
    }
    const gridTree = evaluateTree(
      <MemberCompactStatGrid
        characterKey="KaedeharaKazuha"
        memberStats={kazuhaStats}
      />
    )
    expect(
      findByTestId(gridTree, 'teammate-stat-group-core-KaedeharaKazuha')
    ).toBeDefined()
    const dmgGroup = findByTestId(
      gridTree,
      'teammate-stat-group-dmg-KaedeharaKazuha'
    )!
    expect(dmgGroup).toBeDefined()
    const dmgRowsContainer = findByTestId(
      gridTree,
      'teammate-dmg-bonuses-KaedeharaKazuha'
    )!
    const bonusKeys = dmgRowsContainer.children
      .filter((c): c is VNode => typeof c !== 'string')
      .map((c) => c.props['data-stat-key'])
    // Kazuha's own element (anemo_dmg_) is first, followed by other non-zero bonuses in DMG_REAL_STAT_KEYS order
    expect(bonusKeys).toEqual([
      'anemo_dmg_',
      'pyro_dmg_',
      'hydro_dmg_',
      'plunging_dmg_',
    ])
    expect(
      collectText([
        findByTestId(
          gridTree,
          'teammate-stat-final-KaedeharaKazuha-anemo_dmg_'
        )!,
      ])
    ).toBe('15.0%')
    expect(
      collectText([
        findByTestId(
          gridTree,
          'teammate-stat-final-KaedeharaKazuha-pyro_dmg_'
        )!,
      ])
    ).toBe('39.4%')

    // Non-zero RES% and Other groups are rendered
    expect(
      findByTestId(gridTree, 'teammate-stat-group-res-KaedeharaKazuha')
    ).toBeDefined()
    expect(
      collectText([
        findByTestId(gridTree, 'teammate-stat-final-KaedeharaKazuha-pyro_res_')!,
      ])
    ).toBe('15.0%')
    expect(
      findByTestId(gridTree, 'teammate-stat-group-other-KaedeharaKazuha')
    ).toBeDefined()
    expect(
      collectText([
        findByTestId(gridTree, 'teammate-stat-final-KaedeharaKazuha-heal_')!,
      ])
    ).toBe('22.0%')

    // No active hit-scoped buffs -> no Additional Buffs section or placeholder box
    expect(
      findByTestId(gridTree, 'teammate-additional-buffs-KaedeharaKazuha')
    ).toBeUndefined()

    // Active hit-scoped buffs -> renders Additional Buffs with value and source attribution
    const zibaiStats = {
      base: sampleMemberStats.KaedeharaKazuha.base,
      final: {
        ...sampleMemberStats.KaedeharaKazuha.final,
        geo_critRate_: 0.1,
        geo_critDMG_: 0.3,
        geo_enemyRes_: -0.5,
      },
      statBreakdowns: {
        geo_critRate_: {
          statKey: 'geo_critRate_',
          total: 0.1,
          reconciledTotal: 0.1,
          unit: '%' as const,
          base: 0,
          baseContributors: [],
          percentContributors: [],
          flatContributors: [],
          contributors: [
            {
              label: 'Illuga',
              sourceKey: 'Illuga',
              category: 'teamBuff' as const,
              value: 0.1,
              unit: '%' as const,
            },
          ],
        },
        geo_critDMG_: {
          statKey: 'geo_critDMG_',
          total: 0.3,
          reconciledTotal: 0.3,
          unit: '%' as const,
          base: 0,
          baseContributors: [],
          percentContributors: [],
          flatContributors: [],
          contributors: [
            {
              label: 'Illuga',
              sourceKey: 'Illuga',
              category: 'teamBuff' as const,
              value: 0.3,
              unit: '%' as const,
            },
          ],
        },
        geo_enemyRes_: {
          statKey: 'geo_enemyRes_',
          total: -0.5,
          reconciledTotal: -0.5,
          unit: '%' as const,
          base: 0,
          baseContributors: [],
          percentContributors: [],
          flatContributors: [],
          contributors: [
            {
              label: 'Elemental Resonance',
              category: 'resonance' as const,
              value: -0.2,
              unit: '%' as const,
            },
            {
              label: 'Linnea',
              sourceKey: 'Linnea',
              category: 'teamBuff' as const,
              value: -0.3,
              unit: '%' as const,
            },
          ],
        },
      },
    }
    const zibaiTree = evaluateTree(
      <MemberCompactStatGrid characterKey="Zibai" memberStats={zibaiStats} />
    )
    const buffsSection = findByTestId(
      zibaiTree,
      'teammate-additional-buffs-Zibai'
    )!
    expect(buffsSection).toBeDefined()
    const critRateBuffRow = findByTestId(
      zibaiTree,
      'teammate-additional-buff-Zibai-geo_critRate_'
    )!
    expect(collectText([critRateBuffRow])).toContain('Geo CRIT Rate')
    expect(collectText([critRateBuffRow])).toContain('+10% — Illuga')
    const critDmgBuffRow = findByTestId(
      zibaiTree,
      'teammate-additional-buff-Zibai-geo_critDMG_'
    )!
    expect(collectText([critDmgBuffRow])).toContain('Geo CRIT DMG')
    expect(collectText([critDmgBuffRow])).toContain('+30% — Illuga')
    const enemyResBuffRow = findByTestId(
      zibaiTree,
      'teammate-additional-buff-Zibai-geo_enemyRes_'
    )!
    expect(collectText([enemyResBuffRow])).toContain('Enemy Geo RES')
    expect(collectText([enemyResBuffRow])).toContain(
      '-50% — Elemental Resonance, Linnea'
    )
  })

  it('supports typing positive and negative Fast Mode stat lines, shows Fast Mode badge & typed pills, and resets per member on bundled presets', () => {
    let settings: OptimizerSettings = DEFAULT_OPTIMIZER_SETTINGS

    function renderPanel() {
      const effectiveFastMode = resolveEffectiveFastMode(neuvPreset, settings)
      const kazuhaEmBonus = effectiveFastMode.KaedeharaKazuha?.eleMas ?? 0
      const dynamicStats = {
        ...sampleMemberStats,
        KaedeharaKazuha: {
          ...sampleMemberStats.KaedeharaKazuha,
          final: {
            ...sampleMemberStats.KaedeharaKazuha.final,
            eleMas:
              sampleMemberStats.KaedeharaKazuha.final.eleMas + kazuhaEmBonus,
          },
        },
      }
      return evaluateTree(
        <TeammateFastModePanel
          preset={neuvPreset}
          ownedCharKeys={
            new Set(['Neuvillette', 'Furina', 'KaedeharaKazuha', 'Zhongli'])
          }
          memberStats={dynamicStats}
          effectiveFastMode={effectiveFastMode}
          optimizeMode="single"
          onChangeMemberStat={(charKey, statKey, val) => {
            settings = setPresetMemberFastModeStat(
              settings,
              neuvPreset.id,
              charKey,
              statKey,
              val
            )
          }}
          onResetMember={(charKey) => {
            settings = resetPresetMemberFastMode(
              settings,
              neuvPreset.id,
              charKey
            )
          }}
        />
      )
    }

    let tree = renderPanel()

    // Initially no Fast Mode badge on Kazuha, and Reset button is disabled
    expect(findByTestId(tree, 'fast-mode-badge-KaedeharaKazuha')).toBeUndefined()
    const resetBtnInitial = findByTestId(
      tree,
      'fast-mode-reset-KaedeharaKazuha'
    )!
    expect(resetBtnInitial.props.disabled).toBe(true)

    // Type +40 into Kazuha's EM input and -15 into ER% input
    const emInput = findByTestId(tree, 'fast-mode-input-KaedeharaKazuha-eleMas')!
    const erInput = findByTestId(
      tree,
      'fast-mode-input-KaedeharaKazuha-enerRech_'
    )!
    ;(
      emInput.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '40' } })
    ;(
      erInput.props.onChange as (e: { target: { value: string } }) => void
    )({ target: { value: '-15' } })

    tree = renderPanel()

    // Fast Mode badge is now visible, typed line pills render, and Final EM reflects +40 (985 -> 1,025)
    expect(
      collectText([findByTestId(tree, 'fast-mode-badge-KaedeharaKazuha')!])
    ).toBe('Fast Mode')
    expect(
      collectText([findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-eleMas')!])
    ).toContain('+40 EM')
    expect(
      collectText([
        findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-enerRech_')!,
      ])
    ).toContain('-15% ER')
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-base-KaedeharaKazuha-eleMas')!,
      ])
    ).toBe('115')
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-final-KaedeharaKazuha-eleMas')!,
      ])
    ).toBe('1,025')
    expect(
      findByTestId(tree, 'fast-mode-reset-KaedeharaKazuha')!.props.disabled
    ).toBe(false)

    // Remove the negative ER% line via its pill button
    const removeErBtn = findByTestId(
      tree,
      'fast-mode-remove-KaedeharaKazuha-enerRech_'
    )!
    ;(removeErBtn.props.onClick as () => void)()

    tree = renderPanel()
    expect(
      findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-enerRech_')
    ).toBeUndefined()
    expect(
      findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-eleMas')
    ).toBeDefined()

    // Reset Kazuha's Fast Mode completely
    const resetBtnActive = findByTestId(
      tree,
      'fast-mode-reset-KaedeharaKazuha'
    )!
    ;(resetBtnActive.props.onClick as () => void)()

    tree = renderPanel()
    expect(findByTestId(tree, 'fast-mode-badge-KaedeharaKazuha')).toBeUndefined()
    expect(findByTestId(tree, 'fast-mode-lines-KaedeharaKazuha')).toBeUndefined()
    expect(
      collectText([
        findByTestId(tree, 'teammate-stat-final-KaedeharaKazuha-eleMas')!,
      ])
    ).toBe('985')
    expect(
      findByTestId(tree, 'fast-mode-reset-KaedeharaKazuha')!.props.disabled
    ).toBe(true)
  })

  it('is available in weapon-compare mode and hidden in team-optimize mode while keeping Base & Final stats visible', () => {
    const compareHtml = renderToStaticMarkup(
      <TeammateFastModePanel
        preset={neuvPreset}
        ownedCharKeys={
          new Set(['Neuvillette', 'Furina', 'KaedeharaKazuha', 'Zhongli'])
        }
        memberStats={sampleMemberStats}
        effectiveFastMode={{ KaedeharaKazuha: { eleMas: 40 } }}
        optimizeMode="compare"
        onChangeMemberStat={() => {}}
        onResetMember={() => {}}
      />
    )

    expect(compareHtml).toContain('data-fast-mode-available="true"')
    expect(compareHtml).toContain('data-testid="fast-mode-editor-KaedeharaKazuha"')
    expect(compareHtml).toContain('data-testid="fast-mode-badge-KaedeharaKazuha"')

    const teamHtml = renderToStaticMarkup(
      <TeammateFastModePanel
        preset={neuvPreset}
        ownedCharKeys={
          new Set(['Neuvillette', 'Furina', 'KaedeharaKazuha', 'Zhongli'])
        }
        memberStats={sampleMemberStats}
        effectiveFastMode={{ KaedeharaKazuha: { eleMas: 40 } }}
        optimizeMode="team"
        onChangeMemberStat={() => {}}
        onResetMember={() => {}}
      />
    )

    expect(teamHtml).toContain('data-fast-mode-available="false"')
    expect(teamHtml).not.toContain('data-testid="fast-mode-editor-KaedeharaKazuha"')
    expect(teamHtml).not.toContain('data-testid="fast-mode-badge-KaedeharaKazuha"')
    expect(teamHtml).toContain(
      'data-testid="teammate-stat-base-KaedeharaKazuha-eleMas"'
    )
    expect(teamHtml).toContain(
      'data-testid="teammate-stat-final-KaedeharaKazuha-eleMas"'
    )
  })

  it('persists Fast Mode in user preset data (TeamMember.fastMode) and strips it from slot 0 target', () => {
    const customPreset = createBlankUserPreset(
      'Neuvillette',
      'User Neuvillette Fast Mode',
      ['charged', 'dmg']
    )
    const kazuhaTeammate: TeamMember = {
      ...createDefaultTcTeammate('KaedeharaKazuha'),
      fastMode: { eleMas: 40, enerRech_: -10 },
    }
    customPreset.team.push(kazuhaTeammate)

    const validation = validatePreset({
      ...customPreset,
      team: customPreset.team.map((m, idx) =>
        idx === 0 ? { ...m, fastMode: { hp_: 50 } } : m
      ),
    })
    expect(validation.ok).toBe(true)
    const parsed: Preset = validation.preset!

    // Slot 0 target's fastMode is stripped; non-target teammate's fastMode is preserved
    expect(parsed.team[0]!.fastMode).toBeUndefined()
    expect(parsed.team[1]!.fastMode).toEqual({ eleMas: 40, enerRech_: -10 })

    const resolved = resolveEffectiveFastMode(parsed, DEFAULT_OPTIMIZER_SETTINGS)
    expect(resolved).toEqual({
      KaedeharaKazuha: { eleMas: 40, enerRech_: -10 },
    })

    const tree = evaluateTree(
      <TeammateFastModePanel
        preset={parsed}
        ownedCharKeys={new Set(['Neuvillette', 'KaedeharaKazuha'])}
        memberStats={sampleMemberStats}
        effectiveFastMode={resolved}
        optimizeMode="single"
        onChangeMemberStat={() => {}}
        onResetMember={() => {}}
      />
    )

    expect(
      collectText([findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-eleMas')!])
    ).toContain('+40 EM')
    expect(
      collectText([
        findByTestId(tree, 'fast-mode-line-KaedeharaKazuha-enerRech_')!,
      ])
    ).toContain('-10% ER')
  })

  it('stat source tooltips (editor-pack): renders contributing sources + values tooltip on Final stats when breakdown data is present, renders no tooltip when absent, and clamps tooltip coordinates inside the viewport', () => {
    const furinaWithBreakdowns = {
      base: sampleMemberStats.Furina.base,
      final: {
        ...sampleMemberStats.Furina.final,
        hydro_dmg_: 0.466,
      },
      statBreakdowns: {
        hp: {
          statKey: 'hp' as const,
          label: 'HP',
          unit: '' as const,
          base: 15307,
          total: 39500,
          reconciledTotal: 39500,
          baseContributors: [],
          percentContributors: [],
          flatContributors: [],
          contributors: [
            {
              label: 'Furina (Character Base / Ascension)',
              value: 15307,
              unit: '' as const,
              source: 'Furina',
              category: 'character' as const,
            },
            {
              label: 'Primordial Jade Cutter (Weapon Stat)',
              value: 3061,
              unit: '' as const,
              source: 'PrimordialJadeCutter',
              category: 'weapon' as const,
              note: '15,307 Base × 20.0%',
            },
            {
              label: 'Equipped Artifacts',
              value: 17305,
              unit: '' as const,
              source: 'Artifacts',
              category: 'artifactSet' as const,
            },
            {
              label: 'Elemental Resonance',
              value: 3827,
              unit: '' as const,
              source: 'Resonance',
              category: 'resonance' as const,
              note: '15,307 Base × 25.0%',
            },
          ],
        },
        hydro_dmg_: {
          statKey: 'hydro_dmg_' as const,
          label: 'Hydro DMG Bonus',
          unit: '%' as const,
          base: 0,
          total: 0.466,
          reconciledTotal: 0.466,
          baseContributors: [],
          percentContributors: [],
          flatContributors: [],
          contributors: [
            {
              label: 'Equipped Artifacts',
              value: 0.466,
              unit: '%' as const,
              source: 'Artifacts',
              category: 'artifactSet' as const,
            },
          ],
        },
      },
    }

    const gridTree = evaluateTree(
      <MemberCompactStatGrid
        characterKey="Furina"
        memberStats={furinaWithBreakdowns}
      />
    )

    // 1. HP Final stat has breakdown data -> tooltip lists Base, Weapon, Artifacts, and Resonance contributors + values
    const hpFinal = findByTestId(gridTree, 'teammate-stat-final-Furina-hp')!
    expect(hpFinal).toBeDefined()
    const hpTooltip = hpFinal.props['data-stat-source-tooltip'] as string
    expect(hpTooltip).toBeDefined()
    expect(hpFinal.props.title).toBe(hpTooltip)
    expect(hpTooltip).toContain(
      'Base · Furina (Character Base / Ascension): +15,307'
    )
    expect(hpTooltip).toContain(
      'Weapon · Primordial Jade Cutter (Weapon Stat) (15,307 Base × 20.0%): +3,061'
    )
    expect(hpTooltip).toContain('Artifacts · Equipped Artifacts: +17,305')
    expect(hpTooltip).toContain(
      'Resonance · Elemental Resonance (15,307 Base × 25.0%): +3,827'
    )

    // Non-core DMG% Final stat also carries its source tooltip when breakdown data exists
    const hydroFinal = findByTestId(
      gridTree,
      'teammate-stat-final-Furina-hydro_dmg_'
    )!
    expect(hydroFinal.props['data-stat-source-tooltip']).toContain(
      'Artifacts · Equipped Artifacts: +46.6%'
    )

    // 2. DEF Final stat has NO breakdown entry -> no tooltip attributes ("No data -> no tooltip")
    const defFinal = findByTestId(gridTree, 'teammate-stat-final-Furina-def')!
    expect(defFinal).toBeDefined()
    expect(defFinal.props.title).toBeUndefined()
    expect(defFinal.props['data-stat-source-tooltip']).toBeUndefined()
    expect(formatMemberStatSourceTooltip('def', undefined)).toBeUndefined()

    // 3. syncElementTruncationTooltip never strips or overwrites data-stat-source-tooltip
    const attrs: Record<string, string> = {
      title: hpTooltip,
      'data-stat-source-tooltip': hpTooltip,
    }
    const mockEl = {
      scrollWidth: 40,
      clientWidth: 80,
      scrollHeight: 18,
      clientHeight: 18,
      textContent: '39,500',
      getAttribute: (k: string) => attrs[k] ?? null,
      setAttribute: (k: string, v: string) => {
        attrs[k] = v
      },
      removeAttribute: (k: string) => {
        delete attrs[k]
      },
    }
    expect(syncElementTruncationTooltip(mockEl)).toBe(false)
    expect(attrs.title).toBe(hpTooltip)

    // 4. Viewport clamping keeps tooltip inside viewport across edges
    const topEdge = computeViewportClampedTooltipPlacement(
      { left: 500, right: 560, top: 10, bottom: 28, width: 60 },
      { width: 1280, height: 800 },
      4
    )
    expect(topEdge.placement).toBe('bottom')
    expect(topEdge.y).toBeGreaterThanOrEqual(8)
    expect(topEdge.y).toBeLessThanOrEqual(800)

    const rightEdge = computeViewportClampedTooltipPlacement(
      { left: 1220, right: 1275, top: 400, bottom: 420, width: 55 },
      { width: 1280, height: 800 },
      4
    )
    expect(rightEdge.align).toBe('right')
    expect(rightEdge.x).toBeLessThanOrEqual(1280 - 12)
  })
})
