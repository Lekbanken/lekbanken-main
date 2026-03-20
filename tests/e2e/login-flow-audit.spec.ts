import { test, expect, type Page } from '@playwright/test'
import { createHmac } from 'node:crypto'

type Phase = 'login' | 'app' | 'organizations' | 'preferences'

type Sample = {
  phase: Phase
  method: string
  kind: 'document' | 'xhr' | 'fetch' | 'other'
  normalized: string
  url: string
}

type PageLike = Page

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

async function browserFetchJson<T>(page: PageLike, input: string, init?: RequestInit): Promise<T> {
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

async function ensureMfaEnrollment(page: PageLike) {
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

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('supabase.co')) {
      if (parsed.pathname.startsWith('/auth/v1/')) {
        return `supabase:${parsed.pathname}`
      }

      if (parsed.pathname.startsWith('/rest/v1/')) {
        return `supabase:${parsed.pathname}`
      }
    }

    if (parsed.origin === 'http://localhost:3000') {
      if (parsed.pathname.startsWith('/api/')) {
        return `app:${parsed.pathname}`
      }

      if (parsed.pathname.startsWith('/app') || parsed.pathname.startsWith('/auth')) {
        return `page:${parsed.pathname}`
      }
    }

    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
  }
}

async function handleLegalAcceptance(page: Page) {
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

  await page.waitForURL(/\/app/, { timeout: 15000 })
}

test.describe('Login Flow Audit', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('tenant admin login and profile navigation stay bounded', async ({ page }, testInfo) => {
    const email = process.env.TEST_TENANT_ADMIN_EMAIL || process.env.AUTH_TEST_EMAIL
    const password = process.env.TEST_TENANT_ADMIN_PASSWORD || process.env.AUTH_TEST_PASSWORD

    test.skip(!email || !password, 'TEST_TENANT_ADMIN_* or AUTH_TEST_* credentials not set')

    let currentPhase: Phase = 'login'
    const samples: Sample[] = []
    const finalUrls: Partial<Record<Phase, string>> = {}

    page.on('request', (request) => {
      const url = request.url()
      const normalized = normalizeUrl(url)

      if (
        normalized.startsWith('supabase:') ||
        normalized.startsWith('app:/api/') ||
        normalized.startsWith('page:/app') ||
        normalized.startsWith('page:/auth')
      ) {
        samples.push({
          phase: currentPhase,
          method: request.method(),
          kind: request.resourceType() as Sample['kind'],
          normalized,
          url,
        })
      }
    })

    await page.goto('/auth/login')
    await page.locator('#email').first().fill(email!)
    await page.locator('#password').first().fill(password!)
    await page.locator('button[type="submit"]').first().click()

    await page.waitForURL(/\/(admin|app|legal\/accept)/, { timeout: 15000 })
    await handleLegalAcceptance(page)
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
    finalUrls.login = page.url()

    if (page.url().includes('/app/profile/security') && page.url().includes('enroll=true')) {
      await ensureMfaEnrollment(page)
      await page.goto('/app')
      await page.waitForLoadState('networkidle')
    }

    if (!page.url().includes('/app')) {
      await page.goto('/app')
      await page.waitForLoadState('networkidle')
    }

    currentPhase = 'app'
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible({ timeout: 5000 })
    finalUrls.app = page.url()

    const appCookies = await page.context().cookies()
    const tenantCookie = appCookies.find((cookie) => cookie.name === 'lb_tenant')
    expect(tenantCookie?.value).toBeTruthy()

    currentPhase = 'organizations'
    await page.goto('/app/profile/organizations')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await expect(page.locator('main').last()).toBeVisible({ timeout: 15000 })
    finalUrls.organizations = page.url()

    currentPhase = 'preferences'
    await page.goto('/app/profile/preferences')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await expect(page.locator('main').last()).toBeVisible({ timeout: 15000 })
    finalUrls.preferences = page.url()

    const summary = new Map<string, number>()
    for (const sample of samples) {
      const key = `${sample.phase} ${sample.normalized}`
      summary.set(key, (summary.get(key) ?? 0) + 1)
    }

    const report = Array.from(summary.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ key, count }))

    for (const item of report) {
      console.log(`[login-flow-audit] ${item.key} -> ${item.count}`)
    }
    console.log(`[login-flow-audit] finalUrls ${JSON.stringify(finalUrls)}`)

    await testInfo.attach('login-flow-audit.json', {
      body: JSON.stringify({ report, totalSamples: samples.length, finalUrls }, null, 2),
      contentType: 'application/json',
    })

    const getCount = (phase: Phase, endpoint: string) => {
      return summary.get(`${phase} ${endpoint}`) ?? 0
    }

    expect(getCount('login', 'page:/auth/login')).toBeLessThanOrEqual(2)
    expect(getCount('login', 'page:/auth/finalize-login')).toBeLessThanOrEqual(1)
    expect(getCount('app', 'page:/app')).toBeLessThanOrEqual(3)
    expect(getCount('app', 'page:/app/browse')).toBe(0)
    expect(finalUrls.login?.includes('/admin')).toBe(false)
    expect(getCount('organizations', 'page:/app/profile/organizations')).toBeLessThanOrEqual(2)
    expect(getCount('preferences', 'page:/app/profile/preferences')).toBeLessThanOrEqual(2)

    expect(getCount('login', 'supabase:/auth/v1/token')).toBeLessThanOrEqual(1)
    expect(getCount('login', 'supabase:/rest/v1/user_tenant_memberships')).toBeLessThanOrEqual(2)
    expect(getCount('login', 'supabase:/rest/v1/users')).toBeLessThanOrEqual(2)
    expect(getCount('app', 'app:/api/accounts/auth/mfa/status')).toBeLessThanOrEqual(1)
    expect(getCount('app', 'app:/api/accounts/auth/mfa/devices')).toBeLessThanOrEqual(1)

    const organizationsRedirectedToSecurity = finalUrls.organizations?.includes('/app/profile/security') ?? false
    const preferencesRedirectedToSecurity = finalUrls.preferences?.includes('/app/profile/security') ?? false

    if (organizationsRedirectedToSecurity) {
      expect(getCount('organizations', 'page:/app/profile/security')).toBeLessThanOrEqual(1)
      expect(getCount('organizations', 'app:/api/accounts/profile/organizations')).toBe(0)
    } else {
      expect(getCount('organizations', 'app:/api/accounts/profile/organizations')).toBeLessThanOrEqual(2)
    }

    if (preferencesRedirectedToSecurity) {
      expect(getCount('preferences', 'page:/app/profile/security')).toBeLessThanOrEqual(1)
      expect(getCount('preferences', 'app:/api/accounts/profile/preferences')).toBe(0)
    } else {
      expect(getCount('preferences', 'app:/api/accounts/profile/preferences')).toBeLessThanOrEqual(2)
    }
  })
})