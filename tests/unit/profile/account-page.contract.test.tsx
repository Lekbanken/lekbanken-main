/**
 * Account page contract tests
 *
 * Locks the UI behavior for account settings so that:
 * - email success feedback survives form close/reset and shows the submitted address
 * - password drafts are cleared when the form is closed and reopened
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    if (key === 'sections.account.emailChangeSuccess' && values?.email) {
      return `emailChangeSuccess:${values.email}`
    }
    return key
  },
}))

vi.mock('@/lib/supabase/auth', () => ({
  useAuth: () => ({
    user: {
      email: 'user@example.com',
      email_confirmed_at: '2026-03-20T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      last_sign_in_at: '2026-03-20T00:00:00.000Z',
    },
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

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, type = 'text', placeholder }: {
    id?: string
    value?: string
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
    type?: string
    placeholder?: string
  }) => (
    <input id={id} value={value} onChange={onChange} type={type} placeholder={placeholder} />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@heroicons/react/24/outline', () => ({
  AtSymbolIcon: () => null,
  KeyIcon: () => null,
  CheckCircleIcon: () => null,
  ExclamationTriangleIcon: () => null,
  EyeIcon: () => null,
  EyeSlashIcon: () => null,
  ShieldCheckIcon: () => null,
  EnvelopeIcon: () => null,
}))

import AccountSettingsPage from '@/app/app/profile/account/page'

describe('AccountSettingsPage contract', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows email success feedback with the submitted address after the form closes', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<AccountSettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'sections.account.changeEmail' }))
    fireEvent.change(screen.getByLabelText('sections.account.newEmail'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByLabelText('sections.account.confirmWithPassword'), {
      target: { value: 'correct horse battery staple' },
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'sections.account.changeEmail' }).at(-1) as HTMLButtonElement)

    expect(await screen.findByText('emailChangeSuccess:new@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('sections.account.newEmail')).not.toBeInTheDocument()
  })

  it('clears password draft fields when the form is closed and reopened', () => {
    render(<AccountSettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'sections.account.changePassword' }))

    fireEvent.change(screen.getByLabelText('sections.account.currentPassword'), {
      target: { value: 'CurrentPass1' },
    })
    fireEvent.change(screen.getByLabelText('sections.account.newPassword'), {
      target: { value: 'NewPass123' },
    })
    fireEvent.change(screen.getByLabelText('sections.account.confirmPassword'), {
      target: { value: 'NewPass123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'sections.account.cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'sections.account.changePassword' }))

    expect(screen.getByLabelText('sections.account.currentPassword')).toHaveValue('')
    expect(screen.getByLabelText('sections.account.newPassword')).toHaveValue('')
    expect(screen.getByLabelText('sections.account.confirmPassword')).toHaveValue('')
  })
})