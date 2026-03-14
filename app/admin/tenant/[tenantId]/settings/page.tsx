'use client';

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";
import { DemoFeatureGate } from '@/components/demo/DemoFeatureGate';

export default function TenantSettingsPage() {
  const t = useTranslations('admin.tenant.settings');

  return (
    <DemoFeatureGate feature="modify_tenant_settings">
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<Cog6ToothIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<Cog6ToothIcon className="h-6 w-6" />}
        title={t('comingSoon.title')}
        description={t('comingSoon.description')}
      />
    </AdminPageLayout>
    </DemoFeatureGate>
  );
}
