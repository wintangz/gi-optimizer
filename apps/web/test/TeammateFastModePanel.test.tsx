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
  TeammateFastModePanel,
  formatFastModeLine,
  formatTeammateStatValue,
} from '@/components/TeammateFastModePanel'

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
})
