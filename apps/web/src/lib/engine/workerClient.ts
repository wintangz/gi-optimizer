import type {
  BuildSelection,
  ConditionalDescriptor,
  EngineSession,
  OptimizeProgress,
  OptimizeResult,
  OptimizerSettings,
  RotationResult,
  SimulatedWeaponSpec,
  TargetDescriptor,
} from '@gi/engine'
import type { IGOOD } from '@gi/good'
import type { Preset } from '@gi/presets'
import type {
  WorkerRequest,
  WorkerResponse,
} from '@/workers/optimizer.worker'

let sharedWorker: Worker | null = null
let workerHydratedKey: string | null = null
let nextRequestCounter = 1

interface PendingEntry {
  resolve: (val: never) => void
  reject: (err: Error) => void
  onProgress?: (p: OptimizeProgress) => void
}

const pendingRequests = new Map<string, PendingEntry>()

// Fallback lazy in-process session for environments where `Worker` is unavailable (e.g. Node tests)
let fallbackDatasetKey: string | null = null
let fallbackSession: EngineSession | null = null
let fallbackAbortController: AbortController | null = null

function makeRequestId(prefix: string): string {
  return `${prefix}_${nextRequestCounter++}_${Date.now()}`
}

function getOrCreateWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (sharedWorker) return sharedWorker
  try {
    const w = new Worker(
      new URL('../../workers/optimizer.worker.ts', import.meta.url)
    )
    w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const data = ev.data
      if (data.type === 'progress') {
        const entry = pendingRequests.get(data.requestId)
        entry?.onProgress?.(data.progress)
        return
      }
      const reqId = data.requestId
      if (!reqId) return
      const entry = pendingRequests.get(reqId)
      if (!entry) return
      pendingRequests.delete(reqId)

      if (data.type === 'error') {
        entry.reject(new Error(data.message))
      } else {
        ;(entry.resolve as (val: WorkerResponse) => void)(data)
      }
    }
    w.onerror = (err) => {
      const error = new Error(err.message || 'Optimizer Web Worker error')
      for (const [, entry] of pendingRequests) {
        entry.reject(error)
      }
      pendingRequests.clear()
    }
    sharedWorker = w
    return w
  } catch {
    return null
  }
}

async function getFallbackSession(
  datasetKey: string,
  good: IGOOD
): Promise<EngineSession> {
  if (fallbackSession && fallbackDatasetKey === datasetKey) {
    return fallbackSession
  }
  const mod = await import('@gi/engine')
  fallbackSession = mod.createSession(good)
  fallbackDatasetKey = datasetKey
  return fallbackSession
}

export function isEngineSessionHydrated(datasetKey: string): boolean {
  return (
    workerHydratedKey === datasetKey || fallbackDatasetKey === datasetKey
  )
}

export async function initEngineSession(
  datasetKey: string,
  good: IGOOD
): Promise<void> {
  const worker = getOrCreateWorker()
  if (worker) {
    if (workerHydratedKey === datasetKey) return
    const requestId = makeRequestId('init')
    await new Promise<void>((resolve, reject) => {
      pendingRequests.set(requestId, {
        resolve: () => {
          workerHydratedKey = datasetKey
          resolve()
        },
        reject,
      })
      const req: WorkerRequest = {
        type: 'init',
        requestId,
        datasetKey,
        good,
      }
      worker.postMessage(req)
    })
    return
  }
  await getFallbackSession(datasetKey, good)
}

export async function evaluatePresetInWorker(opts: {
  datasetKey: string
  good: IGOOD
  preset: Preset
  selection?: BuildSelection
}): Promise<{ currentBuild: BuildSelection; result: RotationResult }> {
  const { datasetKey, good, preset, selection } = opts
  const worker = getOrCreateWorker()
  if (worker) {
    const requestId = makeRequestId('eval')
    const needsGood = workerHydratedKey !== datasetKey
    const resp = await new Promise<
      Extract<WorkerResponse, { type: 'evaluateResult' }>
    >((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject })
      const req: WorkerRequest = {
        type: 'evaluate',
        requestId,
        datasetKey,
        good: needsGood ? good : undefined,
        preset,
        selection,
      }
      worker.postMessage(req)
    })
    workerHydratedKey = datasetKey
    return {
      currentBuild: resp.currentBuild,
      result: resp.result,
    }
  }

  const session = await getFallbackSession(datasetKey, good)
  const currentBuild = session.currentBuild(preset)
  const result = session.evaluate(preset, selection ?? currentBuild)
  return { currentBuild, result }
}

export async function optimizePresetInWorker(opts: {
  datasetKey: string
  good: IGOOD
  preset: Preset
  settings: OptimizerSettings
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  onProgress?: (p: OptimizeProgress) => void
}): Promise<OptimizeResult> {
  const {
    datasetKey,
    good,
    preset,
    settings,
    weaponId,
    weaponOverride,
    onProgress,
  } = opts
  const worker = getOrCreateWorker()
  if (worker) {
    const requestId = makeRequestId('opt')
    const needsGood = workerHydratedKey !== datasetKey
    const resp = await new Promise<
      Extract<WorkerResponse, { type: 'result' }>
    >((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject, onProgress })
      const req: WorkerRequest = {
        type: 'optimize',
        requestId,
        datasetKey,
        good: needsGood ? good : undefined,
        preset,
        settings,
        weaponId,
        weaponOverride,
      }
      worker.postMessage(req)
    })
    workerHydratedKey = datasetKey
    return resp.result
  }

  fallbackAbortController?.abort()
  const controller = new AbortController()
  fallbackAbortController = controller
  const session = await getFallbackSession(datasetKey, good)
  return session.optimize(preset, settings, {
    weaponId,
    weaponOverride,
    onProgress,
    signal: controller.signal,
  })
}

export function cancelOptimizationInWorker(): void {
  const worker = getOrCreateWorker()
  if (worker) {
    const req: WorkerRequest = { type: 'cancel' }
    worker.postMessage(req)
    for (const [reqId, entry] of pendingRequests) {
      if (reqId.startsWith('opt_')) {
        entry.reject(new DOMException('Optimization aborted', 'AbortError'))
        pendingRequests.delete(reqId)
      }
    }
    return
  }
  fallbackAbortController?.abort()
  fallbackAbortController = null
}

// Client-side cache of catalog responses so repeated renders are synchronous/instant
const clientTargetCache = new Map<string, TargetDescriptor[]>()
const clientConditionalCache = new Map<string, ConditionalDescriptor[]>()

export async function getCatalogInWorker(characterKeys: string[]): Promise<{
  targetsByChar: Record<string, TargetDescriptor[]>
  conditionalsByChar: Record<string, ConditionalDescriptor[]>
}> {
  const uniqueKeys = Array.from(new Set(characterKeys.filter(Boolean)))
  const missingKeys = uniqueKeys.filter(
    (ck) => !clientTargetCache.has(ck) || !clientConditionalCache.has(ck)
  )

  if (missingKeys.length > 0) {
    const worker = getOrCreateWorker()
    if (worker) {
      const requestId = makeRequestId('cat')
      const resp = await new Promise<
        Extract<WorkerResponse, { type: 'catalogResult' }>
      >((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject })
        const req: WorkerRequest = {
          type: 'catalog',
          requestId,
          characterKeys: missingKeys,
        }
        worker.postMessage(req)
      })
      for (const ck of missingKeys) {
        if (resp.targetsByChar[ck]) {
          clientTargetCache.set(ck, resp.targetsByChar[ck]!)
        }
        if (resp.conditionalsByChar[ck]) {
          clientConditionalCache.set(ck, resp.conditionalsByChar[ck]!)
        }
      }
    } else {
      const mod = await import('@gi/engine')
      for (const ck of missingKeys) {
        clientTargetCache.set(ck, mod.listTargetsForCharacter(ck))
        clientConditionalCache.set(ck, mod.listConditionalsForCharacter(ck))
      }
    }
  }

  const targetsByChar: Record<string, TargetDescriptor[]> = {}
  const conditionalsByChar: Record<string, ConditionalDescriptor[]> = {}
  for (const ck of uniqueKeys) {
    targetsByChar[ck] = clientTargetCache.get(ck) ?? []
    conditionalsByChar[ck] = clientConditionalCache.get(ck) ?? []
  }
  return { targetsByChar, conditionalsByChar }
}

export async function exportGODatabaseInWorker(opts: {
  datasetKey: string
  good: IGOOD
  preset: Preset
  selection?: BuildSelection
}): Promise<object> {
  const { datasetKey, good, preset, selection } = opts
  const worker = getOrCreateWorker()
  if (worker) {
    const requestId = makeRequestId('export')
    const needsGood = workerHydratedKey !== datasetKey
    const resp = await new Promise<
      Extract<WorkerResponse, { type: 'exportGOResult' }>
    >((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject })
      const req: WorkerRequest = {
        type: 'exportGO',
        requestId,
        datasetKey,
        good: needsGood ? good : undefined,
        preset,
        selection,
      }
      worker.postMessage(req)
    })
    workerHydratedKey = datasetKey
    return resp.exported
  }

  const session = await getFallbackSession(datasetKey, good)
  return session.exportGODatabase(preset, selection)
}

