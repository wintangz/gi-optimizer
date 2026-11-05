import {
  createSession,
  type OptimizeProgress,
  type OptimizeResult,
  type OptimizerSettings,
} from '@gi/engine'
import type { IGOOD } from '@gi/good'
import type { Preset } from '@gi/presets'

export interface WorkerOptimizeRequest {
  type: 'optimize'
  good: IGOOD
  preset: Preset
  settings: OptimizerSettings
  weaponId?: string
}

export interface WorkerCancelRequest {
  type: 'cancel'
}

export type WorkerRequest = WorkerOptimizeRequest | WorkerCancelRequest

export type WorkerResponse =
  | { type: 'progress'; progress: OptimizeProgress }
  | { type: 'result'; result: OptimizeResult }
  | { type: 'error'; message: string }

let activeController: AbortController | null = null

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  if (msg.type === 'cancel') {
    activeController?.abort()
    activeController = null
    return
  }

  if (msg.type === 'optimize') {
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller

    try {
      const session = createSession(msg.good)
      const result = await session.optimize(msg.preset, msg.settings, {
        weaponId: msg.weaponId,
        signal: controller.signal,
        onProgress: (progress) => {
          const out: WorkerResponse = { type: 'progress', progress }
          self.postMessage(out)
        },
      })
      if (!controller.signal.aborted) {
        const out: WorkerResponse = { type: 'result', result }
        self.postMessage(out)
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const out: WorkerResponse = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(out)
    }
  }
}

