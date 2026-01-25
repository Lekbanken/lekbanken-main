import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { selectTenant, clearTenantSelection } from '@/app/actions/tenant'

async function handleSelectTenant(formData: FormData) {
  'use server'
  const tenantId = formData.get('tenantId')
  if (!tenantId || typeof tenantId !== 'string') {
    redirect('/app/select-tenant')
  }
  await selectTenant(tenantId)
  redirect('/app')
}

async function handleContinueWithoutTenant() {
  'use server'
  await clearTenantSelection()
  redirect('/app')
}

export default async function SelectTenantPage() {
  const authContext = await getServerAuthContext('/app/select-tenant')
  const t = await getTranslations('app.selectTenant')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/app/select-tenant')
  }

  const memberships = authContext.memberships || []
  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'

  // System admins with no memberships can continue without tenant
  if (memberships.length === 0 && !isSystemAdmin) {
    redirect('/app/no-access')
  }

  // Auto-select if user has exactly one tenant and is not a system admin
  if (memberships.length === 1 && memberships[0]?.tenant_id && !isSystemAdmin) {
    await selectTenant(memberships[0].tenant_id!)
    redirect('/app')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <form action={handleSelectTenant} className="space-y-3">
        {memberships.map((membership) => (
          <button
            key={membership.tenant_id}
            type="submit"
            name="tenantId"
            value={membership.tenant_id ?? ''}
            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition hover:border-primary/60 hover:bg-muted"
          >
            <div>
              <p className="font-medium text-foreground">
                {membership.tenant?.name ?? t('unknownName')}
              </p>
              <p className="text-xs text-muted-foreground">
                Roll: {membership.role ?? 'member'}
              </p>
            </div>
            <span className="text-sm text-primary">{t('select')}</span>
          </button>
        ))}
      </form>

      {/* System admins can continue without selecting a tenant */}
      {isSystemAdmin && (
        <form action={handleContinueWithoutTenant}>
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/50"
          >
            <div>
              <p className="font-medium text-muted-foreground">{t('continueWithout')}</p>
              <p className="text-xs text-muted-foreground">
                {t('workAsAdmin')}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">→</span>
          </button>
        </form>
      )}
    </div>
  )
}
