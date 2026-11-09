'use client'

import { SetEmblemIcon, WeaponTypeIcon } from '@/components/SvgIcons'
import {
  getArtifactMeta,
  getCdnArtifactIconUrl,
  getCdnIconUrl,
  getCharacterMeta,
  getRarityColor,
  getWeaponMeta,
  ITEM_DARK_SURFACE_BG,
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
  value?: string
  selectedIds?: readonly string[]
  onChange: (nextId: string) => void
  ariaLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  imageSize?: number
}

export function WeaponTilePicker({
  options,
  value,
  selectedIds,
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
        {filtered.length === 0 ? (
          <div
            className="muted"
            data-testid="weapon-picker-empty"
            style={{
              gridColumn: '1 / -1',
              fontSize: '0.84rem',
              padding: '0.4rem',
              textAlign: 'center',
            }}
          >
            {search.trim()
              ? `No weapons match “${search}”.`
              : 'No weapons available.'}
          </div>
        ) : (
          filtered.map((opt) => {
            const meta = getWeaponMeta(opt.weaponKey)
            const label = opt.label ?? meta.displayName
            const isSelected = selectedIds
              ? selectedIds.includes(opt.id)
              : value === opt.id
            const imageFailed = Boolean(failedKeys[opt.weaponKey])
            const iconUrl = getCdnIconUrl(opt.weaponKey)
            const borderWidth = isSelected ? 3 : 2

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
                {isSelected && (
                  <span
                    data-testid="tile-selected-check"
                    aria-hidden="true"
                    className="tile-picker-check"
                  >
                    ✓
                  </span>
                )}
                <span
                  className="tile-picker-frame"
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    background: ITEM_DARK_SURFACE_BG,
                    color: 'var(--fg)',
                    border: `${borderWidth}px solid ${meta.rarityColor.border}`,
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
                          search:
                            typeof prev?.search === 'string' ? prev.search : '',
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
                  <span className="tile-picker-subcaption">
                    {opt.subcaption}
                  </span>
                )}
              </button>
            )
          })
        )}
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
        {filtered.length === 0 ? (
          <div
            className="muted"
            data-testid="character-picker-empty"
            style={{
              gridColumn: '1 / -1',
              fontSize: '0.84rem',
              padding: '0.4rem',
              textAlign: 'center',
            }}
          >
            {search.trim()
              ? `No characters match “${search}”.`
              : 'No characters available.'}
          </div>
        ) : (
          filtered.map((opt) => {
            const isSelected = selectedKeys
              ? selectedKeys.includes(opt.key)
              : value === opt.key
            const borderWidth = isSelected ? 3 : 2

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
                  {isSelected && (
                    <span
                      data-testid="tile-selected-check"
                      aria-hidden="true"
                      className="tile-picker-check"
                    >
                      ✓
                    </span>
                  )}
                  <span
                    className="tile-picker-frame"
                    style={{
                      width: `${imageSize}px`,
                      height: `${imageSize}px`,
                      background: ITEM_DARK_SURFACE_BG,
                      color: 'var(--fg)',
                      border: `${borderWidth}px solid ${rc.border}`,
                    }}
                  >
                    ALL
                  </span>
                  <span className="tile-picker-caption">{allLabel}</span>
                </button>
              )
            }

            const meta = getCharacterMeta(opt.key)
            const effectiveRarity = opt.rarity ?? meta.rarity
            const rc = getRarityColor(effectiveRarity)
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
                data-rarity={String(effectiveRarity)}
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
                {isSelected && (
                  <span
                    data-testid="tile-selected-check"
                    aria-hidden="true"
                    className="tile-picker-check"
                  >
                    ✓
                  </span>
                )}
                <span
                  className="tile-picker-frame"
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    background: meta.elementColor.bg,
                    color: meta.elementColor.fg,
                    border: imageFailed
                      ? `${borderWidth}px dashed ${rc.border}`
                      : `${borderWidth}px solid ${rc.border}`,
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
                          search:
                            typeof prev?.search === 'string' ? prev.search : '',
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
                  <span className="tile-picker-subcaption">
                    {opt.subcaption}
                  </span>
                )}
              </button>
            )
          })
        )}
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
            {value === '' && (
              <span
                data-testid="tile-selected-check"
                aria-hidden="true"
                className="tile-picker-check"
              >
                ✓
              </span>
            )}
            <span
              className="tile-picker-frame"
              style={{
                width: `${imageSize}px`,
                height: `${imageSize}px`,
                background: ITEM_DARK_SURFACE_BG,
                color: 'var(--muted)',
                border: `${value === '' ? 3 : 2}px solid ${rc1.border}`,
              }}
            >
              —
            </span>
            <span className="tile-picker-caption">No 4p Set</span>
          </button>
        )}

        {filtered.length === 0 ? (
          <div
            className="muted"
            data-testid="artifact-set-picker-empty"
            style={{
              gridColumn: '1 / -1',
              fontSize: '0.84rem',
              padding: '0.4rem',
              textAlign: 'center',
            }}
          >
            {search.trim()
              ? `No artifact sets match “${search}”.`
              : 'No artifact sets available.'}
          </div>
        ) : (
          filtered.map((sk) => {
            const meta = getArtifactMeta({ setKey: sk, slotKey: 'flower' })
            const isSelected = value === sk
            const imageFailed = Boolean(failedKeys[sk])
            const iconUrl = getCdnArtifactIconUrl(sk, 'flower')
            const borderWidth = isSelected ? 3 : 2

            return (
              <button
                key={sk}
                type="button"
                data-testid={`artifact-set-picker-tile-${sk}`}
                data-artifact-set={sk}
                data-rarity={String(meta.rarity)}
                data-selected={isSelected ? 'true' : 'false'}
                aria-pressed={isSelected}
                aria-label={meta.setDisplayName}
                className={`tile-picker-item${isSelected ? ' is-selected' : ''}`}
                onClick={() => onChange(sk)}
              >
                {isSelected && (
                  <span
                    data-testid="tile-selected-check"
                    aria-hidden="true"
                    className="tile-picker-check"
                  >
                    ✓
                  </span>
                )}
                <span
                  className="tile-picker-frame"
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    background: ITEM_DARK_SURFACE_BG,
                    color: 'var(--fg)',
                    border: `${borderWidth}px solid ${meta.rarityColor.border}`,
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
                          search:
                            typeof prev?.search === 'string' ? prev.search : '',
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
                <span className="tile-picker-caption">
                  {meta.setDisplayName}
                </span>
              </button>
            )
          })
        )}
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

  return (
    <div className="tile-picker-wrap" data-testid="preset-tile-picker">
      <div
        role="group"
        aria-label={ariaLabel}
        className="tile-picker-grid tile-picker-grid-presets"
      >
        {presets.map((p) => {
          const meta = getCharacterMeta(p.target)
          const rc = getRarityColor(meta.rarity)
          const badge = getPresetBadge(p)
          const shortKindLabel =
            badge.kind === 'akasha'
              ? 'AKASHA'
              : badge.kind === 'official'
                ? 'OFFICIAL'
                : 'CUSTOM'
          const isSelected = value === p.id
          const imageFailed = Boolean(failedKeys[p.target])
          const iconUrl = getCdnIconUrl(p.target)
          const borderWidth = isSelected ? 3 : 2

          return (
            <button
              key={p.id}
              type="button"
              data-testid={`preset-picker-tile-${p.id}`}
              data-preset-id={p.id}
              data-character-key={p.target}
              data-element={meta.element}
              data-rarity={String(meta.rarity)}
              data-selected={isSelected ? 'true' : 'false'}
              aria-pressed={isSelected}
              aria-label={`[${badge.label}] ${p.name} (Target: ${meta.displayName})`}
              className={`tile-picker-item${isSelected ? ' is-selected' : ''}`}
              onClick={() => onChange(p.id)}
            >
              {isSelected && (
                <span
                  data-testid="tile-selected-check"
                  aria-hidden="true"
                  className="tile-picker-check"
                >
                  ✓
                </span>
              )}
              <span
                className="tile-picker-frame"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  background: meta.elementColor.bg,
                  color: meta.elementColor.fg,
                  border: imageFailed
                    ? `${borderWidth}px dashed ${rc.border}`
                    : `${borderWidth}px solid ${rc.border}`,
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
              <span
                className={`tile-picker-kind-badge is-${badge.kind}`}
                data-testid={`preset-picker-badge-${p.id}`}
                data-badge-kind={badge.kind}
                title={badge.label}
              >
                {shortKindLabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
