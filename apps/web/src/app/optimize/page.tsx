'use client'

import OptimizeLoading from './loading'
import { ArtifactSetFilter } from '@/components/ArtifactSetFilter'
import { ConditionalTogglePanel } from '@/components/ConditionalTogglePanel'
import { CharacterBadge, WeaponBadge } from '@/components/Identifier'
import { ProgressBar, ResultsSkeleton, Spinner } from '@/components/Loading'
import { TeammateFastModePanel } from '@/components/TeammateFastModePanel'
import {
  BuildComparisonList,
  ConstraintsCard,
  PresetRotationSummary,
  rankWeaponComparisonRows,
  resolveWeaponCompareCandidate,
  SolverPoolFiltersPanel,
  TeamOptimizationList,
  WeaponComparisonList,
  WeaponComparisonPanel,
  type ComparisonBuildEntry,
} from '@/components/OptimizeViews'
import {
  CharacterTilePicker,
  PresetTilePicker,
  WeaponTilePicker,
} from '@/components/TilePickers'
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
  optimizeTeamInWorker,
} from '@/lib/engine/workerClient'
import {
  useGoodStorage,
  useOptimizerSettings,
  useUserPresets,
} from '@/lib/storage/useGood'
import {
  WEAPON_COMPARE_TOP_N,
  type BuildSelection,
  type MemberStatSummary,
  type OptimizeProgress,
  type OptimizeResult,
  type RotationResult,
  type SimulatedWeaponSpec,
  type TeamOptimizeProgress,
  type TeamOptimizeResult,
  type WeaponCompareBuildEntry,
  type WeaponCompareCandidate,
  type WeaponCompareResult,
  type WeaponCompareRowResult,
} from '@gi/engine'
import { type IArtifact } from '@gi/good'
import {
  displayName,
  getCharacterMeta,
  getPresetConditionalOverrides,
  getPresetMemberBuildModes,
  getPresetResonanceEnabled,
  getWeaponMeta,
  hasMemberConditionalOverrides,
  listBundledPresets,
  listWeaponsForType,
  matchAccount,
  normalizeFastModeStats,
  resetPresetMemberFastMode,
  resolveEffectiveFastMode,
  resolvePresetMemberBuildMode,
  setPresetMemberBuildMode,
  setPresetMemberFastModeStat,
  type FastModeStatKey,
  type MemberBuildMode,
  type Preset,
} from '@gi/presets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

function OptimizeInner() {
  const searchParams = useSearchParams()
  const presetParam = searchParams.get('preset')
  const weaponParam = searchParams.get('weapon')
  const weaponKeyParam = searchParams.get('weaponKey')
  const refinementParam = searchParams.get('refinement')

  const { record, loading: goodLoading } = useGoodStorage()
  const {
    presets: userPresets,
    loading: presetsLoading,
    save: saveUserPreset,
  } = useUserPresets()
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

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<OptimizeProgress | null>(null)
  const [optResult, setOptResult] = useState<OptimizeResult | null>(null)
  const [optError, setOptError] = useState<string | null>(null)

  const [currentSelection, setCurrentSelection] =
    useState<BuildSelection | null>(null)
  const [currentEval, setCurrentEval] = useState<RotationResult | null>(null)
  const [teamMemberStats, setTeamMemberStats] = useState<
    Record<string, MemberStatSummary>
  >({})
  const [optimisedEvals, setOptimisedEvals] = useState<
    Array<RotationResult | null>
  >([])
  const [evaluating, setEvaluating] = useState(false)
  const [hydratingEngine, setHydratingEngine] = useState(false)

  // Weapon Comparison & Team Optimization modes (run-local state; never mutates preset, saved settings, or single-weapon results)
  const [optimizeMode, setOptimizeMode] = useState<
    'single' | 'compare' | 'team'
  >('single')
  const [compareCandidatesByPreset, setCompareCandidatesByPreset] = useState<
    Record<string, WeaponCompareCandidate[]>
  >({})
  const [compareRunning, setCompareRunning] = useState(false)
  const [compareProgress, setCompareProgress] = useState<{
    weaponIndex: number
    totalWeapons: number
    weaponKey: string
    solverProgress: OptimizeProgress
  } | null>(null)
  const [compareResult, setCompareResult] =
    useState<WeaponCompareResult | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const compareCancelRef = useRef(false)

  const [teamRunning, setTeamRunning] = useState(false)
  const [teamProgress, setTeamProgress] =
    useState<TeamOptimizeProgress | null>(null)
  const [teamResult, setTeamResult] = useState<TeamOptimizeResult | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)

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

  const ownedCharKeys = useMemo(
    () => new Set((record?.good.characters ?? []).map((c) => c.key)),
    [record]
  )

  const activeMemberBuildModes = useMemo(
    () =>
      activePreset
        ? getPresetMemberBuildModes(settings, activePreset.id)
        : {},
    [activePreset, settings]
  )

  const activeMemberConditionals = useMemo(
    () =>
      activePreset
        ? getPresetConditionalOverrides(settings, activePreset.id)
        : {},
    [activePreset, settings]
  )

  const hasActiveConditionalOverrides = useMemo(
    () =>
      activePreset
        ? hasMemberConditionalOverrides(settings, activePreset.id)
        : false,
    [activePreset, settings]
  )

  const activeResonanceEnabled = useMemo(
    () =>
      activePreset
        ? getPresetResonanceEnabled(settings, activePreset.id)
        : true,
    [activePreset, settings]
  )

  const activeFastMode = useMemo(
    () =>
      activePreset && optimizeMode !== 'team'
        ? resolveEffectiveFastMode(activePreset, settings)
        : {},
    [activePreset, settings, optimizeMode]
  )

  const hasActiveFastMode = useMemo(
    () => Object.keys(activeFastMode).length > 0,
    [activeFastMode]
  )

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

  const hasTargetWeaponPicker = Boolean(
    activePreset &&
      (isAkashaPreset || activePreset.source === 'official')
  )

  const availableAkashaWeapons = useMemo(() => {
    if (!activePreset || !hasTargetWeaponPicker) return []
    const charMeta = getCharacterMeta(activePreset.target)
    return listWeaponsForType(charMeta.weaponType)
  }, [activePreset, hasTargetWeaponPicker])

  const targetWeaponOverrideSpec: SimulatedWeaponSpec | undefined =
    useMemo(() => {
      if (!activePreset) return undefined
      if (isAkashaPreset) return akashaWeaponSpec
      const chosen = akashaWeaponByPreset[activePreset.id]
      if (!chosen) return undefined
      const wMeta = getWeaponMeta(chosen.key)
      return {
        key: chosen.key,
        level: wMeta.rarity <= 2 ? 70 : 90,
        ascension: wMeta.rarity <= 2 ? 4 : 6,
        refinement: wMeta.rarity <= 2 ? 1 : chosen.refinement,
      }
    }, [activePreset, isAkashaPreset, akashaWeaponSpec, akashaWeaponByPreset])

  const activeCompareCandidates: WeaponCompareCandidate[] = useMemo(() => {
    if (!activePreset) return []
    const explicit = compareCandidatesByPreset[activePreset.id]
    if (explicit) return explicit

    const seededKeys: string[] = []
    const targetWeaponType = getCharacterMeta(activePreset.target).weaponType
    const equippedInGood = record?.good.weapons.find(
      (w) =>
        w.location === activePreset.target &&
        getWeaponMeta(w.key).weaponType === targetWeaponType
    )
    if (equippedInGood) {
      seededKeys.push(equippedInGood.key)
    }
    if (
      activePreset.team[0]?.build.type === 'fixed' &&
      !seededKeys.includes(activePreset.team[0].build.weapon.key)
    ) {
      seededKeys.push(activePreset.team[0].build.weapon.key)
    }
    return seededKeys.map((wk) =>
      resolveWeaponCompareCandidate(wk, activePreset.target, record?.good)
    )
  }, [activePreset, compareCandidatesByPreset, record])

  const matchReport = useMemo(() => {
    if (!activePreset || !record?.good || isAkashaPreset) return null
    return matchAccount(activePreset, record.good, {
      selectedWeaponId: selectedWeaponId || undefined,
    })
  }, [activePreset, record, selectedWeaponId, isAkashaPreset])

  const effectiveWeaponId =
    isAkashaPreset || targetWeaponOverrideSpec
      ? undefined
      : selectedWeaponId || matchReport?.selectedWeaponId || undefined

  const displayedTargetWeaponSpec: SimulatedWeaponSpec | undefined =
    useMemo(() => {
      if (!activePreset) return undefined
      if (targetWeaponOverrideSpec) return targetWeaponOverrideSpec
      const targetMember = activePreset.team[0]
      const resolvedTargetMode = resolvePresetMemberBuildMode({
        presetSource: activePreset.source,
        isTarget: true,
        memberBuildType: targetMember?.build.type ?? 'owned',
        characterKey: activePreset.target,
        ownedCharKeys,
        overrideMode: activeMemberBuildModes[activePreset.target],
      }).mode

      if (targetMember?.build.type === 'tc' && resolvedTargetMode === 'tc') {
        return {
          key: targetMember.build.tc.weapon.key,
          level: targetMember.build.tc.weapon.level,
          ascension: targetMember.build.tc.weapon.ascension,
          refinement: targetMember.build.tc.weapon.refinement,
        }
      }
      if (targetMember?.build.type === 'fixed') {
        return {
          key: targetMember.build.weapon.key,
          level: targetMember.build.weapon.level,
          ascension: targetMember.build.weapon.ascension,
          refinement: targetMember.build.weapon.refinement,
        }
      }

      const targetWeaponType = getCharacterMeta(
        activePreset.target
      ).weaponType
      const bySelectedId = effectiveWeaponId
        ? record?.good.weapons.find((w) => w.id === effectiveWeaponId)
        : undefined
      const equipped =
        bySelectedId ??
        record?.good.weapons.find(
          (w) =>
            w.location === activePreset.target &&
            getWeaponMeta(w.key).weaponType === targetWeaponType
        )
      if (equipped) {
        return {
          key: equipped.key,
          level: equipped.level,
          ascension: equipped.ascension,
          refinement: equipped.refinement,
        }
      }

      const reqWep = targetMember?.requirement?.weapon
      if (reqWep) {
        const wMeta = getWeaponMeta(reqWep.key)
        const reqRef =
          typeof reqWep.refinement === 'number'
            ? reqWep.refinement
            : reqWep.refinement?.min ?? 1
        return {
          key: reqWep.key,
          level: wMeta.rarity <= 2 ? 70 : 90,
          ascension: wMeta.rarity <= 2 ? 4 : 6,
          refinement: wMeta.rarity <= 2 ? 1 : reqRef,
        }
      }

      const fallbackW = availableAkashaWeapons[0]
      if (fallbackW) {
        return {
          key: fallbackW.key,
          level: fallbackW.rarity <= 2 ? 70 : 90,
          ascension: fallbackW.rarity <= 2 ? 4 : 6,
          refinement: 1,
        }
      }
      return undefined
    }, [
      activePreset,
      targetWeaponOverrideSpec,
      ownedCharKeys,
      activeMemberBuildModes,
      effectiveWeaponId,
      record,
      availableAkashaWeapons,
    ])

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
          setTeamMemberStats({})
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

        const effectiveCurrent: BuildSelection = targetWeaponOverrideSpec
          ? {
              weaponOverride: targetWeaponOverrideSpec,
              artifactIds: baseRes.currentBuild.artifactIds,
              ...(activePreset.source === 'official' &&
              Object.keys(activeMemberBuildModes).length > 0
                ? { memberBuildModes: activeMemberBuildModes }
                : {}),
              ...(hasActiveConditionalOverrides
                ? { memberConditionals: activeMemberConditionals }
                : {}),
              ...(!activeResonanceEnabled ? { resonanceEnabled: false } : {}),
              ...(hasActiveFastMode ? { fastMode: activeFastMode } : {}),
            }
          : {
              ...(baseRes.currentBuild.weaponOverride
                ? { weaponOverride: baseRes.currentBuild.weaponOverride }
                : {
                    weaponId:
                      effectiveWeaponId ?? baseRes.currentBuild.weaponId,
                  }),
              artifactIds: baseRes.currentBuild.artifactIds,
              ...(activePreset.source === 'official' &&
              Object.keys(activeMemberBuildModes).length > 0
                ? { memberBuildModes: activeMemberBuildModes }
                : {}),
              ...(hasActiveConditionalOverrides
                ? { memberConditionals: activeMemberConditionals }
                : {}),
              ...(!activeResonanceEnabled ? { resonanceEnabled: false } : {}),
              ...(hasActiveFastMode ? { fastMode: activeFastMode } : {}),
            }
        setCurrentSelection(effectiveCurrent)

        const hasOfficialMemberModeOverrides =
          activePreset.source === 'official' &&
          Object.keys(activeMemberBuildModes).length > 0

        const needsReEval = isAkashaPreset
          ? Boolean(
              hasActiveConditionalOverrides ||
                !activeResonanceEnabled ||
                hasActiveFastMode ||
                (targetWeaponOverrideSpec &&
                  (targetWeaponOverrideSpec.key !==
                    baseRes.currentBuild.weaponOverride?.key ||
                    targetWeaponOverrideSpec.refinement !==
                      baseRes.currentBuild.weaponOverride?.refinement))
            )
          : Boolean(
              targetWeaponOverrideSpec ||
                (effectiveWeaponId &&
                  effectiveWeaponId !== baseRes.currentBuild.weaponId) ||
                hasOfficialMemberModeOverrides ||
                hasActiveConditionalOverrides ||
                !activeResonanceEnabled ||
                hasActiveFastMode
            )

        // For Akasha presets, if the target character is not owned or has no artifacts equipped,
        // do not evaluate a current build — show the optimised result without a current build.
        if (isAkashaPreset && !hasEquipped) {
          if (needsReEval) {
            const overrideRes = await evaluatePresetInWorker({
              datasetKey: record.importedAt,
              good: record.good,
              preset: activePreset,
              selection: effectiveCurrent,
            })
            if (cancelled) return
            setTeamMemberStats(
              overrideRes.result.memberStats ?? baseRes.result.memberStats ?? {}
            )
          } else {
            setTeamMemberStats(baseRes.result.memberStats ?? {})
          }
          setCurrentEval(null)
          return
        }

        if (needsReEval) {
          const overrideRes = await evaluatePresetInWorker({
            datasetKey: record.importedAt,
            good: record.good,
            preset: activePreset,
            selection: effectiveCurrent,
          })
          if (cancelled) return
          setCurrentEval(overrideRes.result)
          setTeamMemberStats(
            overrideRes.result.memberStats ?? baseRes.result.memberStats ?? {}
          )
        } else {
          setCurrentEval(baseRes.result)
          setTeamMemberStats(baseRes.result.memberStats ?? {})
        }
      } catch {
        if (!cancelled) {
          setCurrentEval(null)
          setTeamMemberStats({})
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
    targetWeaponOverrideSpec,
    effectiveWeaponId,
    activeMemberBuildModes,
    activeMemberConditionals,
    hasActiveConditionalOverrides,
    activeResonanceEnabled,
    activeFastMode,
    hasActiveFastMode,
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
              selection: {
                ...(targetWeaponOverrideSpec
                  ? { ...b, weaponOverride: targetWeaponOverrideSpec }
                  : b),
                ...(activePreset.source === 'official' &&
                Object.keys(activeMemberBuildModes).length > 0
                  ? { memberBuildModes: activeMemberBuildModes }
                  : {}),
                ...(hasActiveConditionalOverrides
                  ? { memberConditionals: activeMemberConditionals }
                  : {}),
                ...(!activeResonanceEnabled ? { resonanceEnabled: false } : {}),
                ...(hasActiveFastMode ? { fastMode: activeFastMode } : {}),
              },
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
  }, [
    record,
    activePreset,
    optResult,
    targetWeaponOverrideSpec,
    activeMemberBuildModes,
    activeMemberConditionals,
    hasActiveConditionalOverrides,
    activeResonanceEnabled,
    activeFastMode,
    hasActiveFastMode,
  ])

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
        weaponId: targetWeaponOverrideSpec ? undefined : effectiveWeaponId,
        weaponOverride: targetWeaponOverrideSpec,
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

  async function startWeaponComparison() {
    if (
      !record?.good ||
      !activePreset ||
      activeCompareCandidates.length < 2
    ) {
      return
    }
    compareCancelRef.current = false
    setCompareRunning(true)
    setCompareError(null)
    setCompareResult(null)

    const completedRows: WeaponCompareRowResult[] = []
    let wasCancelled = false

    try {
      for (let i = 0; i < activeCompareCandidates.length; i++) {
        if (compareCancelRef.current) {
          wasCancelled = true
          break
        }
        const cand = activeCompareCandidates[i]!
        const weaponOverride: SimulatedWeaponSpec = {
          key: cand.weaponKey,
          level: cand.level,
          ascension: cand.ascension,
          refinement: cand.refinement,
        }

        setCompareProgress({
          weaponIndex: i,
          totalWeapons: activeCompareCandidates.length,
          weaponKey: cand.weaponKey,
          solverProgress: { tested: 0, skipped: 0, total: 0 },
        })

        const compareSettings = {
          ...settings,
          topN: WEAPON_COMPARE_TOP_N,
        }

        let optRes: OptimizeResult
        try {
          optRes = await optimizePresetInWorker({
            datasetKey: record.importedAt,
            good: record.good,
            preset: activePreset,
            settings: compareSettings,
            weaponOverride,
            onProgress: (p) => {
              setCompareProgress({
                weaponIndex: i,
                totalWeapons: activeCompareCandidates.length,
                weaponKey: cand.weaponKey,
                solverProgress: { ...p },
              })
            },
          })
        } catch (err) {
          if (
            compareCancelRef.current ||
            (err instanceof DOMException && err.name === 'AbortError') ||
            (err instanceof Error && err.name === 'AbortError')
          ) {
            wasCancelled = true
            break
          }
          throw err
        }

        if (compareCancelRef.current) {
          wasCancelled = true
          break
        }

        const candidateBuilds = optRes.builds.slice(0, WEAPON_COMPARE_TOP_N)
        if (candidateBuilds.length === 0) {
          completedRows.push({
            candidate: { ...cand },
            status: 'unmet',
            rank: null,
            total: null,
            percentBehindLeader: null,
            bestBuild: null,
            evaluation: null,
            topBuilds: [],
            tested: optRes.tested,
            skipped: optRes.skipped,
            durationMs: optRes.durationMs,
          })
        } else {
          const goodSnapshot = record.good
          const importedAtSnapshot = record.importedAt
          const rawEntries = await Promise.all(
            candidateBuilds.map(async (b) => {
              const selectionForEval: BuildSelection = {
                ...b,
                weaponOverride,
                ...(activePreset.source === 'official' &&
                Object.keys(activeMemberBuildModes).length > 0
                  ? { memberBuildModes: activeMemberBuildModes }
                  : {}),
                ...(hasActiveConditionalOverrides
                  ? { memberConditionals: activeMemberConditionals }
                  : {}),
                ...(!activeResonanceEnabled ? { resonanceEnabled: false } : {}),
                ...(hasActiveFastMode ? { fastMode: activeFastMode } : {}),
              }
              const evalRes = await evaluatePresetInWorker({
                datasetKey: importedAtSnapshot,
                good: goodSnapshot,
                preset: activePreset,
                selection: selectionForEval,
              })
              return {
                rank: 0,
                selection: {
                  ...selectionForEval,
                  total: evalRes.result.total,
                },
                evaluation: evalRes.result,
              }
            })
          )
          const topBuilds: WeaponCompareBuildEntry[] = rawEntries
            .sort((a, b) => b.evaluation.total - a.evaluation.total)
            .map((entry, idx) => ({
              ...entry,
              rank: idx + 1,
            }))
          const topEntry = topBuilds[0]!
          completedRows.push({
            candidate: { ...cand },
            status: 'ok',
            rank: null,
            total: topEntry.evaluation.total,
            percentBehindLeader: null,
            bestBuild: topEntry.selection,
            evaluation: topEntry.evaluation,
            topBuilds,
            tested: optRes.tested,
            skipped: optRes.skipped,
            durationMs: optRes.durationMs,
          })
        }

        setCompareResult(rankWeaponComparisonRows(completedRows, false))
      }

      setCompareResult(rankWeaponComparisonRows(completedRows, wasCancelled))
    } catch (err) {
      if (
        compareCancelRef.current ||
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        setCompareResult(rankWeaponComparisonRows(completedRows, true))
      } else {
        setCompareError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setCompareRunning(false)
      setCompareProgress(null)
    }
  }

  function cancelWeaponComparison() {
    compareCancelRef.current = true
    cancelOptimizationInWorker()
    setCompareRunning(false)
  }

  async function startTeamOptimization() {
    if (!record?.good || !activePreset || !canRunPreset) return
    setTeamRunning(true)
    setTeamError(null)
    setTeamResult(null)
    setTeamProgress({
      memberIndex: 0,
      totalMembers: activePreset.team.length,
      memberKey: activePreset.target,
      solverProgress: { tested: 0, skipped: 0, total: 0 },
    })

    try {
      const res = await optimizeTeamInWorker({
        datasetKey: record.importedAt,
        good: record.good,
        preset: activePreset,
        settings,
        weaponId: targetWeaponOverrideSpec ? undefined : effectiveWeaponId,
        weaponOverride: targetWeaponOverrideSpec,
        onProgress: (p) => setTeamProgress({ ...p }),
      })
      setTeamResult(res)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setTeamError(err instanceof Error ? err.message : String(err))
    } finally {
      setTeamRunning(false)
    }
  }

  function cancelTeamOptimization() {
    cancelOptimizationInWorker()
    setTeamRunning(false)
  }

  function handleChangeMemberFastModeStat(
    characterKey: string,
    statKey: FastModeStatKey,
    value: number | undefined
  ) {
    if (!activePreset) return
    if (characterKey === activePreset.target) return
    if (activePreset.source === 'user') {
      const updatedPreset = {
        ...activePreset,
        team: activePreset.team.map((m, idx) => {
          if (idx === 0 || m.key !== characterKey) return m
          const nextStats = normalizeFastModeStats({
            ...(m.fastMode ?? {}),
            [statKey]: value,
          })
          return {
            ...m,
            fastMode: nextStats,
          }
        }),
      }
      void saveUserPreset(updatedPreset)
    } else {
      void updateSettings(
        setPresetMemberFastModeStat(
          settings,
          activePreset.id,
          characterKey,
          statKey,
          value
        )
      )
    }
    setOptResult(null)
    setOptimisedEvals([])
    setCompareResult(null)
  }

  function handleResetMemberFastMode(characterKey: string) {
    if (!activePreset) return
    if (activePreset.source === 'user') {
      const updatedPreset = {
        ...activePreset,
        team: activePreset.team.map((m, idx) => {
          if (idx === 0 || m.key !== characterKey) return m
          const next = { ...m }
          delete next.fastMode
          return next
        }),
      }
      void saveUserPreset(updatedPreset)
    } else {
      void updateSettings(
        resetPresetMemberFastMode(settings, activePreset.id, characterKey)
      )
    }
    setOptResult(null)
    setOptimisedEvals([])
    setCompareResult(null)
  }

  async function handleExportGO(
    selection: BuildSelection | null,
    label: string
  ) {
    if (!record?.good || !activePreset) return
    const effectiveSel: BuildSelection | undefined = selection
      ? selection.weaponOverride
        ? selection
        : targetWeaponOverrideSpec
          ? { ...selection, weaponOverride: targetWeaponOverrideSpec }
          : selection
      : targetWeaponOverrideSpec
        ? { weaponOverride: targetWeaponOverrideSpec, artifactIds: {} }
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
                href={
                  activePreset.source === 'user'
                    ? `/teams?edit=${encodeURIComponent(activePreset.id)}`
                    : `/teams?fork=${encodeURIComponent(activePreset.id)}`
                }
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
          <div className="gi-field-label" style={{ gridColumn: '1 / -1' }}>
            <span className="muted">Rotation Preset</span>
            <PresetTilePicker
              presets={allPresets}
              value={activePreset?.id ?? ''}
              ariaLabel="Preset"
              onChange={(nextId) => {
                setSelectedPresetId(nextId)
                setSelectedWeaponId('')
                setOptResult(null)
                setOptimisedEvals([])
              }}
            />
          </div>
        </div>

        {activePreset && (
          <div
            className="preset-gear-row-md preset-provenance-box"
            data-testid="preset-team-roster"
          >
            <span className="muted" style={{ fontSize: '0.84rem' }}>
              Preset Team:
            </span>
            {activePreset.team.map((m, idx) => {
              const isTarget = idx === 0
              const resolved = resolvePresetMemberBuildMode({
                presetSource: activePreset.source,
                isTarget,
                memberBuildType: m.build.type,
                characterKey: m.key,
                ownedCharKeys,
                overrideMode: activeMemberBuildModes[m.key],
              })
              const isSimulated = isTarget
                ? m.build.type === 'tc' || m.build.type === 'fixed'
                : resolved.mode === 'tc'

              return (
                <div
                  key={m.key}
                  data-testid={`preset-team-member-${m.key}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <CharacterBadge
                    characterKey={m.key}
                    simulated={isSimulated}
                    role={isTarget ? 'target' : 'owned'}
                    compact
                  />
                  {activePreset.source === 'official' && !isTarget && (
                    <button
                      type="button"
                      className="btn-secondary"
                      data-testid={`member-build-toggle-${m.key}`}
                      data-character-key={m.key}
                      data-build-mode={resolved.mode}
                      data-owned-in-good={
                        resolved.ownedInGood ? 'true' : 'false'
                      }
                      data-forced-simulated={
                        resolved.forcedSimulated ? 'true' : 'false'
                      }
                      aria-pressed={resolved.mode === 'tc'}
                      aria-label={
                        resolved.forcedSimulated
                          ? `${displayName(m.key)}: Simulated (Not in GOOD)`
                          : `${displayName(m.key)} build source: ${
                              resolved.mode === 'owned'
                                ? 'Owned Build'
                                : 'Simulated (TC)'
                            }`
                      }
                      title={
                        resolved.forcedSimulated
                          ? `${displayName(m.key)} is not in your imported GOOD file — running simulated preset build`
                          : 'Switch teammate between your Owned GOOD build and the preset Simulated (TC) build'
                      }
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
                        setOptResult(null)
                        setOptimisedEvals([])
                      }}
                      style={{
                        fontSize: '0.82rem',
                        padding: '0.18rem 0.48rem',
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
              )
            })}
          </div>
        )}

        {activePreset && (
          <TeammateFastModePanel
            preset={activePreset}
            ownedCharKeys={ownedCharKeys}
            memberBuildModes={activeMemberBuildModes}
            memberStats={teamMemberStats}
            effectiveFastMode={activeFastMode}
            optimizeMode={optimizeMode}
            onChangeMemberStat={handleChangeMemberFastModeStat}
            onResetMember={handleResetMemberFastMode}
          />
        )}

        {activePreset && <PresetRotationSummary preset={activePreset} />}
      </section>

      {/* 1b. BUFFS & PASSIVES PANEL */}
      {activePreset && (
        <ConditionalTogglePanel
          preset={activePreset}
          settings={settings}
          onChangeSettings={(next) => {
            void updateSettings(next)
            setOptResult(null)
            setOptimisedEvals([])
          }}
          good={record?.good}
          activeTargetWeaponKey={
            targetWeaponOverrideSpec?.key ??
            displayedTargetWeaponSpec?.key ??
            record?.good.weapons.find((w) => w.id === effectiveWeaponId)
              ?.key ??
            record?.good.weapons.find(
              (w) => w.location === activePreset.target
            )?.key
          }
        />
      )}

      {/* 2. WEAPON SELECTION CARD */}
      {activePreset && (
        <section
          className="panel gi-card"
          data-testid="weapon-selection-card"
          aria-label="Weapon Selection"
        >
          {/* Weapon Mode Switcher: Single Weapon vs Compare Weapons */}
          <div
            className="weapon-compare-mode-bar"
            data-testid="optimize-weapon-mode-bar"
            role="group"
            aria-label="Weapon optimization mode"
          >
            <button
              type="button"
              className={`art-filter-mode-btn${
                optimizeMode === 'single' ? ' is-active' : ''
              }`}
              data-testid="optimize-mode-single"
              aria-pressed={optimizeMode === 'single'}
              onClick={() => setOptimizeMode('single')}
            >
              Single Weapon
            </button>
            <button
              type="button"
              className={`art-filter-mode-btn${
                optimizeMode === 'compare' ? ' is-active' : ''
              }`}
              data-testid="optimize-mode-compare"
              aria-pressed={optimizeMode === 'compare'}
              onClick={() => setOptimizeMode('compare')}
            >
              Compare Weapons ({activeCompareCandidates.length})
            </button>
            <button
              type="button"
              className={`art-filter-mode-btn${
                optimizeMode === 'team' ? ' is-active' : ''
              }`}
              data-testid="optimize-mode-team"
              aria-pressed={optimizeMode === 'team'}
              onClick={() => setOptimizeMode('team')}
            >
              Optimize Team
            </button>
          </div>

          {optimizeMode === 'compare' && (
            <WeaponComparisonPanel
              targetCharacterKey={activePreset.target}
              good={record?.good}
              selectedCandidates={activeCompareCandidates}
              onChangeCandidates={(next) => {
                setCompareCandidatesByPreset((prev) => ({
                  ...prev,
                  [activePreset.id]: next,
                }))
                setCompareResult(null)
              }}
            />
          )}

          {/* Target Weapon Selector (Akasha & Official Presets) */}
          {optimizeMode === 'single' &&
            hasTargetWeaponPicker &&
            displayedTargetWeaponSpec && (
              <div
                className="preset-akasha-box"
                data-testid={
                  isAkashaPreset
                    ? 'akasha-weapon-picker-box'
                    : 'official-target-weapon-picker'
                }
              >
                {isAkashaPreset && activePreset.team[0]?.build.type === 'fixed' ? (
                  <>
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
                        {activePreset.team[0].build.character.constellation}{' '}
                        (Talents{' '}
                        {activePreset.team[0].build.character.talent.auto}/
                        {activePreset.team[0].build.character.talent.skill}/
                        {activePreset.team[0].build.character.talent.burst})
                      </span>
                    </div>

                    <div className="muted preset-akasha-desc">
                      Artifact-only mode: fixed character stats &amp; simulated
                      weapon; only your imported GOOD artifacts are used.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="preset-akasha-top">
                      <strong>
                        Target Weapon Selector — {displayName(activePreset.target)}
                      </strong>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          className={targetWeaponOverrideSpec ? 'warn' : 'ok'}
                          data-testid="target-weapon-mode-status"
                          style={{ fontSize: '0.82rem', fontWeight: 600 }}
                        >
                          {targetWeaponOverrideSpec
                            ? `Override: ${displayName(targetWeaponOverrideSpec.key)} R${targetWeaponOverrideSpec.refinement}`
                            : '✓ Default Weapon'}
                        </span>
                        {targetWeaponOverrideSpec && (
                          <button
                            type="button"
                            className="btn-secondary"
                            data-testid="reset-target-weapon-btn"
                            style={{
                              fontSize: '0.82rem',
                              padding: '0.16rem 0.48rem',
                            }}
                            onClick={() => {
                              setAkashaWeaponByPreset((prev) => {
                                const next = { ...prev }
                                delete next[activePreset.id]
                                return next
                              })
                              setOptResult(null)
                              setOptimisedEvals([])
                            }}
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="muted preset-akasha-desc">
                      Choose any{' '}
                      {getCharacterMeta(activePreset.target).weaponType} (owned or
                      simulated) and refinement for{' '}
                      {displayName(activePreset.target)}; both the Current build
                      baseline and the optimizer use the selected weapon.
                    </div>
                  </>
                )}

                <div className="preset-akasha-controls">
                  <WeaponBadge
                    weaponKey={displayedTargetWeaponSpec.key}
                    subtitle={`R${displayedTargetWeaponSpec.refinement} · Lv.${displayedTargetWeaponSpec.level ?? 90}`}
                  />

                  <label className="presets-filter-label-sm">
                    <span className="muted">Refinement:</span>
                    <select
                      aria-label="Weapon Refinement"
                      data-testid="target-weapon-refinement-select"
                      value={displayedTargetWeaponSpec.refinement}
                      disabled={
                        getWeaponMeta(displayedTargetWeaponSpec.key).rarity <= 2
                      }
                      onChange={(e) => {
                        const nextRef = Number(e.target.value)
                        setAkashaWeaponByPreset((prev) => ({
                          ...prev,
                          [activePreset.id]: {
                            key: displayedTargetWeaponSpec.key,
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

                <WeaponTilePicker
                  ariaLabel="Simulated Weapon"
                  value={displayedTargetWeaponSpec.key}
                  options={availableAkashaWeapons.map((w) => ({
                    id: w.key,
                    weaponKey: w.key,
                    label: w.displayName,
                  }))}
                  onChange={(nextKey) => {
                    const meta = getWeaponMeta(nextKey)
                    const nextRef =
                      meta.rarity <= 2
                        ? 1
                        : displayedTargetWeaponSpec.refinement
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
                />
              </div>
            )}

          {optimizeMode === 'single' &&
            !isAkashaPreset &&
            matchReport && (
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
                        <div
                          className="preset-match-candidates"
                          style={{ marginTop: '0.4rem', width: '100%' }}
                        >
                          <WeaponTilePicker
                            ariaLabel="Qualifying Weapon Copy"
                            value={
                              selectedWeaponId ||
                              matchReport.selectedWeaponId ||
                              pt.candidates[0]!.id
                            }
                            options={pt.candidates.map((cand) => ({
                              id: cand.id,
                              weaponKey: cand.key,
                              label: displayName(cand.key),
                              subcaption: `R${cand.refinement} Lv.${cand.level} ${
                                cand.location
                                  ? `(${displayName(cand.location)})`
                                  : '(Inventory)'
                              }`,
                            }))}
                            onChange={(nextId) => setSelectedWeaponId(nextId)}
                          />
                        </div>
                      )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 3a. ARTIFACT SETTINGS CARD */}
      <section
        className="panel gi-card"
        data-testid="artifact-settings-card"
        aria-label="Artifact Settings"
      >
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
          className="opt-filter-pair"
          data-testid="optimize-filter-panels-pair"
        >
          <div
            className="opt-filter-panel"
            data-testid="protected-characters-panel"
          >
            <div className="opt-filter-panel-header">
              <span className="opt-filter-panel-title">
                Protected Characters
              </span>
              <span
                data-testid="protected-characters-summary"
                className="opt-filter-panel-summary"
                style={{
                  color:
                    settings.excludedCharacters.length > 0
                      ? 'var(--warn)'
                      : 'var(--ok)',
                }}
              >
                {settings.excludedCharacters.length > 0
                  ? `${settings.excludedCharacters.length} protected`
                  : 'None protected'}
              </span>
            </div>

            <div className="opt-filter-panel-subbar">
              <span className="opt-filter-panel-hint">
                Click a character tile to keep or release their equipped
                artifacts.
              </span>
            </div>

            {(record?.good.characters ?? []).length > 0 ? (
              <CharacterTilePicker
                ariaLabel="Protect character"
                searchable
                selectedKeys={settings.excludedCharacters}
                options={(record?.good.characters ?? []).map((c) => ({
                  key: c.key,
                  label: displayName(c.key),
                  subcaption: settings.excludedCharacters.includes(c.key)
                    ? 'Protected'
                    : `Lv.${c.level} C${c.constellation}`,
                }))}
                onChange={(ck) => {
                  const isProtected = settings.excludedCharacters.includes(ck)
                  void updateSettings({
                    ...settings,
                    excludedCharacters: isProtected
                      ? settings.excludedCharacters.filter((x) => x !== ck)
                      : [...settings.excludedCharacters, ck],
                  })
                }}
              />
            ) : (
              <div className="tile-picker-wrap">
                <div className="tile-picker-toolbar">
                  <input
                    type="search"
                    className="tile-picker-search"
                    aria-label="Search Protect character"
                    placeholder="Search characters…"
                    disabled
                    value=""
                    readOnly
                  />
                </div>
                <div
                  role="group"
                  aria-label="Protect character"
                  className="tile-picker-grid"
                >
                  <div
                    className="muted"
                    style={{
                      gridColumn: '1 / -1',
                      fontSize: '0.82rem',
                      padding: '0.4rem',
                    }}
                  >
                    Import a GOOD file to select characters to protect.
                  </div>
                </div>
              </div>
            )}
          </div>

          <ArtifactSetFilter
            settings={settings}
            onChange={(next) => void updateSettings(next)}
          />
        </div>

        {/* GO-Style Deep Artifact Pool Filters */}
        <SolverPoolFiltersPanel
          settings={settings}
          onChange={(next) => void updateSettings(next)}
        />
      </section>

      {/* 3b. CONSTRAINTS CARD */}
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
            {evaluating && !running && !compareRunning && !teamRunning && (
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

            {optimizeMode === 'compare' ? (
              !compareRunning ? (
                <button
                  type="button"
                  className="btn-run-primary btn-icon"
                  data-testid="run-weapon-compare-btn"
                  disabled={
                    !record?.good ||
                    !activePreset ||
                    activeCompareCandidates.length < 2
                  }
                  title={
                    activeCompareCandidates.length < 2
                      ? 'Select at least 2 weapons to run a comparison'
                      : undefined
                  }
                  onClick={() => void startWeaponComparison()}
                >
                  <PlayIcon size={16} />
                  <span>
                    Compare Weapons ({activeCompareCandidates.length})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-run-cancel btn-icon"
                  data-testid="cancel-weapon-compare-btn"
                  onClick={cancelWeaponComparison}
                >
                  <StopIcon size={16} />
                  <span>Cancel</span>
                </button>
              )
            ) : optimizeMode === 'team' ? (
              !teamRunning ? (
                <button
                  type="button"
                  className="btn-run-primary btn-icon"
                  data-testid="run-team-optimize-btn"
                  disabled={!canRunPreset}
                  onClick={() => void startTeamOptimization()}
                >
                  <PlayIcon size={16} />
                  <span>Optimize Team</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-run-cancel btn-icon"
                  data-testid="cancel-team-optimize-btn"
                  onClick={cancelTeamOptimization}
                >
                  <StopIcon size={16} />
                  <span>Cancel</span>
                </button>
              )
            ) : !running ? (
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

        {optimizeMode === 'compare' ? (
          <>
            {compareRunning && compareProgress && (
              <div
                className="preset-provenance-box"
                data-testid="weapon-compare-progress-card"
              >
                <ProgressBar
                  tested={compareProgress.solverProgress.tested}
                  skipped={compareProgress.solverProgress.skipped}
                  total={compareProgress.solverProgress.total}
                  label={`Comparing weapon ${compareProgress.weaponIndex + 1} of ${compareProgress.totalWeapons}: ${displayName(compareProgress.weaponKey)}…`}
                />
              </div>
            )}

            {compareResult && !compareRunning && (
              <div
                className="preset-provenance-box ok"
                style={{ fontSize: '0.88rem' }}
                data-testid="weapon-compare-summary-banner"
              >
                {compareResult.cancelled
                  ? `Cancelled — showing ${compareResult.rows.length} completed weapon(s).`
                  : `✓ Compared ${compareResult.rows.length} weapon(s) under shared settings and stat constraints.`}
              </div>
            )}

            {compareError && (
              <div className="gi-empty-card gi-empty-card-err" role="alert">
                Error: {compareError}
              </div>
            )}

            {!compareRunning && !compareResult && (
              <div
                className="gi-empty-card"
                data-testid="weapon-compare-idle-card"
              >
                {activeCompareCandidates.length < 2 ? (
                  <span data-testid="weapon-compare-min-reason">
                    Select at least 2 weapons above to run a comparison
                    (currently {activeCompareCandidates.length} selected).
                  </span>
                ) : (
                  <>
                    Select weapons above and click{' '}
                    <strong>Compare Weapons</strong> to rank their best builds
                    under the current setup and stat constraints.
                  </>
                )}
              </div>
            )}

            {compareResult && activePreset && (
              <WeaponComparisonList
                preset={activePreset}
                result={compareResult}
                artifactById={artifactById}
                currentBuild={
                  showCurrentComparison && currentSelection && currentEval
                    ? {
                        selection: currentSelection,
                        evaluation: currentEval,
                      }
                    : null
                }
                onExportGO={(sel, label) => void handleExportGO(sel, label)}
              />
            )}
          </>
        ) : optimizeMode === 'team' ? (
          <>
            {teamRunning && teamProgress && (
              <div
                className="preset-provenance-box"
                data-testid="team-optimize-progress-card"
              >
                <ProgressBar
                  tested={teamProgress.solverProgress.tested}
                  skipped={teamProgress.solverProgress.skipped}
                  total={teamProgress.solverProgress.total}
                  label={`Optimizing member ${teamProgress.memberIndex + 1} of ${teamProgress.totalMembers}: ${displayName(teamProgress.memberKey)}…`}
                />
              </div>
            )}

            {teamResult && !teamRunning && (
              <div
                className="preset-provenance-box ok"
                style={{ fontSize: '0.88rem' }}
                data-testid="team-optimize-summary-banner"
              >
                ✓ Team optimized in {(teamResult.durationMs / 1000).toFixed(2)}s
                — solved{' '}
                {teamResult.members.filter((m) => !m.skippedSolver).length}{' '}
                active member(s) without artifact reuse (
                {teamResult.tested.toLocaleString()} tested,{' '}
                {teamResult.skipped.toLocaleString()} pruned).
              </div>
            )}

            {teamError && (
              <div className="gi-empty-card gi-empty-card-err" role="alert">
                Error: {teamError}
              </div>
            )}

            {!teamRunning && !teamResult && (
              <div
                className="gi-empty-card"
                data-testid="team-optimize-idle-card"
              >
                Click <strong>Optimize Team</strong> to solve artifacts across
                all team members with rotation rows in team order without
                reusing any artifact piece.
              </div>
            )}

            {teamResult && activePreset && (
              <TeamOptimizationList
                preset={activePreset}
                result={teamResult}
                artifactById={artifactById}
              />
            )}
          </>
        ) : (
          <>
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
                <div
                  className="gi-empty-card"
                  data-testid="akasha-no-current-card"
                >
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
          </>
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
