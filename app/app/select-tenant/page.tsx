import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { selectTenant } from '@/app/actions/tenant'

async function handleSelectTenant(formData: FormData) {
  'use server'
  const tenantId = formData.get('tenantId')
  if (!tenantId || typeof tenantId !== 'string') {
    redirect('/app/select-tenant')
  }
  await selectTenant(tenantId)
  redirect('/app')
}

export default async function SelectTenantPage() {
  const authContext = await getServerAuthContext('/app/select-tenant')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/app/select-tenant')
  }

  const memberships = authContext.memberships || []

  if (memberships.length === 0) {
    redirect('/app/no-access')
  }

  if (memberships.length === 1 && memberships[0]?.tenant_id) {
    await selectTenant(memberships[0].tenant_id!)
    redirect('/app')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Välj organisation</h1>
        <p className="text-sm text-muted-foreground">
          Välj vilken organisation du vill arbeta i just nu.
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
                {membership.tenant?.name ?? 'Okänt namn'}
              </p>
              <p className="text-xs text-muted-foreground">
                Roll: {membership.role ?? 'member'}
              </p>
            </div>
            <span className="text-sm text-primary">Välj</span>
          </button>
        ))}
      </form>
    </div>
  )
}
