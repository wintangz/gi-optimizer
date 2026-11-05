'use client'

import PresetsLoading from './loading'
import {
  ArtifactBadge,
  CharacterBadge,
  WeaponBadge,
} from '@/components/Identifier'
import { useGoodStorage, useUserPresets } from '@/lib/storage/useGood'
import { humanizeKey } from '@gi/good'
import {
  displayName,
  formatConstellationReq,
  formatRefinementReq,
  getCharacterMeta,
  getPresetBadge,
  getWeaponMeta,
  listBundledPresets,
  listWeaponsForType,
  matchAccount,
  type Preset,
  type PresetSource,
} from '@gi/presets'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export default function PresetsPage() {
  const { record, loading: goodLoading } = useGoodStorage()
  const {
    presets: userPresets,
    loading: userLoading,
    remove: removeUserPreset,
  } = useUserPresets()

  const [sourceFilter, setSourceFilter] = useState<'all' | PresetSource>('all')
  const [targetFilter, setTargetFilter] = useState<string>('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [selectedWeapons, setSelectedWeapons] = useState<
    Record<string, string>
  >({})
  const [akashaWeaponChoices, setAkashaWeaponChoices] = useState<
    Record<string, { key: string; refinement: number }>
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
    if (!activePreset || !record?.good || activePreset.source === 'akasha')
      return null
    return matchAccount(activePreset, record.good, {
      selectedWeaponId: activeWeaponOverride,
    })
  }, [activePreset, record, activeWeaponOverride])

  const activeAkashaDefaultWeapon = useMemo(() => {
    if (!activePreset || activePreset.team[0]?.build.type !== 'fixed')
      return null
    return activePreset.team[0].build.weapon
  }, [activePreset])

  const activeAkashaChoice = useMemo(() => {
    if (!activePreset || !activeAkashaDefaultWeapon) return null
    return (
      akashaWeaponChoices[activePreset.id] ?? {
        key: activeAkashaDefaultWeapon.key,
        refinement: activeAkashaDefaultWeapon.refinement,
      }
    )
  }, [activePreset, activeAkashaDefaultWeapon, akashaWeaponChoices])

  const availableAkashaWeapons = useMemo(() => {
    if (!activePreset || activePreset.source !== 'akasha') return []
    const charMeta = getCharacterMeta(activePreset.target)
    return listWeaponsForType(charMeta.weaponType)
  }, [activePreset])

  if (goodLoading || userLoading) {
    return <PresetsLoading />
  }

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
            Browse Akasha leaderboard setups (artifact-only mode with fixed
            target &amp; free weapon choice), Official meta team presets, and
            your own Custom presets.
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
            No GOOD account data imported yet. Import your scanner file to
            optimise your artifacts against any preset.
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
            <option value="user">
              Custom User Presets ({userPresets.length})
            </option>
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

        <span
          className="muted"
          style={{ marginLeft: 'auto', fontSize: '0.9rem' }}
        >
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
            const isAkasha = p.source === 'akasha'
            const quickMatch =
              !isAkasha && record?.good
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
                  {isAkasha ? (
                    <span className="ok">Artifact-Only</span>
                  ) : (
                    quickMatch && (
                      <span className={quickMatch.canRun ? 'ok' : 'error'}>
                        {quickMatch.canRun ? '✓ Ready' : '✕ Mismatch'}
                      </span>
                    )
                  )}
                </div>
                <strong style={{ fontSize: '0.98rem' }}>{p.name}</strong>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.45rem',
                    alignItems: 'center',
                    marginTop: '0.15rem',
                  }}
                >
                  {p.team.map((m, mIdx) => (
                    <CharacterBadge
                      key={m.key}
                      characterKey={m.key}
                      simulated={
                        m.build.type === 'tc' || m.build.type === 'fixed'
                      }
                      role={mIdx === 0 ? 'target' : 'owned'}
                      compact
                    />
                  ))}
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
              const isAkasha = activePreset.source === 'akasha'
              const canOptimize = isAkasha
                ? Boolean(record)
                : Boolean(record && (!activeMatch || activeMatch.canRun))

              const optimizeUrl = !canOptimize
                ? '#'
                : isAkasha && activeAkashaChoice
                  ? `/optimize?preset=${encodeURIComponent(
                      activePreset.id
                    )}&weaponKey=${encodeURIComponent(
                      activeAkashaChoice.key
                    )}&refinement=${activeAkashaChoice.refinement}`
                  : `/optimize?preset=${encodeURIComponent(activePreset.id)}${
                      activeMatch?.selectedWeaponId
                        ? `&weapon=${encodeURIComponent(
                            activeMatch.selectedWeaponId
                          )}`
                        : ''
                    }`

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

                  <div
                    style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                  >
                    <Link href={optimizeUrl}>
                      <button
                        type="button"
                        disabled={!canOptimize}
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

            {/* Akasha Artifact-Only Mode Setup vs Owned Target Character & Weapon Check */}
            {activePreset.source === 'akasha' &&
            activePreset.team[0]?.build.type === 'fixed' &&
            activeAkashaChoice ? (
              <div
                style={{
                  background: '#151821',
                  border: '1px solid var(--accent)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
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
                    Akasha Artifact-Only Mode — Fixed Target &amp; Free Weapon
                    Selection
                  </strong>
                  <span className="ok" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    ✓ No Account Character / Weapon Gate
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.84rem' }}>
                  This Akasha leaderboard preset evaluates{' '}
                  <strong>{displayName(activePreset.target)}</strong> using the
                  preset&apos;s fixed simulated character spec (
                  <code>
                    Lv.{activePreset.team[0].build.character.level} · C
                    {activePreset.team[0].build.character.constellation} ·
                    Talents{' '}
                    {activePreset.team[0].build.character.talent.auto}/
                    {activePreset.team[0].build.character.talent.skill}/
                    {activePreset.team[0].build.character.talent.burst}
                  </code>
                  ) and any weapon of your choice. Only your imported GOOD
                  artifacts enter the calculation.
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                    alignItems: 'center',
                  }}
                >
                  <WeaponBadge
                    weaponKey={activeAkashaChoice.key}
                    subtitle={`R${activeAkashaChoice.refinement} · Lv.90 Simulated`}
                  />

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.88rem',
                    }}
                  >
                    <span className="muted">Simulated Weapon:</span>
                    <select
                      aria-label="Akasha Simulated Weapon"
                      value={activeAkashaChoice.key}
                      onChange={(e) => {
                        const nextKey = e.target.value
                        const meta = getWeaponMeta(nextKey)
                        const nextRef =
                          meta.rarity <= 2 ? 1 : activeAkashaChoice.refinement
                        setAkashaWeaponChoices((prev) => ({
                          ...prev,
                          [activePreset.id]: {
                            key: nextKey,
                            refinement: nextRef,
                          },
                        }))
                      }}
                    >
                      {availableAkashaWeapons.map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.displayName} ({w.rarity}★)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.88rem',
                    }}
                  >
                    <span className="muted">Refinement:</span>
                    <select
                      aria-label="Akasha Weapon Refinement"
                      value={activeAkashaChoice.refinement}
                      disabled={getWeaponMeta(activeAkashaChoice.key).rarity <= 2}
                      onChange={(e) =>
                        setAkashaWeaponChoices((prev) => ({
                          ...prev,
                          [activePreset.id]: {
                            key: activeAkashaChoice.key,
                            refinement: Number(e.target.value),
                          },
                        }))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>
                          R{r}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#151821',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                }}
              >
                <strong>Target Character &amp; Weapon Check</strong>
                <div
                  className="muted"
                  style={{ fontSize: '0.83rem', marginTop: '0.15rem' }}
                >
                  Only your target character ({displayName(activePreset.target)})
                  and its required weapon are checked against your account.
                  Simulated (<code>SIM</code>) preset teammates use fixed
                  assumed stats and are never required in your account.
                </div>
                {!record ? (
                  <p className="muted" style={{ margin: '0.4rem 0 0' }}>
                    Import your GOOD JSON on the{' '}
                    <Link href="/import">Import</Link> page to check whether
                    your target character and weapon satisfy this preset.
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
                                  flexWrap: 'wrap',
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
            )}

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
                    const isSim =
                      m.build.type === 'tc' || m.build.type === 'fixed'
                    const reqParts: string[] = []
                    if (m.requirement?.constellation !== undefined) {
                      reqParts.push(
                        formatConstellationReq(m.requirement.constellation)
                      )
                    }
                    if (m.requirement?.minLevel !== undefined) {
                      reqParts.push(`Lv. >= ${m.requirement.minLevel}`)
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
                        <td>
                          {idx === 0 ? (
                            m.build.type === 'fixed' ? (
                              <strong className="warn">
                                Simulated Target (Akasha)
                              </strong>
                            ) : (
                              <strong className="ok">
                                Your Character · Target
                              </strong>
                            )
                          ) : isSim ? (
                            <span className="warn">Simulated Teammate</span>
                          ) : (
                            <span>Member {idx + 1} (Owned)</span>
                          )}
                        </td>
                        <td>
                          <CharacterBadge
                            characterKey={m.key}
                            simulated={isSim}
                            role={idx === 0 ? 'target' : 'owned'}
                          />
                        </td>
                        <td>
                          {m.build.type === 'owned' ? (
                            <span className="ok">Your Scanned Character</span>
                          ) : m.build.type === 'fixed' ? (
                            <span className="warn">
                              Fixed Preset Character + Simulated Weapon + Your
                              Artifacts
                            </span>
                          ) : (
                            <span className="warn">
                              Simulated / Assumed Preset Build (Not Your Account)
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>
                          {m.build.type === 'owned' ? (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              {reqParts.length > 0 && (
                                <span>{reqParts.join(' · ')}</span>
                              )}
                              {m.requirement?.weapon && (
                                <WeaponBadge
                                  weaponKey={m.requirement.weapon.key}
                                  compact
                                  subtitle={
                                    m.requirement.weapon.refinement
                                      ? formatRefinementReq(
                                          m.requirement.weapon.refinement
                                        )
                                      : undefined
                                  }
                                />
                              )}
                              {reqParts.length === 0 && !m.requirement?.weapon && (
                                <span className="muted">
                                  Any owned weapon &amp; constellation
                                </span>
                              )}
                            </div>
                          ) : m.build.type === 'fixed' ? (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <span>
                                Lv.{m.build.character.level} C
                                {m.build.character.constellation} (
                                {m.build.character.talent.auto}/
                                {m.build.character.talent.skill}/
                                {m.build.character.talent.burst})
                              </span>
                              <WeaponBadge
                                weaponKey={
                                  activeAkashaChoice?.key ?? m.build.weapon.key
                                }
                                compact
                                subtitle={`R${
                                  activeAkashaChoice?.refinement ??
                                  m.build.weapon.refinement
                                } (Default: ${displayName(
                                  m.build.weapon.key
                                )} R${m.build.weapon.refinement})`}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <span>
                                Lv.{m.build.tc.character.level} C
                                {m.build.tc.character.constellation}
                              </span>
                              <WeaponBadge
                                weaponKey={m.build.tc.weapon.key}
                                compact
                                subtitle={`R${m.build.tc.weapon.refinement}`}
                              />
                              {Object.entries(m.build.tc.artifact.sets).map(
                                ([s, n]) => (
                                  <ArtifactBadge
                                    key={s}
                                    setKey={s}
                                    compact
                                    subtitle={`(${n}p)`}
                                  />
                                )
                              )}
                            </div>
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
