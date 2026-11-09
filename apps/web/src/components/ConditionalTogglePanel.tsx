'use client'

import {
  ArtifactBadge,
  CharacterBadge,
  WeaponBadge,
} from '@/components/Identifier'
import {
  ChevronToggle,
  ElementIcon,
  SetEmblemIcon,
  WeaponTypeIcon,
} from '@/components/SvgIcons'
import {
  MemberCompactStatGrid,
  MemberFastModeExpander,
} from '@/components/TeammateFastModePanel'
import { getCatalogInWorker } from '@/lib/engine/workerClient'
import { getCharacterMeta } from '@/lib/itemMeta'
import {
  prettifyConditionalKey,
  type ConditionalDescriptor,
  type ConditionalStateDescriptor,
  type MemberStatSummary,
  type SimulatedWeaponSpec,
} from '@gi/engine'
import type { IGOOD } from '@gi/good'
import {
  CONSTELLATION_VALUES,
  applyMemberConditionalOverrides,
  displayName,
  getPresetConditionalOverrides,
  getPresetConstellationOverrides,
  getPresetMemberBuildModes,
  getPresetResonanceEffects,
  getPresetResonanceEnabled,
  hasDisabledResonanceEffects,
  hasMemberConditionalOverrides,
  hasMemberConstellationOverride,
  hasMemberFastMode,
  listTriggeredResonances,
  readEffectiveConditionalValue,
  resetMemberConditionalOverrides,
  resetMemberConstellationOverrides,
  resolvePresetMemberBuildMode,
  resolvePresetMemberConstellation,
  seedCandidateTargetConditionals,
  setMemberConditionalOverride,
  setMemberConstellationOverride,
  setPresetResonanceEffectEnabled,
  setPresetResonanceEnabled,
  type FastModeStatKey,
  type FastModeStats,
  type MemberBuildMode,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type Preset,
  type ResolvedMemberConstellation,
  type ResonanceEffectKey,
  type TeamMember,
} from '@gi/presets'
import { useEffect, useMemo, useState } from 'react'

export interface StageMemberEditorConfig {
  member: TeamMember
  isTarget: boolean
  resolved: {
    mode: MemberBuildMode
    ownedInGood: boolean
    forcedSimulated: boolean
  }
  isSimulated: boolean
  isWeaponLocked: boolean
  isCompareTargetWeapon?: boolean
  effectiveWeaponSpec: SimulatedWeaponSpec
  isOverridden: boolean
  memberStats?: MemberStatSummary
  fastModeStats?: FastModeStats
  fastModeAvailable: boolean
  onOpenWeaponModal: () => void
  onResetWeapon: () => void
  onToggleBuildMode?: (nextMode: MemberBuildMode) => void
  onChangeFastModeStat: (
    statKey: FastModeStatKey,
    value: number | undefined
  ) => void
  onResetFastMode: () => void
}

export interface ConditionalTogglePanelProps {
  preset: Preset
  settings: OptimizerSettings
  onChangeSettings: (next: OptimizerSettings) => void
  good?: IGOOD | null
  /** Resolved weapon key for the target character (slot 0), e.g. from Akasha weapon picker or owned weapon selection. */
  activeTargetWeaponKey?: string
  /** Optional pre-loaded conditional catalog (used in unit tests or SSR). */
  conditionalsByChar?: Record<string, ConditionalDescriptor[]>
  /** When true, renders Buffs & Passives as a collapsible section (starts open if modified, closed if default). */
  collapsible?: boolean
  /** When true, renders directly inside Stage 3 (Team & Buffs) without a separate sub-panel card or header. */
  embedded?: boolean
  /** Per-member Stage 3 editor state & handlers (weapon row, build-state pill/toggle, Base->Final stats, Fast Mode modal trigger). */
  stageMembers?: Record<string, StageMemberEditorConfig>
}

const SECTION_SHORT_BADGE: Record<string, string> = {
  normal: 'Normal',
  charged: 'Charged',
  plunging: 'Plunge',
  skill: 'Skill',
  burst: 'Burst',
  passive1: 'A1',
  passive2: 'A4',
  passive3: 'Passive',
  constellation1: 'C1',
  constellation2: 'C2',
  constellation3: 'C3',
  constellation4: 'C4',
  constellation5: 'C5',
  constellation6: 'C6',
  constellation: 'Const.',
  set2: '2pc',
  set4: '4pc',
}

export function cleanConditionalLabel(
  cond: ConditionalDescriptor,
  sheetDisplayName: string
): string {
  const prefix = `${sheetDisplayName} — `
  const raw = cond.name.startsWith(prefix)
    ? cond.name.slice(prefix.length).trim()
    : cond.name.trim()
  if (!raw) {
    return prettifyConditionalKey(cond.key)
  }
  if (raw === cond.key || /^[a-z0-9_.:]+$/i.test(raw)) {
    return prettifyConditionalKey(raw)
  }
  return raw
}

export function formatStateOptionLabel(st: ConditionalStateDescriptor): string {
  if (!st.name || st.name === st.key) {
    if (st.key === 'on') return 'Active (On)'
    if (/^\d+$/.test(st.key)) return `${st.key} Stack${st.key === '1' ? '' : 's'}`
    return prettifyConditionalKey(st.key)
  }
  if (/^[a-z0-9_.:]+$/i.test(st.name) && !/^\d+(\.\d+)?%?$/.test(st.name)) {
    return prettifyConditionalKey(st.name)
  }
  return st.name
}

const STATIC_GO_CONDITIONAL_LABELS: Record<
  string,
  { label: string; states?: Record<string, string> }
> = {
  'ArchaicPetra.element': {
    label:
      'After obtaining a Crystallize Shard or triggering a Lunar-Crystallize reaction',
    states: { hydro: 'Hydro', pyro: 'Pyro', cryo: 'Cryo', electro: 'Electro' },
  },
  'Arlecchino.bondPercent': {
    label: 'Current Life Bond percentage',
    states: { '130': '130%' },
  },
  'Bennett.activeInArea': {
    label: "Character is inside the ability's field",
    states: { activeInArea: 'Active In Area' },
  },
  'Citlali.a1NsFreezeMelt': {
    label:
      'While Itzpapa is on the field, and a nearby party member triggers Frozen or Melt reaction',
    states: { on: 'Active (On)' },
  },
  'CrimsonWitchOfFlames.stack': {
    label: 'After using Elemental Skill',
    states: { '1': '1 Stack', '2': '2 Stacks', '3': '3 Stacks' },
  },
  'EngulfingLightning.TimelessDream': {
    label: 'After using Elemental Burst',
    states: { on: 'Active (On)' },
  },
  'FragmentOfHarmonicWhimsy.stacks': {
    label: 'After the value of a Bond of Life increases or decreases',
    states: { '1': '1 Time', '2': '2 Times', '3': '3 Times' },
  },
  'Furina.burstFanfare': {
    label: 'Fanfare',
  },
  'Furina.c2Overstack': {
    label: 'Fanfare above the limit',
  },
  'Furina.skillHpConsumeStacks': {
    label: 'Number of characters who offered HP',
    states: {
      '1': '1 Member',
      '2': '2 Members',
      '3': '3 Members',
      '4': '4 Members',
    },
  },
  'GoldenTroupe.set4': {
    label: 'Character is off-field',
    states: { on: 'Active (On)' },
  },
  'HuTao.GuideToAfterlifeVoyage': {
    label: 'In the Paramita Papilio state',
    states: { on: 'Active (On)' },
  },
  'HuTao.SanguineRouge': {
    label: 'HP less than or equal to 50%',
    states: { on: 'Active (On)' },
  },
  'KaedeharaKazuha.swirlelectro': {
    label: 'After triggering an Electro Swirl reaction',
    states: { electro: 'After triggering an Electro Swirl reaction' },
  },
  'KaedeharaKazuha.swirlhydro': {
    label: 'After triggering a Hydro Swirl reaction',
    states: { hydro: 'After triggering a Hydro Swirl reaction' },
  },
  'KujouSara.c6': {
    label: 'Character has had their ATK increased by Tengu Juurai',
    states: { c6: 'C6' },
  },
  'KujouSara.TenguJuuraiAmbush': {
    label: 'Under the effects of Tengu Juurai: Ambush',
    states: { TenguJuuraiAmbush: 'Tengu Juurai Ambush' },
  },
  'MarechausseeHunter.set4': {
    label: 'After HP changes',
    states: { '1': '1 Stack', '2': '2 Stacks', '3': '3 Stacks' },
  },
  'Mavuika.a1NsBurst': {
    label: 'After nearby party members trigger a Nightsoul Burst',
    states: { on: 'Active (On)' },
  },
  'Mavuika.a4TimeSinceBurst': {
    label: 'Time since burst used',
    states: { '0': '0 Seconds' },
  },
  'Mavuika.burstSpirit': {
    label: 'Fighting Spirit',
  },
  'Neuvillette.a1Stacks': {
    label: 'Past Draconic Glories',
    states: { '1': '1 Stack', '2': '2 Stacks', '3': '3 Stacks' },
  },
  'Neuvillette.a4Hp': {
    label: '% Current HP',
    states: { '50': '80%' },
  },
  'NoblesseOblige.set4': {
    label: 'After using Elemental Burst',
    states: { on: 'Active (On)' },
  },
  'ObsidianCodex.2NightsoulBlessing': {
    label: "Character in Nightsoul's Blessing and on the field",
    states: { on: 'Active (On)' },
  },
  'ObsidianCodex.4NightsoulConsume': {
    label: 'Character consumes 1 Nightsoul point while on the field',
    states: { on: 'Active (On)' },
  },
  'RaidenShogun.burstResolve': {
    label: 'Resolve Stacks',
    states: {
      '10': '10 Stacks',
      '20': '20 Stacks',
      '30': '30 Stacks',
      '40': '40 Stacks',
      '50': '50 Stacks',
      '60': '60 Stacks',
    },
  },
  'RaidenShogun.skillEye': {
    label: 'Carrying the Eye of Stormy Judgement',
    states: { skillEye: 'Skill Eye' },
  },
  'ScrollOfTheHeroOfCinderCity.nightsoul_pyro': {
    label:
      "After triggering a Pyro-related Elemental Reaction while in Nightsoul's Blessing",
    states: {
      pyro: "After triggering a Pyro-related Elemental Reaction while in Nightsoul's Blessing",
    },
  },
  'ScrollOfTheHeroOfCinderCity.react_pyro': {
    label: 'After triggering a Pyro-related Elemental Reaction',
    states: {
      pyro: 'After triggering a Pyro-related Elemental Reaction',
    },
  },
  'SplendorOfTranquilWaters.selfHpChange': {
    label: 'After HP changes',
    states: { '1': '1 Time', '2': '2 Times', '3': '3 Times' },
  },
  'SplendorOfTranquilWaters.teamHpChange': {
    label: "After a teammate's HP changes",
    states: { '1': '1 Time', '2': '2 Times' },
  },
  'StaffOfHoma.RecklessCinnabar': {
    label: 'HP less than 50%',
    states: { on: 'Active (On)' },
  },
  'StaffOfTheScarletSands.stacks': {
    label: 'After hitting an opponent with an Elemental Skill',
    states: { '1': '1 Hit', '2': '2 Hits', '3': '3 Hits' },
  },
  'TenacityOfTheMillelith.skill': {
    label: 'After hitting an opponent with an Elemental Skill',
    states: { cast: 'Cast' },
  },
  'ThrillingTalesOfDragonSlayers.Heritage': {
    label: 'After switching from this character',
    states: { on: 'Active (On)' },
  },
  'ViridescentVenerer.swirlelectro': {
    label: 'After triggering an Electro Swirl reaction',
    states: { electro: 'After triggering an Electro Swirl reaction' },
  },
  'ViridescentVenerer.swirlhydro': {
    label: 'After triggering a Hydro Swirl reaction',
    states: { hydro: 'After triggering a Hydro Swirl reaction' },
  },
  'Xilonen.sourceActive': {
    label: 'Nighsoul Points hit the maximum',
    states: { on: 'Active (On)' },
  },
  'Yelan.a4Stacks': {
    label: 'After using Elemental Burst',
    states: { '8': '8 Seconds' },
  },
  'Zhongli.skill': {
    label: 'Enemy is near the Jade Shield',
    states: { on: 'Active (On)' },
  },
}

/**
 * Formats an active conditional entry (`sheetKey`, `condKey`, `stateValue`) into
 * human-readable words using the same label source as the Buffs & Passives panel.
 */
export function formatHumanConditionalEntry(
  sheetKey: string,
  condKey: string,
  stateValue: string,
  catalog?: readonly ConditionalDescriptor[]
): string {
  const sheetDisplayName = displayName(sheetKey)
  const desc = catalog?.find((c) => c.sheet === sheetKey && c.key === condKey)
  if (desc) {
    const condLabel = cleanConditionalLabel(desc, sheetDisplayName)
    const stateDesc = desc.states.find((s) => s.key === stateValue)
    const stateLabel = stateDesc
      ? formatStateOptionLabel(stateDesc)
      : formatStateOptionLabel({ key: stateValue, name: stateValue })
    if (stateLabel === condLabel) {
      return `${sheetDisplayName}: ${condLabel}`
    }
    return `${sheetDisplayName}: ${condLabel} (${stateLabel})`
  }

  const staticEntry = STATIC_GO_CONDITIONAL_LABELS[`${sheetKey}.${condKey}`]
  if (staticEntry) {
    const condLabel = staticEntry.label
    const mappedState = staticEntry.states?.[stateValue]
    const stateLabel =
      mappedState ??
      formatStateOptionLabel({ key: stateValue, name: stateValue })
    if (stateLabel === condLabel) {
      return `${sheetDisplayName}: ${condLabel}`
    }
    return `${sheetDisplayName}: ${condLabel} (${stateLabel})`
  }

  const fallbackCondLabel =
    condKey === 'set4'
      ? '4-Piece Bonus'
      : condKey === 'set2'
        ? '2-Piece Bonus'
        : prettifyConditionalKey(condKey)
  const fallbackStateLabel = formatStateOptionLabel({
    key: stateValue,
    name: stateValue,
  })
  if (fallbackStateLabel === fallbackCondLabel) {
    return `${sheetDisplayName}: ${fallbackCondLabel}`
  }
  return `${sheetDisplayName}: ${fallbackCondLabel} (${fallbackStateLabel})`
}

function deriveDefaultArtSetConditionalsFromCatalog(
  catalog: ConditionalDescriptor[]
): MemberConditionalsMap {
  const out: MemberConditionalsMap = {}
  for (const cond of catalog) {
    if (cond.category !== 'artifact') continue
    if (
      cond.sheet === 'ScrollOfTheHeroOfCinderCity' &&
      cond.key.startsWith('react_')
    ) {
      continue
    }
    if (cond.states.length === 1 && cond.states[0]?.key === 'on') {
      if (!out[cond.sheet]) {
        out[cond.sheet] = {}
      }
      out[cond.sheet]![cond.key] = 'on'
    }
  }
  return out
}

export function deriveDefaultMemberConditionalsInUi(opts: {
  preset: Preset
  memberIndex: number
  resolvedMode: MemberBuildMode
  activeTargetWeaponKey?: string
  memberOwnedWeaponKey?: string
  memberCatalog: ConditionalDescriptor[]
}): MemberConditionalsMap {
  const {
    preset,
    memberIndex,
    resolvedMode,
    activeTargetWeaponKey,
    memberOwnedWeaponKey,
    memberCatalog,
  } = opts
  const member = preset.team[memberIndex]
  if (!member) return {}
  const isTarget = memberIndex === 0
  const isOfficialOwnedMember =
    !isTarget && preset.source === 'official' && resolvedMode === 'owned'

  const defaultArtSetConds =
    deriveDefaultArtSetConditionalsFromCatalog(memberCatalog)

  if (isOfficialOwnedMember) {
    const out: MemberConditionalsMap = {}
    for (const [setKey, states] of Object.entries(defaultArtSetConds)) {
      out[setKey] = { ...states }
    }
    if (memberOwnedWeaponKey) {
      const wepConds = memberCatalog.filter(
        (c) => c.category === 'weapon' && c.sheet === memberOwnedWeaponKey
      )
      if (wepConds.length > 0) {
        const sheetStates: Record<string, string> = {}
        for (const wc of wepConds) {
          const maxState = wc.states[wc.states.length - 1]
          if (maxState) {
            sheetStates[wc.key] = maxState.key
          }
        }
        out[memberOwnedWeaponKey] = sheetStates
      }
    }
    return out
  }

  let out: MemberConditionalsMap = {}
  for (const [sKey, sMap] of Object.entries(member.conditional ?? {})) {
    if (sMap) {
      out[sKey] = { ...sMap }
    }
  }

  if (isTarget) {
    for (const [setKey, states] of Object.entries(defaultArtSetConds)) {
      if (!member.conditional[setKey]) {
        out[setKey] = { ...states }
      }
    }
  }

  if (
    isTarget &&
    (member.build.type === 'fixed' || member.build.type === 'owned') &&
    activeTargetWeaponKey &&
    !member.conditional[activeTargetWeaponKey]
  ) {
    const wepConds = memberCatalog.filter(
      (c) => c.category === 'weapon' && c.sheet === activeTargetWeaponKey
    )
    if (wepConds.length > 0) {
      const sheetStates: Record<string, string> = {}
      for (const wc of wepConds) {
        const maxState = wc.states[wc.states.length - 1]
        if (maxState) {
          sheetStates[wc.key] = maxState.key
        }
      }
      out = {
        ...out,
        [activeTargetWeaponKey]: sheetStates,
      }
    }
  }

  if (
    out.ArchaicPetra?.ele &&
    !out.ArchaicPetra.element &&
    preset.id !== 'akasha/furina-salon-pjc-c0' &&
    preset.id !== 'akasha/neuvillette-hypercarry-protoamber-c0' &&
    preset.id !== 'official/neuvillette-hypercarry'
  ) {
    out = {
      ...out,
      ArchaicPetra: {
        ...out.ArchaicPetra,
        element: out.ArchaicPetra.ele,
      },
    }
  }

  return out
}

export function ConditionalTogglePanel({
  preset,
  settings,
  onChangeSettings,
  good,
  activeTargetWeaponKey,
  conditionalsByChar: providedCatalog,
  collapsible = false,
  embedded = false,
  stageMembers,
}: ConditionalTogglePanelProps) {
  const [loadedCatalog, setLoadedCatalog] = useState<
    Record<string, ConditionalDescriptor[]>
  >({})
  const [selectedMemberKey, setSelectedMemberKey] = useState<string>(
    () => preset.team[0]?.key ?? ''
  )
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null)

  const teamKeys = useMemo(
    () => preset.team.slice(0, 4).map((m) => m.key),
    [preset.team]
  )
  const teamKeysSig = teamKeys.join(',')

  useEffect(() => {
    if (providedCatalog) return
    if (typeof getCatalogInWorker !== 'function') return
    let cancelled = false
    const keys = teamKeysSig ? teamKeysSig.split(',') : []
    void Promise.resolve(getCatalogInWorker(keys)).then((res) => {
      if (!cancelled && res?.conditionalsByChar) {
        setLoadedCatalog((prev) => ({
          ...prev,
          ...res.conditionalsByChar,
        }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [teamKeysSig, providedCatalog])

  const catalogByChar = providedCatalog ?? loadedCatalog

  const ownedCharKeys = useMemo(
    () => new Set((good?.characters ?? []).map((c) => c.key)),
    [good]
  )

  const memberBuildModes = useMemo(
    () => getPresetMemberBuildModes(settings, preset.id),
    [settings, preset.id]
  )

  const presetOverrides = useMemo(
    () => getPresetConditionalOverrides(settings, preset.id),
    [settings, preset.id]
  )

  const presetConstellationOverrides = useMemo(
    () => getPresetConstellationOverrides(settings, preset.id),
    [settings, preset.id]
  )

  const resonanceEnabled = useMemo(
    () => getPresetResonanceEnabled(settings, preset.id),
    [settings, preset.id]
  )

  const triggeredResonances = useMemo(
    () => listTriggeredResonances(preset),
    [preset]
  )

  const resonanceEffects = useMemo(
    () => getPresetResonanceEffects(settings, preset.id),
    [settings, preset.id]
  )

  const hasDisabledTriggeredResonance = useMemo(
    () => hasDisabledResonanceEffects(resonanceEffects, preset),
    [resonanceEffects, preset]
  )

  const anyPresetOverrides = useMemo(
    () =>
      hasMemberConditionalOverrides(settings, preset.id) ||
      hasMemberConstellationOverride(settings, preset.id) ||
      !resonanceEnabled ||
      hasDisabledTriggeredResonance,
    [settings, preset.id, resonanceEnabled, hasDisabledTriggeredResonance]
  )

  function handleToggleResonance() {
    onChangeSettings(
      setPresetResonanceEnabled(settings, preset.id, !resonanceEnabled)
    )
  }

  function handleToggleResonanceEffect(resKey: ResonanceEffectKey) {
    const isCurrentlyOn = resonanceEnabled && resonanceEffects[resKey] !== false
    if (!resonanceEnabled) {
      let next = setPresetResonanceEnabled(settings, preset.id, true)
      for (const r of triggeredResonances) {
        if (r.key !== resKey) {
          next = setPresetResonanceEffectEnabled(next, preset.id, r.key, false)
        }
      }
      onChangeSettings(
        setPresetResonanceEffectEnabled(next, preset.id, resKey, true)
      )
      return
    }
    onChangeSettings(
      setPresetResonanceEffectEnabled(
        settings,
        preset.id,
        resKey,
        !isCurrentlyOn
      )
    )
  }

  function handleSetCondState(
    characterKey: string,
    sheetKey: string,
    condKey: string,
    nextValue: string
  ) {
    onChangeSettings(
      setMemberConditionalOverride(
        settings,
        preset.id,
        characterKey,
        sheetKey,
        condKey,
        nextValue
      )
    )
  }

  function handleSetMemberConstellation(
    characterKey: string,
    nextConstellation: number,
    defaultConstellation: number
  ) {
    onChangeSettings(
      setMemberConstellationOverride(
        settings,
        preset.id,
        characterKey,
        nextConstellation,
        defaultConstellation
      )
    )
  }

  function handleResetMember(characterKey: string) {
    const nextConds = resetMemberConditionalOverrides(
      settings,
      preset.id,
      characterKey
    )
    onChangeSettings(
      resetMemberConstellationOverrides(nextConds, preset.id, characterKey)
    )
  }

  function handleResetAll() {
    const nextConds = resetMemberConditionalOverrides(settings, preset.id)
    onChangeSettings(resetMemberConstellationOverrides(nextConds, preset.id))
  }

  const memberEntries = preset.team.slice(0, 4).map((member, idx) => {
    const mKey = member.key
    const isTarget = idx === 0
    const charMeta = getCharacterMeta(mKey)
    const locKey = mKey.startsWith('Traveler') ? 'Traveler' : mKey
    const stageMember = stageMembers?.[mKey]

    const resolvedBuild =
      stageMember?.resolved ??
      resolvePresetMemberBuildMode({
        presetSource: preset.source,
        isTarget,
        memberBuildType: member.build.type,
        characterKey: mKey,
        ownedCharKeys,
        overrideMode: memberBuildModes[mKey],
      })

    const isSimulated = stageMember
      ? stageMember.isSimulated
      : isTarget
        ? member.build.type === 'tc' || member.build.type === 'fixed'
        : resolvedBuild.mode === 'tc'

    const isFastModeActive = Boolean(
      stageMember &&
        !isTarget &&
        stageMember.fastModeAvailable &&
        hasMemberFastMode(stageMember.fastModeStats)
    )

    const equippedGoodWeaponKey = (good?.weapons ?? []).find(
      (w) => w.location === locKey
    )?.key

    const resolvedTargetWeaponKey =
      stageMember?.effectiveWeaponSpec.key ??
      activeTargetWeaponKey ??
      (member.build.type === 'fixed'
        ? member.build.weapon.key
        : equippedGoodWeaponKey ?? member.requirement?.weapon?.key)

    let memberWeaponKey: string | undefined =
      stageMember?.effectiveWeaponSpec.key
    const memberArtSets: Record<string, number> = {}

    if (isTarget) {
      memberWeaponKey = memberWeaponKey ?? resolvedTargetWeaponKey
      for (const art of good?.artifacts ?? []) {
        if (art.location === locKey && art.setKey) {
          memberArtSets[art.setKey] = (memberArtSets[art.setKey] ?? 0) + 1
        }
      }
    } else if (resolvedBuild.mode === 'owned') {
      memberWeaponKey = memberWeaponKey ?? equippedGoodWeaponKey
      for (const art of good?.artifacts ?? []) {
        if (art.location === locKey && art.setKey) {
          memberArtSets[art.setKey] = (memberArtSets[art.setKey] ?? 0) + 1
        }
      }
    } else if (member.build.type === 'tc') {
      memberWeaponKey = memberWeaponKey ?? member.build.tc.weapon.key
      for (const [sk, cnt] of Object.entries(
        member.build.tc.artifact.sets ?? {}
      )) {
        if (typeof cnt === 'number' && cnt > 0) {
          memberArtSets[sk] = cnt
        }
      }
    } else if (member.build.type === 'fixed') {
      memberWeaponKey = memberWeaponKey ?? member.build.weapon.key
    }

    const memberCatalog = catalogByChar[mKey] ?? []

    const defaultMap = deriveDefaultMemberConditionalsInUi({
      preset,
      memberIndex: idx,
      resolvedMode: resolvedBuild.mode,
      activeTargetWeaponKey: resolvedTargetWeaponKey,
      memberOwnedWeaponKey:
        stageMember?.effectiveWeaponSpec.key ?? equippedGoodWeaponKey,
      memberCatalog,
    })

    const memberOverrides = presetOverrides[mKey]
    const effectiveMap = applyMemberConditionalOverrides(
      defaultMap,
      memberOverrides
    )
    const goodCharConstellation = (good?.characters ?? []).find(
      (c) => c.key === mKey
    )?.constellation
    const resolvedConstellation = resolvePresetMemberConstellation({
      preset,
      memberIndex: idx,
      resolvedMode: resolvedBuild.mode,
      goodCharacterConstellation: goodCharConstellation,
      overrideConstellation: presetConstellationOverrides[mKey],
    })
    const hasMemberOverride =
      hasMemberConditionalOverrides(settings, preset.id, mKey) ||
      resolvedConstellation.isOverridden

    // 1. Weapon conditionals: active weapon + any weapon with authored/overridden state
    const weaponConditionals = memberCatalog.filter((c) => {
      if (c.category !== 'weapon') return false
      if (memberWeaponKey && c.sheet === memberWeaponKey) return true
      if (
        readEffectiveConditionalValue(effectiveMap, c.sheet, c.key) !== 'off'
      ) {
        return true
      }
      if (memberOverrides?.[c.sheet]?.[c.key] !== undefined) return true
      return false
    })

    // 2. Artifact set conditionals: ONLY show sets worn as 2pc or 4pc (count >= 2) in current build context
    const activeWornSets = Object.entries(memberArtSets).filter(
      ([, cnt]) => cnt >= 2
    )
    const wornSetKeys = new Set(activeWornSets.map(([sk]) => sk))
    const visibleArtifactConditionals = memberCatalog.filter(
      (c) => c.category === 'artifact' && wornSetKeys.has(c.sheet)
    )

    // 3. Character passives & talents
    const characterConditionals = memberCatalog.filter(
      (c) =>
        c.category === 'character' &&
        (c.sheet === mKey || c.sheet.startsWith('Traveler'))
    )

    // 4. Constellation conditionals
    const constellationConditionals = memberCatalog.filter(
      (c) =>
        c.category === 'constellation' &&
        (c.sheet === mKey || c.sheet.startsWith('Traveler'))
    )

    const activeCheckPool = [
      ...weaponConditionals,
      ...visibleArtifactConditionals,
      ...characterConditionals,
      ...constellationConditionals,
    ]
    const activeCount = activeCheckPool.filter(
      (c) =>
        readEffectiveConditionalValue(effectiveMap, c.sheet, c.key) !== 'off'
    ).length

    return {
      mKey,
      isTarget,
      charMeta,
      resolvedBuild,
      isSimulated,
      isFastModeActive,
      stageMember,
      memberWeaponKey,
      activeWornSets,
      weaponConditionals,
      visibleArtifactConditionals,
      characterConditionals,
      constellationConditionals,
      effectiveMap,
      resolvedConstellation,
      hasMemberOverride,
      activeCount,
    }
  })

  const activeEntry =
    memberEntries.find((e) => e.mKey === selectedMemberKey) ?? memberEntries[0]
  const activeStageMember = activeEntry?.stageMember

  const totalActiveCount = memberEntries.reduce(
    (sum, e) => sum + e.activeCount,
    0
  )
  const modifiedMembersCount = memberEntries.filter(
    (e) => e.hasMemberOverride
  ).length
  const buffsSummaryText = anyPresetOverrides
    ? `Buffs & Passives — ${
        modifiedMembersCount > 0
          ? `${modifiedMembersCount} member${modifiedMembersCount > 1 ? 's' : ''} modified`
          : 'modified'
      }${!resonanceEnabled ? ' · Resonance OFF' : ''} (${totalActiveCount} active)`
    : `Buffs & Passives — defaults (${totalActiveCount} active)`

  const isExpanded =
    embedded || !collapsible
      ? true
      : userExpanded !== null
        ? userExpanded
        : anyPresetOverrides

  const RootTag = embedded ? 'div' : 'section'

  return (
    <RootTag
      className={
        embedded
          ? 'gi-stage-team-buffs-body'
          : `panel gi-card${collapsible ? ' gi-collapsible-section' : ''}`
      }
      data-testid="conditional-toggle-panel"
      data-expanded={isExpanded ? 'true' : 'false'}
      aria-label={embedded ? undefined : 'Buffs & Passives'}
    >
      {!embedded && (
        <div className="gi-card-header gi-collapsible-header">
          <div>
            <div className="gi-collapsible-title-row">
              <h2
                className="gi-card-title"
                data-testid="buffs-collapsible-summary"
              >
                {collapsible ? buffsSummaryText : 'Buffs & Passives'}
              </h2>
            </div>
            {!collapsible && (
              <p className="gi-card-subtitle">
                Inspect and toggle weapon passives, artifact set effects,
                character talents, and constellation buffs for every team
                member.
              </p>
            )}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {anyPresetOverrides && (
              <button
                type="button"
                className="btn-secondary"
                data-testid="reset-all-conditionals"
                onClick={handleResetAll}
                style={{ fontSize: '0.82rem', padding: '0.28rem 0.65rem' }}
              >
                Reset All to Defaults
              </button>
            )}
            {collapsible && (
              <ChevronToggle
                expanded={isExpanded}
                className="btn-secondary gi-collapsible-toggle"
                data-testid="buffs-collapsible-toggle"
                ariaControls="buff-panel-member-tabs"
                ariaLabel="Toggle Buffs and Passives"
                onClick={() => setUserExpanded(!isExpanded)}
              />
            )}
          </div>
        </div>
      )}

      {/* Team-Level Elemental Resonance Master Toggle & Per-Effect List */}
      <div className="gi-buffs-resonance-section" data-testid="team-resonance-section">
        <div
          className={`gi-buffs-resonance-bar${resonanceEnabled ? ' is-on' : ' is-off'}`}
          data-testid="team-resonance-master-row"
          data-resonance-enabled={resonanceEnabled ? 'true' : 'false'}
        >
          <div className="gi-buffs-resonance-info">
            <div className="gi-buffs-resonance-title-row">
              <span className="gi-buffs-resonance-label">
                Elemental Resonance
              </span>
              <span className="gi-buff-team-tag" title="Team-wide resonance buffs">
                Team
              </span>
              {(!resonanceEnabled || hasDisabledTriggeredResonance) && (
                <span
                  className="gi-buffs-modified-pill"
                  data-testid="resonance-modified-badge"
                >
                  Modified
                </span>
              )}
            </div>
            <span className="gi-buffs-resonance-desc muted">
              All-on / all-off master control for party elemental resonance effects.
            </span>
          </div>
          <div className="gi-buffs-resonance-controls">
            {embedded && anyPresetOverrides && (
              <button
                type="button"
                className="btn-secondary"
                data-testid="reset-all-conditionals"
                onClick={handleResetAll}
                style={{ fontSize: '0.82rem', padding: '0.28rem 0.65rem' }}
              >
                Reset All to Defaults
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={resonanceEnabled}
              aria-label="Elemental Resonance"
              data-testid="resonance-master-toggle"
              data-state-value={resonanceEnabled ? 'on' : 'off'}
              className={`gi-buff-switch${resonanceEnabled ? ' is-on' : ''}`}
              onClick={handleToggleResonance}
            >
              <span className="gi-buff-switch-thumb" />
              <span className="gi-buff-switch-text">
                {resonanceEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {triggeredResonances.length > 0 && (
          <div
            className="gi-buffs-resonance-effects-list"
            data-testid="team-resonance-effects-list"
          >
            {triggeredResonances.map((res) => {
              const isEffectOn =
                resonanceEnabled && resonanceEffects[res.key] !== false
              const isEffectModified =
                !resonanceEnabled || resonanceEffects[res.key] === false
              return (
                <div
                  key={res.key}
                  className={`gi-buffs-resonance-effect-row${
                    isEffectOn ? ' is-on' : ' is-off'
                  }`}
                  data-testid={`resonance-effect-row-${res.key}`}
                  data-resonance-key={res.key}
                  data-effect-enabled={isEffectOn ? 'true' : 'false'}
                >
                  <div className="gi-buffs-resonance-effect-info">
                    <div className="gi-buffs-resonance-effect-title-row">
                      <span
                        className="gi-buffs-resonance-effect-icons"
                        aria-hidden="true"
                      >
                        {res.element === 'all' ? (
                          <>
                            <ElementIcon ele="pyro" iconProps={{ size: 13 }} />
                            <ElementIcon ele="hydro" iconProps={{ size: 13 }} />
                            <ElementIcon ele="cryo" iconProps={{ size: 13 }} />
                            <ElementIcon ele="electro" iconProps={{ size: 13 }} />
                          </>
                        ) : (
                          <>
                            <ElementIcon
                              ele={res.element}
                              iconProps={{ size: 14 }}
                            />
                            <ElementIcon
                              ele={res.element}
                              iconProps={{ size: 14 }}
                            />
                          </>
                        )}
                      </span>
                      <span
                        className="gi-buffs-resonance-effect-name"
                        data-testid={`resonance-effect-name-${res.key}`}
                      >
                        {res.name}
                      </span>
                      {isEffectModified && (
                        <span
                          className="gi-buffs-modified-pill"
                          data-testid={`resonance-effect-modified-${res.key}`}
                        >
                          Modified
                        </span>
                      )}
                    </div>
                    <span
                      className="gi-buffs-resonance-effect-desc"
                      data-testid={`resonance-effect-desc-${res.key}`}
                    >
                      <strong className="gi-buffs-resonance-effect-summary">
                        {res.plainSummary}
                      </strong>{' '}
                      <span className="muted">— {res.desc}</span>
                    </span>
                  </div>
                  <div className="gi-buffs-resonance-effect-controls">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEffectOn}
                      aria-label={res.name}
                      data-testid={`resonance-effect-toggle-${res.key}`}
                      data-state-value={isEffectOn ? 'on' : 'off'}
                      className={`gi-buff-switch${isEffectOn ? ' is-on' : ''}`}
                      onClick={() => handleToggleResonanceEffect(res.key)}
                    >
                      <span className="gi-buff-switch-thumb" />
                      <span className="gi-buff-switch-text">
                        {isEffectOn ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Character Switcher Tab Bar (GO-style team member tiles) */}
          <div
            role="tablist"
            aria-label="Team member buffs switcher"
            className="gi-buffs-member-tabs"
            data-testid="buff-panel-member-tabs"
          >
            {memberEntries.map((entry, tabIdx) => {
              const isSelected = activeEntry?.mKey === entry.mKey
              return (
                <button
                  key={entry.mKey}
                  id={`member-buffs-tab-${entry.mKey}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`member-buffs-panel-${entry.mKey}`}
                  data-testid={`member-buffs-tab-${entry.mKey}`}
                  data-character-key={entry.mKey}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-member-role={entry.isTarget ? 'target' : 'teammate'}
                  data-build-mode={entry.resolvedBuild.mode}
                  data-fast-mode-active={
                    entry.isFastModeActive ? 'true' : 'false'
                  }
                  className={`gi-buffs-member-tab${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedMemberKey(entry.mKey)}
                  onKeyDown={(e) => {
                    if (memberEntries.length <= 1) return
                    let nextIdx = -1
                    if (e.key === 'ArrowRight') {
                      nextIdx = (tabIdx + 1) % memberEntries.length
                    } else if (e.key === 'ArrowLeft') {
                      nextIdx =
                        (tabIdx - 1 + memberEntries.length) %
                        memberEntries.length
                    } else if (e.key === 'Home') {
                      nextIdx = 0
                    } else if (e.key === 'End') {
                      nextIdx = memberEntries.length - 1
                    }
                    if (nextIdx >= 0) {
                      e.preventDefault()
                      const nextKey = memberEntries[nextIdx]!.mKey
                      setSelectedMemberKey(nextKey)
                      if (typeof document !== 'undefined') {
                        document
                          .getElementById(`member-buffs-tab-${nextKey}`)
                          ?.focus?.()
                      }
                    }
                  }}
                >
                  <CharacterBadge
                    characterKey={entry.mKey}
                    simulated={entry.isSimulated}
                    role="owned"
                    compact
                  />
                  <span className="gi-buffs-member-tab-meta">
                    {entry.isTarget && (
                      <span
                        className="gi-target-member-badge"
                        data-testid={`member-tab-target-${entry.mKey}`}
                        title="Optimization Target"
                      >
                        Target
                      </span>
                    )}
                    <span
                      className={`gi-buffs-count-pill${
                        entry.activeCount > 0 ? ' is-active' : ''
                      }`}
                      data-testid={`member-tab-active-count-${entry.mKey}`}
                    >
                      {entry.activeCount} active
                    </span>
                    {entry.hasMemberOverride && (
                      <span
                        className="gi-buffs-modified-pill"
                        data-testid={`member-tab-modified-${entry.mKey}`}
                      >
                        Modified
                      </span>
                    )}
                    {!entry.isTarget && entry.isFastModeActive && (
                      <span
                        className="gi-fast-mode-badge"
                        data-testid={`fast-mode-badge-${entry.mKey}`}
                        title="Virtual 6th artifact active on this teammate"
                      >
                        Fast Mode
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Single Active Member Unified Editor */}
          {activeEntry && (
            <div
              key={activeEntry.mKey}
              id={`member-buffs-panel-${activeEntry.mKey}`}
              role="tabpanel"
              aria-labelledby={`member-buffs-tab-${activeEntry.mKey}`}
              className={`gi-buffs-member-card${
                activeEntry.isTarget ? ' gi-buffs-member-card-target' : ''
              }${
                activeStageMember?.isOverridden ? ' is-weapon-overridden' : ''
              }${activeEntry.isFastModeActive ? ' is-fast-mode' : ''}`}
              data-testid={`member-buffs-panel-${activeEntry.mKey}`}
              data-character-key={activeEntry.mKey}
              data-member-role={activeEntry.isTarget ? 'target' : 'teammate'}
              data-build-mode={activeEntry.resolvedBuild.mode}
              data-weapon-overridden={
                activeStageMember?.isOverridden ? 'true' : 'false'
              }
              data-weapon-locked={
                activeStageMember?.isWeaponLocked ? 'true' : 'false'
              }
              data-fast-mode-active={
                activeEntry.isFastModeActive ? 'true' : 'false'
              }
            >
              {/* Member Editor Top Row: Weapon, Equipped Sets, Build-State & Reset */}
              <div
                className="gi-buffs-member-header"
                data-testid={`member-buffs-header-${activeEntry.mKey}`}
              >
                <div className="gi-buffs-member-identity">
                  {activeStageMember ? (
                    <div className="preset-team-member-card-weapon">
                      {activeStageMember.isCompareTargetWeapon ? (
                        <span
                          className="preset-member-weapon-compare-note"
                          data-testid={`target-weapon-compare-note-${activeEntry.mKey}`}
                        >
                          <WeaponTypeIcon
                            weaponType={activeEntry.charMeta.weaponType}
                            iconProps={{ size: 14 }}
                          />
                          <span>
                            Weapons configured per candidate in Stage 2
                          </span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={`preset-member-weapon-btn${
                              activeStageMember.isOverridden
                                ? ' is-overridden'
                                : ''
                            }${activeStageMember.isWeaponLocked ? ' is-locked' : ''}`}
                            data-testid={`member-weapon-trigger-${activeEntry.mKey}`}
                            data-character-key={activeEntry.mKey}
                            data-weapon-key={
                              activeStageMember.effectiveWeaponSpec.key
                            }
                            data-weapon-overridden={
                              activeStageMember.isOverridden ? 'true' : 'false'
                            }
                            data-weapon-locked={
                              activeStageMember.isWeaponLocked
                                ? 'true'
                                : 'false'
                            }
                            disabled={activeStageMember.isWeaponLocked}
                            aria-label={
                              activeStageMember.isWeaponLocked
                                ? `${displayName(activeEntry.mKey)} weapon fixed by Akasha case: ${displayName(activeStageMember.effectiveWeaponSpec.key)}`
                                : `Change weapon for ${displayName(activeEntry.mKey)} (currently ${displayName(activeStageMember.effectiveWeaponSpec.key)} R${activeStageMember.effectiveWeaponSpec.refinement})`
                            }
                            title={
                              activeStageMember.isWeaponLocked
                                ? 'Teammate weapon is fixed by the Akasha leaderboard case'
                                : `Click to choose weapon and refinement for ${displayName(activeEntry.mKey)}`
                            }
                            onClick={() => {
                              if (!activeStageMember.isWeaponLocked) {
                                activeStageMember.onOpenWeaponModal()
                              }
                            }}
                          >
                            <WeaponBadge
                              weaponKey={
                                activeStageMember.effectiveWeaponSpec.key
                              }
                              subtitle={`R${activeStageMember.effectiveWeaponSpec.refinement} · Lv.${activeStageMember.effectiveWeaponSpec.level ?? 90}`}
                              compact
                              uniformRow
                            />
                          </button>

                          <span
                            className="sr-only"
                            data-testid={
                              activeEntry.isTarget
                                ? 'target-weapon-mode-status'
                                : `member-weapon-status-${activeEntry.mKey}`
                            }
                          >
                            {activeStageMember.isOverridden
                              ? `Override: ${displayName(activeStageMember.effectiveWeaponSpec.key)} R${activeStageMember.effectiveWeaponSpec.refinement}`
                              : '✓ Default Weapon'}
                          </span>

                          {activeStageMember.isOverridden &&
                            !activeStageMember.isWeaponLocked && (
                              <button
                                type="button"
                                className="btn-secondary preset-weapon-reset-btn"
                                data-testid={
                                  activeEntry.isTarget
                                    ? 'reset-target-weapon-btn'
                                    : `reset-member-weapon-btn-${activeEntry.mKey}`
                                }
                                aria-label={`Reset ${displayName(activeEntry.mKey)} weapon to default`}
                                title="Reset weapon to default"
                                onClick={activeStageMember.onResetWeapon}
                              >
                                Reset
                              </button>
                            )}
                        </>
                      )}
                    </div>
                  ) : (
                    activeEntry.memberWeaponKey && (
                      <WeaponBadge
                        weaponKey={activeEntry.memberWeaponKey}
                        compact
                      />
                    )
                  )}
                  {activeEntry.activeWornSets.map(([sk, cnt]) => (
                    <ArtifactBadge
                      key={sk}
                      setKey={sk}
                      slotKey="flower"
                      compact
                      subtitle={`(${cnt >= 4 ? 4 : 2}p)`}
                    />
                  ))}
                </div>

                <div className="gi-buffs-member-actions">
                  {activeStageMember &&
                    (preset.source === 'official' &&
                    !activeEntry.isTarget &&
                    activeStageMember.onToggleBuildMode ? (
                      <button
                        type="button"
                        className="btn-secondary preset-member-state-btn"
                        data-testid={`member-build-toggle-${activeEntry.mKey}`}
                        data-character-key={activeEntry.mKey}
                        data-build-mode={activeStageMember.resolved.mode}
                        data-owned-in-good={
                          activeStageMember.resolved.ownedInGood
                            ? 'true'
                            : 'false'
                        }
                        data-forced-simulated={
                          activeStageMember.resolved.forcedSimulated
                            ? 'true'
                            : 'false'
                        }
                        aria-pressed={activeStageMember.resolved.mode === 'tc'}
                        aria-label={
                          activeStageMember.resolved.forcedSimulated
                            ? `${displayName(activeEntry.mKey)}: Simulated (Not in GOOD)`
                            : `${displayName(activeEntry.mKey)} build source: ${
                                activeStageMember.resolved.mode === 'owned'
                                  ? 'Owned Build'
                                  : 'Simulated (TC)'
                              }`
                        }
                        title={
                          activeStageMember.resolved.forcedSimulated
                            ? `${displayName(activeEntry.mKey)} is not in your imported GOOD file — running simulated preset build`
                            : 'Switch teammate between your Owned GOOD build and the preset Simulated (TC) build'
                        }
                        onClick={() => {
                          const nextMode: MemberBuildMode =
                            !activeStageMember.resolved.ownedInGood
                              ? 'tc'
                              : activeStageMember.resolved.mode === 'owned'
                                ? 'tc'
                                : 'owned'
                          activeStageMember.onToggleBuildMode?.(nextMode)
                        }}
                      >
                        {activeStageMember.resolved.forcedSimulated
                          ? 'Simulated (Not in GOOD)'
                          : activeStageMember.resolved.mode === 'owned'
                            ? 'Owned Build'
                            : 'Simulated (TC)'}
                      </button>
                    ) : (
                      <span
                        className="preset-member-state-pill"
                        data-testid={`member-build-state-${activeEntry.mKey}`}
                      >
                        {preset.source === 'akasha' ||
                        activeStageMember.member.build.type === 'fixed' ||
                        activeStageMember.isWeaponLocked
                          ? (() => {
                              const charSpec =
                                activeStageMember.member.build.type === 'fixed'
                                  ? activeStageMember.member.build.character
                                  : activeStageMember.member.build.type === 'tc'
                                    ? activeStageMember.member.build.tc
                                        .character
                                    : { level: 90, constellation: 0 }
                              return `Fixed Spec · Lv.${charSpec.level} C${activeEntry.resolvedConstellation.value}`
                            })()
                          : activeEntry.isSimulated
                            ? 'Simulated (TC)'
                            : 'Owned Build'}
                      </span>
                    ))}
                  <div
                    className={`preset-member-constellation-control${
                      activeEntry.resolvedConstellation.isOverridden
                        ? ' is-overridden'
                        : ''
                    }`}
                    data-testid={`member-constellation-control-${activeEntry.mKey}`}
                    data-character-key={activeEntry.mKey}
                    data-constellation={String(
                      activeEntry.resolvedConstellation.value
                    )}
                    data-constellation-default={String(
                      activeEntry.resolvedConstellation.defaultValue
                    )}
                    data-constellation-source={
                      activeEntry.resolvedConstellation.source
                    }
                    data-constellation-overridden={
                      activeEntry.resolvedConstellation.isOverridden
                        ? 'true'
                        : 'false'
                    }
                  >
                    <select
                      aria-label={`${displayName(activeEntry.mKey)} constellation`}
                      data-testid={`member-constellation-select-${activeEntry.mKey}`}
                      className="preset-member-constellation-select"
                      value={String(activeEntry.resolvedConstellation.value)}
                      onChange={(e) =>
                        handleSetMemberConstellation(
                          activeEntry.mKey,
                          Number(e.target.value),
                          activeEntry.resolvedConstellation.defaultValue
                        )
                      }
                    >
                      {CONSTELLATION_VALUES.map((cVal) => (
                        <option key={cVal} value={String(cVal)}>
                          C{cVal}
                        </option>
                      ))}
                    </select>
                    <span
                      className="preset-member-constellation-source"
                      data-testid={`member-constellation-source-${activeEntry.mKey}`}
                      title={
                        activeEntry.resolvedConstellation.isOverridden
                          ? `Overridden to C${activeEntry.resolvedConstellation.value} (default C${activeEntry.resolvedConstellation.defaultValue} from ${activeEntry.resolvedConstellation.source})`
                          : `Constellation C${activeEntry.resolvedConstellation.value} from ${activeEntry.resolvedConstellation.source}`
                      }
                    >
                      {activeEntry.resolvedConstellation.source}
                    </span>
                  </div>
                  <span
                    className={`gi-buffs-count-pill${
                      activeEntry.activeCount > 0 ? ' is-active' : ''
                    }`}
                    data-testid={`member-active-buffs-count-${activeEntry.mKey}`}
                  >
                    {activeEntry.activeCount} active
                  </span>
                  {activeEntry.hasMemberOverride && (
                    <span
                      className="gi-buffs-modified-pill"
                      data-testid={`member-modified-badge-${activeEntry.mKey}`}
                    >
                      Modified
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    data-testid={`reset-member-conditionals-${activeEntry.mKey}`}
                    disabled={!activeEntry.hasMemberOverride}
                    onClick={() => handleResetMember(activeEntry.mKey)}
                    title={`Reset ${displayName(activeEntry.mKey)} buffs & passives to derived defaults`}
                    style={{
                      fontSize: '0.82rem',
                      padding: '0.18rem 0.5rem',
                      lineHeight: 1.2,
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Member Base -> Final Stat Grid & Fast Mode Row (when embedded in Stage 3) */}
              {activeStageMember && (
                <>
                  <MemberCompactStatGrid
                    characterKey={activeEntry.mKey}
                    memberStats={activeStageMember.memberStats}
                    highlightFinal={activeEntry.isFastModeActive}
                  />

                  <MemberFastModeExpander
                    characterKey={activeEntry.mKey}
                    isTarget={activeEntry.isTarget}
                    fastModeStats={activeStageMember.fastModeStats}
                    fastModeAvailable={activeStageMember.fastModeAvailable}
                    onChangeStat={activeStageMember.onChangeFastModeStat}
                    onResetMember={activeStageMember.onResetFastMode}
                  />
                </>
              )}

              <div className="gi-buffs-groups">
            {/* 1. WEAPON GROUP */}
            <div
              className={`gi-buffs-group${
                activeEntry.weaponConditionals.length === 0
                  ? ' is-empty-group'
                  : ''
              }`}
              data-testid={`buff-group-weapon-${activeEntry.mKey}`}
            >
              <div className="gi-buffs-group-header">
                <span className="gi-buffs-group-title">
                  <WeaponTypeIcon
                    weaponType={activeEntry.charMeta.weaponType}
                    iconProps={{ size: 14 }}
                  />
                  <span>Weapon Passive</span>
                </span>
                {activeEntry.memberWeaponKey &&
                  activeEntry.weaponConditionals.length > 0 && (
                    <span className="muted" style={{ fontSize: '0.82rem' }}>
                      {displayName(activeEntry.memberWeaponKey)}
                    </span>
                  )}
              </div>
              {activeEntry.weaponConditionals.length > 0 ? (
                <div
                  className="gi-buffs-rows gi-buffs-grid"
                  data-testid={`buff-group-grid-weapon-${activeEntry.mKey}`}
                >
                  {activeEntry.weaponConditionals.map((cond) =>
                    renderConditionalRow({
                      characterKey: activeEntry.mKey,
                      cond,
                      effectiveMap: activeEntry.effectiveMap,
                      onSetState: (val) =>
                        handleSetCondState(
                          activeEntry.mKey,
                          cond.sheet,
                          cond.key,
                          val
                        ),
                    })
                  )}
                </div>
              ) : (
                <div className="gi-buffs-empty">
                  {activeEntry.memberWeaponKey
                    ? `No toggleable passive on ${displayName(activeEntry.memberWeaponKey)}.`
                    : 'No weapon equipped.'}
                </div>
              )}
            </div>

            {/* 2. ARTIFACT SET GROUP */}
            <div
              className={`gi-buffs-group${
                activeEntry.visibleArtifactConditionals.length === 0
                  ? ' is-empty-group'
                  : ''
              }`}
              data-testid={`buff-group-artifact-${activeEntry.mKey}`}
            >
              <div className="gi-buffs-group-header">
                <span className="gi-buffs-group-title">
                  <SetEmblemIcon size={14} />
                  <span>Artifact Set Effects</span>
                </span>
              </div>
              {activeEntry.visibleArtifactConditionals.length > 0 ? (
                <div
                  className="gi-buffs-rows gi-buffs-grid"
                  data-testid={`buff-group-grid-artifact-${activeEntry.mKey}`}
                >
                  {activeEntry.visibleArtifactConditionals.map((cond) =>
                    renderConditionalRow({
                      characterKey: activeEntry.mKey,
                      cond,
                      effectiveMap: activeEntry.effectiveMap,
                      showSetBadge: true,
                      onSetState: (val) =>
                        handleSetCondState(
                          activeEntry.mKey,
                          cond.sheet,
                          cond.key,
                          val
                        ),
                    })
                  )}
                </div>
              ) : (
                <div className="gi-buffs-empty">
                  {activeEntry.activeWornSets.length > 0
                    ? 'No toggleable passive on equipped 2pc/4pc artifact sets.'
                    : 'No 2pc or 4pc artifact set equipped in current build.'}
                </div>
              )}
            </div>

            {/* 3. CHARACTER PASSIVES & TALENTS GROUP */}
            <div
              className={`gi-buffs-group${
                activeEntry.characterConditionals.length === 0
                  ? ' is-empty-group'
                  : ''
              }`}
              data-testid={`buff-group-character-${activeEntry.mKey}`}
            >
              <div className="gi-buffs-group-header">
                <span className="gi-buffs-group-title">
                  <ElementIcon
                    ele={activeEntry.charMeta.element}
                    iconProps={{ size: 14 }}
                  />
                  <span>Character Passives &amp; Talents</span>
                </span>
              </div>
              {activeEntry.characterConditionals.length > 0 ? (
                <div
                  className="gi-buffs-rows gi-buffs-grid"
                  data-testid={`buff-group-grid-character-${activeEntry.mKey}`}
                >
                  {activeEntry.characterConditionals.map((cond) =>
                    renderConditionalRow({
                      characterKey: activeEntry.mKey,
                      cond,
                      effectiveMap: activeEntry.effectiveMap,
                      effectiveConstellation:
                        activeEntry.resolvedConstellation.value,
                      onSetState: (val) =>
                        handleSetCondState(
                          activeEntry.mKey,
                          cond.sheet,
                          cond.key,
                          val
                        ),
                    })
                  )}
                </div>
              ) : (
                <div className="gi-buffs-empty">
                  No toggleable talent passives.
                </div>
              )}
            </div>

            {/* 4. CONSTELLATION EFFECTS GROUP */}
            <div
              className={`gi-buffs-group${
                activeEntry.constellationConditionals.length === 0
                  ? ' is-empty-group'
                  : ''
              }`}
              data-testid={`buff-group-constellation-${activeEntry.mKey}`}
            >
              <div className="gi-buffs-group-header">
                <span className="gi-buffs-group-title">
                  <ElementIcon
                    ele={activeEntry.charMeta.element}
                    iconProps={{ size: 14 }}
                  />
                  <span>Constellation Effects</span>
                </span>
              </div>
              {activeEntry.constellationConditionals.length > 0 ? (
                <div
                  className="gi-buffs-rows gi-buffs-grid"
                  data-testid={`buff-group-grid-constellation-${activeEntry.mKey}`}
                >
                  {activeEntry.constellationConditionals.map((cond) =>
                    renderConditionalRow({
                      characterKey: activeEntry.mKey,
                      cond,
                      effectiveMap: activeEntry.effectiveMap,
                      effectiveConstellation:
                        activeEntry.resolvedConstellation.value,
                      onSetState: (val) =>
                        handleSetCondState(
                          activeEntry.mKey,
                          cond.sheet,
                          cond.key,
                          val
                        ),
                    })
                  )}
                </div>
              ) : (
                <div className="gi-buffs-empty">
                  No toggleable constellation conditionals.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </RootTag>
  )
}

export interface CandidateEffectDiff {
  sheet: string
  key: string
  sheetLabel: string
  condLabel: string
  currentValue: string
  currentLabel: string
  seededValue: string
  seededLabel: string
  summary: string
}

function formatConditionalStateValue(
  sheetKey: string,
  condKey: string,
  stateValue: string,
  desc?: ConditionalDescriptor
): { sheetLabel: string; condLabel: string; stateLabel: string } {
  const sheetLabel = displayName(sheetKey)
  if (desc) {
    const condLabel = cleanConditionalLabel(desc, sheetLabel)
    if (!stateValue || stateValue === 'off') {
      return { sheetLabel, condLabel, stateLabel: 'Off' }
    }
    const stateDesc = desc.states.find((s) => s.key === stateValue)
    const stateLabel = stateDesc
      ? formatStateOptionLabel(stateDesc)
      : formatStateOptionLabel({ key: stateValue, name: stateValue })
    return { sheetLabel, condLabel, stateLabel }
  }

  const staticEntry = STATIC_GO_CONDITIONAL_LABELS[`${sheetKey}.${condKey}`]
  if (staticEntry) {
    const condLabel = staticEntry.label
    if (!stateValue || stateValue === 'off') {
      return { sheetLabel, condLabel, stateLabel: 'Off' }
    }
    const stateLabel =
      staticEntry.states?.[stateValue] ??
      formatStateOptionLabel({ key: stateValue, name: stateValue })
    return { sheetLabel, condLabel, stateLabel }
  }

  const condLabel =
    condKey === 'set4'
      ? '4-Piece Bonus'
      : condKey === 'set2'
        ? '2-Piece Bonus'
        : prettifyConditionalKey(condKey)
  const stateLabel =
    !stateValue || stateValue === 'off'
      ? 'Off'
      : formatStateOptionLabel({ key: stateValue, name: stateValue })
  return { sheetLabel, condLabel, stateLabel }
}

export function formatCandidateEffectDiffsTooltip(
  diffs: readonly CandidateEffectDiff[]
): string {
  if (diffs.length === 0) return ''
  return `Setup differs from seeded Buffs & Passives state:\n${diffs
    .map((d) => `• ${d.summary}`)
    .join('\n')}`
}

export interface CandidateTargetConditionalsEntry {
  targetKey: string
  charMeta: ReturnType<typeof getCharacterMeta>
  weaponKey: string
  weaponConditionals: ConditionalDescriptor[]
  visibleArtifactConditionals: ConditionalDescriptor[]
  characterConditionals: ConditionalDescriptor[]
  constellationConditionals: ConditionalDescriptor[]
  defaultMap: MemberConditionalsMap
  effectiveOverrides: MemberConditionalsMap
  seededOverrides: MemberConditionalsMap
  effectiveMap: MemberConditionalsMap
  seededEffectiveMap: MemberConditionalsMap
  resolvedConstellation: ResolvedMemberConstellation
  activeCount: number
  diffs: CandidateEffectDiff[]
  setupDiffers: boolean
  setupDiffersTooltip: string
}

export function deriveCandidateTargetConditionalsEntry(opts: {
  preset: Preset
  weaponKey: string
  targetConditionals?: MemberConditionalsMap
  seededTargetConditionals?: MemberConditionalsMap
  settings?: OptimizerSettings
  good?: IGOOD | null
  memberCatalog?: ConditionalDescriptor[]
}): CandidateTargetConditionalsEntry {
  const {
    preset,
    weaponKey,
    targetConditionals,
    seededTargetConditionals,
    settings,
    good,
    memberCatalog = [],
  } = opts

  const member = preset.team[0]
  const targetKey = member?.key ?? preset.target
  const charMeta = getCharacterMeta(targetKey)
  const locKey = targetKey.startsWith('Traveler') ? 'Traveler' : targetKey

  const ownedCharKeys = new Set((good?.characters ?? []).map((c) => c.key))
  const memberBuildModes = getPresetMemberBuildModes(settings, preset.id)
  const resolvedBuild = resolvePresetMemberBuildMode({
    presetSource: preset.source,
    isTarget: true,
    memberBuildType: member?.build.type ?? 'owned',
    characterKey: targetKey,
    ownedCharKeys,
    overrideMode: memberBuildModes[targetKey],
  })
  const goodTargetConstellation = (good?.characters ?? []).find(
    (c) => c.key === targetKey
  )?.constellation
  const resolvedConstellation = resolvePresetMemberConstellation({
    preset,
    memberIndex: 0,
    resolvedMode: resolvedBuild.mode,
    goodCharacterConstellation: goodTargetConstellation,
    overrideConstellation: getPresetConstellationOverrides(settings, preset.id)[
      targetKey
    ],
  })

  const equippedGoodWeaponKey = (good?.weapons ?? []).find(
    (w) => w.location === locKey
  )?.key

  const fallbackPanelTargetOverrides = getPresetConditionalOverrides(
    settings,
    preset.id
  )[targetKey]

  const effectiveOverrides =
    targetConditionals !== undefined
      ? targetConditionals
      : seedCandidateTargetConditionals(fallbackPanelTargetOverrides, weaponKey)

  const seededOverrides =
    seededTargetConditionals !== undefined
      ? seededTargetConditionals
      : seedCandidateTargetConditionals(fallbackPanelTargetOverrides, weaponKey)

  const defaultMap = deriveDefaultMemberConditionalsInUi({
    preset,
    memberIndex: 0,
    resolvedMode: resolvedBuild.mode,
    activeTargetWeaponKey: weaponKey,
    memberOwnedWeaponKey: equippedGoodWeaponKey,
    memberCatalog,
  })

  const effectiveMap = applyMemberConditionalOverrides(
    defaultMap,
    effectiveOverrides
  )
  const seededEffectiveMap = applyMemberConditionalOverrides(
    defaultMap,
    seededOverrides
  )

  // 1. Candidate weapon conditionals
  const weaponConditionals = memberCatalog.filter(
    (c) => c.category === 'weapon' && c.sheet === weaponKey
  )

  // 2. Relevant artifact set conditionals for the target character
  const relevantSetKeys = new Set<string>()
  const memberArtSets: Record<string, number> = {}
  for (const art of good?.artifacts ?? []) {
    if (art.location === locKey && art.setKey) {
      memberArtSets[art.setKey] = (memberArtSets[art.setKey] ?? 0) + 1
    }
  }
  for (const [sk, cnt] of Object.entries(memberArtSets)) {
    if (cnt >= 2) relevantSetKeys.add(sk)
  }
  if (member?.build.type === 'tc') {
    for (const [sk, cnt] of Object.entries(
      member.build.tc.artifact.sets ?? {}
    )) {
      if (typeof cnt === 'number' && cnt >= 2) relevantSetKeys.add(sk)
    }
  }
  for (const sk of Object.keys(member?.conditional ?? {})) {
    relevantSetKeys.add(sk)
  }
  for (const sk of Object.keys(effectiveOverrides)) {
    relevantSetKeys.add(sk)
  }
  for (const sk of Object.keys(seededOverrides)) {
    relevantSetKeys.add(sk)
  }
  if (relevantSetKeys.size === 0) {
    const poolSetCounts: Record<string, number> = {}
    for (const art of good?.artifacts ?? []) {
      if (art.setKey) {
        poolSetCounts[art.setKey] = (poolSetCounts[art.setKey] ?? 0) + 1
      }
    }
    for (const [sk, cnt] of Object.entries(poolSetCounts)) {
      if (cnt >= 2) relevantSetKeys.add(sk)
    }
  }

  const visibleArtifactConditionals = memberCatalog.filter(
    (c) => c.category === 'artifact' && relevantSetKeys.has(c.sheet)
  )

  // 3. Target character passives & talents
  const characterConditionals = memberCatalog.filter(
    (c) =>
      c.category === 'character' &&
      (c.sheet === targetKey || c.sheet.startsWith('Traveler'))
  )

  // 4. Target constellation conditionals
  const constellationConditionals = memberCatalog.filter(
    (c) =>
      c.category === 'constellation' &&
      (c.sheet === targetKey || c.sheet.startsWith('Traveler'))
  )

  const checkPool = [
    ...weaponConditionals,
    ...visibleArtifactConditionals,
    ...characterConditionals,
    ...constellationConditionals,
  ]

  const activeCount = checkPool.filter(
    (c) => readEffectiveConditionalValue(effectiveMap, c.sheet, c.key) !== 'off'
  ).length

  const diffs: CandidateEffectDiff[] = []
  const seenPairs = new Set<string>()

  const checkPair = (
    sheet: string,
    key: string,
    desc?: ConditionalDescriptor
  ) => {
    const pairId = `${sheet}:${key}`
    if (seenPairs.has(pairId)) return
    seenPairs.add(pairId)

    let currentValue = readEffectiveConditionalValue(effectiveMap, sheet, key)
    let seededValue = readEffectiveConditionalValue(
      seededEffectiveMap,
      sheet,
      key
    )

    // Fallback when catalog was not loaded yet and defaultMap lacked default 'on' / max-stack state
    if (
      !desc &&
      memberCatalog.length === 0 &&
      currentValue === seededValue &&
      effectiveOverrides[sheet]?.[key] !== seededOverrides[sheet]?.[key]
    ) {
      const rawCur = effectiveOverrides[sheet]?.[key]
      const rawSeed = seededOverrides[sheet]?.[key]
      currentValue = rawCur ?? 'on'
      seededValue = rawSeed ?? 'on'
    }

    if (currentValue === seededValue) return

    const curFmt = formatConditionalStateValue(sheet, key, currentValue, desc)
    const seedFmt = formatConditionalStateValue(sheet, key, seededValue, desc)
    diffs.push({
      sheet,
      key,
      sheetLabel: curFmt.sheetLabel,
      condLabel: curFmt.condLabel,
      currentValue,
      currentLabel: curFmt.stateLabel,
      seededValue,
      seededLabel: seedFmt.stateLabel,
      summary: `${curFmt.sheetLabel} — ${curFmt.condLabel}: ${curFmt.stateLabel} (seeded: ${seedFmt.stateLabel})`,
    })
  }

  for (const cond of checkPool) {
    checkPair(cond.sheet, cond.key, cond)
  }
  for (const [sheet, sheetMap] of Object.entries(effectiveOverrides)) {
    for (const key of Object.keys(sheetMap ?? {})) {
      const desc = memberCatalog.find(
        (c) => c.sheet === sheet && c.key === key
      )
      checkPair(sheet, key, desc)
    }
  }
  for (const [sheet, sheetMap] of Object.entries(seededOverrides)) {
    for (const key of Object.keys(sheetMap ?? {})) {
      const desc = memberCatalog.find(
        (c) => c.sheet === sheet && c.key === key
      )
      checkPair(sheet, key, desc)
    }
  }

  return {
    targetKey,
    charMeta,
    weaponKey,
    weaponConditionals,
    visibleArtifactConditionals,
    characterConditionals,
    constellationConditionals,
    defaultMap,
    effectiveOverrides,
    seededOverrides,
    effectiveMap,
    seededEffectiveMap,
    resolvedConstellation,
    activeCount,
    diffs,
    setupDiffers: diffs.length > 0,
    setupDiffersTooltip: formatCandidateEffectDiffsTooltip(diffs),
  }
}

export function getRequiredConstellationForConditional(
  cond: Pick<ConditionalDescriptor, 'category' | 'section' | 'key'>
): number | undefined {
  const secMatch = cond.section?.match(/^constellation([1-6])$/)
  if (secMatch) {
    return Number(secMatch[1])
  }
  if (cond.category === 'constellation') {
    const keyMatch = cond.key.match(/^c([1-6])(?:[A-Z0-9_]|$)/)
    if (keyMatch) {
      return Number(keyMatch[1])
    }
  }
  return undefined
}

export function renderConditionalRow(opts: {
  characterKey: string
  cond: ConditionalDescriptor
  effectiveMap: MemberConditionalsMap
  effectiveConstellation?: number
  showSetBadge?: boolean
  testIdPrefix?: string
  onSetState: (nextVal: string) => void
}) {
  const {
    characterKey,
    cond,
    effectiveMap,
    effectiveConstellation,
    showSetBadge,
    testIdPrefix = 'cond',
    onSetState,
  } = opts
  const currentValue = readEffectiveConditionalValue(
    effectiveMap,
    cond.sheet,
    cond.key
  )
  const isOn = currentValue !== 'off'
  const isMultiState = cond.states.length > 1
  const sheetName = displayName(cond.sheet)
  const label = cleanConditionalLabel(cond, sheetName)
  const sectionBadge = cond.section
    ? SECTION_SHORT_BADGE[cond.section] ?? undefined
    : undefined
  const defaultOnKey =
    cond.states[cond.states.length - 1]?.key ?? cond.states[0]?.key ?? 'on'
  const requiredConstellation = getRequiredConstellationForConditional(cond)
  const isConstellationGated =
    effectiveConstellation !== undefined &&
    requiredConstellation !== undefined &&
    effectiveConstellation < requiredConstellation

  return (
    <div
      key={`${cond.sheet}:${cond.key}`}
      className={`gi-buff-row gi-buff-cell${isOn ? ' is-on' : ''}${
        isConstellationGated ? ' is-constellation-gated' : ''
      }`}
      data-testid={`${testIdPrefix}-row-${characterKey}-${cond.sheet}-${cond.key}`}
      data-conditional-sheet={cond.sheet}
      data-conditional-key={cond.key}
      data-conditional-state={currentValue}
      {...(requiredConstellation !== undefined
        ? { 'data-required-constellation': String(requiredConstellation) }
        : {})}
      {...(isConstellationGated
        ? { 'data-constellation-gated': 'true' }
        : {})}
    >
      <div className="gi-buff-row-info">
        {showSetBadge && (
          <ArtifactBadge
            setKey={cond.sheet}
            slotKey="flower"
            compact
            slotOnly
          />
        )}
        {sectionBadge && (
          <span className="gi-buff-sec-tag">{sectionBadge}</span>
        )}
        <span
          className="gi-buff-row-label"
          title={`${sheetName} — ${label} (${cond.key})`}
        >
          {showSetBadge ? (
            <>
              <strong>{sheetName}</strong> · {label}
            </>
          ) : (
            label
          )}
        </span>
        {cond.isTeamBuff && (
          <span className="gi-buff-team-tag" title="Team-wide buff">
            Team
          </span>
        )}
      </div>

      <div className="gi-buff-row-controls">
        {isConstellationGated && (
          <span
            className="gi-buff-const-gate-hint"
            data-testid={`${testIdPrefix}-const-hint-${characterKey}-${cond.sheet}-${cond.key}`}
            title={`Requires Constellation ${requiredConstellation} (current: C${effectiveConstellation})`}
          >
            Requires C{requiredConstellation}
          </span>
        )}
        {isMultiState && (
          <select
            aria-label={`${displayName(characterKey)} ${sheetName} ${label} state`}
            data-testid={`${testIdPrefix}-select-${characterKey}-${cond.sheet}-${cond.key}`}
            className="gi-buff-select"
            value={isOn ? currentValue : 'off'}
            onChange={(e) => onSetState(e.target.value)}
          >
            <option value="off">Off</option>
            {cond.states.map((st) => (
              <option key={st.key} value={st.key}>
                {formatStateOptionLabel(st)}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label={`Toggle ${displayName(characterKey)} ${sheetName} ${label}`}
          data-testid={`${testIdPrefix}-toggle-${characterKey}-${cond.sheet}-${cond.key}`}
          data-state-value={currentValue}
          className={`gi-buff-switch${isOn ? ' is-on' : ''}`}
          title={
            isConstellationGated
              ? `Requires C${requiredConstellation}`
              : undefined
          }
          onClick={() => onSetState(isOn ? 'off' : defaultOnKey)}
        >
          <span className="gi-buff-switch-thumb" />
          <span className="gi-buff-switch-text">{isOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  )
}
