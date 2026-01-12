import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { getTranslations } from 'next-intl/server';
import { RssIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function WebhooksPage() {
  await requireSystemAdmin('/admin')
  const t = await getTranslations('admin.webhooks');
  
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<RssIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<RssIcon className="h-6 w-6" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    </AdminPageLayout>
  );
}
