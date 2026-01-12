import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import { AdminPageHeader, AdminPageLayout, AdminBreadcrumbs } from '@/components/admin/shared';
import { Card } from '@/components/ui/card';
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { TOOL_REGISTRY } from '@/features/tools/registry';

export default async function ToolsAdminPage() {
  await requireSystemAdmin('/admin');
  const t = await getTranslations('admin.tools');

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: t('breadcrumbHome'), href: '/admin' }, { label: t('breadcrumbTitle') }]} />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<WrenchScrewdriverIcon className="h-8 w-8 text-primary" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOL_REGISTRY.map((tool) => (
          <Card key={tool.key} className="p-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">{tool.name}</div>
              <div className="text-sm text-muted-foreground">{tool.description}</div>
              <div className="pt-2 text-xs text-muted-foreground">
                Key: <span className="font-mono">{tool.key}</span> • Default scope:{' '}
                <span className="font-mono">{tool.defaultScope}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AdminPageLayout>
  );
}
