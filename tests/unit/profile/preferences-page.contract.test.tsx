/**
 * Preferences page contract tests
 *
 * Locks the shell-vs-tenant ownership contract for profile preferences:
 * - shell locale/theme remain authoritative in the UI even if fetched tenant prefs disagree
 * - unsaved local edits are not overwritten by a later fetch refresh
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => mockLocale,
}))

vi.mock('@/lib/supabase/auth', () => ({
  useAuth: () => mockAuth(),
}))

vi.mock('@/lib/context/TenantContext', () => ({
  useTenant: () => mockTenant(),
}))

vi.mock('@/lib/context/PreferencesContext', () => ({
  usePreferences: () => mockPreferences(),
}))

vi.mock('@/lib/i18n/useLocaleSwitcher', () => ({
  useLocaleSwitcher: () => ({ switchLocale: mockSwitchLocale }),
}))

vi.mock('@/hooks/useProfileQuery', () => ({
  useProfileQuery: () => mockProfileQuery(),
}))

vi.mock('@/lib/profile', () => ({
  ProfileService: class MockProfileService {},
}))

vi.mock('@/hooks/useTransientValue', () => ({
  useTransientValue: (initialValue: unknown) => ({
    value: initialValue,
    show: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@heroicons/react/24/outline', () => ({
  AdjustmentsHorizontalIcon: () => null,
  LanguageIcon: () => null,
  SunIcon: () => null,
  MoonIcon: () => null,
  ComputerDesktopIcon: () => null,
  CheckCircleIcon: () => null,
}))

type QueryResult = {
  data: Record<string, unknown> | null
  status: 'success' | 'idle' | 'error' | 'timeout' | 'loading'
  error: string | null
  isLoading: boolean
  isTimeout: boolean
  retry: () => void
}

let mockLocale: 'sv' | 'en' | 'no' = 'sv'
const mockSetTheme = vi.fn()
const mockSetLanguage = vi.fn()
const mockSwitchLocale = vi.fn()
const mockRetry = vi.fn()

let mockProfileQueryState: QueryResult = {
  data: null,
  status: 'success',
  error: null,
  isLoading: false,
  isTimeout: false,
  retry: mockRetry,
}

const mockAuth = () => ({
  user: { id: 'user-1' },
  isLoading: false,
})

const mockTenant = () => ({
  currentTenant: { id: 'tenant-1' },
  isLoadingTenants: false,
})

const mockPreferences = () => ({
  theme: 'dark' as const,
  setTheme: mockSetTheme,
  setLanguage: mockSetLanguage,
})

const mockProfileQuery = () => mockProfileQueryState

import PreferencesPage from '@/app/app/profile/preferences/page'

function expectButtonActive(label: string) {
  const button = screen.getByRole('button', { name: new RegExp(label, 'i') })
  expect(button.className).toContain('border-primary')
  return button
}

describe('PreferencesPage contract', () => {
  beforeEach(() => {
    mockLocale = 'sv'
    mockProfileQueryState = {
      data: null,
      status: 'success',
      error: null,
      isLoading: false,
      isTimeout: false,
      retry: mockRetry,
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps shell locale and theme authoritative over fetched tenant preferences', () => {
    mockProfileQueryState = {
      ...mockProfileQueryState,
      data: {
        language: 'en',
        theme: 'light',
      },
    }

    render(<PreferencesPage />)

    expectButtonActive('Svenska')
    expectButtonActive('Mörkt')
  })

  it('does not overwrite unsaved edits when fetched preferences refresh', () => {
    mockProfileQueryState = {
      ...mockProfileQueryState,
      data: {
        language: 'sv',
        theme: 'dark',
      },
    }

    const { rerender } = render(<PreferencesPage />)

    fireEvent.click(screen.getByRole('button', { name: /english/i }))

    expectButtonActive('English')

    mockProfileQueryState = {
      ...mockProfileQueryState,
      data: {
        language: 'sv',
        theme: 'dark',
        content_maturity_level: 'teen',
      },
    }

    rerender(<PreferencesPage />)

    expectButtonActive('English')
  })
})