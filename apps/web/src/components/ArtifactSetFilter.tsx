'use client'

import { ArtifactBadge } from '@/components/Identifier'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Artifact Set Filter
        </span>
        <span
          data-testid="artifact-set-filter-summary"
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
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
      <div
        role="group"
        aria-label="Artifact set filter mode"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.3rem',
        }}
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
                padding: '0.35rem 0.45rem',
                fontSize: '0.78rem',
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

      {/* Search + Bulk actions */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="search"
          aria-label="Search artifact sets"
          placeholder="Search artifact sets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 140px',
            minWidth: 0,
            fontSize: '0.8rem',
            padding: '0.3rem 0.55rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.45rem' }}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.45rem' }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleInvert}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.45rem' }}
          >
            Invert
          </button>
        </div>
      </div>

      {/* Searchable Checkbox Grid */}
      <div
        role="group"
        aria-label="Artifact sets"
        style={{
          maxHeight: '240px',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '0.4rem',
          background: '#151822',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
        }}
      >
        {filteredSetKeys.length === 0 ? (
          <div
            className="muted"
            style={{ fontSize: '0.8rem', padding: '0.4rem', textAlign: 'center' }}
          >
            No artifact sets match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredSetKeys.map((sk) => {
            const pieces = normalizePieceCounts(selection[sk])
            const checked = pieces.length > 0
            const activePieceKey = checked ? piecesToOptionKey(pieces) : 'both'
            return (
              <div
                key={sk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  padding: '0.25rem 0.4rem',
                  borderRadius: 5,
                  border: checked
                    ? '1px solid rgba(122, 162, 255, 0.4)'
                    : '1px solid transparent',
                  background: checked
                    ? 'rgba(122, 162, 255, 0.08)'
                    : 'transparent',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={displayName(sk)}
                    onChange={() => handleToggleSet(sk)}
                  />
                  <ArtifactBadge setKey={sk} compact />
                </label>

                {checked && (
                  <div
                    role="group"
                    aria-label={`${displayName(sk)} piece count`}
                    style={{ display: 'inline-flex', gap: '0.2rem', flexShrink: 0 }}
                  >
                    {PIECE_OPTIONS.map((pOpt) => {
                      const isPieceActive = activePieceKey === pOpt.key
                      return (
                        <button
                          key={pOpt.key}
                          type="button"
                          aria-pressed={isPieceActive}
                          onClick={() => handlePieceChange(sk, pOpt.pieces)}
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.12rem 0.35rem',
                            borderRadius: 4,
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

