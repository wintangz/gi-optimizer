import {
  createSession,
  listConditionalsForCharacter,
  listTargetsForCharacter,
  type BuildSelection,
  type ConditionalDescriptor,
  type EngineSession,
  type OptimizeProgress,
  type OptimizeResult,
  type OptimizerSettings,
  type RotationResult,
  type SimulatedWeaponSpec,
  type TargetDescriptor,
  type TeamOptimizeProgress,
  type TeamOptimizeResult,
} from '@gi/engine'
import type { IGOOD } from '@gi/good'
import type { Preset } from '@gi/presets'

export interface WorkerInitRequest {
  type: 'init'
  requestId: string
  datasetKey: string
  good: IGOOD
}

export interface WorkerEvaluateRequest {
  type: 'evaluate'
  requestId: string
  datasetKey: string
  good?: IGOOD
  preset: Preset
  selection?: BuildSelection
}

export interface WorkerOptimizeRequest {
  type: 'optimize'
  requestId: string
  datasetKey: string
  good?: IGOOD
  preset: Preset
  settings: OptimizerSettings
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
}

export interface WorkerOptimizeTeamRequest {
  type: 'optimizeTeam'
  requestId: string
  datasetKey: string
  good?: IGOOD
  preset: Preset
  settings: OptimizerSettings
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
}

export interface WorkerCatalogRequest {
  type: 'catalog'
  requestId: string
  characterKeys: string[]
}

export interface WorkerExportGORequest {
  type: 'exportGO'
  requestId: string
  datasetKey: string
  good?: IGOOD
  preset: Preset
  selection?: BuildSelection
}

export interface WorkerCancelRequest {
  type: 'cancel'
  requestId?: string
}

export type WorkerRequest =
  | WorkerInitRequest
  | WorkerEvaluateRequest
  | WorkerOptimizeRequest
  | WorkerOptimizeTeamRequest
  | WorkerCatalogRequest
  | WorkerExportGORequest
  | WorkerCancelRequest

export type WorkerResponse =
  | {
      type: 'initResult'
      requestId: string
      datasetKey: string
    }
  | {
      type: 'evaluateResult'
      requestId: string
      currentBuild: BuildSelection
      result: RotationResult
    }
  | {
      type: 'progress'
      requestId: string
      progress: OptimizeProgress
    }
  | {
      type: 'result'
      requestId: string
      result: OptimizeResult
    }
  | {
      type: 'teamProgress'
      requestId: string
      progress: TeamOptimizeProgress
    }
  | {
      type: 'teamResult'
      requestId: string
      result: TeamOptimizeResult
    }
  | {
      type: 'catalogResult'
      requestId: string
      targetsByChar: Record<string, TargetDescriptor[]>
      conditionalsByChar: Record<string, ConditionalDescriptor[]>
    }
  | {
      type: 'exportGOResult'
      requestId: string
      exported: object
    }
  | {
      type: 'error'
      requestId?: string
      message: string
    }

let cachedDatasetKey: string | null = null
let cachedSession: EngineSession | null = null
let activeController: AbortController | null = null

function ensureSession(datasetKey: string, good?: IGOOD): EngineSession {
  if (cachedSession && cachedDatasetKey === datasetKey) {
    return cachedSession
  }
  if (!good) {
    throw new Error(
      `Engine session for dataset '${datasetKey}' is not hydrated in worker.`
    )
  }
  cachedSession = createSession(good)
  cachedDatasetKey = datasetKey
  return cachedSession
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data

  if (msg.type === 'cancel') {
    activeController?.abort()
    activeController = null
    return
  }

  try {
    if (msg.type === 'init') {
      ensureSession(msg.datasetKey, msg.good)
      const out: WorkerResponse = {
        type: 'initResult',
        requestId: msg.requestId,
        datasetKey: msg.datasetKey,
      }
      self.postMessage(out)
      return
    }

    if (msg.type === 'catalog') {
      const targetsByChar: Record<string, TargetDescriptor[]> = {}
      const conditionalsByChar: Record<string, ConditionalDescriptor[]> = {}
      for (const ck of msg.characterKeys) {
        targetsByChar[ck] = listTargetsForCharacter(ck)
        conditionalsByChar[ck] = listConditionalsForCharacter(ck)
      }
      const out: WorkerResponse = {
        type: 'catalogResult',
        requestId: msg.requestId,
        targetsByChar,
        conditionalsByChar,
      }
      self.postMessage(out)
      return
    }

    if (msg.type === 'evaluate') {
      const session = ensureSession(msg.datasetKey, msg.good)
      const currentBuild = session.currentBuild(msg.preset)
      const effectiveSelection: BuildSelection = msg.selection ?? currentBuild
      const result = session.evaluate(msg.preset, effectiveSelection)
      const out: WorkerResponse = {
        type: 'evaluateResult',
        requestId: msg.requestId,
        currentBuild,
        result,
      }
      self.postMessage(out)
      return
    }

    if (msg.type === 'exportGO') {
      const session = ensureSession(msg.datasetKey, msg.good)
      const exported = session.exportGODatabase(msg.preset, msg.selection)
      const out: WorkerResponse = {
        type: 'exportGOResult',
        requestId: msg.requestId,
        exported,
      }
      self.postMessage(out)
      return
    }

    if (msg.type === 'optimize') {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      const session = ensureSession(msg.datasetKey, msg.good)
      const result = await session.optimize(msg.preset, msg.settings, {
        weaponId: msg.weaponId,
        weaponOverride: msg.weaponOverride,
        signal: controller.signal,
        onProgress: (progress) => {
          const out: WorkerResponse = {
            type: 'progress',
            requestId: msg.requestId,
            progress,
          }
          self.postMessage(out)
        },
      })
      if (!controller.signal.aborted) {
        const out: WorkerResponse = {
          type: 'result',
          requestId: msg.requestId,
          result,
        }
        self.postMessage(out)
      }
      return
    }

    if (msg.type === 'optimizeTeam') {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller

      const session = ensureSession(msg.datasetKey, msg.good)
      const result = await session.optimizeTeam(msg.preset, msg.settings, {
        weaponId: msg.weaponId,
        weaponOverride: msg.weaponOverride,
        signal: controller.signal,
        onProgress: (progress) => {
          const out: WorkerResponse = {
            type: 'teamProgress',
            requestId: msg.requestId,
            progress,
          }
          self.postMessage(out)
        },
      })
      if (!controller.signal.aborted) {
        const out: WorkerResponse = {
          type: 'teamResult',
          requestId: msg.requestId,
          result,
        }
        self.postMessage(out)
      }
      return
    }
  } catch (err) {
    if (
      'type' in msg &&
      (msg.type === 'optimize' || msg.type === 'optimizeTeam') &&
      activeController?.signal.aborted
    ) {
      return
    }
    const out: WorkerResponse = {
      type: 'error',
      requestId: 'requestId' in msg ? msg.requestId : undefined,
      message: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(out)
  }
}
