'use client'

import { CharacterBadge } from '@/components/Identifier'
import { ChevronIcon } from '@/components/SvgIcons'
import type { MemberStatSummary } from '@gi/engine'
import {
  FAST_MODE_STAT_KEYS,
  displayName,
  hasMemberFastMode,
  resolvePresetMemberBuildMode,
  type FastModeStatKey,
  type FastModeStats,
  type MemberBuildMode,
  type Preset,
  type PresetFastModeMap,
} from '@gi/presets'
import { useEffect, useState } from 'react'

export const FAST_MODE_STAT_META: Record<
  FastModeStatKey,
  { shortLabel: string; fullLabel: string; isPercent: boolean }
> = {
  hp: { shortLabel: 'HP', fullLabel: 'Flat HP', isPercent: false },
  hp_: { shortLabel: 'HP%', fullLabel: 'HP%', isPercent: true },
  atk: { shortLabel: 'ATK', fullLabel: 'Flat ATK', isPercent: false },
  atk_: { shortLabel: 'ATK%', fullLabel: 'ATK%', isPercent: true },
  def: { shortLabel: 'DEF', fullLabel: 'Flat DEF', isPercent: false },
  def_: { shortLabel: 'DEF%', fullLabel: 'DEF%', isPercent: true },
  eleMas: { shortLabel: 'EM', fullLabel: 'Elemental Mastery', isPercent: false },
  enerRech_: {
    shortLabel: 'ER%',
    fullLabel: 'Energy Recharge',
    isPercent: true,
  },
  critRate_: { shortLabel: 'CR%', fullLabel: 'CRIT Rate', isPercent: true },
  critDMG_: { shortLabel: 'CD%', fullLabel: 'CRIT DMG', isPercent: true },
}

export const TEAMMATE_DISPLAY_STAT_KEYS = [
  { key: 'hp', label: 'HP', isPercent: false },
  { key: 'atk', label: 'ATK', isPercent: false },
  { key: 'def', label: 'DEF', isPercent: false },
  { key: 'eleMas', label: 'EM', isPercent: false },
  { key: 'enerRech_', label: 'ER%', isPercent: true },
  { key: 'critRate_', label: 'CR%', isPercent: true },
  { key: 'critDMG_', label: 'CD%', isPercent: true },
] as const

export function formatTeammateStatValue(
  value: number | undefined,
  isPercent: boolean
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }
  if (isPercent) {
    return `${(value * 100).toFixed(1)}%`
  }
  return Math.round(value).toLocaleString()
}

export function formatFastModeLine(
  statKey: FastModeStatKey,
  value: number
): string {
  const meta = FAST_MODE_STAT_META[statKey]
  const sign = value > 0 ? '+' : ''
  const suffix = meta.isPercent ? '%' : ''
  const label = meta.isPercent
    ? meta.shortLabel.replace(/%$/, '')
    : meta.shortLabel
  return `${sign}${value}${suffix} ${label}`
}

export interface TeammateFastModeCardProps {
  characterKey: string
  isSimulated?: boolean
  memberStats?: MemberStatSummary
  fastModeStats?: FastModeStats
  fastModeAvailable?: boolean
  onChangeStat: (
    statKey: FastModeStatKey,
    value: number | undefined
  ) => void
  onResetMember: () => void
  headerExtra?: React.ReactNode
}

export function TeammateFastModeCard({
  characterKey,
  isSimulated = false,
  memberStats,
  fastModeStats,
  fastModeAvailable = true,
  onChangeStat,
  onResetMember,
  headerExtra,
}: TeammateFastModeCardProps) {
  const isActive = hasMemberFastMode(fastModeStats)
  const activeEntries = FAST_MODE_STAT_KEYS.flatMap((sk) => {
    const val = fastModeStats?.[sk]
    return typeof val === 'number' && Number.isFinite(val) && val !== 0
      ? [[sk, val] as const]
      : []
  })

  return (
    <div
      className={`gi-teammate-card${isActive && fastModeAvailable ? ' is-fast-mode' : ''}`}
      data-testid={`teammate-card-${characterKey}`}
      data-character-key={characterKey}
      data-fast-mode-active={isActive && fastModeAvailable ? 'true' : 'false'}
    >
      <div className="gi-teammate-card-header">
        <div className="gi-teammate-card-identity">
          <CharacterBadge
            characterKey={characterKey}
            simulated={isSimulated}
            role="owned"
            compact
          />
          {headerExtra}
          {isActive && fastModeAvailable && (
            <span
              className="gi-fast-mode-badge"
              data-testid={`fast-mode-badge-${characterKey}`}
              title="Virtual 6th artifact active on this teammate"
            >
              Fast Mode
            </span>
          )}
        </div>

        {fastModeAvailable && (
          <button
            type="button"
            className="btn-secondary gi-fast-mode-reset-btn"
            data-testid={`fast-mode-reset-${characterKey}`}
            disabled={!isActive}
            onClick={onResetMember}
            title={`Reset ${displayName(characterKey)}'s virtual 6th artifact`}
          >
            Reset Fast Mode
          </button>
        )}
      </div>

      {/* Base & Final Stats Table */}
      <div
        className="gi-teammate-stats-wrap"
        data-testid={`teammate-stats-${characterKey}`}
      >
        <table
          className="gi-teammate-stats-table"
          aria-label={`${displayName(characterKey)} Base and Final Stats`}
        >
          <thead>
            <tr>
              <th>Stat</th>
              {TEAMMATE_DISPLAY_STAT_KEYS.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr data-testid={`teammate-base-stats-${characterKey}`}>
              <th scope="row" className="muted">
                Base
              </th>
              {TEAMMATE_DISPLAY_STAT_KEYS.map((s) => (
                <td
                  key={s.key}
                  data-testid={`teammate-stat-base-${characterKey}-${s.key}`}
                >
                  {formatTeammateStatValue(
                    memberStats?.base?.[s.key],
                    s.isPercent
                  )}
                </td>
              ))}
            </tr>
            <tr data-testid={`teammate-final-stats-${characterKey}`}>
              <th scope="row">Final</th>
              {TEAMMATE_DISPLAY_STAT_KEYS.map((s) => (
                <td
                  key={s.key}
                  data-testid={`teammate-stat-final-${characterKey}-${s.key}`}
                  className={isActive && fastModeAvailable ? 'ok' : undefined}
                >
                  <strong>
                    {formatTeammateStatValue(
                      memberStats?.final?.[s.key],
                      s.isPercent
                    )}
                  </strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fast Mode Virtual 6th Artifact Controls */}
      {fastModeAvailable && (
        <div
          className="gi-fast-mode-editor"
          data-testid={`fast-mode-editor-${characterKey}`}
        >
          <div className="gi-fast-mode-editor-top">
            <span className="gi-fast-mode-editor-title">
              Virtual 6th Artifact (Fast Mode)
            </span>
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              Injects positive or negative stat rolls at the artifact layer
            </span>
          </div>

          {activeEntries.length > 0 && (
            <div
              className="gi-fast-mode-lines"
              data-testid={`fast-mode-lines-${characterKey}`}
            >
              {activeEntries.map(([sk, val]) => (
                <span
                  key={sk}
                  className={`gi-fast-mode-line-pill${val < 0 ? ' is-negative' : ''}`}
                  data-testid={`fast-mode-line-${characterKey}-${sk}`}
                >
                  <span>{formatFastModeLine(sk, val)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${FAST_MODE_STAT_META[sk].fullLabel} from ${displayName(characterKey)}`}
                    data-testid={`fast-mode-remove-${characterKey}-${sk}`}
                    onClick={() => onChangeStat(sk, undefined)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            className="gi-fast-mode-inputs-grid"
            data-testid={`fast-mode-inputs-${characterKey}`}
          >
            {FAST_MODE_STAT_KEYS.map((sk) => {
              const meta = FAST_MODE_STAT_META[sk]
              const rawVal = fastModeStats?.[sk]
              return (
                <label
                  key={sk}
                  className={`gi-fast-mode-input-cell${
                    typeof rawVal === 'number' && rawVal !== 0
                      ? ' is-filled'
                      : ''
                  }`}
                >
                  <span className="gi-fast-mode-input-label">
                    {meta.shortLabel}
                  </span>
                  <input
                    type="number"
                    step="any"
                    aria-label={`${displayName(characterKey)} Fast Mode ${meta.shortLabel}`}
                    data-testid={`fast-mode-input-${characterKey}-${sk}`}
                    placeholder="0"
                    value={
                      typeof rawVal === 'number' &&
                      Number.isFinite(rawVal) &&
                      rawVal !== 0
                        ? String(rawVal)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim()
                      if (raw === '' || raw === '-') {
                        onChangeStat(sk, undefined)
                        return
                      }
                      const parsed = Number(raw)
                      if (Number.isFinite(parsed) && parsed !== 0) {
                        onChangeStat(sk, parsed)
                      } else {
                        onChangeStat(sk, undefined)
                      }
                    }}
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export interface TeammateFastModePanelProps {
  preset: Preset
  ownedCharKeys: ReadonlySet<string>
  memberBuildModes?: Record<string, MemberBuildMode>
  memberStats?: Record<string, MemberStatSummary>
  effectiveFastMode: PresetFastModeMap
  optimizeMode: 'single' | 'compare' | 'team'
  onChangeMemberStat: (
    characterKey: string,
    statKey: FastModeStatKey,
    value: number | undefined
  ) => void
  onResetMember: (characterKey: string) => void
  onToggleMemberBuildMode?: (
    characterKey: string,
    nextMode: MemberBuildMode
  ) => void
}

export function TeammateFastModePanel({
  preset,
  ownedCharKeys,
  memberBuildModes,
  memberStats,
  effectiveFastMode,
  optimizeMode,
  onChangeMemberStat,
  onResetMember,
  onToggleMemberBuildMode,
}: TeammateFastModePanelProps) {
  const nonTargetMembers = preset.team.slice(1, 4)
  if (nonTargetMembers.length === 0) return null

  const fastModeAvailable = optimizeMode !== 'team'

  return (
    <div
      className="gi-teammate-cards-section"
      data-testid="teammate-fast-mode-panel"
      data-optimize-mode={optimizeMode}
      data-fast-mode-available={fastModeAvailable ? 'true' : 'false'}
    >
      <div className="gi-teammate-cards-header">
        <div>
          <h3 className="gi-teammate-cards-title">
            Teammate Stats &amp; Fast Mode
          </h3>
          <p className="muted" style={{ fontSize: '0.84rem', margin: 0 }}>
            {fastModeAvailable
              ? 'Inspect each teammate’s Base and Final stats, or type virtual 6th artifact stat lines to test teammate investment what-ifs.'
              : 'Teammate Base and Final stats are shown below. Fast Mode virtual pieces are not available in Optimize Team mode.'}
          </p>
        </div>
      </div>

      <div
        className="gi-teammate-cards-grid"
        data-testid="teammate-cards-grid"
      >
        {nonTargetMembers.map((member) => {
          const resolved = resolvePresetMemberBuildMode({
            presetSource: preset.source,
            isTarget: false,
            memberBuildType: member.build.type,
            characterKey: member.key,
            ownedCharKeys,
            overrideMode: memberBuildModes?.[member.key],
          })
          const isSimulated = resolved.mode === 'tc'

          return (
            <TeammateFastModeCard
              key={member.key}
              characterKey={member.key}
              isSimulated={isSimulated}
              memberStats={memberStats?.[member.key]}
              fastModeStats={effectiveFastMode[member.key]}
              fastModeAvailable={fastModeAvailable}
              onChangeStat={(statKey, val) =>
                onChangeMemberStat(member.key, statKey, val)
              }
              onResetMember={() => onResetMember(member.key)}
              headerExtra={
                preset.source === 'official' && onToggleMemberBuildMode ? (
                  <span
                    className="muted"
                    style={{ fontSize: '0.78rem' }}
                    data-testid={`teammate-card-build-mode-${member.key}`}
                  >
                    {resolved.forcedSimulated
                      ? 'Simulated (Not in GOOD)'
                      : resolved.mode === 'owned'
                        ? 'Owned Build'
                        : 'Simulated (TC)'}
                  </span>
                ) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}

export interface MemberCompactStatGridProps {
  characterKey: string
  memberStats?: MemberStatSummary
  highlightFinal?: boolean
}

export function MemberCompactStatGrid({
  characterKey,
  memberStats,
  highlightFinal = false,
}: MemberCompactStatGridProps) {
  return (
    <div
      className="preset-member-stats-grid"
      data-testid={`teammate-stats-${characterKey}`}
      role="region"
      aria-label={`${displayName(characterKey)} Base and Final Stats`}
    >
      <div className="preset-member-stat-legend">
        <span className="preset-member-stat-label">Stat</span>
        <span
          className="preset-member-stat-base"
          data-testid={`teammate-base-stats-${characterKey}`}
        >
          Base
        </span>
        <span
          className="preset-member-stat-final"
          data-testid={`teammate-final-stats-${characterKey}`}
        >
          Final
        </span>
      </div>

      {TEAMMATE_DISPLAY_STAT_KEYS.map((s) => (
        <div key={s.key} className="preset-member-stat-cell">
          <span className="preset-member-stat-label">{s.label}</span>
          <span
            className="preset-member-stat-base"
            data-testid={`teammate-stat-base-${characterKey}-${s.key}`}
          >
            {formatTeammateStatValue(memberStats?.base?.[s.key], s.isPercent)}
          </span>
          <strong
            className={`preset-member-stat-final${highlightFinal ? ' ok' : ''}`}
            data-testid={`teammate-stat-final-${characterKey}-${s.key}`}
          >
            {formatTeammateStatValue(memberStats?.final?.[s.key], s.isPercent)}
          </strong>
        </div>
      ))}
    </div>
  )
}

export interface MemberFastModeExpanderProps {
  characterKey: string
  isTarget: boolean
  fastModeStats?: FastModeStats
  fastModeAvailable: boolean
  onChangeStat: (
    statKey: FastModeStatKey,
    value: number | undefined
  ) => void
  onResetMember: () => void
}

export function MemberFastModeExpander({
  characterKey,
  isTarget,
  fastModeStats,
  fastModeAvailable,
  onChangeStat,
  onResetMember,
}: MemberFastModeExpanderProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded || typeof window === 'undefined') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  if (!fastModeAvailable) {
    return null
  }

  if (isTarget) {
    return (
      <div
        className="preset-member-fastmode-section is-target-note"
        data-testid={`target-fast-mode-note-${characterKey}`}
      >
        <div className="preset-member-fastmode-bar">
          <span className="preset-fastmode-target-note">
            Optimization Target — Artifacts solved from your pool
          </span>
        </div>
      </div>
    )
  }

  const isActive = hasMemberFastMode(fastModeStats)
  const activeEntries = FAST_MODE_STAT_KEYS.flatMap((sk) => {
    const val = fastModeStats?.[sk]
    return typeof val === 'number' && Number.isFinite(val) && val !== 0
      ? [[sk, val] as const]
      : []
  })
  const summaryText =
    activeEntries.length > 0
      ? activeEntries.map(([sk, val]) => formatFastModeLine(sk, val)).join(', ')
      : 'Not set'

  return (
    <div
      className="preset-member-fastmode-section"
      data-testid={`fast-mode-section-${characterKey}`}
      data-expanded={expanded ? 'true' : 'false'}
      data-fast-mode-active={isActive ? 'true' : 'false'}
    >
      <button
        type="button"
        className="preset-member-fastmode-bar preset-member-fastmode-trigger gi-chevron-toggle has-label"
        data-testid={`fast-mode-expander-toggle-${characterKey}`}
        aria-expanded={expanded}
        aria-controls={`fast-mode-editor-${characterKey}`}
        aria-label={`Fast Mode — ${displayName(characterKey)}`}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="preset-member-fastmode-bar-left">
          <span className="preset-fastmode-label">
            Virtual 6th Artifact (Fast Mode)
          </span>
          <span
            className={`gi-fast-mode-status-pill${isActive ? ' is-active' : ''}`}
            data-testid={`fast-mode-status-${characterKey}`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </span>

        <span className="preset-member-fastmode-bar-actions">
          <span
            className={`preset-fastmode-summary${isActive ? '' : ' is-empty'}`}
            data-testid={`fast-mode-summary-${characterKey}`}
          >
            {summaryText}
          </span>
          <ChevronIcon expanded={expanded} size={14} />
        </span>
      </button>

      {expanded && (
        <div
          className="gi-modal-backdrop"
          data-testid={`fast-mode-modal-backdrop-${characterKey}`}
          onClick={() => setExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setExpanded(false)
          }}
        >
          <div
            id={`fast-mode-modal-${characterKey}`}
            className="panel gi-card gi-modal-dialog gi-fast-mode-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Fast Mode — ${displayName(characterKey)}`}
            data-testid={`fast-mode-modal-${characterKey}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gi-card-header">
              <div className="preset-gear-row-md">
                <CharacterBadge characterKey={characterKey} compact />
                <div>
                  <h3 className="gi-card-title">
                    Fast Mode — {displayName(characterKey)}
                  </h3>
                  <p className="gi-card-subtitle">
                    Virtual 6th artifact stat adjustments for{' '}
                    {displayName(characterKey)}.
                  </p>
                </div>
              </div>
              <div className="preset-gear-row-md">
                {isActive && (
                  <button
                    type="button"
                    className="btn-secondary gi-fast-mode-reset-btn"
                    data-testid={`fast-mode-reset-${characterKey}`}
                    onClick={onResetMember}
                    title={`Reset ${displayName(characterKey)}'s virtual 6th artifact`}
                  >
                    Reset Fast Mode
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  data-testid={`close-fast-mode-modal-${characterKey}`}
                  aria-label="Close Fast Mode editor"
                  onClick={() => setExpanded(false)}
                >
                  Done
                </button>
              </div>
            </div>

            <div
              id={`fast-mode-editor-${characterKey}`}
              className="gi-fast-mode-editor"
              data-testid={`fast-mode-editor-${characterKey}`}
            >
              {activeEntries.length > 0 && (
                <div
                  className="gi-fast-mode-lines"
                  data-testid={`fast-mode-lines-${characterKey}`}
                >
                  {activeEntries.map(([sk, val]) => (
                    <span
                      key={sk}
                      className={`gi-fast-mode-line-pill${val < 0 ? ' is-negative' : ''}`}
                      data-testid={`fast-mode-line-${characterKey}-${sk}`}
                    >
                      <span>{formatFastModeLine(sk, val)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${FAST_MODE_STAT_META[sk].fullLabel} from ${displayName(characterKey)}`}
                        data-testid={`fast-mode-remove-${characterKey}-${sk}`}
                        onClick={() => onChangeStat(sk, undefined)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div
                className="gi-fast-mode-inputs-grid"
                data-testid={`fast-mode-inputs-${characterKey}`}
              >
                {FAST_MODE_STAT_KEYS.map((sk) => {
                  const meta = FAST_MODE_STAT_META[sk]
                  const rawVal = fastModeStats?.[sk]
                  return (
                    <label
                      key={sk}
                      className={`gi-fast-mode-input-cell${
                        typeof rawVal === 'number' && rawVal !== 0
                          ? ' is-filled'
                          : ''
                      }`}
                    >
                      <span className="gi-fast-mode-input-label">
                        {meta.shortLabel}
                      </span>
                      <input
                        type="number"
                        step="any"
                        aria-label={`${displayName(characterKey)} Fast Mode ${meta.shortLabel}`}
                        data-testid={`fast-mode-input-${characterKey}-${sk}`}
                        placeholder="0"
                        value={
                          typeof rawVal === 'number' &&
                          Number.isFinite(rawVal) &&
                          rawVal !== 0
                            ? String(rawVal)
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim()
                          if (raw === '' || raw === '-') {
                            onChangeStat(sk, undefined)
                            return
                          }
                          const parsed = Number(raw)
                          if (Number.isFinite(parsed) && parsed !== 0) {
                            onChangeStat(sk, parsed)
                          } else {
                            onChangeStat(sk, undefined)
                          }
                        }}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
