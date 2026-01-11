/**
 * Domain Content Translation Editor
 * 
 * Admin page for editing translations for a specific content domain.
 * Shows all items in the domain with their translation status.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import {
  getCoursesWithTranslations,
  getAchievementsWithTranslations,
  getShopItemsWithTranslations,
  getNotificationTemplatesWithTranslations,
} from '@/features/admin/translations/content-api.server';
import {
  type ContentDomain,
  type ContentLocale,
  CONTENT_LOCALES,
  LOCALE_FLAGS,
} from '@/features/admin/translations/content-types';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface PageProps {
  params: Promise<{ domain: string }>;
}

const VALID_DOMAINS: ContentDomain[] = [
  'learning_courses',
  'learning_paths',
  'achievements',
  'shop_items',
  'notification_templates',
];

function TranslationStatusBadge({ hasTranslation, readyLabel, missingLabel }: { hasTranslation: boolean; readyLabel: string; missingLabel: string }) {
  if (hasTranslation) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        <span>{readyLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <ExclamationTriangleIcon className="h-3.5 w-3.5" />
      <span>{missingLabel}</span>
    </span>
  );
}

interface TranslationTableProps<T extends { id: string; translations: Record<ContentLocale, unknown | null> }> {
  items: T[];
  getName: (item: T) => string;
  getSubtitle?: (item: T) => string | null;
  domain: ContentDomain;
  labels: {
    name: string;
    action: string;
    edit: string;
    noItemsInDomain: string;
    ready: string;
    missing: string;
  };
}

function TranslationTable<T extends { id: string; translations: Record<ContentLocale, unknown | null> }>({
  items,
  getName,
  getSubtitle,
  domain,
  labels,
}: TranslationTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{labels.noItemsInDomain}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left font-medium text-muted-foreground px-4 py-3">{labels.name}</th>
            {CONTENT_LOCALES.map((locale) => (
              <th key={locale} className="text-center font-medium text-muted-foreground px-3 py-3 w-24">
                <span className="flex items-center justify-center gap-1">
                  <span>{LOCALE_FLAGS[locale]}</span>
                  <span>{locale.toUpperCase()}</span>
                </span>
              </th>
            ))}
            <th className="text-right font-medium text-muted-foreground px-4 py-3 w-24">{labels.action}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{getName(item)}</p>
                  {getSubtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{getSubtitle(item)}</p>
                  )}
                </div>
              </td>
              {CONTENT_LOCALES.map((locale) => (
                <td key={locale} className="text-center px-3 py-3">
                  <TranslationStatusBadge 
                    hasTranslation={!!item.translations[locale]} 
                    readyLabel={labels.ready}
                    missingLabel={labels.missing}
                  />
                </td>
              ))}
              <td className="text-right px-4 py-3">
                <Link
                  href={`/admin/translations/content/${domain}/${item.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  {labels.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DomainContentProps {
  domain: ContentDomain;
  labels: {
    name: string;
    action: string;
    edit: string;
    noItemsInDomain: string;
    ready: string;
    missing: string;
    learningPathsComingSoon: string;
  };
}

async function DomainContent({ domain, labels }: DomainContentProps) {
  switch (domain) {
    case 'learning_courses': {
      const courses = await getCoursesWithTranslations();
      return (
        <TranslationTable
          items={courses}
          getName={(c) => c.title}
          getSubtitle={(c) => c.slug}
          domain={domain}
          labels={labels}
        />
      );
    }
    
    case 'achievements': {
      const achievements = await getAchievementsWithTranslations();
      return (
        <TranslationTable
          items={achievements}
          getName={(a) => a.name}
          getSubtitle={(a) => a.achievement_key ?? a.scope}
          domain={domain}
          labels={labels}
        />
      );
    }
    
    case 'shop_items': {
      const items = await getShopItemsWithTranslations();
      return (
        <TranslationTable
          items={items}
          getName={(i) => i.name}
          getSubtitle={(i) => i.category}
          domain={domain}
          labels={labels}
        />
      );
    }
    
    case 'notification_templates': {
      const templates = await getNotificationTemplatesWithTranslations();
      return (
        <TranslationTable
          items={templates}
          getName={(t) => t.name}
          getSubtitle={(t) => t.template_key}
          domain={domain}
          labels={labels}
        />
      );
    }
    
    case 'learning_paths': {
      return (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{labels.learningPathsComingSoon}</p>
        </div>
      );
    }
    
    default:
      return null;
  }
}

export default async function DomainTranslationPage({ params }: PageProps) {
  const t = await getTranslations('admin.translations');
  const { domain } = await params;
  
  if (!VALID_DOMAINS.includes(domain as ContentDomain)) {
    notFound();
  }
  
  const validDomain = domain as ContentDomain;
  
  const domainLabels: Record<ContentDomain, string> = {
    learning_courses: t('domains.learningCourses'),
    learning_paths: t('domains.learningPaths'),
    achievements: t('domains.achievements'),
    shop_items: t('domains.shopItems'),
    notification_templates: t('domains.notificationTemplates'),
  };
  
  const label = domainLabels[validDomain];
  
  const tableLabels = {
    name: t('missing.key'),
    action: t('missing.actions'),
    edit: t('content.translate'),
    noItemsInDomain: t('content.noItemsInDomain'),
    ready: t('content.ready'),
    missing: t('content.missing'),
    learningPathsComingSoon: t('content.learningPathsComingSoon'),
  };
  
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('content.translate') + ' ' + label}
        description={t('content.manageTranslations') + ' ' + label.toLowerCase()}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: t('title'), href: '/admin/translations' },
          { label: t('content.title'), href: '/admin/translations/content' },
          { label: label },
        ]}
      />
      
      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <TranslationStatusBadge hasTranslation readyLabel={tableLabels.ready} missingLabel={tableLabels.missing} />
          <span className="text-muted-foreground">= {t('content.hasTranslation')}</span>
        </div>
        <div className="flex items-center gap-2">
          <TranslationStatusBadge hasTranslation={false} readyLabel={tableLabels.ready} missingLabel={tableLabels.missing} />
          <span className="text-muted-foreground">= {t('content.missingTranslation')}</span>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="rounded-lg border border-border bg-card animate-pulse h-96" />
      }>
        <DomainContent domain={validDomain} labels={tableLabels} />
      </Suspense>
    </div>
  );
}
