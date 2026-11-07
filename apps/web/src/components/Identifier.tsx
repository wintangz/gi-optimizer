'use client'

import {
  ElementIcon,
  hasStatIcon,
  resolveStatElement,
  SetEmblemIcon,
  SlotIcon,
  StatIcon,
  WeaponTypeIcon,
  type GiElementWithPhyKey,
} from '@/components/SvgIcons'
import {
  CLOUDINARY_GENSHIN_BASE_URL,
  formatRarityStars,
  getArtifactMeta,
  getCdnArtifactIconUrl,
  getCdnIconUrl,
  getCharacterMeta,
  getElementColor,
  getRarityColor,
  getWeaponMeta,
  ITEM_DARK_SURFACE_BG,
  shortStatLabel,
  type IdentifierElement,
  type IdentifierSlotKey,
} from '@/lib/itemMeta'
import {
  computeArtifactRollValue,
  type ArtifactRollValueResult,
  type SubstatRollBreakdown,
} from '@gi/good'
import { useState, type ReactNode } from 'react'

export {
  CLOUDINARY_GENSHIN_BASE_URL,
  getCdnArtifactIconUrl,
  getCdnIconUrl,
  ITEM_DARK_SURFACE_BG,
}

export type CharacterRoleTag = 'target' | 'owned' | 'none'

export interface CharacterBadgeProps {
  characterKey: string
  /**
   * When true (`member.build.type === 'tc'`), renders a dashed outer ring around the
   * avatar circle + a prominent "SIM" / "SIM · Fixed Preset Build" pill badge.
   */
  simulated?: boolean
  /**
   * Ownership badge shown in team rosters when not simulated:
   * - 'target' -> "YOURS · TARGET" (or "TARGET" when compact)
   * - 'owned'  -> "YOUR BUILD" (or "YOURS" when compact)
   * - 'none'   -> no ownership pill (e.g. raw inventory table rows)
   */
  role?: CharacterRoleTag
  /** Renders compact pill tags and slightly smaller avatar (e.g. preset list cards, chips). */
  compact?: boolean
  /** Optional secondary text rendered beside or beneath the display name (e.g. "Lv. 90 C0"). */
  subtitle?: ReactNode
}

export interface WeaponBadgeProps {
  weaponKey: string
  rarityOverride?: number
  compact?: boolean
  /** Optional refinement/level/location metadata shown next to the weapon name. */
  subtitle?: ReactNode
}

export interface ArtifactBadgeProps {
  setKey: string
  slotKey?: IdentifierSlotKey
  rarity?: number
  compact?: boolean
  /** When true, displays only the rarity-backed slot glyph strip without set chip text. */
  slotOnly?: boolean
  /** Optional level, main stat, substats, or location metadata. */
  subtitle?: ReactNode
}

export type ItemIdentifierProps =
  | ({ kind: 'character' } & CharacterBadgeProps)
  | ({ kind: 'weapon' } & WeaponBadgeProps)
  | ({ kind: 'artifact' } & ArtifactBadgeProps)

export function CharacterBadge({
  characterKey,
  simulated = false,
  role = 'none',
  compact = false,
  subtitle,
}: CharacterBadgeProps) {
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const imageFailed = failedKey === characterKey
  const iconUrl = getCdnIconUrl(characterKey)
  const meta = getCharacterMeta(characterKey)
  const rarityColor = getRarityColor(meta.rarity)
  const fallbackSize = compact ? 24 : 30
  const imageSize = compact ? 27 : 34
  const size = imageFailed ? fallbackSize : imageSize
  const effectiveRole = simulated ? 'simulated' : role

  return (
    <span
      data-identifier-kind="character"
      data-character-key={characterKey}
      data-element={meta.element}
      data-rarity={String(meta.rarity)}
      data-simulated={simulated ? 'true' : 'false'}
      data-role={effectiveRole}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.4rem' : '0.55rem',
        verticalAlign: 'middle',
      }}
    >
      {/* Element-coloured circular avatar with rarity border: solid + slightly larger in image state, dashed + base size in fallback state */}
      <span
        data-testid="character-avatar"
        title={`${meta.displayName} (${meta.element.toUpperCase()})${
          simulated ? ' — Simulated Preset Build' : ''
        }`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '999px',
          overflow: 'hidden',
          background: meta.elementColor.bg,
          color: meta.elementColor.fg,
          border: imageFailed
            ? `2px dashed ${rarityColor.border}`
            : `2px solid ${rarityColor.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: compact ? '0.68rem' : '0.76rem',
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}
      >
        {imageFailed ? (
          meta.initials
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={iconUrl}
            alt={meta.displayName}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            onError={() => setFailedKey(characterKey)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '999px',
              display: 'block',
            }}
          />
        )}
      </span>

      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <strong
          style={{
            fontSize: compact ? '0.86rem' : '0.95rem',
            fontWeight: 600,
          }}
        >
          {meta.displayName}
        </strong>

        {simulated && (
          <span
            data-testid="sim-pill"
            title="Simulated / Assumed Preset Build (Not Your Account)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: compact ? '0.05rem 0.35rem' : '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: compact ? '0.68rem' : '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              background: 'rgba(245, 185, 66, 0.14)',
              color: 'var(--warn)',
              border: '1px solid var(--warn)',
            }}
          >
            {compact ? 'SIM' : 'SIM · Fixed Preset Build'}
          </span>
        )}

        {!simulated && role === 'target' && (
          <span
            data-testid="target-pill"
            title="Your Scanned Target Character"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: compact ? '0.05rem 0.35rem' : '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: compact ? '0.68rem' : '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              background: 'rgba(92, 219, 149, 0.15)',
              color: 'var(--ok)',
              border: '1px solid var(--ok)',
            }}
          >
            {compact ? 'YOURS · TARGET' : 'YOUR CHARACTER · TARGET'}
          </span>
        )}

        {!simulated && role === 'owned' && (
          <span
            data-testid="owned-pill"
            title="Your Scanned Character Build"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: compact ? '0.05rem 0.35rem' : '0.1rem 0.45rem',
              borderRadius: '4px',
              fontSize: compact ? '0.68rem' : '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              background: 'rgba(122, 162, 247, 0.15)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            {compact ? 'YOURS' : 'YOUR BUILD'}
          </span>
        )}

        {subtitle && (
          <span
            className="muted"
            style={{ fontSize: compact ? '0.8rem' : '0.85rem' }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )
}

export function RarityStars({
  rarity,
  compact = false,
}: {
  rarity: number
  compact?: boolean
}) {
  const clamped = Math.max(1, Math.min(5, Math.round(rarity || 4)))
  const rc = getRarityColor(clamped)
  const starsText = formatRarityStars(clamped)

  return (
    <span
      data-testid="rarity-stars"
      data-rarity={String(clamped)}
      aria-label={`${clamped} out of 5`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: compact ? '0.72rem' : '0.78rem',
        lineHeight: 1,
        letterSpacing: '0.04em',
        color: rc.border,
        fontWeight: 700,
        userSelect: 'none',
      }}
    >
      {starsText}
    </span>
  )
}

export function WeaponBadge({
  weaponKey,
  rarityOverride,
  compact = false,
  subtitle,
}: WeaponBadgeProps) {
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const imageFailed = failedKey === weaponKey
  const iconUrl = getCdnIconUrl(weaponKey)
  const meta = getWeaponMeta(weaponKey, rarityOverride)
  const iconSize = compact ? 14 : 16
  const imgSize = compact ? 18 : 22
  const starsText = formatRarityStars(meta.rarity)

  return (
    <span
      data-identifier-kind="weapon"
      data-weapon-key={weaponKey}
      data-weapon-type={meta.weaponType}
      data-rarity={String(meta.rarity)}
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: compact ? '0.35rem' : '0.45rem',
        verticalAlign: 'middle',
      }}
    >
      {/* Dark surface weapon badge chip with Genshin rarity-coloured border */}
      <span
        data-testid="weapon-chip"
        title={`${meta.displayName} (${starsText} ${meta.weaponTypeLabel})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.32rem',
          padding: compact ? '0.14rem 0.48rem' : '0.2rem 0.58rem',
          borderRadius: '6px',
          background: ITEM_DARK_SURFACE_BG,
          color: 'var(--fg)',
          border: `1px solid ${meta.rarityColor.border}`,
          fontWeight: 700,
          fontSize: compact ? '0.8rem' : '0.86rem',
          lineHeight: 1.2,
        }}
      >
        {imageFailed ? (
          <WeaponTypeIcon
            weaponType={meta.weaponType}
            iconProps={{ size: iconSize }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={iconUrl}
            alt={meta.displayName}
            width={imgSize}
            height={imgSize}
            loading="lazy"
            decoding="async"
            onError={() => setFailedKey(weaponKey)}
            style={{
              width: `${imgSize}px`,
              height: `${imgSize}px`,
              objectFit: 'contain',
              borderRadius: '4px',
              display: 'block',
              flexShrink: 0,
            }}
          />
        )}
        <strong>{meta.displayName}</strong>
      </span>

      <RarityStars rarity={meta.rarity} compact={compact} />

      {subtitle && (
        <span
          className="muted"
          style={{ fontSize: compact ? '0.76rem' : '0.82rem' }}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
}

export function ArtifactBadge({
  setKey,
  slotKey,
  rarity,
  compact = false,
  slotOnly = false,
  subtitle,
}: ArtifactBadgeProps) {
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const pieceKey = setKey && slotKey ? `${setKey}-${slotKey}` : null
  const imageFailed = pieceKey !== null && failedKey === pieceKey
  const iconUrl =
    setKey && slotKey ? getCdnArtifactIconUrl(setKey, slotKey) : null
  const meta = getArtifactMeta({ setKey, slotKey, rarity })
  const stripSize = compact ? 22 : 26
  const iconSize = compact ? 14 : 16
  const starsText = formatRarityStars(meta.rarity)

  return (
    <span
      data-identifier-kind="artifact"
      data-artifact-set={setKey}
      data-slot={slotKey ?? 'set'}
      data-rarity={String(meta.rarity)}
      data-hue={String(meta.hue)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.32rem' : '0.42rem',
        verticalAlign: 'middle',
      }}
    >
      {/* Dark surface strip with rarity-coloured border behind the artifact piece image or slot SVG glyph */}
      <span
        data-testid="artifact-slot-strip"
        title={`${meta.setDisplayName}${
          slotKey ? ` · ${meta.slotDisplayName}` : ''
        } (${starsText})`}
        style={{
          width: `${stripSize}px`,
          height: `${stripSize}px`,
          minWidth: `${stripSize}px`,
          borderRadius: '5px',
          overflow: 'hidden',
          background: ITEM_DARK_SURFACE_BG,
          color: 'var(--fg)',
          border: `1px solid ${meta.rarityColor.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {slotKey ? (
          iconUrl && !imageFailed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={iconUrl}
              alt={`${meta.setDisplayName} · ${meta.slotDisplayName}`}
              width={stripSize}
              height={stripSize}
              loading="lazy"
              decoding="async"
              onError={() => setFailedKey(pieceKey)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (
            <SlotIcon slotKey={slotKey} iconProps={{ size: iconSize }} />
          )
        ) : (
          <SetEmblemIcon size={iconSize} />
        )}
      </span>

      {/* Compact dark surface chip with rarity-coloured border and set short name (omitted when slotOnly) */}
      {!slotOnly && (
        <span
          data-testid="artifact-set-chip"
          title={meta.setDisplayName}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.28rem',
            padding: compact ? '0.1rem 0.42rem' : '0.15rem 0.5rem',
            borderRadius: '999px',
            background: ITEM_DARK_SURFACE_BG,
            color: 'var(--fg)',
            border: `1px solid ${meta.rarityColor.border}`,
            fontSize: compact ? '0.76rem' : '0.82rem',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          <strong>{meta.setShortName}</strong>
        </span>
      )}

      {subtitle && (
        <span
          className="muted"
          style={{ fontSize: compact ? '0.76rem' : '0.82rem' }}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
}

export interface StatChipProps {
  statKey: string
  value?: number | string
  /** When true, includes the short stat label alongside the glyph and value. */
  showLabel?: boolean
  /** Emphasises main-stat chips over substat chips. */
  isMain?: boolean
  compact?: boolean
  /** Optional GO substat roll breakdown for substat chips. */
  substatBreakdown?: SubstatRollBreakdown
}

export function formatSubstatRollBreakdownLine(
  sub: SubstatRollBreakdown
): string {
  const label = shortStatLabel(sub.key)
  const isPct = sub.key.endsWith('_')
  const unit = isPct ? '%' : ''
  const valStr = `${
    isPct ? sub.value.toFixed(1).replace(/\.0$/, '') : Math.round(sub.value)
  }${unit}`
  const maxStr = `${
    isPct ? sub.maxRoll.toFixed(2).replace(/\.?0+$/, '') : sub.maxRoll
  }${unit}`
  const rollsStr = sub.rolls
    .map((r) => (isPct ? r.toFixed(2).replace(/\.?0+$/, '') : String(r)))
    .join(' + ')
  return `${label} ${valStr}: ${sub.rollCount} roll${
    sub.rollCount === 1 ? '' : 's'
  } (${rollsStr} / max ${maxStr}) = ${Math.round(sub.rv)}% RV`
}

export function ArtifactRvBadge({
  rv,
  compact = false,
}: {
  rv: ArtifactRollValueResult
  compact?: boolean
}) {
  const breakdownLines = rv.substats.map(formatSubstatRollBreakdownLine)
  const tooltip = [
    `Roll Value: ${rv.totalRvRounded}% (${rv.totalRv.toFixed(1)}% · ${rv.totalRolls} rolls)`,
    ...breakdownLines,
  ].join('\n')

  return (
    <span
      data-testid="artifact-rv-badge"
      data-rv={rv.totalRv.toFixed(1)}
      data-rv-rounded={String(rv.totalRvRounded)}
      data-total-rolls={String(rv.totalRolls)}
      title={tooltip}
      aria-label={`Roll Value ${rv.totalRvRounded}%`}
      className="gi-rv-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding: compact ? '0.06rem 0.34rem' : '0.1rem 0.42rem',
        borderRadius: '4px',
        fontSize: compact ? '0.72rem' : '0.76rem',
        fontWeight: 700,
        background:
          rv.totalRv >= 600
            ? 'rgba(76, 195, 138, 0.16)'
            : rv.totalRv >= 450
              ? 'rgba(122, 162, 255, 0.16)'
              : '#232736',
        color:
          rv.totalRv >= 600
            ? 'var(--ok)'
            : rv.totalRv >= 450
              ? 'var(--accent)'
              : 'var(--fg)',
        border:
          rv.totalRv >= 600
            ? '1px solid rgba(76, 195, 138, 0.45)'
            : rv.totalRv >= 450
              ? '1px solid rgba(122, 162, 255, 0.45)'
              : '1px solid var(--border)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span>{rv.totalRvRounded}% RV</span>
    </span>
  )
}

export function StatChip({
  statKey,
  value,
  showLabel = false,
  isMain = false,
  compact = false,
  substatBreakdown,
}: StatChipProps) {
  const hasGlyph = hasStatIcon(statKey)
  const ele = resolveStatElement(statKey)
  const eleColor =
    ele && ele !== 'physical'
      ? getElementColor(ele as IdentifierElement).fg
      : undefined
  const label = shortStatLabel(statKey)

  let formattedVal = ''
  if (value !== undefined && value !== '') {
    if (typeof value === 'number') {
      const isPct = statKey.endsWith('_')
      formattedVal = `${ isPct ? value.toFixed(1).replace(/\.0$/, '') : Math.round(value) }${isPct ? '%' : ''}`
    } else {
      formattedVal = String(value)
    }
  }

  // If no numeric value is provided (e.g., main stat chip where only mainStatKey is known) or no glyph exists, show short label
  const mustShowTextLabel = showLabel || !hasGlyph || !formattedVal
  const chipTitle = substatBreakdown
    ? formatSubstatRollBreakdownLine(substatBreakdown)
    : formattedVal
      ? `${label} ${formattedVal}`
      : label

  return (
    <span
      data-testid="stat-chip"
      data-stat-key={statKey}
      {...(substatBreakdown
        ? {
            'data-roll-count': String(substatBreakdown.rollCount),
            'data-substat-rv': substatBreakdown.rv.toFixed(1),
            'data-max-roll': String(substatBreakdown.maxRoll),
          }
        : {})}
      title={chipTitle}
      className="gi-stat-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.24rem',
        padding: compact ? '0.08rem 0.34rem' : '0.12rem 0.42rem',
        borderRadius: '5px',
        background: isMain ? 'rgba(122, 162, 255, 0.16)' : '#1d2130',
        border: isMain
          ? '1px solid rgba(122, 162, 255, 0.45)'
          : '1px solid var(--border)',
        fontSize: compact ? '0.74rem' : '0.8rem',
        fontWeight: isMain ? 700 : 500,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {hasGlyph && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: eleColor ?? (isMain ? 'var(--accent)' : 'var(--muted)'),
          }}
        >
          <StatIcon
            statKey={statKey}
            iconProps={{ size: compact ? 12 : 14 }}
          />
        </span>
      )}
      {mustShowTextLabel && (
        <span style={{ color: eleColor ?? 'var(--fg)' }}>{label}</span>
      )}
      {formattedVal && <span>{formattedVal}</span>}
    </span>
  )
}

export function ElementBadge({
  element,
  label,
  compact = false,
}: {
  element: GiElementWithPhyKey
  label?: string
  compact?: boolean
}) {
  const color =
    element !== 'physical'
      ? getElementColor(element as IdentifierElement).fg
      : '#cfd5e6'

  return (
    <span
      data-testid="element-badge"
      data-element={element}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        color,
        fontWeight: 600,
        fontSize: compact ? '0.76rem' : '0.82rem',
      }}
    >
      <ElementIcon ele={element} iconProps={{ size: compact ? 13 : 15 }} />
      {label !== undefined ? <span>{label}</span> : null}
    </span>
  )
}

export const REACTION_ELEMENT_MAP: Record<string, IdentifierElement> = {
  vaporize: 'hydro',
  melt: 'cryo',
  spread: 'dendro',
  aggravate: 'electro',
}

export const REACTION_LABELS: Record<string, string> = {
  vaporize: 'Vaporize',
  melt: 'Melt',
  spread: 'Spread',
  aggravate: 'Aggravate',
}

export const HIT_MODE_LABELS: Record<string, string> = {
  avgHit: 'Avg Hit',
  critHit: 'Crit Hit',
  hit: 'Hit',
  global: 'Global',
}

export function formatHitModeLabel(hitMode?: string): string {
  if (!hitMode) return 'Avg Hit'
  return HIT_MODE_LABELS[hitMode] ?? hitMode
}

export function RotationReactionBadge({
  reaction,
  compact = false,
}: {
  reaction?: string
  compact?: boolean
}) {
  if (!reaction) {
    return (
      <span
        data-testid="rotation-no-reaction"
        data-reaction="none"
        className="muted rotation-no-reaction-chip"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: compact ? '0.73rem' : '0.78rem',
          whiteSpace: 'nowrap',
        }}
      >
        No reaction
      </span>
    )
  }

  const ele = REACTION_ELEMENT_MAP[reaction]
  const label = REACTION_LABELS[reaction] ?? reaction
  const ec = ele ? getElementColor(ele) : null

  return (
    <span
      data-testid="rotation-reaction-chip"
      data-reaction={reaction}
      data-element={ele ?? 'none'}
      className="rotation-reaction-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.24rem',
        padding: compact ? '0.08rem 0.38rem' : '0.12rem 0.45rem',
        borderRadius: '999px',
        background: ec ? ec.bg : '#1d2130',
        color: ec ? ec.fg : 'var(--fg)',
        border: `1px solid ${ec ? ec.border : 'var(--border)'}`,
        fontSize: compact ? '0.73rem' : '0.78rem',
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {ele && <ElementIcon ele={ele} iconProps={{ size: compact ? 12 : 13 }} />}
      <span>{label}</span>
    </span>
  )
}

export function RotationHitModeBadge({
  hitMode,
  compact = false,
}: {
  hitMode?: string
  compact?: boolean
}) {
  const effectiveMode = hitMode || 'avgHit'
  const label = formatHitModeLabel(effectiveMode)

  return (
    <span
      data-testid="rotation-hit-mode"
      data-hit-mode={effectiveMode}
      className="rotation-hit-mode-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: compact ? '0.08rem 0.36rem' : '0.12rem 0.42rem',
        borderRadius: '5px',
        background: '#1d2130',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        fontSize: compact ? '0.73rem' : '0.78rem',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

export interface ArtifactPieceRowProps {
  setKey: string
  slotKey: IdentifierSlotKey
  rarity: number
  level: number
  mainStatKey: string
  substats: ReadonlyArray<{ key: string; value: number }>
  location?: string
  lock?: boolean
  compact?: boolean
}

export function ArtifactPieceRow({
  setKey,
  slotKey,
  rarity,
  level,
  mainStatKey,
  substats,
  location,
  lock,
  compact = false,
}: ArtifactPieceRowProps) {
  const rvInfo = computeArtifactRollValue({
    rarity,
    level,
    substats,
  })
  const artMeta = getArtifactMeta({ setKey, slotKey, rarity })
  const ownerDisplayName = location
    ? getCharacterMeta(location).displayName
    : null

  return (
    <div
      data-testid="artifact-piece-row"
      data-slot={slotKey}
      className="artifact-piece-card"
    >
      <div className="artifact-piece-header">
        <div className="artifact-piece-identity">
          <span
            className="artifact-piece-slot-icon"
            data-testid="artifact-piece-slot-icon"
            title={artMeta.slotDisplayName}
          >
            <SlotIcon slotKey={slotKey} iconProps={{ size: 13 }} />
          </span>
          <ArtifactBadge
            setKey={setKey}
            slotKey={slotKey}
            rarity={rarity}
            compact
          />
          <span
            className="artifact-piece-level"
            data-testid="artifact-piece-level"
          >
            +{level}
          </span>
        </div>
        <ArtifactRvBadge rv={rvInfo} compact={compact} />
      </div>

      <div className="artifact-piece-main-row">
        <StatChip statKey={mainStatKey} isMain compact />
        {(location || lock) && (
          <div className="artifact-piece-badges">
            {location && (
              <span
                className="artifact-piece-owner"
                data-testid="artifact-piece-owner"
                title={`Equipped on ${ownerDisplayName} in imported GOOD data`}
              >
                <CharacterBadge characterKey={location} compact />
              </span>
            )}
            {lock && (
              <span
                className="artifact-piece-lock"
                data-testid="artifact-piece-lock"
                title="Locked in imported GOOD data"
                aria-label="Locked in imported GOOD data"
              >
                🔒
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className="artifact-piece-substats"
        data-testid="artifact-piece-substats"
      >
        {rvInfo.substats.map((s, idx) => {
          const isPct = s.key.endsWith('_')
          const valStr = `${
            isPct ? s.value.toFixed(1).replace(/\.0$/, '') : Math.round(s.value)
          }${isPct ? '%' : ''}`
          const sLabel = shortStatLabel(s.key)
          return (
            <span
              key={`${s.key}-${idx}`}
              className="artifact-substat-line"
              data-testid="artifact-substat-line"
              data-stat-key={s.key}
              data-roll-count={String(s.rollCount)}
              data-substat-rv={s.rv.toFixed(1)}
              data-max-roll={String(s.maxRoll)}
              title={formatSubstatRollBreakdownLine(s)}
            >
              {hasStatIcon(s.key) && (
                <span className="artifact-substat-icon">
                  <StatIcon statKey={s.key} iconProps={{ size: 12 }} />
                </span>
              )}
              <span className="artifact-substat-label">{sLabel}</span>
              <strong className="artifact-substat-val">+{valStr}</strong>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export interface BuildComparisonBarsProps {
  currentTotal?: number
  optimisedTotal?: number
  rank?: number
}

export function BuildComparisonBars({
  currentTotal,
  optimisedTotal,
  rank = 1,
}: BuildComparisonBarsProps) {
  const hasCurrent = currentTotal !== undefined && currentTotal > 0
  const hasOpt = optimisedTotal !== undefined && optimisedTotal > 0
  const maxVal = Math.max(currentTotal ?? 0, optimisedTotal ?? 0, 1)
  const currPct = hasCurrent
    ? Math.max(4, Math.min(100, ((currentTotal ?? 0) / maxVal) * 100))
    : 0
  const optPct = hasOpt
    ? Math.max(4, Math.min(100, ((optimisedTotal ?? 0) / maxVal) * 100))
    : 0

  const diff =
    hasCurrent && hasOpt ? (optimisedTotal ?? 0) - (currentTotal ?? 0) : null
  const diffPct =
    diff !== null && (currentTotal ?? 0) > 0
      ? (diff / (currentTotal ?? 1)) * 100
      : null

  return (
    <div
      data-testid="build-comparison-bars"
      className="gi-comp-bars"
      style={{
        background: '#151821',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '0.75rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}
    >
      {hasCurrent && (
        <div
          data-testid="comparison-bar-current"
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr auto',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Current Build
          </span>
          <div
            style={{
              height: '16px',
              background: '#0e1017',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <div
              data-testid="comparison-bar-current-fill"
              style={{
                width: `${currPct.toFixed(1)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4b5578, #7aa2ff)',
                borderRadius: '999px',
              }}
            />
          </div>
          <strong style={{ fontSize: '1.25rem', minWidth: '105px', textAlign: 'right' }}>
            {Math.round(currentTotal ?? 0).toLocaleString()}
          </strong>
        </div>
      )}

      {hasOpt && (
        <div
          data-testid="comparison-bar-optimised"
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr auto',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <span className="ok" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Optimised #{rank}
          </span>
          <div
            style={{
              height: '16px',
              background: '#0e1017',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(76, 195, 138, 0.45)',
            }}
          >
            <div
              data-testid="comparison-bar-optimised-fill"
              style={{
                width: `${optPct.toFixed(1)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2b8a62, #4cc38a)',
                borderRadius: '999px',
              }}
            />
          </div>
          <strong
            className="ok"
            style={{ fontSize: '1.25rem', minWidth: '105px', textAlign: 'right' }}
          >
            {Math.round(optimisedTotal ?? 0).toLocaleString()}
          </strong>
        </div>
      )}

      {diff !== null && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            paddingTop: '0.15rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span className="muted">
            Proportional rotation total (100% = larger build)
          </span>
          <strong className={diff >= 0 ? 'ok' : 'error'}>
            {diff >= 0 ? '+' : ''}
            {Math.round(diff).toLocaleString()}
            {diffPct !== null
              ? ` (${diff >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`
              : ''}
          </strong>
        </div>
      )}
    </div>
  )
}

export function ItemIdentifier(props: ItemIdentifierProps) {
  if (props.kind === 'character') {
    return (
      <CharacterBadge
        characterKey={props.characterKey}
        simulated={props.simulated}
        role={props.role}
        subtitle={props.subtitle}
        compact={props.compact}
      />
    )
  }
  if (props.kind === 'weapon') {
    return (
      <WeaponBadge
        weaponKey={props.weaponKey}
        subtitle={props.subtitle}
        compact={props.compact}
      />
    )
  }
  return (
    <ArtifactBadge
      setKey={props.setKey}
      slotKey={props.slotKey}
      rarity={props.rarity}
      subtitle={props.subtitle}
      compact={props.compact}
    />
  )
}
