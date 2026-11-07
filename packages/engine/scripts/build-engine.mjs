import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { GO_ROOT, STUBS_ROOT, goAliases } from '../../../tooling/go-paths.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')

function getByDotPath(obj, dotPath) {
  const parts = dotPath.split('.')
  let cur = obj
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

function setByDotPath(obj, dotPath, val) {
  const parts = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = val
}

function buildSlimGOLocaleBase64() {
  const locDir = resolve(
    GO_ROOT,
    'libs/gi/localization/assets/locales/en'
  )
  const dmLocDir = resolve(
    GO_ROOT,
    'libs/gi/dm-localization/assets/locales/en'
  )
  const namespaces = {}
  for (const dir of [locDir, dmLocDir]) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      const ns = file.slice(0, -5)
      namespaces[ns] = JSON.parse(readFileSync(resolve(dir, file), 'utf8'))
    }
  }

  const perNsGenKeys = new Map()
  function addNsKey(ns, k) {
    if (!perNsGenKeys.has(ns)) perNsGenKeys.set(ns, new Set())
    perNsGenKeys.get(ns).add(k)
  }

  function walkSheets(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        walkSheets(full)
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const src = readFileSync(full, 'utf8')
        const rel = full.replace(/\\/g, '/')
        let prefixNs = null
        const charMatch = rel.match(/\/Characters\/([^/]+)\//)
        const weapMatch = rel.match(/\/Weapons\/[^/]+\/([^/]+)\//)
        const artMatch = rel.match(/\/Artifacts\/([^/]+)\//)
        if (charMatch) prefixNs = `char_${charMatch[1]}_gen`
        else if (weapMatch) prefixNs = `weapon_${weapMatch[1]}_gen`
        else if (artMatch) prefixNs = `artifact_${artMatch[1]}_gen`
        if (prefixNs) {
          for (const m of src.matchAll(
            /\b(?:chg|trg|tr)\(\s*['"]([^'"]+)['"]/g
          )) {
            const k = m[1]
            if (!k.includes('skillParams')) addNsKey(prefixNs, k)
          }
        }
      }
    }
  }
  walkSheets(resolve(GO_ROOT, 'libs/gi/sheets/src'))

  const slim = {}
  for (const file of readdirSync(locDir)) {
    if (!file.endsWith('.json')) continue
    const ns = file.slice(0, -5)
    if (
      ns === 'sheet' ||
      ns === 'elementalResonance' ||
      ns.startsWith('char_') ||
      ns.startsWith('weapon_') ||
      ns.startsWith('artifact_')
    ) {
      slim[ns] = namespaces[ns]
    }
  }
  for (const ns of ['sheet_gen', 'elementalResonance_gen', 'reaction_gen']) {
    if (namespaces[ns]) slim[ns] = namespaces[ns]
  }
  for (const [ns, keys] of perNsGenKeys.entries()) {
    const srcObj = namespaces[ns]
    if (!srcObj) continue
    const dstObj = {}
    for (const k of keys) {
      const v = getByDotPath(srcObj, k)
      if (typeof v === 'string') setByDotPath(dstObj, k, v)
    }
    if (Object.keys(dstObj).length > 0) slim[ns] = dstObj
  }

  return gzipSync(Buffer.from(JSON.stringify(slim), 'utf8'), {
    level: 9,
  }).toString('base64')
}

const b64I18n = buildSlimGOLocaleBase64()

function loadEsbuild() {
  const req = createRequire(import.meta.url)
  try {
    return req('esbuild')
  } catch {
    const vitestPkg = req.resolve('vitest/package.json')
    const reqFromVitest = createRequire(vitestPkg)
    const vitePkg = reqFromVitest.resolve('vite/package.json')
    const reqFromVite = createRequire(vitePkg)
    return reqFromVite('esbuild')
  }
}

/**
 * Replaces UI-only `fields: [...]` arrays in GO sheet `.tsx` files with `fields: []`
 * using a balanced-bracket scanner that respects string literals and comments.
 * Preserves all `states` conditionals and `CharacterSheet.data` / `WeaponSheet.data`
 * / `allArtifactData` formula trees.
 */
function stripSheetFields(source) {
  const pattern = /\bfields\s*:\s*\[/g
  let out = ''
  let lastIdx = 0
  let match

  while ((match = pattern.exec(source)) !== null) {
    const openBracketIdx = match.index + match[0].length - 1
    let i = openBracketIdx
    let depth = 0
    const len = source.length

    while (i < len) {
      const ch = source[i]
      const next = source[i + 1]

      if (ch === '/' && next === '/') {
        i += 2
        while (i < len && source[i] !== '\n') i++
        continue
      }
      if (ch === '/' && next === '*') {
        i += 2
        while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i++
        i += 2
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        const quote = ch
        i++
        while (i < len && source[i] !== quote) {
          if (source[i] === '\\') i += 2
          else i++
        }
        i++
        continue
      }
      if (ch === '[') {
        depth++
      } else if (ch === ']') {
        depth--
        if (depth === 0) {
          out += source.slice(lastIdx, openBracketIdx) + '[]'
          lastIdx = i + 1
          pattern.lastIndex = i + 1
          break
        }
      }
      i++
    }
  }

  if (lastIdx === 0) return source
  return out + source.slice(lastIdx)
}

const UI_STUB_PACKAGES = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  '@emotion/react',
  '@emotion/react/jsx-runtime',
  '@emotion/react/jsx-dev-runtime',
  '@mui/material',
  '@mui/icons-material',
  'i18next',
  'react-i18next',
])

function createGoTrimPlugin({ mode }) {
  const aliases = goAliases()
  const uiStubPath = resolve(STUBS_ROOT, 'ui.ts')
  const zodStubPath = resolve(STUBS_ROOT, 'zod.ts')
  const presetsSrcDir = resolve(repoRoot, 'packages/presets/src')
  const engineIndex = resolve(repoRoot, 'packages/engine/src/index.ts')
  const goodIndex = resolve(repoRoot, 'packages/good/src/index.ts')

  // Precompute compressed allStat_gen payload once across builds
  const allStatPath = resolve(GO_ROOT, 'libs/gi/stats/src/allStat_gen.json')
  const rawStat = JSON.parse(readFileSync(allStatPath, 'utf8'))
  delete rawStat.material
  const b64Stat = gzipSync(Buffer.from(JSON.stringify(rawStat), 'utf8'), {
    level: 9,
  }).toString('base64')
  const allStatModuleCode = [
    `import { unzipFromB64Gzip } from '@genshin-optimizer/common/util'`,
    `const data = JSON.parse(unzipFromB64Gzip(${JSON.stringify(b64Stat)}))`,
    `export const { char, weapon, art } = data`,
    `export default data`,
  ].join('\n')

  const b64ArtOnly = gzipSync(
    Buffer.from(
      JSON.stringify({ char: {}, weapon: {}, art: rawStat.art }),
      'utf8'
    ),
    { level: 9 }
  ).toString('base64')
  const artOnlyStatModuleCode = [
    `import { unzipFromB64Gzip } from '@genshin-optimizer/common/util'`,
    `const data = JSON.parse(unzipFromB64Gzip(${JSON.stringify(b64ArtOnly)}))`,
    `export const { char, weapon, art } = data`,
    `export default data`,
  ].join('\n')

  return {
    name: `go-trim-${mode}`,
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.path === '@gi/engine') {
          return { path: engineIndex }
        }
        if (args.path === '@gi/good') {
          return { path: goodIndex }
        }
        if (args.path === '@gi/presets') {
          return { path: 'gi-presets-slim', namespace: 'gi-presets-slim' }
        }
        if (args.path === 'zod') {
          return { path: zodStubPath }
        }
        if (UI_STUB_PACKAGES.has(args.path)) {
          return { path: uiStubPath }
        }
        if (aliases[args.path]) {
          return { path: aliases[args.path] }
        }
        return null
      })

      build.onLoad(
        { filter: /.*/, namespace: 'gi-presets-slim' },
        () => ({
          contents: `export * from './names'\nexport * from './settings'\n`,
          resolveDir: presetsSrcDir,
          loader: 'ts',
        })
      )

      build.onLoad({ filter: /allStat_gen\.json$/ }, () => ({
        contents:
          mode === 'browser-bg-worker' || mode === 'node-bg-worker'
            ? artOnlyStatModuleCode
            : allStatModuleCode,
        resolveDir: dirname(allStatPath),
        loader: 'js',
      }))

      build.onLoad({ filter: /go-stubs[\\/]i18n\.ts$/ }, (args) => {
        const raw = readFileSync(args.path, 'utf8')
        if (mode === 'browser-bg-worker' || mode === 'node-bg-worker') {
          return {
            contents: raw,
            resolveDir: dirname(args.path),
            loader: 'ts',
          }
        }
        const injected =
          `import { unzipFromB64Gzip } from '@genshin-optimizer/common/util'\n` +
          raw.replace(
            'let injectedNamespaces: Record<string, LocaleDict> | null = null',
            `let injectedNamespaces: Record<string, LocaleDict> | null = JSON.parse(unzipFromB64Gzip(${JSON.stringify(b64I18n)}))`
          )
        return {
          contents: injected,
          resolveDir: dirname(args.path),
          loader: 'ts',
        }
      })

      build.onLoad(
        { filter: /libs[\\/]gi[\\/]solver-tc[\\/]src[\\/]index\.ts$/ },
        () => ({
          contents: `export * from './foreground.js'\nexport * from './optimizeTc.js'\n`,
          resolveDir: resolve(GO_ROOT, 'libs/gi/solver-tc/src'),
          loader: 'ts',
        })
      )

      build.onLoad(
        { filter: /libs[\\/]gi[\\/]solver[\\/]src[\\/]common\.ts$/ },
        (args) => {
          const contents = readFileSync(args.path, 'utf8').replace(
            'reaffine: { pruneOrder: true, pruneArtRange: true, pruneNodeRange: true }',
            'reaffine: { ...(forced.pruneOrder ? { pruneOrder: true } : {}), pruneArtRange: true, pruneNodeRange: true }'
          )
          return {
            contents,
            resolveDir: dirname(args.path),
            loader: 'ts',
          }
        }
      )

      build.onLoad({ filter: /GOSolver\.ts$/ }, (args) => {
        let contents = readFileSync(args.path, 'utf8')
        contents = contents
          .replace(
            /maxIterateSize\s*=\s*32_000_000/g,
            'maxIterateSize = 64_000'
          )
          .replace(
            'this.buildValues.filter(({ w }) => w !== worker)',
            'this.buildValues = this.buildValues.filter(({ w }) => w !== worker)'
          )
        if (mode === 'browser-worker') {
          contents = contents.replace(
            /new Worker\(\s*new URL\(['"]\.\/BackgroundWorker\.ts['"],\s*import\.meta\.url\)\s*,\s*\{\s*type:\s*['"]module['"],?\s*\}\s*\)/g,
            `new Worker('/workers/BackgroundWorker.js')`
          )
        } else {
          contents = contents.replace(
            /new URL\(['"]\.\/BackgroundWorker\.ts['"],\s*import\.meta\.url\)/g,
            `new URL('./BackgroundWorker.mjs', import.meta.url)`
          )
        }
        return {
          contents,
          resolveDir: dirname(args.path),
          loader: 'ts',
        }
      })

      build.onLoad({ filter: /ComputeWorker\.ts$/ }, (args) => {
        const contents = readFileSync(args.path, 'utf8')
          .replace(
            'if (this.threshold > newThreshold) this.threshold = newThreshold',
            'if (this.threshold < newThreshold) this.threshold = newThreshold'
          )
          .replace(
            ';({ nodes, arts: preArts } = pruneAll(\n      nodes,\n      min,',
            ';({ nodes, arts: preArts } = pruneAll(\n      nodes,\n      [...min, this.threshold],'
          )
          .replace(
            ';({ nodes, arts: preArts } = pruneAll(\r\n      nodes,\r\n      min,',
            ';({ nodes, arts: preArts } = pruneAll(\r\n      nodes,\r\n      [...min, this.threshold],'
          )
        return {
          contents,
          resolveDir: dirname(args.path),
          loader: 'ts',
        }
      })

      build.onLoad({ filter: /BackgroundWorker\.ts$/ }, (args) => {
        let contents = readFileSync(args.path, 'utf8')
        contents = contents
          .replace(
            /^declare function postMessage.*$/gm,
            'declare var globalThis: any;'
          )
          .replace(
            /case 'split':[\s\S]*?case 'count': \{[\s\S]*?break\s*\}/,
            [
              `case 'split': {`,
              `  let lastYield = performance.now();`,
              `  let leafCount = 0;`,
              `  const sw = splitWorker as any;`,
              `  const stealMinCount = Math.max(data.maxIterateSize * 16, 1_000_000);`,
              `  for (const filter of splitWorker.split(data.filter, data.maxIterateSize)) {`,
              `    computeWorker.compute(filter);`,
              `    splitWorker.setThreshold(computeWorker.threshold);`,
              `    leafCount++;`,
              `    if (leafCount >= 4 && Array.isArray(sw.filters)) {`,
              `      let dispatched = 0;`,
              `      while (dispatched < 4 && sw.filters.length > 2 && sw.filters[0].count >= stealMinCount) {`,
              `        sw.calculateFilter(0);`,
              `        const f = sw.filters.shift()!;`,
              `        if (sw.firstUncalculated > 0) sw.firstUncalculated--;`,
              `        if (!f || !f.count) continue;`,
              `        const subFilter: any = {};`,
              `        for (const [slot, slotArts] of Object.entries(f.arts.values)) {`,
              `          subFilter[slot] = { kind: 'id', ids: new Set((slotArts as any[]).map((a) => a.id)) };`,
              `        }`,
              `        globalThis.postMessage({ command: 'split', filter: subFilter, maxIterateSize: data.maxIterateSize });`,
              `        dispatched++;`,
              `      }`,
              `      if (dispatched > 0) sw.reportInterim?.(true);`,
              `    }`,
              `    if (performance.now() - lastYield > 15) {`,
              `      sw.reportInterim?.(true);`,
              `      await new Promise((r) => setTimeout(r, 0));`,
              `      lastYield = performance.now();`,
              `    }`,
              `  }`,
              `  break;`,
              `}`,
              `case 'iterate':`,
              `  computeWorker.compute(data.filter);`,
              `  break;`,
              `case 'threshold': {`,
              `  splitWorker.setThreshold(data.threshold);`,
              `  computeWorker.setThreshold(data.threshold);`,
              `  return;`,
              `}`,
              `case 'finalize': {`,
              `  computeWorker.refresh(true);`,
              `  const { builds, plotData } = computeWorker;`,
              `  globalThis.postMessage({ resultType: 'finalize', builds, plotData });`,
              `  break;`,
              `}`,
              `case 'count': {`,
              `  const { exclusion, maxIterateSize } = data,`,
              `    arts = computeWorker.arts;`,
              `  const perms = filterFeasiblePerm(`,
              `    artSetPerm(`,
              `      exclusion,`,
              `      new Set(`,
              `        Object.values(arts.values).flatMap((x) => x.map((x) => x.set!))`,
              `      )`,
              `    ),`,
              `    arts`,
              `  );`,
              `  let count = 0;`,
              `  for (const filter of perms) {`,
              `    globalThis.postMessage({ command: 'split', filter, maxIterateSize });`,
              `    count += countBuilds(filterArts(arts, filter));`,
              `  }`,
              `  globalThis.postMessage({ resultType: 'count', count });`,
              `  break;`,
              `}`,
            ].join('\n')
          )
          .replace(/\bpostMessage\(/g, 'globalThis.postMessage(')
          .replace(/\bonmessage\s*=/g, 'globalThis.onmessage =')
        if (mode === 'node-bg-worker') {
          const bridge = [
            `const __proc = globalThis.process;`,
            `const __wt = __proc && typeof __proc.getBuiltinModule === 'function' ? __proc.getBuiltinModule('node:worker_threads') : undefined;`,
            `if (__wt && __wt.parentPort) {`,
            `  globalThis.postMessage = (msg: any) => __wt.parentPort.postMessage(msg);`,
            `  __wt.parentPort.on('message', (data: any) => {`,
            `    if (typeof globalThis.onmessage === 'function') {`,
            `      globalThis.onmessage({ data });`,
            `    }`,
            `  });`,
            `}`,
          ].join('\n')
          contents = `${bridge}\n${contents}`
        }
        return {
          contents,
          resolveDir: dirname(args.path),
          loader: 'ts',
        }
      })

      build.onLoad(
        { filter: /libs[\\/]gi[\\/]sheets[\\/]src[\\/].*\.tsx$/ },
        (args) => {
          const raw = readFileSync(args.path, 'utf8')
          const stripped = stripSheetFields(raw)
          return {
            contents: stripped,
            resolveDir: dirname(args.path),
            loader: 'tsx',
          }
        }
      )
    },
  }
}

async function main() {
  const t0 = performance.now()
  const esbuild = loadEsbuild()

  const webWorkersDir = resolve(repoRoot, 'apps/web/public/workers')
  const engineDistDir = resolve(repoRoot, 'packages/engine/dist')
  mkdirSync(webWorkersDir, { recursive: true })
  mkdirSync(engineDistDir, { recursive: true })

  const workerEntry = resolve(
    repoRoot,
    'apps/web/src/workers/optimizer.worker.ts'
  )
  const bgWorkerEntry = resolve(
    GO_ROOT,
    'libs/gi/solver/src/GOSolver/BackgroundWorker.ts'
  )
  const engineEntry = resolve(repoRoot, 'packages/engine/src/index.ts')
  const constsEntry = resolve(GO_ROOT, 'libs/gi/consts/src/index.ts')

  const workerOut = resolve(webWorkersDir, 'optimizer.worker.js')
  const browserBgWorkerOut = resolve(webWorkersDir, 'BackgroundWorker.js')
  const nodeBgWorkerOut = resolve(engineDistDir, 'BackgroundWorker.mjs')
  const engineOut = resolve(engineDistDir, 'index.mjs')
  const constsOut = resolve(engineDistDir, 'gi-consts.mjs')

  const commonOptions = {
    bundle: true,
    minify: true,
    treeShaking: true,
    target: 'es2022',
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
    logLevel: 'warning',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.NX_SHOW_DEV_COMPONENTS': '"false"',
    },
  }

  await Promise.all([
    // 1. Browser optimizer session worker (IIFE)
    esbuild.build({
      ...commonOptions,
      entryPoints: [workerEntry],
      outfile: workerOut,
      format: 'iife',
      platform: 'browser',
      plugins: [createGoTrimPlugin({ mode: 'browser-worker' })],
    }),
    // 2. Browser nested GOSolver BackgroundWorker (IIFE)
    esbuild.build({
      ...commonOptions,
      entryPoints: [bgWorkerEntry],
      outfile: browserBgWorkerOut,
      format: 'iife',
      platform: 'browser',
      plugins: [createGoTrimPlugin({ mode: 'browser-bg-worker' })],
    }),
    // 3. Node/Vitest worker_threads GOSolver BackgroundWorker (ESM)
    esbuild.build({
      ...commonOptions,
      entryPoints: [bgWorkerEntry],
      outfile: nodeBgWorkerOut,
      format: 'esm',
      platform: 'neutral',
      plugins: [createGoTrimPlugin({ mode: 'node-bg-worker' })],
    }),
    // 4. Prebuilt @gi/engine ESM entry
    esbuild.build({
      ...commonOptions,
      entryPoints: [engineEntry],
      outfile: engineOut,
      format: 'esm',
      platform: 'neutral',
      plugins: [createGoTrimPlugin({ mode: 'engine-esm' })],
    }),
    // 5. Prebuilt @genshin-optimizer/gi/consts ESM entry
    esbuild.build({
      ...commonOptions,
      entryPoints: [constsEntry],
      outfile: constsOut,
      format: 'esm',
      platform: 'neutral',
      plugins: [createGoTrimPlugin({ mode: 'consts-esm' })],
    }),
  ])

  const workerBytes = statSync(workerOut).size
  const workerGzipBytes = gzipSync(readFileSync(workerOut)).length
  const bgWorkerBytes = statSync(browserBgWorkerOut).size
  const engineBytes = statSync(engineOut).size
  const constsBytes = statSync(constsOut).size
  const elapsedMs = (performance.now() - t0).toFixed(0)

  console.log(
    `[build-engine] Built in ${elapsedMs}ms:\n` +
      `  optimizer.worker.js : ${(workerBytes / 1024).toFixed(1)} KB raw (${(workerGzipBytes / 1024).toFixed(1)} KB gzip)\n` +
      `  BackgroundWorker.js : ${(bgWorkerBytes / 1024).toFixed(1)} KB raw\n` +
      `  dist/index.mjs      : ${(engineBytes / 1024).toFixed(1)} KB raw\n` +
      `  dist/gi-consts.mjs  : ${(constsBytes / 1024).toFixed(1)} KB raw`
  )

  const maxRawBytes = Math.floor(1.2 * 1024 * 1024)
  if (workerBytes > maxRawBytes) {
    throw new Error(
      `optimizer.worker.js (${workerBytes} bytes) exceeds 1.2 MB budget (${maxRawBytes} bytes)`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
