import { Suspense } from 'react';
import { listAchievements, listTenantsForSelector } from '@/app/actions/achievements-admin';
import { AchievementsAdminClient } from './AchievementsAdminClient';
import { AdminPageLayout, AdminPageHeader } from '@/components/admin/shared';

export const metadata = {
  title: 'Achievements | Admin',
  description: 'Hantera achievements och tilldela till användare',
};

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

function LoadingFallback() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Achievements"
        description="Hantera achievements och tilldela till användare"
      />
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Laddar achievements...</p>
        </div>
      </div>
    </AdminPageLayout>
  );
}

export default function AchievementsAdminPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AchievementsContent />
    </Suspense>
  );
}
