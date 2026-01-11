/**
 * Content Translations Hub
 * 
 * Admin page for managing content translations across domains:
 * - Learning courses & paths
 * - Achievements
 * - Shop items
 * - Notification templates
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminStatCard, AdminStatGrid } from '@/components/admin/shared/AdminStatCard';
import { getContentTranslationCoverage } from '@/features/admin/translations/content-api.server';
import {
  CONTENT_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type ContentDomain,
  type ContentTranslationCoverage,
} from '@/features/admin/translations/content-types';
import {
  AcademicCapIcon,
  TrophyIcon,
  ShoppingBagIcon,
  BellIcon,
  MapIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export const metadata = {
  title: 'Content Translations | Admin',
  description: 'Manage translations for dynamic content across domains',
};

const domainIcons: Record<ContentDomain, React.ReactNode> = {
  learning_courses: <AcademicCapIcon className="h-5 w-5" />,
  learning_paths: <MapIcon className="h-5 w-5" />,
  achievements: <TrophyIcon className="h-5 w-5" />,
  shop_items: <ShoppingBagIcon className="h-5 w-5" />,
  notification_templates: <BellIcon className="h-5 w-5" />,
};

function getCompletionColor(percent: number): string {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 75) return 'text-blue-600';
  if (percent >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function getProgressBarColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 75) return 'bg-blue-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

interface DomainLabels {
  domainLabels: Record<ContentDomain, string>;
  manage: string;
  object: string;
  fullyTranslated: string;
  languagesMissing: string;
}

// Coverage card for a single domain
function DomainCoverageCard({ coverage, labels }: { coverage: ContentTranslationCoverage; labels: DomainLabels }) {
  const totalMissing = Object.values(coverage.percentPerLocale).filter(p => p < 100).length;
  
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
            {domainIcons[coverage.domain]}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{labels.domainLabels[coverage.domain]}</h3>
            <p className="text-sm text-muted-foreground">
              {coverage.totalItems} {labels.object}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/translations/content/${coverage.domain}`}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {labels.manage}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
      
      {/* Locale progress bars */}
      <div className="mt-4 space-y-3">
        {CONTENT_LOCALES.map((locale) => (
          <div key={locale}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5">
                <span>{LOCALE_FLAGS[locale]}</span>
                <span className="text-muted-foreground">{LOCALE_LABELS[locale]}</span>
              </span>
              <span className={`font-medium ${getCompletionColor(coverage.percentPerLocale[locale])}`}>
                {coverage.translatedPerLocale[locale]}/{coverage.totalItems}
                {' '}
                ({coverage.percentPerLocale[locale]}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressBarColor(coverage.percentPerLocale[locale])}`}
                style={{ width: `${coverage.percentPerLocale[locale]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Status badge */}
      <div className="mt-4 pt-4 border-t border-border">
        {totalMissing === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircleIcon className="h-4 w-4" />
            <span>{labels.fullyTranslated}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>{totalMissing} {labels.languagesMissing}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsLabels {
  totalContent: string;
  translatableObjects: string;
  translations: string;
  ofPossible: string;
  coverageRate: string;
  totalAverage: string;
  needsWork: string;
  domainsBelow50: string;
}

// Overall stats summary
function OverallStats({ coverages, labels }: { coverages: ContentTranslationCoverage[]; labels: StatsLabels }) {
  const totalItems = coverages.reduce((sum, c) => sum + c.totalItems, 0);
  const totalTranslated = coverages.reduce((sum, c) => 
    sum + Object.values(c.translatedPerLocale).reduce((a, b) => a + b, 0), 0
  );
  const expectedTranslations = totalItems * CONTENT_LOCALES.length;
  const overallPercent = expectedTranslations > 0 
    ? Math.round((totalTranslated / expectedTranslations) * 100) 
    : 0;
  
  const needsWork = coverages.filter(c =>
    Object.values(c.percentPerLocale).some(p => p < 50)
  ).length;
  
  return (
    <AdminStatGrid cols={4}>
      <AdminStatCard
        label={labels.totalContent}
        value={totalItems.toLocaleString()}
        icon={<AcademicCapIcon className="h-5 w-5" />}
        subtitle={labels.translatableObjects}
        iconColor="blue"
      />
      <AdminStatCard
        label={labels.translations}
        value={totalTranslated.toLocaleString()}
        icon={<CheckCircleIcon className="h-5 w-5" />}
        subtitle={labels.ofPossible.replace('{count}', expectedTranslations.toString())}
        iconColor="green"
      />
      <AdminStatCard
        label={labels.coverageRate}
        value={`${overallPercent}%`}
        icon={<TrophyIcon className="h-5 w-5" />}
        subtitle={labels.totalAverage}
        iconColor={overallPercent >= 75 ? 'green' : overallPercent >= 50 ? 'amber' : 'red'}
      />
      <AdminStatCard
        label={labels.needsWork}
        value={needsWork}
        icon={<ExclamationTriangleIcon className="h-5 w-5" />}
        subtitle={labels.domainsBelow50}
        iconColor={needsWork > 0 ? 'amber' : 'green'}
      />
    </AdminStatGrid>
  );
}

interface DashboardLabels {
  domainLabels: Record<ContentDomain, string>;
  statsLabels: StatsLabels;
  domainCardLabels: DomainLabels;
  contentDomains: string;
  quickActions: string;
  backToUiTranslations: string;
  systemStringsMessages: string;
  translateAchievements: string;
  namesDescriptionsTips: string;
  translateCourses: string;
  courseContentMetadata: string;
}

async function ContentTranslationDashboard({ labels }: { labels: DashboardLabels }) {
  const coverages = await getContentTranslationCoverage();
  
  return (
    <div className="space-y-8">
      {/* Overall stats */}
      <OverallStats coverages={coverages} labels={labels.statsLabels} />
      
      {/* Domain cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{labels.contentDomains}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coverages.map((coverage) => (
            <DomainCoverageCard key={coverage.domain} coverage={coverage} labels={labels.domainCardLabels} />
          ))}
        </div>
      </section>
      
      {/* Quick links */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{labels.quickActions}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/translations"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <ArrowRightIcon className="h-5 w-5 rotate-180" />
            </div>
            <div>
              <p className="font-medium text-foreground">{labels.backToUiTranslations}</p>
              <p className="text-sm text-muted-foreground">{labels.systemStringsMessages}</p>
            </div>
          </Link>
          
          <Link
            href="/admin/translations/content/achievements"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <TrophyIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">{labels.translateAchievements}</p>
              <p className="text-sm text-muted-foreground">{labels.namesDescriptionsTips}</p>
            </div>
          </Link>
          
          <Link
            href="/admin/translations/content/learning_courses"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <AcademicCapIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">{labels.translateCourses}</p>
              <p className="text-sm text-muted-foreground">{labels.courseContentMetadata}</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default async function ContentTranslationsPage() {
  const t = await getTranslations('admin.translations');
  
  const domainLabels: Record<ContentDomain, string> = {
    learning_courses: t('domains.learningCourses'),
    learning_paths: t('domains.learningPaths'),
    achievements: t('domains.achievements'),
    shop_items: t('domains.shopItems'),
    notification_templates: t('domains.notificationTemplates'),
  };
  
  const statsLabels: StatsLabels = {
    totalContent: t('content.totalContent'),
    translatableObjects: t('content.title'),
    translations: t('content.translations'),
    ofPossible: t('content.ofPossible'),
    coverageRate: t('content.coverageRate'),
    totalAverage: t('content.title'),
    needsWork: t('content.needsWork'),
    domainsBelow50: t('content.domainsBelow50'),
  };
  
  const domainCardLabels: DomainLabels = {
    domainLabels,
    manage: t('content.translate'),
    object: t('content.title'),
    fullyTranslated: t('content.hasTranslation'),
    languagesMissing: t('content.missingTranslation'),
  };
  
  const dashboardLabels: DashboardLabels = {
    domainLabels,
    statsLabels,
    domainCardLabels,
    contentDomains: t('content.contentDomains'),
    quickActions: t('content.title'),
    backToUiTranslations: t('content.backToUiTranslations'),
    systemStringsMessages: t('content.systemStringsMessages'),
    translateAchievements: t('content.translateAchievements'),
    namesDescriptionsTips: t('content.namesDescriptionsTips'),
    translateCourses: t('content.translateCourses'),
    courseContentMetadata: t('content.courseContentMetadata'),
  };
  
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('content.title')}
        description={t('content.description')}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: t('title'), href: '/admin/translations' },
          { label: t('content.title') },
        ]}
      />
      
      <Suspense fallback={
        <div className="space-y-6">
          <AdminStatGrid cols={4}>
            {[1, 2, 3, 4].map((i) => (
              <AdminStatCard key={i} label="" value="" isLoading />
            ))}
          </AdminStatGrid>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        </div>
      }>
        <ContentTranslationDashboard labels={dashboardLabels} />
      </Suspense>
    </div>
  );
}
