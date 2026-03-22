import { test, expect } from '@playwright/test'
import { ensureMfaEnrollment, finishLoginFlow, resetMfaFactorsForTestUser } from './utils/auth-flow'

type Phase = 'login' | 'admin' | 'organizations' | 'preferences'

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

      if (parsed.pathname.startsWith('/app') || parsed.pathname.startsWith('/auth') || parsed.pathname.startsWith('/admin')) {
        return `page:${parsed.pathname}`
      }
    }

    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
  }
}

test.describe('System Admin Login Flow Audit', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('system admin login and admin navigation stay bounded', async ({ page }, testInfo) => {
    const email = process.env.AUTH_TEST_EMAIL
    const password = process.env.AUTH_TEST_PASSWORD

    test.skip(!email || !password, 'AUTH_TEST_* credentials not set')

    await resetMfaFactorsForTestUser(email)

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
        normalized.startsWith('page:/auth') ||
        normalized.startsWith('page:/admin')
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

    await page.goto('/auth/login?redirect=/admin')
    await page.locator('#email').first().fill(email)
    await page.locator('#password').first().fill(password)
    await page.locator('button[type="submit"]').first().click()

    await page.waitForURL(/\/(admin|app|legal\/accept|app\/profile\/security)/, { timeout: 15000 })
    await finishLoginFlow(page, /\/(admin|app)/)
    finalUrls.login = page.url()

    currentPhase = 'admin'
    if (!page.url().includes('/admin')) {
      await page.goto('/admin')
    }
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/app/profile/security')) {
      await ensureMfaEnrollment(page)
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')
    }

    await page.waitForTimeout(1000)
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('main').last()).toBeVisible({ timeout: 15000 })
    finalUrls.admin = page.url()

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
      console.log(`[system-admin-login-flow-audit] ${item.key} -> ${item.count}`)
    }
    console.log(`[system-admin-login-flow-audit] finalUrls ${JSON.stringify(finalUrls)}`)

    await testInfo.attach('system-admin-login-flow-audit.json', {
      body: JSON.stringify({ report, totalSamples: samples.length, finalUrls }, null, 2),
      contentType: 'application/json',
    })

    const getCount = (phase: Phase, endpoint: string) => summary.get(`${phase} ${endpoint}`) ?? 0

    expect(getCount('login', 'page:/auth/login')).toBeLessThanOrEqual(2)
    expect(getCount('admin', 'page:/admin')).toBeLessThanOrEqual(2)
    expect(getCount('organizations', 'page:/app/profile/organizations')).toBeLessThanOrEqual(2)
    expect(getCount('preferences', 'page:/app/profile/preferences')).toBeLessThanOrEqual(2)

    expect(getCount('login', 'supabase:/auth/v1/token')).toBeLessThanOrEqual(1)
    expect(getCount('login', 'supabase:/rest/v1/users')).toBeLessThanOrEqual(2)
    expect(getCount('login', 'supabase:/rest/v1/user_tenant_memberships')).toBeLessThanOrEqual(2)
    expect(getCount('admin', 'app:/api/accounts/auth/mfa/status')).toBeLessThanOrEqual(4)
    expect(getCount('admin', 'app:/api/accounts/auth/mfa/devices')).toBeLessThanOrEqual(3)
    expect(getCount('organizations', 'app:/api/accounts/profile/organizations')).toBeLessThanOrEqual(2)
    expect(getCount('preferences', 'app:/api/accounts/profile/preferences')).toBeLessThanOrEqual(2)
  })
})