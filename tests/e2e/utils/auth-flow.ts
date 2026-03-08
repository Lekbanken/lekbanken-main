import { expect, type Page } from '@playwright/test'
import { createHmac } from 'node:crypto'

function decodeBase32(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const normalized = secret.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '')

  let bits = ''
  for (const char of normalized) {
    const value = alphabet.indexOf(char)
    if (value === -1) {
      throw new Error(`Invalid base32 character: ${char}`)
    }
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }

  return Buffer.from(bytes)
}

function generateTotp(secret: string, epochMs = Date.now()): string {
  const counter = Math.floor(epochMs / 30000)
  const key = decodeBase32(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buffer.writeUInt32BE(counter >>> 0, 4)

  const hmac = createHmac('sha1', key).update(buffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return String(binary % 1_000_000).padStart(6, '0')
}

async function browserFetchJson<T>(page: Page, input: string, init?: RequestInit): Promise<T> {
  return await page.evaluate(
    async ({ input, init }) => {
      const response = await fetch(input, {
        credentials: 'include',
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        const message = json && typeof json === 'object' && 'error' in json
          ? String((json as { error?: unknown }).error ?? response.status)
          : `Request failed: ${response.status}`
        throw new Error(message)
      }

      return json as T
    },
    { input, init }
  )
}

export async function handleLegalAcceptance(page: Page) {
  if (!page.url().includes('/legal/accept')) return

  await page.waitForTimeout(1000)

  const cookieAcceptButton = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first()
  if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieAcceptButton.click()
    await page.waitForTimeout(500)
  }

  let attempts = 0
  while (page.url().includes('/legal/accept') && attempts < 10) {
    attempts++

    const checkbox = page.locator('input[type="checkbox"]:not(:checked)').first()
    if (await checkbox.count() > 0) {
      await checkbox.check({ force: true })
      await page.waitForTimeout(300)
    }

    const acceptButton = page.locator('button:not([disabled])').filter({ hasText: /godta og fortsett|acceptera|accept|godkänn|fortsätt|continue/i }).first()
    if (await acceptButton.count() > 0) {
      await acceptButton.click()
      await page.waitForTimeout(500)
    } else {
      await page.waitForTimeout(500)
    }
  }
}

export async function ensureMfaEnrollment(page: Page) {
  const status = await browserFetchJson<{
    totp?: Array<{ id?: string; status?: string } | null> | null
    needs_enrollment?: boolean
  }>(page, '/api/accounts/auth/mfa/status')

  const verifiedFactor = Array.isArray(status.totp)
    ? status.totp.find((factor) => factor?.status === 'verified')
    : null

  if (verifiedFactor?.id && !status.needs_enrollment) {
    return { enrolledNow: false }
  }

  const enrollment = await browserFetchJson<{ factor_id: string; secret: string }>(
    page,
    '/api/accounts/auth/mfa/enroll',
    { method: 'POST', body: JSON.stringify({ friendly_name: 'Authenticator App' }) }
  )

  const code = generateTotp(enrollment.secret)

  await browserFetchJson<{ success: true }>(
    page,
    '/api/accounts/auth/mfa/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        factor_id: enrollment.factor_id,
        code,
        is_enrollment: true,
      }),
    }
  )

  return { enrolledNow: true }
}

export async function finishLoginFlow(page: Page, finalUrlPattern: RegExp) {
  await handleLegalAcceptance(page)

  if (page.url().includes('/app/profile/security') && page.url().includes('enroll=true')) {
    await ensureMfaEnrollment(page)

    const currentUrl = new URL(page.url())
    const redirectPath = currentUrl.searchParams.get('redirect') || '/app'
    await page.goto(redirectPath)
    await page.waitForLoadState('networkidle')
  }

  await expect(page).toHaveURL(finalUrlPattern, { timeout: 15000 })
}
