import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DocumentTextIcon, PencilSquareIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared'
import {
  getOrgLegalAcceptanceMap,
  listLegalAuditEvents,
  listLegalDocuments,
  listLegalDrafts,
} from '@/app/actions/legal-admin'
import { TENANT_LEGAL_TYPES } from '@/lib/legal/constants'
import { LEGAL_DOC_LABELS, LEGAL_LOCALE_LABELS } from '@/lib/legal/doc-metadata'
import type { LegalDocType } from '@/lib/legal/types'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

export default async function TenantLegalHubPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  if (!tenantId) {
    notFound()
  }

  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title="Unauthorized"
          description="Sign in to manage legal documents."
        />
      </AdminPageLayout>
    )
  }

  const hasTenantAccess = isSystemAdmin(user) || await isTenantAdmin(tenantId, user.id)
  if (!hasTenantAccess) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title="Access denied"
          description="Tenant admin access is required to manage organization legal documents."
        />
      </AdminPageLayout>
    )
  }

  const [docsResult, draftsResult, auditResult] = await Promise.all([
    listLegalDocuments({ scope: 'tenant', tenantId, activeOnly: true }),
    listLegalDrafts({ scope: 'tenant', tenantId }),
    listLegalAuditEvents({ scope: 'tenant', tenantId, limit: 12 }),
  ])

  if (!docsResult.success) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-10 w-10" />}
          title="Legal documents unavailable"
          description={docsResult.error}
        />
      </AdminPageLayout>
    )
  }

  const activeDocs = docsResult.data
  const drafts = draftsResult.success ? draftsResult.data : []
  const auditEvents = auditResult.success ? auditResult.data : []
  const draftIndex = new Set(drafts.map((draft) => `${draft.type}:${draft.locale}`))

  const acceptanceResult = activeDocs.length
    ? await getOrgLegalAcceptanceMap({
        tenantId,
        documentIds: activeDocs.map((doc) => doc.id),
      })
    : { success: true, data: {} }

  const acceptanceMap = acceptanceResult.success ? acceptanceResult.data : {} as Record<string, { accepted_at: string }>

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Organization', href: `/admin/tenant/${tenantId}` },
          { label: 'Legal' },
        ]}
      />

      <AdminPageHeader
        title="Organization legal"
        description="Manage organization terms and data processing agreements."
        icon={<ShieldCheckIcon className="h-6 w-6" />}
      />

      <AdminStatGrid cols={3} className="mb-8">
        <AdminStatCard
          label="Active documents"
          value={activeDocs.length}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label="Drafts"
          value={drafts.length}
          icon={<PencilSquareIcon className="h-5 w-5" />}
          iconColor="purple"
        />
        <AdminStatCard
          label="Accepted docs"
          value={Object.keys(acceptanceMap).length}
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          iconColor="green"
        />
      </AdminStatGrid>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active documents</h2>
        {activeDocs.length === 0 ? (
          <AdminEmptyState
            icon={<DocumentTextIcon className="h-10 w-10" />}
            title="No active organization documents"
            description="Publish organization terms or a DPA to share with your team."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Locale</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Org acceptance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{LEGAL_DOC_LABELS[doc.type as LegalDocType]}</div>
                      <div className="text-xs text-muted-foreground">{doc.title}</div>
                    </td>
                    <td className="px-4 py-3">{LEGAL_LOCALE_LABELS[doc.locale as keyof typeof LEGAL_LOCALE_LABELS]}</td>
                    <td className="px-4 py-3">v{doc.version_int}</td>
                    <td className="px-4 py-3">
                      {(acceptanceMap as Record<string, { accepted_at: string }>)[doc.id]
                        ? new Date((acceptanceMap as Record<string, { accepted_at: string }>)[doc.id].accepted_at).toLocaleString()
                        : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      {draftIndex.has(`${doc.type}:${doc.locale}`) ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Draft updated
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tenant/${tenantId}/legal/${doc.type}`}
                        className="text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts saved.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{LEGAL_DOC_LABELS[draft.type as LegalDocType]}</p>
                    <p className="text-xs text-muted-foreground">{LEGAL_LOCALE_LABELS[draft.locale]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(draft.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/admin/tenant/${tenantId}/legal/${draft.type}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {auditEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="space-y-2">
            {auditEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{event.event_type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{event.document_id ?? 'N/A'}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-2">
        <h2 className="text-lg font-semibold">Document shortcuts</h2>
        <div className="flex flex-wrap gap-2">
          {TENANT_LEGAL_TYPES.map((type) => (
            <Link
              key={type}
              href={`/admin/tenant/${tenantId}/legal/${type}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {LEGAL_DOC_LABELS[type as LegalDocType]}
            </Link>
          ))}
        </div>
      </section>
    </AdminPageLayout>
  )
}
