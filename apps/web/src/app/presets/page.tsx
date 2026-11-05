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
    <div className="presets-page">
      <div className="presets-header">
        <div>
          <h1 className="presets-title">Presets Library</h1>
          <p className="muted presets-subtitle">
            Browse Akasha leaderboard setups (artifact-only mode with fixed
            target &amp; free weapon choice), Official meta team presets, and
            your own Custom presets.
          </p>
        </div>
        <Link href="/teams">
          <button type="button" className="btn-primary">
            + Create Custom Team / Preset
          </button>
        </Link>
      </div>

      {!record && (
        <div className="panel presets-warn-banner">
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
      <div className="panel presets-filter-bar">
        <label className="presets-filter-label">
          <span className="muted">Source:</span>
          <select
            aria-label="Filter presets by source"
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

        <label className="presets-filter-label">
          <span className="muted">Target Character:</span>
          <select
            aria-label="Filter presets by target character"
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

        <span className="muted presets-count">
          Showing {filteredPresets.length} presets
        </span>
      </div>

      {/* Master-Detail Split */}
      <div className="presets-split">
        {/* Left List */}
        <div className="presets-list">
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
                className={`panel preset-card${isSelected ? ' preset-card-selected' : ''}`}
              >
                <div className="preset-card-top">
                  <span
                    className={`fw-600 ${
                      badge.kind === 'user'
                        ? 'warn'
                        : badge.verified
                          ? 'ok'
                          : 'muted'
                    }`}
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
                <strong className="preset-card-name">{p.name}</strong>
                <div className="preset-card-team">
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
          <div className="panel preset-detail">
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
                <div className="preset-detail-header">
                  <div>
                    <div
                      className={`preset-detail-badge ${
                        badge.kind === 'user'
                          ? 'warn'
                          : badge.verified
                            ? 'ok'
                            : 'muted'
                      }`}
                    >
                      {badge.label}
                      {badge.verified ? ' · Verified against GO' : ''}
                    </div>
                    <h2 className="preset-detail-title">{activePreset.name}</h2>
                    {activePreset.description && (
                      <p className="muted m-0">{activePreset.description}</p>
                    )}
                    {badge.warning && (
                      <p className="warn preset-detail-warning">
                        ⚠ {badge.warning}
                      </p>
                    )}
                  </div>

                  <div className="preset-detail-actions">
                    <Link href={optimizeUrl}>
                      <button
                        type="button"
                        disabled={!canOptimize}
                        className="btn-primary"
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
                          className="btn-danger"
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
              <div className="preset-provenance-box">
                <strong>Akasha Leaderboard Provenance:</strong>{' '}
                <span>{activePreset.akasha.label}</span> ·{' '}
                <a
                  href={activePreset.akasha.leaderboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activePreset.akasha.leaderboardUrl}
                </a>
                {activePreset.akasha.notes && (
                  <div className="muted mt-xs">{activePreset.akasha.notes}</div>
                )}
              </div>
            )}

            {/* Akasha Artifact-Only Mode Setup vs Owned Target Character & Weapon Check */}
            {activePreset.source === 'akasha' &&
            activePreset.team[0]?.build.type === 'fixed' &&
            activeAkashaChoice ? (
              <div className="preset-akasha-box">
                <div className="preset-akasha-top">
                  <strong>
                    Akasha Artifact-Only Mode — Fixed Target &amp; Free Weapon
                    Selection
                  </strong>
                  <span className="ok preset-detail-badge">
                    ✓ No Account Character / Weapon Gate
                  </span>
                </div>
                <div className="muted preset-akasha-desc">
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

                <div className="preset-akasha-controls">
                  <WeaponBadge
                    weaponKey={activeAkashaChoice.key}
                    subtitle={`R${activeAkashaChoice.refinement} · Lv.90 Simulated`}
                  />

                  <label className="presets-filter-label-sm">
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

                  <label className="presets-filter-label-sm">
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
              <div className="preset-match-box">
                <strong>Target Character &amp; Weapon Check</strong>
                <div className="muted preset-match-desc">
                  Only your target character ({displayName(activePreset.target)})
                  and its required weapon are checked against your account.
                  Simulated (<code>SIM</code>) preset teammates use fixed
                  assumed stats and are never required in your account.
                </div>
                {!record ? (
                  <p className="muted preset-match-empty">
                    Import your GOOD JSON on the{' '}
                    <Link href="/import">Import</Link> page to check whether
                    your target character and weapon satisfy this preset.
                  </p>
                ) : activeMatch ? (
                  <div className="preset-match-results">
                    <ul className="preset-match-list">
                      {activeMatch.parts.map((part, idx) => (
                        <li
                          key={idx}
                          className={`preset-match-item ${
                            part.ok ? 'ok' : 'error'
                          }`}
                        >
                          <strong>{part.ok ? '✓' : '✕'}</strong> {part.message}
                          {part.part === 'weapon' &&
                            part.candidates &&
                            part.candidates.length > 0 && (
                              <div className="preset-match-candidates">
                                <span className="muted">
                                  Qualifying copy in your inventory:
                                </span>
                                <select
                                  aria-label="Qualifying weapon copy in your inventory"
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
              <h3 className="preset-section-heading">
                Team &amp; Buff Assumptions
              </h3>
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
                        <td className="preset-td-gear">
                          {m.build.type === 'owned' ? (
                            <div className="preset-gear-row">
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
                            <div className="preset-gear-row-md">
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
                            <div className="preset-gear-row-md">
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
                        <td className="preset-td-conds">
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
              <h3 className="preset-section-heading">
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
