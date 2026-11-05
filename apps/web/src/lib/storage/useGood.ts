'use client'

import {
  DEFAULT_OPTIMIZER_SETTINGS,
  type OptimizerSettings,
  type Preset,
} from '@gi/presets'
import { useCallback, useEffect, useState } from 'react'
import {
  clearGood,
  deleteUserPreset,
  listUserPresets,
  loadGood,
  loadSettings,
  saveGood,
  saveSettings,
  saveUserPreset,
  type StoredGoodRecord,
} from './db'

const STORAGE_EVENT = 'gi-optimizer-storage-changed'

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORAGE_EVENT))
  }
}

export function useGoodStorage() {
  const [record, setRecord] = useState<StoredGoodRecord | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await loadGood()
      setRecord(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const handler = () => void refresh()
    window.addEventListener(STORAGE_EVENT, handler)
    return () => window.removeEventListener(STORAGE_EVENT, handler)
  }, [refresh])

  const save = useCallback(async (next: StoredGoodRecord) => {
    await saveGood(next)
    setRecord(next)
    notifyChange()
  }, [])

  const clear = useCallback(async () => {
    await clearGood()
    setRecord(undefined)
    notifyChange()
  }, [])

  return { record, loading, save, clear, refresh }
}

export function useUserPresets() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const list = await listUserPresets()
      setPresets(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const handler = () => void refresh()
    window.addEventListener(STORAGE_EVENT, handler)
    return () => window.removeEventListener(STORAGE_EVENT, handler)
  }, [refresh])

  const save = useCallback(async (preset: Preset) => {
    await saveUserPreset(preset)
    await refresh()
    notifyChange()
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await deleteUserPreset(id)
    await refresh()
    notifyChange()
  }, [refresh])

  return { presets, loading, save, remove, refresh }
}

export function useOptimizerSettings() {
  const [settings, setSettings] = useState<OptimizerSettings>(
    DEFAULT_OPTIMIZER_SETTINGS
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
      .then((s) => {
        if (s) setSettings({ ...DEFAULT_OPTIMIZER_SETTINGS, ...s })
      })
      .finally(() => setLoading(false))
  }, [])

  const update = useCallback(async (next: OptimizerSettings) => {
    setSettings(next)
    await saveSettings(next)
  }, [])

  return { settings, loading, update }
}

