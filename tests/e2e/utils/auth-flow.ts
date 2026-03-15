import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'

export async function waitForPostLoginRedirect(page: Page, redirectPattern: RegExp) {
  await expect
    .poll(() => page.url(), { timeout: 15000 })
    .toMatch(redirectPattern)
}

async function acceptCookieBannerIfPresent(page: Page) {
  const cookieAcceptButton = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first()
  if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieAcceptButton.click()
    await page.waitForTimeout(300)
  }
}

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

export async function resetMfaFactorsForTestUser(email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: usersResponse, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (usersError) {
    console.warn(`⚠️  Could not reset MFA factors for ${email} (admin API error: ${usersError.message}). Proceeding with login — will fail only if MFA is actually enrolled.`)
    return
  }

  const user = usersResponse.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    throw new Error(`Could not find test user for MFA reset: ${email}`)
  }

  const { data: factorsResponse, error: factorsError } = await adminClient.auth.admin.mfa.listFactors({ userId: user.id })
  if (factorsError) {
    throw new Error(`Failed to list MFA factors for ${email}: ${factorsError.message}`)
  }

  for (const factor of factorsResponse.factors) {
    const { error: deleteError } = await adminClient.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
    if (deleteError) {
      throw new Error(`Failed to delete MFA factor for ${email}: ${deleteError.message}`)
    }
  }

  await adminClient
    .from('user_mfa')
    .update({
      enrolled_at: null,
      last_verified_at: null,
      recovery_codes_count: 0,
      recovery_codes_used: 0,
      recovery_codes_hashed: null,
      recovery_codes_generated_at: null,
    })
    .eq('user_id', user.id)
}

export async function handleLegalAcceptance(page: Page) {
  if (!page.url().includes('/legal/accept')) return

  await page.waitForTimeout(1000)
  await acceptCookieBannerIfPresent(page)

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
  await acceptCookieBannerIfPresent(page)

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

  const activateButton = page.locator('button').filter({ hasText: /aktivera|enable|activate/i }).first()
  await expect(activateButton).toBeVisible({ timeout: 10000 })
  await activateButton.click()
  await acceptCookieBannerIfPresent(page)

  const startButton = page.locator('button').filter({ hasText: /start|börja|kom i gang|prepare/i }).first()
  await expect(startButton).toBeVisible({ timeout: 10000 })
  await startButton.click()

  const secretCode = page.locator('code').filter({ hasText: /^[A-Z2-7]{16,}$/ }).first()
  await expect(secretCode).toBeVisible({ timeout: 10000 })
  const secret = (await secretCode.textContent())?.trim()
  if (!secret) {
    throw new Error('Could not read MFA enrollment secret from UI')
  }

  const scannedButton = page.locator('button').filter({ hasText: /scanned|skannat|skannet|skannet koden|jeg har skannet koden|fortsett|fortsätt|continue/i }).first()
  await expect(scannedButton).toBeVisible({ timeout: 10000 })
  await scannedButton.click()

  const code = generateTotp(secret)
  const inputs = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"], input[maxlength="1"]')
  await expect(inputs.first()).toBeVisible({ timeout: 10000 })
  for (const [index, digit] of [...code].entries()) {
    await inputs.nth(index).fill(digit)
  }

  const continueButton = page.locator('button').filter({ hasText: /jeg har lagret kodene mine|fortsett|fortsätt|continue/i }).last()
  await expect(continueButton).toBeVisible({ timeout: 15000 })
  await continueButton.click()

  return { enrolledNow: true }
}

export async function finishLoginFlow(page: Page, finalUrlPattern: RegExp) {
  await handleLegalAcceptance(page)
  await acceptCookieBannerIfPresent(page)

  if (page.url().includes('/auth/mfa-challenge')) {
    throw new Error('MFA challenge requires a dedicated TOTP secret for this test account')
  }

  if (page.url().includes('/app/profile/security') && page.url().includes('enroll=true')) {
    await ensureMfaEnrollment(page)

    const currentUrl = new URL(page.url())
    const redirectPath = currentUrl.searchParams.get('redirect') || '/app'
    await page.goto(redirectPath)
    await page.waitForLoadState('networkidle')
  }

  await expect(page).toHaveURL(finalUrlPattern, { timeout: 15000 })
}
