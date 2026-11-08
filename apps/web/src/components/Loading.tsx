import React from 'react'

export interface SpinnerProps {
  /** Accessible status text displayed beside the animated ring (e.g. "Loading optimizer engine…", "Evaluating…", "Parsing GOOD file…"). */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  inline?: boolean
}

const SPINNER_SIZES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 18,
  lg: 24,
}

export function Spinner({
  label = 'Loading…',
  size = 'md',
  inline = false,
}: SpinnerProps) {
  const px = SPINNER_SIZES[size]
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--accent)',
        fontWeight: 500,
        fontSize: size === 'sm' ? '0.82rem' : size === 'lg' ? '1rem' : '0.9rem',
      }}
    >
      <svg
        className="gi-spinner"
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="3"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span>{label}</span>
    </span>
  )
}

export interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  count?: number
  gap?: string | number
  className?: string
  style?: React.CSSProperties
}

export function SkeletonBlock({
  width = '100%',
  height = '1rem',
  borderRadius = 6,
  count = 1,
  gap = '0.5rem',
  className = '',
  style,
}: SkeletonBlockProps) {
  const items = Array.from({ length: Math.max(1, count) })
  if (items.length === 1) {
    return (
      <div
        aria-hidden="true"
        className={`gi-skeleton ${className}`.trim()}
        style={{
          width,
          height,
          borderRadius,
          ...style,
        }}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {items.map((_, i) => (
        <div
          key={i}
          className={`gi-skeleton ${className}`.trim()}
          style={{
            width,
            height,
            borderRadius,
            ...style,
          }}
        />
      ))}
    </div>
  )
}

export interface ResultsSkeletonProps {
  /** Status label shown in the skeleton header (defaults to "Evaluating…"). */
  label?: string
}

export function ResultsSkeleton({
  label = 'Evaluating…',
}: ResultsSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderColor: 'rgba(122, 162, 255, 0.35)',
          background: 'rgba(122, 162, 255, 0.06)',
        }}
      >
        <Spinner label={label} size="md" />
        <SkeletonBlock width={140} height={18} />
      </div>

      {/* 3-card Summary Banner Skeleton */}
      <div
        className="panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <SkeletonBlock width="55%" height={14} />
            <SkeletonBlock width="75%" height={28} />
            <SkeletonBlock width="45%" height={12} />
          </div>
        ))}
      </div>

      {/* Per-Instance Rotation Breakdown Skeleton */}
      <div className="panel">
        <SkeletonBlock width={240} height={20} style={{ marginBottom: '0.85rem' }} />
        <SkeletonBlock height={28} count={5} gap="0.45rem" />
      </div>

      {/* 5-Slot Artifact Loadout Comparison Skeleton */}
      <div className="panel">
        <SkeletonBlock width={220} height={20} style={{ marginBottom: '0.85rem' }} />
        <SkeletonBlock height={42} count={5} gap="0.5rem" />
      </div>
    </div>
  )
}

export interface ProgressBarProps {
  tested: number
  skipped?: number
  total: number
  label?: string
}

export function ProgressBar({
  tested,
  skipped = 0,
  total,
  label = 'Optimizing builds…',
}: ProgressBarProps) {
  const processed = Math.max(0, tested + skipped)
  const isDeterminate = total > 0
  const percent = isDeterminate
    ? Math.max(0, Math.min(100, Math.round((processed / total) * 100)))
    : undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          fontSize: '0.85rem',
        }}
      >
        <Spinner label={label} size="sm" inline />
        <span className="muted">
          Tested <strong>{tested.toLocaleString()}</strong>
          {skipped > 0 && (
            <>
              {' '}
              · Pruned <strong>{skipped.toLocaleString()}</strong>
            </>
          )}
          {isDeterminate && (
            <>
              {' '}
              / <strong>{total.toLocaleString()}</strong> ({percent}%)
            </>
          )}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(isDeterminate ? { 'aria-valuenow': percent } : {})}
        className="gi-progress-track"
      >
        {isDeterminate ? (
          <div
            className="gi-progress-fill"
            style={{ width: `${Math.max(2, percent ?? 0)}%` }}
          />
        ) : (
          <div className="gi-progress-indeterminate" />
        )}
      </div>
    </div>
  )
}
