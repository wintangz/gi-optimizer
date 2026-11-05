// Resolves `@genshin-optimizer/*` imports to the vendored, pinned GO source
// (vendor/genshin-optimizer). Shared by Vitest (packages) and Next.js (apps/web)
// so every consumer compiles the exact same GO formula code. See constitution II.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const GO_ROOT = resolve(here, '../vendor/genshin-optimizer')
export const STUBS_ROOT = resolve(here, 'go-stubs')

/**
 * GO packages that are presentation-only (translations loaded over HTTP,
 * router, analytics). They never contribute to formulas, so they are replaced
 * by inert stubs. Anything formula-related MUST NOT be stubbed.
 */
const STUBBED = {}

/**
 * Deep entry points into GO files that are not exported from a lib index
 * (importing the whole lib index would drag in unrelated UI). Paths are
 * relative to GO_ROOT.
 */
const DEEP = {
  '@genshin-optimizer/gi/ui/useTeamData': 'libs/gi/ui/src/hooks/useTeamData.ts',
  '@genshin-optimizer/gi/solver/BNBSplitWorker': 'libs/gi/solver/src/GOSolver/BNBSplitWorker/index.ts',
  '@genshin-optimizer/gi/solver/ComputeWorker': 'libs/gi/solver/src/GOSolver/ComputeWorker.ts',
  '@genshin-optimizer/gi/solver/DefaultSplitWorker': 'libs/gi/solver/src/GOSolver/DefaultSplitWorker.ts',
}

function stripJsonComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** @returns {Record<string, string>} module specifier -> absolute file */
export function goAliases() {
  const tsconfig = JSON.parse(
    stripJsonComments(readFileSync(resolve(GO_ROOT, 'tsconfig.base.json'), 'utf8'))
  )
  const paths = tsconfig.compilerOptions.paths
  const out = {}
  for (const [spec, targets] of Object.entries(paths)) {
    if (spec.includes('*')) continue
    out[spec] = resolve(GO_ROOT, targets[0])
  }
  for (const [spec, file] of Object.entries(DEEP)) out[spec] = resolve(GO_ROOT, file)
  for (const [spec, file] of Object.entries(STUBBED)) out[spec] = resolve(STUBS_ROOT, file)
  return out
}

