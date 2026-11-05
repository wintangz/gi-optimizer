'use client'

import { useGoodStorage, useUserPresets } from '@/lib/storage/useGood'
import { humanizeKey } from '@gi/good'
import {
  displayName,
  formatConstellationReq,
  formatRefinementReq,
  getPresetBadge,
  listBundledPresets,
  matchAccount,
  type Preset,
  type PresetSource,
} from '@gi/presets'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export default function PresetsPage() {
  const { record } = useGoodStorage()
  const { presets: userPresets, remove: removeUserPreset } = useUserPresets()

  const [sourceFilter, setSourceFilter] = useState<'all' | PresetSource>('all')
  const [targetFilter, setTargetFilter] = useState<string>('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [selectedWeapons, setSelectedWeapons] = useState<
    Record<string, string>
  >({})

  const allPresets = useMemo(() => {
    const bundled = listBundledPresets()
    return [...bundled, ...userPresets]
  }, [userPresets])

  const availableTargets = useMemo(() => {
    return Array.from(new Set(allPresets.map((p) => p.target))).sort()
  }, [allPresets])

  const filteredPresets = useMemo(() => {
    return allPresets.filter((p) => {
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
      if (targetFilter && p.target !== targetFilter) return false
      return true
    })
  }, [allPresets, sourceFilter, targetFilter])

  const activePreset: Preset | undefined = useMemo(() => {
    if (selectedPresetId) {
      const found = filteredPresets.find((p) => p.id === selectedPresetId)
      if (found) return found
    }
    return filteredPresets[0]
  }, [filteredPresets, selectedPresetId])

  const activeWeaponOverride = activePreset
    ? selectedWeapons[activePreset.id]
    : undefined

  const activeMatch = useMemo(() => {
    if (!activePreset || !record?.good) return null
    return matchAccount(activePreset, record.good, {
      selectedWeaponId: activeWeaponOverride,
    })
  }, [activePreset, record, activeWeaponOverride])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
          <h1 style={{ margin: 0 }}>Presets Library</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Browse Akasha leaderboard setups, Official meta team presets, and
            your own Custom presets. Every preset is a setup bundle — damage
            numbers come from your own artifacts when evaluated.
          </p>
        </div>
        <Link href="/teams">
          <button
            type="button"
            style={{
              background: 'var(--accent)',
              color: '#0b0d12',
              fontWeight: 600,
            }}
          >
            + Create Custom Team / Preset
          </button>
        </Link>
      </div>

      {!record && (
        <div
          className="panel"
          style={{
            borderColor: 'var(--warn)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span className="warn">
            No GOOD account data imported yet. Import your scanner file to see
            live Akasha requirement matching and run the optimizer.
          </span>
          <Link href="/import">
            <button type="button">Go to Import →</button>
          </Link>
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="muted">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as 'all' | PresetSource)
            }
          >
            <option value="all">All Sources ({allPresets.length})</option>
            <option value="akasha">Akasha Leaderboard Presets</option>
            <option value="official">Official Meta Presets</option>
            <option value="user">Custom User Presets ({userPresets.length})</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="muted">Target Character:</span>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
          >
            <option value="">All Characters</option>
            {availableTargets.map((ck) => (
              <option key={ck} value={ck}>
                {displayName(ck)}
              </option>
            ))}
          </select>
        </label>

        <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
          Showing {filteredPresets.length} presets
        </span>
      </div>

      {/* Master-Detail Split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 380px) 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Left List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          {filteredPresets.map((p) => {
            const badge = getPresetBadge(p)
            const isSelected = activePreset?.id === p.id
            const quickMatch = record?.good
              ? matchAccount(p, record.good, {
                  selectedWeaponId: selectedWeapons[p.id],
                })
              : null

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPresetId(p.id)}
                className="panel"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent)' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.78rem',
                  }}
                >
                  <span
                    className={
                      badge.kind === 'user'
                        ? 'warn'
                        : badge.verified
                          ? 'ok'
                          : 'muted'
                    }
                    style={{ fontWeight: 600 }}
                  >
                    {badge.label}
                    {badge.verified ? ' · Verified' : ''}
                  </span>
                  {quickMatch && (
                    <span className={quickMatch.canRun ? 'ok' : 'error'}>
                      {quickMatch.canRun ? '✓ Ready' : '✕ Mismatch'}
                    </span>
                  )}
                </div>
                <strong style={{ fontSize: '0.98rem' }}>{p.name}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  Target: <strong>{displayName(p.target)}</strong> · Team:{' '}
                  {p.team.map((m) => displayName(m.key)).join(' / ')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Detail Panel */}
        {activePreset ? (
          <div
            className="panel"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
          >
            {(() => {
              const badge = getPresetBadge(activePreset)
              return (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div
                      className={
                        badge.kind === 'user'
                          ? 'warn'
                          : badge.verified
                            ? 'ok'
                            : 'muted'
                      }
                      style={{ fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {badge.label}
                      {badge.verified ? ' · Verified against GO' : ''}
                    </div>
                    <h2 style={{ margin: '0.2rem 0' }}>{activePreset.name}</h2>
                    {activePreset.description && (
                      <p className="muted" style={{ margin: 0 }}>
                        {activePreset.description}
                      </p>
                    )}
                    {badge.warning && (
                      <p
                        className="warn"
                        style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}
                      >
                        ⚠ {badge.warning}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={
                        !record || (activeMatch && !activeMatch.canRun)
                          ? '#'
                          : `/optimize?preset=${encodeURIComponent(
                              activePreset.id
                            )}${
                              activeMatch?.selectedWeaponId
                                ? `&weapon=${encodeURIComponent(
                                    activeMatch.selectedWeaponId
                                  )}`
                                : ''
                            }`
                      }
                    >
                      <button
                        type="button"
                        disabled={!record || Boolean(activeMatch && !activeMatch.canRun)}
                        style={{
                          background: 'var(--accent)',
                          color: '#0b0d12',
                          fontWeight: 600,
                        }}
                      >
                        Optimize with this Preset →
                      </button>
                    </Link>

                    <Link
                      href={`/teams?fork=${encodeURIComponent(activePreset.id)}`}
                    >
                      <button type="button">Duplicate &amp; Edit</button>
                    </Link>

                    {activePreset.source === 'user' && (
                      <>
                        <Link
                          href={`/teams?edit=${encodeURIComponent(
                            activePreset.id
                          )}`}
                        >
                          <button type="button">Edit</button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => void removeUserPreset(activePreset.id)}
                          style={{
                            borderColor: 'var(--err)',
                            color: 'var(--err)',
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Akasha Provenance Box */}
            {activePreset.akasha && (
              <div
                style={{
                  background: '#151821',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Akasha Leaderboard Provenance:</strong>{' '}
                <span>{activePreset.akasha.label}</span> ·{' '}
                <a
                  href={activePreset.akasha.leaderboardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {activePreset.akasha.leaderboardUrl}
                </a>
                {activePreset.akasha.notes && (
                  <div className="muted" style={{ marginTop: '0.25rem' }}>
                    {activePreset.akasha.notes}
                  </div>
                )}
              </div>
            )}

            {/* Account Match Report */}
            <div
              style={{
                background: '#151821',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.85rem',
              }}
            >
              <strong>Account Compatibility Check (Akasha-style)</strong>
              {!record ? (
                <p className="muted" style={{ margin: '0.4rem 0 0' }}>
                  Import your GOOD JSON on the <Link href="/import">Import</Link>{' '}
                  page to check whether your scanned characters and weapons
                  satisfy this preset.
                </p>
              ) : activeMatch ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    {activeMatch.parts.map((part, idx) => (
                      <li
                        key={idx}
                        className={part.ok ? 'ok' : 'error'}
                        style={{ fontSize: '0.92rem' }}
                      >
                        <strong>{part.ok ? '✓' : '✕'}</strong> {part.message}
                        {part.part === 'weapon' &&
                          part.candidates &&
                          part.candidates.length > 0 && (
                            <div
                              style={{
                                marginTop: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <span className="muted">
                                Qualifying copy in your inventory:
                              </span>
                              <select
                                value={activeWeaponOverride ?? ''}
                                onChange={(e) =>
                                  setSelectedWeapons((prev) => ({
                                    ...prev,
                                    [activePreset.id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">
                                  — Select owned weapon copy —
                                </option>
                                {part.candidates.map((cand) => (
                                  <option key={cand.id} value={cand.id}>
                                    {displayName(cand.key)} R{cand.refinement}{' '}
                                    Lv.{cand.level}{' '}
                                    {cand.location
                                      ? `(on ${displayName(cand.location)})`
                                      : '(in inventory)'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Team Context & Assumed Buffs */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Team &amp; Buff Assumptions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Character</th>
                    <th>Build Source</th>
                    <th>Requirements / Assumed Gear</th>
                    <th>Active Conditionals</th>
                  </tr>
                </thead>
                <tbody>
                  {activePreset.team.map((m, idx) => {
                    const reqParts: string[] = []
                    if (m.requirement?.constellation !== undefined) {
                      reqParts.push(
                        formatConstellationReq(m.requirement.constellation)
                      )
                    }
                    if (m.requirement?.minLevel !== undefined) {
                      reqParts.push(`Lv. >= ${m.requirement.minLevel}`)
                    }
                    if (m.requirement?.weapon) {
                      const rStr = m.requirement.weapon.refinement
                        ? ` ${formatRefinementReq(m.requirement.weapon.refinement)}`
                        : ''
                      reqParts.push(
                        `${displayName(m.requirement.weapon.key)}${rStr}`
                      )
                    }

                    const condList: string[] = []
                    for (const [sheet, map] of Object.entries(
                      m.conditional ?? {}
                    )) {
                      for (const [ck, cv] of Object.entries(map)) {
                        condList.push(`${displayName(sheet)}.${ck} = ${cv}`)
                      }
                    }

                    return (
                      <tr key={m.key}>
                        <td>{idx === 0 ? 'Target' : `Member ${idx + 1}`}</td>
                        <td>
                          <strong>{displayName(m.key)}</strong>
                        </td>
                        <td>
                          {m.build.type === 'owned'
                            ? 'Your Scanned Character'
                            : 'Fixed Preset TC Build'}
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>
                          {m.build.type === 'owned' ? (
                            reqParts.length ? (
                              reqParts.join(' · ')
                            ) : (
                              <span className="muted">
                                Any owned weapon &amp; constellation
                              </span>
                            )
                          ) : (
                            <span>
                              Lv.{m.build.tc.character.level} C
                              {m.build.tc.character.constellation} ·{' '}
                              {displayName(m.build.tc.weapon.key)} R
                              {m.build.tc.weapon.refinement} ·{' '}
                              {Object.entries(m.build.tc.artifact.sets)
                                .map(([s, n]) => `${displayName(s)} (${n}p)`)
                                .join(', ') || 'No Set'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {condList.length ? (
                            condList.join(', ')
                          ) : (
                            <span className="muted">None</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Rotation Breakdown */}
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>
                Rotation: {activePreset.rotation.name} (Repeat ×
                {activePreset.rotation.repeat})
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Damage Instance</th>
                    <th>GO Formula Path</th>
                    <th>Hit Count</th>
                    <th>Hit Mode</th>
                    <th>Reaction</th>
                  </tr>
                </thead>
                <tbody>
                  {activePreset.rotation.targets.map((rt, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{rt.label || rt.path.join('.')}</strong>
                      </td>
                      <td>
                        <code>{rt.path.join('.')}</code>
                      </td>
                      <td>×{rt.count}</td>
                      <td>{humanizeKey(rt.hitMode)}</td>
                      <td>
                        {rt.reaction ? (
                          humanizeKey(rt.reaction)
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="panel muted">No preset matches your filters.</div>
        )}
      </div>
    </div>
  )
}
