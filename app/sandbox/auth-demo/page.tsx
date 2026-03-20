import { cookies } from 'next/headers'
import AuthDebugPanel from '@/components/sandbox/AuthDebugPanel'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { getDemoSession } from '@/lib/utils/demo-detection'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'

export default async function AuthDemoPage() {
  const authContext = await getServerAuthContext('/sandbox/auth-demo')
  const demoSession = await getDemoSession()
  const cookieStore = await cookies()
  const tenantCookieTenantId = await readTenantIdFromCookies(cookieStore)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Auth/Tenant Demo</h1>
        <p className="text-sm text-muted-foreground">
          Visar server-hydrerad auth + tenantstate. Använd detta för felsökning och referens.
        </p>
      </div>
      <AuthDebugPanel
        serverSnapshot={{
          userId: authContext.user?.id ?? null,
          activeTenantId: authContext.activeTenant?.id ?? null,
          activeTenantName: authContext.activeTenant?.name ?? null,
          effectiveGlobalRole: authContext.effectiveGlobalRole ?? null,
          membershipCount: authContext.memberships?.length ?? 0,
          tenantCookieTenantId,
          hasDemoSessionCookie: Boolean(cookieStore.get('demo_session_id')?.value),
          isDemoMode: Boolean(demoSession),
          demoTier: demoSession?.tier ?? null,
          demoTimeRemainingMs: demoSession?.timeRemaining ?? null,
        }}
      />
    </div>
  )
}
