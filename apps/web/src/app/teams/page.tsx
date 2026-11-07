'use client'

import TeamsLoading from './loading'
import {
  ArtifactBadge,
  CharacterBadge,
  ElementBadge,
  WeaponBadge,
} from '@/components/Identifier'
import { SkeletonBlock, Spinner } from '@/components/Loading'
import {
  CopyIcon,
  DownloadIcon,
  PlayIcon,
  TrashIcon,
  UploadIcon,
  type GiElementWithPhyKey,
} from '@/components/SvgIcons'
import {
  evaluatePresetInWorker,
  getCatalogInWorker,
  isEngineSessionHydrated,
} from '@/lib/engine/workerClient'
import { useGoodStorage, useUserPresets } from '@/lib/storage/useGood'
import type {
  ConditionalDescriptor,
  RotationResult,
  TargetDescriptor,
} from '@gi/engine'
import { humanizeKey } from '@gi/good'
import {
  ALL_ARTIFACT_SET_KEYS,
  ALL_CHARACTER_KEYS,
  ALL_WEAPON_KEYS,
  createBlankUserPreset,
  createDefaultTcTeammate,
  DEFAULT_TC_TEAMMATE_CONDITIONAL,
  defaultTcBuildForCharacter,
  displayName,
  forkPresetToUser,
  formatRarityStars,
  generateUserPresetId,
  getBundledPreset,
  getPresetBadge,
  getWeaponMeta,
  listBundledPresets,
  parsePresetJson,
  serializePresetJson,
  validatePreset,
  type Preset,
  type RotationTarget,
  type TeamMember,
} from '@gi/presets'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

const REACTIONS = [
  '',
  'vaporize',
  'melt',
  'aggravate',
  'spread',
] as const

const HIT_MODES = ['avgHit', 'critHit', 'hit'] as const

const ELEMENT_RES_KEYS = [
  'pyro_enemyRes_',
  'hydro_enemyRes_',
  'electro_enemyRes_',
  'cryo_enemyRes_',
  'anemo_enemyRes_',
  'geo_enemyRes_',
  'dendro_enemyRes_',
  'physical_enemyRes_',
] as const

function TeamsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')
  const forkParam = searchParams.get('fork')

  const { record, loading: goodLoading } = useGoodStorage()
  const {
    presets: userPresets,
    loading: presetsLoading,
    save: saveUserPreset,
    remove: removeUserPreset,
  } = useUserPresets()

  const [draft, setDraft] = useState<Preset>(() =>
    createBlankUserPreset('Furina', 'Furina Custom Setup', [
      'skill',
      'usherDmg',
    ])
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importCollision, setImportCollision] = useState<Preset | null>(null)
  const [newMemberKey, setNewMemberKey] = useState<string>('KaedeharaKazuha')
  const [selectedCondByMember, setSelectedCondByMember] = useState<
    Record<number, string>
  >({})

  const [targetsByChar, setTargetsByChar] = useState<
    Record<string, TargetDescriptor[]>
  >({})
  const [conditionalsByChar, setConditionalsByChar] = useState<
    Record<string, ConditionalDescriptor[]>
  >({})
  const [livePreview, setLivePreview] = useState<{
    result?: RotationResult
    error?: string
  }>({})
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewHydrating, setPreviewHydrating] = useState(false)
  const [engineStarted, setEngineStarted] = useState<boolean>(() =>
    Boolean(forkParam || editParam)
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function startEngine() {
    setEngineStarted(true)
  }

  const allPresets = useMemo(
    () => [...listBundledPresets(), ...userPresets],
    [userPresets]
  )

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (forkParam) {
      setEngineStarted(true)
      const src =
        getBundledPreset(forkParam) ??
        userPresets.find((p) => p.id === forkParam)
      if (src) {
        setDraft(forkPresetToUser(src))
        setStatusMessage(
          `Duplicated '${src.name}' as an independent custom preset. Supporting teammates retain their simulated assumed builds.`
        )
      }
    } else if (editParam) {
      setEngineStarted(true)
      const existing = userPresets.find((p) => p.id === editParam)
      if (existing) {
        setDraft(structuredClone(existing))
        setStatusMessage(`Editing saved user preset '${existing.name}'.`)
      }
    }
  }, [editParam, forkParam, userPresets])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load target and conditional catalogs via workerClient (cached per character)
  const teamMemberKeysKey = useMemo(
    () => [draft.target, ...draft.team.map((m) => m.key)].join(','),
    [draft.target, draft.team]
  )

  useEffect(() => {
    if (!engineStarted) return
    let cancelled = false
    const keys = Array.from(
      new Set([draft.target, ...draft.team.map((m) => m.key)])
    )
    void (async () => {
      setCatalogLoading(true)
      try {
        const res = await getCatalogInWorker(keys)
        if (!cancelled) {
          setTargetsByChar((prev) => ({ ...prev, ...res.targetsByChar }))
          setConditionalsByChar((prev) => ({
            ...prev,
            ...res.conditionalsByChar,
          }))
        }
      } catch {
        // Ignore catalog error
      } finally {
        if (!cancelled) {
          setCatalogLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [engineStarted, teamMemberKeysKey, draft.target, draft.team])

  const targetCatalog = targetsByChar[draft.target] ?? []

  /* eslint-disable react-hooks/set-state-in-effect */
  // Debounced (150ms) off-main-thread live rotation damage preview
  useEffect(() => {
    if (!engineStarted) return
    if (!record?.good) {
      setLivePreview({
        error: 'Import a GOOD file to see live rotation damage preview.',
      })
      return
    }
    const v = validatePreset(draft)
    if (!v.ok) {
      setLivePreview({
        error: v.issues.map((i) => `${i.path}: ${i.message}`).join(' · '),
      })
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewHydrating(!isEngineSessionHydrated(record.importedAt))
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await evaluatePresetInWorker({
            datasetKey: record.importedAt,
            good: record.good,
            preset: draft,
          })
          if (!cancelled) {
            setLivePreview({ result: res.result })
          }
        } catch (err) {
          if (!cancelled) {
            setLivePreview({
              error: err instanceof Error ? err.message : String(err),
            })
          }
        } finally {
          if (!cancelled) {
            setPreviewLoading(false)
            setPreviewHydrating(false)
          }
        }
      })()
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
      setPreviewLoading(false)
    }
  }, [engineStarted, record, draft])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleTargetChange(nextTargetKey: string) {
    startEngine()
    let nextTargets = targetsByChar[nextTargetKey]
    if (!nextTargets) {
      setCatalogLoading(true)
      try {
        const cat = await getCatalogInWorker([nextTargetKey])
        nextTargets = cat.targetsByChar[nextTargetKey] ?? []
        setTargetsByChar((prev) => ({ ...prev, ...cat.targetsByChar }))
        setConditionalsByChar((prev) => ({
          ...prev,
          ...cat.conditionalsByChar,
        }))
      } catch {
        nextTargets = []
      } finally {
        setCatalogLoading(false)
      }
    }
    const firstPath = nextTargets[0]?.path ?? ['normal', '0']
    const firstLabel = nextTargets[0]?.name ?? 'Normal 1-Hit'

    setDraft((prev) => {
      const nextTeam = [...prev.team]
      nextTeam[0] = {
        key: nextTargetKey as never,
        build: { type: 'owned' },
        requirement: {},
        conditional: {},
        bonusStats: {},
        hitMode: 'avgHit',
      }
      // Remove duplicate if nextTargetKey was also a teammate
      const deduped = [
        nextTeam[0]!,
        ...nextTeam.slice(1).filter((m) => m.key !== nextTargetKey),
      ]
      return {
        ...prev,
        target: nextTargetKey as never,
        team: deduped,
        rotation: {
          ...prev.rotation,
          targets: [
            {
              path: firstPath,
              count: 1,
              label: firstLabel,
              hitMode: 'avgHit',
              bonusStats: {},
            },
          ],
        },
      }
    })
  }

  function addTeammate() {
    if (draft.team.length >= 4) return
    if (draft.team.some((m) => m.key === newMemberKey)) {
      setValidationErrors([
        `${displayName(newMemberKey)} is already in the team.`,
      ])
      return
    }
    startEngine()
    setValidationErrors([])
    const newMember: TeamMember = createDefaultTcTeammate(newMemberKey)
    setDraft((prev) => ({
      ...prev,
      team: [...prev.team, newMember],
    }))
  }

  function removeTeammate(idx: number) {
    if (idx === 0) return
    startEngine()
    setDraft((prev) => ({
      ...prev,
      team: prev.team.filter((_, i) => i !== idx),
    }))
  }

  function toggleTeammateBuildType(idx: number, type: 'owned' | 'tc') {
    if (idx === 0) return
    startEngine()
    setDraft((prev) => {
      const nextTeam = [...prev.team]
      const m = nextTeam[idx]!
      if (type === 'owned') {
        nextTeam[idx] = { ...m, build: { type: 'owned' } }
      } else {
        nextTeam[idx] = {
          ...m,
          build: { type: 'tc', tc: defaultTcBuildForCharacter(m.key) },
          conditional: {
            ...structuredClone(DEFAULT_TC_TEAMMATE_CONDITIONAL),
            ...m.conditional,
          },
        }
      }
      return { ...prev, team: nextTeam }
    })
  }

  function updateTcMember(
    idx: number,
    updater: (tc: ReturnType<typeof defaultTcBuildForCharacter>) => void
  ) {
    startEngine()
    setDraft((prev) => {
      const nextTeam = [...prev.team]
      const m = nextTeam[idx]!
      if (m.build.type !== 'tc') return prev
      const nextTc = structuredClone(m.build.tc)
      updater(nextTc)
      nextTeam[idx] = { ...m, build: { type: 'tc', tc: nextTc } }
      return { ...prev, team: nextTeam }
    })
  }

  function setMemberConditionalState(
    idx: number,
    sheet: string,
    condKey: string,
    stateVal: string
  ) {
    startEngine()
    setDraft((prev) => {
      const nextTeam = [...prev.team]
      const m = nextTeam[idx]!
      const nextCond = structuredClone(m.conditional ?? {})
      if (!stateVal) {
        if (nextCond[sheet]) {
          delete nextCond[sheet]![condKey]
          if (Object.keys(nextCond[sheet]!).length === 0) {
            delete nextCond[sheet]
          }
        }
      } else {
        nextCond[sheet] = { ...(nextCond[sheet] ?? {}), [condKey]: stateVal }
      }
      nextTeam[idx] = { ...m, conditional: nextCond }
      return { ...prev, team: nextTeam }
    })
  }

  function addRotationRow() {
    startEngine()
    const first = targetCatalog[0] ?? {
      path: ['normal', '0'],
      name: 'Normal 1-Hit',
    }
    const newRow: RotationTarget = {
      path: first.path,
      count: 1,
      label: first.name,
      hitMode: 'avgHit',
      bonusStats: {},
    }
    setDraft((prev) => ({
      ...prev,
      rotation: {
        ...prev.rotation,
        targets: [...prev.rotation.targets, newRow],
      },
    }))
  }

  function updateRotationRow(idx: number, patch: Partial<RotationTarget>) {
    startEngine()
    setDraft((prev) => {
      const nextTargets = [...prev.rotation.targets]
      nextTargets[idx] = { ...nextTargets[idx]!, ...patch }
      return {
        ...prev,
        rotation: { ...prev.rotation, targets: nextTargets },
      }
    })
  }

  function removeRotationRow(idx: number) {
    if (draft.rotation.targets.length <= 1) return
    startEngine()
    setDraft((prev) => ({
      ...prev,
      rotation: {
        ...prev.rotation,
        targets: prev.rotation.targets.filter((_, i) => i !== idx),
      },
    }))
  }

  async function handleSavePreset(asNewCopy = false) {
    const toSave: Preset = asNewCopy
      ? {
          ...draft,
          id: generateUserPresetId(draft.name),
          source: 'user',
          author: draft.author || 'You',
        }
      : {
          ...draft,
          id: draft.id.startsWith('user/')
            ? draft.id
            : generateUserPresetId(draft.name),
          source: 'user',
          author: draft.author || 'You',
        }

    const v = validatePreset(toSave)
    if (!v.ok || !v.preset) {
      setValidationErrors(v.issues.map((i) => `${i.path}: ${i.message}`))
      return
    }
    setValidationErrors([])
    await saveUserPreset(v.preset)
    setDraft(v.preset)
    setStatusMessage(`Saved custom preset '${v.preset.name}' to IndexedDB.`)
  }

  function handleExportJson() {
    const v = validatePreset(draft)
    if (!v.ok || !v.preset) {
      setValidationErrors(v.issues.map((i) => `${i.path}: ${i.message}`))
      return
    }
    const json = serializePresetJson(v.preset)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${v.preset.id.replace(/\//g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return
      const res = parsePresetJson(reader.result)
      if (!res.ok) {
        setValidationErrors(res.issues.map((i) => `${i.path}: ${i.message}`))
        return
      }
      setValidationErrors([])
      const exists = userPresets.some((p) => p.id === res.preset.id)
      if (exists) {
        setImportCollision(res.preset)
        return
      }
      startEngine()
      await saveUserPreset(res.preset)
      setDraft(res.preset)
      setStatusMessage(
        res.convertedFromSource
          ? `Imported '${res.preset.name}' (converted from ${res.convertedFromSource} to custom user preset).`
          : `Imported custom preset '${res.preset.name}'.`
      )
    }
    reader.readAsText(file)
  }

  const badge = getPresetBadge(draft)

  if (goodLoading || presetsLoading) {
    return <TeamsLoading />
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
          <div className="warn" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            {badge.label} (Unverified Setup Bundle)
          </div>
          <h1 style={{ margin: '0.15rem 0 0' }}>
            Custom Team &amp; Preset Builder
          </h1>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>
            Configure your team members, GO conditional buffs, enemy resistances,
            and rotation hits. Save as a reusable custom preset or export as
            plain JSON.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => void handleSavePreset(false)}
            style={{
              background: 'var(--ok)',
              color: '#0b0d12',
              fontWeight: 700,
            }}
          >
            <DownloadIcon size={15} />
            <span>Save</span>
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => void handleSavePreset(true)}
          >
            <CopyIcon size={15} />
            <span>Save Copy</span>
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={handleExportJson}
          >
            <DownloadIcon size={15} />
            <span>Export JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn-icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon size={15} />
            <span>Import JSON…</span>
          </button>
          <Link href={`/optimize?preset=${encodeURIComponent(draft.id)}`}>
            <button
              type="button"
              className="btn-icon"
              style={{
                background: 'var(--accent)',
                color: '#0b0d12',
                fontWeight: 600,
              }}
            >
              <PlayIcon size={15} />
              <span>Optimize</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Saved User Presets Quick Switcher / Fork */}
      <div
        className="panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span className="muted">Load or Fork Existing Preset:</span>
          <select
            value=""
            onChange={(e) => {
              const id = e.target.value
              if (!id) return
              const found = allPresets.find((p) => p.id === id)
              if (!found) return
              startEngine()
              if (found.source === 'user') {
                setDraft(structuredClone(found))
                setStatusMessage(`Loaded user preset '${found.name}'.`)
              } else {
                setDraft(forkPresetToUser(found))
                setStatusMessage(
                  `Forked '${found.name}' into a new custom preset. Teammates retain their simulated assumed builds.`
                )
              }
            }}
          >
            <option value="">— Select a preset to edit or duplicate —</option>
            {allPresets.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.source.toUpperCase()}] {p.name}
              </option>
            ))}
          </select>
        </div>

        {userPresets.some((p) => p.id === draft.id) && (
          <button
            type="button"
            className="btn-icon"
            onClick={async () => {
              await removeUserPreset(draft.id)
              setStatusMessage(`Deleted preset '${draft.name}'.`)
              router.push('/presets')
            }}
            style={{ borderColor: 'var(--err)', color: 'var(--err)' }}
          >
            <TrashIcon size={15} />
            <span>Delete Preset</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="panel ok" style={{ borderColor: 'var(--ok)' }}>
          ✓ {statusMessage}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="panel error" style={{ borderColor: 'var(--err)' }}>
          <strong>Preset Validation Errors:</strong>
          <ul style={{ margin: '0.35rem 0 0' }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {importCollision && (
        <div className="panel" style={{ borderColor: 'var(--warn)' }}>
          <strong className="warn">
            A user preset with ID <code>{importCollision.id}</code> already
            exists.
          </strong>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={async () => {
                startEngine()
                await saveUserPreset(importCollision)
                setDraft(importCollision)
                setImportCollision(null)
                setStatusMessage(`Overwrote preset '${importCollision.name}'.`)
              }}
              style={{ background: 'var(--warn)', color: '#0b0d12' }}
            >
              Replace Existing
            </button>
            <button
              type="button"
              onClick={async () => {
                startEngine()
                const copy = forkPresetToUser(
                  importCollision,
                  `${importCollision.name} (Imported)`
                )
                await saveUserPreset(copy)
                setDraft(copy)
                setImportCollision(null)
                setStatusMessage(`Imported as copy '${copy.name}'.`)
              }}
            >
              Keep Both (Import as Copy)
            </button>
            <button type="button" onClick={() => setImportCollision(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preset Metadata & Enemy Config */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="panel"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
        >
          <strong>Preset Metadata</strong>
          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Preset Name
            </span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label
            style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Description / Notes
            </span>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <div className="muted" style={{ fontSize: '0.82rem' }}>
            Preset ID: <code>{draft.id}</code> · Author: {draft.author}
          </div>
        </div>

        <div
          className="panel"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
        >
          <strong>Enemy &amp; Team Resonance Overrides</strong>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}
            >
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Enemy Level
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={draft.enemy.level}
                onChange={(e) => {
                  startEngine()
                  setDraft({
                    ...draft,
                    enemy: {
                      ...draft.enemy,
                      level: Math.max(1, Number(e.target.value) || 100),
                    },
                  })
                }}
                style={{ width: '90px' }}
              />
            </label>

            {ELEMENT_RES_KEYS.map((rk) => {
              const eleKey = rk.replace('_enemyRes_', '') as GiElementWithPhyKey
              return (
                <label
                  key={rk}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  <ElementBadge element={eleKey} label="RES%" compact />
                  <input
                    type="number"
                    value={draft.enemy.overrides[rk] ?? 10}
                    onChange={(e) => {
                      startEngine()
                      setDraft({
                        ...draft,
                        enemy: {
                          ...draft.enemy,
                          overrides: {
                            ...draft.enemy.overrides,
                            [rk]: Number(e.target.value),
                          },
                        },
                      })
                    }}
                    style={{ width: '68px' }}
                  />
                </label>
              )
            })}
          </div>
        </div>
      </div>

      {/* Team Members (1 to 4) */}
      <div
        className="panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
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
          <h2 style={{ margin: 0 }}>
            Team Setup ({draft.team.length}/4 Members)
          </h2>
          {draft.team.length < 4 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <CharacterBadge characterKey={newMemberKey} compact />
              <select
                value={newMemberKey}
                onChange={(e) => setNewMemberKey(e.target.value)}
              >
                {ALL_CHARACTER_KEYS.map((ck) => (
                  <option key={ck} value={ck}>
                    {displayName(ck)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addTeammate}>
                + Add Simulated Teammate
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.9rem',
          }}
        >
          {draft.team.map((member, idx) => {
            const isTarget = idx === 0
            const isSim = member.build.type === 'tc'
            const condCatalog = conditionalsByChar[member.key] ?? []
            const selectedCondId = selectedCondByMember[idx] ?? ''

            return (
              <div
                key={`${member.key}-${idx}`}
                style={{
                  background: '#151821',
                  border: isTarget
                    ? '1px solid var(--accent)'
                    : isSim
                      ? '1px dashed var(--warn)'
                      : '1px solid var(--border)',
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
                  }}
                >
                  <span
                    className={isTarget ? 'ok' : isSim ? 'warn' : 'muted'}
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {isTarget
                      ? 'Slot 1 · Your Character · Target'
                      : isSim
                        ? `Slot ${idx + 1} · Simulated / Assumed Preset Build`
                        : `Slot ${idx + 1} · Your Scanned Character`}
                  </span>
                  {!isTarget && (
                    <button
                      type="button"
                      onClick={() => removeTeammate(idx)}
                      style={{
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.8rem',
                        borderColor: 'var(--err)',
                        color: 'var(--err)',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Visual Character Identifier */}
                <CharacterBadge
                  characterKey={member.key}
                  simulated={isSim}
                  role={isTarget ? 'target' : 'owned'}
                />

                {isTarget ? (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.82rem' }}>
                      Change Target Character
                    </span>
                    <select
                      value={member.key}
                      onChange={(e) => void handleTargetChange(e.target.value)}
                    >
                      {ALL_CHARACTER_KEYS.map((ck) => (
                        <option key={ck} value={ck}>
                          {displayName(ck)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div>
                    <div style={{ marginTop: '0.15rem' }}>
                      <select
                        value={member.build.type}
                        onChange={(e) =>
                          toggleTeammateBuildType(
                            idx,
                            e.target.value as 'owned' | 'tc'
                          )
                        }
                        style={{ width: '100%' }}
                      >
                        <option value="tc">
                          Simulated / Assumed Preset Build (Not Your Account)
                        </option>
                        <option value="owned">
                          Use My Scanned Character Build
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TC Build Editor for Supporting Teammates */}
                {!isTarget && member.build.type === 'tc' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.5rem',
                    }}
                  >
                    <div className="muted" style={{ fontSize: '0.78rem' }}>
                      Editable Assumed Stats (Simulated — does not use your
                      scanned character):
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <label style={{ flex: 1 }}>
                        <span className="muted">Lv.</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={member.build.tc.character.level}
                          onChange={(e) =>
                            updateTcMember(idx, (tc) => {
                              tc.character.level = Number(e.target.value) || 90
                            })
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label style={{ flex: 1 }}>
                        <span className="muted">Cons</span>
                        <select
                          value={member.build.tc.character.constellation}
                          onChange={(e) =>
                            updateTcMember(idx, (tc) => {
                              tc.character.constellation = Number(
                                e.target.value
                              )
                            })
                          }
                          style={{ width: '100%' }}
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                            <option key={c} value={c}>
                              C{c}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <span className="muted">Assumed Weapon</span>
                      <WeaponBadge
                        weaponKey={member.build.tc.weapon.key}
                        compact
                        subtitle={`R${member.build.tc.weapon.refinement}`}
                      />
                      <select
                        value={member.build.tc.weapon.key}
                        onChange={(e) =>
                          updateTcMember(idx, (tc) => {
                            tc.weapon.key = e.target.value as never
                          })
                        }
                        style={{ width: '100%' }}
                      >
                        {ALL_WEAPON_KEYS.map((wk) => {
                          const wm = getWeaponMeta(wk)
                          return (
                            <option key={wk} value={wk}>
                              {wm.displayName} {formatRarityStars(wm.rarity)}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <span className="muted">
                        Assumed 4-Piece Artifact Set
                      </span>
                      {Object.keys(member.build.tc.artifact.sets)[0] && (
                        <ArtifactBadge
                          setKey={
                            Object.keys(member.build.tc.artifact.sets)[0]!
                          }
                          compact
                          subtitle="(4p)"
                        />
                      )}
                      <select
                        value={
                          Object.keys(member.build.tc.artifact.sets)[0] ?? ''
                        }
                        onChange={(e) =>
                          updateTcMember(idx, (tc) => {
                            tc.artifact.sets = e.target.value
                              ? { [e.target.value]: 4 }
                              : {}
                          })
                        }
                        style={{ width: '100%' }}
                      >
                        <option value="">— No 4p Set —</option>
                        {ALL_ARTIFACT_SET_KEYS.map((sk) => (
                          <option key={sk} value={sk}>
                            {displayName(sk)} (4p)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Active Conditionals for this Member */}
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div className="muted" style={{ marginBottom: '0.3rem' }}>
                    Active GO Conditionals:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                    }}
                  >
                    {Object.entries(member.conditional ?? {}).flatMap(
                      ([sheet, map]) =>
                        Object.entries(map).map(([ck, cv]) => (
                          <div
                            key={`${sheet}:${ck}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#222634',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            <span>
                              {displayName(sheet)}.{ck} = <strong>{cv}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMemberConditionalState(idx, sheet, ck, '')
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '0 0.25rem',
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.3rem',
                      marginTop: '0.4rem',
                    }}
                  >
                    <select
                      value={selectedCondId}
                      onFocus={startEngine}
                      onMouseDown={startEngine}
                      onChange={(e) => {
                        startEngine()
                        setSelectedCondByMember((prev) => ({
                          ...prev,
                          [idx]: e.target.value,
                        }))
                      }}
                      style={{ flex: 1, maxWidth: '190px' }}
                    >
                      <option value="">+ Add Conditional Buff…</option>
                      {condCatalog.slice(0, 120).map((c) => (
                        <option
                          key={`${c.sheet}:${c.key}`}
                          value={`${c.sheet}:${c.key}`}
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {selectedCondId && (
                      <button
                        type="button"
                        onClick={() => {
                          const [sheet, key] = selectedCondId.split(':')
                          const desc = condCatalog.find(
                            (c) => c.sheet === sheet && c.key === key
                          )
                          const defaultState =
                            desc?.states[desc.states.length - 1]?.key ?? 'on'
                          if (sheet && key) {
                            setMemberConditionalState(
                              idx,
                              sheet,
                              key,
                              defaultState
                            )
                          }
                        }}
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rotation Builder */}
      <div
        className="panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
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
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0 }}>Target Rotation</h2>
            <CharacterBadge characterKey={draft.target} role="target" compact />
            <input
              type="text"
              value={draft.rotation.name}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  rotation: { ...draft.rotation, name: e.target.value },
                })
              }
              placeholder="Rotation Name"
              style={{ width: '240px' }}
            />
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span className="muted">Repeat ×</span>
              <input
                type="number"
                min={1}
                max={20}
                value={draft.rotation.repeat}
                onChange={(e) => {
                  startEngine()
                  setDraft({
                    ...draft,
                    rotation: {
                      ...draft.rotation,
                      repeat: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }}
                style={{ width: '65px' }}
              />
            </label>
          </div>

          <button type="button" onClick={addRotationRow}>
            + Add Damage Instance Row
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>GO Formula Target</th>
              <th>Hit Count</th>
              <th>Hit Mode</th>
              <th>Reaction</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {draft.rotation.targets.map((rt, idx) => {
              const normPathKey =
                rt.path[0] === draft.target
                  ? rt.path.slice(1).join('.')
                  : rt.path.join('.')
              const hasTargetOption = targetCatalog.some(
                (t) => t.path.join('.') === normPathKey
              )
              return (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      value={rt.label}
                      onChange={(e) =>
                        updateRotationRow(idx, { label: e.target.value })
                      }
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <select
                      value={normPathKey}
                      onFocus={startEngine}
                      onMouseDown={startEngine}
                      onChange={(e) => {
                        const parts = e.target.value.split('.')
                        const desc = targetCatalog.find(
                          (t) => t.path.join('.') === e.target.value
                        )
                        updateRotationRow(idx, {
                          path: parts,
                          label: desc?.name ?? e.target.value,
                        })
                      }}
                    >
                      {!hasTargetOption && normPathKey && (
                        <option value={normPathKey}>
                          {rt.label
                            ? `${rt.label} (${normPathKey})`
                            : normPathKey}
                        </option>
                      )}
                      {targetCatalog.map((t) => (
                        <option
                          key={t.path.join('.')}
                          value={t.path.join('.')}
                        >
                          {t.name} ({t.path.join('.')})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={rt.count}
                      onChange={(e) =>
                        updateRotationRow(idx, {
                          count: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      style={{ width: '75px' }}
                    />
                  </td>
                  <td>
                    <select
                      value={rt.hitMode}
                      onChange={(e) =>
                        updateRotationRow(idx, {
                          hitMode: e.target.value as never,
                        })
                      }
                    >
                      {HIT_MODES.map((hm) => (
                        <option key={hm} value={hm}>
                          {humanizeKey(hm)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={rt.reaction ?? ''}
                      onChange={(e) =>
                        updateRotationRow(idx, {
                          reaction: (e.target.value || undefined) as never,
                        })
                      }
                    >
                      {REACTIONS.map((rx) => (
                        <option key={rx} value={rx}>
                          {rx ? humanizeKey(rx) : 'None'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={draft.rotation.targets.length <= 1}
                      onClick={() => removeRotationRow(idx)}
                      style={{ color: 'var(--err)' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Live Rotation Damage Preview */}
      <div
        className="panel"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Live Rotation Preview</h3>
            <CharacterBadge characterKey={draft.target} role="target" compact />
            {engineStarted && (previewLoading || catalogLoading) && (
              <Spinner
                label={
                  previewHydrating || catalogLoading
                    ? 'Loading optimizer engine…'
                    : 'Evaluating…'
                }
                size="sm"
                inline
              />
            )}
          </div>
          {engineStarted && livePreview.result && !previewLoading && (
            <strong className="ok" style={{ fontSize: '1.25rem' }}>
              Total: {Math.round(livePreview.result.total).toLocaleString()} DMG
            </strong>
          )}
        </div>

        {!engineStarted ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span className="muted">
              The optimizer engine starts automatically when you edit the team
              or rotation, or you can load it now.
            </span>
            <button
              type="button"
              data-testid="load-engine-preview-btn"
              onClick={startEngine}
            >
              Load Engine &amp; Preview
            </button>
          </div>
        ) : (previewLoading || catalogLoading) &&
          !livePreview.result &&
          !livePreview.error ? (
          <SkeletonBlock height={28} count={4} gap="0.45rem" />
        ) : previewLoading && !livePreview.result ? (
          <SkeletonBlock height={28} count={4} gap="0.45rem" />
        ) : livePreview.error ? (
          <div className="muted">{livePreview.error}</div>
        ) : livePreview.result ? (
          <table>
            <thead>
              <tr>
                <th>Instance</th>
                <th>Count</th>
                <th>Per-Hit DMG</th>
                <th>Subtotal DMG</th>
              </tr>
            </thead>
            <tbody>
              {livePreview.result.instances.map((inst, i) => (
                <tr key={i}>
                  <td>{inst.label}</td>
                  <td>×{inst.count}</td>
                  <td>{Math.round(inst.perHit).toLocaleString()}</td>
                  <td>
                    <strong>{Math.round(inst.subtotal).toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsLoading />}>
      <TeamsInner />
    </Suspense>
  )
}
