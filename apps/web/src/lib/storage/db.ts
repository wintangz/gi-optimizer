import type { OptimizerSettings } from '@gi/engine'
import type { GoodSummary, IGOOD } from '@gi/good'
import type { Preset } from '@gi/presets'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface StoredGoodRecord {
  good: IGOOD
  importedAt: string
  fileName?: string
  source: string
  summary: GoodSummary
}

interface GiOptimizerDB extends DBSchema {
  good: {
    key: string
    value: StoredGoodRecord
  }
  presets: {
    key: string
    value: Preset
  }
  settings: {
    key: string
    value: OptimizerSettings
  }
}

const DB_NAME = 'gi-optimizer-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GiOptimizerDB>> | null = null

export function getDb(): Promise<IDBPDatabase<GiOptimizerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GiOptimizerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('good')) {
          db.createObjectStore('good')
        }
        if (!db.objectStoreNames.contains('presets')) {
          db.createObjectStore('presets', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return dbPromise
}

/** Reset cached DB handle (used in tests when resetting IndexedDB). */
export function resetDbForTesting(): void {
  dbPromise = null
}

export async function loadGood(): Promise<StoredGoodRecord | undefined> {
  const db = await getDb()
  return db.get('good', 'current')
}

export async function saveGood(record: StoredGoodRecord): Promise<void> {
  const db = await getDb()
  await db.put('good', record, 'current')
}

export async function clearGood(): Promise<void> {
  const db = await getDb()
  await db.delete('good', 'current')
}

export async function listUserPresets(): Promise<Preset[]> {
  const db = await getDb()
  return db.getAll('presets')
}

export async function saveUserPreset(preset: Preset): Promise<void> {
  const db = await getDb()
  await db.put('presets', preset)
}

export async function deleteUserPreset(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('presets', id)
}

export async function loadSettings(): Promise<OptimizerSettings | undefined> {
  const db = await getDb()
  return db.get('settings', 'optimizer')
}

export async function saveSettings(
  settings: OptimizerSettings
): Promise<void> {
  const db = await getDb()
  await db.put('settings', settings, 'optimizer')
}

