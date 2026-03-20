/**
 * Demo banner contract tests
 *
 * Locks the hydration contract between SSR demo status and the client demo hook:
 * - while the hook is loading, the banner trusts initialStatus completely
 * - once loading finishes, live hook state takes over
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

type DemoHookState = {
  isDemoMode: boolean
  tier?: 'free' | 'premium'
  timeRemaining?: number
  showTimeoutWarning?: boolean
  isLoading: boolean
}

let mockDemoHookState: DemoHookState = {
  isDemoMode: false,
  tier: undefined,
  timeRemaining: undefined,
  showTimeoutWarning: false,
  isLoading: false,
}

const mockConvertDemo = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useIsDemo', () => ({
  useIsDemo: () => mockDemoHookState,
  formatTimeRemaining: (ms: number) => `${Math.floor(ms / 1000 / 60)}m`,
  useConvertDemo: () => mockConvertDemo,
}))

vi.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => null,
  ClockIcon: () => null,
  SparklesIcon: () => null,
}))

import { DemoBanner } from '@/components/demo/DemoBanner'

describe('DemoBanner contract', () => {
  beforeEach(() => {
    mockDemoHookState = {
      isDemoMode: false,
      tier: undefined,
      timeRemaining: undefined,
      showTimeoutWarning: false,
      isLoading: false,
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('uses initialStatus while the demo hook is still loading', () => {
    mockDemoHookState = {
      isDemoMode: false,
      tier: 'premium',
      timeRemaining: undefined,
      showTimeoutWarning: true,
      isLoading: true,
    }

    render(
      <DemoBanner
        initialStatus={{
          isDemoMode: true,
          tier: 'free',
          timeRemaining: 15 * 60 * 1000,
          showTimeoutWarning: false,
        }}
      />
    )

    expect(screen.getByText('Demo Mode - Free Tier')).toBeInTheDocument()
    expect(screen.getByText(/15m remaining/)).toBeInTheDocument()
  })

  it('switches to live hook state once loading completes', () => {
    mockDemoHookState = {
      isDemoMode: true,
      tier: 'premium',
      timeRemaining: 20 * 60 * 1000,
      showTimeoutWarning: false,
      isLoading: true,
    }

    const { rerender } = render(
      <DemoBanner
        initialStatus={{
          isDemoMode: true,
          tier: 'free',
          timeRemaining: 15 * 60 * 1000,
          showTimeoutWarning: false,
        }}
      />
    )

    expect(screen.getByText('Demo Mode - Free Tier')).toBeInTheDocument()

    mockDemoHookState = {
      isDemoMode: true,
      tier: 'premium',
      timeRemaining: 20 * 60 * 1000,
      showTimeoutWarning: false,
      isLoading: false,
    }

    rerender(
      <DemoBanner
        initialStatus={{
          isDemoMode: true,
          tier: 'free',
          timeRemaining: 15 * 60 * 1000,
          showTimeoutWarning: false,
        }}
      />
    )

    expect(screen.getByText('Premium Demo Mode')).toBeInTheDocument()
    expect(screen.getByText('Exploring all premium features')).toBeInTheDocument()
  })

  it('does not render a stale demo banner when server initialStatus says demo is off', () => {
    mockDemoHookState = {
      isDemoMode: true,
      tier: 'premium',
      timeRemaining: 30 * 60 * 1000,
      showTimeoutWarning: true,
      isLoading: true,
    }

    const { container } = render(
      <DemoBanner
        initialStatus={{
          isDemoMode: false,
          tier: undefined,
          timeRemaining: undefined,
          showTimeoutWarning: false,
        }}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})