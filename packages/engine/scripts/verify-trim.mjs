import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')

function walkDir(dir) {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full))
    } else if (entry.isFile()) {
      results.push({ path: full, size: statSync(full).size })
    }
  }
  return results
}

function relError(actual, expected) {
  if (expected === 0) return Math.abs(actual)
  return Math.abs(actual - expected) / Math.abs(expected)
}

async function main() {
  // 1. Verify vendor/genshin-optimizer is clean
  const gitStatus = execFileSync(
    'git',
    ['status', '--porcelain', 'vendor/genshin-optimizer'],
    { cwd: repoRoot, encoding: 'utf8' }
  ).trim()
  if (gitStatus.length > 0) {
    throw new Error(
      `vendor/genshin-optimizer has dirty files:\n${gitStatus}`
    )
  }

  // 2. Verify optimizer.worker.js raw & gzip size <= 1.2 MB raw
  const workerPath = resolve(
    repoRoot,
    'apps/web/public/workers/optimizer.worker.js'
  )
  const bgWorkerPath = resolve(
    repoRoot,
    'apps/web/public/workers/BackgroundWorker.js'
  )
  const engineDistPath = resolve(repoRoot, 'packages/engine/dist/index.mjs')

  for (const p of [workerPath, bgWorkerPath, engineDistPath]) {
    if (!existsSync(p)) {
      throw new Error(`Missing prebuilt artifact: ${p}`)
    }
  }

  const workerRawBytes = statSync(workerPath).size
  const workerGzipBytes = gzipSync(readFileSync(workerPath)).length
  const bgWorkerRawBytes = statSync(bgWorkerPath).size
  const bgWorkerGzipBytes = gzipSync(readFileSync(bgWorkerPath)).length
  const maxWorkerRawBytes = Math.floor(1.2 * 1024 * 1024) // 1,258,291 bytes

  if (workerRawBytes > maxWorkerRawBytes) {
    throw new Error(
      `optimizer.worker.js raw size (${workerRawBytes} bytes) exceeds 1.2 MB (${maxWorkerRawBytes} bytes)`
    )
  }

  // 3. Verify prebuilt packages/engine/dist/index.mjs golden-fixture parity
  const engineMod = await import(pathToFileURL(engineDistPath).href)
  const sampleGoodPath = resolve(
    repoRoot,
    'vendor/genshin-optimizer/libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'
  )
  const sampleGood = JSON.parse(readFileSync(sampleGoodPath, 'utf8'))
  const session = engineMod.createSession(sampleGood)

  const goldenDir = resolve(repoRoot, 'packages/engine/test/golden')
  const presetsDataDir = resolve(repoRoot, 'packages/presets/data')
  const presetFiles = walkDir(presetsDataDir).filter((f) =>
    f.path.endsWith('.json')
  )

  let verifiedPresets = 0
  let maxRelError = 0
  for (const pf of presetFiles) {
    const preset = JSON.parse(readFileSync(pf.path, 'utf8'))
    const slug = preset.id.replace(/\//g, '__') + '.json'
    const goldenPath = resolve(goldenDir, slug)
    if (!existsSync(goldenPath)) continue
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
    const res = session.evaluate(preset)
    const err = relError(res.total, golden.total)
    if (err > maxRelError) maxRelError = err
    if (err > 0.001) {
      throw new Error(
        `Prebuilt dist/index.mjs failed golden parity for ${preset.id}: actual=${res.total}, expected=${golden.total}, relError=${err}`
      )
    }
    verifiedPresets++
  }

  // 4. Verify apps/web/out if present
  const webOutDir = resolve(repoRoot, 'apps/web/out')
  let outTotalBytes = null
  let outPngCount = null
  if (existsSync(webOutDir)) {
    const files = walkDir(webOutDir)
    outTotalBytes = files.reduce((acc, f) => acc + f.size, 0)
    outPngCount = files.filter(
      (f) => extname(f.path).toLowerCase() === '.png'
    ).length
    const maxOutBytes = 15 * 1024 * 1024 // 15 MB
    if (outTotalBytes >= maxOutBytes) {
      throw new Error(
        `apps/web/out size (${outTotalBytes} bytes) exceeds 15 MB (${maxOutBytes} bytes)`
      )
    }
    if (outPngCount !== 0) {
      throw new Error(
        `apps/web/out contains ${outPngCount} .png files (expected 0)`
      )
    }
  }

  console.log(
    JSON.stringify(
      {
        vendorClean: true,
        workerRawBytes,
        workerRawKB: Number((workerRawBytes / 1024).toFixed(1)),
        workerGzipBytes,
        workerGzipKB: Number((workerGzipBytes / 1024).toFixed(1)),
        bgWorkerRawBytes,
        bgWorkerGzipBytes,
        verifiedGoldenPresets: verifiedPresets,
        maxGoldenRelError: maxRelError,
        webOutTotalBytes: outTotalBytes,
        webOutTotalMB:
          outTotalBytes !== null
            ? Number((outTotalBytes / (1024 * 1024)).toFixed(2))
            : null,
        webOutPngCount: outPngCount,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
