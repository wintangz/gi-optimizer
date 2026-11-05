'use client'

import {
  ArtifactBadge,
  CharacterBadge,
  WeaponBadge,
} from '@/components/Identifier'
import {
  cancelOptimizationInWorker,
  evaluatePresetInWorker,
  exportGODatabaseInWorker,
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
} from '@gi/engine'
import { humanizeKey, type IArtifact } from '@gi/good'
import {
  ALL_ARTIFACT_SET_KEYS,
  displayName,
  getPresetBadge,
  listBundledPresets,
  matchAccount,
  type IdentifierSlotKey,
  type Preset,
} from '@gi/presets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

const SLOTS: ArtifactSlot[] = ['flower', 'plume', 'sands', 'goblet', 'circlet']

const DISPLAY_STATS: Array<{ key: string; label: string; isPercent: boolean }> =
  [
    { key: 'hp', label: 'Max HP', isPercent: false },
    { key: 'atk', label: 'ATK', isPercent: false },
    { key: 'def', label: 'DEF', isPercent: false },
    { key: 'eleMas', label: 'Elemental Mastery', isPercent: false },
    { key: 'critRate_', label: 'CRIT Rate', isPercent: true },
    { key: 'critDMG_', label: 'CRIT DMG', isPercent: true },
    { key: 'enerRech_', label: 'Energy Recharge', isPercent: true },
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

  const { record } = useGoodStorage()
  const { presets: userPresets } = useUserPresets()
  const { settings, update: updateSettings } = useOptimizerSettings()

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
  const [excludeCharInput, setExcludeCharInput] = useState<string>('')
  const [excludeSetInput, setExcludeSetInput] = useState<string>('')

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

  useEffect(() => {
    if (presetParam) setSelectedPresetId(presetParam)
    if (weaponParam) setSelectedWeaponId(weaponParam)
  }, [presetParam, weaponParam])

  const activePreset: Preset | undefined = useMemo(
    () =>
      allPresets.find((p) => p.id === selectedPresetId) ?? allPresets[0],
    [allPresets, selectedPresetId]
  )

  const matchReport = useMemo(() => {
    if (!activePreset || !record?.good) return null
    return matchAccount(activePreset, record.good, {
      selectedWeaponId: selectedWeaponId || undefined,
    })
  }, [activePreset, record, selectedWeaponId])

  const effectiveWeaponId =
    selectedWeaponId || matchReport?.selectedWeaponId || undefined

  const artifactById = useMemo(() => {
    const map = new Map<string, IArtifact>()
    if (!record?.good) return map
    for (const a of record.good.artifacts) {
      map.set(a.id, a)
    }
    return map
  }, [record])

  // Off-main-thread evaluation of Current Build via the shared worker session
  useEffect(() => {
    let cancelled = false
    if (!record?.good || !activePreset) {
      setCurrentSelection(null)
      setCurrentEval(null)
      return
    }
    if (matchReport && !matchReport.canRun) {
      setCurrentSelection(null)
      setCurrentEval(null)
      return
    }

    setEvaluating(true)
    const selectionOverride: BuildSelection | undefined = effectiveWeaponId
      ? { weaponId: effectiveWeaponId, artifactIds: {} }
      : undefined

    void (async () => {
      try {
        // First get currentBuild and evaluate with equipped artifacts (and effectiveWeaponId if overridden)
        const baseRes = await evaluatePresetInWorker({
          datasetKey: record.importedAt,
          good: record.good,
          preset: activePreset,
        })
        if (cancelled) return

        const effectiveCurrent: BuildSelection = {
          weaponId: effectiveWeaponId ?? baseRes.currentBuild.weaponId,
          artifactIds: baseRes.currentBuild.artifactIds,
        }
        setCurrentSelection(effectiveCurrent)

        if (
          selectionOverride &&
          effectiveWeaponId !== baseRes.currentBuild.weaponId
        ) {
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
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [record, activePreset, effectiveWeaponId, matchReport])

  const activeOptBuild = optResult?.builds[selectedBuildIdx] ?? null

  // Off-main-thread evaluation of selected Optimised Build via the shared worker session
  useEffect(() => {
    let cancelled = false
    if (!record?.good || !activePreset || !activeOptBuild) {
      setOptimisedEval(null)
      return
    }

    void (async () => {
      try {
        const res = await evaluatePresetInWorker({
          datasetKey: record.importedAt,
          good: record.good,
          preset: activePreset,
          selection: activeOptBuild,
        })
        if (!cancelled) {
          setOptimisedEval(res.result)
        }
      } catch {
        if (!cancelled) {
          setOptimisedEval(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [record, activePreset, activeOptBuild])

  async function startOptimization() {
    if (!record?.good || !activePreset) return
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
    const exported = await exportGODatabaseInWorker({
      datasetKey: record.importedAt,
      good: record.good,
      preset: activePreset,
      selection: selection ?? undefined,
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
    const subs = a.substats
      .filter((s) => s.key)
      .map(
        (s) =>
          `${humanizeKey(s.key)} ${s.value}${s.key.endsWith('_') ? '%' : ''}`
      )
      .join(', ')

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.45rem',
        }}
      >
        <ArtifactBadge
          setKey={a.setKey}
          slotKey={a.slotKey as IdentifierSlotKey}
          rarity={a.rarity}
          compact
          subtitle={`+${a.level} (${humanizeKey(a.mainStatKey)}) — ${subs}`}
        />
        {a.location && (
          <CharacterBadge
            characterKey={a.location}
            compact
            subtitle="(equipped)"
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ margin: 0 }}>Single-Character Rotation Optimizer</h1>
        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
          Search your imported artifacts for the build that maximises your
          target character&apos;s total damage over the preset rotation (GO
          formula engine). Energy Recharge is never weighted in the objective —
          use the ER Floor constraint below if needed.
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
            Import your GOOD JSON on the Import page to check whether your
            target character and weapon satisfy this preset and run the
            optimizer.
          </span>
          <Link href="/import">
            <button type="button">Import GOOD File →</button>
          </Link>
        </div>
      )}

      {/* Preset Selection & Compatibility Gate */}
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
                <button type="button">Customize Preset / Team</button>
              </Link>
              <button
                type="button"
                disabled={
                  !record || Boolean(matchReport && !matchReport.canRun)
                }
                onClick={() => void handleExportGO(currentSelection, 'current')}
                title="Export a Genshin Optimizer database with this preset team & Custom Multi-Target pre-loaded"
              >
                Verify Current in GO (.json)
              </button>
            </div>
          )}
        </div>

        {/* Team Roster Visual Summary (Target vs Simulated Teammates) */}
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
                simulated={m.build.type === 'tc'}
                role={idx === 0 ? 'target' : 'owned'}
                compact
              />
            ))}
          </div>
        )}

        {activePreset && matchReport && (
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

        {/* Excluded Characters & Excluded Sets */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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

          <div>
            <div
              className="muted"
              style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}
            >
              Excluded Artifact Sets (2p &amp; 4p):
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <select
                value={excludeSetInput}
                onChange={(e) => setExcludeSetInput(e.target.value)}
              >
                <option value="">— Exclude an artifact set —</option>
                {ALL_ARTIFACT_SET_KEYS.map((sk) => (
                  <option key={sk} value={sk}>
                    {displayName(sk)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!excludeSetInput}
                onClick={() => {
                  if (!excludeSetInput) return
                  const next = {
                    ...(settings.setExclusion ?? {}),
                    [excludeSetInput]: [2, 4] as (2 | 4)[],
                  }
                  void updateSettings({ ...settings, setExclusion: next })
                  setExcludeSetInput('')
                }}
              >
                Exclude Set
              </button>
            </div>
            {Object.keys(settings.setExclusion ?? {}).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  flexWrap: 'wrap',
                  marginTop: '0.4rem',
                }}
              >
                {Object.keys(settings.setExclusion ?? {}).map((sk) => (
                  <span
                    key={sk}
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
                    <ArtifactBadge setKey={sk} compact />
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...(settings.setExclusion ?? {}) }
                        delete next[sk]
                        void updateSettings({ ...settings, setExclusion: next })
                      }}
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
        </div>

        {/* Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          {!running ? (
            <button
              type="button"
              disabled={!record || Boolean(matchReport && !matchReport.canRun)}
              onClick={() => void startOptimization()}
              style={{
                background: 'var(--accent)',
                color: '#0b0d12',
                fontWeight: 700,
                padding: '0.55rem 1.25rem',
              }}
            >
              Run Rotation Optimizer
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelOptimization}
              style={{
                background: 'var(--err)',
                color: '#0b0d12',
                fontWeight: 700,
                padding: '0.55rem 1.25rem',
              }}
            >
              Cancel Optimization
            </button>
          )}

          {evaluating && !running && (
            <span className="muted" style={{ fontSize: '0.88rem' }}>
              Evaluating rotation in background worker…
            </span>
          )}

          {progress && (
            <div style={{ fontSize: '0.9rem' }}>
              <span className="muted">Progress:</span>{' '}
              <strong>
                {(progress.tested + progress.skipped).toLocaleString()}
              </strong>{' '}
              / {progress.total.toLocaleString()} builds processed (Tested:{' '}
              {progress.tested.toLocaleString()} · Pruned:{' '}
              {progress.skipped.toLocaleString()})
            </div>
          )}

          {optResult && !running && (
            <span className="ok" style={{ fontSize: '0.9rem' }}>
              ✓ Finished in {(optResult.durationMs / 1000).toFixed(2)}s — found{' '}
              {optResult.builds.length} qualifying build(s).
            </span>
          )}
        </div>

        {optError && <div className="error">Error: {optError}</div>}
      </div>

      {/* Results & Current vs Optimised Comparison */}
      {optResult && optResult.builds.length === 0 && !running && (
        <div className="panel" style={{ borderColor: 'var(--err)' }}>
          <strong className="error">
            No artifact combination satisfied your constraints.
          </strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Try lowering the Minimum Energy Recharge floor, enabling artifacts
            equipped on other characters, or widening the artifact level range.
          </p>
        </div>
      )}

      {currentEval && activePreset && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <CharacterBadge characterKey={activePreset.target} role="target" />
                <h2 style={{ margin: 0 }}>
                  {optimisedEval
                    ? 'Current Build vs. Optimised Build Comparison'
                    : 'Current Equipped Build Rotation Breakdown'}
                </h2>
              </div>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                Preset: <strong>{activePreset.name}</strong> · Rotation Repeat ×
                {activePreset.rotation.repeat ?? 1}
              </div>
            </div>

            {optResult && optResult.builds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  onClick={() =>
                    void handleExportGO(
                      activeOptBuild,
                      `opt-rank-${selectedBuildIdx + 1}`
                    )
                  }
                >
                  Verify Optimised in GO (.json)
                </button>
              </div>
            )}
          </div>

          {/* Total Rotation Summary Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                background: '#151821',
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            >
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Current Build Rotation Total
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatNum(currentEval.total)}
              </div>
            </div>

            {optimisedEval && (
              <>
                <div
                  style={{
                    background: '#151821',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Optimised Build Rotation Total (#{selectedBuildIdx + 1})
                  </div>
                  <div
                    className="ok"
                    style={{ fontSize: '1.5rem', fontWeight: 700 }}
                  >
                    {formatNum(optimisedEval.total)}
                  </div>
                </div>

                <div
                  style={{
                    background: '#151821',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Rotation Damage Difference
                  </div>
                  {(() => {
                    const d = formatDiff(currentEval.total, optimisedEval.total)
                    return (
                      <div
                        className={d.cls}
                        style={{ fontSize: '1.5rem', fontWeight: 700 }}
                      >
                        {d.text}
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>

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
                  <th>Current Per-Hit</th>
                  <th>Current Subtotal</th>
                  {optimisedEval && (
                    <>
                      <th>Optimised Per-Hit</th>
                      <th>Optimised Subtotal</th>
                      <th>Difference</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentEval.instances.map((inst, idx) => {
                  const optInst = optimisedEval?.instances[idx]
                  const diff = optInst
                    ? formatDiff(inst.subtotal, optInst.subtotal)
                    : null
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{inst.label}</strong>
                      </td>
                      <td>×{inst.count}</td>
                      <td>{formatNum(inst.perHit)}</td>
                      <td>{formatNum(inst.subtotal)}</td>
                      {optInst && diff && (
                        <>
                          <td>{formatNum(optInst.perHit)}</td>
                          <td>
                            <strong>{formatNum(optInst.subtotal)}</strong>
                          </td>
                          <td className={diff.cls}>{diff.text}</td>
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
              Artifact Loadout Comparison (Slot by Slot)
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Current Equipped Artifact</th>
                  {activeOptBuild && (
                    <>
                      <th>Optimised Artifact</th>
                      <th>Status</th>
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
                      <td style={{ fontSize: '0.88rem' }}>
                        {renderArtifactCell(currId)}
                      </td>
                      {activeOptBuild && (
                        <>
                          <td style={{ fontSize: '0.88rem' }}>
                            {renderArtifactCell(optId)}
                          </td>
                          <td className={changed ? 'warn' : 'muted'}>
                            {changed ? 'Swapped' : 'Kept'}
                          </td>
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
                  <th>Current Build</th>
                  {optimisedEval && (
                    <>
                      <th>Optimised Build</th>
                      <th>Delta</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {DISPLAY_STATS.filter((st) => {
                  const cVal = currentEval.stats[st.key] ?? 0
                  const oVal = optimisedEval?.stats[st.key] ?? 0
                  if (st.key.endsWith('_dmg_') && cVal === 0 && oVal === 0)
                    return false
                  return true
                }).map((st) => {
                  const cVal = currentEval.stats[st.key] ?? 0
                  const oVal = optimisedEval?.stats[st.key] ?? 0
                  const diff = optimisedEval
                    ? formatDiff(cVal, oVal, st.isPercent)
                    : null
                  return (
                    <tr key={st.key}>
                      <td>{st.label}</td>
                      <td>{formatStat(cVal, st.isPercent)}</td>
                      {optimisedEval && diff && (
                        <>
                          <td>
                            <strong>{formatStat(oVal, st.isPercent)}</strong>
                          </td>
                          <td className={diff.cls}>{diff.text}</td>
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
    <Suspense fallback={<div className="panel muted">Loading optimizer…</div>}>
      <OptimizeInner />
    </Suspense>
  )
}
