'use client'

import { SetEmblemIcon, WeaponTypeIcon } from '@/components/SvgIcons'
import {
  getArtifactMeta,
  getCdnArtifactIconUrl,
  getCdnIconUrl,
  getCharacterMeta,
  getRarityColor,
  getWeaponMeta,
} from '@/lib/itemMeta'
import { displayName, getPresetBadge, type Preset } from '@gi/presets'
import { useMemo, useState } from 'react'

export interface WeaponTileOption {
  /** Unique identifier returned to `onChange` (weaponKey or owned weapon instance id). */
  id: string
  /** App weapon key used for CDN icon lookup and rarity metadata. */
  weaponKey: string
  /** Optional display caption override (defaults to `meta.displayName`). */
  label?: string
  /** Optional secondary line (e.g. `"R1 · Lv.90"` or `"(on Furina)"`). */
  subcaption?: string
  /** Marks tile ineligible/disabled and dims it visually. */
  disabled?: boolean
}

export interface WeaponTilePickerProps {
  options: readonly WeaponTileOption[]
  value: string
  onChange: (nextId: string) => void
  ariaLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  imageSize?: number
}

export function WeaponTilePicker({
  options,
  value,
  onChange,
  ariaLabel,
  searchable = options.length > 6,
  searchPlaceholder = 'Search weapons…',
  imageSize = 60,
}: WeaponTilePickerProps) {
  const [pickerState, setPickerState] = useState<{
    search: string
    failedKeys: Record<string, boolean>
  }>({ search: '', failedKeys: {} })
  const search = typeof pickerState?.search === 'string' ? pickerState.search : ''
  const failedKeys = pickerState?.failedKeys ?? {}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => {
      const name = (
        opt.label ?? getWeaponMeta(opt.weaponKey).displayName
      ).toLowerCase()
      const sub = (opt.subcaption ?? '').toLowerCase()
      return (
        opt.weaponKey.toLowerCase().includes(q) ||
        name.includes(q) ||
        sub.includes(q)
      )
    })
  }, [options, search])

  return (
    <div className="tile-picker-wrap" data-testid="weapon-tile-picker">
      {searchable && (
        <div className="tile-picker-toolbar">
          <input
            type="search"
            className="tile-picker-search"
            aria-label={`Search ${ariaLabel}`}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) =>
              setPickerState((prev) => ({
                search: e.target.value,
                failedKeys: prev?.failedKeys ?? {},
              }))
            }
          />
        </div>
      )}

      <div
        role="group"
        aria-label={ariaLabel}
        className="tile-picker-grid"
      >
        {filtered.map((opt) => {
          const meta = getWeaponMeta(opt.weaponKey)
          const label = opt.label ?? meta.displayName
          const isSelected = value === opt.id
          const imageFailed = Boolean(failedKeys[opt.weaponKey])
          const iconUrl = getCdnIconUrl(opt.weaponKey)

          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`weapon-picker-tile-${opt.id}`}
              data-weapon-key={opt.weaponKey}
              data-rarity={String(meta.rarity)}
              data-selected={isSelected ? 'true' : 'false'}
              aria-pressed={isSelected}
              aria-label={
                opt.subcaption ? `${label} (${opt.subcaption})` : label
              }
              disabled={opt.disabled}
              className={`tile-picker-item${isSelected ? ' is-selected' : ''}${
                opt.disabled ? ' is-disabled' : ''
              }`}
              onClick={() => {
                if (!opt.disabled) onChange(opt.id)
              }}
            >
              <span
                className="tile-picker-frame"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  background: meta.rarityColor.bg,
                  color: meta.rarityColor.fg,
                  border: `1px solid ${meta.rarityColor.border}`,
                }}
              >
                {imageFailed ? (
                  <WeaponTypeIcon
                    weaponType={meta.weaponType}
                    iconProps={{ size: Math.round(imageSize * 0.46) }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={iconUrl}
                    alt={label}
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setPickerState((prev) => ({
                        search: typeof prev?.search === 'string' ? prev.search : '',
                        failedKeys: {
                          ...(prev?.failedKeys ?? {}),
                          [opt.weaponKey]: true,
                        },
                      }))
                    }
                    className="tile-picker-img"
                  />
                )}
              </span>
              <span className="tile-picker-caption">{label}</span>
              {opt.subcaption && (
                <span className="tile-picker-subcaption">{opt.subcaption}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface CharacterTileOption {
  /** Character key, or `""` for an "All Characters" filter option. */
  key: string
  label?: string
  subcaption?: string
  disabled?: boolean
  rarity?: number
}

export interface CharacterTilePickerProps {
  options: readonly CharacterTileOption[]
  /** Selected character key in single-select mode. */
  value?: string
  /** Selected character keys in multi-select mode (e.g. Protected Characters). */
  selectedKeys?: readonly string[]
  onChange: (characterKey: string) => void
  ariaLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  imageSize?: number
}

export function CharacterTilePicker({
  options,
  value,
  selectedKeys,
  onChange,
  ariaLabel,
  searchable = options.length > 8,
  searchPlaceholder = 'Search characters…',
  imageSize = 60,
}: CharacterTilePickerProps) {
  const [pickerState, setPickerState] = useState<{
    search: string
    failedKeys: Record<string, boolean>
  }>({ search: '', failedKeys: {} })
  const search = typeof pickerState?.search === 'string' ? pickerState.search : ''
  const failedKeys = pickerState?.failedKeys ?? {}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => {
      if (!opt.key) return 'all characters'.includes(q)
      const label = (opt.label ?? displayName(opt.key)).toLowerCase()
      return opt.key.toLowerCase().includes(q) || label.includes(q)
    })
  }, [options, search])

  return (
    <div className="tile-picker-wrap" data-testid="character-tile-picker">
      {searchable && (
        <div className="tile-picker-toolbar">
          <input
            type="search"
            className="tile-picker-search"
            aria-label={`Search ${ariaLabel}`}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) =>
              setPickerState((prev) => ({
                search: e.target.value,
                failedKeys: prev?.failedKeys ?? {},
              }))
            }
          />
        </div>
      )}

      <div
        role="group"
        aria-label={ariaLabel}
        className="tile-picker-grid"
      >
        {filtered.map((opt) => {
          const isSelected = selectedKeys
            ? selectedKeys.includes(opt.key)
            : value === opt.key

          if (!opt.key) {
            const allLabel = opt.label ?? 'All Characters'
            const rc = getRarityColor(4)
            return (
              <button
                key="__all__"
                type="button"
                data-testid="character-picker-tile-all"
                data-character-key=""
                data-selected={isSelected ? 'true' : 'false'}
                aria-pressed={isSelected}
                aria-label={allLabel}
                disabled={opt.disabled}
                className={`tile-picker-item${isSelected ? ' is-selected' : ''}${
                  opt.disabled ? ' is-disabled' : ''
                }`}
                onClick={() => {
                  if (!opt.disabled) onChange('')
                }}
              >
                <span
                  className="tile-picker-frame"
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    background: rc.bg,
                    color: rc.fg,
                    border: `1px solid ${rc.border}`,
                  }}
                >
                  ALL
                </span>
                <span className="tile-picker-caption">{allLabel}</span>
              </button>
            )
          }

          const meta = getCharacterMeta(opt.key)
          const rc = getRarityColor(opt.rarity ?? 5)
          const label = opt.label ?? meta.displayName
          const imageFailed = Boolean(failedKeys[opt.key])
          const iconUrl = getCdnIconUrl(opt.key)

          return (
            <button
              key={opt.key}
              type="button"
              data-testid={`character-picker-tile-${opt.key}`}
              data-character-key={opt.key}
              data-element={meta.element}
              data-selected={isSelected ? 'true' : 'false'}
              aria-pressed={isSelected}
              aria-label={label}
              disabled={opt.disabled}
              className={`tile-picker-item${isSelected ? ' is-selected' : ''}${
                opt.disabled ? ' is-disabled' : ''
              }`}
              onClick={() => {
                if (!opt.disabled) onChange(opt.key)
              }}
            >
              <span
                className="tile-picker-frame"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  background: rc.bg,
                  color: meta.elementColor.fg,
                  border: imageFailed
                    ? `2px dashed ${meta.elementColor.border}`
                    : `2px solid ${meta.elementColor.border}`,
                }}
              >
                {imageFailed ? (
                  meta.initials
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={iconUrl}
                    alt={label}
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setPickerState((prev) => ({
                        search: typeof prev?.search === 'string' ? prev.search : '',
                        failedKeys: {
                          ...(prev?.failedKeys ?? {}),
                          [opt.key]: true,
                        },
                      }))
                    }
                    className="tile-picker-img-cover"
                  />
                )}
              </span>
              <span className="tile-picker-caption">{label}</span>
              {opt.subcaption && (
                <span className="tile-picker-subcaption">{opt.subcaption}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface ArtifactSetTilePickerProps {
  setKeys: readonly string[]
  value: string
  onChange: (nextSetKey: string) => void
  allowNone?: boolean
  ariaLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  imageSize?: number
}

export function ArtifactSetTilePicker({
  setKeys,
  value,
  onChange,
  allowNone = false,
  ariaLabel,
  searchable = setKeys.length > 8,
  searchPlaceholder = 'Search artifact sets…',
  imageSize = 56,
}: ArtifactSetTilePickerProps) {
  const [pickerState, setPickerState] = useState<{
    search: string
    failedKeys: Record<string, boolean>
  }>({ search: '', failedKeys: {} })
  const search = typeof pickerState?.search === 'string' ? pickerState.search : ''
  const failedKeys = pickerState?.failedKeys ?? {}
  const rc5 = getRarityColor(5)
  const rc1 = getRarityColor(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return setKeys
    return setKeys.filter(
      (sk) =>
        sk.toLowerCase().includes(q) ||
        displayName(sk).toLowerCase().includes(q)
    )
  }, [setKeys, search])

  return (
    <div className="tile-picker-wrap" data-testid="artifact-set-tile-picker">
      {searchable && (
        <div className="tile-picker-toolbar">
          <input
            type="search"
            className="tile-picker-search"
            aria-label={`Search ${ariaLabel}`}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) =>
              setPickerState((prev) => ({
                search: e.target.value,
                failedKeys: prev?.failedKeys ?? {},
              }))
            }
          />
        </div>
      )}

      <div
        role="group"
        aria-label={ariaLabel}
        className="tile-picker-grid"
      >
        {allowNone && (
          <button
            type="button"
            data-testid="artifact-set-picker-tile-none"
            data-artifact-set=""
            data-selected={value === '' ? 'true' : 'false'}
            aria-pressed={value === ''}
            aria-label="No 4p Set"
            className={`tile-picker-item${value === '' ? ' is-selected' : ''}`}
            onClick={() => onChange('')}
          >
            <span
              className="tile-picker-frame"
              style={{
                width: `${imageSize}px`,
                height: `${imageSize}px`,
                background: rc1.bg,
                color: rc1.fg,
                border: `1px solid ${rc1.border}`,
              }}
            >
              —
            </span>
            <span className="tile-picker-caption">No 4p Set</span>
          </button>
        )}

        {filtered.map((sk) => {
          const meta = getArtifactMeta({ setKey: sk, slotKey: 'flower', rarity: 5 })
          const isSelected = value === sk
          const imageFailed = Boolean(failedKeys[sk])
          const iconUrl = getCdnArtifactIconUrl(sk, 'flower')

          return (
            <button
              key={sk}
              type="button"
              data-testid={`artifact-set-picker-tile-${sk}`}
              data-artifact-set={sk}
              data-selected={isSelected ? 'true' : 'false'}
              aria-pressed={isSelected}
              aria-label={meta.setDisplayName}
              title={meta.setDisplayName}
              className={`tile-picker-item${isSelected ? ' is-selected' : ''}`}
              onClick={() => onChange(sk)}
            >
              <span
                className="tile-picker-frame"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  background: rc5.bg,
                  color: rc5.fg,
                  border: `1px solid ${rc5.border}`,
                }}
              >
                {imageFailed ? (
                  <SetEmblemIcon size={Math.round(imageSize * 0.46)} />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={iconUrl}
                    alt={meta.setDisplayName}
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setPickerState((prev) => ({
                        search: typeof prev?.search === 'string' ? prev.search : '',
                        failedKeys: {
                          ...(prev?.failedKeys ?? {}),
                          [sk]: true,
                        },
                      }))
                    }
                    className="tile-picker-img"
                  />
                )}
              </span>
              <span className="tile-picker-caption">{meta.setShortName}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface PresetTilePickerProps {
  presets: readonly Preset[]
  value: string
  onChange: (presetId: string) => void
  ariaLabel: string
  imageSize?: number
}

export function PresetTilePicker({
  presets,
  value,
  onChange,
  ariaLabel,
  imageSize = 56,
}: PresetTilePickerProps) {
  const [pickerState, setPickerState] = useState<{
    search: string
    failedKeys: Record<string, boolean>
  }>({ search: '', failedKeys: {} })
  const failedKeys = pickerState?.failedKeys ?? {}
  const rc5 = getRarityColor(5)

  return (
    <div className="tile-picker-wrap" data-testid="preset-tile-picker">
      <div
        role="group"
        aria-label={ariaLabel}
        className="tile-picker-grid tile-picker-grid-presets"
      >
        {presets.map((p) => {
          const meta = getCharacterMeta(p.target)
          const badge = getPresetBadge(p)
          const isSelected = value === p.id
          const imageFailed = Boolean(failedKeys[p.target])
          const iconUrl = getCdnIconUrl(p.target)

          return (
            <button
              key={p.id}
              type="button"
              data-testid={`preset-picker-tile-${p.id}`}
              data-preset-id={p.id}
              data-character-key={p.target}
              data-selected={isSelected ? 'true' : 'false'}
              aria-pressed={isSelected}
              aria-label={`[${badge.label}] ${p.name} (Target: ${meta.displayName})`}
              className={`tile-picker-item${isSelected ? ' is-selected' : ''}`}
              onClick={() => onChange(p.id)}
            >
              <span
                className="tile-picker-frame"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  background: rc5.bg,
                  color: meta.elementColor.fg,
                  border: imageFailed
                    ? `2px dashed ${meta.elementColor.border}`
                    : `2px solid ${meta.elementColor.border}`,
                }}
              >
                {imageFailed ? (
                  meta.initials
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={iconUrl}
                    alt={meta.displayName}
                    width={imageSize}
                    height={imageSize}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setPickerState((prev) => ({
                        search: typeof prev?.search === 'string' ? prev.search : '',
                        failedKeys: {
                          ...(prev?.failedKeys ?? {}),
                          [p.target]: true,
                        },
                      }))
                    }
                    className="tile-picker-img-cover"
                  />
                )}
              </span>
              <span className="tile-picker-caption">{p.name}</span>
              <span className="tile-picker-subcaption">{badge.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
