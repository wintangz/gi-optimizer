'use client'

import {
  ArtifactBadge,
  CharacterBadge,
  WeaponBadge,
} from '@/components/Identifier'
import {
  ElementIcon,
  SetEmblemIcon,
  WeaponTypeIcon,
} from '@/components/SvgIcons'
import { getCatalogInWorker } from '@/lib/engine/workerClient'
import { getCharacterMeta } from '@/lib/itemMeta'
import type { ConditionalDescriptor, ConditionalStateDescriptor } from '@gi/engine'
import type { IGOOD } from '@gi/good'
import { humanizeKey } from '@gi/good'
import {
  applyMemberConditionalOverrides,
  displayName,
  getPresetConditionalOverrides,
  getPresetMemberBuildModes,
  hasMemberConditionalOverrides,
  readEffectiveConditionalValue,
  resetMemberConditionalOverrides,
  resolvePresetMemberBuildMode,
  setMemberConditionalOverride,
  type MemberBuildMode,
  type MemberConditionalsMap,
  type OptimizerSettings,
  type Preset,
} from '@gi/presets'
import { useEffect, useMemo, useState } from 'react'

export interface ConditionalTogglePanelProps {
  preset: Preset
  settings: OptimizerSettings
  onChangeSettings: (next: OptimizerSettings) => void
  good?: IGOOD | null
  /** Resolved weapon key for the target character (slot 0), e.g. from Akasha weapon picker or owned weapon selection. */
  activeTargetWeaponKey?: string
  /** Optional pre-loaded conditional catalog (used in unit tests or SSR). */
  conditionalsByChar?: Record<string, ConditionalDescriptor[]>
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

function cleanConditionalLabel(
  cond: ConditionalDescriptor,
  sheetDisplayName: string
): string {
  const prefix = `${sheetDisplayName} — `
  let raw = cond.name.startsWith(prefix)
    ? cond.name.slice(prefix.length)
    : cond.name
  // Clean up raw i18n keys like "char_Furina:c2Overstack" or "artifact_GoldenTroupe:condName"
  if (raw.includes(':')) {
    const afterColon = raw.split(':').pop() ?? raw
    raw = humanizeKey(afterColon)
  } else if (/^[a-z0-9_]+$/i.test(raw) && raw === cond.key) {
    raw = humanizeKey(raw)
  }
  return raw
}

function formatStateOptionLabel(st: ConditionalStateDescriptor): string {
  if (!st.name || st.name === st.key) {
    if (st.key === 'on') return 'Active (On)'
    if (/^\d+$/.test(st.key)) return `${st.key} Stack${st.key === '1' ? '' : 's'}`
    return humanizeKey(st.key)
  }
  if (st.name.includes(':')) {
    const afterColon = st.name.split(':').pop() ?? st.name
    return humanizeKey(afterColon)
  }
  return st.name
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

function deriveDefaultMemberConditionalsInUi(opts: {
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
}: ConditionalTogglePanelProps) {
  const [loadedCatalog, setLoadedCatalog] = useState<
    Record<string, ConditionalDescriptor[]>
  >({})
  const [collapsedMembers, setCollapsedMembers] = useState<
    Record<string, boolean>
  >({})
  const [showAllArtSetsByMember, setShowAllArtSetsByMember] = useState<
    Record<string, boolean>
  >({})

  const teamKeys = useMemo(
    () => preset.team.slice(0, 4).map((m) => m.key),
    [preset.team]
  )

  useEffect(() => {
    if (providedCatalog) return
    if (typeof getCatalogInWorker !== 'function') return
    let cancelled = false
    void Promise.resolve(getCatalogInWorker(teamKeys)).then((res) => {
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
  }, [teamKeys, providedCatalog])

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

  const anyPresetOverrides = useMemo(
    () => hasMemberConditionalOverrides(settings, preset.id),
    [settings, preset.id]
  )

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

  function handleResetMember(characterKey: string) {
    onChangeSettings(
      resetMemberConditionalOverrides(settings, preset.id, characterKey)
    )
  }

  function handleResetAll() {
    onChangeSettings(resetMemberConditionalOverrides(settings, preset.id))
  }

  return (
    <section
      className="panel gi-card"
      data-testid="conditional-toggle-panel"
      aria-label="Buffs & Passives"
    >
      <div className="gi-card-header">
        <div>
          <h2 className="gi-card-title">Buffs &amp; Passives</h2>
          <p className="gi-card-subtitle">
            Inspect and toggle weapon passives, artifact set effects, character
            talents, and constellation buffs for every team member.
          </p>
        </div>
        {anyPresetOverrides && (
          <button
            type="button"
            className="btn-secondary"
            data-testid="reset-all-conditionals"
            onClick={handleResetAll}
            style={{ fontSize: '0.8rem', padding: '0.28rem 0.65rem' }}
          >
            Reset All to Defaults
          </button>
        )}
      </div>

      <div className="gi-buffs-member-grid">
        {preset.team.slice(0, 4).map((member, idx) => {
          const mKey = member.key
          const isTarget = idx === 0
          const charMeta = getCharacterMeta(mKey)
          const locKey = mKey.startsWith('Traveler') ? 'Traveler' : mKey

          const resolvedBuild = resolvePresetMemberBuildMode({
            presetSource: preset.source,
            isTarget,
            memberBuildType: member.build.type,
            characterKey: mKey,
            ownedCharKeys,
            overrideMode: memberBuildModes[mKey],
          })

          const isSimulated = isTarget
            ? member.build.type === 'tc' || member.build.type === 'fixed'
            : resolvedBuild.mode === 'tc'

          const equippedGoodWeaponKey = (good?.weapons ?? []).find(
            (w) => w.location === locKey
          )?.key

          const resolvedTargetWeaponKey =
            activeTargetWeaponKey ??
            (member.build.type === 'fixed'
              ? member.build.weapon.key
              : equippedGoodWeaponKey ?? member.requirement?.weapon?.key)

          let memberWeaponKey: string | undefined
          const memberArtSets: Record<string, number> = {}

          if (isTarget) {
            memberWeaponKey = resolvedTargetWeaponKey
            for (const art of good?.artifacts ?? []) {
              if (art.location === locKey && art.setKey) {
                memberArtSets[art.setKey] =
                  (memberArtSets[art.setKey] ?? 0) + 1
              }
            }
          } else if (resolvedBuild.mode === 'owned') {
            memberWeaponKey = equippedGoodWeaponKey
            for (const art of good?.artifacts ?? []) {
              if (art.location === locKey && art.setKey) {
                memberArtSets[art.setKey] =
                  (memberArtSets[art.setKey] ?? 0) + 1
              }
            }
          } else if (member.build.type === 'tc') {
            memberWeaponKey = member.build.tc.weapon.key
            for (const [sk, cnt] of Object.entries(
              member.build.tc.artifact.sets ?? {}
            )) {
              if (typeof cnt === 'number' && cnt > 0) {
                memberArtSets[sk] = cnt
              }
            }
          } else if (member.build.type === 'fixed') {
            memberWeaponKey = member.build.weapon.key
          }

          const memberCatalog = catalogByChar[mKey] ?? []

          const defaultMap = deriveDefaultMemberConditionalsInUi({
            preset,
            memberIndex: idx,
            resolvedMode: resolvedBuild.mode,
            activeTargetWeaponKey: resolvedTargetWeaponKey,
            memberOwnedWeaponKey: equippedGoodWeaponKey,
            memberCatalog,
          })

          const memberOverrides = presetOverrides[mKey]
          const effectiveMap = applyMemberConditionalOverrides(
            defaultMap,
            memberOverrides
          )
          const hasMemberOverride = hasMemberConditionalOverrides(
            settings,
            preset.id,
            mKey
          )

          // Categorize conditionals for this member:
          // 1. Weapon conditionals: active weapon + any weapon with authored/overridden state
          const weaponConditionals = memberCatalog.filter((c) => {
            if (c.category !== 'weapon') return false
            if (memberWeaponKey && c.sheet === memberWeaponKey) return true
            if (
              readEffectiveConditionalValue(effectiveMap, c.sheet, c.key) !==
              'off'
            ) {
              return true
            }
            if (memberOverrides?.[c.sheet]?.[c.key] !== undefined) return true
            return false
          })

          // 2. Artifact set conditionals:
          const allArtifactConditionals = memberCatalog.filter(
            (c) => c.category === 'artifact'
          )
          const relevantArtSetKeys = new Set<string>()
          for (const [sk, cnt] of Object.entries(memberArtSets)) {
            if (cnt >= 2 || isTarget) {
              relevantArtSetKeys.add(sk)
            }
          }
          for (const sk of Object.keys(member.conditional ?? {})) {
            relevantArtSetKeys.add(sk)
          }
          for (const sk of Object.keys(memberOverrides ?? {})) {
            relevantArtSetKeys.add(sk)
          }
          if (isTarget) {
            for (const sk of Object.keys(settings.setFilterSelection ?? {})) {
              relevantArtSetKeys.add(sk)
            }
          }

          const showAllArtSets = Boolean(showAllArtSetsByMember[mKey])
          const primaryArtifactConditionals = allArtifactConditionals.filter(
            (c) => relevantArtSetKeys.has(c.sheet)
          )
          const visibleArtifactConditionals = showAllArtSets
            ? allArtifactConditionals
            : primaryArtifactConditionals

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

          // Count active conditionals across visible/relevant items for this member
          const activeCheckPool = [
            ...weaponConditionals,
            ...primaryArtifactConditionals,
            ...characterConditionals,
            ...constellationConditionals,
          ]
          const activeCount = activeCheckPool.filter(
            (c) =>
              readEffectiveConditionalValue(effectiveMap, c.sheet, c.key) !==
              'off'
          ).length

          const isCollapsed = Boolean(collapsedMembers[mKey])

          const activeWornSets = Object.entries(memberArtSets).filter(
            ([, cnt]) => cnt >= 2
          )

          return (
            <div
              key={mKey}
              className={`gi-buffs-member-card${
                isTarget ? ' gi-buffs-member-card-target' : ''
              }`}
              data-testid={`member-buffs-panel-${mKey}`}
              data-character-key={mKey}
            >
              {/* Member Header */}
              <div
                className="gi-buffs-member-header"
                data-testid={`member-buffs-header-${mKey}`}
              >
                <div className="gi-buffs-member-identity">
                  <CharacterBadge
                    characterKey={mKey}
                    simulated={isSimulated}
                    role={isTarget ? 'target' : 'owned'}
                    compact
                  />
                  {memberWeaponKey && (
                    <WeaponBadge weaponKey={memberWeaponKey} compact />
                  )}
                  {activeWornSets.map(([sk, cnt]) => (
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
                  <span
                    className={`gi-buffs-count-pill${
                      activeCount > 0 ? ' is-active' : ''
                    }`}
                    data-testid={`member-active-buffs-count-${mKey}`}
                  >
                    {activeCount} active
                  </span>
                  {hasMemberOverride && (
                    <span
                      className="gi-buffs-modified-pill"
                      data-testid={`member-modified-badge-${mKey}`}
                    >
                      Modified
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    data-testid={`reset-member-conditionals-${mKey}`}
                    disabled={!hasMemberOverride}
                    onClick={() => handleResetMember(mKey)}
                    title={`Reset ${displayName(mKey)} buffs & passives to derived defaults`}
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.18rem 0.5rem',
                      lineHeight: 1.2,
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    data-testid={`toggle-member-panel-${mKey}`}
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsedMembers((prev) => ({
                        ...prev,
                        [mKey]: !prev[mKey],
                      }))
                    }
                  >
                    {isCollapsed ? 'Show ▾' : 'Hide ▴'}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="gi-buffs-groups">
                  {/* 1. WEAPON GROUP */}
                  <div
                    className="gi-buffs-group"
                    data-testid={`buff-group-weapon-${mKey}`}
                  >
                    <div className="gi-buffs-group-header">
                      <span className="gi-buffs-group-title">
                        <WeaponTypeIcon
                          weaponType={charMeta.weaponType}
                          iconProps={{ size: 14 }}
                        />
                        <span>Weapon Passive</span>
                      </span>
                      {memberWeaponKey && (
                        <span className="muted" style={{ fontSize: '0.76rem' }}>
                          {displayName(memberWeaponKey)}
                        </span>
                      )}
                    </div>
                    {weaponConditionals.length > 0 ? (
                      <div className="gi-buffs-rows">
                        {weaponConditionals.map((cond) =>
                          renderConditionalRow({
                            characterKey: mKey,
                            cond,
                            effectiveMap,
                            onSetState: (val) =>
                              handleSetCondState(
                                mKey,
                                cond.sheet,
                                cond.key,
                                val
                              ),
                          })
                        )}
                      </div>
                    ) : (
                      <div className="gi-buffs-empty">
                        {memberWeaponKey
                          ? `No toggleable passive on ${displayName(memberWeaponKey)}.`
                          : 'No weapon equipped.'}
                      </div>
                    )}
                  </div>

                  {/* 2. ARTIFACT SET GROUP */}
                  <div
                    className="gi-buffs-group"
                    data-testid={`buff-group-artifact-${mKey}`}
                  >
                    <div className="gi-buffs-group-header">
                      <span className="gi-buffs-group-title">
                        <SetEmblemIcon size={14} />
                        <span>Artifact Set Effects</span>
                      </span>
                      <button
                        type="button"
                        className="preset-collapse-toggle"
                        data-testid={`toggle-all-art-conds-${mKey}`}
                        onClick={() =>
                          setShowAllArtSetsByMember((prev) => ({
                            ...prev,
                            [mKey]: !prev[mKey],
                          }))
                        }
                      >
                        {showAllArtSets
                          ? 'Equipped / Active Sets Only ▴'
                          : `All Artifact Sets (${allArtifactConditionals.length}) ▾`}
                      </button>
                    </div>
                    {visibleArtifactConditionals.length > 0 ? (
                      <div className="gi-buffs-rows">
                        {visibleArtifactConditionals.map((cond) =>
                          renderConditionalRow({
                            characterKey: mKey,
                            cond,
                            effectiveMap,
                            showSetBadge: true,
                            onSetState: (val) =>
                              handleSetCondState(
                                mKey,
                                cond.sheet,
                                cond.key,
                                val
                              ),
                          })
                        )}
                      </div>
                    ) : (
                      <div className="gi-buffs-empty">
                        No conditional passive on equipped artifact sets — click{' '}
                        <strong>All Artifact Sets</strong> to pre-toggle any set.
                      </div>
                    )}
                  </div>

                  {/* 3. CHARACTER PASSIVES & TALENTS GROUP */}
                  <div
                    className="gi-buffs-group"
                    data-testid={`buff-group-character-${mKey}`}
                  >
                    <div className="gi-buffs-group-header">
                      <span className="gi-buffs-group-title">
                        <ElementIcon
                          ele={charMeta.element}
                          iconProps={{ size: 14 }}
                        />
                        <span>Character Passives &amp; Talents</span>
                      </span>
                    </div>
                    {characterConditionals.length > 0 ? (
                      <div className="gi-buffs-rows">
                        {characterConditionals.map((cond) =>
                          renderConditionalRow({
                            characterKey: mKey,
                            cond,
                            effectiveMap,
                            onSetState: (val) =>
                              handleSetCondState(
                                mKey,
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
                    className="gi-buffs-group"
                    data-testid={`buff-group-constellation-${mKey}`}
                  >
                    <div className="gi-buffs-group-header">
                      <span className="gi-buffs-group-title">
                        <ElementIcon
                          ele={charMeta.element}
                          iconProps={{ size: 14 }}
                        />
                        <span>Constellation Effects</span>
                      </span>
                    </div>
                    {constellationConditionals.length > 0 ? (
                      <div className="gi-buffs-rows">
                        {constellationConditionals.map((cond) =>
                          renderConditionalRow({
                            characterKey: mKey,
                            cond,
                            effectiveMap,
                            onSetState: (val) =>
                              handleSetCondState(
                                mKey,
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
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function renderConditionalRow(opts: {
  characterKey: string
  cond: ConditionalDescriptor
  effectiveMap: MemberConditionalsMap
  showSetBadge?: boolean
  onSetState: (nextVal: string) => void
}) {
  const { characterKey, cond, effectiveMap, showSetBadge, onSetState } = opts
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

  return (
    <div
      key={`${cond.sheet}:${cond.key}`}
      className={`gi-buff-row${isOn ? ' is-on' : ''}`}
      data-testid={`cond-row-${characterKey}-${cond.sheet}-${cond.key}`}
      data-conditional-sheet={cond.sheet}
      data-conditional-key={cond.key}
      data-conditional-state={currentValue}
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
        <span className="gi-buff-row-label" title={`${sheetName} — ${label}`}>
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
        {isMultiState && (
          <select
            aria-label={`${displayName(characterKey)} ${sheetName} ${label} state`}
            data-testid={`cond-select-${characterKey}-${cond.sheet}-${cond.key}`}
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
          data-testid={`cond-toggle-${characterKey}-${cond.sheet}-${cond.key}`}
          data-state-value={currentValue}
          className={`gi-buff-switch${isOn ? ' is-on' : ''}`}
          onClick={() => onSetState(isOn ? 'off' : defaultOnKey)}
        >
          <span className="gi-buff-switch-thumb" />
          <span className="gi-buff-switch-text">{isOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  )
}
