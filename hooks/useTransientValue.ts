'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useTransientValue<T>(initialValue: T) {
  const [value, setValueState] = useState<T>(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const setValue = useCallback((nextValue: T) => {
    clearTimer()
    setValueState(nextValue)
  }, [clearTimer])

  const clear = useCallback(() => {
    clearTimer()
    setValueState(initialValue)
  }, [clearTimer, initialValue])

  const show = useCallback((nextValue: T, durationMs: number) => {
    clearTimer()
    setValueState(nextValue)

    if (durationMs > 0) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        setValueState(initialValue)
      }, durationMs)
    }
  }, [clearTimer, initialValue])

  useEffect(() => clearTimer, [clearTimer])

  return {
    value,
    setValue,
    show,
    clear,
  }
}