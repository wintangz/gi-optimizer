'use client'

import OptimizeLoading from './loading'
import { ArtifactSetFilter } from '@/components/ArtifactSetFilter'
import { CharacterBadge, WeaponBadge } from '@/components/Identifier'
import { ProgressBar, ResultsSkeleton, Spinner } from '@/components/Loading'
import {
  BuildComparisonList,
  ConstraintsCard,
  type ComparisonBuildEntry,
} from '@/components/OptimizeViews'
import {
  DownloadIcon,
  GearIcon,
  PlayIcon,
  StopIcon,
  UploadIcon,
} from '@/components/SvgIcons'
import {
  cancelOptimizationInWorker,
  evaluatePresetInWorker,
  exportGODatabaseInWorker,
  isEngineSessionHydrated,
  optimizePresetInWorker,
} from '@/lib/engine/workerClient'
import {
  useGoodStorage,
  useOptimizerSettings,
  useUserPresets,
} from '@/lib/storage/useGood'
import type {
  BuildSelection,
  OptimizeProgress,
  OptimizeResult,
  RotationResult,
  SimulatedWeaponSpec,
} from '@gi/engine'
import { type IArtifact } from '@gi/good'
import {
  displayName,
  formatRarityStars,
  getCharacterMeta,
  getPresetBadge,
  getWeaponMeta,
  listBundledPresets,
  listWeaponsForType,
  matchAccount,
  type Preset,
} from '@gi/presets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

function OptimizeInner() {
  const searchParams = useSearchParams()
  const presetParam = searchParams.get('preset')
  const weaponParam = searchParams.get('weapon')
  const weaponKeyParam = searchParams.get('weaponKey')
  const refinementParam = searchParams.get('refinement')

  const { record, loading: goodLoading } = useGoodStorage()
  const { presets: userPresets, loading: presetsLoading } = useUserPresets()
  const {
    settings,
    loading: settingsLoading,
    update: updateSettings,
  } = useOptimizerSettings()

  const allPresets = useMemo(
    () => [...listBundledPresets(), ...userPresets],
    [userPresets]
  )

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    presetParam || 'akasha/furina-salon-pjc-c0'
  )
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(
    weaponParam || ''
  )
  const [akashaWeaponByPreset, setAkashaWeaponByPreset] = useState<
    Record<string, { key: string; refinement: number }>
  >(() => {
    if (presetParam && weaponKeyParam) {
      const refNum = Number(refinementParam)
      return {
        [presetParam]: {
          key: weaponKeyParam,
          refinement:
            Number.isFinite(refNum) && refNum >= 1 && refNum <= 5
              ? Math.round(refNum)
              : 1,
        },
      }
    }
    return {}
  })
  const [excludeCharInput, setExcludeCharInput] = useState<string>('')

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<OptimizeProgress | null>(null)
  const [optResult, setOptResult] = useState<OptimizeResult | null>(null)
  const [optError, setOptError] = useState<string | null>(null)

  const [currentSelection, setCurrentSelection] =
    useState<BuildSelection | null>(null)
  const [currentEval, setCurrentEval] = useState<RotationResult | null>(null)
  const [optimisedEvals, setOptimisedEvals] = useState<
    Array<RotationResult | null>
  >([])
  const [evaluating, setEvaluating] = useState(false)
  const [hydratingEngine, setHydratingEngine] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (presetParam) setSelectedPresetId(presetParam)
    if (weaponParam) setSelectedWeaponId(weaponParam)
    if (presetParam && weaponKeyParam) {
      const refNum = Number(refinementParam)
      setAkashaWeaponByPreset((prev) => ({
        ...prev,
        [presetParam]: {
          key: weaponKeyParam,
          refinement:
            Number.isFinite(refNum) && refNum >= 1 && refNum <= 5
              ? Math.round(refNum)
              : 1,
        },
      }))
    }
  }, [presetParam, weaponParam, weaponKeyParam, refinementParam])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activePreset: Preset | undefined = useMemo(
    () =>
      allPresets.find((p) => p.id === selectedPresetId) ?? allPresets[0],
    [allPresets, selectedPresetId]
  )

  const isAkashaPreset =
    activePreset?.source === 'akasha' &&
    activePreset.team[0]?.build.type === 'fixed'

  const akashaWeaponSpec: SimulatedWeaponSpec | undefined = useMemo(() => {
    if (!activePreset || activePreset.team[0]?.build.type !== 'fixed') {
      return undefined
    }
    const defaultW = activePreset.team[0].build.weapon
    const chosen = akashaWeaponByPreset[activePreset.id]
    if (chosen) {
      const wMeta = getWeaponMeta(chosen.key)
      return {
        key: chosen.key,
        level: wMeta.rarity <= 2 ? 70 : 90,
        ascension: wMeta.rarity <= 2 ? 4 : 6,
        refinement: wMeta.rarity <= 2 ? 1 : chosen.refinement,
      }
    }
    if (record?.good) {
      const charExists = record.good.characters.some(
        (c) => c.key === activePreset.target
      )
      if (charExists) {
        const targetWeaponType = getCharacterMeta(
          activePreset.target
        ).weaponType
        const equipped = record.good.weapons.find(
          (w) =>
            w.location === activePreset.target &&
            getWeaponMeta(w.key).weaponType === targetWeaponType
        )
        if (equipped) {
          const wMeta = getWeaponMeta(equipped.key)
          return {
            key: equipped.key,
            level: wMeta.rarity <= 2 ? 70 : 90,
            ascension: wMeta.rarity <= 2 ? 4 : 6,
            refinement: wMeta.rarity <= 2 ? 1 : equipped.refinement,
          }
        }
      }
    }
    return {
      key: defaultW.key,
      level: defaultW.level,
      ascension: defaultW.ascension,
      refinement: defaultW.refinement,
    }
  }, [activePreset, akashaWeaponByPreset, record])

  const availableAkashaWeapons = useMemo(() => {
    if (!activePreset || !isAkashaPreset) return []
    const charMeta = getCharacterMeta(activePreset.target)
    return listWeaponsForType(charMeta.weaponType)
  }, [activePreset, isAkashaPreset])

  const matchReport = useMemo(() => {
    if (!activePreset || !record?.good || isAkashaPreset) return null
    return matchAccount(activePreset, record.good, {
      selectedWeaponId: selectedWeaponId || undefined,
    })
  }, [activePreset, record, selectedWeaponId, isAkashaPreset])

  const effectiveWeaponId = isAkashaPreset
    ? undefined
    : selectedWeaponId || matchReport?.selectedWeaponId || undefined

  const canRunPreset = useMemo(() => {
    if (!record?.good || !activePreset) return false
    if (isAkashaPreset) return true
    return !matchReport || matchReport.canRun
  }, [record, activePreset, isAkashaPreset, matchReport])

  const artifactById = useMemo(() => {
    const map = new Map<string, IArtifact>()
    if (!record?.good) return map
    for (const a of record.good.artifacts) {
      map.set(a.id, a)
    }
    return map
  }, [record])

  const hasCurrentEquippedArtifacts = useMemo(() => {
    if (!currentSelection) return false
    return Object.keys(currentSelection.artifactIds).length > 0
  }, [currentSelection])

  // Off-main-thread evaluation of Current Build via the shared worker session
  useEffect(() => {
    let cancelled = false
    if (!record?.good || !activePreset || !canRunPreset) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setCurrentSelection(null)
          setCurrentEval(null)
        }
      })
      return () => {
        cancelled = true
      }
    }

    const coldHydration = !isEngineSessionHydrated(record.importedAt)

    void (async () => {
      setHydratingEngine(coldHydration)
      setEvaluating(true)
      try {
        const baseRes = await evaluatePresetInWorker({
          datasetKey: record.importedAt,
          good: record.good,
          preset: activePreset,
        })
        if (cancelled) return

        const hasEquipped =
          Object.keys(baseRes.currentBuild.artifactIds).length > 0

        const effectiveCurrent: BuildSelection = isAkashaPreset
          ? {
              weaponOverride: akashaWeaponSpec,
              artifactIds: baseRes.currentBuild.artifactIds,
            }
          : {
              weaponId: effectiveWeaponId ?? baseRes.currentBuild.weaponId,
              artifactIds: baseRes.currentBuild.artifactIds,
            }
        setCurrentSelection(effectiveCurrent)

        // For Akasha presets, if the target character is not owned or has no artifacts equipped,
        // do not evaluate a current build — show the optimised result without a current build.
        if (isAkashaPreset && !hasEquipped) {
          setCurrentEval(null)
          return
        }

        const needsReEval = isAkashaPreset
          ? Boolean(
              akashaWeaponSpec &&
                (akashaWeaponSpec.key !==
                  baseRes.currentBuild.weaponOverride?.key ||
                  akashaWeaponSpec.refinement !==
                    baseRes.currentBuild.weaponOverride?.refinement)
            )
          : Boolean(
              effectiveWeaponId &&
                effectiveWeaponId !== baseRes.currentBuild.weaponId
            )

        if (needsReEval) {
          const overrideRes = await evaluatePresetInWorker({
            datasetKey: record.importedAt,
            good: record.good,
            preset: activePreset,
            selection: effectiveCurrent,
          })
          if (cancelled) return
          setCurrentEval(overrideRes.result)
        } else {
          setCurrentEval(baseRes.result)
        }
      } catch {
        if (!cancelled) {
          setCurrentEval(null)
        }
      } finally {
        if (!cancelled) {
          setEvaluating(false)
          setHydratingEngine(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    record,
    activePreset,
    canRunPreset,
    isAkashaPreset,
    akashaWeaponSpec,
    effectiveWeaponId,
  ])

  // Off-main-thread evaluation of all returned Top-N Optimised Builds via the shared worker session
  useEffect(() => {
    let cancelled = false
    if (!record?.good || !activePreset || !optResult || optResult.builds.length === 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) setOptimisedEvals([])
      })
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      setEvaluating(true)
      try {
        const evals = await Promise.all(
          optResult.builds.map(async (b) => {
            const res = await evaluatePresetInWorker({
              datasetKey: record.importedAt,
              good: record.good,
              preset: activePreset,
              selection: isAkashaPreset
                ? { ...b, weaponOverride: akashaWeaponSpec }
                : b,
            })
            return res.result
          })
        )
        if (!cancelled) {
          setOptimisedEvals(evals)
        }
      } catch {
        if (!cancelled) {
          setOptimisedEvals([])
        }
      } finally {
        if (!cancelled) {
          setEvaluating(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [record, activePreset, optResult, isAkashaPreset, akashaWeaponSpec])

  async function startOptimization() {
    if (!record?.good || !activePreset || !canRunPreset) return
    setRunning(true)
    setOptError(null)
    setOptResult(null)
    setOptimisedEvals([])
    setProgress({ tested: 0, skipped: 0, total: 0 })

    try {
      const res = await optimizePresetInWorker({
        datasetKey: record.importedAt,
        good: record.good,
        preset: activePreset,
        settings,
        weaponId: effectiveWeaponId,
        weaponOverride: isAkashaPreset ? akashaWeaponSpec : undefined,
        onProgress: (p) => setProgress({ ...p }),
      })
      setOptResult(res)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setOptError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  function cancelOptimization() {
    cancelOptimizationInWorker()
    setRunning(false)
  }

  async function handleExportGO(
    selection: BuildSelection | null,
    label: string
  ) {
    if (!record?.good || !activePreset) return
    const effectiveSel: BuildSelection | undefined = selection
      ? isAkashaPreset
        ? { ...selection, weaponOverride: akashaWeaponSpec }
        : selection
      : isAkashaPreset && akashaWeaponSpec
        ? { weaponOverride: akashaWeaponSpec, artifactIds: {} }
        : undefined
    const exported = await exportGODatabaseInWorker({
      datasetKey: record.importedAt,
      good: record.good,
      preset: activePreset,
      selection: effectiveSel,
    })
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `go-verify-${activePreset.target.toLowerCase()}-${label}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (goodLoading || presetsLoading || settingsLoading) {
    return <OptimizeLoading />
  }

  const showCurrentComparison = Boolean(
    currentEval &&
      currentSelection &&
      (!isAkashaPreset || hasCurrentEquippedArtifacts)
  )

  const comparisonOptimizedBuilds: ComparisonBuildEntry[] = (
    optResult?.builds ?? []
  ).map((b, idx) => ({
    selection: b,
    total: b.total,
    evaluation: optimisedEvals[idx] ?? null,
  }))

  const hasAnyResults =
    showCurrentComparison || comparisonOptimizedBuilds.length > 0

  return (
    <div className="gi-page">
      <header className="gi-page-header">
        <div>
          <h1 className="gi-page-title">Single-Character Rotation Optimizer</h1>
          <p className="gi-page-subtitle">
            Maximise target rotation damage across your imported artifacts with
            real GO team buffs and final-stat constraints.
          </p>
        </div>
      </header>

      {!record && (
        <div
          className="panel presets-warn-banner"
          data-testid="missing-good-banner"
        >
          <span className="warn">
            Import your GOOD JSON to evaluate and optimise artifacts.
          </span>
          <Link href="/import">
            <button type="button" className="btn-primary btn-icon">
              <UploadIcon size={15} />
              <span>Import GOOD</span>
            </button>
          </Link>
        </div>
      )}

      {/* 1. SETUP CARD */}
      <section
        className="panel gi-card"
        data-testid="setup-card"
        aria-label="Setup"
      >
        <div className="gi-card-header">
          <div>
            <h2 className="gi-card-title">Setup</h2>
            <p className="gi-card-subtitle">
              Choose a rotation preset, target weapon, and artifact pool
              rules.
            </p>
          </div>
          {activePreset && (
            <div className="preset-detail-actions">
              <Link
                href={`/teams?fork=${encodeURIComponent(activePreset.id)}`}
              >
                <button type="button" className="btn-secondary btn-icon">
                  <GearIcon size={15} />
                  <span>Customize</span>
                </button>
              </Link>
              <button
                type="button"
                className="btn-secondary btn-icon"
                disabled={!canRunPreset}
                onClick={() => void handleExportGO(currentSelection, 'current')}
                title="Export a Genshin Optimizer database with this preset team & Custom Multi-Target pre-loaded"
              >
                <DownloadIcon size={15} />
                <span>Verify GO (.json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Preset Selector & Team Roster */}
        <div className="gi-setup-grid">
          <label className="gi-field-label" style={{ gridColumn: '1 / -1' }}>
            <span className="muted">Rotation Preset</span>
            <select
              aria-label="Preset"
              value={activePreset?.id ?? ''}
              onChange={(e) => {
                setSelectedPresetId(e.target.value)
                setSelectedWeaponId('')
                setOptResult(null)
                setOptimisedEvals([])
              }}
            >
              {allPresets.map((p) => {
                const b = getPresetBadge(p)
                return (
                  <option key={p.id} value={p.id}>
                    [{b.label}] {p.name} (Target: {displayName(p.target)})
                  </option>
                )
              })}
            </select>
          </label>
        </div>

        {activePreset && (
          <div className="preset-gear-row-md preset-provenance-box">
            <span className="muted" style={{ fontSize: '0.84rem' }}>
              Preset Team:
            </span>
            {activePreset.team.map((m, idx) => (
              <CharacterBadge
                key={m.key}
                characterKey={m.key}
                simulated={m.build.type === 'tc' || m.build.type === 'fixed'}
                role={idx === 0 ? 'target' : 'owned'}
                compact
              />
            ))}
          </div>
        )}

        {/* Akasha Artifact-Only Mode Setup vs Owned Target Character & Weapon Check */}
        {activePreset &&
          isAkashaPreset &&
          activePreset.team[0]?.build.type === 'fixed' &&
          akashaWeaponSpec && (
            <div className="preset-akasha-box">
              <div className="preset-akasha-top">
                <strong>
                  Akasha Artifact-Only Mode — Fixed Target &amp; Free Weapon
                  Selector
                </strong>
                <span
                  className="ok"
                  style={{ fontSize: '0.82rem', fontWeight: 600 }}
                >
                  ✓ Fixed Spec: {displayName(activePreset.target)} Lv.
                  {activePreset.team[0].build.character.level} C
                  {activePreset.team[0].build.character.constellation} (Talents{' '}
                  {activePreset.team[0].build.character.talent.auto}/
                  {activePreset.team[0].build.character.talent.skill}/
                  {activePreset.team[0].build.character.talent.burst})
                </span>
              </div>

              <div className="muted preset-akasha-desc">
                Artifact-only mode: fixed character stats &amp; simulated
                weapon; only your imported GOOD artifacts are used.
              </div>

              <div className="preset-akasha-controls">
                <WeaponBadge
                  weaponKey={akashaWeaponSpec.key}
                  subtitle={`R${akashaWeaponSpec.refinement} · Lv.${akashaWeaponSpec.level ?? 90}`}
                />

                <label className="presets-filter-label-sm">
                  <span className="muted">Weapon:</span>
                  <select
                    aria-label="Simulated Weapon"
                    value={akashaWeaponSpec.key}
                    onChange={(e) => {
                      const nextKey = e.target.value
                      const meta = getWeaponMeta(nextKey)
                      const nextRef =
                        meta.rarity <= 2 ? 1 : akashaWeaponSpec.refinement
                      setAkashaWeaponByPreset((prev) => ({
                        ...prev,
                        [activePreset.id]: {
                          key: nextKey,
                          refinement: nextRef,
                        },
                      }))
                      setOptResult(null)
                      setOptimisedEvals([])
                    }}
                  >
                    {availableAkashaWeapons.map((w) => (
                      <option key={w.key} value={w.key}>
                        {w.displayName} {formatRarityStars(w.rarity)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="presets-filter-label-sm">
                  <span className="muted">Refinement:</span>
                  <select
                    aria-label="Weapon Refinement"
                    value={akashaWeaponSpec.refinement}
                    disabled={getWeaponMeta(akashaWeaponSpec.key).rarity <= 2}
                    onChange={(e) => {
                      const nextRef = Number(e.target.value)
                      setAkashaWeaponByPreset((prev) => ({
                        ...prev,
                        [activePreset.id]: {
                          key: akashaWeaponSpec.key,
                          refinement: nextRef,
                        },
                      }))
                      setOptResult(null)
                      setOptimisedEvals([])
                    }}
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
          )}

        {activePreset && !isAkashaPreset && matchReport && (
          <div className="preset-match-box">
            <div className="preset-akasha-top">
              <strong>
                Target Character &amp; Weapon Check:{' '}
                <span className={matchReport.canRun ? 'ok' : 'error'}>
                  {matchReport.canRun
                    ? `Ready (${displayName(activePreset.target)})`
                    : 'Target Character / Weapon Requirements Not Met'}
                </span>
              </strong>
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                Simulated (<code>SIM</code>) preset teammates are fixed and
                never checked against your account.
              </span>
            </div>
            <ul className="preset-match-list preset-match-results">
              {matchReport.parts.map((pt, i) => (
                <li
                  key={i}
                  className={`preset-match-item ${pt.ok ? 'ok' : 'error'}`}
                >
                  {pt.ok ? '✓' : '✕'} {pt.message}
                  {pt.part === 'weapon' &&
                    pt.candidates &&
                    pt.candidates.length > 0 && (
                      <span className="preset-match-candidates">
                        <WeaponBadge
                          weaponKey={pt.candidates[0]!.key}
                          compact
                        />
                        <select
                          aria-label="Qualifying Weapon Copy"
                          value={selectedWeaponId}
                          onChange={(e) => setSelectedWeaponId(e.target.value)}
                        >
                          <option value="">
                            — Select qualifying copy from inventory —
                          </option>
                          {pt.candidates.map((cand) => (
                            <option key={cand.id} value={cand.id}>
                              {displayName(cand.key)} R{cand.refinement} Lv.
                              {cand.level}{' '}
                              {cand.location
                                ? `(on ${displayName(cand.location)})`
                                : '(Inventory)'}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Artifact Pool Settings */}
        <div className="gi-setup-grid">
          <label className="gi-field-label">
            <span className="muted">Main-Stat Assumption Level</span>
            <select
              aria-label="Main-Stat Assumption Level"
              value={settings.mainStatAssumptionLevel}
              onChange={(e) =>
                void updateSettings({
                  ...settings,
                  mainStatAssumptionLevel: Number(e.target.value) as
                    | 0
                    | 4
                    | 8
                    | 12
                    | 16
                    | 20,
                })
              }
            >
              <option value={0}>No Assumption (Actual Level)</option>
              <option value={4}>Assume at least Lv. 4</option>
              <option value={8}>Assume at least Lv. 8</option>
              <option value={12}>Assume at least Lv. 12</option>
              <option value={16}>Assume at least Lv. 16</option>
              <option value={20}>Assume Full Level (Lv. 20)</option>
            </select>
          </label>

          <label className="gi-field-label">
            <span className="muted">Artifact Level Range (Min / Max)</span>
            <div className="preset-gear-row">
              <input
                type="number"
                aria-label="Artifact Level Min"
                min={0}
                max={20}
                value={settings.levelLow}
                onChange={(e) =>
                  void updateSettings({
                    ...settings,
                    levelLow: Math.max(
                      0,
                      Math.min(20, Number(e.target.value))
                    ),
                  })
                }
                style={{ width: '74px' }}
              />
              <span className="muted">to</span>
              <input
                type="number"
                aria-label="Artifact Level Max"
                min={0}
                max={20}
                value={settings.levelHigh}
                onChange={(e) =>
                  void updateSettings({
                    ...settings,
                    levelHigh: Math.max(
                      0,
                      Math.min(20, Number(e.target.value))
                    ),
                  })
                }
                style={{ width: '74px' }}
              />
            </div>
          </label>

          <label className="gi-field-label">
            <span className="muted">Top N Builds to Return</span>
            <select
              aria-label="Top N Builds to Return"
              value={settings.topN}
              onChange={(e) =>
                void updateSettings({
                  ...settings,
                  topN: Number(e.target.value),
                })
              }
            >
              <option value={1}>Top 1 Build</option>
              <option value={3}>Top 3 Builds</option>
              <option value={5}>Top 5 Builds</option>
              <option value={10}>Top 10 Builds</option>
            </select>
          </label>
        </div>

        <div className="presets-filter-bar">
          <label className="presets-filter-label">
            <input
              type="checkbox"
              checked={settings.includeEquippedOnOthers}
              onChange={(e) =>
                void updateSettings({
                  ...settings,
                  includeEquippedOnOthers: e.target.checked,
                })
              }
            />
            <span>Include artifacts equipped on other characters</span>
          </label>

          <label className="presets-filter-label">
            <input
              type="checkbox"
              checked={Boolean(settings.lockedOnly)}
              onChange={(e) =>
                void updateSettings({
                  ...settings,
                  lockedOnly: e.target.checked,
                })
              }
            />
            <span>Use locked artifacts only</span>
          </label>
        </div>

        {/* Protected Characters & Multi-Mode Artifact Set Filter */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="preset-provenance-box">
            <div
              className="muted"
              style={{ fontSize: '0.84rem', marginBottom: '0.4rem' }}
            >
              Protected Characters (keep their equipped artifacts):
            </div>
            <div className="preset-gear-row">
              <select
                aria-label="Protect character"
                value={excludeCharInput}
                onChange={(e) => setExcludeCharInput(e.target.value)}
              >
                <option value="">— Add character to protect —</option>
                {(record?.good.characters ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {displayName(c.key)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                disabled={!excludeCharInput}
                onClick={() => {
                  if (
                    excludeCharInput &&
                    !settings.excludedCharacters.includes(excludeCharInput)
                  ) {
                    void updateSettings({
                      ...settings,
                      excludedCharacters: [
                        ...settings.excludedCharacters,
                        excludeCharInput,
                      ],
                    })
                    setExcludeCharInput('')
                  }
                }}
              >
                Protect
              </button>
            </div>
            {settings.excludedCharacters.length > 0 && (
              <div
                className="preset-gear-row"
                style={{ marginTop: '0.5rem' }}
              >
                {settings.excludedCharacters.map((ck) => (
                  <span
                    key={ck}
                    style={{
                      background: '#232838',
                      border: '1px solid var(--border)',
                      padding: '0.18rem 0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <CharacterBadge characterKey={ck} compact />
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      aria-label={`Unprotect ${displayName(ck)}`}
                      onClick={() =>
                        void updateSettings({
                          ...settings,
                          excludedCharacters:
                            settings.excludedCharacters.filter((x) => x !== ck),
                        })
                      }
                      style={{ padding: '0 0.25rem' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <ArtifactSetFilter
            settings={settings}
            onChange={(next) => void updateSettings(next)}
          />
        </div>
      </section>

      {/* 2. CONSTRAINTS CARD */}
      <ConstraintsCard
        settings={settings}
        onChange={(next) => void updateSettings(next)}
      />

      {/* 3. RESULTS CARD (including Run Action & Progress / Empty States) */}
      <section
        className="panel gi-card"
        data-testid="results-card"
        aria-label="Results"
      >
        <div className="gi-card-header">
          <div className="preset-gear-row-md">
            {activePreset && (
              <CharacterBadge
                characterKey={activePreset.target}
                simulated={isAkashaPreset}
                role="target"
              />
            )}
            <div>
              <h2 className="gi-card-title">Results</h2>
              <p className="gi-card-subtitle">
                {activePreset
                  ? `${activePreset.name} · Rotation Repeat ×${activePreset.rotation.repeat ?? 1}`
                  : 'Compare your current build against top-ranked optimizer builds.'}
              </p>
            </div>
          </div>

          <div className="preset-gear-row-md">
            {evaluating && !running && (
              <Spinner
                label={
                  hydratingEngine
                    ? 'Loading optimizer engine…'
                    : 'Evaluating…'
                }
                size="sm"
                inline
              />
            )}

            {!running ? (
              <button
                type="button"
                className="btn-run-primary btn-icon"
                data-testid="run-optimize-btn"
                disabled={!canRunPreset}
                onClick={() => void startOptimization()}
              >
                <PlayIcon size={16} />
                <span>Optimize</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-run-cancel btn-icon"
                data-testid="cancel-optimize-btn"
                onClick={cancelOptimization}
              >
                <StopIcon size={16} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {running && progress && (
          <div className="preset-provenance-box" data-testid="progress-card">
            <ProgressBar
              tested={progress.tested}
              skipped={progress.skipped}
              total={progress.total}
              label="Optimizing builds…"
            />
          </div>
        )}

        {optResult && !running && (
          <div
            className="preset-provenance-box ok"
            style={{ fontSize: '0.88rem' }}
            data-testid="optimize-summary-banner"
          >
            ✓ Finished in {(optResult.durationMs / 1000).toFixed(2)}s — found{' '}
            {optResult.builds.length} qualifying build(s) (
            {optResult.tested.toLocaleString()} tested,{' '}
            {optResult.skipped.toLocaleString()} pruned).
          </div>
        )}

        {optError && (
          <div className="gi-empty-card gi-empty-card-err" role="alert">
            Error: {optError}
          </div>
        )}

        {evaluating && !hasAnyResults && (
          <ResultsSkeleton
            label={
              hydratingEngine ? 'Loading optimizer engine…' : 'Evaluating…'
            }
          />
        )}

        {optResult && optResult.builds.length === 0 && !running && (
          <div
            className="gi-empty-card gi-empty-card-err"
            data-testid="constraints-unmet-card"
          >
            No build met constraints — constraints could not be met with the
            current artifact pool (relax stat constraints, include equipped
            artifacts, or widen the artifact set filter).
          </div>
        )}

        {isAkashaPreset &&
          !evaluating &&
          !hasCurrentEquippedArtifacts &&
          comparisonOptimizedBuilds.length === 0 &&
          record && (
            <div className="gi-empty-card" data-testid="akasha-no-current-card">
              No artifacts equipped on{' '}
              <strong>{displayName(activePreset!.target)}</strong> — click{' '}
              <strong>Optimize</strong> to search your artifact pool.
            </div>
          )}

        {hasAnyResults && activePreset && (
          <BuildComparisonList
            preset={activePreset}
            currentBuild={
              showCurrentComparison && currentSelection && currentEval
                ? {
                    selection: currentSelection,
                    evaluation: currentEval,
                  }
                : null
            }
            optimizedBuilds={comparisonOptimizedBuilds}
            artifactById={artifactById}
            onExportGO={(sel, label) => void handleExportGO(sel, label)}
          />
        )}
      </section>
    </div>
  )
}

export default function OptimizePage() {
  return (
    <Suspense fallback={<OptimizeLoading />}>
      <OptimizeInner />
    </Suspense>
  )
}
