import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { getTranslations } from 'next-intl/server';
import { FlagIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function FeatureFlagsPage() {
  await requireSystemAdmin('/admin')
  const t = await getTranslations('admin.featureFlags');

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<FlagIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<FlagIcon className="h-6 w-6" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    </AdminPageLayout>
  );
}
