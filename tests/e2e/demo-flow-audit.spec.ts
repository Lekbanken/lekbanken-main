import { test, expect } from '@playwright/test'

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

      if (parsed.pathname.startsWith('/app') || parsed.pathname.startsWith('/auth') || parsed.pathname.startsWith('/demo')) {
        return `page:${parsed.pathname}`
      }
    }

    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
  }
}

test.describe('Demo Flow Audit', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('demo start lands in app with demo and tenant cookies', async ({ page }, testInfo) => {
    const samples: Array<{ method: string; normalized: string }> = []

    page.on('request', (request) => {
      const normalized = normalizeUrl(request.url())
      if (
        normalized.startsWith('supabase:') ||
        normalized.startsWith('app:/api/') ||
        normalized.startsWith('page:/app') ||
        normalized.startsWith('page:/auth') ||
        normalized.startsWith('page:/demo')
      ) {
        samples.push({ method: request.method(), normalized })
      }
    })

    await page.goto('/demo')
    await page.getByRole('button', { name: /start/i }).first().click()

    await page.waitForURL(/\/app/, { timeout: 20000 })
    await page.waitForLoadState('networkidle')

    const cookies = await page.context().cookies()
    const tenantCookie = cookies.find((cookie) => cookie.name === 'lb_tenant')
    const demoCookie = cookies.find((cookie) => cookie.name === 'demo_session_id')

    expect(tenantCookie?.value).toBeTruthy()
    expect(demoCookie?.value).toBeTruthy()

    await expect(page.locator('[role="banner"]')).toBeVisible({ timeout: 10000 })

    const summary = samples.reduce<Record<string, number>>((acc, sample) => {
      const key = `${sample.method} ${sample.normalized}`
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    await testInfo.attach('demo-flow-audit.json', {
      body: JSON.stringify({ summary, finalUrl: page.url() }, null, 2),
      contentType: 'application/json',
    })

    expect(summary['POST page:/auth/demo']).toBeLessThanOrEqual(1)
    expect(summary['GET app:/api/demo/status']).toBeLessThanOrEqual(2)
    expect(summary['GET page:/app']).toBeLessThanOrEqual(2)
  })
})