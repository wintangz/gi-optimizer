'use client'

import {
  ArtifactBadge,
  ArtifactPieceRow,
  StatChip,
} from '@/components/Identifier'
import { DownloadIcon, TrashIcon } from '@/components/SvgIcons'
import { shortStatLabel } from '@/lib/itemMeta'
import type {
  ArtifactSlot,
  BuildSelection,
  OptimizerSettings,
  RotationResult,
} from '@gi/engine'
import type { IArtifact } from '@gi/good'
import {
  isPercentStatConstraintKey,
  STAT_CONSTRAINT_KEYS,
  type IdentifierSlotKey,
  type Preset,
  type StatConstraint,
  type StatConstraintKey,
} from '@gi/presets'
import { useState } from 'react'

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

function formatDisplayBoundValue(val: number | undefined): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return ''
  return String(val)
}

export interface ConstraintsCardProps {
  settings: OptimizerSettings
  onChange: (next: OptimizerSettings) => void
  initialPickerOpen?: boolean
}

export function ConstraintsCard({
  settings,
  onChange,
  initialPickerOpen = false,
}: ConstraintsCardProps) {
  const [pickerOpen, setPickerOpen] = useState(initialPickerOpen)
  const [draftBounds, setDraftBounds] = useState<Record<string, string>>({})
  const constraints = settings.constraints ?? []
  const usedStats = new Set<string>(constraints.map((c) => c.stat))

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
      aria-label="Constraints"
    >
      <div className="gi-card-header">
        <div>
          <h2 className="gi-card-title">Constraints</h2>
          <p className="gi-card-subtitle">
            Set minimum floors or maximum caps on final character stats.
          </p>
        </div>
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
      </div>

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
                        onFocus={() => handleFocusBound(c.stat, 'min', c.min)}
                        onChange={(e) =>
                          handleChangeBound(idx, c.stat, 'min', e.target.value)
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
                        onFocus={() => handleFocusBound(c.stat, 'max', c.max)}
                        onChange={(e) =>
                          handleChangeBound(idx, c.stat, 'max', e.target.value)
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
    cls: 'error',
  }
}

export function BuildComparisonList({
  preset,
  currentBuild,
  optimizedBuilds,
  artifactById,
  onExportGO,
  initialExpandedRowId,
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
        const barPct = Math.max(4, Math.min(100, (row.total / maxTotal) * 100))
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
                        ? 'Pinned current equipped build baseline'
                        : `${delta.asciiText} vs. Current build`
                    }
                  >
                    {row.kind === 'current' ? 'Baseline' : delta.text}
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
                  <table className="gi-table">
                    <thead>
                      <tr>
                        <th>Damage Instance</th>
                        <th>Hits</th>
                        <th>Per-Hit DMG</th>
                        <th>Subtotal DMG</th>
                        {row.kind === 'optimized' && currentBuild && (
                          <th>vs. Current</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {row.evaluation.instances.map((inst, idx) => {
                        const currInst =
                          currentBuild?.evaluation.instances[idx]
                        const instDelta =
                          row.kind === 'optimized' && currInst
                            ? formatRelativeDelta(
                                inst.subtotal,
                                currInst.subtotal
                              )
                            : null
                        return (
                          <tr key={idx}>
                            <td>
                              <strong>{inst.label}</strong>
                            </td>
                            <td>×{inst.count}</td>
                            <td>{formatNum(inst.perHit)}</td>
                            <td>
                              <strong>{formatNum(inst.subtotal)}</strong>
                            </td>
                            {row.kind === 'optimized' && currentBuild && (
                              <td className={instDelta?.cls ?? 'muted'}>
                                {instDelta ? instDelta.text : '—'}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="comp-details-pieces">
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
            )}
          </div>
        )
      })}
    </div>
  )
}
