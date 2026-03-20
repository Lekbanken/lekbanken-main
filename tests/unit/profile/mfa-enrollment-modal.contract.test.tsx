/**
 * MFA enrollment modal contract tests
 *
 * Locks the client/server contract for MFA enrollment so the modal:
 * - verifies enrollment via /api/accounts/auth/mfa/verify
 * - marks the request as enrollment mode
 * - does not reintroduce the redundant /challenge request
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/auth/MFACodeInput', () => ({
  MFACodeInput: ({ onComplete, disabled }: { onComplete?: (code: string) => void; disabled?: boolean }) => (
    <button onClick={() => onComplete?.('123456')} disabled={disabled}>
      complete-code
    </button>
  ),
}))

vi.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => null,
  ShieldCheckIcon: () => null,
  DocumentDuplicateIcon: () => null,
  CheckCircleIcon: () => null,
  ExclamationTriangleIcon: () => null,
}))

import { MFAEnrollmentModal } from '@/app/app/profile/security/MFAEnrollmentModal'

describe('MFAEnrollmentModal contract', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('verifies MFA enrollment in enrollment mode without challenge request', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url

      if (url.endsWith('/api/accounts/auth/mfa/enroll')) {
        return new Response(
          JSON.stringify({ factor_id: 'factor-123', qr_code: 'data:image/png;base64,abc', secret: 'ABCDEFGHIJKLMNOP' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.endsWith('/api/accounts/auth/mfa/verify')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.endsWith('/api/accounts/auth/mfa/recovery-codes')) {
        return new Response(JSON.stringify({ recovery_codes: ['code-1', 'code-2'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`)
    })

    render(
      <MFAEnrollmentModal open onClose={vi.fn()} onSuccess={vi.fn()} userEmail="user@example.com" />
    )

    fireEvent.click(screen.getByRole('button', { name: 'start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'scanned' }))
    fireEvent.click(await screen.findByRole('button', { name: 'complete-code' }))

    await screen.findByText('recoveryCodes.title')

    const verifyCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      return url.endsWith('/api/accounts/auth/mfa/verify')
    })

    expect(verifyCall).toBeDefined()

    const verifyBody = JSON.parse(String(verifyCall?.[1]?.body ?? '{}')) as {
      factor_id?: string
      code?: string
      is_enrollment?: boolean
      challenge_id?: string
    }

    expect(verifyBody).toMatchObject({
      factor_id: 'factor-123',
      code: '123456',
      is_enrollment: true,
    })
    expect(verifyBody.challenge_id).toBeUndefined()

    const challengeCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      return url.endsWith('/api/accounts/auth/mfa/challenge')
    })

    expect(challengeCall).toBeUndefined()
  })

  it('resets to the start step after close and reopen', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ factor_id: 'factor-123', qr_code: 'data:image/png;base64,abc', secret: 'ABCDEFGHIJKLMNOP' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const { rerender } = render(
      <MFAEnrollmentModal open onClose={vi.fn()} onSuccess={vi.fn()} userEmail="user@example.com" />
    )

    fireEvent.click(screen.getByRole('button', { name: 'start' }))
    await screen.findByRole('button', { name: 'scanned' })

    rerender(<MFAEnrollmentModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} userEmail="user@example.com" />)
    rerender(<MFAEnrollmentModal open onClose={vi.fn()} onSuccess={vi.fn()} userEmail="user@example.com" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'start' })).toBeInTheDocument()
    })
  })
})