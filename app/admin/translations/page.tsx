/**
 * Admin Translations Hub Page
 * 
 * Overview dashboard showing translation coverage across all locales and namespaces.
 */

import { Suspense } from 'react';
import {
  LanguageIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { getTranslationCoverage } from '@/features/admin/translations/analysis';
import { 
  getCompletionBadgeVariant,
  TRANSLATION_NAMESPACES,
} from '@/features/admin/translations/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// =============================================================================
// MAIN PAGE
// =============================================================================

export default async function TranslationsPage() {
  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'System', href: '/admin/settings' },
          { label: 'Translations' },
        ]}
      />

      <AdminPageHeader
        title="Translations"
        description="Manage system translations and view coverage statistics"
        icon={<LanguageIcon className="h-6 w-6" />}
      />

      <Suspense fallback={<LoadingSkeleton />}>
        <TranslationsDashboard />
      </Suspense>
    </AdminPageLayout>
  );
}

// =============================================================================
// DASHBOARD CONTENT
// =============================================================================

async function TranslationsDashboard() {
  const coverage = await getTranslationCoverage();

  return (
    <div className="space-y-8">
      {/* Overall Stats */}
      <AdminStatGrid cols={4}>
        <AdminStatCard
          label="Total Keys"
          value={coverage.totalKeys.toLocaleString()}
          icon={<LanguageIcon className="h-5 w-5" />}
          subtitle="Unique translation keys"
          iconColor="blue"
        />
        <AdminStatCard
          label="Namespaces"
          value={coverage.namespaces.length}
          icon={<GlobeAltIcon className="h-5 w-5" />}
          subtitle="Translation categories"
          iconColor="purple"
        />
        <AdminStatCard
          label="Missing Keys"
          value={coverage.keysWithMissing}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          subtitle="Keys with missing translations"
          iconColor={coverage.keysWithMissing > 0 ? 'amber' : 'green'}
        />
        <AdminStatCard
          label="Average Coverage"
          value={`${Math.round(Object.values(coverage.overallPercent).reduce((a, b) => a + b, 0) / locales.length)}%`}
          icon={<ChartBarIcon className="h-5 w-5" />}
          subtitle="Across all locales"
          iconColor="green"
        />
      </AdminStatGrid>

      {/* Locale Coverage Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Coverage by Locale</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {locales.map((locale) => (
            <LocaleCoverageCard
              key={locale}
              locale={locale}
              percent={coverage.overallPercent[locale]}
              missing={coverage.missingPerLocale[locale]}
              total={coverage.totalKeys}
            />
          ))}
        </div>
      </section>

      {/* Namespace Breakdown */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Coverage by Namespace</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Namespace</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Total Keys</th>
                    {locales.map((locale) => (
                      <th key={locale} className="px-4 py-3 text-center text-sm font-medium">
                        {localeNames[locale]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-medium">Missing</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coverage.namespaces.map((ns) => (
                    <NamespaceRow key={ns.namespace} stats={ns} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/admin/translations/missing"
            title="View Missing Keys"
            description="See all keys that are missing translations in one or more locales"
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            badge={coverage.keysWithMissing > 0 ? `${coverage.keysWithMissing} missing` : undefined}
            badgeVariant="destructive"
          />
          <QuickActionCard
            href="/admin/translations/common"
            title="Edit Common Strings"
            description="Shared UI elements, buttons, labels, and messages"
            icon={<LanguageIcon className="h-6 w-6" />}
          />
          <QuickActionCard
            href="/admin/translations/admin"
            title="Edit Admin Strings"
            description="Admin panel navigation and UI strings"
            icon={<GlobeAltIcon className="h-6 w-6" />}
          />
          <QuickActionCard
            href="/admin/legal"
            title="Legal Documents"
            description="Manage localized legal terms, privacy, and cookie policy"
            icon={<DocumentTextIcon className="h-6 w-6" />}
          />
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function LocaleCoverageCard({
  locale,
  percent,
  missing,
  total,
}: {
  locale: Locale;
  percent: number;
  missing: number;
  total: number;
}) {
  const translated = total - missing;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <LocaleFlag locale={locale} />
            {localeNames[locale]}
          </CardTitle>
          <Badge variant={getCompletionBadgeVariant(percent)}>
            {percent}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
          <div
            className={`h-full transition-all ${percent >= 95 ? 'bg-emerald-500' : percent >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            {translated.toLocaleString()} translated
          </span>
          {missing > 0 && (
            <span className="flex items-center gap-1">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
              {missing.toLocaleString()} missing
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NamespaceRow({ stats }: { stats: { namespace: string; totalKeys: number; completionPercent: Record<Locale, number>; missingCount: number } }) {
  const meta = TRANSLATION_NAMESPACES.find(n => n.id === stats.namespace);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <span className="font-medium">{stats.namespace}</span>
          {meta?.description && (
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        {stats.totalKeys}
      </td>
      {locales.map((locale) => (
        <td key={locale} className="px-4 py-3 text-center">
          <Badge 
            variant={getCompletionBadgeVariant(stats.completionPercent[locale])}
            className="min-w-[3rem]"
          >
            {stats.completionPercent[locale]}%
          </Badge>
        </td>
      ))}
      <td className="px-4 py-3 text-center">
        {stats.missingCount > 0 ? (
          <Badge variant="destructive">{stats.missingCount}</Badge>
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/translations/${stats.namespace}`}
          className="text-sm text-primary hover:underline"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
  badge,
  badgeVariant = 'secondary',
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{title}</h3>
                {badge && (
                  <Badge variant={badgeVariant} className="text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LocaleFlag({ locale }: { locale: Locale }) {
  const flags: Record<Locale, string> = {
    sv: '🇸🇪',
    en: '🇬🇧',
    no: '🇳🇴',
  };
  return <span className="text-lg">{flags[locale]}</span>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
