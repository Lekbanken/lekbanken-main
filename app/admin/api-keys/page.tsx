import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { getTranslations } from 'next-intl/server';
import { KeyIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function ApiKeysPage() {
  await requireSystemAdmin('/admin')
  const t = await getTranslations('admin.apiKeys');

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<KeyIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<KeyIcon className="h-6 w-6" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    </AdminPageLayout>
  );
}
