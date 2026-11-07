'use client'

import ImportLoading from './loading'
import {
  ArtifactBadge,
  ArtifactRvBadge,
  CharacterBadge,
  StatChip,
  WeaponBadge,
} from '@/components/Identifier'
import { Spinner } from '@/components/Loading'
import { FunnelIcon, TrashIcon, UploadIcon } from '@/components/SvgIcons'
import { useGoodStorage } from '@/lib/storage/useGood'
import {
  computeArtifactRollValue,
  humanizeKey,
  type IArtifact,
  type ICharacter,
  type IssueSeverity,
  type IWeapon,
  type ParseGoodResult,
  type ParseIssue,
} from '@gi/good'
import type { IdentifierSlotKey } from '@gi/presets/src/metadata'
import { displayName } from '@gi/presets/src/names'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

type TabKey = 'characters' | 'weapons' | 'artifacts'

const IMPORT_TABLE_ROW_CAP = 300

function formatImportTableCount(
  shownCount: number,
  filteredCount: number,
  totalCount: number,
  cap: number = IMPORT_TABLE_ROW_CAP
): string {
  if (filteredCount > cap) {
    return `Showing first ${shownCount} of ${filteredCount} — refine the filter to see more`
  }
  return `Showing ${shownCount} of ${totalCount}`
}

const SEVERITY_ORDER: IssueSeverity[] = ['fatal', 'error', 'warning', 'info']
const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  fatal: 'Fatal (Import Blocked)',
  error: 'Errors (Skipped Entries)',
  warning: 'Warnings (Auto-Adjusted / Ignored)',
  info: 'Info',
}

export default function ImportPage() {
  const { record, loading, save, clear } = useGoodStorage()
  const [pasteText, setPasteText] = useState('')
  const [parseResult, setParseResult] = useState<ParseGoodResult | null>(null)
  const [pendingRecord, setPendingRecord] = useState<{
    res: ParseGoodResult
    fileName?: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('characters')

  // Filters
  const [charSearch, setCharSearch] = useState('')
  const [weaponSearch, setWeaponSearch] = useState('')
  const [artSetFilter, setArtSetFilter] = useState('')
  const [artSlotFilter, setArtSlotFilter] = useState('')
  const [artMainStatFilter, setArtMainStatFilter] = useState('')
  const [artEquippedFilter, setArtEquippedFilter] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [parsing, setParsing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleRawInput(raw: string, fileName?: string) {
    setParsing(true)
    await new Promise((r) => setTimeout(r, 0))
    try {
      const { parseGood } = await import('@gi/good/src/parseGood')
      const res = parseGood(raw)
      setParseResult(res)
      if (!res.ok || !res.good) {
        setPendingRecord(null)
        return
      }
      if (record) {
        setPendingRecord({ res, fileName })
      } else {
        await save({
          good: res.good,
          importedAt: new Date().toISOString(),
          fileName,
          source: res.good.source,
          summary: res.summary,
        })
        setPendingRecord(null)
      }
    } finally {
      setParsing(false)
    }
  }

  async function confirmReplace() {
    if (!pendingRecord?.res.good) return
    await save({
      good: pendingRecord.res.good,
      importedAt: new Date().toISOString(),
      fileName: pendingRecord.fileName,
      source: pendingRecord.res.good.source,
      summary: pendingRecord.res.summary,
    })
    setPendingRecord(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void handleRawInput(reader.result, file.name)
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void handleRawInput(reader.result, file.name)
      }
    }
    reader.readAsText(file)
  }

  const good = record?.good

  const weaponByChar = useMemo(() => {
    const map = new Map<string, IWeapon>()
    if (!good) return map
    for (const w of good.weapons) {
      if (w.location) map.set(w.location, w)
    }
    return map
  }, [good])

  const artSetsByChar = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    if (!good) return map
    for (const a of good.artifacts) {
      if (!a.location) continue
      const counts = map.get(a.location) ?? {}
      counts[a.setKey] = (counts[a.setKey] ?? 0) + 1
      map.set(a.location, counts)
    }
    return map
  }, [good])

  const filteredChars = useMemo(() => {
    if (!good) return []
    const q = charSearch.trim().toLowerCase()
    return good.characters.filter(
      (c) =>
        !q ||
        c.key.toLowerCase().includes(q) ||
        displayName(c.key).toLowerCase().includes(q)
    )
  }, [good, charSearch])

  const filteredWeapons = useMemo(() => {
    if (!good) return []
    const q = weaponSearch.trim().toLowerCase()
    return good.weapons.filter(
      (w) =>
        !q ||
        w.key.toLowerCase().includes(q) ||
        displayName(w.key).toLowerCase().includes(q) ||
        w.location.toLowerCase().includes(q)
    )
  }, [good, weaponSearch])

  const uniqueArtSets = useMemo(() => {
    if (!good) return []
    return Array.from(new Set(good.artifacts.map((a) => a.setKey))).sort()
  }, [good])

  const uniqueMainStats = useMemo(() => {
    if (!good) return []
    return Array.from(new Set(good.artifacts.map((a) => a.mainStatKey))).sort()
  }, [good])

  const filteredArtifacts = useMemo(() => {
    if (!good) return []
    return good.artifacts.filter((a) => {
      if (artSetFilter && a.setKey !== artSetFilter) return false
      if (artSlotFilter && a.slotKey !== artSlotFilter) return false
      if (artMainStatFilter && a.mainStatKey !== artMainStatFilter) return false
      if (artEquippedFilter === '__unequipped__' && a.location !== '')
        return false
      if (
        artEquippedFilter &&
        artEquippedFilter !== '__unequipped__' &&
        a.location !== artEquippedFilter
      )
        return false
      return true
    })
  }, [
    good,
    artSetFilter,
    artSlotFilter,
    artMainStatFilter,
    artEquippedFilter,
  ])

  const displayedChars = useMemo(
    () => filteredChars.slice(0, IMPORT_TABLE_ROW_CAP),
    [filteredChars]
  )
  const displayedWeapons = useMemo(
    () => filteredWeapons.slice(0, IMPORT_TABLE_ROW_CAP),
    [filteredWeapons]
  )
  const displayedArtifacts = useMemo(
    () => filteredArtifacts.slice(0, IMPORT_TABLE_ROW_CAP),
    [filteredArtifacts]
  )

  const groupedIssues = useMemo(() => {
    if (!parseResult) return null
    const groups: Record<IssueSeverity, ParseIssue[]> = {
      fatal: [],
      error: [],
      warning: [],
      info: [],
    }
    for (const iss of parseResult.issues) {
      groups[iss.severity].push(iss)
    }
    return groups
  }, [parseResult])

  if (loading) {
    return <ImportLoading />
  }

  return (
    <div className="gi-page">
      {parsing && (
        <div className="panel preset-akasha-box">
          <Spinner label="Parsing GOOD file…" />
        </div>
      )}

      <header className="gi-page-header">
        <div>
          <h1 className="gi-page-title">Import Account Data (GOOD Format)</h1>
          <p className="gi-page-subtitle">
            Import GOOD v1–v3 scanner JSON locally into IndexedDB.
          </p>
        </div>
        {record && (
          <div className="preset-detail-actions">
            <Link href="/presets">
              <button type="button" className="btn-primary btn-icon">
                <FunnelIcon size={15} />
                <span>Presets</span>
              </button>
            </Link>
            {!confirmClear ? (
              <button
                type="button"
                className="btn-danger btn-icon"
                onClick={() => setConfirmClear(true)}
              >
                <TrashIcon size={15} />
                <span>Clear</span>
              </button>
            ) : (
              <div className="preset-gear-row">
                <span className="warn" style={{ fontSize: '0.88rem' }}>
                  Remove imported GOOD data?
                </span>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    await clear()
                    setConfirmClear(false)
                    setParseResult(null)
                    setPendingRecord(null)
                  }}
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* File Drop + Paste Grid */}
      <div className="gi-import-grid">
        <div
          className="gi-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <strong>Upload or Drag &amp; Drop a GOOD .json file</strong>
          <span className="muted" style={{ fontSize: '0.88rem' }}>
            Supports GOOD v1, v2, and v3 scanner exports. UID / Enka showcase
            exports are not supported because they omit unequipped artifacts.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn-primary btn-icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon size={15} />
            <span>Import JSON…</span>
          </button>
        </div>

        <div className="panel gi-card">
          <div>
            <h2 className="gi-card-title">Paste Raw GOOD JSON</h2>
            <p className="gi-card-subtitle">
              Paste your exported scanner JSON payload directly.
            </p>
          </div>
          <textarea
            rows={4}
            placeholder='{"format": "GOOD", "version": 3, "source": "Irminsul", "characters": [...], "weapons": [...], "artifacts": [...]}'
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '0.84rem',
            }}
          />
          <div
            className="preset-detail-actions"
            style={{ justifyContent: 'flex-end' }}
          >
            {pasteText && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPasteText('')}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn-primary btn-icon"
              disabled={!pasteText.trim()}
              onClick={() => void handleRawInput(pasteText, 'Pasted JSON')}
            >
              <UploadIcon size={15} />
              <span>Import Pasted</span>
            </button>
          </div>
        </div>
      </div>

      {/* Replace Confirmation Banner */}
      {pendingRecord && record && (
        <div className="panel gi-card presets-warn-banner">
          <div>
            <strong className="warn">
              Replace existing account data in local storage?
            </strong>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
              Current stored dataset ({record.fileName || record.source}):{' '}
              <strong>{record.good.characters.length}</strong> characters,{' '}
              <strong>{record.good.weapons.length}</strong> weapons,{' '}
              <strong>{record.good.artifacts.length}</strong> artifacts.
              <br />
              New import (
              {pendingRecord.fileName || pendingRecord.res.good?.source}):{' '}
              <strong>{pendingRecord.res.summary.characters.imported}</strong>{' '}
              characters,{' '}
              <strong>{pendingRecord.res.summary.weapons.imported}</strong>{' '}
              weapons,{' '}
              <strong>{pendingRecord.res.summary.artifacts.imported}</strong>{' '}
              artifacts.
            </p>
          </div>
          <div className="preset-detail-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void confirmReplace()}
            >
              Confirm Replace
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPendingRecord(null)}
            >
              Keep Existing Data
            </button>
          </div>
        </div>
      )}

      {/* Parse Diagnostics Report */}
      {parseResult && groupedIssues && (
        <div className="panel gi-card">
          <div className="gi-card-header">
            <strong>
              Parse Report:{' '}
              {parseResult.ok ? (
                <span className="ok">Valid GOOD Document</span>
              ) : (
                <span className="error">Import Failed</span>
              )}
            </strong>
            <span className="muted" style={{ fontSize: '0.88rem' }}>
              Characters: {parseResult.summary.characters.imported}/
              {parseResult.summary.characters.read} · Weapons:{' '}
              {parseResult.summary.weapons.imported}/
              {parseResult.summary.weapons.read} · Artifacts:{' '}
              {parseResult.summary.artifacts.imported}/
              {parseResult.summary.artifacts.read}
            </span>
          </div>

          {parseResult.issues.length === 0 ? (
            <p className="ok m-0">
              ✓ Parsed cleanly with 0 errors or warnings.
            </p>
          ) : (
            <div className="presets-loading-col">
              {SEVERITY_ORDER.map((sev) => {
                const list = groupedIssues[sev]
                if (!list.length) return null
                const colorClass =
                  sev === 'fatal' || sev === 'error'
                    ? 'error'
                    : sev === 'warning'
                      ? 'warn'
                      : 'muted'
                return (
                  <div key={sev}>
                    <div className={colorClass} style={{ fontWeight: 600 }}>
                      {SEVERITY_LABEL[sev]} ({list.length})
                    </div>
                    <ul
                      className="preset-match-list"
                      style={{
                        marginTop: '0.35rem',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      {list.slice(0, 100).map((iss, idx) => (
                        <li key={idx} className="preset-match-item">
                          <code>{iss.path}</code>: {iss.message}
                          {iss.suggestion && (
                            <span className="ok"> ({iss.suggestion})</span>
                          )}
                        </li>
                      ))}
                      {list.length > 100 && (
                        <li className="muted">
                          …and {list.length - 100} more {sev} diagnostics.
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Stored Account Summary & Filterable Tables */}
      {!record || !good ? (
        <div className="gi-empty-card">
          No GOOD file is currently stored in your browser. Upload or paste a
          GOOD JSON file above to inspect your characters, weapons, and
          artifacts.
        </div>
      ) : (
        <section className="panel gi-card">
          <div className="gi-card-header">
            <div>
              <h2 className="gi-card-title">
                Stored Account: {record.fileName ? `${record.fileName} ` : ''}(
                {record.source})
              </h2>
              <p className="gi-card-subtitle">
                Imported {new Date(record.importedAt).toLocaleString()} ·{' '}
                {good.characters.length} Characters · {good.weapons.length}{' '}
                Weapons · {good.artifacts.length} Artifacts
              </p>
            </div>
            <div className="gi-tabs" role="tablist" aria-label="Inventory tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'characters'}
                className={`gi-tab${
                  activeTab === 'characters' ? ' gi-tab-active' : ''
                }`}
                onClick={() => setActiveTab('characters')}
              >
                Characters ({good.characters.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'weapons'}
                className={`gi-tab${
                  activeTab === 'weapons' ? ' gi-tab-active' : ''
                }`}
                onClick={() => setActiveTab('weapons')}
              >
                Weapons ({good.weapons.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'artifacts'}
                className={`gi-tab${
                  activeTab === 'artifacts' ? ' gi-tab-active' : ''
                }`}
                onClick={() => setActiveTab('artifacts')}
              >
                Artifacts ({good.artifacts.length})
              </button>
            </div>
          </div>

          {activeTab === 'characters' && (
            <div className="presets-loading-col">
              <div className="presets-filter-bar">
                <input
                  type="search"
                  aria-label="Search characters"
                  placeholder="Search characters by name…"
                  value={charSearch}
                  onChange={(e) => setCharSearch(e.target.value)}
                  style={{ minWidth: '240px' }}
                />
                <span
                  className="muted presets-count"
                  data-testid="import-characters-count"
                  data-shown-count={displayedChars.length}
                  data-filtered-count={filteredChars.length}
                  data-total-count={good.characters.length}
                  data-truncated={
                    filteredChars.length > IMPORT_TABLE_ROW_CAP
                      ? 'true'
                      : 'false'
                  }
                >
                  {formatImportTableCount(
                    displayedChars.length,
                    filteredChars.length,
                    good.characters.length
                  )}
                </span>
              </div>
              <div className="gi-table-wrap">
                <table className="gi-table" data-testid="import-characters-table">
                  <thead>
                    <tr>
                      <th>Character</th>
                      <th>Level / Asc</th>
                      <th>Constellation</th>
                      <th>Talents (A / E / Q)</th>
                      <th>Equipped Weapon</th>
                      <th>Equipped Artifact Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedChars.map((c: ICharacter) => {
                      const wep = weaponByChar.get(c.key)
                      const sets = artSetsByChar.get(c.key) ?? {}
                      const activeSets = Object.entries(sets).filter(
                        ([, n]) => n >= 2
                      )
                      return (
                        <tr key={c.key}>
                          <td>
                            <CharacterBadge characterKey={c.key} />
                          </td>
                          <td>
                            Lv. {c.level} (A{c.ascension})
                          </td>
                          <td>C{c.constellation}</td>
                          <td>
                            {c.talent.auto} / {c.talent.skill} / {c.talent.burst}
                          </td>
                          <td>
                            {wep ? (
                              <WeaponBadge
                                weaponKey={wep.key}
                                compact
                                subtitle={`(Lv. ${wep.level} R${wep.refinement})`}
                              />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            {activeSets.length ? (
                              <div className="preset-gear-row">
                                {activeSets.map(([s, n]) => (
                                  <ArtifactBadge
                                    key={s}
                                    setKey={s}
                                    compact
                                    subtitle={`(${n >= 4 ? 4 : 2}p)`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="muted">Rainbow / None</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'weapons' && (
            <div className="presets-loading-col">
              <div className="presets-filter-bar">
                <input
                  type="search"
                  aria-label="Search weapons"
                  placeholder="Search weapons or equipped character…"
                  value={weaponSearch}
                  onChange={(e) => setWeaponSearch(e.target.value)}
                  style={{ minWidth: '260px' }}
                />
                <span
                  className="muted presets-count"
                  data-testid="import-weapons-count"
                  data-shown-count={displayedWeapons.length}
                  data-filtered-count={filteredWeapons.length}
                  data-total-count={good.weapons.length}
                  data-truncated={
                    filteredWeapons.length > IMPORT_TABLE_ROW_CAP
                      ? 'true'
                      : 'false'
                  }
                >
                  {formatImportTableCount(
                    displayedWeapons.length,
                    filteredWeapons.length,
                    good.weapons.length
                  )}
                </span>
              </div>
              <div
                className="gi-table-wrap"
                style={{ maxHeight: '520px', overflowY: 'auto' }}
              >
                <table className="gi-table" data-testid="import-weapons-table">
                  <thead>
                    <tr>
                      <th>Weapon</th>
                      <th>Level / Asc</th>
                      <th>Refinement</th>
                      <th>Equipped On</th>
                      <th>Locked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedWeapons.map((w: IWeapon) => (
                      <tr key={w.id}>
                        <td>
                          <WeaponBadge weaponKey={w.key} />
                        </td>
                        <td>
                          Lv. {w.level} (A{w.ascension})
                        </td>
                        <td>R{w.refinement}</td>
                        <td>
                          {w.location ? (
                            <CharacterBadge characterKey={w.location} compact />
                          ) : (
                            <span className="muted">Inventory</span>
                          )}
                        </td>
                        <td>{w.lock ? '🔒' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="presets-loading-col">
              <div className="presets-filter-bar">
                <select
                  aria-label="Filter artifacts by set"
                  value={artSetFilter}
                  onChange={(e) => setArtSetFilter(e.target.value)}
                >
                  <option value="">All Sets ({uniqueArtSets.length})</option>
                  {uniqueArtSets.map((s) => (
                    <option key={s} value={s}>
                      {displayName(s)}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter artifacts by slot"
                  value={artSlotFilter}
                  onChange={(e) => setArtSlotFilter(e.target.value)}
                >
                  <option value="">All Slots</option>
                  <option value="flower">Flower of Life</option>
                  <option value="plume">Plume of Death</option>
                  <option value="sands">Sands of Eon</option>
                  <option value="goblet">Goblet of Eonothem</option>
                  <option value="circlet">Circlet of Logos</option>
                </select>

                <select
                  aria-label="Filter artifacts by main stat"
                  value={artMainStatFilter}
                  onChange={(e) => setArtMainStatFilter(e.target.value)}
                >
                  <option value="">All Main Stats</option>
                  {uniqueMainStats.map((m) => (
                    <option key={m} value={m}>
                      {humanizeKey(m)}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter artifacts by character"
                  value={artEquippedFilter}
                  onChange={(e) => setArtEquippedFilter(e.target.value)}
                >
                  <option value="">All Locations</option>
                  <option value="__unequipped__">Unequipped Only</option>
                  {good.characters.map((c) => (
                    <option key={c.key} value={c.key}>
                      Equipped on {displayName(c.key)}
                    </option>
                  ))}
                </select>

                <span
                  className="muted presets-count"
                  data-testid="import-artifacts-count"
                  data-shown-count={displayedArtifacts.length}
                  data-filtered-count={filteredArtifacts.length}
                  data-total-count={good.artifacts.length}
                  data-truncated={
                    filteredArtifacts.length > IMPORT_TABLE_ROW_CAP
                      ? 'true'
                      : 'false'
                  }
                >
                  {formatImportTableCount(
                    displayedArtifacts.length,
                    filteredArtifacts.length,
                    good.artifacts.length
                  )}
                </span>
              </div>

              <div
                className="gi-table-wrap"
                style={{ maxHeight: '520px', overflowY: 'auto' }}
              >
                <table className="gi-table" data-testid="import-artifacts-table">
                  <thead>
                    <tr>
                      <th>Slot / Set</th>
                      <th>Lv</th>
                      <th>RV</th>
                      <th>Main</th>
                      <th>Substats</th>
                      <th>Equipped</th>
                      <th>🔒</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedArtifacts.map((a: IArtifact) => {
                      const rvInfo = computeArtifactRollValue(a)
                      return (
                        <tr key={a.id}>
                          <td>
                            <ArtifactBadge
                              setKey={a.setKey}
                              slotKey={a.slotKey as IdentifierSlotKey}
                              rarity={a.rarity}
                              compact
                            />
                          </td>
                          <td>
                            <span className="gi-level-pill">+{a.level}</span>
                          </td>
                          <td>
                            <ArtifactRvBadge rv={rvInfo} compact />
                          </td>
                          <td>
                            <StatChip
                              statKey={a.mainStatKey}
                              isMain
                              compact
                            />
                          </td>
                          <td>
                            <div className="preset-gear-row">
                              {rvInfo.substats.map((s, sIdx) => (
                                <StatChip
                                  key={`${s.key}-${sIdx}`}
                                  statKey={s.key}
                                  value={s.value}
                                  substatBreakdown={s}
                                  compact
                                />
                              ))}
                            </div>
                          </td>
                          <td>
                            {a.location ? (
                              <CharacterBadge
                                characterKey={a.location}
                                compact
                              />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>{a.lock ? '🔒' : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
