/**
 * useTransientValue contract tests
 *
 * Locks the shared transient-value hook behavior used across profile UIs:
 * - values auto-clear after the requested duration
 * - a later show() replaces the earlier timer
 * - clear() resets immediately and prevents stale timer writes
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import { useTransientValue } from '@/hooks/useTransientValue'

function TestHarness() {
  const { value, show, clear, setValue } = useTransientValue('idle')

  return (
    <div>
      <div data-testid="value">{value}</div>
      <button onClick={() => show('first', 1000)}>show-first</button>
      <button onClick={() => show('second', 1000)}>show-second</button>
      <button onClick={() => clear()}>clear</button>
      <button onClick={() => setValue('manual')}>manual</button>
    </div>
  )
}

describe('useTransientValue contract', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('clears the transient value after the requested duration', () => {
    render(<TestHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'show-first' }))
    expect(screen.getByTestId('value')).toHaveTextContent('first')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('value')).toHaveTextContent('idle')
  })

  it('restarts the timer when show is called again', () => {
    render(<TestHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'show-first' }))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    fireEvent.click(screen.getByRole('button', { name: 'show-second' }))
    expect(screen.getByTestId('value')).toHaveTextContent('second')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('value')).toHaveTextContent('second')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('value')).toHaveTextContent('idle')
  })

  it('clear resets immediately and cancels pending timer updates', () => {
    render(<TestHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'show-first' }))
    fireEvent.click(screen.getByRole('button', { name: 'clear' }))

    expect(screen.getByTestId('value')).toHaveTextContent('idle')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('value')).toHaveTextContent('idle')
  })

  it('setValue updates immediately without scheduling an auto-clear', () => {
    render(<TestHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'manual' }))
    expect(screen.getByTestId('value')).toHaveTextContent('manual')

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByTestId('value')).toHaveTextContent('manual')
  })
})