'use client'

import ImportLoading from './loading'
import {
  ArtifactBadge,
  CharacterBadge,
  StatChip,
  WeaponBadge,
} from '@/components/Identifier'
import { Spinner } from '@/components/Loading'
import { FunnelIcon, TrashIcon, UploadIcon } from '@/components/SvgIcons'
import { useGoodStorage } from '@/lib/storage/useGood'
import {
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
      // If an existing GOOD record is already stored, ask for replacement confirmation first
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

  // Build lookup of equipped weapon per character
  const weaponByChar = useMemo(() => {
    const map = new Map<string, IWeapon>()
    if (!good) return map
    for (const w of good.weapons) {
      if (w.location) map.set(w.location, w)
    }
    return map
  }, [good])

  // Build lookup of artifact set counts per character
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {parsing && (
        <div
          className="panel"
          style={{
            borderColor: 'var(--accent)',
            background: 'rgba(122, 162, 255, 0.08)',
          }}
        >
          <Spinner label="Parsing GOOD file…" />
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Import Account Data (GOOD Format)</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Import GOOD v1–v3 scanner JSON locally into IndexedDB.
          </p>
        </div>
        {record && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/presets">
              <button
                type="button"
                className="btn-icon"
                style={{
                  background: 'var(--accent)',
                  color: '#0b0d12',
                  fontWeight: 600,
                }}
              >
                <FunnelIcon size={15} />
                <span>Presets</span>
              </button>
            </Link>
            {!confirmClear ? (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setConfirmClear(true)}
                style={{ borderColor: 'var(--err)', color: 'var(--err)' }}
              >
                <TrashIcon size={15} />
                <span>Clear</span>
              </button>
            ) : (
              <div
                style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
              >
                <span className="warn" style={{ fontSize: '0.9rem' }}>
                  Remove imported GOOD data?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await clear()
                    setConfirmClear(false)
                    setParseResult(null)
                    setPendingRecord(null)
                  }}
                  style={{ background: 'var(--err)', color: '#0b0d12' }}
                >
                  Confirm Clear
                </button>
                <button type="button" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Drop + Paste Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            borderStyle: 'dashed',
            minHeight: '170px',
            gap: '0.75rem',
          }}
        >
          <strong>Upload or Drag &amp; Drop a GOOD .json file</strong>
          <span className="muted" style={{ fontSize: '0.9rem' }}>
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
            className="btn-icon"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--accent)',
              color: '#0b0d12',
              fontWeight: 600,
            }}
          >
            <UploadIcon size={15} />
            <span>Import JSON…</span>
          </button>
        </div>

        <div
          className="panel"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <strong>Or Paste Raw GOOD JSON</strong>
          <textarea
            rows={5}
            placeholder='{"format": "GOOD", "version": 3, "source": "Irminsul", "characters": [...], "weapons": [...], "artifacts": [...]}'
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            {pasteText && (
              <button type="button" onClick={() => setPasteText('')}>
                Clear
              </button>
            )}
            <button
              type="button"
              className="btn-icon"
              disabled={!pasteText.trim()}
              onClick={() => void handleRawInput(pasteText, 'Pasted JSON')}
              style={{
                background: 'var(--accent)',
                color: '#0b0d12',
                fontWeight: 600,
              }}
            >
              <UploadIcon size={15} />
              <span>Import Pasted</span>
            </button>
          </div>
        </div>
      </div>

      {/* Replace Confirmation Banner */}
      {pendingRecord && record && (
        <div
          className="panel"
          style={{
            borderColor: 'var(--warn)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <strong className="warn">
            Replace existing account data in local storage?
          </strong>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Current stored dataset ({record.fileName || record.source}):{' '}
            <strong>{record.good.characters.length}</strong> characters,{' '}
            <strong>{record.good.weapons.length}</strong> weapons,{' '}
            <strong>{record.good.artifacts.length}</strong> artifacts.
            <br />
            New import ({pendingRecord.fileName || pendingRecord.res.good?.source}):{' '}
            <strong>{pendingRecord.res.summary.characters.imported}</strong>{' '}
            characters,{' '}
            <strong>{pendingRecord.res.summary.weapons.imported}</strong> weapons,{' '}
            <strong>{pendingRecord.res.summary.artifacts.imported}</strong>{' '}
            artifacts.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => void confirmReplace()}
              style={{
                background: 'var(--ok)',
                color: '#0b0d12',
                fontWeight: 600,
              }}
            >
              Confirm Replace
            </button>
            <button type="button" onClick={() => setPendingRecord(null)}>
              Keep Existing Data
            </button>
          </div>
        </div>
      )}

      {/* Parse Diagnostics Report */}
      {parseResult && groupedIssues && (
        <div className="panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <strong>
              Parse Report:{' '}
              {parseResult.ok ? (
                <span className="ok">Valid GOOD Document</span>
              ) : (
                <span className="error">Import Failed</span>
              )}
            </strong>
            <span className="muted" style={{ fontSize: '0.9rem' }}>
              Characters: {parseResult.summary.characters.imported}/
              {parseResult.summary.characters.read} · Weapons:{' '}
              {parseResult.summary.weapons.imported}/
              {parseResult.summary.weapons.read} · Artifacts:{' '}
              {parseResult.summary.artifacts.imported}/
              {parseResult.summary.artifacts.read}
            </span>
          </div>

          {parseResult.issues.length === 0 ? (
            <p className="ok" style={{ margin: '0.5rem 0 0' }}>
              ✓ Parsed cleanly with 0 errors or warnings.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '0.75rem',
              }}
            >
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
                      style={{
                        margin: '0.35rem 0 0',
                        paddingLeft: '1.25rem',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        fontSize: '0.9rem',
                      }}
                    >
                      {list.slice(0, 100).map((iss, idx) => (
                        <li key={idx}>
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
      {loading ? (
        <div className="panel muted">Loading stored account data…</div>
      ) : !record || !good ? (
        <div className="panel muted">
          No GOOD file is currently stored in your browser. Upload or paste a
          GOOD JSON file above to inspect your characters, weapons, and
          artifacts.
        </div>
      ) : (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <strong>
                Stored Account: {record.fileName ? `${record.fileName} ` : ''}(
                {record.source})
              </strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Imported {new Date(record.importedAt).toLocaleString()} ·{' '}
                {good.characters.length} Characters · {good.weapons.length}{' '}
                Weapons · {good.artifacts.length} Artifacts
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                style={{
                  borderColor:
                    activeTab === 'characters' ? 'var(--accent)' : undefined,
                  fontWeight: activeTab === 'characters' ? 600 : 400,
                }}
              >
                Characters ({good.characters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('weapons')}
                style={{
                  borderColor:
                    activeTab === 'weapons' ? 'var(--accent)' : undefined,
                  fontWeight: activeTab === 'weapons' ? 600 : 400,
                }}
              >
                Weapons ({good.weapons.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('artifacts')}
                style={{
                  borderColor:
                    activeTab === 'artifacts' ? 'var(--accent)' : undefined,
                  fontWeight: activeTab === 'artifacts' ? 600 : 400,
                }}
              >
                Artifacts ({good.artifacts.length})
              </button>
            </div>
          </div>

          {activeTab === 'characters' && (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="search"
                  placeholder="Search characters by name…"
                  value={charSearch}
                  onChange={(e) => setCharSearch(e.target.value)}
                  style={{ width: '280px' }}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
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
                    {filteredChars.map((c: ICharacter) => {
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
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.45rem',
                                }}
                              >
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
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="search"
                  placeholder="Search weapons or equipped character…"
                  value={weaponSearch}
                  onChange={(e) => setWeaponSearch(e.target.value)}
                  style={{ width: '320px' }}
                />
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
                <table>
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
                    {filteredWeapons.map((w: IWeapon) => (
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
            <div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <select
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

                <span className="muted" style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                  Showing {filteredArtifacts.length} of {good.artifacts.length}
                </span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Slot / Set</th>
                      <th>Lv</th>
                      <th>Main</th>
                      <th>Substats</th>
                      <th>Equipped</th>
                      <th>🔒</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtifacts.slice(0, 300).map((a: IArtifact) => (
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
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.08rem 0.34rem',
                              borderRadius: '4px',
                              background: '#232736',
                            }}
                          >
                            +{a.level}
                          </span>
                        </td>
                        <td>
                          <StatChip
                            statKey={a.mainStatKey}
                            isMain
                            compact
                          />
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.28rem',
                              alignItems: 'center',
                            }}
                          >
                            {a.substats
                              .filter((s) => s.key)
                              .map((s, sIdx) => (
                                <StatChip
                                  key={`${s.key}-${sIdx}`}
                                  statKey={s.key}
                                  value={s.value}
                                  compact
                                />
                              ))}
                          </div>
                        </td>
                        <td>
                          {a.location ? (
                            <CharacterBadge characterKey={a.location} compact />
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{a.lock ? '🔒' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
