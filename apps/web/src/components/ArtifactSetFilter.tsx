'use client'

import { FunnelIcon, SetEmblemIcon } from '@/components/SvgIcons'
import {
  getArtifactMeta,
  getCdnArtifactIconUrl,
  ITEM_DARK_SURFACE_BG,
} from '@/lib/itemMeta'
import {
  ALL_ARTIFACT_SET_KEYS,
  clearSets,
  displayName,
  invertSets,
  normalizePieceCounts,
  resolveEffectiveSetFilter,
  selectAllSets,
  summarizeArtSetFilter,
  type ArtSetExclusionMap,
  type OptimizerSettings,
  type SetFilterMode,
  type SetPieceCount,
} from '@gi/presets'
import React, { useMemo, useState } from 'react'

export { clearSets, invertSets, selectAllSets }

export interface ArtifactSetFilterProps {
  settings: OptimizerSettings
  onChange: (next: OptimizerSettings) => void
  /** Optional override of available artifact set keys (defaults to ALL_ARTIFACT_SET_KEYS). */
  allSetKeys?: readonly string[]
}

const MODE_OPTIONS: Array<{
  mode: SetFilterMode
  label: string
}> = [
  { mode: 'all', label: 'All sets' },
  { mode: 'exclude', label: 'Exclude selected' },
  { mode: 'include', label: 'Only these sets' },
]

const PIECE_OPTIONS: Array<{
  key: 'both' | '2' | '4'
  label: string
  pieces: SetPieceCount[]
}> = [
  { key: 'both', label: 'Both', pieces: [2, 4] },
  { key: '2', label: '2pc', pieces: [2] },
  { key: '4', label: '4pc', pieces: [4] },
]

function piecesToOptionKey(pieces: SetPieceCount[]): 'both' | '2' | '4' {
  const norm = normalizePieceCounts(pieces)
  if (norm.includes(2) && norm.includes(4)) return 'both'
  if (norm.includes(2)) return '2'
  return '4'
}

export function ArtifactSetFilter({
  settings,
  onChange,
  allSetKeys = ALL_ARTIFACT_SET_KEYS,
}: ArtifactSetFilterProps) {
  const [search, setSearch] = useState('')
  const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({})
  const imageSize = 56

  const { mode, selection } = useMemo(
    () => resolveEffectiveSetFilter(settings),
    [settings]
  )

  const summary = useMemo(
    () => summarizeArtSetFilter(settings, allSetKeys),
    [settings, allSetKeys]
  )

  const filteredSetKeys = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allSetKeys
    return allSetKeys.filter(
      (sk) =>
        sk.toLowerCase().includes(q) ||
        displayName(sk).toLowerCase().includes(q)
    )
  }, [allSetKeys, search])

  const commitFilter = (
    nextMode: SetFilterMode,
    nextSelection: ArtSetExclusionMap
  ) => {
    onChange({
      ...settings,
      setFilterMode: nextMode,
      setFilterSelection: nextSelection,
      // Keep legacy setExclusion clear when using first-class mode/selection
      setExclusion: nextMode === 'exclude' ? nextSelection : {},
    })
  }

  const handleModeChange = (nextMode: SetFilterMode) => {
    commitFilter(nextMode, selection)
  }

  const handleToggleSet = (setKey: string) => {
    const nextSel: ArtSetExclusionMap = { ...selection }
    const current = normalizePieceCounts(nextSel[setKey])
    if (current.length > 0) {
      delete nextSel[setKey]
    } else {
      nextSel[setKey] = [2, 4]
    }
    const nextMode: SetFilterMode = mode === 'all' ? 'exclude' : mode
    commitFilter(nextMode, nextSel)
  }

  const handlePieceChange = (setKey: string, pieces: SetPieceCount[]) => {
    const nextSel: ArtSetExclusionMap = {
      ...selection,
      [setKey]: normalizePieceCounts(pieces),
    }
    const nextMode: SetFilterMode = mode === 'all' ? 'exclude' : mode
    commitFilter(nextMode, nextSel)
  }

  const handleSelectAll = () => {
    const nextSel = selectAllSets(selection, filteredSetKeys, [2, 4])
    const nextMode: SetFilterMode = mode === 'all' ? 'exclude' : mode
    commitFilter(nextMode, nextSel)
  }

  const handleClear = () => {
    const nextSel = clearSets(selection, filteredSetKeys)
    commitFilter(mode, nextSel)
  }

  const handleInvert = () => {
    const nextSel = invertSets(selection, filteredSetKeys, [2, 4])
    const nextMode: SetFilterMode = mode === 'all' ? 'exclude' : mode
    commitFilter(nextMode, nextSel)
  }

  return (
    <div
      className="opt-filter-panel"
      data-testid="artifact-set-filter-panel"
    >
      <div className="opt-filter-panel-header">
        <span className="opt-filter-panel-title">
          <FunnelIcon size={14} />
          Artifact Set Filter
        </span>
        <span
          data-testid="artifact-set-filter-summary"
          className="opt-filter-panel-summary"
          style={{
            color:
              mode === 'include'
                ? 'var(--accent)'
                : mode === 'exclude'
                  ? 'var(--warn)'
                  : 'var(--ok)',
          }}
        >
          {summary.text}
        </span>
      </div>

      {/* Mode segmented selector */}
      <div className="opt-filter-panel-subbar">
        <div
          role="group"
          aria-label="Artifact set filter mode"
          className="opt-filter-mode-group"
        >
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.mode
            return (
              <button
                key={opt.mode}
                type="button"
                aria-pressed={active}
                onClick={() => handleModeChange(opt.mode)}
                style={{
                  fontWeight: active ? 700 : 500,
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active
                    ? 'rgba(122, 162, 255, 0.18)'
                    : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--fg)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search + Bulk actions */}
      <div className="tile-picker-toolbar">
        <input
          type="search"
          className="tile-picker-search"
          aria-label="Search artifact sets"
          placeholder="Search artifact sets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="opt-filter-bulk-actions">
          <button type="button" onClick={handleSelectAll}>
            Select all
          </button>
          <button type="button" onClick={handleClear}>
            Clear
          </button>
          <button type="button" onClick={handleInvert}>
            Invert
          </button>
        </div>
      </div>

      {/* Image-Led Artifact Set Tile Grid (flower piece icon on 5★ rarity background) */}
      <div
        role="group"
        aria-label="Artifact sets"
        className="tile-picker-grid"
      >
        {filteredSetKeys.length === 0 ? (
          <div
            className="muted"
            style={{
              gridColumn: '1 / -1',
              fontSize: '0.8rem',
              padding: '0.4rem',
              textAlign: 'center',
            }}
          >
            No artifact sets match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredSetKeys.map((sk) => {
            const pieces = normalizePieceCounts(selection[sk])
            const checked = pieces.length > 0
            const activePieceKey = checked ? piecesToOptionKey(pieces) : 'both'
            const meta = getArtifactMeta({
              setKey: sk,
              slotKey: 'flower',
            })
            const imageFailed = Boolean(failedKeys[sk])
            const iconUrl = getCdnArtifactIconUrl(sk, 'flower')
            const borderWidth = checked ? 3 : 2

            return (
              <div key={sk} className="tile-picker-cell">
                <button
                  type="button"
                  data-testid={`artifact-set-tile-${sk}`}
                  data-artifact-set={sk}
                  data-rarity={String(meta.rarity)}
                  data-selected={checked ? 'true' : 'false'}
                  aria-pressed={checked}
                  aria-label={displayName(sk)}
                  title={meta.setDisplayName}
                  className={`tile-picker-item${checked ? ' is-selected' : ''}`}
                  onClick={() => handleToggleSet(sk)}
                >
                  {checked && (
                    <span
                      data-testid="tile-selected-check"
                      aria-hidden="true"
                      className="tile-picker-check"
                    >
                      ✓
                    </span>
                  )}
                  <span
                    className="tile-picker-frame"
                    style={{
                      width: `${imageSize}px`,
                      height: `${imageSize}px`,
                      background: ITEM_DARK_SURFACE_BG,
                      color: 'var(--fg)',
                      border: `${borderWidth}px solid ${meta.rarityColor.border}`,
                    }}
                  >
                    {imageFailed ? (
                      <SetEmblemIcon size={26} />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={iconUrl}
                        alt={meta.setDisplayName}
                        width={imageSize}
                        height={imageSize}
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          setFailedKeys((prev) => ({
                            ...prev,
                            [sk]: true,
                          }))
                        }
                        className="tile-picker-img"
                      />
                    )}
                  </span>
                  <span className="tile-picker-caption">
                    {meta.setShortName}
                  </span>
                </button>

                {checked && (
                  <div
                    role="group"
                    aria-label={`${displayName(sk)} piece count`}
                    className="tile-picker-pieces"
                  >
                    {PIECE_OPTIONS.map((pOpt) => {
                      const isPieceActive = activePieceKey === pOpt.key
                      return (
                        <button
                          key={pOpt.key}
                          type="button"
                          aria-pressed={isPieceActive}
                          onClick={() => handlePieceChange(sk, pOpt.pieces)}
                          className="tile-picker-piece-btn"
                          style={{
                            fontWeight: isPieceActive ? 700 : 500,
                            borderColor: isPieceActive
                              ? 'var(--accent)'
                              : 'var(--border)',
                            background: isPieceActive
                              ? 'rgba(122, 162, 255, 0.2)'
                              : '#1e2230',
                            color: isPieceActive
                              ? 'var(--accent)'
                              : 'var(--muted)',
                          }}
                        >
                          {pOpt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
