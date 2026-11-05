'use client'

import {
  getArtifactMeta,
  getCharacterMeta,
  getWeaponMeta,
  type IdentifierSlotKey,
  type IdentifierWeaponType,
} from '@/lib/itemMeta'
import type { ReactNode } from 'react'

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
  /** When true, displays only the slot label as primary text (for slot-only cells) while keeping set/rarity styling. */
  slotOnly?: boolean
  /** Optional level, main stat, substats, or location metadata. */
  subtitle?: ReactNode
}

export type ItemIdentifierProps =
  | ({ kind: 'character' } & CharacterBadgeProps)
  | ({ kind: 'weapon' } & WeaponBadgeProps)
  | ({ kind: 'artifact' } & ArtifactBadgeProps)

function WeaponGlyphSvg({
  weaponType,
  glyph,
  size,
}: {
  weaponType: IdentifierWeaponType
  glyph: string
  size: number
}) {
  return (
    <span
      aria-label={weaponType}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.52)}px`,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  )
}

function ArtifactGlyphSvg({
  slotKey,
  glyph,
  size,
}: {
  slotKey?: IdentifierSlotKey
  glyph: string
  size: number
}) {
  return (
    <span
      aria-label={slotKey ?? 'artifact-set'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.52)}px`,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  )
}

export function CharacterBadge({
  characterKey,
  simulated = false,
  role = 'none',
  compact = false,
  subtitle,
}: CharacterBadgeProps) {
  const meta = getCharacterMeta(characterKey)
  const size = compact ? 24 : 30
  const effectiveRole = simulated ? 'simulated' : role

  return (
    <span
      data-identifier-kind="character"
      data-character-key={characterKey}
      data-element={meta.element}
      data-simulated={simulated ? 'true' : 'false'}
      data-role={effectiveRole}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.4rem' : '0.55rem',
        verticalAlign: 'middle',
      }}
    >
      {/* Element-coloured circular avatar with dashed outer ring when simulated */}
      <span
        title={`${meta.displayName} (${meta.element.toUpperCase()})${
          simulated ? ' — Simulated Preset Build' : ''
        }`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '999px',
          background: meta.elementColor.bg,
          color: meta.elementColor.fg,
          border: simulated
            ? `2px dashed ${meta.elementColor.border}`
            : `2px solid ${meta.elementColor.border}`,
          outline: simulated ? '1px dashed rgba(245, 185, 66, 0.55)' : 'none',
          outlineOffset: '1px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: compact ? '0.68rem' : '0.76rem',
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}
      >
        {meta.initials}
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
              border: '1px dashed var(--warn)',
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

export function WeaponBadge({
  weaponKey,
  rarityOverride,
  compact = false,
  subtitle,
}: WeaponBadgeProps) {
  const meta = getWeaponMeta(weaponKey, rarityOverride)
  const size = compact ? 22 : 28

  return (
    <span
      data-identifier-kind="weapon"
      data-weapon-key={weaponKey}
      data-weapon-type={meta.weaponType}
      data-rarity={String(meta.rarity)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.38rem' : '0.5rem',
        verticalAlign: 'middle',
      }}
    >
      <span
        title={`${meta.displayName} (${meta.rarity}★ ${meta.weaponTypeLabel})`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '999px',
          background: meta.rarityColor.bg,
          color: meta.rarityColor.fg,
          border: `2px solid ${meta.rarityColor.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <WeaponGlyphSvg
          weaponType={meta.weaponType}
          glyph={meta.glyph}
          size={size}
        />
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
            fontSize: compact ? '0.85rem' : '0.92rem',
            fontWeight: 600,
          }}
        >
          {meta.displayName}
        </strong>
        {subtitle && (
          <span
            className="muted"
            style={{ fontSize: compact ? '0.78rem' : '0.84rem' }}
          >
            {subtitle}
          </span>
        )}
      </span>
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
  const meta = getArtifactMeta({ setKey, slotKey, rarity })
  const size = compact ? 22 : 28
  const primaryLabel = slotOnly && slotKey ? meta.slotDisplayName : meta.setDisplayName

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
        gap: compact ? '0.38rem' : '0.5rem',
        verticalAlign: 'middle',
      }}
    >
      <span
        title={`${meta.setDisplayName}${
          slotKey ? ` · ${meta.slotDisplayName}` : ''
        } (${meta.rarity}★)`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          borderRadius: '999px',
          background: meta.setColor.bg,
          color: meta.setColor.fg,
          border: `2px solid ${meta.setColor.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <ArtifactGlyphSvg
          slotKey={slotKey}
          glyph={meta.glyph}
          size={size}
        />
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
            fontSize: compact ? '0.85rem' : '0.92rem',
            fontWeight: 600,
          }}
        >
          {primaryLabel}
        </strong>
        {subtitle && (
          <span
            className="muted"
            style={{ fontSize: compact ? '0.78rem' : '0.84rem' }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
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

