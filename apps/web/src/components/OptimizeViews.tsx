'use client'

import {
  deriveCandidateTargetConditionalsEntry,
  renderConditionalRow,
} from '@/components/ConditionalTogglePanel'
import {
  ArtifactBadge,
  ArtifactPieceRow,
  CharacterBadge,
  RotationHitModeBadge,
  RotationReactionBadge,
  StatChip,
  WeaponBadge,
} from '@/components/Identifier'
import { WeaponTilePicker } from '@/components/TilePickers'
import {
  DownloadIcon,
  ElementIcon,
  SetEmblemIcon,
  SlotIcon,
  StatIcon,
  TrashIcon,
  WeaponTypeIcon,
} from '@/components/SvgIcons'
import { getCatalogInWorker } from '@/lib/engine/workerClient'
import { shortStatLabel } from '@/lib/itemMeta'
import {
  WEAPON_COMPARE_TOP_N,
  type ArtifactSlot,
  type BreakdownContributor,
  type BreakdownSourceCategory,
  type BuildSelection,
  type ConditionalDescriptor,
  type DamageRowBreakdown,
  type OptimizerSettings,
  type RotationResult,
  type StatBreakdown,
  type TeamOptimizeResult,
  type WeaponCompareBuildEntry,
  type WeaponCompareCandidate,
  type WeaponCompareResult,
  type WeaponCompareRowResult,
} from '@gi/engine'
import {
  ALL_SUBSTAT_KEYS,
  ART_SLOT_MAIN_KEYS,
  type IArtifact,
  type IGOOD,
  type ParseIssue,
} from '@gi/good'
import {
  cloneMemberConditionalsMap,
  displayName,
  getCharacterMeta,
  getPresetConditionalOverrides,
  getWeaponMeta,
  isPercentStatConstraintKey,
  listWeaponsForType,
  resetSolverPoolFilters,
  resolveRotationTargetOwner,
  seedCandidateTargetConditionals,
  STAT_CONSTRAINT_KEYS,
  summarizeSolverPoolFilters,
  VARIABLE_MAIN_STAT_SLOTS,
  type IdentifierSlotKey,
  type MainStatAllowlistMap,
  type MemberConditionalsMap,
  type Preset,
  type RequiredSubstatsMode,
  type StatConstraint,
  type StatConstraintKey,
  type VariableMainStatSlotKey,
} from '@gi/presets'
import { Fragment, useEffect, useMemo, useState } from 'react'

export const OPTIMIZE_SLOTS: ArtifactSlot[] = [
  'flower',
  'plume',
  'sands',
  'goblet',
  'circlet',
]

export const CORE_RESULT_STAT_KEYS = [
  'hp',
  'atk',
  'def',
  'eleMas',
  'enerRech_',
  'critRate_',
  'critDMG_',
] as const

export type CoreResultStatKey = (typeof CORE_RESULT_STAT_KEYS)[number]

export const CORE_STAT_DIFF_LABELS: Record<CoreResultStatKey, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  eleMas: 'EM',
  enerRech_: 'ER',
  critRate_: 'CR',
  critDMG_: 'CD',
}

export const EXTENDED_BONUS_STAT_KEYS = [
  'pyro_dmg_',
  'hydro_dmg_',
  'electro_dmg_',
  'cryo_dmg_',
  'anemo_dmg_',
  'geo_dmg_',
  'dendro_dmg_',
  'physical_dmg_',
  'normal_dmg_',
  'charged_dmg_',
  'plunging_dmg_',
  'skill_dmg_',
  'burst_dmg_',
] as const

export type ExtendedBonusStatKey = (typeof EXTENDED_BONUS_STAT_KEYS)[number]

export const EXTENDED_BONUS_STAT_LABELS: Record<ExtendedBonusStatKey, string> =
  {
    pyro_dmg_: 'Pyro DMG Bonus',
    hydro_dmg_: 'Hydro DMG Bonus',
    electro_dmg_: 'Electro DMG Bonus',
    cryo_dmg_: 'Cryo DMG Bonus',
    anemo_dmg_: 'Anemo DMG Bonus',
    geo_dmg_: 'Geo DMG Bonus',
    dendro_dmg_: 'Dendro DMG Bonus',
    physical_dmg_: 'Physical DMG Bonus',
    normal_dmg_: 'Normal DMG Bonus',
    charged_dmg_: 'Charged DMG Bonus',
    plunging_dmg_: 'Plunging DMG Bonus',
    skill_dmg_: 'Skill DMG Bonus',
    burst_dmg_: 'Burst DMG Bonus',
  }

export interface CoreStatComparisonFormatted {
  currentText: string | null
  buildText: string
  diffText: string | null
  asciiDiffText: string | null
  rawDiffText?: string | null
  asciiRawDiffText?: string | null
  sign: '+' | '-' | '0' | null
  cls: 'ok' | 'error' | 'muted'
}

export function formatCoreStatComparison(
  statKey: CoreResultStatKey | ExtendedBonusStatKey | string,
  buildRaw: number,
  currentRaw?: number
): CoreStatComparisonFormatted {
  const isPct = statKey.endsWith('_')
  const safeBuild = Number.isFinite(buildRaw) ? buildRaw : 0

  if (isPct) {
    const buildTenths = Math.round(safeBuild * 1000) / 10
    const buildText = `${buildTenths.toFixed(1)}%`

    if (currentRaw === undefined || !Number.isFinite(currentRaw)) {
      return {
        currentText: null,
        buildText,
        diffText: null,
        asciiDiffText: null,
        sign: null,
        cls: 'muted',
      }
    }

    const currTenths = Math.round(currentRaw * 1000) / 10
    const currentText = `${currTenths.toFixed(1)}%`
    const diffTenths = Math.round((buildTenths - currTenths) * 10) / 10

    if (Math.abs(diffTenths) < 0.05) {
      return {
        currentText,
        buildText,
        diffText: '0.0%',
        asciiDiffText: '0.0%',
        sign: '0',
        cls: 'muted',
      }
    }
    if (diffTenths > 0) {
      const val = `+${diffTenths.toFixed(1)}%`
      return {
        currentText,
        buildText,
        diffText: val,
        asciiDiffText: val,
        sign: '+',
        cls: 'ok',
      }
    }
    const abs = Math.abs(diffTenths).toFixed(1)
    return {
      currentText,
      buildText,
      diffText: `−${abs}%`,
      asciiDiffText: `-${abs}%`,
      sign: '-',
      cls: 'muted',
    }
  }

  const buildInt = Math.round(safeBuild)
  const buildText = buildInt.toLocaleString()

  if (currentRaw === undefined || !Number.isFinite(currentRaw)) {
    return {
      currentText: null,
      buildText,
      diffText: null,
      asciiDiffText: null,
      rawDiffText: null,
      asciiRawDiffText: null,
      sign: null,
      cls: 'muted',
    }
  }

  const currInt = Math.round(currentRaw)
  const currentText = currInt.toLocaleString()
  const diffInt = buildInt - currInt

  const rawDiffText =
    diffInt === 0
      ? '0'
      : diffInt > 0
        ? `+${diffInt.toLocaleString()}`
        : `−${Math.abs(diffInt).toLocaleString()}`
  const asciiRawDiffText =
    diffInt === 0
      ? '0'
      : diffInt > 0
        ? `+${diffInt.toLocaleString()}`
        : `-${Math.abs(diffInt).toLocaleString()}`

  if (currInt <= 0) {
    if (diffInt === 0) {
      return {
        currentText,
        buildText,
        diffText: '0',
        asciiDiffText: '0',
        rawDiffText,
        asciiRawDiffText,
        sign: '0',
        cls: 'muted',
      }
    }
    if (diffInt > 0) {
      return {
        currentText,
        buildText,
        diffText: rawDiffText,
        asciiDiffText: asciiRawDiffText,
        rawDiffText,
        asciiRawDiffText,
        sign: '+',
        cls: 'ok',
      }
    }
    return {
      currentText,
      buildText,
      diffText: rawDiffText,
      asciiDiffText: asciiRawDiffText,
      rawDiffText,
      asciiRawDiffText,
      sign: '-',
      cls: 'muted',
    }
  }

  if (diffInt === 0) {
    return {
      currentText,
      buildText,
      diffText: '0.0%',
      asciiDiffText: '0.0%',
      rawDiffText,
      asciiRawDiffText,
      sign: '0',
      cls: 'muted',
    }
  }
  if (diffInt > 0) {
    const pct = ((diffInt / currInt) * 100).toFixed(1)
    const val = `+${pct}%`
    return {
      currentText,
      buildText,
      diffText: val,
      asciiDiffText: val,
      rawDiffText,
      asciiRawDiffText,
      sign: '+',
      cls: 'ok',
    }
  }
  const absPct = ((Math.abs(diffInt) / currInt) * 100).toFixed(1)
  return {
    currentText,
    buildText,
    diffText: `−${absPct}%`,
    asciiDiffText: `-${absPct}%`,
    rawDiffText,
    asciiRawDiffText,
    sign: '-',
    cls: 'muted',
  }
}

export const STAT_PICKER_OPTIONS: ReadonlyArray<{
  key: StatConstraintKey
  label: string
  isPercent: boolean
}> = [
  { key: 'hp', label: 'HP', isPercent: false },
  { key: 'atk', label: 'ATK', isPercent: false },
  { key: 'def', label: 'DEF', isPercent: false },
  { key: 'eleMas', label: 'EM', isPercent: false },
  { key: 'enerRech_', label: 'ER', isPercent: true },
  { key: 'critRate_', label: 'CRIT Rate', isPercent: true },
  { key: 'critDMG_', label: 'CRIT DMG', isPercent: true },
  { key: 'heal_', label: 'Healing', isPercent: true },
  { key: 'pyro_dmg_', label: 'Pyro DMG', isPercent: true },
  { key: 'hydro_dmg_', label: 'Hydro DMG', isPercent: true },
  { key: 'electro_dmg_', label: 'Electro DMG', isPercent: true },
  { key: 'cryo_dmg_', label: 'Cryo DMG', isPercent: true },
  { key: 'anemo_dmg_', label: 'Anemo DMG', isPercent: true },
  { key: 'geo_dmg_', label: 'Geo DMG', isPercent: true },
  { key: 'dendro_dmg_', label: 'Dendro DMG', isPercent: true },
  { key: 'physical_dmg_', label: 'Physical DMG', isPercent: true },
]

function formatNum(n: number): string {
  return Math.round(n).toLocaleString()
}

const FORMULA_SECTION_LABELS: Record<string, string> = {
  normal: 'Normal Attack',
  charged: 'Charged Attack',
  plunging: 'Plunging Attack',
  skill: 'Elemental Skill',
  burst: 'Elemental Burst',
  passive1: 'Ascension 1 Passive',
  passive2: 'Ascension 4 Passive',
  passive3: 'Utility Passive',
  constellation1: 'Constellation 1',
  constellation2: 'Constellation 2',
  constellation3: 'Constellation 3',
  constellation4: 'Constellation 4',
  constellation5: 'Constellation 5',
  constellation6: 'Constellation 6',
}

export function humanizeFormulaPath(path: readonly string[]): string {
  if (!path || path.length === 0) return 'Damage Hit'
  const section = path[0] ?? ''
  const key = path.slice(1).join(' ')
  const secLabel =
    FORMULA_SECTION_LABELS[section] ??
    section
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b([a-z])/g, (m) => m.toUpperCase())
  if (!key) return secLabel || 'Damage Hit'
  if (/^\d+$/.test(key)) {
    return `${secLabel} — ${Number(key) + 1}-Hit DMG`
  }
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bDmg\b/g, 'DMG')
  return `${secLabel} — ${spaced}`
}

const RAW_FORMULA_PATH_RE =
  /^(?:normal|charged|plunging|skill|burst|passive[123]|constellation[1-6])(?:\.[a-z0-9_]+)+$/i

const REDUNDANT_ROTATION_PAREN_CLAUSE_RE =
  /^(?:(?:melt|vaporize|vape|spread|aggravate|overloaded|overload|electro[-\s]?charged|superconduct|swirl|shattered|crystallize|burgeon|hyperbloom|lunar[-\s]?(?:charged|bloom|crystallize)|no[-\s]?reaction|raw|unreacted)(?:\s+(?:[×x]\s*\d+|\d+\s*[×x]\s*\d+|\d+\s*hits?))?|(?:normal\s+)?(?:[×x]\s*\d+|\d+\s*[×x]\s*\d+|\d+\s*hits?))$/i

export function formatRotationRowLabel(
  label?: string,
  fallbackPath?: readonly string[]
): string {
  const trimmed = (label ?? '').trim()
  if (!trimmed) {
    return fallbackPath && fallbackPath.length > 0
      ? humanizeFormulaPath(fallbackPath)
      : 'Damage Hit'
  }
  if (
    (fallbackPath && trimmed === fallbackPath.join('.')) ||
    RAW_FORMULA_PATH_RE.test(trimmed)
  ) {
    return humanizeFormulaPath(
      fallbackPath && fallbackPath.length > 0
        ? fallbackPath
        : trimmed.split('.')
    )
  }
  const match = trimmed.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  if (!match) return trimmed
  const base = match[1]!.trim()
  const inner = match[2]!.trim()
  if (!base || !inner) return trimmed
  if (RAW_FORMULA_PATH_RE.test(inner)) {
    return base
  }
  const clauses = inner
    .split(/\s*[,/;·]\s*/)
    .map((c) => c.trim())
    .filter(Boolean)
  if (
    clauses.length > 0 &&
    clauses.every((clause) => REDUNDANT_ROTATION_PAREN_CLAUSE_RE.test(clause))
  ) {
    return base
  }
  return trimmed
}

export interface PlainParseIssue {
  entryLabel: string
  description: string
  fullText: string
}

const FIELD_PLAIN_LABELS: Record<string, string> = {
  key: 'name',
  setKey: 'artifact set',
  slotKey: 'slot',
  mainStatKey: 'main stat',
  rarity: 'rarity',
  level: 'level',
  ascension: 'ascension',
  constellation: 'constellation',
  refinement: 'refinement',
  location: 'equipped character',
  id: 'ID',
  substats: 'substats',
  'talent.auto': 'Normal Attack talent',
  'talent.skill': 'Elemental Skill talent',
  'talent.burst': 'Elemental Burst talent',
}

export function formatParseIssuePlain(issue: ParseIssue): PlainParseIssue {
  const rawPath = (issue.path ?? '').trim()
  let entryLabel = 'File'
  let fieldContext = ''

  const subMatch = rawPath.match(
    /^artifacts\[(\d+)\]\.substats\[(\d+)\](?:\.([a-zA-Z0-9_.]+))?$/
  )
  const itemMatch = rawPath.match(
    /^(artifacts|weapons|characters)\[(\d+)\](?:\.([a-zA-Z0-9_.]+))?$/
  )

  if (subMatch) {
    const artNum = Number(subMatch[1]) + 1
    const subNum = Number(subMatch[2]) + 1
    entryLabel = `Artifact #${artNum}`
    fieldContext = `substat #${subNum}`
  } else if (itemMatch) {
    const kind = itemMatch[1]!
    const idx = Number(itemMatch[2]) + 1
    const field = itemMatch[3] ?? ''
    const noun =
      kind === 'artifacts'
        ? 'Artifact'
        : kind === 'weapons'
          ? 'Weapon'
          : 'Character'
    entryLabel = `${noun} #${idx}`
    if (field) {
      fieldContext = FIELD_PLAIN_LABELS[field] ?? field
    }
  } else if (rawPath === 'root' || !rawPath) {
    entryLabel = 'File'
  } else if (rawPath === 'format') {
    entryLabel = 'File format'
  } else if (rawPath === 'version') {
    entryLabel = 'File version'
  } else if (rawPath === 'source') {
    entryLabel = 'Scanner source'
  } else if (/^line\s+\d+/i.test(rawPath)) {
    entryLabel = rawPath.replace(/^line/i, 'Line').replace(/col\b/i, 'column')
  } else if (
    rawPath === 'characters' ||
    rawPath === 'weapons' ||
    rawPath === 'artifacts'
  ) {
    entryLabel = `${rawPath[0]!.toUpperCase()}${rawPath.slice(1)} list`
  } else {
    entryLabel = rawPath
  }

  let desc = issue.message.trim()
  const invalidSubstatMatch =
    desc.match(/^'([^']+)' is not a valid substat(.*)$/i) ??
    desc.match(/^unrecognized substat key '([^']+)'(?:;\s*substat ignored\.?)?(.*)$/i)
  if (invalidSubstatMatch) {
    const badKey = invalidSubstatMatch[1]!
    const rest = invalidSubstatMatch[2] ?? ''
    desc = `a substat has an unknown type ('${badKey}')${rest}`
  } else {
    desc = desc
      .replace(/\bcharacters\[(\d+)\]/g, (_, n) => `Character #${Number(n) + 1}`)
      .replace(/\bweapons\[(\d+)\]/g, (_, n) => `Weapon #${Number(n) + 1}`)
      .replace(/\bartifacts\[(\d+)\]/g, (_, n) => `Artifact #${Number(n) + 1}`)
      .replace(/missing a string "setKey"/gi, 'missing an artifact set name')
      .replace(/missing a string "key"/gi, 'missing a name')
      .replace(/Unknown character key /gi, 'Unknown character ')
      .replace(/Unknown weapon key /gi, 'Unknown weapon ')
  }

  if (
    fieldContext &&
    !desc.toLowerCase().includes('substat') &&
    !desc.toLowerCase().includes(fieldContext.toLowerCase())
  ) {
    entryLabel = `${entryLabel} (${fieldContext})`
  }

  return {
    entryLabel,
    description: desc,
    fullText: `${entryLabel}: ${desc}`,
  }
}

function formatDisplayBoundValue(val: number | undefined): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return ''
  return String(val)
}

export function summarizeStatConstraints(
  constraints: readonly StatConstraint[] | undefined
): string {
  if (!constraints || constraints.length === 0) {
    return 'Stat Constraints — none'
  }
  const parts = constraints.map((c) => {
    const label =
      STAT_PICKER_OPTIONS.find((o) => o.key === c.stat)?.label ??
      shortStatLabel(c.stat).replace(/%$/, '')
    const unit = isPercentStatConstraintKey(c.stat) ? '%' : ''
    if (c.min !== undefined && c.max !== undefined) {
      return `${label} ${c.min}${unit}–${c.max}${unit}`
    }
    if (c.min !== undefined) {
      return `${label} ≥ ${c.min}${unit}`
    }
    if (c.max !== undefined) {
      return `${label} ≤ ${c.max}${unit}`
    }
    return label
  })
  return `Stat Constraints — ${parts.join(', ')}`
}

export interface ConstraintsCardProps {
  settings: OptimizerSettings
  onChange: (next: OptimizerSettings) => void
  initialPickerOpen?: boolean
  /** When true, renders as a Wikipedia-style collapsible section (open when constraints exist, closed when empty). */
  collapsible?: boolean
}

export function ConstraintsCard({
  settings,
  onChange,
  initialPickerOpen = false,
  collapsible = false,
}: ConstraintsCardProps) {
  const [pickerOpen, setPickerOpen] = useState(initialPickerOpen)
  const [draftBounds, setDraftBounds] = useState<Record<string, string>>({})
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const constraints = settings.constraints ?? []
  const usedStats = new Set<string>(constraints.map((c) => c.stat))
  const hasNonDefault = constraints.length > 0
  const isExpanded = !collapsible
    ? true
    : manualExpanded !== null
      ? manualExpanded
      : hasNonDefault
  const summaryText = summarizeStatConstraints(constraints)

  function getBoundDraftKey(stat: StatConstraintKey, field: 'min' | 'max') {
    return `${stat}:${field}`
  }

  function handleAddStat(stat: StatConstraintKey) {
    if (usedStats.has(stat)) return
    const nextEntry: StatConstraint = { stat }
    onChange({
      ...settings,
      constraints: [...constraints, nextEntry],
    })
    setPickerOpen(false)
  }

  function commitBound(
    idx: number,
    field: 'min' | 'max',
    rawValue: string
  ) {
    const trimmed = rawValue.trim()
    const parsed = trimmed !== '' ? Number(trimmed) : undefined
    const nextList = [...constraints]
    const current = nextList[idx]
    if (!current) return
    const updated: StatConstraint = {
      ...current,
      [field]:
        parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
    }
    if (updated.min === undefined) delete updated.min
    if (updated.max === undefined) delete updated.max
    nextList[idx] = updated
    onChange({
      ...settings,
      constraints: nextList,
    })
  }

  function handleFocusBound(
    stat: StatConstraintKey,
    field: 'min' | 'max',
    currentVal: number | undefined
  ) {
    const key = getBoundDraftKey(stat, field)
    setDraftBounds((prev) => {
      if (key in prev) return prev
      return {
        ...prev,
        [key]: formatDisplayBoundValue(currentVal),
      }
    })
  }

  function handleChangeBound(
    idx: number,
    stat: StatConstraintKey,
    field: 'min' | 'max',
    rawValue: string
  ) {
    const key = getBoundDraftKey(stat, field)
    setDraftBounds((prev) => ({
      ...prev,
      [key]: rawValue,
    }))
    const trimmed = rawValue.trim()
    if (trimmed === '' || Number.isFinite(Number(trimmed))) {
      commitBound(idx, field, rawValue)
    }
  }

  function handleBlurBound(
    idx: number,
    stat: StatConstraintKey,
    field: 'min' | 'max'
  ) {
    const key = getBoundDraftKey(stat, field)
    const raw = draftBounds[key]
    setDraftBounds((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (raw !== undefined) {
      commitBound(idx, field, raw)
    }
  }

  function handleRemove(idx: number) {
    const removed = constraints[idx]
    if (removed) {
      setDraftBounds((prev) => {
        const next = { ...prev }
        delete next[getBoundDraftKey(removed.stat, 'min')]
        delete next[getBoundDraftKey(removed.stat, 'max')]
        return next
      })
    }
    onChange({
      ...settings,
      constraints: constraints.filter((_, i) => i !== idx),
    })
  }

  return (
    <section
      className="panel gi-card"
      data-testid="constraints-card"
      data-expanded={isExpanded ? 'true' : 'false'}
      aria-label="Constraints"
    >
      <div className="gi-card-header">
        <div>
          <h2 className="gi-card-title">Stat Constraints</h2>
          <p
            className="gi-card-subtitle"
            data-testid="constraints-collapsible-summary"
          >
            {summaryText}
          </p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            flexWrap: 'wrap',
          }}
        >
          {isExpanded && (
            <button
              type="button"
              className="btn-secondary btn-icon"
              data-testid="add-constraint-btn"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((prev) => !prev)}
              disabled={usedStats.size >= STAT_CONSTRAINT_KEYS.length}
            >
              <span>+ Add constraint</span>
            </button>
          )}
          {collapsible && (
            <button
              type="button"
              className="gi-collapsible-toggle-btn"
              data-testid="constraints-collapsible-toggle"
              aria-expanded={isExpanded}
              onClick={() => setManualExpanded(!isExpanded)}
            >
              [{isExpanded ? 'Hide' : 'Show'}]
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div data-testid="constraints-collapsible-body">
          {pickerOpen && (
            <div
              className="constraint-picker-panel"
              data-testid="constraint-stat-picker"
              role="group"
              aria-label="Select a stat to constrain"
            >
              <div className="constraint-picker-header">
                <span className="muted">Choose a final stat to bound:</span>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={() => setPickerOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="constraint-picker-grid">
                {STAT_PICKER_OPTIONS.map((opt) => {
                  const isAdded = usedStats.has(opt.key)
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`constraint-picker-item${
                        isAdded ? ' is-disabled' : ''
                      }`}
                      data-testid={`picker-stat-${opt.key}`}
                      disabled={isAdded}
                      onClick={() => handleAddStat(opt.key)}
                      title={
                        isAdded
                          ? `${opt.label} constraint already added`
                          : `Add ${opt.label} constraint`
                      }
                    >
                      <StatChip statKey={opt.key} showLabel />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {constraints.length === 0 ? (
            <div
              className="constraint-empty-line"
              data-testid="constraints-empty-state"
            >
              No constraints. Add one to set floors or caps, e.g. ER at least 160%.
            </div>
          ) : (
            <div className="constraint-rows" data-testid="constraint-rows">
              {constraints.map((c, idx) => {
                const isPct = isPercentStatConstraintKey(c.stat)
                const label = shortStatLabel(c.stat)
                const minKey = getBoundDraftKey(c.stat, 'min')
                const maxKey = getBoundDraftKey(c.stat, 'max')
                const minDisplay =
                  minKey in draftBounds
                    ? draftBounds[minKey]!
                    : formatDisplayBoundValue(c.min)
                const maxDisplay =
                  maxKey in draftBounds
                    ? draftBounds[maxKey]!
                    : formatDisplayBoundValue(c.max)

                return (
                  <div
                    key={`${c.stat}-${idx}`}
                    className="constraint-row"
                    data-testid={`constraint-row-${c.stat}`}
                  >
                    <div className="constraint-row-chip">
                      <StatChip statKey={c.stat} showLabel isMain />
                    </div>

                    <div className="constraint-row-inputs">
                      <label className="constraint-bound-field">
                        <span className="constraint-bound-tag">Min</span>
                        <div className="constraint-input-wrap">
                          <input
                            type="text"
                            inputMode="decimal"
                            data-testid={`constraint-min-${c.stat}`}
                            aria-label={`${label} Min`}
                            placeholder="—"
                            value={minDisplay}
                            onFocus={() =>
                              handleFocusBound(c.stat, 'min', c.min)
                            }
                            onChange={(e) =>
                              handleChangeBound(
                                idx,
                                c.stat,
                                'min',
                                e.target.value
                              )
                            }
                            onBlur={() => handleBlurBound(idx, c.stat, 'min')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                          />
                          {isPct && (
                            <span className="constraint-unit" aria-hidden="true">
                              %
                            </span>
                          )}
                        </div>
                      </label>

                      <label className="constraint-bound-field">
                        <span className="constraint-bound-tag">Max</span>
                        <div className="constraint-input-wrap">
                          <input
                            type="text"
                            inputMode="decimal"
                            data-testid={`constraint-max-${c.stat}`}
                            aria-label={`${label} Max`}
                            placeholder="—"
                            value={maxDisplay}
                            onFocus={() =>
                              handleFocusBound(c.stat, 'max', c.max)
                            }
                            onChange={(e) =>
                              handleChangeBound(
                                idx,
                                c.stat,
                                'max',
                                e.target.value
                              )
                            }
                            onBlur={() => handleBlurBound(idx, c.stat, 'max')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                          />
                          {isPct && (
                            <span className="constraint-unit" aria-hidden="true">
                              %
                            </span>
                          )}
                        </div>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn-icon-only btn-danger-ghost"
                      aria-label={`Remove ${label} constraint`}
                      title={`Remove ${label} constraint`}
                      onClick={() => handleRemove(idx)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export interface ComparisonBuildEntry {
  selection: BuildSelection
  total: number
  evaluation?: RotationResult | null
}

export interface BuildComparisonListProps {
  preset: Preset
  currentBuild?: {
    selection: BuildSelection
    evaluation: RotationResult
  } | null
  optimizedBuilds: ComparisonBuildEntry[]
  artifactById: ReadonlyMap<string, IArtifact>
  onExportGO?: (selection: BuildSelection, label: string) => void
  initialExpandedRowId?: string | null
  initialExpandedInstanceKey?: string | null
  initialExpandedStatKey?: string | null
}

interface InternalComparisonRow {
  id: string
  kind: 'current' | 'optimized'
  rankLabel: string
  rank?: number
  isBest: boolean
  total: number
  selection: BuildSelection
  evaluation?: RotationResult | null
}

export function formatRelativeDelta(
  total: number,
  baselineTotal: number | undefined
): {
  text: string
  asciiText: string
  sign: '+' | '-' | '0' | 'baseline'
  cls: 'ok' | 'error' | 'muted'
} {
  if (baselineTotal === undefined || baselineTotal <= 0) {
    return { text: '—', asciiText: '—', sign: '0', cls: 'muted' }
  }
  const diff = total - baselineTotal
  const pct = (diff / baselineTotal) * 100
  if (Math.abs(pct) < 0.05) {
    return { text: '0.0%', asciiText: '0.0%', sign: '0', cls: 'muted' }
  }
  if (pct > 0) {
    const val = `+${pct.toFixed(1)}%`
    return { text: val, asciiText: val, sign: '+', cls: 'ok' }
  }
  const abs = Math.abs(pct).toFixed(1)
  return {
    text: `−${abs}%`,
    asciiText: `-${abs}%`,
    sign: '-',
    cls: 'muted',
  }
}

const BREAKDOWN_CATEGORY_META: Record<
  BreakdownSourceCategory,
  { label: string; cls: string }
> = {
  character: { label: 'Character', cls: 'bd-cat-character' },
  weapon: { label: 'Weapon', cls: 'bd-cat-weapon' },
  artifactSet: { label: 'Artifacts', cls: 'bd-cat-artifact' },
  teamBuff: { label: 'Team Buff', cls: 'bd-cat-teambuff' },
  resonance: { label: 'Resonance', cls: 'bd-cat-resonance' },
  enemy: { label: 'Enemy', cls: 'bd-cat-enemy' },
}

function formatBreakdownContributorValue(c: BreakdownContributor): string {
  if (c.unit === '%') {
    const pct = c.value * 100
    const sign = pct > 0 ? '+' : ''
    return `${sign}${pct.toFixed(1)}%`
  }
  if (Math.abs(c.value) > 0 && Math.abs(c.value) < 10 && !Number.isInteger(c.value)) {
    return c.value.toFixed(2)
  }
  return Math.round(c.value).toLocaleString()
}

export function DamageRowBreakdownView({
  breakdown,
  rowKey,
  idx,
}: {
  breakdown: DamageRowBreakdown
  rowKey: string
  idx: number
}) {
  return (
    <div
      className="formula-breakdown-panel"
      data-testid={`damage-breakdown-${rowKey}-${idx}`}
    >
      <div
        className="formula-breakdown-equation"
        data-testid={`damage-breakdown-equation-${rowKey}-${idx}`}
      >
        <span className="formula-eq-term">
          Base{' '}
          <strong>
            {formatNum(breakdown.basePlusFlat * breakdown.outerMulti)}
          </strong>
        </span>
        <span className="formula-eq-op">×</span>
        <span className="formula-eq-term">
          DMG Bonus <strong>{breakdown.dmgBonusMulti.toFixed(3)}×</strong>
        </span>
        <span className="formula-eq-op">×</span>
        <span className="formula-eq-term">
          Crit <strong>{breakdown.critMulti.toFixed(3)}×</strong>
        </span>
        {breakdown.ampMulti > 1 && (
          <>
            <span className="formula-eq-op">×</span>
            <span className="formula-eq-term">
              Reaction <strong>{breakdown.ampMulti.toFixed(3)}×</strong>
            </span>
          </>
        )}
        <span className="formula-eq-op">×</span>
        <span className="formula-eq-term">
          DEF <strong>{breakdown.defMulti.toFixed(3)}×</strong>
        </span>
        <span className="formula-eq-op">×</span>
        <span className="formula-eq-term">
          RES <strong>{breakdown.resMulti.toFixed(3)}×</strong>
        </span>
        <span className="formula-eq-op">=</span>
        <strong
          className="formula-eq-result"
          data-testid={`damage-breakdown-reconciled-${rowKey}-${idx}`}
        >
          {formatNum(breakdown.reconciledPerHit)} / hit
        </strong>
      </div>

      <div className="formula-factors-grid">
        {breakdown.factors.map((factor) => (
          <div
            key={factor.key}
            className="formula-factor-card"
            data-testid={`damage-factor-${rowKey}-${idx}-${factor.key}`}
            data-factor-key={factor.key}
          >
            <div className="formula-factor-header">
              <div>
                <strong className="formula-factor-title">{factor.label}</strong>
                {factor.formulaSummary && (
                  <span className="formula-factor-summary muted">
                    {factor.formulaSummary}
                  </span>
                )}
              </div>
              <strong
                className="formula-factor-val"
                data-testid={`damage-factor-value-${rowKey}-${idx}-${factor.key}`}
              >
                {factor.unit === '×'
                  ? `${factor.value.toFixed(3)}×`
                  : factor.unit === '%'
                    ? `${(factor.value * 100).toFixed(1)}%`
                    : formatNum(factor.value)}
              </strong>
            </div>

            {factor.contributors.length > 0 && (
              <ul className="formula-contributor-list">
                {factor.contributors.map((c, cIdx) => {
                  const catMeta = BREAKDOWN_CATEGORY_META[c.category]
                  return (
                    <li
                      key={cIdx}
                      className="formula-contributor-item"
                      data-testid={`damage-contributor-${rowKey}-${idx}-${factor.key}-${cIdx}`}
                      data-source-category={c.category}
                    >
                      <span className="formula-contributor-left">
                        <span className={`formula-source-badge ${catMeta.cls}`}>
                          {catMeta.label}
                        </span>
                        <span className="formula-contributor-label">
                          {c.label}
                          {c.note && (
                            <span className="formula-contributor-note muted">
                              {' '}
                              ({c.note})
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="formula-contributor-val">
                        {formatBreakdownContributorValue(c)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatBreakdownView({
  breakdown,
  rowKey,
  statKey,
}: {
  breakdown: StatBreakdown
  rowKey: string
  statKey: string
}) {
  const isPctStat = breakdown.unit === '%'
  const formatStatVal = (v: number) =>
    isPctStat ? `${(v * 100).toFixed(1)}%` : Math.round(v).toLocaleString()

  return (
    <div
      className="formula-breakdown-panel stat-breakdown-panel"
      data-testid={`stat-breakdown-${rowKey}-${statKey}`}
    >
      <div className="formula-breakdown-equation">
        <span className="formula-eq-term">
          Base <strong>{formatStatVal(breakdown.base)}</strong>
        </span>
        <span className="formula-eq-op">→</span>
        <span className="formula-eq-term">
          Reconciled Total{' '}
          <strong data-testid={`stat-breakdown-reconciled-${rowKey}-${statKey}`}>
            {formatStatVal(breakdown.reconciledTotal)}
          </strong>
        </span>
      </div>
      <ul className="formula-contributor-list">
        {breakdown.contributors.map((c, cIdx) => {
          const catMeta = BREAKDOWN_CATEGORY_META[c.category]
          const valText =
            c.unit === '%'
              ? `${c.value >= 0 ? '+' : ''}${(c.value * 100).toFixed(1)}%`
              : `${c.value >= 0 ? '+' : ''}${Math.round(c.value).toLocaleString()}`
          return (
            <li
              key={cIdx}
              className="formula-contributor-item"
              data-testid={`stat-contributor-${rowKey}-${statKey}-${cIdx}`}
              data-source-category={c.category}
            >
              <span className="formula-contributor-left">
                <span className={`formula-source-badge ${catMeta.cls}`}>
                  {catMeta.label}
                </span>
                <span className="formula-contributor-label">
                  {c.label}
                  {c.note && (
                    <span className="formula-contributor-note muted">
                      {' '}
                      ({c.note})
                    </span>
                  )}
                </span>
              </span>
              <span className="formula-contributor-val">{valText}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface BuildStatComparisonSectionProps {
  rowKey: string
  stats: Record<string, number>
  statBreakdowns?: Record<string, StatBreakdown>
  baselineStats?: Record<string, number>
  isCurrentBuild?: boolean
  expandedStatKey?: string | null
  onToggleStatKey?: (statKey: string) => void
}

function BuildStatComparisonSection({
  rowKey,
  stats,
  statBreakdowns,
  baselineStats,
  isCurrentBuild = false,
  expandedStatKey = null,
  onToggleStatKey,
}: BuildStatComparisonSectionProps) {
  const showDiff = Boolean(baselineStats && !isCurrentBuild)
  const colSpan = showDiff ? 5 : 2

  const nonZeroBonusKeys = EXTENDED_BONUS_STAT_KEYS.filter(
    (statKey) => Math.abs(stats[statKey] ?? 0) > 1e-6
  )

  function renderStatRow(statKey: string, label: string) {
    const buildRaw = stats[statKey] ?? 0
    const currentRaw = showDiff ? (baselineStats?.[statKey] ?? 0) : undefined
    const formatted = formatCoreStatComparison(statKey, buildRaw, currentRaw)
    const sb = statBreakdowns?.[statKey]
    const isStatExpanded = expandedStatKey === `${rowKey}:${statKey}`

    return (
      <Fragment key={statKey}>
        <tr
          data-testid={`comp-stat-row-${rowKey}-${statKey}`}
          data-stat-key={statKey}
          aria-expanded={sb ? isStatExpanded : undefined}
          className={sb ? 'comp-expandable-tr' : undefined}
          onClick={
            sb && onToggleStatKey
              ? () => onToggleStatKey(`${rowKey}:${statKey}`)
              : undefined
          }
        >
          <td className="comp-stat-col-label">
            <span className="comp-stat-label-cell">
              {sb && (
                <span
                  className={`comp-row-chevron${
                    isStatExpanded ? ' is-expanded' : ''
                  }`}
                  data-testid={`comp-stat-toggle-${rowKey}-${statKey}`}
                  aria-hidden="true"
                >
                  ▸
                </span>
              )}
              <StatIcon statKey={statKey} iconProps={{ size: 13 }} />
              <strong>{label}</strong>
            </span>
          </td>
          {showDiff ? (
            <>
              <td
                className="comp-stat-num muted"
                data-testid={`comp-stat-current-${rowKey}-${statKey}`}
              >
                {formatted.currentText}
              </td>
              <td className="comp-stat-arrow muted" aria-hidden="true">
                →
              </td>
              <td
                className="comp-stat-num"
                data-testid={`comp-stat-value-${rowKey}-${statKey}`}
              >
                <strong>{formatted.buildText}</strong>
              </td>
              <td
                className={`comp-stat-num comp-stat-diff-delta ${formatted.cls}`}
                data-testid={`comp-stat-diff-${rowKey}-${statKey}`}
                data-diff-sign={formatted.sign ?? '0'}
                data-diff-ascii={formatted.asciiDiffText ?? ''}
                data-raw-diff={formatted.rawDiffText ?? undefined}
                data-raw-diff-ascii={formatted.asciiRawDiffText ?? undefined}
                title={formatted.rawDiffText ?? undefined}
              >
                {formatted.diffText}
              </td>
            </>
          ) : (
            <td
              className="comp-stat-num"
              data-testid={`comp-stat-value-${rowKey}-${statKey}`}
            >
              <strong>{formatted.buildText}</strong>
            </td>
          )}
        </tr>
        {isStatExpanded && sb && (
          <tr
            className="comp-breakdown-tr"
            data-testid={`comp-stat-breakdown-row-${rowKey}-${statKey}`}
          >
            <td colSpan={colSpan}>
              <StatBreakdownView
                breakdown={sb}
                rowKey={rowKey}
                statKey={statKey}
              />
            </td>
          </tr>
        )}
      </Fragment>
    )
  }

  return (
    <div
      className="comp-stat-comparison"
      data-testid={`comp-stat-diffs-${rowKey}`}
      data-mode={showDiff ? 'diff' : 'plain'}
    >
      <div className="comp-details-subheader">
        <strong>
          {showDiff ? 'Core Stat Comparison vs. Current' : 'Core Build Stats'}
        </strong>
        {statBreakdowns && (
          <span
            className="muted comp-details-subhint"
            data-testid={`comp-stat-hint-${rowKey}`}
          >
            Click a stat row to inspect its source breakdown
          </span>
        )}
      </div>

      <div className="gi-table-wrap">
        <table
          className="gi-table comp-stat-diff-table"
          aria-label={
            showDiff
              ? 'Core stat comparison against Current build'
              : 'Core build stats'
          }
        >
          <thead>
            <tr>
              <th className="comp-stat-col-label">Stat</th>
              {showDiff ? (
                <>
                  <th className="comp-stat-num">Current</th>
                  <th aria-hidden="true" className="comp-stat-arrow-col" />
                  <th className="comp-stat-num">This Build</th>
                  <th className="comp-stat-num">Diff</th>
                </>
              ) : (
                <th className="comp-stat-num">Value</th>
              )}
            </tr>
          </thead>
          <tbody>
            {CORE_RESULT_STAT_KEYS.map((statKey) =>
              renderStatRow(statKey, CORE_STAT_DIFF_LABELS[statKey])
            )}
          </tbody>
          {nonZeroBonusKeys.length > 0 && (
            <tbody
              className="comp-stat-bonus-group"
              data-testid={`comp-additional-bonuses-${rowKey}`}
              aria-label="Additional Bonuses"
            >
              <tr
                className="comp-stat-group-header-row"
                data-testid={`comp-additional-bonuses-header-${rowKey}`}
              >
                <th
                  colSpan={colSpan}
                  scope="colgroup"
                  className="comp-stat-group-header"
                >
                  Additional Bonuses
                </th>
              </tr>
              {nonZeroBonusKeys.map((statKey) =>
                renderStatRow(statKey, EXTENDED_BONUS_STAT_LABELS[statKey])
              )}
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}

export function BuildComparisonList({
  preset,
  currentBuild,
  optimizedBuilds,
  artifactById,
  onExportGO,
  initialExpandedRowId,
  initialExpandedInstanceKey = null,
  initialExpandedStatKey = null,
}: BuildComparisonListProps) {
  const defaultExpanded =
    initialExpandedRowId !== undefined
      ? initialExpandedRowId
      : optimizedBuilds.length > 0
        ? 'opt-0'
        : currentBuild
          ? 'current'
          : null

  const [expandedRowId, setExpandedRowId] = useState<string | null>(
    defaultExpanded
  )
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(
    initialExpandedInstanceKey
  )
  const [expandedStatKey, setExpandedStatKey] = useState<string | null>(
    initialExpandedStatKey
  )

  const rows: InternalComparisonRow[] = []
  if (currentBuild) {
    rows.push({
      id: 'current',
      kind: 'current',
      rankLabel: 'Current',
      isBest: false,
      total: currentBuild.evaluation.total,
      selection: currentBuild.selection,
      evaluation: currentBuild.evaluation,
    })
  }

  optimizedBuilds.forEach((b, idx) => {
    rows.push({
      id: `opt-${idx}`,
      kind: 'optimized',
      rankLabel: `#${idx + 1}`,
      rank: idx + 1,
      isBest: idx === 0,
      total: b.evaluation?.total ?? b.total,
      selection: b.selection,
      evaluation: b.evaluation,
    })
  })

  if (rows.length === 0) {
    return null
  }

  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  const baselineTotal = currentBuild?.evaluation.total

  return (
    <div
      className="comp-list"
      data-testid="build-comparison-list"
      role="list"
      aria-label="Build comparison results"
    >
      {rows.map((row) => {
        const barPct = Math.max(0, Math.min(100, (row.total / maxTotal) * 100))
        const isExpanded = expandedRowId === row.id
        const delta =
          row.kind === 'current'
            ? {
                text: 'Current',
                asciiText: 'Current',
                sign: 'baseline' as const,
                cls: 'muted' as const,
              }
            : formatRelativeDelta(row.total, baselineTotal)

        const stats = row.evaluation?.stats

        return (
          <div
            key={row.id}
            role="listitem"
            data-testid={`comparison-row-${row.id}`}
            data-row-kind={row.kind}
            data-best-build={row.isBest ? 'true' : 'false'}
            className={`comp-row${row.isBest ? ' comp-row-best' : ''}${
              row.kind === 'current' ? ' comp-row-current' : ''
            }${isExpanded ? ' comp-row-expanded' : ''}`}
          >
            <div
              className="comp-row-summary"
              onClick={() =>
                setExpandedRowId((prev) => (prev === row.id ? null : row.id))
              }
            >
              {/* Top line: Rank + Big Total + Delta + Proportional Bar + Actions */}
              <div className="comp-row-main">
                <div className="comp-row-rank-group">
                  <span
                    className={`comp-rank-pill${
                      row.isBest
                        ? ' comp-rank-best'
                        : row.kind === 'current'
                          ? ' comp-rank-current'
                          : ''
                    }`}
                    data-testid={`comp-rank-${row.id}`}
                    title={
                      row.kind === 'current'
                        ? 'Your currently equipped build'
                        : undefined
                    }
                  >
                    {row.rankLabel}
                  </span>
                  {row.isBest && (
                    <span
                      className="comp-best-tag"
                      data-testid="best-build-badge"
                    >
                      Best
                    </span>
                  )}
                </div>

                <div className="comp-row-bar-wrap">
                  <div
                    className="comp-row-bar-track"
                    title={`${formatNum(row.total)} Total Rotation DMG (${barPct.toFixed(1)}% of best)`}
                  >
                    <div
                      className={`comp-row-bar-fill${
                        row.isBest
                          ? ' is-best'
                          : row.kind === 'current'
                            ? ' is-current'
                            : ''
                      }`}
                      data-testid={`comp-bar-fill-${row.id}`}
                      style={{ width: `${barPct.toFixed(1)}%` }}
                    />
                  </div>
                </div>

                <div className="comp-row-metrics">
                  <strong
                    className={`comp-row-total${row.isBest ? ' ok' : ''}`}
                    data-testid={`comp-total-${row.id}`}
                  >
                    {formatNum(row.total)}
                  </strong>

                  <span
                    className={`comp-row-delta ${delta.cls}`}
                    data-testid={`comp-delta-${row.id}`}
                    data-delta-sign={delta.sign}
                    data-delta-ascii={delta.asciiText}
                    title={
                      row.kind === 'current'
                        ? 'Your currently equipped build'
                        : `${delta.asciiText} vs. Current build`
                    }
                  >
                    {delta.text}
                  </span>
                </div>

                <button
                  type="button"
                  className="comp-expand-btn"
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? `Collapse ${row.rankLabel} breakdown`
                      : `Expand ${row.rankLabel} breakdown`
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedRowId((prev) =>
                      prev === row.id ? null : row.id
                    )
                  }}
                >
                  {isExpanded ? 'Hide details ▲' : 'Details ▼'}
                </button>
              </div>

              {/* Second line: 5 Artifact Badges + 7 Final Stat Icon Chips */}
              <div className="comp-row-meta">
                <div
                  className="comp-row-artifacts"
                  data-testid={`comp-artifacts-${row.id}`}
                  aria-label="Equipped artifacts"
                >
                  {OPTIMIZE_SLOTS.map((slot) => {
                    const artId = row.selection.artifactIds[slot]
                    const art = artId ? artifactById.get(artId) : undefined
                    if (!art) {
                      return (
                        <span
                          key={slot}
                          className="comp-empty-slot"
                          title={`No ${slot} equipped`}
                        >
                          <ArtifactBadge
                            setKey=""
                            slotKey={slot as IdentifierSlotKey}
                            rarity={1}
                            slotOnly
                            compact
                          />
                        </span>
                      )
                    }
                    return (
                      <ArtifactBadge
                        key={slot}
                        setKey={art.setKey}
                        slotKey={slot as IdentifierSlotKey}
                        rarity={art.rarity}
                        compact
                      />
                    )
                  })}
                </div>

                {stats && (
                  <div
                    className="comp-row-stats"
                    data-testid={`comp-stats-${row.id}`}
                    aria-label="Final character stats"
                  >
                    {CORE_RESULT_STAT_KEYS.map((statKey) => {
                      const rawVal = stats[statKey] ?? 0
                      const isPct = statKey.endsWith('_')
                      const chipVal = isPct
                        ? rawVal * 100
                        : Math.round(rawVal).toLocaleString()
                      return (
                        <StatChip
                          key={statKey}
                          statKey={statKey}
                          value={chipVal}
                          compact
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Per-Instance Breakdown & Slot Details */}
            {isExpanded && row.evaluation && (
              <div
                className="comp-row-details"
                data-testid={`comp-details-${row.id}`}
              >
                <div className="comp-details-header">
                  <strong>
                    Per-Instance Rotation Breakdown (Repeat ×
                    {preset.rotation.repeat ?? 1})
                  </strong>
                  {onExportGO && (
                    <button
                      type="button"
                      className="btn-secondary btn-icon"
                      onClick={() =>
                        onExportGO(
                          row.selection,
                          row.kind === 'current'
                            ? 'current'
                            : `opt-rank-${row.rank ?? 1}`
                        )
                      }
                    >
                      <DownloadIcon size={14} />
                      <span>Verify GO (.json)</span>
                    </button>
                  )}
                </div>

                <div className="gi-table-wrap">
                  <table className="gi-table comp-damage-table">
                    <thead>
                      <tr>
                        <th className="comp-dmg-col-name">Damage Instance</th>
                        <th className="comp-dmg-col-compact">Reaction</th>
                        <th className="comp-dmg-col-compact">Hit Mode</th>
                        <th className="comp-dmg-col-hits">Hits</th>
                        <th className="comp-dmg-col-num">Per-Hit DMG</th>
                        <th className="comp-dmg-col-num">Subtotal DMG</th>
                        {row.kind === 'optimized' && currentBuild && (
                          <th className="comp-dmg-col-num comp-dmg-col-delta">
                            vs. Current
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {row.evaluation.instances.map((inst, idx) => {
                        const targetSpec = preset.rotation.targets[idx]
                        const currInst =
                          currentBuild?.evaluation.instances[idx]
                        const instDelta =
                          row.kind === 'optimized' && currInst
                            ? formatRelativeDelta(
                                inst.subtotal,
                                currInst.subtotal
                              )
                            : null
                        const instanceKey = `${row.id}:${idx}`
                        const isInstExpanded =
                          expandedInstanceKey === instanceKey
                        const instColSpan =
                          row.kind === 'optimized' && currentBuild ? 7 : 6
                        return (
                          <Fragment key={idx}>
                            <tr
                              data-testid={`comp-instance-row-${row.id}-${idx}`}
                              aria-expanded={
                                inst.breakdown ? isInstExpanded : undefined
                              }
                              className={
                                inst.breakdown
                                  ? 'comp-expandable-tr'
                                  : undefined
                              }
                              onClick={
                                inst.breakdown
                                  ? () =>
                                      setExpandedInstanceKey((prev) =>
                                        prev === instanceKey
                                          ? null
                                          : instanceKey
                                      )
                                  : undefined
                              }
                            >
                              <td className="comp-dmg-col-name">
                                <span className="comp-stat-label-cell">
                                  {inst.breakdown && (
                                    <span
                                      className={`comp-row-chevron${
                                        isInstExpanded ? ' is-expanded' : ''
                                      }`}
                                      data-testid={`comp-instance-toggle-${row.id}-${idx}`}
                                      aria-hidden="true"
                                    >
                                      ▸
                                    </span>
                                  )}
                                  <strong>
                                    {formatRotationRowLabel(inst.label)}
                                  </strong>
                                </span>
                              </td>
                              <td className="comp-dmg-col-compact">
                                <RotationReactionBadge
                                  reaction={targetSpec?.reaction}
                                  compact
                                />
                              </td>
                              <td className="comp-dmg-col-compact">
                                <RotationHitModeBadge
                                  hitMode={targetSpec?.hitMode}
                                  compact
                                />
                              </td>
                              <td className="comp-dmg-col-hits">×{inst.count}</td>
                              <td className="comp-dmg-col-num">
                                {formatNum(inst.perHit)}
                              </td>
                              <td className="comp-dmg-col-num">
                                <strong>{formatNum(inst.subtotal)}</strong>
                              </td>
                              {row.kind === 'optimized' && currentBuild && (
                                <td
                                  className={`comp-dmg-col-num comp-dmg-col-delta ${
                                    instDelta?.cls ?? 'muted'
                                  }`}
                                >
                                  {instDelta ? instDelta.text : '—'}
                                </td>
                              )}
                            </tr>
                            {isInstExpanded && inst.breakdown && (
                              <tr
                                className="comp-breakdown-tr"
                                data-testid={`comp-instance-breakdown-row-${row.id}-${idx}`}
                              >
                                <td colSpan={instColSpan}>
                                  <DamageRowBreakdownView
                                    breakdown={inst.breakdown}
                                    rowKey={row.id}
                                    idx={idx}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {row.evaluation.stats && (
                  <BuildStatComparisonSection
                    rowKey={row.id}
                    stats={row.evaluation.stats}
                    statBreakdowns={row.evaluation.statBreakdowns}
                    baselineStats={currentBuild?.evaluation?.stats}
                    isCurrentBuild={row.kind === 'current'}
                    expandedStatKey={expandedStatKey}
                    onToggleStatKey={(key) =>
                      setExpandedStatKey((prev) => (prev === key ? null : key))
                    }
                  />
                )}

                <div
                  className="comp-details-artifacts-section"
                  data-testid={`comp-artifacts-section-${row.id}`}
                >
                  <div className="comp-details-subheader">
                    <strong>Artifacts</strong>
                    <span
                      className="muted comp-details-subhint"
                      data-testid={`artifacts-legend-${row.id}`}
                    >
                      Character badge = equipped owner in imported data · 🔒 =
                      locked in imported data
                    </span>
                  </div>
                  <div
                    className="comp-details-pieces"
                    data-testid={`comp-details-pieces-${row.id}`}
                  >
                    {OPTIMIZE_SLOTS.map((slot) => {
                      const artId = row.selection.artifactIds[slot]
                      const art = artId ? artifactById.get(artId) : undefined
                      if (!art) return null
                      return (
                        <ArtifactPieceRow
                          key={slot}
                          setKey={art.setKey}
                          slotKey={art.slotKey as IdentifierSlotKey}
                          rarity={art.rarity}
                          level={art.level}
                          mainStatKey={art.mainStatKey}
                          substats={art.substats}
                          location={art.location}
                          lock={art.lock}
                          compact
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function resolveWeaponCompareCandidate(
  weaponKey: string,
  targetCharKey: string,
  good?: IGOOD | null,
  seedTargetOverrides?: MemberConditionalsMap
): WeaponCompareCandidate {
  const wMeta = getWeaponMeta(weaponKey)
  const isLowRarity = wMeta.rarity <= 2
  const maxLvl = isLowRarity ? 70 : 90
  const maxAsc = isLowRarity ? 4 : 6

  const seededFields =
    seedTargetOverrides !== undefined
      ? {
          targetConditionals: seedCandidateTargetConditionals(
            seedTargetOverrides,
            weaponKey
          ),
          seededTargetConditionals: seedCandidateTargetConditionals(
            seedTargetOverrides,
            weaponKey
          ),
        }
      : {}

  const weapons = good?.weapons ?? []
  const equippedOnTarget = weapons.find(
    (w) => w.key === weaponKey && w.location === targetCharKey
  )
  const ownedCopies = weapons
    .filter((w) => w.key === weaponKey)
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level
      if (b.refinement !== a.refinement) return b.refinement - a.refinement
      return b.ascension - a.ascension
    })

  const match = equippedOnTarget ?? ownedCopies[0]
  if (match) {
    return {
      weaponKey,
      level: Math.max(1, Math.min(maxLvl, Math.round(match.level))),
      ascension: Math.max(0, Math.min(maxAsc, Math.round(match.ascension))),
      refinement: isLowRarity
        ? 1
        : Math.max(1, Math.min(5, Math.round(match.refinement))),
      isOwned: true,
      ownedWeaponId: match.id,
      isEquippedBaseline: match.location === targetCharKey,
      ...seededFields,
    }
  }

  return {
    weaponKey,
    level: maxLvl,
    ascension: maxAsc,
    refinement: 1,
    isOwned: false,
    isEquippedBaseline: false,
    ...seededFields,
  }
}

export function rankWeaponComparisonRows(
  completedRows: readonly WeaponCompareRowResult[],
  cancelled = false
): WeaponCompareResult {
  const okRows = completedRows
    .filter((r) => r.status === 'ok' && r.total !== null)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))

  const unmetRows = completedRows.filter((r) => r.status !== 'ok')

  const leaderTotal =
    okRows.length > 0 && okRows[0]!.total !== null ? okRows[0]!.total : null

  const rankedOk: WeaponCompareRowResult[] = okRows.map((row, idx) => {
    const rowTotal = row.total ?? 0
    const pctBehind =
      leaderTotal !== null && leaderTotal > 0
        ? idx === 0
          ? 0
          : Math.max(0, ((leaderTotal - rowTotal) / leaderTotal) * 100)
        : 0
    const normalizedTopBuilds: WeaponCompareBuildEntry[] =
      row.topBuilds && row.topBuilds.length > 0
        ? row.topBuilds
            .slice(0, WEAPON_COMPARE_TOP_N)
            .map((entry, bIdx) => ({
              ...entry,
              rank: bIdx + 1,
            }))
        : row.bestBuild && row.evaluation
          ? [
              {
                rank: 1,
                selection: row.bestBuild,
                evaluation: row.evaluation,
              },
            ]
          : []
    return {
      ...row,
      rank: idx + 1,
      percentBehindLeader: pctBehind,
      topBuilds: normalizedTopBuilds,
    }
  })

  const rankedUnmet: WeaponCompareRowResult[] = unmetRows.map((row) => ({
    ...row,
    rank: null,
    total: null,
    percentBehindLeader: null,
    bestBuild: null,
    evaluation: null,
    topBuilds: [],
  }))

  return {
    rows: [...rankedOk, ...rankedUnmet],
    leaderTotal,
    cancelled,
  }
}

export interface WeaponComparisonPanelProps {
  targetCharacterKey: string
  good?: IGOOD | null
  selectedCandidates: WeaponCompareCandidate[]
  onChangeCandidates: (next: WeaponCompareCandidate[]) => void
  /** Optional active preset to derive candidate target conditional controls (weapon, set, character, constellation). */
  preset?: Preset
  /** Optional current OptimizerSettings used to seed new candidates from the target's current panel overrides. */
  settings?: OptimizerSettings
  /** Optional pre-loaded conditional catalog (used in unit tests or SSR). */
  conditionalsByChar?: Record<string, ConditionalDescriptor[]>
  /** Optional handler to reset the compare candidate setup back to defaults. */
  onResetCandidates?: () => void
}

export function WeaponComparisonPanel({
  targetCharacterKey,
  good,
  selectedCandidates,
  onChangeCandidates,
  preset,
  settings,
  conditionalsByChar: providedCatalog,
  onResetCandidates,
}: WeaponComparisonPanelProps) {
  const [draftLevels, setDraftLevels] = useState<Record<string, string>>({})
  const [expandedEffectsByWeapon, setExpandedEffectsByWeapon] = useState<
    Record<string, boolean>
  >({})
  const [loadedCatalog, setLoadedCatalog] = useState<
    Record<string, ConditionalDescriptor[]>
  >({})

  const effectivePreset: Preset = useMemo(
    () =>
      preset ?? {
        schema: 'gi-optimizer/preset@1',
        id: `__weapon_compare_${targetCharacterKey}`,
        name: targetCharacterKey,
        description: '',
        author: '',
        source: 'official',
        target: targetCharacterKey,
        enemy: {
          level: 100,
          overrides: {},
        },
        teamConditional: {
          resonance: {},
          reaction: {},
        },
        team: [
          {
            key: targetCharacterKey,
            build: { type: 'owned' },
            requirement: {},
            conditional: {},
            bonusStats: {},
            hitMode: 'avgHit',
          },
        ],
        rotation: {
          name: '',
          repeat: 1,
          targets: [],
        },
      },
    [preset, targetCharacterKey]
  )

  useEffect(() => {
    if (providedCatalog) return
    if (typeof getCatalogInWorker !== 'function') return
    let cancelled = false
    void Promise.resolve(getCatalogInWorker([targetCharacterKey])).then(
      (res) => {
        if (!cancelled && res?.conditionalsByChar) {
          setLoadedCatalog((prev) => ({
            ...prev,
            ...res.conditionalsByChar,
          }))
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [targetCharacterKey, providedCatalog])

  const catalogByChar = providedCatalog ?? loadedCatalog
  const targetCatalog = useMemo(
    () => catalogByChar[targetCharacterKey] ?? [],
    [catalogByChar, targetCharacterKey]
  )

  const charMeta = getCharacterMeta(targetCharacterKey)
  const allWeaponsForType = listWeaponsForType(charMeta.weaponType)
  const selectedKeys = selectedCandidates.map((c) => c.weaponKey)
  const targetCharKey = targetCharacterKey

  const currentPanelTargetOverrides = useMemo(
    () =>
      getPresetConditionalOverrides(settings, effectivePreset.id)[
        targetCharKey
      ],
    [settings, effectivePreset.id, targetCharKey]
  )

  function handleToggleWeapon(weaponKey: string) {
    const exists = selectedCandidates.some((c) => c.weaponKey === weaponKey)
    if (exists) {
      setDraftLevels((prev) => {
        if (!(weaponKey in prev)) return prev
        const next = { ...prev }
        delete next[weaponKey]
        return next
      })
      setExpandedEffectsByWeapon((prev) => {
        if (!(weaponKey in prev)) return prev
        const next = { ...prev }
        delete next[weaponKey]
        return next
      })
      onChangeCandidates(
        selectedCandidates.filter((c) => c.weaponKey !== weaponKey)
      )
    } else {
      const nextCand = resolveWeaponCompareCandidate(
        weaponKey,
        targetCharKey,
        good,
        currentPanelTargetOverrides ?? {}
      )
      onChangeCandidates([...selectedCandidates, nextCand])
    }
  }

  function handleSetCandidateCondState(
    weaponKey: string,
    sheetKey: string,
    condKey: string,
    nextValue: string
  ) {
    onChangeCandidates(
      selectedCandidates.map((cand) => {
        if (cand.weaponKey !== weaponKey) return cand
        const baseTargetOverrides =
          cand.targetConditionals !== undefined
            ? cloneMemberConditionalsMap(cand.targetConditionals)
            : seedCandidateTargetConditionals(
                currentPanelTargetOverrides,
                weaponKey
              )
        const baseSeededOverrides =
          cand.seededTargetConditionals !== undefined
            ? cloneMemberConditionalsMap(cand.seededTargetConditionals)
            : seedCandidateTargetConditionals(
                currentPanelTargetOverrides,
                weaponKey
              )
        const nextSheet = { ...(baseTargetOverrides[sheetKey] ?? {}) }
        nextSheet[condKey] = nextValue
        return {
          ...cand,
          targetConditionals: {
            ...baseTargetOverrides,
            [sheetKey]: nextSheet,
          },
          seededTargetConditionals: baseSeededOverrides,
        }
      })
    )
  }

  function handleResetCandidateEffects(weaponKey: string) {
    onChangeCandidates(
      selectedCandidates.map((cand) => {
        if (cand.weaponKey !== weaponKey) return cand
        const seeded =
          cand.seededTargetConditionals !== undefined
            ? cloneMemberConditionalsMap(cand.seededTargetConditionals)
            : seedCandidateTargetConditionals(
                currentPanelTargetOverrides,
                weaponKey
              )
        return {
          ...cand,
          targetConditionals: seeded,
          seededTargetConditionals: cloneMemberConditionalsMap(seeded),
        }
      })
    )
  }

  function handleResetCompareSetup() {
    if (onResetCandidates) {
      onResetCandidates()
      return
    }
    onChangeCandidates(
      selectedCandidates.map((cand) => {
        const seeded =
          cand.seededTargetConditionals !== undefined
            ? cloneMemberConditionalsMap(cand.seededTargetConditionals)
            : seedCandidateTargetConditionals(
                currentPanelTargetOverrides,
                cand.weaponKey
              )
        return {
          ...cand,
          targetConditionals: seeded,
          seededTargetConditionals: cloneMemberConditionalsMap(seeded),
        }
      })
    )
  }

  function handleUpdateCandidate(
    weaponKey: string,
    patch: Partial<Pick<WeaponCompareCandidate, 'level' | 'ascension' | 'refinement'>>
  ) {
    const wMeta = getWeaponMeta(weaponKey)
    const isLowRarity = wMeta.rarity <= 2
    const maxLvl = isLowRarity ? 70 : 90
    const maxAsc = isLowRarity ? 4 : 6

    onChangeCandidates(
      selectedCandidates.map((c) => {
        if (c.weaponKey !== weaponKey) return c
        const nextLevel =
          patch.level !== undefined
            ? Math.max(1, Math.min(maxLvl, Math.round(patch.level || 1)))
            : c.level
        const nextAsc =
          patch.ascension !== undefined
            ? Math.max(0, Math.min(maxAsc, Math.round(patch.ascension || 0)))
            : c.ascension
        const nextRef = isLowRarity
          ? 1
          : patch.refinement !== undefined
            ? Math.max(1, Math.min(5, Math.round(patch.refinement || 1)))
            : c.refinement
        return {
          ...c,
          level: nextLevel,
          ascension: nextAsc,
          refinement: nextRef,
        }
      })
    )
  }

  function handleFocusLevel(weaponKey: string, currentLevel: number) {
    setDraftLevels((prev) => {
      if (weaponKey in prev) return prev
      return {
        ...prev,
        [weaponKey]: String(currentLevel),
      }
    })
  }

  function handleChangeLevel(weaponKey: string, rawValue: string) {
    setDraftLevels((prev) => ({
      ...prev,
      [weaponKey]: rawValue,
    }))
  }

  function handleBlurLevel(
    weaponKey: string,
    fallbackLevel: number,
    maxLvl: number
  ) {
    const raw = draftLevels[weaponKey]
    setDraftLevels((prev) => {
      if (!(weaponKey in prev)) return prev
      const next = { ...prev }
      delete next[weaponKey]
      return next
    })
    if (raw === undefined) return
    const trimmed = raw.trim()
    const parsed = trimmed !== '' ? Number(trimmed) : Number.NaN
    const clamped = Number.isFinite(parsed)
      ? Math.max(1, Math.min(maxLvl, Math.round(parsed)))
      : Math.max(1, Math.min(maxLvl, Math.round(fallbackLevel)))
    handleUpdateCandidate(weaponKey, { level: clamped })
  }

  const candidateEffectEntriesByWeapon = useMemo(() => {
    const out: Record<
      string,
      ReturnType<typeof deriveCandidateTargetConditionalsEntry>
    > = {}
    for (const cand of selectedCandidates) {
      out[cand.weaponKey] = deriveCandidateTargetConditionalsEntry({
        preset: effectivePreset,
        weaponKey: cand.weaponKey,
        targetConditionals: cand.targetConditionals,
        seededTargetConditionals: cand.seededTargetConditionals,
        settings,
        good,
        memberCatalog: targetCatalog,
      })
    }
    return out
  }, [selectedCandidates, effectivePreset, settings, good, targetCatalog])

  const anySetupDiffers = Object.values(candidateEffectEntriesByWeapon).some(
    (e) => e.setupDiffers
  )

  return (
    <div
      className="weapon-compare-panel"
      data-testid="weapon-compare-panel"
      aria-label="Weapon Comparison Selection"
    >
      <div className="weapon-compare-panel-header">
        <div>
          <strong>
            Multi-Weapon Selector ({displayName(targetCharacterKey)} ·{' '}
            {charMeta.weaponType.toUpperCase()})
          </strong>
          <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
            Select owned and unowned weapons to compare under identical setup
            and stat constraints. Owned weapons default to your GOOD copy;
            unowned weapons default to Lv.90 / A6 / R1.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            flexWrap: 'wrap',
          }}
        >
          {(onResetCandidates || anySetupDiffers) && (
            <button
              type="button"
              className="btn-secondary"
              data-testid="weapon-compare-reset-setup"
              onClick={handleResetCompareSetup}
              style={{ fontSize: '0.78rem', padding: '0.24rem 0.6rem' }}
            >
              Reset Setup
            </button>
          )}
          <span
            className="opt-filter-panel-summary"
            data-testid="weapon-compare-selected-count"
            style={{
              color:
                selectedCandidates.length >= 2 ? 'var(--ok)' : 'var(--warn)',
            }}
          >
            {selectedCandidates.length < 2
              ? `${selectedCandidates.length} selected (select at least 2 to compare)`
              : `${selectedCandidates.length} selected`}
          </span>
        </div>
      </div>

      <WeaponTilePicker
        ariaLabel="Compare Weapons"
        selectedIds={selectedKeys}
        options={allWeaponsForType.map((w) => {
          const defCand = resolveWeaponCompareCandidate(
            w.key,
            targetCharacterKey,
            good
          )
          const subcaption = defCand.isEquippedBaseline
            ? `Equipped · Lv.${defCand.level} R${defCand.refinement}`
            : defCand.isOwned
              ? `Owned · Lv.${defCand.level} R${defCand.refinement}`
              : `Unowned · Lv.${defCand.level} R${defCand.refinement}`
          return {
            id: w.key,
            weaponKey: w.key,
            label: w.displayName,
            subcaption,
          }
        })}
        onChange={handleToggleWeapon}
      />

      {selectedCandidates.length === 0 ? (
        <div
          className="constraint-empty-line"
          data-testid="weapon-compare-empty-selection"
        >
          Click two or more weapons above to compare their best builds under
          your current constraints.
        </div>
      ) : (
        <>
          {selectedCandidates.length < 2 && (
            <div
              className="constraint-empty-line"
              data-testid="weapon-compare-minimum-notice"
            >
              Select at least one more weapon above — comparing requires at
              least 2 weapons.
            </div>
          )}
          <div
            className="weapon-compare-config-list"
            data-testid="weapon-compare-selected-list"
          >
          {selectedCandidates.map((cand) => {
            const wMeta = getWeaponMeta(cand.weaponKey)
            const isLowRarity = wMeta.rarity <= 2
            const maxLvl = isLowRarity ? 70 : 90
            const maxAsc = isLowRarity ? 4 : 6
            const ascValues = Array.from({ length: maxAsc + 1 }, (_, i) => i)
            const candEffects =
              candidateEffectEntriesByWeapon[cand.weaponKey] ??
              deriveCandidateTargetConditionalsEntry({
                preset: effectivePreset,
                weaponKey: cand.weaponKey,
                targetConditionals: cand.targetConditionals,
                seededTargetConditionals: cand.seededTargetConditionals,
                settings,
                good,
                memberCatalog: targetCatalog,
              })
            const isEffectsExpanded = Boolean(
              expandedEffectsByWeapon[cand.weaponKey]
            )

            return (
              <div
                key={cand.weaponKey}
                className={`weapon-compare-config-row${
                  isEffectsExpanded ? ' is-effects-open' : ''
                }`}
                data-testid={`weapon-compare-config-${cand.weaponKey}`}
                data-weapon-key={cand.weaponKey}
                data-is-owned={cand.isOwned ? 'true' : 'false'}
                data-is-baseline={cand.isEquippedBaseline ? 'true' : 'false'}
                data-setup-differs={candEffects.setupDiffers ? 'true' : 'false'}
              >
                <div className="weapon-compare-config-main">
                  <div className="weapon-compare-config-identity">
                    <WeaponBadge
                      weaponKey={cand.weaponKey}
                      subtitle={`Lv.${cand.level} A${cand.ascension} · R${cand.refinement}`}
                    />
                    {cand.isEquippedBaseline ? (
                      <span
                        className="comp-baseline-tag"
                        data-testid={`weapon-compare-config-baseline-${cand.weaponKey}`}
                        title="Your currently equipped build"
                      >
                        Current
                      </span>
                    ) : cand.isOwned ? (
                      <span
                        className="comp-owned-tag"
                        data-testid={`weapon-compare-config-owned-${cand.weaponKey}`}
                      >
                        Owned
                      </span>
                    ) : (
                      <span
                        className="comp-sim-tag"
                        data-testid={`weapon-compare-config-unowned-${cand.weaponKey}`}
                      >
                        Unowned (Simulated)
                      </span>
                    )}
                    {candEffects.setupDiffers && (
                      <span
                        className="gi-setup-differs-badge"
                        data-testid={`weapon-compare-setup-differs-${cand.weaponKey}`}
                        title={candEffects.setupDiffersTooltip}
                      >
                        Setup differs
                      </span>
                    )}
                  </div>

                  <div className="weapon-compare-config-controls">
                    <label className="presets-filter-label-sm">
                      <span className="muted">Lv.</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`${wMeta.displayName} Level`}
                        data-testid={`weapon-compare-level-${cand.weaponKey}`}
                        value={
                          cand.weaponKey in draftLevels
                            ? draftLevels[cand.weaponKey]!
                            : String(cand.level)
                        }
                        onFocus={() =>
                          handleFocusLevel(cand.weaponKey, cand.level)
                        }
                        onChange={(e) =>
                          handleChangeLevel(cand.weaponKey, e.target.value)
                        }
                        onBlur={() =>
                          handleBlurLevel(cand.weaponKey, cand.level, maxLvl)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                        style={{ width: '64px' }}
                      />
                    </label>

                    <label className="presets-filter-label-sm">
                      <span className="muted">Asc.</span>
                      <select
                        aria-label={`${wMeta.displayName} Ascension`}
                        data-testid={`weapon-compare-ascension-${cand.weaponKey}`}
                        value={cand.ascension}
                        onChange={(e) =>
                          handleUpdateCandidate(cand.weaponKey, {
                            ascension: Number(e.target.value),
                          })
                        }
                      >
                        {ascValues.map((a) => (
                          <option key={a} value={a}>
                            A{a}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="presets-filter-label-sm">
                      <span className="muted">Ref.</span>
                      <select
                        aria-label={`${wMeta.displayName} Refinement`}
                        data-testid={`weapon-compare-refinement-${cand.weaponKey}`}
                        value={cand.refinement}
                        disabled={isLowRarity}
                        onChange={(e) =>
                          handleUpdateCandidate(cand.weaponKey, {
                            refinement: Number(e.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            R{r}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className={`btn-secondary weapon-compare-effects-btn${
                        isEffectsExpanded ? ' is-open' : ''
                      }${candEffects.setupDiffers ? ' is-modified' : ''}`}
                      aria-expanded={isEffectsExpanded}
                      aria-label={`${
                        isEffectsExpanded ? 'Hide' : 'Configure'
                      } ${wMeta.displayName} effects`}
                      data-testid={`weapon-compare-effects-toggle-${cand.weaponKey}`}
                      onClick={() =>
                        setExpandedEffectsByWeapon((prev) => ({
                          ...prev,
                          [cand.weaponKey]: !prev[cand.weaponKey],
                        }))
                      }
                    >
                      <span>Effects ({candEffects.activeCount})</span>
                      <span aria-hidden="true">
                        {isEffectsExpanded ? '▲' : '▼'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn-icon-only btn-danger-ghost"
                      aria-label={`Remove ${wMeta.displayName}`}
                      title={`Remove ${wMeta.displayName}`}
                      data-testid={`weapon-compare-remove-${cand.weaponKey}`}
                      onClick={() => handleToggleWeapon(cand.weaponKey)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>

                {isEffectsExpanded && (
                  <div
                    className="weapon-compare-effects-drawer"
                    data-testid={`weapon-compare-effects-panel-${cand.weaponKey}`}
                  >
                    <div className="weapon-compare-effects-header">
                      <div>
                        <strong>
                          Target Effects for {wMeta.displayName} (
                          {displayName(candEffects.targetKey)})
                        </strong>
                        <p
                          className="muted"
                          style={{ fontSize: '0.78rem', margin: 0 }}
                        >
                          Configure weapon passives, artifact set effects, and
                          character/constellation buffs for this candidate only.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        data-testid={`weapon-compare-effects-reset-${cand.weaponKey}`}
                        disabled={!candEffects.setupDiffers}
                        onClick={() =>
                          handleResetCandidateEffects(cand.weaponKey)
                        }
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.2rem 0.55rem',
                        }}
                      >
                        Reset Effects
                      </button>
                    </div>

                    {candEffects.setupDiffers && (
                      <div
                        className="weapon-compare-effects-diff-banner"
                        data-testid={`weapon-compare-effects-diff-list-${cand.weaponKey}`}
                      >
                        {candEffects.diffs.map((d) => (
                          <span
                            key={`${d.sheet}:${d.key}`}
                            className="weapon-compare-effects-diff-chip"
                          >
                            {d.summary}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="gi-buffs-groups">
                      {/* 1. Candidate Weapon Passive */}
                      <div
                        className="gi-buffs-group"
                        data-testid={`weapon-compare-effects-weapon-${cand.weaponKey}`}
                      >
                        <div className="gi-buffs-group-header">
                          <span className="gi-buffs-group-title">
                            <WeaponTypeIcon
                              weaponType={candEffects.charMeta.weaponType}
                              iconProps={{ size: 14 }}
                            />
                            <span>Weapon Passive</span>
                          </span>
                          <span className="muted" style={{ fontSize: '0.8rem' }}>
                            {wMeta.displayName}
                          </span>
                        </div>
                        {candEffects.weaponConditionals.length > 0 ? (
                          <div className="gi-buffs-rows gi-buffs-grid">
                            {candEffects.weaponConditionals.map((cond) =>
                              renderConditionalRow({
                                characterKey: candEffects.targetKey,
                                cond,
                                effectiveMap: candEffects.effectiveMap,
                                testIdPrefix: `weapon-compare-cond-${cand.weaponKey}`,
                                onSetState: (val) =>
                                  handleSetCandidateCondState(
                                    cand.weaponKey,
                                    cond.sheet,
                                    cond.key,
                                    val
                                  ),
                              })
                            )}
                          </div>
                        ) : (
                          <div className="gi-buffs-empty">
                            No toggleable passive on {wMeta.displayName}.
                          </div>
                        )}
                      </div>

                      {/* 2. Target Artifact Set Effects */}
                      <div
                        className="gi-buffs-group"
                        data-testid={`weapon-compare-effects-artifact-${cand.weaponKey}`}
                      >
                        <div className="gi-buffs-group-header">
                          <span className="gi-buffs-group-title">
                            <SetEmblemIcon size={14} />
                            <span>Artifact Set Effects</span>
                          </span>
                        </div>
                        {candEffects.visibleArtifactConditionals.length > 0 ? (
                          <div className="gi-buffs-rows gi-buffs-grid">
                            {candEffects.visibleArtifactConditionals.map(
                              (cond) =>
                                renderConditionalRow({
                                  characterKey: candEffects.targetKey,
                                  cond,
                                  effectiveMap: candEffects.effectiveMap,
                                  showSetBadge: true,
                                  testIdPrefix: `weapon-compare-cond-${cand.weaponKey}`,
                                  onSetState: (val) =>
                                    handleSetCandidateCondState(
                                      cand.weaponKey,
                                      cond.sheet,
                                      cond.key,
                                      val
                                    ),
                                })
                            )}
                          </div>
                        ) : (
                          <div className="gi-buffs-empty">
                            No toggleable artifact set conditionals.
                          </div>
                        )}
                      </div>

                      {/* 3. Target Character Passives & Talents */}
                      <div
                        className="gi-buffs-group"
                        data-testid={`weapon-compare-effects-character-${cand.weaponKey}`}
                      >
                        <div className="gi-buffs-group-header">
                          <span className="gi-buffs-group-title">
                            <ElementIcon
                              ele={candEffects.charMeta.element}
                              iconProps={{ size: 14 }}
                            />
                            <span>Character Passives &amp; Talents</span>
                          </span>
                        </div>
                        {candEffects.characterConditionals.length > 0 ? (
                          <div className="gi-buffs-rows gi-buffs-grid">
                            {candEffects.characterConditionals.map((cond) =>
                              renderConditionalRow({
                                characterKey: candEffects.targetKey,
                                cond,
                                effectiveMap: candEffects.effectiveMap,
                                testIdPrefix: `weapon-compare-cond-${cand.weaponKey}`,
                                onSetState: (val) =>
                                  handleSetCandidateCondState(
                                    cand.weaponKey,
                                    cond.sheet,
                                    cond.key,
                                    val
                                  ),
                              })
                            )}
                          </div>
                        ) : (
                          <div className="gi-buffs-empty">
                            No toggleable talent passives.
                          </div>
                        )}
                      </div>

                      {/* 4. Target Constellation Effects */}
                      <div
                        className="gi-buffs-group"
                        data-testid={`weapon-compare-effects-constellation-${cand.weaponKey}`}
                      >
                        <div className="gi-buffs-group-header">
                          <span className="gi-buffs-group-title">
                            <ElementIcon
                              ele={candEffects.charMeta.element}
                              iconProps={{ size: 14 }}
                            />
                            <span>Constellation Effects</span>
                          </span>
                        </div>
                        {candEffects.constellationConditionals.length > 0 ? (
                          <div className="gi-buffs-rows gi-buffs-grid">
                            {candEffects.constellationConditionals.map((cond) =>
                              renderConditionalRow({
                                characterKey: candEffects.targetKey,
                                cond,
                                effectiveMap: candEffects.effectiveMap,
                                testIdPrefix: `weapon-compare-cond-${cand.weaponKey}`,
                                onSetState: (val) =>
                                  handleSetCandidateCondState(
                                    cand.weaponKey,
                                    cond.sheet,
                                    cond.key,
                                    val
                                  ),
                              })
                            )}
                          </div>
                        ) : (
                          <div className="gi-buffs-empty">
                            No toggleable constellation conditionals.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </>
      )}
    </div>
  )
}

export interface WeaponComparisonListProps {
  preset: Preset
  result: WeaponCompareResult
  artifactById: ReadonlyMap<string, IArtifact>
  currentBuild?: {
    selection: BuildSelection
    evaluation: RotationResult
  } | null
  onExportGO?: (selection: BuildSelection, label: string) => void
  initialExpandedWeaponKey?: string | null
  settings?: OptimizerSettings
  good?: IGOOD | null
  conditionalsByChar?: Record<string, ConditionalDescriptor[]>
}

export function WeaponComparisonList({
  preset,
  result,
  artifactById,
  currentBuild,
  onExportGO,
  initialExpandedWeaponKey,
  settings,
  good,
  conditionalsByChar,
}: WeaponComparisonListProps) {
  const firstOkKey =
    result.rows.find((r) => r.status === 'ok')?.candidate.weaponKey ?? null
  const defaultExpanded =
    initialExpandedWeaponKey !== undefined
      ? initialExpandedWeaponKey
      : firstOkKey

  const [expandedKey, setExpandedKey] = useState<string | null>(defaultExpanded)
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(
    null
  )
  const [expandedStatKey, setExpandedStatKey] = useState<string | null>(null)

  if (result.rows.length === 0) {
    return null
  }

  const maxTotal = Math.max(result.leaderTotal ?? 1, 1)
  const equippedBaselineRow = result.rows.find(
    (r) =>
      r.status === 'ok' &&
      r.candidate.isEquippedBaseline &&
      Boolean(r.evaluation?.stats)
  )
  const effectiveBaselineStats =
    currentBuild !== undefined
      ? currentBuild?.evaluation?.stats
      : equippedBaselineRow?.evaluation?.stats

  return (
    <div
      className="comp-list"
      data-testid="weapon-comparison-list"
      role="list"
      aria-label="Weapon comparison results"
    >
      {result.rows.map((row) => {
        const wKey = row.candidate.weaponKey
        const specSubtitle = `Lv.${row.candidate.level} A${row.candidate.ascension} · R${row.candidate.refinement}`
        const isBaseline = Boolean(row.candidate.isEquippedBaseline)
        const candEffects = deriveCandidateTargetConditionalsEntry({
          preset,
          weaponKey: wKey,
          targetConditionals: row.candidate.targetConditionals,
          seededTargetConditionals: row.candidate.seededTargetConditionals,
          settings,
          good,
          memberCatalog: conditionalsByChar?.[preset.target] ?? [],
        })

        if (row.status === 'unmet') {
          return (
            <div
              key={wKey}
              role="listitem"
              data-testid={`weapon-compare-row-${wKey}`}
              data-weapon-key={wKey}
              data-status="unmet"
              data-baseline={isBaseline ? 'true' : 'false'}
              data-setup-differs={candEffects.setupDiffers ? 'true' : 'false'}
              className="comp-row comp-row-unmet"
            >
              <div className="comp-row-summary">
                <div className="comp-row-main">
                  <div className="comp-row-rank-group">
                    <span
                      className="comp-rank-pill"
                      data-testid={`weapon-compare-rank-${wKey}`}
                    >
                      —
                    </span>
                    <WeaponBadge weaponKey={wKey} subtitle={specSubtitle} />
                    {isBaseline && (
                      <span
                        className="comp-baseline-tag"
                        data-testid={`weapon-compare-baseline-badge-${wKey}`}
                        title="Your currently equipped build"
                      >
                        Current
                      </span>
                    )}
                    {candEffects.setupDiffers && (
                      <span
                        className="gi-setup-differs-badge"
                        data-testid={`weapon-compare-result-setup-differs-${wKey}`}
                        title={candEffects.setupDiffersTooltip}
                      >
                        Setup differs
                      </span>
                    )}
                  </div>

                  <div className="comp-row-metrics">
                    <span
                      className="error"
                      data-testid={`weapon-compare-unmet-${wKey}`}
                      style={{ fontWeight: 600 }}
                    >
                      No build meets constraints
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        const isBest = row.rank === 1
        const total = row.total ?? 0
        const barPct = Math.max(0, Math.min(100, (total / maxTotal) * 100))
        const isExpanded = expandedKey === wKey
        const pctBehind = row.percentBehindLeader ?? 0
        const isLeader = isBest || pctBehind < 0.05
        const behindText = isLeader ? '0.0%' : `−${pctBehind.toFixed(1)}%`
        const behindAscii = isLeader ? '0.0%' : `-${pctBehind.toFixed(1)}%`
        const stats = row.evaluation?.stats
        const selection = row.bestBuild
        const topBuilds: WeaponCompareBuildEntry[] =
          row.topBuilds && row.topBuilds.length > 0
            ? row.topBuilds
            : row.bestBuild && row.evaluation
              ? [
                  {
                    rank: 1,
                    selection: row.bestBuild,
                    evaluation: row.evaluation,
                  },
                ]
              : []

        return (
          <div
            key={wKey}
            role="listitem"
            data-testid={`weapon-compare-row-${wKey}`}
            data-weapon-key={wKey}
            data-status="ok"
            data-rank={String(row.rank)}
            data-best-weapon={isBest ? 'true' : 'false'}
            data-baseline={isBaseline ? 'true' : 'false'}
            data-setup-differs={candEffects.setupDiffers ? 'true' : 'false'}
            className={`comp-row${isBest ? ' comp-row-best' : ''}${
              isBaseline ? ' comp-row-current' : ''
            }${isExpanded ? ' comp-row-expanded' : ''}`}
          >
            <div
              className="comp-row-summary"
              onClick={() =>
                setExpandedKey((prev) => (prev === wKey ? null : wKey))
              }
            >
              <div className="comp-row-main">
                <div className="comp-row-rank-group">
                  <span
                    className={`comp-rank-pill${
                      isBest ? ' comp-rank-best' : ''
                    }`}
                    data-testid={`weapon-compare-rank-${wKey}`}
                  >
                    #{row.rank}
                  </span>
                  {isBest && (
                    <span
                      className="comp-best-tag"
                      data-testid="best-weapon-badge"
                    >
                      Best
                    </span>
                  )}
                  <WeaponBadge weaponKey={wKey} subtitle={specSubtitle} />
                  {isBaseline && (
                    <span
                      className="comp-baseline-tag"
                      data-testid={`weapon-compare-baseline-badge-${wKey}`}
                      title="Your currently equipped build"
                    >
                      Current
                    </span>
                  )}
                  {candEffects.setupDiffers && (
                    <span
                      className="gi-setup-differs-badge"
                      data-testid={`weapon-compare-result-setup-differs-${wKey}`}
                      title={candEffects.setupDiffersTooltip}
                    >
                      Setup differs
                    </span>
                  )}
                </div>

                <div className="comp-row-bar-wrap">
                  <div
                    className="comp-row-bar-track"
                    title={`${formatNum(total)} Total Rotation DMG (${barPct.toFixed(1)}% of leader)`}
                  >
                    <div
                      className={`comp-row-bar-fill${isBest ? ' is-best' : ''}`}
                      data-testid={`weapon-compare-bar-${wKey}`}
                      style={{ width: `${barPct.toFixed(1)}%` }}
                    />
                  </div>
                </div>

                <div className="comp-row-metrics">
                  <strong
                    className={`comp-row-total${isBest ? ' ok' : ''}`}
                    data-testid={`weapon-compare-total-${wKey}`}
                  >
                    {formatNum(total)}
                  </strong>

                  <span
                    className={`comp-row-delta ${isLeader ? 'ok' : 'muted'}`}
                    data-testid={`weapon-compare-delta-${wKey}`}
                    data-delta-scope="leader"
                    data-pct-behind={pctBehind.toFixed(1)}
                    data-delta-ascii={behindAscii}
                    title={
                      isLeader
                        ? 'Leading weapon total (0.0% vs. #1 leader weapon)'
                        : `${behindAscii} vs. #1 leader weapon`
                    }
                  >
                    {behindText} vs. leader
                  </span>
                </div>

                <button
                  type="button"
                  className="comp-expand-btn"
                  data-testid={`weapon-compare-expand-${wKey}`}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? `Collapse ${displayName(wKey)} build breakdown`
                      : `Expand ${displayName(wKey)} build breakdown`
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedKey((prev) => (prev === wKey ? null : wKey))
                  }}
                >
                  {isExpanded ? 'Hide details ▲' : 'Details ▼'}
                </button>
              </div>

              {selection && (
                <div className="comp-row-meta">
                  <div
                    className="comp-row-artifacts"
                    data-testid={`weapon-compare-artifacts-${wKey}`}
                    aria-label="Equipped artifacts"
                  >
                    {OPTIMIZE_SLOTS.map((slot) => {
                      const artId = selection.artifactIds[slot]
                      const art = artId ? artifactById.get(artId) : undefined
                      if (!art) {
                        return (
                          <span
                            key={slot}
                            className="comp-empty-slot"
                            title={`No ${slot} equipped`}
                          >
                            <ArtifactBadge
                              setKey=""
                              slotKey={slot as IdentifierSlotKey}
                              rarity={1}
                              slotOnly
                              compact
                            />
                          </span>
                        )
                      }
                      return (
                        <ArtifactBadge
                          key={slot}
                          setKey={art.setKey}
                          slotKey={slot as IdentifierSlotKey}
                          rarity={art.rarity}
                          compact
                        />
                      )
                    })}
                  </div>

                  {stats && (
                    <div
                      className="comp-row-stats"
                      data-testid={`weapon-compare-stats-${wKey}`}
                      aria-label="Final character stats"
                    >
                      {CORE_RESULT_STAT_KEYS.map((statKey) => {
                        const rawVal = stats[statKey] ?? 0
                        const isPct = statKey.endsWith('_')
                        const chipVal = isPct
                          ? rawVal * 100
                          : Math.round(rawVal).toLocaleString()
                        return (
                          <StatChip
                            key={statKey}
                            statKey={statKey}
                            value={chipVal}
                            compact
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isExpanded && topBuilds.length > 0 && (
              <div
                className="comp-row-details"
                data-testid={`weapon-compare-details-${wKey}`}
              >
                <div className="comp-details-header">
                  <strong>
                    Top {topBuilds.length} Build
                    {topBuilds.length === 1 ? '' : 's'} for {displayName(wKey)}{' '}
                    (Repeat ×{preset.rotation.repeat ?? 1})
                  </strong>
                </div>

                <div
                  className="weapon-compare-top-builds"
                  data-testid={`weapon-compare-top-builds-${wKey}`}
                  role="list"
                  aria-label={`Top builds for ${displayName(wKey)}`}
                >
                  {topBuilds.map((buildEntry, bIdx) => {
                    const buildRank = buildEntry.rank || bIdx + 1
                    const buildSelection = buildEntry.selection
                    const buildEval = buildEntry.evaluation
                    const buildTotal = buildEval.total
                    const buildStats = buildEval.stats
                    const isTopWeaponBuild = bIdx === 0
                    const buildRowKey = isTopWeaponBuild
                      ? wKey
                      : `${wKey}-b${bIdx}`
                    const buildPctBehindBest =
                      total > 0 && !isTopWeaponBuild
                        ? Math.max(0, ((total - buildTotal) / total) * 100)
                        : 0
                    const buildIsLeader =
                      isTopWeaponBuild || buildPctBehindBest < 0.05
                    const buildBehindText = buildIsLeader
                      ? '0.0%'
                      : `−${buildPctBehindBest.toFixed(1)}%`
                    const buildBehindAscii = buildIsLeader
                      ? '0.0%'
                      : `-${buildPctBehindBest.toFixed(1)}%`
                    const buildBarPct = Math.max(
                      0,
                      Math.min(100, (buildTotal / Math.max(total, 1)) * 100)
                    )

                    return (
                      <div
                        key={bIdx}
                        role="listitem"
                        className={`weapon-compare-build-card${
                          isTopWeaponBuild ? ' is-best-build' : ''
                        }`}
                        data-testid={`weapon-compare-build-${wKey}-${bIdx}`}
                        data-build-rank={String(buildRank)}
                      >
                        <div className="comp-row-main">
                          <div className="comp-row-rank-group">
                            <span
                              className={`comp-rank-pill${
                                isTopWeaponBuild ? ' comp-rank-best' : ''
                              }`}
                              data-testid={`weapon-compare-build-rank-${wKey}-${bIdx}`}
                            >
                              #{buildRank}
                            </span>
                            {isTopWeaponBuild && (
                              <span
                                className="comp-best-tag"
                                data-testid={`weapon-compare-build-best-${wKey}`}
                              >
                                Best
                              </span>
                            )}
                          </div>

                          <div className="comp-row-bar-wrap">
                            <div
                              className="comp-row-bar-track"
                              title={`${formatNum(buildTotal)} Total Rotation DMG (${buildBarPct.toFixed(1)}% of weapon best)`}
                            >
                              <div
                                className={`comp-row-bar-fill${
                                  isTopWeaponBuild ? ' is-best' : ''
                                }`}
                                style={{ width: `${buildBarPct.toFixed(1)}%` }}
                              />
                            </div>
                          </div>

                          <div className="comp-row-metrics">
                            <strong
                              className={`comp-row-total${
                                isTopWeaponBuild ? ' ok' : ''
                              }`}
                              data-testid={`weapon-compare-build-total-${wKey}-${bIdx}`}
                            >
                              {formatNum(buildTotal)}
                            </strong>
                            <span
                              className={`comp-row-delta ${
                                buildIsLeader ? 'ok' : 'muted'
                              }`}
                              data-testid={`weapon-compare-build-delta-${wKey}-${bIdx}`}
                              data-delta-scope="weapon-best"
                              data-delta-ascii={buildBehindAscii}
                              title={
                                buildIsLeader
                                  ? 'Best build for this weapon (0.0% vs. weapon best)'
                                  : `${buildBehindAscii} vs. this weapon's best build`
                              }
                            >
                              {buildBehindText} vs. weapon best
                            </span>
                          </div>

                          {onExportGO && (
                            <button
                              type="button"
                              className="btn-secondary btn-icon"
                              onClick={() =>
                                onExportGO(
                                  buildSelection,
                                  isTopWeaponBuild
                                    ? `weapon-${wKey.toLowerCase()}`
                                    : `weapon-${wKey.toLowerCase()}-rank-${buildRank}`
                                )
                              }
                            >
                              <DownloadIcon size={14} />
                              <span>Verify GO (.json)</span>
                            </button>
                          )}
                        </div>

                        <div className="comp-row-meta">
                          <div
                            className="comp-row-artifacts"
                            data-testid={`weapon-compare-build-artifacts-${wKey}-${bIdx}`}
                            aria-label="Equipped artifacts"
                          >
                            {OPTIMIZE_SLOTS.map((slot) => {
                              const artId = buildSelection.artifactIds[slot]
                              const art = artId
                                ? artifactById.get(artId)
                                : undefined
                              if (!art) {
                                return (
                                  <span
                                    key={slot}
                                    className="comp-empty-slot"
                                    title={`No ${slot} equipped`}
                                  >
                                    <ArtifactBadge
                                      setKey=""
                                      slotKey={slot as IdentifierSlotKey}
                                      rarity={1}
                                      slotOnly
                                      compact
                                    />
                                  </span>
                                )
                              }
                              return (
                                <ArtifactBadge
                                  key={slot}
                                  setKey={art.setKey}
                                  slotKey={slot as IdentifierSlotKey}
                                  rarity={art.rarity}
                                  compact
                                />
                              )
                            })}
                          </div>

                          {buildStats && (
                            <div
                              className="comp-row-stats"
                              data-testid={`weapon-compare-build-stats-${wKey}-${bIdx}`}
                              aria-label="Final character stats"
                            >
                              {CORE_RESULT_STAT_KEYS.map((statKey) => {
                                const rawVal = buildStats[statKey] ?? 0
                                const isPct = statKey.endsWith('_')
                                const chipVal = isPct
                                  ? rawVal * 100
                                  : Math.round(rawVal).toLocaleString()
                                return (
                                  <StatChip
                                    key={statKey}
                                    statKey={statKey}
                                    value={chipVal}
                                    compact
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <div
                          className="comp-details-artifacts-section"
                          data-testid={`weapon-compare-artifacts-section-${wKey}-${bIdx}`}
                        >
                          <div className="comp-details-subheader">
                            <strong>Artifacts</strong>
                            <span
                              className="muted comp-details-subhint"
                              data-testid={`weapon-compare-artifacts-legend-${wKey}-${bIdx}`}
                            >
                              Character badge = equipped owner in imported data
                              · 🔒 = locked in imported data
                            </span>
                          </div>
                          <div
                            className="comp-details-pieces"
                            data-testid={`weapon-compare-build-pieces-${wKey}-${bIdx}`}
                          >
                            {OPTIMIZE_SLOTS.map((slot) => {
                              const artId = buildSelection.artifactIds[slot]
                              const art = artId
                                ? artifactById.get(artId)
                                : undefined
                              if (!art) return null
                              return (
                                <ArtifactPieceRow
                                  key={slot}
                                  setKey={art.setKey}
                                  slotKey={art.slotKey as IdentifierSlotKey}
                                  rarity={art.rarity}
                                  level={art.level}
                                  mainStatKey={art.mainStatKey}
                                  substats={art.substats}
                                  location={art.location}
                                  lock={art.lock}
                                  compact
                                />
                              )
                            })}
                          </div>
                        </div>

                        <div className="gi-table-wrap">
                          <table className="gi-table comp-damage-table">
                            <thead>
                              <tr>
                                <th className="comp-dmg-col-name">
                                  Damage Instance
                                </th>
                                <th className="comp-dmg-col-compact">
                                  Reaction
                                </th>
                                <th className="comp-dmg-col-compact">
                                  Hit Mode
                                </th>
                                <th className="comp-dmg-col-hits">Hits</th>
                                <th className="comp-dmg-col-num">
                                  Per-Hit DMG
                                </th>
                                <th className="comp-dmg-col-num">
                                  Subtotal DMG
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {buildEval.instances.map((inst, idx) => {
                                const targetSpec = preset.rotation.targets[idx]
                                const instanceKey = `${buildRowKey}:${idx}`
                                const isInstExpanded =
                                  expandedInstanceKey === instanceKey
                                return (
                                  <Fragment key={idx}>
                                    <tr
                                      data-testid={`weapon-compare-instance-row-${buildRowKey}-${idx}`}
                                      aria-expanded={
                                        inst.breakdown
                                          ? isInstExpanded
                                          : undefined
                                      }
                                      className={
                                        inst.breakdown
                                          ? 'comp-expandable-tr'
                                          : undefined
                                      }
                                      onClick={
                                        inst.breakdown
                                          ? () =>
                                              setExpandedInstanceKey((prev) =>
                                                prev === instanceKey
                                                  ? null
                                                  : instanceKey
                                              )
                                          : undefined
                                      }
                                    >
                                      <td className="comp-dmg-col-name">
                                        <span className="comp-stat-label-cell">
                                          {inst.breakdown && (
                                            <span
                                              className={`comp-row-chevron${
                                                isInstExpanded
                                                  ? ' is-expanded'
                                                  : ''
                                              }`}
                                              data-testid={`weapon-compare-instance-toggle-${buildRowKey}-${idx}`}
                                              aria-hidden="true"
                                            >
                                              ▸
                                            </span>
                                          )}
                                          <strong>
                                            {formatRotationRowLabel(inst.label)}
                                          </strong>
                                        </span>
                                      </td>
                                      <td className="comp-dmg-col-compact">
                                        <RotationReactionBadge
                                          reaction={targetSpec?.reaction}
                                          compact
                                        />
                                      </td>
                                      <td className="comp-dmg-col-compact">
                                        <RotationHitModeBadge
                                          hitMode={targetSpec?.hitMode}
                                          compact
                                        />
                                      </td>
                                      <td className="comp-dmg-col-hits">
                                        ×{inst.count}
                                      </td>
                                      <td className="comp-dmg-col-num">
                                        {formatNum(inst.perHit)}
                                      </td>
                                      <td className="comp-dmg-col-num">
                                        <strong>
                                          {formatNum(inst.subtotal)}
                                        </strong>
                                      </td>
                                    </tr>
                                    {isInstExpanded && inst.breakdown && (
                                      <tr
                                        className="comp-breakdown-tr"
                                        data-testid={`weapon-compare-instance-breakdown-row-${buildRowKey}-${idx}`}
                                      >
                                        <td colSpan={6}>
                                          <DamageRowBreakdownView
                                            breakdown={inst.breakdown}
                                            rowKey={buildRowKey}
                                            idx={idx}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {buildStats && (
                          <BuildStatComparisonSection
                            rowKey={buildRowKey}
                            stats={buildStats}
                            statBreakdowns={buildEval.statBreakdowns}
                            baselineStats={effectiveBaselineStats}
                            isCurrentBuild={
                              currentBuild !== undefined
                                ? Boolean(
                                    currentBuild &&
                                      (buildEval === currentBuild.evaluation ||
                                        buildSelection ===
                                          currentBuild.selection)
                                  )
                                : isBaseline && isTopWeaponBuild
                            }
                            expandedStatKey={expandedStatKey}
                            onToggleStatKey={(key) =>
                              setExpandedStatKey((prev) =>
                                prev === key ? null : key
                              )
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface PresetRotationSummaryProps {
  preset: Preset
  showFormulaPath?: boolean
}

export function PresetRotationSummary({
  preset,
  showFormulaPath = false,
}: PresetRotationSummaryProps) {
  const hasMultiMemberRows = preset.rotation.targets.some(
    (rt) =>
      resolveRotationTargetOwner(rt, preset).memberKey !== preset.target ||
      Boolean(rt.member)
  )

  return (
    <div
      className="preset-rotation-summary"
      data-testid="preset-rotation-summary"
    >
      <div className="comp-details-header">
        <strong>
          Rotation: {preset.rotation.name} (Repeat ×
          {preset.rotation.repeat ?? 1})
        </strong>
      </div>
      <div className="gi-table-wrap">
        <table className="gi-table">
          <thead>
            <tr>
              <th>Damage Instance</th>
              {showFormulaPath && <th>GO Formula Path</th>}
              <th>Reaction</th>
              <th>Hit Mode</th>
              <th>Hit Count</th>
            </tr>
          </thead>
          <tbody>
            {preset.rotation.targets.map((rt, idx) => {
              const { memberKey } = resolveRotationTargetOwner(rt, preset)
              return (
                <tr
                  key={idx}
                  data-testid={`preset-rotation-row-${idx}`}
                  data-member-key={memberKey}
                >
                  <td>
                    <span className="comp-stat-label-cell">
                      {hasMultiMemberRows && (
                        <span
                          data-testid={`preset-rotation-member-${idx}`}
                          style={{ display: 'inline-flex' }}
                        >
                          <CharacterBadge characterKey={memberKey} compact />
                        </span>
                      )}
                      <strong>
                        {formatRotationRowLabel(rt.label, rt.path)}
                      </strong>
                    </span>
                  </td>
                  {showFormulaPath && (
                    <td>
                      <code>{rt.path.join('.')}</code>
                    </td>
                  )}
                  <td>
                    <RotationReactionBadge reaction={rt.reaction} compact />
                  </td>
                  <td>
                    <RotationHitModeBadge hitMode={rt.hitMode} compact />
                  </td>
                  <td>×{rt.count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SLOT_FILTER_LABELS: Record<VariableMainStatSlotKey, string> = {
  sands: 'Sands',
  goblet: 'Goblet',
  circlet: 'Circlet',
}

const POOL_FILTERS_SESSION_KEY = 'gi:solver-pool-filters-expanded'
let sessionPoolFiltersExpanded: boolean | null = null

function readPoolFiltersSessionExpanded(): boolean | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(POOL_FILTERS_SESSION_KEY)
      if (stored === 'true') return true
      if (stored === 'false') return false
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return sessionPoolFiltersExpanded
}

function writePoolFiltersSessionExpanded(val: boolean): void {
  sessionPoolFiltersExpanded = val
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(POOL_FILTERS_SESSION_KEY, String(val))
    }
  } catch {
    // Ignore storage access errors
  }
}

export function resetSolverPoolFiltersExpandedSession(): void {
  sessionPoolFiltersExpanded = null
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(POOL_FILTERS_SESSION_KEY)
    }
  } catch {
    // Ignore storage access errors
  }
}

export interface SolverPoolFiltersPanelProps {
  settings: OptimizerSettings
  onChange: (next: OptimizerSettings) => void
}

export function SolverPoolFiltersPanel({
  settings,
  onChange,
}: SolverPoolFiltersPanelProps) {
  const [draftValues, setDraftValues] = useState<
    Partial<Record<'levelLow' | 'levelHigh' | 'minRv', string>>
  >({})
  const [sessionExpanded, setSessionExpanded] = useState<boolean | null>(() =>
    readPoolFiltersSessionExpanded()
  )
  const summary = summarizeSolverPoolFilters(settings)
  const mainStatAssumptionLevel = settings.mainStatAssumptionLevel ?? 0
  const assumptionFilterActive = mainStatAssumptionLevel > 0
  const isPoolUnrestricted = summary.isUnrestricted && !assumptionFilterActive
  const isExpanded =
    sessionExpanded !== null ? sessionExpanded : !isPoolUnrestricted
  const mainStatKeys: MainStatAllowlistMap = settings.mainStatKeys ?? {}
  const requiredSubstats: string[] = settings.requiredSubstats ?? []
  const requiredSubstatsMode: RequiredSubstatsMode =
    settings.requiredSubstatsMode === 'any' ? 'any' : 'all'
  const minRarity = settings.minRarity ?? 1
  const minRv = settings.minRv ?? 0
  const levelLow = settings.levelLow ?? 0
  const levelHigh = settings.levelHigh ?? 20
  const levelFilterActive = levelLow > 0 || levelHigh < 20
  const rarityFilterActive = minRarity > 1
  const rvFilterActive = minRv > 0
  const substatsFilterActive = requiredSubstats.length > 0

  function toggleExpanded() {
    const next = !isExpanded
    writePoolFiltersSessionExpanded(next)
    setSessionExpanded(next)
  }

  function handleFocusNumericField(
    field: 'levelLow' | 'levelHigh' | 'minRv',
    currentVal: number
  ) {
    setDraftValues((prev) => {
      if (field in prev) return prev
      return {
        ...prev,
        [field]: String(currentVal),
      }
    })
  }

  function handleChangeNumericField(
    field: 'levelLow' | 'levelHigh' | 'minRv',
    rawValue: string
  ) {
    setDraftValues((prev) => ({
      ...prev,
      [field]: rawValue,
    }))
  }

  function handleBlurNumericField(field: 'levelLow' | 'levelHigh' | 'minRv') {
    const raw = draftValues[field]
    setDraftValues((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    if (raw === undefined) return
    const trimmed = raw.trim()
    const parsed = trimmed !== '' ? Number(trimmed) : Number.NaN
    if (field === 'levelLow') {
      const nextLow = Number.isFinite(parsed)
        ? Math.max(0, Math.min(20, Math.round(parsed)))
        : 0
      onChange({
        ...settings,
        levelLow: nextLow,
      })
    } else if (field === 'levelHigh') {
      const nextHigh = Number.isFinite(parsed)
        ? Math.max(0, Math.min(20, Math.round(parsed)))
        : 20
      onChange({
        ...settings,
        levelHigh: nextHigh,
      })
    } else if (field === 'minRv') {
      const nextRv =
        Number.isFinite(parsed) && parsed > 0
          ? Math.min(900, Math.max(0, parsed))
          : 0
      onChange({
        ...settings,
        minRv: nextRv,
      })
    }
  }

  function toggleSlotMainStat(slot: VariableMainStatSlotKey, statKey: string) {
    const existing = mainStatKeys[slot] ?? []
    const isSelected = existing.includes(statKey)
    const nextSlotList = isSelected
      ? existing.filter((k) => k !== statKey)
      : [...existing, statKey]
    const nextMainStatKeys: MainStatAllowlistMap = { ...mainStatKeys }
    if (nextSlotList.length === 0) {
      delete nextMainStatKeys[slot]
    } else {
      nextMainStatKeys[slot] = nextSlotList
    }
    onChange({
      ...settings,
      mainStatKeys: nextMainStatKeys,
    })
  }

  function clearSlotMainStats(slot: VariableMainStatSlotKey) {
    const nextMainStatKeys: MainStatAllowlistMap = { ...mainStatKeys }
    delete nextMainStatKeys[slot]
    onChange({
      ...settings,
      mainStatKeys: nextMainStatKeys,
    })
  }

  function toggleRequiredSubstat(substatKey: string) {
    const isSelected = requiredSubstats.includes(substatKey)
    const nextList = isSelected
      ? requiredSubstats.filter((k) => k !== substatKey)
      : [...requiredSubstats, substatKey]
    onChange({
      ...settings,
      requiredSubstats: nextList,
    })
  }

  return (
    <div
      className="opt-pool-filters-panel"
      data-testid="solver-pool-filters-panel"
      data-expanded={isExpanded ? 'true' : 'false'}
    >
      <div className="opt-filter-panel-header">
        <button
          type="button"
          data-testid="solver-pool-filters-toggle"
          aria-expanded={isExpanded}
          className="opt-filter-panel-title"
          onClick={toggleExpanded}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            textAlign: 'left',
          }}
        >
          <span
            className={`comp-chevron${isExpanded ? ' is-open' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
          <span>
            Artifact Pool Filters (Main Stats · Substats · Rarity · RV)
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            data-testid="solver-pool-filters-summary"
            className="opt-filter-panel-summary"
            style={{
              color: isPoolUnrestricted ? 'var(--ok)' : 'var(--warn)',
            }}
          >
            <span>
              {isPoolUnrestricted
                ? 'Pool Filters — unrestricted ('
                : 'Pool Filters — '}
            </span>
            {summary.text}
            {assumptionFilterActive
              ? ` · Assume Lv. ${mainStatAssumptionLevel}+`
              : ''}
            {isPoolUnrestricted ? <span>)</span> : null}
          </span>
          {!isPoolUnrestricted && (
            <button
              type="button"
              data-testid="solver-pool-filters-reset"
              className="secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.82rem' }}
              onClick={() => {
                setDraftValues({})
                onChange({
                  ...resetSolverPoolFilters(settings),
                  mainStatAssumptionLevel: 0,
                })
              }}
            >
              Reset Pool Filters
            </button>
          )}
          <span
            className="gi-collapsible-toggle-btn"
            data-testid="pool-filters-show-hide-label"
            onClick={toggleExpanded}
          >
            [{isExpanded ? 'Hide' : 'Show'}]
          </span>
        </div>
      </div>

      {isExpanded && (
        <div
          data-testid="solver-pool-filters-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {/* 1. Main-Stat Allowlist per Slot */}
          <div className="opt-pool-filters-section">
            <div className="opt-pool-filters-subtitle">
              Main-Stat Allowlist per Slot{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                (none selected = all main stats allowed)
              </span>
            </div>
            <div className="opt-pool-mainstat-grid">
              {VARIABLE_MAIN_STAT_SLOTS.map((slot) => {
                const slotOptions = ART_SLOT_MAIN_KEYS[slot]
                const selectedForSlot = mainStatKeys[slot] ?? []
                const slotActive = selectedForSlot.length > 0
                const coreOptions = slotOptions.filter(
                  (statKey) => !statKey.endsWith('_dmg_')
                )
                const dmgOptions = slotOptions.filter((statKey) =>
                  statKey.endsWith('_dmg_')
                )
                const renderChip = (statKey: string) => {
                  const isSelected = selectedForSlot.includes(statKey)
                  return (
                    <button
                      key={statKey}
                      type="button"
                      data-testid={`mainstat-chip-${slot}-${statKey}`}
                      aria-pressed={isSelected}
                      className={`constraint-picker-chip${isSelected ? ' is-selected' : ''}`}
                      onClick={() => toggleSlotMainStat(slot, statKey)}
                    >
                      <StatIcon statKey={statKey} iconProps={{ size: 13 }} />
                      <span>{shortStatLabel(statKey)}</span>
                    </button>
                  )
                }
                return (
                  <div
                    key={slot}
                    className={`opt-pool-slot-row${slotActive ? ' is-active' : ''}`}
                    data-testid={`mainstat-filter-row-${slot}`}
                    data-active={slotActive ? 'true' : 'false'}
                  >
                    <div className="opt-pool-slot-label">
                      <span className="opt-pool-slot-name">
                        <SlotIcon slotKey={slot} iconProps={{ size: 15 }} />
                        {SLOT_FILTER_LABELS[slot]}
                      </span>
                      <div className="opt-pool-slot-status">
                        <span
                          className={
                            slotActive ? 'opt-pool-active-pill' : 'muted'
                          }
                          style={
                            slotActive ? undefined : { fontSize: '0.82rem' }
                          }
                          data-testid={`mainstat-summary-${slot}`}
                        >
                          {selectedForSlot.length === 0
                            ? 'All'
                            : `${selectedForSlot.length} allowed`}
                        </span>
                        {slotActive && (
                          <button
                            type="button"
                            data-testid={`mainstat-clear-${slot}`}
                            className="secondary opt-pool-clear-btn"
                            onClick={() => clearSlotMainStats(slot)}
                          >
                            Any
                          </button>
                        )}
                      </div>
                    </div>
                    {dmgOptions.length > 0 ? (
                      <div className="opt-pool-chip-groups">
                        <div
                          className="opt-pool-chip-subgroup"
                          data-testid={`mainstat-core-subgroup-${slot}`}
                        >
                          {coreOptions.map(renderChip)}
                        </div>
                        <div
                          className="opt-pool-chip-subgroup-dmg"
                          data-testid={`mainstat-dmg-subgroup-${slot}`}
                        >
                          {dmgOptions.map(renderChip)}
                        </div>
                      </div>
                    ) : (
                      <div className="opt-pool-chip-wrap">
                        {slotOptions.map(renderChip)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Required Substats */}
          <div className="opt-pool-filters-section">
            <div
              className="opt-pool-filters-subtitle"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                Required Substats{' '}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (pieces must contain chosen substats)
                </span>
              </span>
              <div
                className={`opt-pool-toggle-group${substatsFilterActive ? ' is-filter-active' : ' is-filter-idle'}`}
              >
                <button
                  type="button"
                  data-testid="required-substats-mode-all"
                  aria-pressed={requiredSubstatsMode === 'all'}
                  className={`gi-toggle-btn${
                    requiredSubstatsMode === 'all' ? ' is-selected' : ' secondary'
                  }${
                    substatsFilterActive && requiredSubstatsMode === 'all'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={() =>
                    onChange({ ...settings, requiredSubstatsMode: 'all' })
                  }
                >
                  All of
                </button>
                <button
                  type="button"
                  data-testid="required-substats-mode-any"
                  aria-pressed={requiredSubstatsMode === 'any'}
                  className={`gi-toggle-btn${
                    requiredSubstatsMode === 'any' ? ' is-selected' : ' secondary'
                  }${
                    substatsFilterActive && requiredSubstatsMode === 'any'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={() =>
                    onChange({ ...settings, requiredSubstatsMode: 'any' })
                  }
                >
                  Any of
                </button>
                {substatsFilterActive && (
                  <button
                    type="button"
                    data-testid="required-substats-clear"
                    className="secondary opt-pool-clear-btn"
                    onClick={() =>
                      onChange({ ...settings, requiredSubstats: [] })
                    }
                  >
                    Clear ({requiredSubstats.length})
                  </button>
                )}
              </div>
            </div>
            <div className="opt-pool-chip-wrap">
              {ALL_SUBSTAT_KEYS.map((subKey) => {
                const isSelected = requiredSubstats.includes(subKey)
                return (
                  <button
                    key={subKey}
                    type="button"
                    data-testid={`required-substat-chip-${subKey}`}
                    aria-pressed={isSelected}
                    className={`constraint-picker-chip${isSelected ? ' is-selected' : ''}`}
                    onClick={() => toggleRequiredSubstat(subKey)}
                  >
                    <StatIcon statKey={subKey} iconProps={{ size: 13 }} />
                    <span>{shortStatLabel(subKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Level Range, Minimum Rarity & Minimum RV Threshold */}
          <div className="opt-pool-filters-bottom-row">
            <div
              className={`opt-pool-filter-field${levelFilterActive ? ' is-active' : ''}`}
              data-testid="pool-filter-field-level"
              data-active={levelFilterActive ? 'true' : 'false'}
            >
              <div className="opt-pool-field-header">
                <span className="opt-pool-field-label">
                  Artifact Level Range
                </span>
                {levelFilterActive && (
                  <span
                    className="opt-pool-active-pill"
                    data-testid="pool-filter-active-level"
                  >
                    Lv. {levelLow}–{levelHigh}
                  </span>
                )}
              </div>
              <div className="opt-pool-field-controls">
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="pool-filter-level-low"
                  aria-label="Pool Filter Level Min"
                  value={
                    'levelLow' in draftValues
                      ? draftValues.levelLow!
                      : String(settings.levelLow)
                  }
                  onFocus={() =>
                    handleFocusNumericField('levelLow', settings.levelLow)
                  }
                  onChange={(e) =>
                    handleChangeNumericField('levelLow', e.target.value)
                  }
                  onBlur={() => handleBlurNumericField('levelLow')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  style={{ width: '58px' }}
                />
                <span className="muted">to</span>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="pool-filter-level-high"
                  aria-label="Pool Filter Level Max"
                  value={
                    'levelHigh' in draftValues
                      ? draftValues.levelHigh!
                      : String(settings.levelHigh)
                  }
                  onFocus={() =>
                    handleFocusNumericField('levelHigh', settings.levelHigh)
                  }
                  onChange={(e) =>
                    handleChangeNumericField('levelHigh', e.target.value)
                  }
                  onBlur={() => handleBlurNumericField('levelHigh')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  style={{ width: '58px' }}
                />
              </div>
            </div>

            <div
              className={`opt-pool-filter-field${rarityFilterActive ? ' is-active' : ''}`}
              data-testid="pool-filter-field-rarity"
              data-active={rarityFilterActive ? 'true' : 'false'}
            >
              <div className="opt-pool-field-header">
                <span className="opt-pool-field-label">Minimum Rarity</span>
                {rarityFilterActive && (
                  <span
                    className="opt-pool-active-pill"
                    data-testid="pool-filter-active-rarity"
                  >
                    {minRarity === 5 ? '5★ Only' : `${minRarity}★+`}
                  </span>
                )}
              </div>
              <div
                className="opt-pool-toggle-group"
                role="group"
                aria-label="Minimum Artifact Rarity"
              >
                {([1, 2, 3, 4, 5] as const).map((r) => {
                  const active = minRarity === r
                  return (
                    <button
                      key={r}
                      type="button"
                      data-testid={`pool-filter-rarity-${r}`}
                      aria-pressed={active}
                      className={`gi-toggle-btn${
                        active ? ' is-selected' : ' secondary'
                      }${active && r > 1 ? ' is-active' : ''}`}
                      onClick={() => onChange({ ...settings, minRarity: r })}
                    >
                      {r === 1 ? 'All (1★+)' : r === 5 ? '5★ Only' : `${r}★+`}
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              className={`opt-pool-filter-field${rvFilterActive ? ' is-active' : ''}`}
              data-testid="pool-filter-field-rv"
              data-active={rvFilterActive ? 'true' : 'false'}
            >
              <div className="opt-pool-field-header">
                <span className="opt-pool-field-label">
                  Minimum Roll Value (RV)
                </span>
                {rvFilterActive && (
                  <span
                    className="opt-pool-active-pill"
                    data-testid="pool-filter-active-rv"
                  >
                    ≥ {minRv}% RV
                  </span>
                )}
              </div>
              <div className="opt-pool-field-controls">
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="pool-filter-min-rv"
                  aria-label="Minimum Artifact RV (%)"
                  value={
                    'minRv' in draftValues ? draftValues.minRv! : String(minRv)
                  }
                  onFocus={() => handleFocusNumericField('minRv', minRv)}
                  onChange={(e) =>
                    handleChangeNumericField('minRv', e.target.value)
                  }
                  onBlur={() => handleBlurNumericField('minRv')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  style={{ width: '76px' }}
                />
                <span className="muted" style={{ fontSize: '0.82rem' }}>
                  % RV min
                </span>
              </div>
            </div>

            <div
              className={`opt-pool-filter-field${assumptionFilterActive ? ' is-active' : ''}`}
              data-testid="pool-filter-field-assumption"
              data-active={assumptionFilterActive ? 'true' : 'false'}
            >
              <div className="opt-pool-field-header">
                <span className="opt-pool-field-label">
                  Main-Stat Assumption Level
                </span>
                {assumptionFilterActive && (
                  <span
                    className="opt-pool-active-pill"
                    data-testid="pool-filter-active-assumption"
                  >
                    Assume Lv. {mainStatAssumptionLevel}+
                  </span>
                )}
              </div>
              <div className="opt-pool-field-controls">
                <select
                  aria-label="Main-Stat Assumption Level"
                  data-testid="pool-filter-main-stat-assumption"
                  value={mainStatAssumptionLevel}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      mainStatAssumptionLevel: Number(e.target.value) as
                        | 0
                        | 4
                        | 8
                        | 12
                        | 16
                        | 20,
                    })
                  }
                >
                  <option value={0}>No Assumption (Actual Level)</option>
                  <option value={4}>Assume at least Lv. 4</option>
                  <option value={8}>Assume at least Lv. 8</option>
                  <option value={12}>Assume at least Lv. 12</option>
                  <option value={16}>Assume at least Lv. 16</option>
                  <option value={20}>Assume Full Level (Lv. 20)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export interface TeamOptimizationListProps {
  preset: Preset
  result: TeamOptimizeResult
  artifactById: ReadonlyMap<string, IArtifact>
}

export function TeamOptimizationList({
  preset,
  result,
  artifactById,
}: TeamOptimizationListProps) {
  const firstActiveMember =
    result.members.find((m) => !m.skippedSolver)?.memberKey ?? null
  const [expandedMemberKey, setExpandedMemberKey] = useState<string | null>(
    firstActiveMember
  )
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(
    null
  )
  const [expandedStatKey, setExpandedStatKey] = useState<string | null>(null)

  const teamDelta = formatRelativeDelta(
    result.teamTotal,
    result.currentTeamTotal
  )
  const isTeamImproved = teamDelta.sign === '+'
  const teamStatus = isTeamImproved
    ? 'improved'
    : teamDelta.sign === '-'
      ? 'decreased'
      : 'unchanged'

  return (
    <div
      className="comp-list team-opt-list"
      data-testid="team-optimization-list"
      aria-label="Team Optimization Results"
    >
      <div
        className={`comp-row${
          isTeamImproved ? ' comp-row-best is-best' : ''
        } team-opt-summary-banner`}
        data-testid="team-opt-summary-banner"
        data-team-status={teamStatus}
      >
        <div className="comp-row-summary">
          <div className="comp-row-main">
            <div className="comp-row-rank">
              <span
                className={`comp-rank-pill${
                  isTeamImproved ? ' comp-rank-best is-best' : ''
                }`}
                data-testid="team-opt-banner-pill"
              >
                Team Total
              </span>
              <span className={isTeamImproved ? 'comp-best-tag' : 'muted'}>
                Artifacts assigned without overlap
              </span>
            </div>
            <div className="comp-row-metrics">
              <strong
                className={`comp-row-total${
                  isTeamImproved
                    ? ' ok'
                    : teamDelta.sign === '-'
                      ? ' muted'
                      : ''
                }`}
                data-testid="team-opt-total"
              >
                {formatNum(result.teamTotal)}
              </strong>
              <span
                className={`comp-row-delta ${teamDelta.cls}`}
                data-testid="team-opt-delta"
                data-delta-sign={teamDelta.sign}
                data-delta-ascii={teamDelta.asciiText}
              >
                {teamDelta.text} vs. Current ({formatNum(result.currentTeamTotal)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {result.members.map((memberRes) => {
        const mKey = memberRes.memberKey
        const rowId = `team-${mKey}`
        const isExpanded = expandedMemberKey === mKey
        const memberDelta = formatRelativeDelta(
          memberRes.subtotal,
          memberRes.currentSubtotal
        )
        const stats = memberRes.evaluation?.stats
        const memberRows = preset.rotation.targets.filter(
          (rt) => resolveRotationTargetOwner(rt, preset).memberKey === mKey
        )

        if (memberRes.skippedSolver) {
          return (
            <div
              key={mKey}
              className="comp-row team-opt-member-row is-skipped"
              data-testid={`team-opt-member-${mKey}`}
              data-member-key={mKey}
              data-skipped-solver="true"
            >
              <div className="comp-row-summary">
                <div className="comp-row-main">
                  <div className="comp-row-rank">
                    <span className="comp-rank-pill">{displayName(mKey)}</span>
                    <CharacterBadge characterKey={mKey} compact />
                  </div>
                  <span
                    className="comp-sim-tag"
                    data-testid={`team-opt-skipped-${mKey}`}
                  >
                    No rotation rows — kept current/simulated gear (solver skipped)
                  </span>
                </div>
              </div>
            </div>
          )
        }

        const isMemberImproved = memberDelta.sign === '+'
        const memberStatus = isMemberImproved
          ? 'improved'
          : memberDelta.sign === '-'
            ? 'decreased'
            : 'unchanged'

        return (
          <div
            key={mKey}
            className={`comp-row team-opt-member-row${
              isMemberImproved ? ' comp-row-best is-best' : ''
            }`}
            data-testid={`team-opt-member-${mKey}`}
            data-member-key={mKey}
            data-skipped-solver="false"
            data-member-status={memberStatus}
            data-member-delta-sign={memberDelta.sign}
          >
            <div
              className="comp-row-summary"
              onClick={() =>
                setExpandedMemberKey((prev) => (prev === mKey ? null : mKey))
              }
            >
              <div className="comp-row-main">
                <div className="comp-row-rank">
                  <span
                    className={`comp-rank-pill${
                      isMemberImproved ? ' comp-rank-best is-best' : ''
                    }`}
                    data-testid={`team-opt-rank-${mKey}`}
                  >
                    {displayName(mKey)}
                  </span>
                  <CharacterBadge characterKey={mKey} compact />
                  <span className="muted" style={{ fontSize: '0.82rem' }}>
                    {memberRes.rotationRowCount} rotation{' '}
                    {memberRes.rotationRowCount === 1 ? 'row' : 'rows'}
                  </span>
                </div>

                <div className="comp-row-metrics">
                  <strong
                    className={`comp-row-total${
                      isMemberImproved
                        ? ' ok'
                        : memberDelta.sign === '-'
                          ? ' muted'
                          : ''
                    }`}
                    data-testid={`team-opt-subtotal-${mKey}`}
                  >
                    {formatNum(memberRes.subtotal)}
                  </strong>
                  <span
                    className={`comp-row-delta ${memberDelta.cls}`}
                    data-testid={`team-opt-member-delta-${mKey}`}
                    data-delta-sign={memberDelta.sign}
                  >
                    {memberDelta.text}
                  </span>
                </div>

                <button
                  type="button"
                  className="comp-expand-btn"
                  data-testid={`team-opt-expand-${mKey}`}
                  aria-expanded={isExpanded}
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedMemberKey((prev) =>
                      prev === mKey ? null : mKey
                    )
                  }}
                >
                  {isExpanded ? 'Hide details ▲' : 'Details ▼'}
                </button>
              </div>

              <div className="comp-row-meta">
                <div
                  className="comp-row-artifacts"
                  data-testid={`team-opt-artifacts-${mKey}`}
                  aria-label={`${displayName(mKey)} equipped artifacts`}
                >
                  {OPTIMIZE_SLOTS.map((slot) => {
                    const artId = memberRes.selection.artifactIds[slot]
                    const art = artId ? artifactById.get(artId) : undefined
                    if (!art) {
                      return (
                        <span
                          key={slot}
                          className="comp-empty-slot"
                          title={`No ${slot} equipped`}
                        >
                          <ArtifactBadge
                            setKey=""
                            slotKey={slot as IdentifierSlotKey}
                            rarity={1}
                            slotOnly
                            compact
                          />
                        </span>
                      )
                    }
                    return (
                      <ArtifactBadge
                        key={slot}
                        setKey={art.setKey}
                        slotKey={slot as IdentifierSlotKey}
                        rarity={art.rarity}
                        compact
                      />
                    )
                  })}
                </div>

                {stats && (
                  <div
                    className="comp-row-stats"
                    data-testid={`team-opt-stats-${mKey}`}
                    aria-label={`${displayName(mKey)} final stats`}
                  >
                    {CORE_RESULT_STAT_KEYS.map((statKey) => {
                      const rawVal = stats[statKey] ?? 0
                      const isPct = statKey.endsWith('_')
                      const chipVal = isPct
                        ? rawVal * 100
                        : Math.round(rawVal).toLocaleString()
                      return (
                        <StatChip
                          key={statKey}
                          statKey={statKey}
                          value={chipVal}
                          compact
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {isExpanded && memberRes.evaluation && (
              <div
                className="comp-row-details"
                data-testid={`team-opt-details-${mKey}`}
              >
                <div className="comp-details-header">
                  <strong>
                    {displayName(mKey)} — Rotation Breakdown (Repeat ×
                    {preset.rotation.repeat ?? 1})
                  </strong>
                </div>

                <div className="gi-table-wrap">
                  <table className="gi-table comp-damage-table">
                    <thead>
                      <tr>
                        <th className="comp-dmg-col-name">Damage Instance</th>
                        <th className="comp-dmg-col-compact">Reaction</th>
                        <th className="comp-dmg-col-compact">Hit Mode</th>
                        <th className="comp-dmg-col-hits">Hits</th>
                        <th className="comp-dmg-col-num">Per-Hit DMG</th>
                        <th className="comp-dmg-col-num">Subtotal DMG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberRes.evaluation.instances.map((inst, idx) => {
                        const targetSpec = memberRows[idx]
                        const instanceKey = `${rowId}:${idx}`
                        const isInstExpanded =
                          expandedInstanceKey === instanceKey
                        return (
                          <Fragment key={idx}>
                            <tr
                              data-testid={`team-opt-instance-row-${mKey}-${idx}`}
                              aria-expanded={
                                inst.breakdown ? isInstExpanded : undefined
                              }
                              className={
                                inst.breakdown
                                  ? 'comp-expandable-tr'
                                  : undefined
                              }
                              onClick={
                                inst.breakdown
                                  ? () =>
                                      setExpandedInstanceKey((prev) =>
                                        prev === instanceKey
                                          ? null
                                          : instanceKey
                                      )
                                  : undefined
                              }
                            >
                              <td className="comp-dmg-col-name">
                                <span className="comp-stat-label-cell">
                                  {inst.breakdown && (
                                    <span
                                      className={`comp-row-chevron${
                                        isInstExpanded ? ' is-expanded' : ''
                                      }`}
                                      data-testid={`team-opt-instance-toggle-${mKey}-${idx}`}
                                      aria-hidden="true"
                                    >
                                      ▸
                                    </span>
                                  )}
                                  <strong>
                                    {formatRotationRowLabel(inst.label)}
                                  </strong>
                                </span>
                              </td>
                              <td className="comp-dmg-col-compact">
                                <RotationReactionBadge
                                  reaction={targetSpec?.reaction}
                                  compact
                                />
                              </td>
                              <td className="comp-dmg-col-compact">
                                <RotationHitModeBadge
                                  hitMode={targetSpec?.hitMode}
                                  compact
                                />
                              </td>
                              <td className="comp-dmg-col-hits">×{inst.count}</td>
                              <td className="comp-dmg-col-num">
                                {formatNum(inst.perHit)}
                              </td>
                              <td className="comp-dmg-col-num">
                                <strong>{formatNum(inst.subtotal)}</strong>
                              </td>
                            </tr>
                            {isInstExpanded && inst.breakdown && (
                              <tr
                                className="comp-breakdown-tr"
                                data-testid={`team-opt-instance-breakdown-row-${mKey}-${idx}`}
                              >
                                <td colSpan={6}>
                                  <DamageRowBreakdownView
                                    breakdown={inst.breakdown}
                                    rowKey={rowId}
                                    idx={idx}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {memberRes.evaluation.stats && (
                  <BuildStatComparisonSection
                    rowKey={rowId}
                    stats={memberRes.evaluation.stats}
                    statBreakdowns={memberRes.evaluation.statBreakdowns}
                    baselineStats={memberRes.currentEvaluation?.stats}
                    isCurrentBuild={false}
                    expandedStatKey={expandedStatKey}
                    onToggleStatKey={(key) =>
                      setExpandedStatKey((prev) => (prev === key ? null : key))
                    }
                  />
                )}

                <div
                  className="comp-details-artifacts-section"
                  data-testid={`team-opt-artifacts-section-${mKey}`}
                >
                  <div className="comp-details-subheader">
                    <strong>Artifacts</strong>
                    <span
                      className="muted comp-details-subhint"
                      data-testid={`team-opt-artifacts-legend-${mKey}`}
                    >
                      Character badge = equipped owner in imported data · 🔒 =
                      locked in imported data
                    </span>
                  </div>
                  <div
                    className="comp-details-pieces"
                    data-testid={`team-opt-details-pieces-${mKey}`}
                  >
                    {OPTIMIZE_SLOTS.map((slot) => {
                      const artId = memberRes.selection.artifactIds[slot]
                      const art = artId ? artifactById.get(artId) : undefined
                      if (!art) return null
                      return (
                        <ArtifactPieceRow
                          key={slot}
                          setKey={art.setKey}
                          slotKey={art.slotKey as IdentifierSlotKey}
                          rarity={art.rarity}
                          level={art.level}
                          mainStatKey={art.mainStatKey}
                          substats={art.substats}
                          location={art.location}
                          lock={art.lock}
                          compact
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
