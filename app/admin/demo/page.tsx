import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/skeleton';
import { DemoStatsCards, DemoSessionsTable, DemoConversionChart } from './components';

export async function generateMetadata() {
  const t = await getTranslations('admin.demo');
  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function AdminDemoPage() {
  const t = await getTranslations('admin.demo');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Stats Overview */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <DemoStatsCards />
      </Suspense>

      {/* Conversion Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <DemoConversionChart />
        </Suspense>
        
        {/* Quick Actions */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">{t('quickActions.title')}</h2>
          <div className="space-y-3">
            <a 
              href="/demo" 
              target="_blank"
              className="block p-3 rounded-md border hover:bg-muted transition-colors"
            >
              <div className="font-medium">{t('quickActions.testDemo')}</div>
              <div className="text-sm text-muted-foreground">{t('quickActions.testDemoDesc')}</div>
            </a>
            <a 
              href="/demo/upgrade" 
              target="_blank"
              className="block p-3 rounded-md border hover:bg-muted transition-colors"
            >
              <div className="font-medium">{t('quickActions.testUpgrade')}</div>
              <div className="text-sm text-muted-foreground">{t('quickActions.testUpgradeDesc')}</div>
            </a>
            <a 
              href="/docs/DEMO_SALES_GUIDE.md" 
              className="block p-3 rounded-md border hover:bg-muted transition-colors"
            >
              <div className="font-medium">{t('quickActions.salesGuide')}</div>
              <div className="text-sm text-muted-foreground">{t('quickActions.salesGuideDesc')}</div>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div>
        <h2 className="font-semibold mb-4">{t('recentSessions.title')}</h2>
        <Suspense fallback={<TableSkeleton />}>
          <DemoSessionsTable />
        </Suspense>
      </div>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <Skeleton className="h-8 w-full" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border-b last:border-b-0">
          <Skeleton className="h-6 w-full" />
        </div>
      ))}
    </div>
  );
}
