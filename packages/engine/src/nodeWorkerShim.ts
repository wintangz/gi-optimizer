// Lightweight W3C-compatible Web `Worker` polyfill backed by `node:worker_threads`
// for running Genshin Optimizer's `GOSolver` in Node.js / Vitest without editing
// `vendor/genshin-optimizer`.

interface ActiveNodeWorker {
  terminate(): void
}

const activeWorkers = new Set<ActiveNodeWorker>()

/**
 * Returns the number of currently active `BackgroundWorker` instances spawned
 * via the Node `Worker` shim. Used by tests to verify zero orphaned workers
 * after optimization completion or `AbortSignal` cancellation.
 */
export function getActiveBackgroundWorkerCount(): number {
  return activeWorkers.size
}

function getNodeBuiltin<T = any>(id: string): T | undefined {
  const proc = (globalThis as any).process
  if (proc && typeof proc.getBuiltinModule === 'function') {
    return proc.getBuiltinModule(id) as T
  }
  return undefined
}

let cachedBgWorkerPath: string | null = null

function resolveNodeBackgroundWorkerPath(): string {
  if (cachedBgWorkerPath) return cachedBgWorkerPath

  const pathMod = getNodeBuiltin<typeof import('node:path')>('node:path')
  const fsMod = getNodeBuiltin<typeof import('node:fs')>('node:fs')
  const cpMod =
    getNodeBuiltin<typeof import('node:child_process')>('node:child_process')

  if (!pathMod || !fsMod) {
    throw new Error('Node builtin modules unavailable in resolveNodeBackgroundWorkerPath')
  }

  const cwd = process.cwd()
  const candidates = [
    pathMod.resolve(cwd, 'packages/engine/dist/BackgroundWorker.mjs'),
    pathMod.resolve(cwd, 'dist/BackgroundWorker.mjs'),
    pathMod.resolve(cwd, '../../packages/engine/dist/BackgroundWorker.mjs'),
  ]

  for (const c of candidates) {
    if (fsMod.existsSync(c)) {
      cachedBgWorkerPath = c
      return c
    }
  }

  // If `dist/BackgroundWorker.mjs` has not been built yet (e.g. fresh checkout test run),
  // build it synchronously via `scripts/build-engine.mjs`.
  const buildScriptCandidates = [
    pathMod.resolve(cwd, 'packages/engine/scripts/build-engine.mjs'),
    pathMod.resolve(cwd, 'scripts/build-engine.mjs'),
    pathMod.resolve(cwd, '../../packages/engine/scripts/build-engine.mjs'),
  ]
  const buildScript = buildScriptCandidates.find((p) => fsMod.existsSync(p))
  if (buildScript && cpMod) {
    cpMod.execFileSync(process.execPath, [buildScript], { stdio: 'ignore' })
    for (const c of candidates) {
      if (fsMod.existsSync(c)) {
        cachedBgWorkerPath = c
        return c
      }
    }
  }

  throw new Error(
    `Could not locate prebuilt BackgroundWorker.mjs (searched: ${candidates.join(', ')})`
  )
}

export class NodeBackgroundWorker implements ActiveNodeWorker {
  onmessage: ((ev: { data: any }) => void) | null = null
  onerror: ((ev: { message: string; error?: unknown }) => void) | null = null
  private thread: any
  private terminated = false

  constructor(_url: string | URL, _options?: WorkerOptions) {
    const wt =
      getNodeBuiltin<typeof import('node:worker_threads')>(
        'node:worker_threads'
      )
    if (!wt) {
      throw new Error('node:worker_threads is not available')
    }
    const workerFile = resolveNodeBackgroundWorkerPath()
    this.thread = new wt.Worker(workerFile)
    activeWorkers.add(this)

    this.thread.on('message', (data: any) => {
      if (this.terminated) return
      this.onmessage?.({ data })
    })

    this.thread.on('error', (err: unknown) => {
      if (this.terminated) return
      const message = err instanceof Error ? err.message : String(err)
      this.onerror?.({ message, error: err })
    })

    this.thread.on('exit', () => {
      activeWorkers.delete(this)
    })
  }

  postMessage(message: any): void {
    if (this.terminated) return
    this.thread.postMessage(message)
  }

  terminate(): void {
    if (this.terminated) return
    this.terminated = true
    activeWorkers.delete(this)
    this.thread.unref?.()
    void this.thread.terminate()
  }

  addEventListener(type: string, listener: (ev: any) => void): void {
    if (type === 'message') {
      this.onmessage = listener
    } else if (type === 'error') {
      this.onerror = listener
    }
  }

  removeEventListener(type: string, listener: (ev: any) => void): void {
    if (type === 'message' && this.onmessage === listener) {
      this.onmessage = null
    } else if (type === 'error' && this.onerror === listener) {
      this.onerror = null
    }
  }
}

export function installNodeWorkerShim(): void {
  const isNode =
    typeof process !== 'undefined' &&
    Boolean(process.versions && process.versions.node)
  if (!isNode) return

  if (globalThis.Worker !== (NodeBackgroundWorker as any)) {
    globalThis.Worker = NodeBackgroundWorker as any
  }
}

installNodeWorkerShim()
