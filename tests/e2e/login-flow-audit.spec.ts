import { test, expect, type Page } from '@playwright/test'
import { ensureMfaEnrollment, resetMfaFactorsForTestUser } from './utils/auth-flow'

type Phase = 'login' | 'app' | 'organizations' | 'preferences'

type Sample = {
  phase: Phase
  method: string
  kind: 'document' | 'xhr' | 'fetch' | 'other'
  normalized: string
  url: string
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
  test.describe.configure({ timeout: 60000 })

  test.use({ storageState: { cookies: [], origins: [] } })

  async function waitForVisibleMain(page: Page) {
    await page.waitForTimeout(1000)
    await expect(page.locator('main').last()).toBeVisible({ timeout: 15000 })
  }

  test('tenant admin login and profile navigation stay bounded', async ({ page }, testInfo) => {
    const email = process.env.TEST_TENANT_ADMIN_EMAIL || process.env.AUTH_TEST_EMAIL
    const password = process.env.TEST_TENANT_ADMIN_PASSWORD || process.env.AUTH_TEST_PASSWORD

    test.skip(!email || !password, 'TEST_TENANT_ADMIN_* or AUTH_TEST_* credentials not set')

    await resetMfaFactorsForTestUser(email!)

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

    await page.waitForURL(/\/(admin|app|legal\/accept|app\/profile\/security)/, { timeout: 15000 })
    await handleLegalAcceptance(page)

    if (page.url().includes('/app/profile/security') && page.url().includes('enroll=true')) {
      await ensureMfaEnrollment(page)
      await page.goto('/app', { waitUntil: 'commit' })
      await waitForVisibleMain(page)
    }

    if (!page.url().includes('/app')) {
      await page.goto('/app', { waitUntil: 'commit' })
      await waitForVisibleMain(page)
    }

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
    finalUrls.login = page.url()

    currentPhase = 'app'
    await waitForVisibleMain(page)
    finalUrls.app = page.url()

    const appCookies = await page.context().cookies()
    const tenantCookie = appCookies.find((cookie) => cookie.name === 'lb_tenant')
    expect(tenantCookie?.value).toBeTruthy()

    currentPhase = 'organizations'
    await page.goto('/app/profile/organizations', { waitUntil: 'commit' })
    await expect.poll(() => page.url(), { timeout: 15000 }).toMatch(/\/app\/profile\/organizations/)
    await waitForVisibleMain(page)
    finalUrls.organizations = page.url()

    currentPhase = 'preferences'
    await page.goto('/app/profile/preferences', { waitUntil: 'commit' })
    await expect.poll(() => page.url(), { timeout: 15000 }).toMatch(/\/app\/profile\/preferences/)
    await waitForVisibleMain(page)
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