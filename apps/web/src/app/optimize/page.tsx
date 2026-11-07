'use client'

import OptimizeLoading from './loading'
import { ArtifactSetFilter } from '@/components/ArtifactSetFilter'
import {
  ArtifactBadge,
  ArtifactPieceRow,
  BuildComparisonBars,
  CharacterBadge,
  StatChip,
  WeaponBadge,
} from '@/components/Identifier'
import { ProgressBar, ResultsSkeleton, Spinner } from '@/components/Loading'
import {
  DownloadIcon,
  GearIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
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
  ArtifactSlot,
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
  isPercentStatConstraintKey,
  listBundledPresets,
  listWeaponsForType,
  matchAccount,
  STAT_CONSTRAINT_KEYS,
  type IdentifierSlotKey,
  type Preset,
  type StatConstraint,
  type StatConstraintKey,
} from '@gi/presets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

const DISPLAY_STATS: Array<{
  key: StatConstraintKey
  label: string
  isPercent: boolean
}> = [
  { key: 'hp', label: 'Max HP', isPercent: false },
  { key: 'atk', label: 'ATK', isPercent: false },
  { key: 'def', label: 'DEF', isPercent: false },
  { key: 'eleMas', label: 'Elemental Mastery', isPercent: false },
  { key: 'critRate_', label: 'CRIT Rate', isPercent: true },
  { key: 'critDMG_', label: 'CRIT DMG', isPercent: true },
  { key: 'enerRech_', label: 'Energy Recharge', isPercent: true },
  { key: 'heal_', label: 'Healing Bonus', isPercent: true },
  { key: 'pyro_dmg_', label: 'Pyro DMG Bonus', isPercent: true },
  { key: 'hydro_dmg_', label: 'Hydro DMG Bonus', isPercent: true },
  { key: 'electro_dmg_', label: 'Electro DMG Bonus', isPercent: true },
  { key: 'cryo_dmg_', label: 'Cryo DMG Bonus', isPercent: true },
  { key: 'anemo_dmg_', label: 'Anemo DMG Bonus', isPercent: true },
  { key: 'geo_dmg_', label: 'Geo DMG Bonus', isPercent: true },
  { key: 'dendro_dmg_', label: 'Dendro DMG Bonus', isPercent: true },
  { key: 'physical_dmg_', label: 'Physical DMG Bonus', isPercent: true },
]

function formatNum(n: number): string {
  return Math.round(n).toLocaleString()
}

function formatStat(val: number | undefined, isPercent: boolean): string {
  if (val === undefined || Number.isNaN(val)) return '—'
  if (isPercent) return `${(val * 100).toFixed(1)}%`
  return Math.round(val).toLocaleString()
}

function formatDiff(
  curr: number,
  opt: number,
  isPercentStat = false
): { text: string; cls: string } {
  const diff = opt - curr
  if (Math.abs(diff) < 1e-4) return { text: '0', cls: 'muted' }
  const sign = diff > 0 ? '+' : ''
  if (isPercentStat) {
    return {
      text: `${sign}${(diff * 100).toFixed(1)}%`,
      cls: diff > 0 ? 'ok' : 'error',
    }
  }
  const pct = curr > 0 ? ` (${sign}${((diff / curr) * 100).toFixed(2)}%)` : ''
  return {
    text: `${sign}${Math.round(diff).toLocaleString()}${pct}`,
    cls: diff > 0 ? 'ok' : 'error',
  }
}

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
  const [selectedBuildIdx, setSelectedBuildIdx] = useState(0)
  const [optError, setOptError] = useState<string | null>(null)

  const [currentSelection, setCurrentSelection] =
    useState<BuildSelection | null>(null)
  const [currentEval, setCurrentEval] = useState<RotationResult | null>(null)
  const [optimisedEval, setOptimisedEval] = useState<RotationResult | null>(
    null
  )
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
    return {
      key: defaultW.key,
      level: defaultW.level,
      ascension: defaultW.ascension,
      refinement: defaultW.refinement,
    }
  }, [activePreset, akashaWeaponByPreset])

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

  const activeOptBuild = optResult?.builds[selectedBuildIdx] ?? null

  // Off-main-thread evaluation of selected Optimised Build via the shared worker session
  useEffect(() => {
    let cancelled = false
    if (!record?.good || !activePreset || !activeOptBuild) {
      void Promise.resolve().then(() => {
        if (!cancelled) setOptimisedEval(null)
      })
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      setEvaluating(true)
      try {
        const res = await evaluatePresetInWorker({
          datasetKey: record.importedAt,
          good: record.good,
          preset: activePreset,
          selection: isAkashaPreset
            ? { ...activeOptBuild, weaponOverride: akashaWeaponSpec }
            : activeOptBuild,
        })
        if (!cancelled) {
          setOptimisedEval(res.result)
        }
      } catch {
        if (!cancelled) {
          setOptimisedEval(null)
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
  }, [record, activePreset, activeOptBuild, isAkashaPreset, akashaWeaponSpec])

  async function startOptimization() {
    if (!record?.good || !activePreset || !canRunPreset) return
    setRunning(true)
    setOptError(null)
    setOptResult(null)
    setSelectedBuildIdx(0)
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

  function renderArtifactCell(id: string | undefined) {
    if (!id) return <span className="muted">None</span>
    const a = artifactById.get(id)
    if (!a) return <code>{id}</code>

    return (
      <ArtifactPieceRow
        setKey={a.setKey}
        slotKey={a.slotKey as IdentifierSlotKey}
        rarity={a.rarity}
        level={a.level}
        mainStatKey={a.mainStatKey}
        substats={a.substats}
        location={a.location}
        lock={a.lock}
        compact
      />
    )
  }

  if (goodLoading || presetsLoading || settingsLoading) {
    return <OptimizeLoading />
  }

  const showCurrentComparison = Boolean(
    currentEval && (!isAkashaPreset || hasCurrentEquippedArtifacts)
  )
  const primaryEval = showCurrentComparison ? currentEval : optimisedEval

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ margin: 0 }}>Single-Character Rotation Optimizer</h1>
        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
          Maximise target rotation damage across your imported artifacts (ER excluded from objective; use ER floor below).
        </p>
      </div>

      {!record && (
        <div
          className="panel"
          style={{
            borderColor: 'var(--warn)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span className="warn">
            Import your GOOD JSON to evaluate and optimise artifacts.
          </span>
          <Link href="/import">
            <button type="button" className="btn-icon">
              <UploadIcon size={15} />
              <span>Import GOOD</span>
            </button>
          </Link>
        </div>
      )}

      {/* Preset Selection & Setup / Compatibility Gate */}
      <div
        className="panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: 1,
            }}
          >
            <strong>Preset:</strong>
            <select
              value={activePreset?.id ?? ''}
              onChange={(e) => {
                setSelectedPresetId(e.target.value)
                setSelectedWeaponId('')
                setOptResult(null)
              }}
              style={{ minWidth: '320px', flex: 1 }}
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

          {activePreset && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                href={`/teams?fork=${encodeURIComponent(activePreset.id)}`}
              >
                <button type="button" className="btn-icon">
                  <GearIcon size={15} />
                  <span>Customize</span>
                </button>
              </Link>
              <button
                type="button"
                className="btn-icon"
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

        {/* Team Roster Visual Summary */}
        {activePreset && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              background: '#151821',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
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
            <div
              style={{
                background: '#151821',
                border: '1px solid var(--accent)',
                borderRadius: '6px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
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
                  Selector
                </strong>
                <span className="ok" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  ✓ Fixed Spec: {displayName(activePreset.target)} Lv.
                  {activePreset.team[0].build.character.level} C
                  {activePreset.team[0].build.character.constellation} (Talents{' '}
                  {activePreset.team[0].build.character.talent.auto}/
                  {activePreset.team[0].build.character.talent.skill}/
                  {activePreset.team[0].build.character.talent.burst})
                </span>
              </div>

              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Artifact-only mode: fixed character stats &amp; simulated weapon; only your imported GOOD artifacts are used.
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
                  weaponKey={akashaWeaponSpec.key}
                  subtitle={`R${akashaWeaponSpec.refinement} · Lv.${akashaWeaponSpec.level ?? 90}`}
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.88rem',
                  }}
                >
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
                    }}
                  >
                    {availableAkashaWeapons.map((w) => (
                      <option key={w.key} value={w.key}>
                        {w.displayName} {formatRarityStars(w.rarity)}
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
          <div
            style={{
              background: '#151821',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.75rem',
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
            <ul
              style={{
                margin: '0.4rem 0 0',
                paddingLeft: '1.25rem',
                fontSize: '0.9rem',
              }}
            >
              {matchReport.parts.map((pt, i) => (
                <li key={i} className={pt.ok ? 'ok' : 'error'}>
                  {pt.ok ? '✓' : '✕'} {pt.message}
                  {pt.part === 'weapon' &&
                    pt.candidates &&
                    pt.candidates.length > 0 && (
                      <span
                        style={{
                          marginLeft: '0.6rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <WeaponBadge
                          weaponKey={pt.candidates[0]!.key}
                          compact
                        />
                        <select
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
      </div>

      {/* GO-Style Optimizer Settings Panel */}
      <div
        className="panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
      >
        <strong>
          Optimizer Constraints &amp; Pool Settings (GO-Style User Settings)
        </strong>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
          }}
        >
          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Minimum Energy Recharge Floor (%)
            </span>
            <input
              type="number"
              min={100}
              max={400}
              step={5}
              placeholder="No ER constraint (e.g. 160)"
              value={
                settings.erFloor
                  ? Math.round(
                      settings.erFloor > 10
                        ? settings.erFloor
                        : settings.erFloor * 100
                    )
                  : ''
              }
              onChange={(e) => {
                const raw = e.target.value.trim()
                const num = raw ? Number(raw) : undefined
                void updateSettings({
                  ...settings,
                  erFloor: num && num > 0 ? num / 100 : undefined,
                })
              }}
            />
          </label>

          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Main-Stat Assumption Level
            </span>
            <select
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

          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Artifact Level Range (Min / Max)
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="number"
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
                style={{ width: '70px' }}
              />
              <span>to</span>
              <input
                type="number"
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
                style={{ width: '70px' }}
              />
            </div>
          </label>

          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Top N Builds to Return
            </span>
            <select
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

        {/* Stat Constraints Editor */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.65rem 0.75rem',
            background: '#151821',
            borderRadius: '6px',
            border: '1px solid var(--border)',
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
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Final Stat Constraints (Min / Max)
            </span>
            <button
              type="button"
              onClick={() => {
                const existing = settings.constraints ?? []
                const used = new Set(existing.map((c) => c.stat))
                const nextStat: StatConstraintKey =
                  STAT_CONSTRAINT_KEYS.find((k) => !used.has(k)) ?? 'critRate_'
                const nextEntry: StatConstraint = { stat: nextStat }
                void updateSettings({
                  ...settings,
                  constraints: [...existing, nextEntry],
                })
              }}
              style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem' }}
            >
              + Add Constraint
            </button>
          </div>

          {(settings.constraints ?? []).length === 0 ? (
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              No final-stat constraints added. Click &ldquo;+ Add Constraint&rdquo; to bound HP, ATK, DEF, EM, CRIT, ER, Healing Bonus, or Elemental DMG%.
            </span>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              {(settings.constraints ?? []).map((constraint, idx) => {
                const isPct = isPercentStatConstraintKey(constraint.stat)
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <select
                      aria-label={`Constraint ${idx + 1} Stat`}
                      value={constraint.stat}
                      onChange={(e) => {
                        const nextList = [...(settings.constraints ?? [])]
                        nextList[idx] = {
                          ...constraint,
                          stat: e.target.value as StatConstraintKey,
                        }
                        void updateSettings({
                          ...settings,
                          constraints: nextList,
                        })
                      }}
                      style={{ minWidth: '180px' }}
                    >
                      {DISPLAY_STATS.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label} {st.isPercent ? '(%)' : ''}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      aria-label={`Constraint ${idx + 1} Min`}
                      step={isPct ? 1 : 10}
                      placeholder={isPct ? 'Min (%)' : 'Min'}
                      value={
                        typeof constraint.min === 'number' &&
                        Number.isFinite(constraint.min)
                          ? constraint.min
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        const num = raw !== '' ? Number(raw) : undefined
                        const nextList = [...(settings.constraints ?? [])]
                        const updated: StatConstraint = {
                          ...constraint,
                          min:
                            num !== undefined && Number.isFinite(num)
                              ? num
                              : undefined,
                        }
                        if (updated.min === undefined) delete updated.min
                        nextList[idx] = updated
                        void updateSettings({
                          ...settings,
                          constraints: nextList,
                        })
                      }}
                      style={{ width: '120px' }}
                    />

                    <input
                      type="number"
                      aria-label={`Constraint ${idx + 1} Max`}
                      step={isPct ? 1 : 10}
                      placeholder={isPct ? 'Max (%)' : 'Max'}
                      value={
                        typeof constraint.max === 'number' &&
                        Number.isFinite(constraint.max)
                          ? constraint.max
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        const num = raw !== '' ? Number(raw) : undefined
                        const nextList = [...(settings.constraints ?? [])]
                        const updated: StatConstraint = {
                          ...constraint,
                          max:
                            num !== undefined && Number.isFinite(num)
                              ? num
                              : undefined,
                        }
                        if (updated.max === undefined) delete updated.max
                        nextList[idx] = updated
                        void updateSettings({
                          ...settings,
                          constraints: nextList,
                        })
                      }}
                      style={{ width: '120px' }}
                    />

                    <button
                      type="button"
                      className="btn-icon"
                      aria-label={`Remove Constraint ${idx + 1}`}
                      onClick={() => {
                        const nextList = (settings.constraints ?? []).filter(
                          (_, i) => i !== idx
                        )
                        void updateSettings({
                          ...settings,
                          constraints: nextList,
                        })
                      }}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <TrashIcon size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            alignItems: 'center',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <div
              className="muted"
              style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}
            >
              Protected Characters (do not take their equipped artifacts):
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <select
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
                Exclude
              </button>
            </div>
            {settings.excludedCharacters.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  flexWrap: 'wrap',
                  marginTop: '0.4rem',
                }}
              >
                {settings.excludedCharacters.map((ck) => (
                  <span
                    key={ck}
                    style={{
                      background: '#252a3a',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <CharacterBadge characterKey={ck} compact />
                    <button
                      type="button"
                      onClick={() =>
                        void updateSettings({
                          ...settings,
                          excludedCharacters:
                            settings.excludedCharacters.filter((x) => x !== ck),
                        })
                      }
                      style={{
                        padding: '0 0.25rem',
                        border: 'none',
                        background: 'transparent',
                      }}
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

        {/* Action Row & Real Optimization Progress Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {!running ? (
              <button
                type="button"
                className="btn-icon"
                disabled={!canRunPreset}
                onClick={() => void startOptimization()}
                style={{
                  background: 'var(--accent)',
                  color: '#0b0d12',
                  fontWeight: 700,
                  padding: '0.55rem 1.25rem',
                }}
              >
                <PlayIcon size={16} />
                <span>Optimize</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-icon"
                onClick={cancelOptimization}
                style={{
                  background: 'var(--err)',
                  color: '#0b0d12',
                  fontWeight: 700,
                  padding: '0.55rem 1.25rem',
                }}
              >
                <StopIcon size={16} />
                <span>Cancel</span>
              </button>
            )}

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

            {optResult && !running && (
              <span className="ok" style={{ fontSize: '0.9rem' }}>
                ✓ Finished in {(optResult.durationMs / 1000).toFixed(2)}s —
                found {optResult.builds.length} qualifying build(s) (
                {optResult.tested.toLocaleString()} tested,{' '}
                {optResult.skipped.toLocaleString()} pruned).
              </span>
            )}
          </div>

          {running && progress && (
            <ProgressBar
              tested={progress.tested}
              skipped={progress.skipped}
              total={progress.total}
              label="Optimizing builds…"
            />
          )}
        </div>

        {optError && <div className="error">Error: {optError}</div>}
      </div>

      {/* Results & Current vs Optimised Comparison */}
      {evaluating && !primaryEval && (
        <ResultsSkeleton
          label={
            hydratingEngine ? 'Loading optimizer engine…' : 'Evaluating…'
          }
        />
      )}

      {isAkashaPreset &&
        !evaluating &&
        !hasCurrentEquippedArtifacts &&
        !optimisedEval &&
        record && (
          <div
            className="panel"
            style={{
              borderColor: 'var(--accent)',
              background: 'rgba(122, 162, 255, 0.06)',
            }}
          >
            <span className="muted">
              No artifacts equipped on{' '}
              <strong>{displayName(activePreset!.target)}</strong> — click{' '}
              <strong>Optimize</strong> to search your artifact pool.
            </span>
          </div>
        )}

      {optResult && optResult.builds.length === 0 && !running && (
        <div className="panel" style={{ borderColor: 'var(--err)' }}>
          <span className="error">
            No build met constraints — constraints could not be met with the current artifact pool (relax stat constraints or ER floor, include equipped artifacts, or widen set filter).
          </span>
        </div>
      )}

      {primaryEval && activePreset && (
        <div
          className="panel"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                <CharacterBadge
                  characterKey={activePreset.target}
                  simulated={isAkashaPreset}
                  role="target"
                />
                <h2 style={{ margin: 0 }}>
                  {showCurrentComparison && optimisedEval
                    ? 'Current Build vs. Optimised Build Comparison'
                    : showCurrentComparison
                      ? 'Current Equipped Build Rotation Breakdown'
                      : 'Optimised Build Rotation Breakdown (No Current Build Equipped)'}
                </h2>
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                Preset: <strong>{activePreset.name}</strong> · Rotation Repeat ×
                {activePreset.rotation.repeat ?? 1}
              </div>
            </div>

            {optResult && optResult.builds.length > 0 && (
              <div
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <span className="muted">Rank:</span>
                <select
                  value={selectedBuildIdx}
                  onChange={(e) => setSelectedBuildIdx(Number(e.target.value))}
                >
                  {optResult.builds.map((b, i) => (
                    <option key={i} value={i}>
                      #{i + 1} — {formatNum(b.total)} Total Rotation DMG
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() =>
                    void handleExportGO(
                      activeOptBuild,
                      `opt-rank-${selectedBuildIdx + 1}`
                    )
                  }
                >
                  <DownloadIcon size={15} />
                  <span>Verify GO (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* Proportional Horizontal Build Comparison Bars */}
          <BuildComparisonBars
            currentTotal={showCurrentComparison ? currentEval?.total : undefined}
            optimisedTotal={optimisedEval?.total}
            rank={selectedBuildIdx + 1}
          />

          {/* Per-Instance Rotation Damage Table */}
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>
              Per-Instance Rotation Breakdown
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Damage Instance</th>
                  <th>Hits</th>
                  {showCurrentComparison && (
                    <>
                      <th>Current Per-Hit</th>
                      <th>Current Subtotal</th>
                    </>
                  )}
                  {optimisedEval && (
                    <>
                      <th>Optimised Per-Hit</th>
                      <th>Optimised Subtotal</th>
                      {showCurrentComparison && <th>Difference</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {primaryEval.instances.map((inst, idx) => {
                  const optInst = optimisedEval?.instances[idx]
                  const diff =
                    showCurrentComparison && currentEval && optInst
                      ? formatDiff(
                          currentEval.instances[idx]!.subtotal,
                          optInst.subtotal
                        )
                      : null
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{inst.label}</strong>
                      </td>
                      <td>×{inst.count}</td>
                      {showCurrentComparison && currentEval && (
                        <>
                          <td>{formatNum(currentEval.instances[idx]!.perHit)}</td>
                          <td>
                            {formatNum(currentEval.instances[idx]!.subtotal)}
                          </td>
                        </>
                      )}
                      {optInst && (
                        <>
                          <td>{formatNum(optInst.perHit)}</td>
                          <td>
                            <strong>{formatNum(optInst.subtotal)}</strong>
                          </td>
                          {showCurrentComparison && diff && (
                            <td className={diff.cls}>{diff.text}</td>
                          )}
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Artifact Slot Comparison */}
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>
              Artifact Loadout {showCurrentComparison ? 'Comparison (Slot by Slot)' : '(Optimised Build)'}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  {showCurrentComparison && <th>Current Equipped Artifact</th>}
                  {activeOptBuild && (
                    <>
                      <th>Optimised Artifact</th>
                      {showCurrentComparison && <th>Status</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => {
                  const currId = currentSelection?.artifactIds[slot]
                  const optId = activeOptBuild?.artifactIds[slot]
                  const changed = activeOptBuild && currId !== optId
                  const currArt = currId ? artifactById.get(currId) : undefined
                  const optArt = optId ? artifactById.get(optId) : undefined
                  const refSetKey =
                    optArt?.setKey ?? currArt?.setKey ?? 'GoldenTroupe'

                  return (
                    <tr key={slot}>
                      <td>
                        <ArtifactBadge
                          setKey={refSetKey}
                          slotKey={slot}
                          slotOnly
                          compact
                        />
                      </td>
                      {showCurrentComparison && (
                        <td style={{ fontSize: '0.88rem' }}>
                          {renderArtifactCell(currId)}
                        </td>
                      )}
                      {activeOptBuild && (
                        <>
                          <td style={{ fontSize: '0.88rem' }}>
                            {renderArtifactCell(optId)}
                          </td>
                          {showCurrentComparison && (
                            <td className={changed ? 'warn' : 'muted'}>
                              {changed ? 'Swapped' : 'Kept'}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Final Stats Comparison */}
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>Final Character Stats</h3>
            <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  {showCurrentComparison && <th>Current Build</th>}
                  {optimisedEval && (
                    <>
                      <th>Optimised Build</th>
                      {showCurrentComparison && <th>Delta</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {DISPLAY_STATS.filter((st) => {
                  const cVal = currentEval?.stats[st.key] ?? 0
                  const oVal = optimisedEval?.stats[st.key] ?? 0
                  if (
                    (st.key.endsWith('_dmg_') || st.key === 'heal_') &&
                    cVal === 0 &&
                    oVal === 0
                  )
                    return false
                  return true
                }).map((st) => {
                  const cVal = currentEval?.stats[st.key] ?? 0
                  const oVal = optimisedEval?.stats[st.key] ?? 0
                  const diff =
                    showCurrentComparison && currentEval && optimisedEval
                      ? formatDiff(cVal, oVal, st.isPercent)
                      : null
                  return (
                    <tr key={st.key}>
                      <td>
                        <StatChip statKey={st.key} showLabel />
                      </td>
                      {showCurrentComparison && currentEval && (
                        <td>{formatStat(cVal, st.isPercent)}</td>
                      )}
                      {optimisedEval && (
                        <>
                          <td>
                            <strong>{formatStat(oVal, st.isPercent)}</strong>
                          </td>
                          {showCurrentComparison && diff && (
                            <td className={diff.cls}>{diff.text}</td>
                          )}
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
