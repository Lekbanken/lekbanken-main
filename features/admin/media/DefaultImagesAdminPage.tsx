'use client'

import { useTranslations } from 'next-intl'
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard'
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared'
import { StandardImagesManager } from '@/features/admin/media/StandardImagesManager'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'

export function DefaultImagesAdminPage() {
  const t = useTranslations('admin.products')
  const tNav = useTranslations('admin.nav')
  const { can } = useRbac()

  const canView =
    can('admin.products.list') || can('admin.games.list') || can('admin.content.list')

  if (!canView) {
    return (
      <SystemAdminClientGuard>
        <AdminPageLayout>
          <AdminEmptyState
            title={t('accessDenied')}
            description={t('noPermissionProducts')}
          />
        </AdminPageLayout>
      </SystemAdminClientGuard>
    )
  }

  return (
    <SystemAdminClientGuard>
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: t('breadcrumbs.admin'), href: '/admin' },
            { label: tNav('mediaFiles'), href: '/admin/media' },
            { label: t('defaultImages') },
          ]}
        />
        <AdminPageHeader
          title={t('defaultImages')}
          description={t('defaultImagesExplanation')}
        />

        <StandardImagesManager tenantId="system" />
      </AdminPageLayout>
    </SystemAdminClientGuard>
  )
}
