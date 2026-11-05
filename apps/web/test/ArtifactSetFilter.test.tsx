import { ALL_ARTIFACT_SET_KEYS, DEFAULT_OPTIMIZER_SETTINGS } from '@gi/presets'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArtifactSetFilter } from '../src/components/ArtifactSetFilter'

describe('ArtifactSetFilter Component (artifact-set-filter)', () => {
  it('renders mode switcher, search, bulk actions, checkbox grid, and summary line in "all" mode', () => {
    const html = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={DEFAULT_OPTIMIZER_SETTINGS}
        onChange={() => {}}
      />
    )
    expect(html).toContain('data-testid="artifact-set-filter-summary"')
    expect(html).toContain(
      `All ${ALL_ARTIFACT_SET_KEYS.length} artifact sets allowed`
    )
    expect(html).toContain('>All sets<')
    expect(html).toContain('>Exclude selected<')
    expect(html).toContain('>Only these sets<')
    expect(html).toContain('aria-label="Search artifact sets"')
    expect(html).toContain('>Select all<')
    expect(html).toContain('>Clear<')
    expect(html).toContain('>Invert<')
    expect(html).toContain('aria-label="Artifact sets"')
  })

  it('renders checked sets with 2pc/4pc/Both piece-count controls in "exclude" mode', () => {
    const html = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'exclude',
          setFilterSelection: {
            GoldenTroupe: [2, 4],
            MarechausseeHunter: [4],
          },
        }}
        onChange={() => {}}
      />
    )
    expect(html).toContain(
      `${ALL_ARTIFACT_SET_KEYS.length - 1} of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed (2 excluded)`
    )
    expect(html).toContain('aria-label="Golden Troupe piece count"')
    expect(html).toContain('aria-label="Marechaussee Hunter piece count"')
    expect(html).toContain('>Both<')
    expect(html).toContain('>2pc<')
    expect(html).toContain('>4pc<')
  })

  it('renders allowed count summary in "include" mode for 0 and 3 sets', () => {
    const emptyIncludeHtml = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'include',
          setFilterSelection: {},
        }}
        onChange={() => {}}
      />
    )
    expect(emptyIncludeHtml).toContain(
      `Only 0 of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed`
    )

    const threeIncludeHtml = renderToStaticMarkup(
      <ArtifactSetFilter
        settings={{
          ...DEFAULT_OPTIMIZER_SETTINGS,
          setFilterMode: 'include',
          setFilterSelection: {
            GoldenTroupe: [2, 4],
            MarechausseeHunter: [4],
            EmblemOfSeveredFate: [2, 4],
          },
        }}
        onChange={() => {}}
      />
    )
    expect(threeIncludeHtml).toContain(
      `Only 3 of ${ALL_ARTIFACT_SET_KEYS.length} sets allowed`
    )
  })
})
