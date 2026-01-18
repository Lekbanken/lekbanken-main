import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { getTranslations } from 'next-intl/server'
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function IncidentsPage() {
  await requireSystemAdmin('/admin')
  const t = await getTranslations('admin.incidents')
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<ExclamationTriangleIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<ExclamationTriangleIcon className="h-6 w-6" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    </AdminPageLayout>
  );
}
