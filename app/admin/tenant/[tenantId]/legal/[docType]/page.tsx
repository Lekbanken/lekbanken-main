import { notFound } from 'next/navigation'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { AdminBreadcrumbs, AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminErrorState } from '@/components/admin/shared'
import { LegalDocEditorClient } from '@/features/admin/legal/LegalDocEditorClient'
import { getLegalEditorSnapshot, getOrgLegalAcceptanceMap } from '@/app/actions/legal-admin'
import { TENANT_LEGAL_TYPES } from '@/lib/legal/constants'
import type { LegalDocType } from '@/lib/legal/types'
import { LEGAL_DOC_LABELS } from '@/lib/legal/doc-metadata'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

export default async function TenantLegalEditorPage({
  params,
}: {
  params: Promise<{ tenantId: string; docType: string }>
}) {
  const { tenantId, docType: rawDocType } = await params
  const docType = rawDocType as LegalDocType

  if (!tenantId) {
    notFound()
  }
  if (!(TENANT_LEGAL_TYPES as readonly string[]).includes(docType)) {
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

  const snapshotResult = await getLegalEditorSnapshot({
    scope: 'tenant',
    tenantId,
    type: docType,
  })

  if (!snapshotResult.success) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ShieldCheckIcon className="h-10 w-10" />}
          title="Unable to load document"
          description={snapshotResult.error}
        />
      </AdminPageLayout>
    )
  }

  const acceptanceResult = snapshotResult.data.activeDocs.length
    ? await getOrgLegalAcceptanceMap({
        tenantId,
        documentIds: snapshotResult.data.activeDocs.map((doc) => doc.id),
      })
    : { success: true, data: {} }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Organization', href: `/admin/tenant/${tenantId}` },
          { label: 'Legal', href: `/admin/tenant/${tenantId}/legal` },
          { label: LEGAL_DOC_LABELS[docType] },
        ]}
      />

      <AdminPageHeader
        title={LEGAL_DOC_LABELS[docType]}
        description="Manage drafts, publish new versions, and review the active content."
        icon={<ShieldCheckIcon className="h-6 w-6" />}
      />

      <LegalDocEditorClient
        scope="tenant"
        tenantId={tenantId}
        docType={docType}
        docTypeLabel={LEGAL_DOC_LABELS[docType]}
        initialSnapshot={snapshotResult.data}
        initialOrgAcceptance={acceptanceResult.success ? acceptanceResult.data : {}}
      />
    </AdminPageLayout>
  )
}
