import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ProgressBar,
  ResultsSkeleton,
  SkeletonBlock,
  Spinner,
} from '../src/components/Loading'

describe('Shared Loading Primitives (loading-and-bundle)', () => {
  it('renders Spinner with status role, aria-live, and optional label', () => {
    const html = renderToStaticMarkup(
      <Spinner label="Loading optimizer engine…" size="md" />
    )
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('class="gi-spinner"')
    expect(html).toContain('Loading optimizer engine…')
  })

  it('renders SkeletonBlock and ResultsSkeleton with pulse animation', () => {
    const blockHtml = renderToStaticMarkup(
      <SkeletonBlock width="120px" height={24} />
    )
    expect(blockHtml).toContain('class="gi-skeleton"')
    expect(blockHtml).toContain('width:120px')

    const resultsHtml = renderToStaticMarkup(
      <ResultsSkeleton label="Evaluating current build…" />
    )
    expect(resultsHtml).toContain('aria-busy="true"')
    expect(resultsHtml).toContain('Evaluating current build…')
  })

  it('renders ProgressBar with deterministically clamped percentage and tested / total counts', () => {
    const html = renderToStaticMarkup(
      <ProgressBar
        tested={2500}
        skipped={500}
        total={10000}
        label="Searching artifact combinations…"
      />
    )
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="30"')
    expect(html).toContain('(30%)')
    expect(html).toContain('Tested')
    expect(html).toContain('2,500')
    expect(html).toContain('Pruned')
    expect(html).toContain('500')
    expect(html).toContain('10,000')
  })
})
