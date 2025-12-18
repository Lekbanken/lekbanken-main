'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type AdminMode = 'system' | 'tenant'

const STORAGE_KEY = 'lekbanken_admin_mode'
const MODE_CHANGED_EVENT = 'lekbanken_admin_mode_changed'

function isAdminMode(value: unknown): value is AdminMode {
  return value === 'system' || value === 'tenant'
}

export function useAdminMode(options: { isSystemAdmin: boolean }) {
  const { isSystemAdmin } = options

  const isHydrated = useSyncExternalStore(
    () => () => {
      // no-op subscription
    },
    () => true,
    () => false
  )

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => {}

      const onStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY) return
        onStoreChange()
      }

      const onModeChanged = () => onStoreChange()

      window.addEventListener('storage', onStorage)
      window.addEventListener(MODE_CHANGED_EVENT, onModeChanged)
      return () => {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener(MODE_CHANGED_EVENT, onModeChanged)
      }
    },
    []
  )

  const getSnapshot = useCallback((): AdminMode => {
    if (!isSystemAdmin) return 'tenant'
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      if (isAdminMode(stored)) return stored
    } catch {
      // ignore
    }
    return 'system'
  }, [isSystemAdmin])

  const mode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => (isSystemAdmin ? 'system' : 'tenant')
  )

  const setMode = useCallback(
    (next: AdminMode) => {
      if (!isSystemAdmin) return
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }

      try {
        window.dispatchEvent(new Event(MODE_CHANGED_EVENT))
      } catch {
        // ignore
      }
    },
    [isSystemAdmin]
  )

  return {
    mode,
    setMode,
    isHydrated,
    canSwitchMode: isSystemAdmin,
  }
}
