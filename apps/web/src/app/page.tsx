'use client'

import {
  FunnelIcon,
  GearIcon,
  PlayIcon,
  UploadIcon,
} from '@/components/SvgIcons'
import { useGoodStorage } from '@/lib/storage/useGood'
import Link from 'next/link'

export default function Home() {
  const { record } = useGoodStorage()
  const good = record?.good
  const hasGood = Boolean(good)

  return (
    <div className="gi-page">
      <section className="panel gi-hero-card">
        <div>
          <h1 className="gi-page-title">gi-optimizer</h1>
          <p className="gi-page-subtitle">
            A personal, preset-first build optimizer using exact Genshin
            Optimizer formulas. Everything runs locally in your browser —
            nothing is uploaded.
          </p>
        </div>
        <div className="preset-detail-actions">
          {!hasGood ? (
            <>
              <Link href="/import">
                <button type="button" className="btn-primary btn-icon">
                  <UploadIcon size={15} />
                  <span>Import GOOD JSON</span>
                </button>
              </Link>
              <Link href="/optimize">
                <button type="button" className="btn-secondary btn-icon">
                  <PlayIcon size={15} />
                  <span>Optimize</span>
                </button>
              </Link>
              <Link href="/presets">
                <button type="button" className="btn-secondary btn-icon">
                  <FunnelIcon size={15} />
                  <span>Browse Presets</span>
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/presets">
                <button type="button" className="btn-primary btn-icon">
                  <FunnelIcon size={15} />
                  <span>Browse Presets</span>
                </button>
              </Link>
              <Link href="/optimize">
                <button type="button" className="btn-secondary btn-icon">
                  <PlayIcon size={15} />
                  <span>Optimize</span>
                </button>
              </Link>
              <Link href="/import">
                <button type="button" className="btn-secondary btn-icon">
                  <UploadIcon size={15} />
                  <span>Re-import GOOD JSON</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="gi-step-grid" aria-label="Getting started steps">
        <div
          className={`panel gi-step-card${hasGood ? ' is-done' : ''}`}
          data-testid="home-step-1"
          data-step-status={hasGood ? 'done' : 'undone'}
        >
          <div>
            <div className="preset-gear-row" style={{ marginBottom: '0.45rem' }}>
              <span
                className={`gi-step-number${hasGood ? ' is-done' : ''}`}
                data-testid="home-step-1-badge"
                aria-label={hasGood ? 'Step 1 completed' : 'Step 1'}
              >
                {hasGood ? '✓' : '1'}
              </span>
              <h2 className="gi-card-title">Import Account Data</h2>
              {hasGood && (
                <span
                  className="ok"
                  data-testid="home-step-1-done-pill"
                  style={{ fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Done
                </span>
              )}
            </div>
            {hasGood && good ? (
              <p
                className="gi-card-subtitle"
                data-testid="home-step-1-counts"
              >
                Stored account (
                <strong>{record?.fileName || record?.source}</strong>):{' '}
                <strong>{good.characters.length}</strong> characters ·{' '}
                <strong>{good.weapons.length}</strong> weapons ·{' '}
                <strong>{good.artifacts.length}</strong> artifacts.
              </p>
            ) : (
              <p className="gi-card-subtitle">
                Drop or paste a GOOD v1–v3 JSON export from your scanner (e.g.
                Irminsul or Artiscan) into local browser storage.
              </p>
            )}
          </div>
          <div>
            <Link href="/import" data-testid="home-step-1-reimport">
              <button type="button" className="btn-secondary btn-icon">
                <UploadIcon size={15} />
                <span>{hasGood ? 'Re-import Account Data' : 'Go to Import'}</span>
              </button>
            </Link>
          </div>
        </div>

        <div
          className={`panel gi-step-card${hasGood ? ' is-next' : ''}`}
          data-testid="home-step-2"
          data-step-status={hasGood ? 'next' : 'pending'}
        >
          <div>
            <div className="preset-gear-row" style={{ marginBottom: '0.45rem' }}>
              <span className="gi-step-number">2</span>
              <h2 className="gi-card-title">Pick or Build a Preset</h2>
              {hasGood && (
                <span
                  className="comp-baseline-tag"
                  data-testid="home-step-2-next-pill"
                >
                  Next Step
                </span>
              )}
            </div>
            <p className="gi-card-subtitle">
              Choose an Akasha leaderboard preset, an Official meta team setup,
              or author your own custom team and rotation.
            </p>
          </div>
          <div className="preset-detail-actions">
            <Link href="/presets">
              <button
                type="button"
                className={`${hasGood ? 'btn-primary' : 'btn-secondary'} btn-icon`}
              >
                <FunnelIcon size={15} />
                <span>Browse Presets</span>
              </button>
            </Link>
            <Link href="/teams">
              <button type="button" className="btn-secondary btn-icon">
                <GearIcon size={15} />
                <span>Custom Teams</span>
              </button>
            </Link>
          </div>
        </div>

        <div
          className="panel gi-step-card"
          data-testid="home-step-3"
          data-step-status="pending"
        >
          <div>
            <div className="preset-gear-row" style={{ marginBottom: '0.45rem' }}>
              <span className="gi-step-number">3</span>
              <h2 className="gi-card-title">Optimize Rotation Damage</h2>
            </div>
            <p className="gi-card-subtitle">
              Set final stat floors or caps, search your artifact pool across
              worker threads, and compare ranked builds against your current
              loadout.
            </p>
          </div>
          <div>
            <Link href="/optimize">
              <button type="button" className="btn-primary btn-icon">
                <PlayIcon size={15} />
                <span>Optimize</span>
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
