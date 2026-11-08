import { objPathValue } from '@genshin-optimizer/common/util'
import {
  allElementWithPhyKeys,
  type CharacterKey,
} from '@genshin-optimizer/gi/consts'
import { translateGOKey } from '@genshin-optimizer/gi/i18n'
import { KeyMap, transformativeReactions } from '@genshin-optimizer/gi/keymap'
import type { CalcResult, UIData } from '@genshin-optimizer/gi/uidata'
import {
  input,
  type Data,
  type DataNode,
  type NumNode,
  type StrNode,
} from '@genshin-optimizer/gi/wr'
import {
  ALL_ARTIFACT_SET_KEYS,
  ALL_WEAPON_KEYS,
  displayName,
  resolveRotationTargetOwner,
  type Preset,
  type RotationTarget,
} from '@gi/presets'
import {
  ALL_EXTRACTED_STAT_KEYS,
  ALL_REAL_STAT_KEYS,
  isEnemyResStatKey,
  isPercentStatKey,
  type ExtractedStatKey,
} from './stats'
import type {
  BreakdownContributor,
  BreakdownSourceCategory,
  DamageFactorGroup,
  DamageRowBreakdown,
  FullDamageFormulaEntry,
  FullDamageSection,
  StatBreakdown,
} from './types'

const ART_SET_SET = new Set<string>(ALL_ARTIFACT_SET_KEYS)
const WEAPON_SET = new Set<string>(ALL_WEAPON_KEYS)

interface BreakdownWalkContext {
  targetKey: CharacterKey
  targetWeaponKey?: string
  teamKeys: CharacterKey[]
  calc: Partial<Record<CharacterKey, { target: UIData }>>
  targetUiData: UIData
}

function resolveTeamMemberKey(
  rawSource: string | undefined,
  teamKeys: readonly CharacterKey[]
): CharacterKey | undefined {
  if (!rawSource) return undefined
  if (teamKeys.includes(rawSource as CharacterKey)) {
    return rawSource as CharacterKey
  }
  if (rawSource.startsWith('Traveler')) {
    const stripped = rawSource.replace(/[FM]$/, '')
    if (teamKeys.includes(stripped as CharacterKey)) {
      return stripped as CharacterKey
    }
  }
  return undefined
}

function classifyContributor(
  ctx: BreakdownWalkContext,
  opts: {
    source?: string
    prefix?: string
    fromMemberKey?: CharacterKey
    isEnemyStat?: boolean
  }
): {
  category: BreakdownSourceCategory
  label: string
  sourceKey?: string
} {
  const { source, prefix, fromMemberKey, isEnemyStat } = opts
  const { targetKey, targetWeaponKey } = ctx

  if (source === 'Resonance') {
    return {
      category: 'resonance',
      sourceKey: 'Resonance',
      label: 'Elemental Resonance',
    }
  }

  if (fromMemberKey && fromMemberKey !== targetKey) {
    if (source && ART_SET_SET.has(source)) {
      return {
        category: 'teamBuff',
        sourceKey: fromMemberKey,
        label: `${displayName(fromMemberKey)} · ${displayName(source)}`,
      }
    }
    if (source && WEAPON_SET.has(source)) {
      return {
        category: 'teamBuff',
        sourceKey: fromMemberKey,
        label: `${displayName(fromMemberKey)} · ${displayName(source)}`,
      }
    }
    return {
      category: 'teamBuff',
      sourceKey: fromMemberKey,
      label: `${displayName(fromMemberKey)} (Team Buff)`,
    }
  }

  if (source && ART_SET_SET.has(source)) {
    return {
      category: 'artifactSet',
      sourceKey: source,
      label: `${displayName(source)} (Set Bonus)`,
    }
  }

  if (source && WEAPON_SET.has(source)) {
    return {
      category: 'weapon',
      sourceKey: source,
      label: `${displayName(source)} (Weapon Passive)`,
    }
  }

  if (prefix === 'art') {
    return {
      category: 'artifactSet',
      sourceKey: 'Artifacts',
      label: 'Equipped Artifacts',
    }
  }

  if (prefix === 'weapon') {
    return {
      category: 'weapon',
      sourceKey: targetWeaponKey,
      label: targetWeaponKey
        ? `${displayName(targetWeaponKey)} (Weapon Stat)`
        : 'Equipped Weapon',
    }
  }

  if (prefix === 'default') {
    return {
      category: 'character',
      sourceKey: targetKey,
      label: `${displayName(targetKey)} (Base Default)`,
    }
  }

  if (prefix === 'char') {
    return {
      category: 'character',
      sourceKey: targetKey,
      label: `${displayName(targetKey)} (Character Base / Ascension)`,
    }
  }

  if (prefix === 'custom') {
    return {
      category: 'character',
      sourceKey: targetKey,
      label: 'Bonus Stats',
    }
  }

  if (isEnemyStat && prefix === 'base') {
    return {
      category: 'enemy',
      sourceKey: 'Enemy',
      label: 'Enemy Base RES',
    }
  }

  return {
    category: 'character',
    sourceKey: targetKey,
    label: `${displayName(targetKey)} (Talent / Passive)`,
  }
}

function uncollapseMemberTeamBuff(
  ctx: BreakdownWalkContext,
  memberKey: CharacterKey,
  statPath: string | undefined,
  expectedValue: number
): CalcResult<number> | undefined {
  if (!statPath) return undefined
  const memberTargetUi = ctx.calc[memberKey]?.target
  const targetUi = ctx.calc[ctx.targetKey]?.target
  if (!memberTargetUi || !targetUi) return undefined

  const memberOwnData = memberTargetUi.data[0]
  const targetToData = targetUi.data[1]
  if (!memberOwnData || !targetToData) return undefined

  const memberBuffUiData = ctx.targetUiData.origin
    .child(memberOwnData)
    .child(targetToData)

  const premodNode = objPathValue(memberOwnData, [
    'teamBuff',
    'premod',
    statPath,
  ]) as NumNode | undefined
  const totalNode = objPathValue(memberOwnData, [
    'teamBuff',
    'total',
    statPath,
  ]) as NumNode | undefined

  if (premodNode && totalNode) {
    const preRes = memberBuffUiData.get(premodNode)
    const totRes = memberBuffUiData.get(totalNode)
    if (Math.abs(preRes.value + totRes.value - expectedValue) < 1e-6) {
      return {
        value: expectedValue,
        meta: {
          op: 'add',
          ops: [preRes, totRes],
          conds: [],
        },
        info: {},
        isEmpty: false,
      }
    }
    if (Math.abs(preRes.value - expectedValue) < 1e-6) return preRes
    if (Math.abs(totRes.value - expectedValue) < 1e-6) return totRes
  } else if (premodNode) {
    const preRes = memberBuffUiData.get(premodNode)
    if (Math.abs(preRes.value - expectedValue) < 1e-6) return preRes
  } else if (totalNode) {
    const totRes = memberBuffUiData.get(totalNode)
    if (Math.abs(totRes.value - expectedValue) < 1e-6) return totRes
  }

  return undefined
}

function collectAdditiveContributors(
  node: CalcResult<number> | undefined,
  ctx: BreakdownWalkContext,
  unit: '' | '%',
  opts?: {
    inheritedSource?: string
    inheritedPrefix?: string
    inheritedPath?: string
    fromMemberKey?: CharacterKey
    isEnemyStat?: boolean
    skipNodePredicate?: (n: CalcResult<number>) => boolean
  }
): BreakdownContributor[] {
  if (!node || !Number.isFinite(node.value) || Math.abs(node.value) < 1e-9) {
    return []
  }
  if (opts?.skipNodePredicate?.(node)) {
    return []
  }

  const source = node.info?.source ?? opts?.inheritedSource
  const prefix = node.info?.prefix ?? opts?.inheritedPrefix
  const statPath = node.info?.path ?? opts?.inheritedPath
  const fromMemberKey = opts?.fromMemberKey

  // If this is a collapsed teamBuff member read node (`asConst: true`), un-collapse it in `memberBuffUiData`
  if (
    !fromMemberKey &&
    node.meta.op === 'const' &&
    source
  ) {
    const memberKey = resolveTeamMemberKey(source, ctx.teamKeys)
    if (
      memberKey &&
      (prefix === 'teamBuff' ||
        opts?.inheritedPrefix === 'teamBuff' ||
        memberKey !== ctx.targetKey)
    ) {
      const uncollapsed = uncollapseMemberTeamBuff(
        ctx,
        memberKey,
        statPath,
        node.value
      )
      if (uncollapsed) {
        return collectAdditiveContributors(uncollapsed, ctx, unit, {
          inheritedPath: statPath,
          fromMemberKey: memberKey,
          isEnemyStat: opts?.isEnemyStat,
        })
      }
      const fallbackClass = classifyContributor(ctx, {
        source: undefined,
        prefix: undefined,
        fromMemberKey: memberKey,
        isEnemyStat: opts?.isEnemyStat,
      })
      return [
        {
          ...fallbackClass,
          value: node.value,
          unit,
        },
      ]
    }
  }

  if (node.meta.op === 'add' && node.meta.ops.length > 0) {
    const out: BreakdownContributor[] = []
    for (const op of node.meta.ops) {
      out.push(
        ...collectAdditiveContributors(op, ctx, unit, {
          inheritedSource: source,
          inheritedPrefix: prefix,
          inheritedPath: statPath,
          fromMemberKey,
          isEnemyStat: opts?.isEnemyStat,
          skipNodePredicate: opts?.skipNodePredicate,
        })
      )
    }
    return mergeContributors(out)
  }

  const classified = classifyContributor(ctx, {
    source,
    prefix,
    fromMemberKey,
    isEnemyStat: opts?.isEnemyStat,
  })
  return [
    {
      ...classified,
      value: node.value,
      unit,
    },
  ]
}

function mergeContributors(
  list: readonly BreakdownContributor[]
): BreakdownContributor[] {
  const map = new Map<string, BreakdownContributor>()
  for (const item of list) {
    if (!Number.isFinite(item.value) || Math.abs(item.value) < 1e-9) continue
    const key = `${item.category}|${item.sourceKey ?? ''}|${item.label}|${item.unit}|${item.note ?? ''}`
    const existing = map.get(key)
    if (existing) {
      existing.value += item.value
      if (
        typeof existing.percentValue === 'number' &&
        typeof item.percentValue === 'number'
      ) {
        existing.percentValue += item.percentValue
      }
    } else {
      map.set(key, { ...item })
    }
  }
  return Array.from(map.values()).filter((c) => Math.abs(c.value) >= 1e-9)
}

export const STAT_BREAKDOWN_KEYS = ALL_EXTRACTED_STAT_KEYS
export type StatBreakdownKey = ExtractedStatKey

const REAL_STAT_KEY_SET = new Set<string>(ALL_REAL_STAT_KEYS)

export function extractStatBreakdowns(
  targetUiData: UIData,
  calc: Partial<Record<CharacterKey, { target: UIData }>>,
  targetKey: CharacterKey,
  teamKeys: CharacterKey[],
  targetWeaponKey?: string
): Record<string, StatBreakdown> {
  const ctx: BreakdownWalkContext = {
    targetKey,
    targetWeaponKey,
    teamKeys,
    calc,
    targetUiData,
  }

  const out: Record<string, StatBreakdown> = {}

  for (const statKey of STAT_BREAKDOWN_KEYS) {
    const totalRead = (input.total as Record<string, NumNode>)[statKey]
    if (!totalRead) continue
    const totalNode = targetUiData.get(totalRead)
    const isEnemyRes = isEnemyResStatKey(statKey)
    let enemyBaseRes = 0
    if (isEnemyRes) {
      const ele = statKey.replace(/_enemyRes_$/, '')
      const enemyBaseRead = (input.enemy as Record<string, NumNode>)[
        `${ele}_res_`
      ]
      if (enemyBaseRead) {
        enemyBaseRes = targetUiData.get(enemyBaseRead).value
      }
    }
    const total = isEnemyRes ? totalNode.value - enemyBaseRes : totalNode.value

    if (statKey === 'hp' || statKey === 'atk' || statKey === 'def') {
      const baseRead = (input.base as Record<string, NumNode>)[statKey]!
      const pctRead = (input.premod as Record<string, NumNode>)[`${statKey}_`]!
      const baseNode = targetUiData.get(baseRead)
      const pctNode = targetUiData.get(pctRead)

      const base = baseNode.value
      const baseContributors = collectAdditiveContributors(baseNode, ctx, '')

      const rawPctContributors = collectAdditiveContributors(pctNode, ctx, '%')
      const percentContributors: BreakdownContributor[] =
        rawPctContributors.map((c) => ({
          ...c,
          unit: '',
          percentValue: c.value,
          value: base * c.value,
          note: `${Math.round(base).toLocaleString()} Base × ${(c.value * 100).toFixed(1)}%`,
        }))

      const scaledBaseProductValue = base * (1 + pctNode.value)
      let skippedScaledProduct = false
      const flatContributors =
        Math.abs(total - scaledBaseProductValue) < 1e-4
          ? []
          : collectAdditiveContributors(totalNode, ctx, '', {
              skipNodePredicate: (n) => {
                if (
                  !skippedScaledProduct &&
                  Math.abs(n.value - scaledBaseProductValue) < 1e-3 &&
                  (n.meta.op === 'mul' || Math.abs(pctNode.value) < 1e-9)
                ) {
                  skippedScaledProduct = true
                  return true
                }
                return false
              },
            })

      const contributors = [
        ...baseContributors,
        ...percentContributors,
        ...flatContributors,
      ]
      const reconciledTotal = contributors.reduce((s, c) => s + c.value, 0)

      out[statKey] = {
        statKey,
        total,
        unit: '',
        base,
        baseContributors,
        percentContributors,
        flatContributors,
        contributors,
        reconciledTotal,
      }
    } else {
      const unit: '' | '%' = isPercentStatKey(statKey) ? '%' : ''
      const rawContribs = collectAdditiveContributors(totalNode, ctx, unit, {
        isEnemyStat: isEnemyRes,
      })
      const allContribs = isEnemyRes
        ? rawContribs.filter((c) => c.category !== 'enemy')
        : rawContribs
      const baseContributors = allContribs.filter((c) =>
        c.label.includes('(Base Default)')
      )
      const base = baseContributors.reduce((s, c) => s + c.value, 0)
      const flatContributors = allContribs.filter(
        (c) => !c.label.includes('(Base Default)')
      )
      const contributors =
        baseContributors.length + flatContributors.length > 0
          ? [...baseContributors, ...flatContributors]
          : REAL_STAT_KEY_SET.has(statKey)
            ? [
                {
                  category: 'character' as const,
                  sourceKey: targetKey,
                  label: `${displayName(targetKey)} (Base Default)`,
                  value: 0,
                  unit,
                },
              ]
            : []
      const reconciledTotal = contributors.reduce((s, c) => s + c.value, 0)

      out[statKey] = {
        statKey,
        total,
        unit,
        base,
        baseContributors,
        percentContributors: [],
        flatContributors,
        contributors,
        reconciledTotal,
      }
    }
  }

  return out
}

function findDataNodeInTree(
  node: NumNode | StrNode | undefined
): DataNode<NumNode | StrNode> | undefined {
  if (!node || typeof node !== 'object' || !('operation' in node)) {
    return undefined
  }
  if (node.operation === 'data') {
    return node as DataNode<NumNode | StrNode>
  }
  for (const op of node.operands ?? []) {
    const found = findDataNodeInTree(op as NumNode | StrNode)
    if (found) return found
  }
  return undefined
}

function findHitUiData(rowUiData: UIData): UIData | undefined {
  const queue: UIData[] = [rowUiData]
  const visited = new Set<UIData>()
  while (queue.length > 0) {
    const curr = queue.shift()!
    if (visited.has(curr)) continue
    visited.add(curr)
    const topData: Data | undefined = curr.data[0]
    if (topData && topData.hit && (topData.hit as Record<string, unknown>).base) {
      return curr
    }
    for (const child of curr.children.values()) {
      queue.push(child)
    }
  }
  return undefined
}

export function extractDamageRowBreakdown(opts: {
  preset: Preset
  rt: RotationTarget
  idx: number
  perHit: number
  subtotal: number
  targetUiData: UIData
  calc: Partial<Record<CharacterKey, { target: UIData }>>
  targetKey: CharacterKey
  teamKeys: CharacterKey[]
  targetWeaponKey?: string
}): DamageRowBreakdown {
  const {
    preset,
    rt,
    idx,
    perHit,
    subtotal,
    targetUiData,
    calc,
    targetKey,
    teamKeys,
    targetWeaponKey,
  } = opts
  const repeat = preset.rotation.repeat ?? 1

  const ctx: BreakdownWalkContext = {
    targetKey,
    targetWeaponKey,
    teamKeys,
    calc,
    targetUiData,
  }

  let customRowFormula: NumNode | undefined
  for (const d of targetUiData.data) {
    const candidate = objPathValue(d, [
      'display',
      'custom',
      String(idx + 1),
    ]) as NumNode | undefined
    if (candidate) {
      customRowFormula = candidate
      break
    }
  }

  const rowDataNode = findDataNodeInTree(customRowFormula)
  const rowUiData = rowDataNode
    ? targetUiData.child(rowDataNode.data)
    : targetUiData
  const hitUiData = findHitUiData(rowUiData)

  if (!hitUiData) {
    return {
      element: 'physical',
      move: rt.path[0] ?? 'skill',
      hitMode: rt.hitMode ?? 'avgHit',
      reaction: rt.reaction,
      baseDmg: perHit,
      dmgInc: 0,
      basePlusFlat: perHit,
      dmgBonus: 0,
      dmgBonusMulti: 1,
      critRate: 0,
      critDMG: 0,
      critMulti: 1,
      ampMulti: 1,
      defMulti: 1,
      resMulti: 1,
      outerMulti: 1,
      reconciledPerHit: perHit,
      reconciledSubtotal: subtotal,
      factors: [
        {
          key: 'baseDamage',
          label: 'Base Value',
          value: perHit,
          unit: '',
          contributors: [
            {
              category: 'character',
              sourceKey: targetKey,
              label: `${displayName(targetKey)} (${rt.label || rt.path.join('.')})`,
              value: perHit,
              unit: '',
            },
          ],
        },
      ],
    }
  }

  return buildHitUiDataBreakdown({
    hitUiData,
    ctx,
    perHit,
    count: rt.count,
    repeat,
    fallbackMove: rt.path[0] || 'skill',
    fallbackHitMode: rt.hitMode,
    fallbackReaction: rt.reaction,
  })
}

function buildHitUiDataBreakdown(opts: {
  hitUiData: UIData
  ctx: BreakdownWalkContext
  perHit: number
  count: number
  repeat: number
  fallbackMove: string
  fallbackHitMode?: string
  fallbackReaction?: string
}): DamageRowBreakdown {
  const {
    hitUiData,
    ctx,
    perHit,
    count,
    repeat,
    fallbackMove,
    fallbackHitMode,
    fallbackReaction,
  } = opts
  const { targetKey } = ctx

  const ele = (hitUiData.get(input.hit.ele).value as string) || 'physical'
  const move =
    (hitUiData.get(input.hit.move).value as string) || fallbackMove || 'skill'
  const hitMode =
    (hitUiData.get(input.hit.hitMode).value as string) ||
    fallbackHitMode ||
    'avgHit'
  const reaction =
    (hitUiData.get(input.hit.reaction).value as string) ||
    fallbackReaction ||
    undefined

  const baseDmgNode = hitUiData.get(input.hit.base)
  const dmgIncNode = hitUiData.get(input.hit.dmgInc)
  const dmgBonusNode = hitUiData.get(input.hit.dmgBonus)
  const ampMultiNode = hitUiData.get(input.hit.ampMulti)
  const defMultiNode = hitUiData.get(input.enemy.def)
  const resMultiRead = (input.enemy as Record<string, NumNode>)[
    `${ele}_resMulti_`
  ]
  const resMultiNode = resMultiRead ? hitUiData.get(resMultiRead) : undefined

  const baseDmg = baseDmgNode.value
  const dmgInc = Number.isFinite(dmgIncNode.value) ? dmgIncNode.value : 0
  const basePlusFlat = baseDmg + dmgInc
  const dmgBonus = Number.isFinite(dmgBonusNode.value) ? dmgBonusNode.value : 0
  const dmgBonusMulti = 1 + dmgBonus

  const critRate = hitUiData.get(input.total.cappedCritRate).value
  const critDMG = hitUiData.get(input.total.critDMG_).value
  const critMulti =
    hitMode === 'critHit'
      ? 1 + critDMG
      : hitMode === 'avgHit'
        ? 1 + critRate * critDMG
        : 1

  const ampMulti = Number.isFinite(ampMultiNode.value) ? ampMultiNode.value : 1
  const defMulti = Number.isFinite(defMultiNode.value) ? defMultiNode.value : 1
  const resMulti =
    resMultiNode && Number.isFinite(resMultiNode.value)
      ? resMultiNode.value
      : 1

  const innerProduct =
    basePlusFlat * dmgBonusMulti * critMulti * ampMulti * defMulti * resMulti
  const rawOuterMulti = innerProduct > 0 ? perHit / innerProduct : 1
  const outerMulti =
    Math.abs(rawOuterMulti - 1) < 1e-6
      ? 1
      : Math.abs(rawOuterMulti - Math.round(rawOuterMulti)) < 1e-4
        ? Math.round(rawOuterMulti)
        : rawOuterMulti

  const reconciledPerHit = outerMulti * innerProduct
  const reconciledSubtotal = reconciledPerHit * count * repeat

  // 1. Base Damage & Flat DMG Increase contributors
  const baseContributors: BreakdownContributor[] = [
    {
      category: 'character',
      sourceKey: targetKey,
      label: `${displayName(targetKey)} Talent Base DMG`,
      value: baseDmg,
      unit: '',
    },
  ]
  if (Math.abs(dmgInc) > 1e-6) {
    const addTermVal = hitUiData.get(input.hit.addTerm).value
    const flatIncVal = dmgInc - (Number.isFinite(addTermVal) ? addTermVal : 0)
    if (Math.abs(flatIncVal) > 1e-6) {
      baseContributors.push(
        ...collectAdditiveContributors(dmgIncNode, ctx, '', {
          skipNodePredicate: (n) =>
            Number.isFinite(addTermVal) &&
            Math.abs(addTermVal) > 1e-6 &&
            Math.abs(n.value - addTermVal) < 1e-4,
        })
      )
    }
    if (Number.isFinite(addTermVal) && Math.abs(addTermVal) > 1e-6) {
      baseContributors.push({
        category: 'character',
        sourceKey: targetKey,
        label:
          reaction === 'spread'
            ? 'Spread Additive Reaction Bonus'
            : reaction === 'aggravate'
              ? 'Aggravate Additive Reaction Bonus'
              : 'Additive Reaction Bonus',
        value: addTermVal,
        unit: '',
      })
    }
  }

  // 2. DMG Bonus contributors
  const dmgBonusContributors = collectAdditiveContributors(
    dmgBonusNode,
    ctx,
    '%'
  )

  // 3. Crit contributors
  const critRateResonanceContribs = collectAdditiveContributors(
    hitUiData.get(input.total.critRate_),
    ctx,
    '%'
  ).filter((c) => c.category === 'resonance')
  const critContributors: BreakdownContributor[] = [
    {
      category: 'character',
      sourceKey: targetKey,
      label: `Effective CRIT Rate (${hitMode})`,
      value: critRate,
      unit: '%',
    },
    ...critRateResonanceContribs,
    {
      category: 'character',
      sourceKey: targetKey,
      label: 'Total CRIT DMG',
      value: critDMG,
      unit: '%',
    },
  ]

  // 4. Reaction Multiplier contributors
  const reactionContributors: BreakdownContributor[] = []
  if ((reaction === 'melt' || reaction === 'vaporize') && ampMulti > 1) {
    const baseAmp =
      reaction === 'vaporize'
        ? ele === 'hydro'
          ? 2.0
          : 1.5
        : ele === 'pyro'
          ? 2.0
          : 1.5
    const emVal = hitUiData.get(input.total.eleMas).value
    const emBonus = emVal > 0 ? ((25 / 9) * emVal) / (emVal + 1400) : 0
    const reactDmgRead = (input.total as Record<string, NumNode>)[
      `${reaction}_dmg_`
    ]
    const reactDmgBonus = reactDmgRead
      ? hitUiData.get(reactDmgRead).value
      : 0
    reactionContributors.push(
      {
        category: 'character',
        sourceKey: targetKey,
        label: `${reaction === 'melt' ? 'Melt' : 'Vaporize'} Base Multiplier`,
        value: baseAmp,
        unit: '',
        note: `${baseAmp.toFixed(1)}×`,
      },
      {
        category: 'character',
        sourceKey: targetKey,
        label: `Elemental Mastery Bonus (${Math.round(emVal)} EM)`,
        value: emBonus,
        unit: '%',
      }
    )
    if (Math.abs(reactDmgBonus) > 1e-6 && reactDmgRead) {
      reactionContributors.push(
        ...collectAdditiveContributors(hitUiData.get(reactDmgRead), ctx, '%')
      )
    }
  } else {
    reactionContributors.push({
      category: 'character',
      sourceKey: targetKey,
      label: 'No Amplifying Reaction',
      value: 1,
      unit: '',
    })
  }

  // 5. Enemy DEF Multiplier contributors
  const charLvl = hitUiData.get(input.lvl).value
  const enemyLvl = hitUiData.get(input.enemy.level).value
  const defRedNode = hitUiData.get(input.enemy.defRed)
  const defIgnNode = hitUiData.get(input.enemy.defIgn)
  const enemyDefContributors: BreakdownContributor[] = [
    {
      category: 'character',
      sourceKey: targetKey,
      label: `Character Level (Lv. ${Math.round(charLvl)})`,
      value: charLvl,
      unit: '',
    },
    {
      category: 'enemy',
      sourceKey: 'Enemy',
      label: `Enemy Level (Lv. ${Math.round(enemyLvl)})`,
      value: enemyLvl,
      unit: '',
    },
  ]
  if (Math.abs(defRedNode.value) > 1e-6) {
    enemyDefContributors.push(
      ...collectAdditiveContributors(defRedNode, ctx, '%')
    )
  }
  if (Math.abs(defIgnNode.value) > 1e-6) {
    enemyDefContributors.push(
      ...collectAdditiveContributors(defIgnNode, ctx, '%')
    )
  }

  // 6. Enemy RES Multiplier contributors
  const enemyResRead = (input.total as Record<string, NumNode>)[
    `${ele}_enemyRes_`
  ]
  const enemyResNode = enemyResRead
    ? hitUiData.get(enemyResRead)
    : undefined
  const enemyResContributors = enemyResNode
    ? collectAdditiveContributors(enemyResNode, ctx, '%', {
        isEnemyStat: true,
      })
    : [
        {
          category: 'enemy' as const,
          sourceKey: 'Enemy',
          label: 'Enemy Base RES',
          value: 0.1,
          unit: '%' as const,
        },
      ]

  const factors: DamageFactorGroup[] = [
    {
      key: 'baseDamage',
      label:
        outerMulti !== 1
          ? `Base Damage (×${outerMulti} Multi-Hit)`
          : 'Base Damage',
      value: basePlusFlat * outerMulti,
      unit: '',
      formulaSummary:
        Math.abs(dmgInc) > 1e-6
          ? `${Math.round(baseDmg).toLocaleString()} + ${Math.round(dmgInc).toLocaleString()}`
          : `${Math.round(baseDmg).toLocaleString()}`,
      contributors: baseContributors,
    },
    {
      key: 'dmgBonus',
      label: 'DMG Bonus Multiplier',
      value: dmgBonusMulti,
      unit: '×',
      formulaSummary: `1 + ${(dmgBonus * 100).toFixed(1)}%`,
      contributors: dmgBonusContributors,
    },
    {
      key: 'crit',
      label: `Crit Multiplier (${hitMode})`,
      value: critMulti,
      unit: '×',
      formulaSummary:
        hitMode === 'critHit'
          ? `1 + ${(critDMG * 100).toFixed(1)}%`
          : hitMode === 'avgHit'
            ? `1 + ${(critRate * 100).toFixed(1)}% × ${(critDMG * 100).toFixed(1)}%`
            : '1.00× (Non-Crit)',
      contributors: critContributors,
    },
    {
      key: 'reaction',
      label: 'Reaction Multiplier',
      value: ampMulti,
      unit: '×',
      formulaSummary: `${ampMulti.toFixed(3)}×`,
      contributors: reactionContributors,
    },
    {
      key: 'enemyDef',
      label: 'Enemy DEF Multiplier',
      value: defMulti,
      unit: '×',
      formulaSummary: `Lv.${Math.round(charLvl)} vs Lv.${Math.round(enemyLvl)} (${(defMulti * 100).toFixed(1)}%)`,
      contributors: enemyDefContributors,
    },
    {
      key: 'enemyRes',
      label: `Enemy ${displayName(ele)} RES Multiplier`,
      value: resMulti,
      unit: '×',
      formulaSummary: `Net RES ${((enemyResNode?.value ?? 0.1) * 100).toFixed(1)}% → ${(resMulti * 100).toFixed(1)}%`,
      contributors: enemyResContributors,
    },
  ]

  return {
    element: ele,
    move,
    hitMode,
    reaction,
    baseDmg,
    dmgInc,
    basePlusFlat,
    dmgBonus,
    dmgBonusMulti,
    critRate,
    critDMG,
    critMulti,
    ampMulti,
    defMulti,
    resMulti,
    outerMulti,
    reconciledPerHit,
    reconciledSubtotal,
    factors,
  }
}

const EXCLUDED_FULL_DAMAGE_SECTIONS = new Set<string>([
  'basic',
  'character',
  'bonusStats',
  'custom',
  'teamBuff',
  'moonsign',
])

const FULL_DAMAGE_SECTION_LABELS: Record<string, string> = {
  normal: 'Normal Attack',
  charged: 'Charged Attack',
  plunging: 'Plunging Attack',
  skill: 'Elemental Skill',
  burst: 'Elemental Burst',
  sprint: 'Alternate Sprint',
  passive: 'Passive',
  passive1: 'Ascension 1 Passive',
  passive2: 'Ascension 4 Passive',
  passive3: 'Utility Passive',
  lockedPassive: 'Locked Passive',
  constellation1: 'Constellation 1',
  constellation2: 'Constellation 2',
  constellation3: 'Constellation 3',
  constellation4: 'Constellation 4',
  constellation5: 'Constellation 5',
  constellation6: 'Constellation 6',
  reaction: 'Transformative Reactions',
  nicole: "Nicole's Astral Projections",
}

function prettifyFormulaIdentifier(rawKey: string): string {
  const spaced = rawKey
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
  return spaced.replace(/\bDmg\b/g, 'DMG').replace(/\bAtk\b/g, 'ATK')
}

export function resolveFullDamageSectionLabel(sectionKey: string): string {
  if (FULL_DAMAGE_SECTION_LABELS[sectionKey]) {
    return FULL_DAMAGE_SECTION_LABELS[sectionKey]!
  }
  if (sectionKey.startsWith('weapon:')) {
    const wKey = sectionKey.slice(7)
    return displayName(wKey)
  }
  if (sectionKey.startsWith('artifact:')) {
    const setKey = sectionKey.slice(9)
    return displayName(setKey)
  }
  return prettifyFormulaIdentifier(sectionKey)
}

function extractNodeInfoText(node: unknown, fallback = ''): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (node && typeof node === 'object') {
    const props = (node as { props?: Record<string, unknown> }).props
    if (props) {
      if (typeof props.key18 === 'string') {
        const ns = typeof props.ns === 'string' ? props.ns : 'sheet'
        const k = props.key18
        const vals = props.values as Record<string, unknown> | undefined
        let tmpl = translateGOKey(ns, k, vals)
        if (tmpl !== undefined) {
          if (vals && typeof vals === 'object') {
            for (const [vk, vv] of Object.entries(vals)) {
              const renderedVal = extractNodeInfoText(vv, String(vv))
              tmpl = tmpl.replaceAll(`{{${vk}}}`, renderedVal)
            }
          }
          const cleaned = tmpl
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          if (cleaned) return cleaned
        }
        return fallback
      }
      if (props.children !== undefined) {
        if (Array.isArray(props.children)) {
          return props.children
            .map((c) => extractNodeInfoText(c, ''))
            .filter(Boolean)
            .join(' ')
        }
        return extractNodeInfoText(props.children, fallback)
      }
    }
  }
  return fallback
}

function resolveFullDamageFormulaLabel(
  sectionKey: string,
  formulaKey: string,
  calcRes: CalcResult<number>,
  rotationLabelByPath: ReadonlyMap<string, string>
): string {
  const fromInfoName = extractNodeInfoText(
    (calcRes.info as { name?: unknown } | undefined)?.name,
    ''
  )
  if (fromInfoName) return fromInfoName

  const infoPath = calcRes.info?.path
  if (infoPath) {
    const fromKeyMap = KeyMap.getStr(infoPath)
    if (fromKeyMap) return fromKeyMap
  }

  const fromRotation = rotationLabelByPath.get(`${sectionKey}.${formulaKey}`)
  if (fromRotation) {
    const stripped = fromRotation.replace(
      /^(?:Normal|Charged|Plunging|Plunge|Skill|Burst|Passive|Ascension\s*[14]|Constellation\s*[1-6]|C[1-6])\s*[—–-]\s*/i,
      ''
    )
    return stripped || fromRotation
  }

  if (sectionKey === 'plunging') {
    if (formulaKey === 'dmg') return 'Plunge DMG'
    if (formulaKey === 'low') return 'Low Plunge DMG'
    if (formulaKey === 'high') return 'High Plunge DMG'
  }

  if (/^\d+$/.test(formulaKey)) {
    return `${Number(formulaKey) + 1}-Hit DMG`
  }

  const hitSingleMatch = formulaKey.match(/^hit(\d+)$/i)
  if (hitSingleMatch) {
    return `${hitSingleMatch[1]}-Hit DMG`
  }

  const hitMultiMatch = formulaKey.match(/^hit(\d)(\d)$/i)
  if (hitMultiMatch) {
    return `${hitMultiMatch[1]}-${hitMultiMatch[2]} Hit DMG`
  }

  if (formulaKey === 'dmg') {
    if (sectionKey === 'charged') return 'Charged Attack DMG'
    if (sectionKey === 'skill') return 'Skill DMG'
    if (sectionKey === 'burst') return 'Burst DMG'
    return 'DMG'
  }

  return prettifyFormulaIdentifier(formulaKey)
}

function isPercentageOrNonDamageFormulaNode(
  sectionKey: string,
  formulaKey: string,
  calcRes: CalcResult<number>,
  hasHitUiData: boolean
): boolean {
  const info = calcRes.info
  if (info?.isTeamBuff) return true
  if (info?.unit === '%' || info?.unit === 's') return true
  if (info?.path) {
    if (info.path.endsWith('_')) {
      return true
    }
    if (
      sectionKey !== 'reaction' &&
      (info.path.endsWith('_dmgInc') ||
        info.path.endsWith('_reactionDmgInc') ||
        info.path.endsWith('_directDmgInc') ||
        info.path === 'healInc' ||
        info.path === 'all_dmgInc' ||
        info.path === 'atk' ||
        info.path === 'hp' ||
        info.path === 'def' ||
        info.path === 'eleMas')
    ) {
      return true
    }
  }
  if (formulaKey.endsWith('_')) return true
  if (
    sectionKey !== 'reaction' &&
    (formulaKey.endsWith('_dmgInc') ||
      formulaKey.endsWith('DmgBonus') ||
      formulaKey === 'energyGen' ||
      formulaKey === 'energyRestore')
  ) {
    return true
  }
  // Unlabelled percentage decimals (< 1) in passive/constellation/skill sections whose `{ unit: '%' }`
  // was stripped from `fields: [...]` at bundle time are stat buffs, not flat damage/heal/shield hits.
  if (!hasHitUiData && sectionKey !== 'reaction' && Math.abs(calcRes.value) < 1) {
    return true
  }
  return false
}

function findHitUiDataForFormula(
  uiData: UIData,
  node: NumNode | StrNode | undefined,
  visited = new Set<object>()
): UIData | undefined {
  if (!node || typeof node !== 'object' || !('operation' in node)) {
    return undefined
  }
  if (visited.has(node)) return undefined
  visited.add(node)

  if (node.operation === 'data') {
    const dataNode = node as DataNode<NumNode | StrNode>
    const parent = dataNode.reset ? uiData.origin : uiData
    const childUiData = parent.child(dataNode.data)
    const topData: Data | undefined = childUiData.data[0]
    if (
      topData &&
      topData.hit &&
      (topData.hit as Record<string, unknown>).base
    ) {
      return childUiData
    }
    const inner = findHitUiDataForFormula(
      childUiData,
      dataNode.operands?.[0] as NumNode | StrNode | undefined,
      new Set()
    )
    if (inner) return inner
    return findHitUiData(childUiData)
  }

  if (node.operation === 'threshold') {
    const [valueNode, thresholdNode, pass, fail] =
      (node.operands as Array<NumNode | StrNode | undefined>) ?? []
    if (valueNode && thresholdNode) {
      const v = uiData.get(valueNode as NumNode).value
      const t = uiData.get(thresholdNode as NumNode).value
      const activeBranch = v >= t ? pass : fail
      return findHitUiDataForFormula(uiData, activeBranch, visited)
    }
  }

  if (node.operation === 'match') {
    const [v1Node, v2Node, matchNode, unmatchNode] =
      (node.operands as Array<NumNode | StrNode | undefined>) ?? []
    if (v1Node && v2Node) {
      const v1 = uiData.get(v1Node as NumNode).value
      const v2 = uiData.get(v2Node as NumNode).value
      const activeBranch = v1 === v2 ? matchNode : unmatchNode
      return findHitUiDataForFormula(uiData, activeBranch, visited)
    }
  }

  if (node.operation === 'lookup') {
    const lookupNode = node as {
      operands?: Array<NumNode | StrNode | undefined>
      table?: Record<string, NumNode | StrNode | undefined>
    }
    const keyNode = lookupNode.operands?.[0]
    const keyVal = keyNode
      ? (uiData.get(keyNode as StrNode).value as string | undefined)
      : undefined
    const selected =
      (keyVal !== undefined ? lookupNode.table?.[keyVal] : undefined) ??
      lookupNode.operands?.[1]
    return findHitUiDataForFormula(uiData, selected, visited)
  }

  if (node.operation === 'read') {
    const readNode = node as { path?: readonly string[] }
    if (readNode.path) {
      for (const d of uiData.data) {
        const target = objPathValue(d, readNode.path) as
          | NumNode
          | StrNode
          | undefined
        const found = findHitUiDataForFormula(uiData, target, visited)
        if (found) return found
      }
    }
    return undefined
  }

  for (const op of node.operands ?? []) {
    const found = findHitUiDataForFormula(
      uiData,
      op as NumNode | StrNode,
      visited
    )
    if (found) return found
  }
  return undefined
}

function buildNonHitFormulaBreakdown(opts: {
  ctx: BreakdownWalkContext
  sectionKey: string
  formulaKey: string
  label: string
  perHit: number
  calcRes: CalcResult<number>
}): DamageRowBreakdown {
  const { ctx, sectionKey, formulaKey, label, perHit, calcRes } = opts
  const { targetKey, targetUiData } = ctx

  const hitMode =
    (targetUiData.get(input.hit.hitMode).value as string) || 'avgHit'
  const charEle =
    (targetUiData.get(input.charEle).value as string) || 'physical'

  // Determine reaction/element resist when present
  const swirlMatch = formulaKey.match(/^(pyro|hydro|electro|cryo)Swirl$/)
  const transMeta = (
    transformativeReactions as Record<
      string,
      { resist?: string; canCrit?: boolean } | undefined
    >
  )[formulaKey]
  const variant = calcRes.info?.variant
  const variantMeta = variant
    ? (
        transformativeReactions as Record<
          string,
          { resist?: string; canCrit?: boolean } | undefined
        >
      )[variant]
    : undefined

  let ele =
    swirlMatch?.[1] ??
    transMeta?.resist ??
    variantMeta?.resist ??
    (variant &&
    (allElementWithPhyKeys as readonly string[]).includes(variant)
      ? variant
      : charEle)

  const resOp =
    calcRes.meta.op === 'mul'
      ? calcRes.meta.ops.find((op) => op.meta.op === 'res')
      : undefined
  const resMultiRead = (input.enemy as Record<string, NumNode>)[
    `${ele}_resMulti_`
  ]
  const resMultiNode = resMultiRead
    ? targetUiData.get(resMultiRead)
    : undefined
  const resMulti = resOp
    ? resOp.value
    : sectionKey === 'reaction' &&
        resMultiNode &&
        Number.isFinite(resMultiNode.value)
      ? resMultiNode.value
      : 1

  const enemyResRead = (input.total as Record<string, NumNode>)[
    `${ele}_enemyRes_`
  ]
  const enemyResNode = enemyResRead
    ? targetUiData.get(enemyResRead)
    : undefined
  const enemyResContributors =
    resOp || sectionKey === 'reaction'
      ? enemyResNode
        ? collectAdditiveContributors(enemyResNode, ctx, '%', {
            isEnemyStat: true,
          })
        : [
            {
              category: 'enemy' as const,
              sourceKey: 'Enemy',
              label: 'Enemy Base RES',
              value: 0.1,
              unit: '%' as const,
            },
          ]
      : []

  const baseDmg = resMulti > 0 ? perHit / resMulti : perHit
  const reconciledPerHit = baseDmg * resMulti

  if (!resOp && sectionKey !== 'reaction') {
    ele = variant === 'heal' ? 'heal' : charEle
  }

  const factors: DamageFactorGroup[] = [
    {
      key: 'baseDamage',
      label: sectionKey === 'reaction' ? 'Base Reaction DMG' : 'Base Value',
      value: baseDmg,
      unit: '',
      formulaSummary: `${Math.round(baseDmg).toLocaleString()}`,
      contributors: [
        {
          category: 'character',
          sourceKey: targetKey,
          label: `${displayName(targetKey)} (${label})`,
          value: baseDmg,
          unit: '',
        },
      ],
    },
    {
      key: 'dmgBonus',
      label: 'DMG Bonus Multiplier',
      value: 1,
      unit: '×',
      formulaSummary: '1.000×',
      contributors: [],
    },
    {
      key: 'crit',
      label: `Crit Multiplier (${hitMode})`,
      value: 1,
      unit: '×',
      formulaSummary: '1.000×',
      contributors: [],
    },
    {
      key: 'reaction',
      label: 'Reaction Multiplier',
      value: 1,
      unit: '×',
      formulaSummary: '1.000×',
      contributors: [],
    },
    {
      key: 'enemyDef',
      label: 'Enemy DEF Multiplier',
      value: 1,
      unit: '×',
      formulaSummary: '1.000× (Ignores DEF)',
      contributors: [],
    },
    {
      key: 'enemyRes',
      label: `Enemy ${displayName(ele)} RES Multiplier`,
      value: resMulti,
      unit: '×',
      formulaSummary:
        resOp || sectionKey === 'reaction'
          ? `Net RES ${((enemyResNode?.value ?? 0.1) * 100).toFixed(1)}% → ${(resMulti * 100).toFixed(1)}%`
          : '1.000×',
      contributors: enemyResContributors,
    },
  ]

  return {
    element: ele,
    move: sectionKey,
    hitMode,
    reaction: sectionKey === 'reaction' ? formulaKey : undefined,
    baseDmg,
    dmgInc: 0,
    basePlusFlat: baseDmg,
    dmgBonus: 0,
    dmgBonusMulti: 1,
    critRate: 0,
    critDMG: 0,
    critMulti: 1,
    ampMulti: 1,
    defMulti: 1,
    resMulti,
    outerMulti: 1,
    reconciledPerHit,
    reconciledSubtotal: reconciledPerHit,
    factors,
  }
}

export function extractFullDamageSections(opts: {
  preset: Preset
  targetUiData: UIData
  calc: Partial<Record<CharacterKey, { target: UIData }>>
  targetKey: CharacterKey
  teamKeys: CharacterKey[]
  targetWeaponKey?: string
}): FullDamageSection[] {
  const { preset, targetUiData, calc, targetKey, teamKeys, targetWeaponKey } =
    opts

  const ctx: BreakdownWalkContext = {
    targetKey,
    targetWeaponKey,
    teamKeys,
    calc,
    targetUiData,
  }

  const targetMember =
    preset.team.find((m) => m.key === targetKey) ?? preset.team[0]
  const defaultHitMode = targetMember?.hitMode ?? 'avgHit'
  const defaultReaction = targetMember?.reaction

  const rotationLabelByPath = new Map<string, string>()
  for (const rt of preset.rotation.targets) {
    const owner = resolveRotationTargetOwner(rt, preset)
    if (owner.memberKey === targetKey && rt.label && owner.normPath.length >= 2) {
      const key = `${owner.normPath[0]}.${owner.normPath[1]}`
      if (!rotationLabelByPath.has(key)) {
        rotationLabelByPath.set(key, rt.label)
      }
    }
  }

  const display = targetUiData.getDisplay()
  const sections: FullDamageSection[] = []

  for (const [sectionKey, secObj] of Object.entries(display)) {
    if (EXCLUDED_FULL_DAMAGE_SECTIONS.has(sectionKey)) continue
    if (!secObj || typeof secObj !== 'object') continue

    const formulas: FullDamageFormulaEntry[] = []
    for (const [formulaKey, rawCalcRes] of Object.entries(
      secObj as Record<string, CalcResult<number> | undefined>
    )) {
      if (
        !rawCalcRes ||
        typeof rawCalcRes.value !== 'number' ||
        !Number.isFinite(rawCalcRes.value)
      ) {
        continue
      }
      if (rawCalcRes.isEmpty) continue
      if (Math.abs(rawCalcRes.value) <= 1e-9) continue

      let formulaNode: NumNode | undefined
      for (const d of targetUiData.data) {
        const candidate = objPathValue(d, [
          'display',
          sectionKey,
          formulaKey,
        ]) as NumNode | undefined
        if (candidate) {
          formulaNode = candidate
          break
        }
      }

      const hitUiData = findHitUiDataForFormula(targetUiData, formulaNode)
      if (
        isPercentageOrNonDamageFormulaNode(
          sectionKey,
          formulaKey,
          rawCalcRes,
          Boolean(hitUiData)
        )
      ) {
        continue
      }

      const label = resolveFullDamageFormulaLabel(
        sectionKey,
        formulaKey,
        rawCalcRes,
        rotationLabelByPath
      )
      const value = rawCalcRes.value

      const breakdown = hitUiData
        ? buildHitUiDataBreakdown({
            hitUiData,
            ctx,
            perHit: value,
            count: 1,
            repeat: 1,
            fallbackMove: sectionKey,
            fallbackHitMode: defaultHitMode,
            fallbackReaction: defaultReaction,
          })
        : buildNonHitFormulaBreakdown({
            ctx,
            sectionKey,
            formulaKey,
            label,
            perHit: value,
            calcRes: rawCalcRes,
          })

      formulas.push({
        key: formulaKey,
        sectionKey,
        path: [sectionKey, formulaKey],
        label,
        value,
        element: breakdown.element,
        move: breakdown.move,
        hitMode: breakdown.hitMode,
        reaction: breakdown.reaction,
        breakdown,
      })
    }

    if (formulas.length > 0) {
      sections.push({
        sectionKey,
        label: resolveFullDamageSectionLabel(sectionKey),
        formulas,
      })
    }
  }

  return sections
}
