'use client'

import PresetsLoading from './loading'
import {
  ConditionalTogglePanel,
  formatHumanConditionalEntry,
} from '@/components/ConditionalTogglePanel'
import { formatRotationRowLabel } from '@/components/OptimizeViews'
import {
  ArtifactBadge,
  CharacterBadge,
  ElementBadge,
  RotationHitModeBadge,
  RotationReactionBadge,
  StatChip,
  WeaponBadge,
} from '@/components/Identifier'
import {
  CharacterTilePicker,
  WeaponTilePicker,
} from '@/components/TilePickers'
import {
  CopyIcon,
  GearIcon,
  PlayIcon,
  PlusIcon,
  SlotIcon,
  TrashIcon,
  UploadIcon,
  type GiSlotKey,
} from '@/components/SvgIcons'
import {
  useGoodStorage,
  useOptimizerSettings,
  useUserPresets,
} from '@/lib/storage/useGood'
import {
  formatConstellationReq,
  formatRefinementReq,
  matchAccount,
} from '@gi/presets/src/match'
import {
  getCharacterMeta,
  getWeaponMeta,
  listWeaponsForType,
} from '@gi/presets/src/metadata'
import { displayName } from '@gi/presets/src/names'
import type { PresetBadge } from '@gi/presets/src/registry'
import type { Preset, PresetSource } from '@gi/presets/src/schema'
import {
  getPresetMemberBuildModes,
  resolvePresetMemberBuildMode,
  setPresetMemberBuildMode,
  type MemberBuildMode,
} from '@gi/presets/src/settings'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export default function PresetsPage() {
  const { record, loading: goodLoading } = useGoodStorage()
  const { settings, update: updateSettings } = useOptimizerSettings()
  const {
    presets: userPresets,
    loading: userLoading,
    remove: removeUserPreset,
  } = useUserPresets()

  const ownedCharKeys = useMemo(
    () => new Set((record?.good.characters ?? []).map((c) => c.key)),
    [record]
  )

  const [registryMod, setRegistryMod] = useState<{
    bundled: readonly Preset[]
    getPresetBadge: (p: Preset) => PresetBadge
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('@gi/presets/src/registry').then((mod) => {
      if (!cancelled) {
        setRegistryMod({
          bundled: mod.listBundledPresets(),
          getPresetBadge: mod.getPresetBadge,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const [sourceFilter, setSourceFilter] = useState<'all' | PresetSource>('all')
  const [targetFilter, setTargetFilter] = useState<string>('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [expandedDetailAssumptions, setExpandedDetailAssumptions] = useState(false)
  const [selectedWeapons, setSelectedWeapons] = useState<
    Record<string, string>
  >({})
  const [akashaWeaponChoices, setAkashaWeaponChoices] = useState<
    Record<string, { key: string; refinement: number }>
  >({})
  const [confirmDeletePresetId, setConfirmDeletePresetId] = useState<
    string | null
  >(null)

  const allPresets = useMemo(() => {
    const bundled = registryMod?.bundled ?? []
    return [...bundled, ...userPresets]
  }, [registryMod, userPresets])

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

  if (goodLoading || userLoading || !registryMod) {
    return <PresetsLoading />
  }

  const { getPresetBadge } = registryMod

  return (
    <div className="presets-page">
      <div className="presets-header">
        <div>
          <h1 className="gi-page-title">Presets Library</h1>
          <p className="gi-page-subtitle">
            Akasha leaderboards, Official meta setups, and Custom team presets.
          </p>
        </div>
        <Link href="/teams">
          <button type="button" className="btn-primary btn-icon">
            <PlusIcon size={15} />
            <span>New Preset</span>
          </button>
        </Link>
      </div>

      {!record && (
        <div className="panel presets-warn-banner">
          <span className="warn">
            Import a GOOD scanner file to evaluate your artifacts.
          </span>
          <Link href="/import">
            <button type="button" className="btn-secondary btn-icon">
              <UploadIcon size={15} />
              <span>Import</span>
            </button>
          </Link>
        </div>
      )}

      {/* Filter Bar */}
      <div className="panel presets-filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
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

          <span className="muted presets-count">
            Showing {filteredPresets.length} presets
          </span>
        </div>

        <div className="gi-field-label">
          <span className="muted">Target Character:</span>
          <CharacterTilePicker
            ariaLabel="Filter presets by target character"
            value={targetFilter}
            searchable={false}
            options={[
              { key: '', label: 'All Characters' },
              ...availableTargets.map((ck) => ({
                key: ck,
                label: displayName(ck),
              })),
            ]}
            onChange={(nextKey) => setTargetFilter(nextKey)}
          />
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="presets-split">
        {/* Left List */}
        <div className="presets-list">
          {filteredPresets.map((p) => {
            const badge = getPresetBadge(p)
            const isSelected = activePreset?.id === p.id
            const isAkasha = p.source === 'akasha'
            const targetMeta = getCharacterMeta(p.target)
            const quickMatch =
              !isAkasha && record?.good
                ? matchAccount(p, record.good, {
                    selectedWeaponId: selectedWeapons[p.id],
                  })
                : null
            const oneLineSummary =
              p.description ||
              `${p.rotation.name} (${p.rotation.targets.length} hits ×${p.rotation.repeat})`

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                data-testid={`preset-card-${p.id}`}
                onClick={() => {
                  setSelectedPresetId(p.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedPresetId(p.id)
                  }
                }}
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
                    {badge.verified ? ' · ✓' : ''}
                  </span>
                  <ElementBadge
                    element={targetMeta.element}
                    label={`◎ ${targetMeta.displayName}`}
                    compact
                  />
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
                  {p.team.map((m, mIdx) => {
                    const isTarget = mIdx === 0
                    const resolved = resolvePresetMemberBuildMode({
                      presetSource: p.source,
                      isTarget,
                      memberBuildType: m.build.type,
                      characterKey: m.key,
                      ownedCharKeys,
                      overrideMode: getPresetMemberBuildModes(settings, p.id)[
                        m.key
                      ],
                    })
                    const isSim = isTarget
                      ? m.build.type === 'tc' || m.build.type === 'fixed'
                      : resolved.mode === 'tc'
                    return (
                      <CharacterBadge
                        key={m.key}
                        characterKey={m.key}
                        simulated={isSim}
                        role={isTarget ? 'target' : 'owned'}
                        compact
                      />
                    )
                  })}
                </div>
                <div className="preset-card-summary-line">
                  {oneLineSummary}
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
                        className="btn-primary btn-icon"
                      >
                        <PlayIcon size={15} />
                        <span>Optimize</span>
                      </button>
                    </Link>

                    <Link
                      href={`/teams?fork=${encodeURIComponent(activePreset.id)}`}
                    >
                      <button type="button" className="btn-secondary btn-icon">
                        <CopyIcon size={15} />
                        <span>Fork</span>
                      </button>
                    </Link>

                    {activePreset.source === 'user' && (
                      <>
                        <Link
                          href={`/teams?edit=${encodeURIComponent(
                            activePreset.id
                          )}`}
                        >
                          <button
                            type="button"
                            className="btn-secondary btn-icon"
                          >
                            <GearIcon size={15} />
                            <span>Edit</span>
                          </button>
                        </Link>
                        {confirmDeletePresetId !== activePreset.id ? (
                          <button
                            type="button"
                            data-testid="delete-preset-btn"
                            onClick={() =>
                              setConfirmDeletePresetId(activePreset.id)
                            }
                            className="btn-danger btn-icon"
                          >
                            <TrashIcon size={15} />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <div
                            className="preset-gear-row"
                            data-testid="delete-preset-confirm-bar"
                            role="group"
                            aria-label={`Confirm deleting preset ${activePreset.name}`}
                          >
                            <span
                              className="warn"
                              style={{ fontSize: '0.85rem' }}
                            >
                              Delete &ldquo;{activePreset.name}&rdquo;?
                            </span>
                            <button
                              type="button"
                              data-testid="confirm-delete-preset-btn"
                              className="btn-danger"
                              onClick={async () => {
                                await removeUserPreset(activePreset.id)
                                setConfirmDeletePresetId(null)
                              }}
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              data-testid="cancel-delete-preset-btn"
                              className="btn-secondary"
                              onClick={() => setConfirmDeletePresetId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
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
                  title={activePreset.akasha.leaderboardUrl}
                  data-testid="akasha-provenance-link"
                >
                  Akasha leaderboard case
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
                    Akasha Artifact-Only —{' '}
                    <code>
                      Lv.{activePreset.team[0].build.character.level} C
                      {activePreset.team[0].build.character.constellation} (
                      {activePreset.team[0].build.character.talent.auto}/
                      {activePreset.team[0].build.character.talent.skill}/
                      {activePreset.team[0].build.character.talent.burst})
                    </code>
                  </strong>
                  <button
                    type="button"
                    className="preset-collapse-toggle"
                    onClick={() => setExpandedDetailAssumptions((v) => !v)}
                  >
                    {expandedDetailAssumptions ? 'Hide details ▴' : 'Details ▾'}
                  </button>
                </div>
                {expandedDetailAssumptions && (
                  <div className="muted preset-akasha-desc">
                    Evaluates <strong>{displayName(activePreset.target)}</strong>{' '}
                    with fixed character stats and any chosen weapon; only your
                    imported GOOD artifacts are used.
                  </div>
                )}

                <div className="preset-akasha-controls">
                  <WeaponBadge
                    weaponKey={activeAkashaChoice.key}
                    subtitle={`R${activeAkashaChoice.refinement} · Lv.90`}
                  />

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

                <WeaponTilePicker
                  ariaLabel="Akasha Simulated Weapon"
                  value={activeAkashaChoice.key}
                  options={availableAkashaWeapons.map((w) => ({
                    id: w.key,
                    weaponKey: w.key,
                    label: w.displayName,
                  }))}
                  onChange={(nextKey) => {
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
                />
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
                              <div
                                className="preset-match-candidates"
                                style={{ marginTop: '0.4rem', width: '100%' }}
                              >
                                <span className="muted">
                                  Qualifying copy in your inventory:
                                </span>
                                <WeaponTilePicker
                                  ariaLabel="Qualifying weapon copy in your inventory"
                                  value={
                                    activeWeaponOverride ||
                                    activeMatch.selectedWeaponId ||
                                    part.candidates[0]!.id
                                  }
                                  options={part.candidates.map((cand) => ({
                                    id: cand.id,
                                    weaponKey: cand.key,
                                    label: displayName(cand.key),
                                    subcaption: `R${cand.refinement} Lv.${cand.level} ${
                                      cand.location
                                        ? `(${displayName(cand.location)})`
                                        : '(in inventory)'
                                    }`,
                                  }))}
                                  onChange={(nextId) =>
                                    setSelectedWeapons((prev) => ({
                                      ...prev,
                                      [activePreset.id]: nextId,
                                    }))
                                  }
                                />
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
              <div className="gi-table-wrap">
                <table className="gi-table">
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
                      const isTarget = idx === 0
                      const resolved = resolvePresetMemberBuildMode({
                        presetSource: activePreset.source,
                        isTarget,
                        memberBuildType: m.build.type,
                        characterKey: m.key,
                        ownedCharKeys,
                        overrideMode: getPresetMemberBuildModes(
                          settings,
                          activePreset.id
                        )[m.key],
                      })
                      const isSim = isTarget
                        ? m.build.type === 'tc' || m.build.type === 'fixed'
                        : resolved.mode === 'tc'
                      const isOfficialOwnedMember =
                        !isTarget &&
                        activePreset.source === 'official' &&
                        resolved.mode === 'owned'
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
                      if (!isOfficialOwnedMember) {
                        for (const [sheet, map] of Object.entries(
                          m.conditional ?? {}
                        )) {
                          for (const [ck, cv] of Object.entries(map)) {
                            condList.push(
                              formatHumanConditionalEntry(sheet, ck, cv)
                            )
                          }
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
                              <span className="warn">
                                {resolved.forcedSimulated
                                  ? 'Simulated Teammate (Not in GOOD)'
                                  : 'Simulated Teammate'}
                              </span>
                            ) : (
                              <span className="ok">Member {idx + 1} (Owned)</span>
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
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              {isTarget ? (
                                m.build.type === 'owned' ? (
                                  <span className="ok">
                                    Your Scanned Character
                                  </span>
                                ) : (
                                  <span className="warn">
                                    Fixed Preset Character + Simulated Weapon +
                                    Your Artifacts
                                  </span>
                                )
                              ) : isOfficialOwnedMember ? (
                                <span className="ok">
                                  Your Scanned Character (GOOD)
                                </span>
                              ) : resolved.forcedSimulated ? (
                                <span className="warn">
                                  Not in GOOD — Simulated Preset Build
                                </span>
                              ) : (
                                <span className="warn">
                                  Simulated / Assumed Preset Build (Not Your
                                  Account)
                                </span>
                              )}
                              {!isTarget &&
                                activePreset.source === 'official' && (
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    data-testid={`preset-member-build-toggle-${m.key}`}
                                    data-character-key={m.key}
                                    data-build-mode={resolved.mode}
                                    data-owned-in-good={
                                      resolved.ownedInGood ? 'true' : 'false'
                                    }
                                    data-forced-simulated={
                                      resolved.forcedSimulated
                                        ? 'true'
                                        : 'false'
                                    }
                                    aria-pressed={resolved.mode === 'tc'}
                                    onClick={() => {
                                      const nextMode: MemberBuildMode =
                                        !resolved.ownedInGood
                                          ? 'tc'
                                          : resolved.mode === 'owned'
                                            ? 'tc'
                                            : 'owned'
                                      void updateSettings(
                                        setPresetMemberBuildMode(
                                          settings,
                                          activePreset.id,
                                          m.key,
                                          nextMode
                                        )
                                      )
                                    }}
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '0.16rem 0.45rem',
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {resolved.forcedSimulated
                                      ? 'Simulated (Not in GOOD)'
                                      : resolved.mode === 'owned'
                                        ? 'Owned Build'
                                        : 'Simulated (TC)'}
                                  </button>
                                )}
                            </div>
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
                                {reqParts.length === 0 &&
                                  !m.requirement?.weapon && (
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
                                {(['sands', 'goblet', 'circlet'] as const).map(
                                  (sk: GiSlotKey) => {
                                    const mk =
                                      m.build.type === 'tc'
                                        ? m.build.tc.artifact.slots[sk]?.statKey
                                        : undefined
                                    if (!mk) return null
                                    return (
                                      <span
                                        key={sk}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.18rem',
                                        }}
                                      >
                                        <SlotIcon
                                          slotKey={sk}
                                          iconProps={{ size: 13 }}
                                        />
                                        <StatChip statKey={mk} compact />
                                      </span>
                                    )
                                  }
                                )}
                              </div>
                            )}
                          </td>
                          <td className="preset-td-conds">
                            {isOfficialOwnedMember ? (
                              <span className="muted">
                                Derived from your equipped weapon &amp; artifact
                                sets in GOOD
                              </span>
                            ) : condList.length ? (
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
            </div>

            <ConditionalTogglePanel
              preset={activePreset}
              settings={settings}
              onChangeSettings={(next) => void updateSettings(next)}
              good={record?.good}
              activeTargetWeaponKey={
                activePreset.source === 'akasha'
                  ? activeAkashaChoice?.key
                  : record?.good.weapons.find(
                      (w) =>
                        w.id ===
                        (activeWeaponOverride || activeMatch?.selectedWeaponId)
                    )?.key ??
                    record?.good.weapons.find(
                      (w) => w.location === activePreset.target
                    )?.key
              }
            />

            {/* Rotation Breakdown */}
            <div>
              <h3 className="preset-section-heading">
                Rotation: {activePreset.rotation.name} (Repeat ×
                {activePreset.rotation.repeat})
              </h3>
              <div className="gi-table-wrap">
                <table className="gi-table">
                  <thead>
                    <tr>
                      <th>Damage Instance</th>
                      <th>Hit Count</th>
                      <th>Hit Mode</th>
                      <th>Reaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePreset.rotation.targets.map((rt, i) => (
                      <tr key={i} data-testid={`preset-rotation-row-${i}`}>
                        <td>
                          <strong>
                            {formatRotationRowLabel(rt.label, rt.path)}
                          </strong>
                        </td>
                        <td>×{rt.count}</td>
                        <td>
                          <RotationHitModeBadge hitMode={rt.hitMode} compact />
                        </td>
                        <td>
                          <RotationReactionBadge
                            reaction={rt.reaction}
                            compact
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="gi-empty-card">No preset matches your filters.</div>
        )}
      </div>
    </div>
  )
}
