import { NextResponse, type NextRequest } from 'next/server'
import { cookies, headers } from 'next/headers'
import { finalizeLoginTenant } from '@/lib/tenant/finalize-login-tenant'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const hostname = headerStore.get('host')?.split(':')[0] || null

  const body = (await request.json().catch(() => null)) as { redirectTo?: unknown } | null
  const redirectTo = typeof body?.redirectTo === 'string' ? body.redirectTo : '/app'

  const { tenant } = await finalizeLoginTenant({
    cookieStore,
    hostname,
    pathname: redirectTo,
  })

  return NextResponse.json({
    ok: true,
    tenantId: tenant?.id ?? null,
  })
}