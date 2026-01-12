import Link from 'next/link'
import {
  DocumentTextIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared'
import { getCookieConsentOverview, getLegalAcceptanceImpact, listLegalAuditEvents, listLegalDocuments, listLegalDrafts } from '@/app/actions/legal-admin'
import { GLOBAL_LEGAL_TYPES } from '@/lib/legal/constants'
import type { LegalDocType } from '@/lib/legal/types'
import { LEGAL_DOC_LABELS, LEGAL_LOCALE_LABELS } from '@/lib/legal/doc-metadata'

export const dynamic = 'force-dynamic'

export default async function LegalAdminHubPage() {
  const [docsResult, draftsResult, auditResult, consentResult] = await Promise.all([
    listLegalDocuments({ scope: 'global', activeOnly: true }),
    listLegalDrafts({ scope: 'global' }),
    listLegalAuditEvents({ scope: 'global', limit: 12 }),
    getCookieConsentOverview(),
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

  const drafts = draftsResult.success ? draftsResult.data : []
  const auditEvents = auditResult.success ? auditResult.data : []
  const activeDocs = docsResult.data
  const draftIndex = new Set(drafts.map((draft) => `${draft.type}:${draft.locale}`))

  const impactResult = activeDocs.length
    ? await getLegalAcceptanceImpact(activeDocs.map((doc) => doc.id))
    : { success: true, data: { totalUsers: 0, documentStats: {} } }

  const impact = impactResult.success ? impactResult.data : { totalUsers: 0, documentStats: {} as Record<string, { acceptedCount: number; pendingCount: number }> }
  const totalPending = Object.values(impact.documentStats).reduce<number>((sum, doc) => sum + (doc as { pendingCount: number }).pendingCount, 0)
  const consentOverview = consentResult.success ? consentResult.data : null

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'System', href: '/admin/settings' },
          { label: 'Legal' },
        ]}
      />

      <AdminPageHeader
        title="Legal hub"
        description="Manage global legal documents, drafts, and acceptance impact."
        icon={<ShieldCheckIcon className="h-6 w-6" />}
      />

      <AdminStatGrid cols={4} className="mb-8">
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
          label="Total users"
          value={impact.totalUsers}
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Pending acceptances"
          value={totalPending}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
        />
      </AdminStatGrid>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Cookie consent overview</h2>
        {consentOverview ? (
          <AdminStatGrid cols={4}>
            {Object.entries(consentOverview.optedIn).map(([category, count]) => {
              const percent = consentOverview.totalUsers > 0
                ? Math.round((count / consentOverview.totalUsers) * 100)
                : 0
              return (
                <AdminStatCard
                  key={category}
                  label={category}
                  value={`${count}`}
                  icon={<ChartBarIcon className="h-5 w-5" />}
                  subtitle={`${percent}% of users`}
                  iconColor={percent >= 75 ? 'green' : percent >= 50 ? 'amber' : 'red'}
                />
              )
            })}
          </AdminStatGrid>
        ) : (
          <p className="text-sm text-muted-foreground">Consent stats are not available yet.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active documents</h2>
        {activeDocs.length === 0 ? (
          <AdminEmptyState
            icon={<DocumentTextIcon className="h-10 w-10" />}
            title="No active legal documents"
            description="Publish your first legal document to get started."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Locale</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Acceptance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeDocs.map((doc) => {
                  const docStats = (impact.documentStats as Record<string, { acceptedCount: number; pendingCount: number }>)[doc.id]
                  const acceptanceLabel = docStats
                    ? `${docStats.acceptedCount}/${impact.totalUsers}`
                    : 'N/A'
                  return (
                    <tr key={doc.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{LEGAL_DOC_LABELS[doc.type as LegalDocType]}</div>
                        <div className="text-xs text-muted-foreground">{doc.title}</div>
                      </td>
                      <td className="px-4 py-3">{LEGAL_LOCALE_LABELS[doc.locale]}</td>
                      <td className="px-4 py-3">v{doc.version_int}</td>
                      <td className="px-4 py-3">{acceptanceLabel}</td>
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
                          href={`/admin/legal/${doc.type}`}
                          className="text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
                    href={`/admin/legal/${draft.type}`}
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
          {GLOBAL_LEGAL_TYPES.map((type) => (
            <Link
              key={type}
              href={`/admin/legal/${type}`}
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
