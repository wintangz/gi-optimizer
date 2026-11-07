import type { IGOOD } from '@gi/good'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => React.createElement('a', { href, ...rest }, children),
}))

let mockRecord: {
  good: IGOOD
  importedAt: string
  fileName?: string
  source: string
} | null = null

vi.mock('@/lib/storage/useGood', () => ({
  useGoodStorage: () => ({
    record: mockRecord,
    loading: false,
    save: vi.fn(),
    clear: vi.fn(),
  }),
}))

import Home from '../src/app/page'

describe('Home Page Progress State (home-progress-state)', () => {
  it('shows Step 1 as undone when no GOOD data is stored', () => {
    mockRecord = null
    const html = renderToStaticMarkup(<Home />)

    expect(html).toContain(
      'data-testid="home-step-1" data-step-status="undone"'
    )
    expect(html).toContain('data-testid="home-step-1-badge"')
    expect(html).toContain('>1<')
    expect(html).toContain('>Go to Import<')
    expect(html).not.toContain('data-testid="home-step-1-done-pill"')
    expect(html).not.toContain('data-testid="home-step-2-next-pill"')
  })

  it('shows Step 1 in a done state with stored counts and a re-import link and points at Step 2 when GOOD data is stored', () => {
    mockRecord = {
      importedAt: '2026-11-08T00:00:00.000Z',
      fileName: 'my_account.json',
      source: 'Irminsul',
      good: {
        format: 'GOOD',
        version: 3,
        source: 'Irminsul',
        characters: [
          {
            key: 'Furina',
            level: 90,
            constellation: 0,
            ascension: 6,
            talent: { auto: 1, skill: 10, burst: 10 },
          },
          {
            key: 'Neuvillette',
            level: 90,
            constellation: 1,
            ascension: 6,
            talent: { auto: 10, skill: 8, burst: 8 },
          },
        ],
        weapons: [
          {
            id: 'w1',
            key: 'FavoniusSword',
            level: 90,
            ascension: 6,
            refinement: 5,
            location: 'Furina',
            lock: true,
          },
        ],
        artifacts: [
          {
            id: 'a1',
            setKey: 'GoldenTroupe',
            slotKey: 'flower',
            level: 20,
            rarity: 5,
            mainStatKey: 'hp',
            location: 'Furina',
            lock: true,
            substats: [{ key: 'critRate_', value: 3.9 }],
          },
          {
            id: 'a2',
            setKey: 'GoldenTroupe',
            slotKey: 'plume',
            level: 20,
            rarity: 5,
            mainStatKey: 'atk',
            location: 'Furina',
            lock: true,
            substats: [{ key: 'critDMG_', value: 14.0 }],
          },
          {
            id: 'a3',
            setKey: 'MarechausseeHunter',
            slotKey: 'flower',
            level: 20,
            rarity: 5,
            mainStatKey: 'hp',
            location: 'Neuvillette',
            lock: true,
            substats: [{ key: 'critDMG_', value: 21.0 }],
          },
        ],
      },
    }

    const html = renderToStaticMarkup(<Home />)

    expect(html).toContain('data-testid="home-step-1" data-step-status="done"')
    expect(html).toContain('data-testid="home-step-1-done-pill"')
    expect(html).toContain('>✓<')
    expect(html).toContain('data-testid="home-step-1-counts"')
    expect(html).toContain('<strong>2</strong> characters')
    expect(html).toContain('<strong>1</strong> weapons')
    expect(html).toContain('<strong>3</strong> artifacts')
    expect(html).toContain('data-testid="home-step-1-reimport"')
    expect(html).toContain('>Re-import Account Data<')
    expect(html).toContain('data-testid="home-step-2" data-step-status="next"')
    expect(html).toContain('data-testid="home-step-2-next-pill"')
    expect(html).toContain('>Next Step<')
  })
})
