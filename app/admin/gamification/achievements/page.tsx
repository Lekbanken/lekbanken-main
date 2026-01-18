import { Suspense } from 'react';
import { listAchievements, listTenantsForSelector } from '@/app/actions/achievements-admin';
import { AchievementsAdminClient } from './AchievementsAdminClient';
import { AdminPageLayout, AdminPageHeader } from '@/components/admin/shared';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('admin.gamification.achievements');
  return {
    title: `${t('pageTitle')} | Admin`,
    description: t('pageDescription'),
  };
}

async function AchievementsContent() {
  // Fetch initial data in parallel
  const [achievementsResult, tenantsResult] = await Promise.all([
    listAchievements({ page: 1, pageSize: 20 }),
    listTenantsForSelector(),
  ]);

  const initialData = {
    achievements: achievementsResult.data,
    totalCount: achievementsResult.totalCount,
    totalPages: achievementsResult.totalPages,
  };

  const tenants = tenantsResult.tenants ?? [];

  return (
    <AchievementsAdminClient
      initialData={initialData}
      tenants={tenants}
    />
  );
}

function LoadingFallback({ title, description, loadingLabel }: { title: string; description: string; loadingLabel: string }) {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={title}
        description={description}
      />
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{loadingLabel}</p>
        </div>
      </div>
    </AdminPageLayout>
  );
}

export default async function AchievementsAdminPage() {
  const t = await getTranslations('admin.gamification.achievements');
  return (
    <Suspense
      fallback={(
        <LoadingFallback
          title={t('pageTitle')}
          description={t('pageDescription')}
          loadingLabel={t('loading')}
        />
      )}
    >
      <AchievementsContent />
    </Suspense>
  );
}
