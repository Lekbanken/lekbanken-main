/**
 * Missing Translations Report Page
 * 
 * Shows all translation keys that are missing in one or more locales.
 */

import { Suspense } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
  AdminEmptyState,
} from '@/components/admin/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { getTranslationEntries } from '@/features/admin/translations/analysis';
import { getRelativeKey } from '@/features/admin/translations/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

type PageProps = {
  searchParams: Promise<{ locale?: Locale; namespace?: string }>;
};

export default async function MissingTranslationsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const filterLocale = searchParams.locale;
  const filterNamespace = searchParams.namespace;

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'System', href: '/admin/settings' },
          { label: 'Translations', href: '/admin/translations' },
          { label: 'Missing Keys' },
        ]}
      />

      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/translations">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <AdminPageHeader
        title="Missing Translations"
        description="Keys that need translations in one or more locales"
        icon={<ExclamationTriangleIcon className="h-6 w-6" />}
      />

      <Suspense fallback={<LoadingSkeleton />}>
        <MissingContent 
          filterLocale={filterLocale}
          filterNamespace={filterNamespace}
        />
      </Suspense>
    </AdminPageLayout>
  );
}

// =============================================================================
// CONTENT COMPONENT
// =============================================================================

async function MissingContent({
  filterLocale,
  filterNamespace,
}: {
  filterLocale?: Locale;
  filterNamespace?: string;
}) {
  const entries = await getTranslationEntries({
    missingOnly: true,
    locale: filterLocale,
    namespace: filterNamespace,
  });

  // Group by namespace
  const byNamespace: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const ns = entry.namespace;
    if (!byNamespace[ns]) {
      byNamespace[ns] = [];
    }
    byNamespace[ns].push(entry);
  }

  // Count missing per locale
  const missingPerLocale: Record<Locale, number> = {} as Record<Locale, number>;
  for (const locale of locales) {
    missingPerLocale[locale] = entries.filter(e => e.missingLocales.includes(locale)).length;
  }

  if (entries.length === 0) {
    return (
      <AdminEmptyState
        icon={<ExclamationTriangleIcon className="h-12 w-12" />}
        title="No missing translations"
        description="All translation keys have values in all supported locales. Great job!"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap items-center gap-4">
            <FunnelIcon className="h-5 w-5 text-muted-foreground" />
            <label className="text-sm font-medium">Filter by locale:</label>
            <div className="flex gap-2">
              <Link href="/admin/translations/missing">
                <Badge 
                  variant={!filterLocale ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  All ({entries.length})
                </Badge>
              </Link>
              {locales.map((locale) => (
                <Link key={locale} href={`/admin/translations/missing?locale=${locale}`}>
                  <Badge 
                    variant={filterLocale === locale ? 'default' : 'outline'}
                    className="cursor-pointer"
                  >
                    {localeNames[locale]} ({missingPerLocale[locale]})
                  </Badge>
                </Link>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-4">
        <Badge variant="destructive" className="text-base px-3 py-1">
          {entries.length} keys with missing translations
        </Badge>
        {Object.keys(byNamespace).map((ns) => (
          <Badge key={ns} variant="secondary" className="text-base px-3 py-1">
            {ns}: {byNamespace[ns].length}
          </Badge>
        ))}
      </div>

      {/* Missing Keys by Namespace */}
      {Object.entries(byNamespace).map(([namespace, namespaceEntries]) => (
        <Card key={namespace}>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{namespace}</span>
                <Badge variant="destructive">{namespaceEntries.length} missing</Badge>
              </div>
              <Link
                href={`/admin/translations/${namespace}?missing=true`}
                className="text-sm text-primary hover:underline"
              >
                Edit namespace
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-sm font-medium">Key</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Missing In</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Available Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {namespaceEntries.slice(0, 20).map((entry) => (
                    <MissingKeyRow key={entry.key} entry={entry} />
                  ))}
                  {namespaceEntries.length > 20 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-center text-sm text-muted-foreground">
                        And {namespaceEntries.length - 20} more...{' '}
                        <Link
                          href={`/admin/translations/${namespace}?missing=true`}
                          className="text-primary hover:underline"
                        >
                          View all
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MissingKeyRow({
  entry,
}: {
  entry: {
    key: string;
    values: Record<Locale, string | null>;
    missingLocales: Locale[];
  };
}) {
  // Find first available value for reference
  const availableLocale = locales.find(l => entry.values[l]);
  const availableValue = availableLocale ? entry.values[availableLocale] : null;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {getRelativeKey(entry.key)}
        </code>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          {entry.missingLocales.map((locale) => (
            <Badge key={locale} variant="destructive" className="text-xs">
              {localeNames[locale]}
            </Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-2">
        {availableValue ? (
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">[{availableLocale}]</span>{' '}
            <span className="line-clamp-1">{availableValue}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm italic">No values</span>
        )}
      </td>
    </tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-lg bg-muted" />
      <div className="h-10 w-64 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
