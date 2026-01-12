import { notFound } from 'next/navigation'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { AdminBreadcrumbs, AdminPageHeader, AdminPageLayout, AdminEmptyState } from '@/components/admin/shared'
import { LegalDocEditorClient } from '@/features/admin/legal/LegalDocEditorClient'
import { getLegalEditorSnapshot } from '@/app/actions/legal-admin'
import { GLOBAL_LEGAL_TYPES } from '@/lib/legal/constants'
import type { LegalDocType } from '@/lib/legal/types'
import { LEGAL_DOC_LABELS } from '@/lib/legal/doc-metadata'

export const dynamic = 'force-dynamic'

export default async function LegalDocumentEditorPage({
  params,
}: {
  params: { docType: string }
}) {
  const docType = params.docType as LegalDocType
  if (!(GLOBAL_LEGAL_TYPES as readonly string[]).includes(docType)) {
    notFound()
  }

  const snapshotResult = await getLegalEditorSnapshot({
    scope: 'global',
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

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'System', href: '/admin/settings' },
          { label: 'Legal', href: '/admin/legal' },
          { label: LEGAL_DOC_LABELS[docType] },
        ]}
      />

      <AdminPageHeader
        title={LEGAL_DOC_LABELS[docType]}
        description="Manage drafts, publish new versions, and review the active content."
        icon={<ShieldCheckIcon className="h-6 w-6" />}
      />

      <LegalDocEditorClient
        scope="global"
        docType={docType}
        docTypeLabel={LEGAL_DOC_LABELS[docType]}
        initialSnapshot={snapshotResult.data}
      />
    </AdminPageLayout>
  )
}
