/**
 * Namespace Translation Editor Page
 * 
 * View and search translations for a specific namespace.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import {
  LanguageIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { 
  getTranslationEntries, 
  getNamespaces,
} from '@/features/admin/translations/analysis';
import { 
  getRelativeKey,
} from '@/features/admin/translations/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

type PageProps = {
  params: Promise<{ namespace: string }>;
  searchParams: Promise<{ search?: string; missing?: string }>;
};

export default async function NamespaceEditorPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { namespace } = params;
  
  // Validate namespace exists
  const namespaces = await getNamespaces();
  if (!namespaces.includes(namespace)) {
    notFound();
  }

  const search = searchParams.search ?? '';
  const missingOnly = searchParams.missing === 'true';

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'System', href: '/admin/settings' },
          { label: 'Translations', href: '/admin/translations' },
          { label: namespace },
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
        title={`${namespace} translations`}
        description={`View and manage translations in the ${namespace} namespace`}
        icon={<LanguageIcon className="h-6 w-6" />}
      />

      <Suspense fallback={<LoadingSkeleton />}>
        <NamespaceContent 
          namespace={namespace} 
          search={search}
          missingOnly={missingOnly}
        />
      </Suspense>
    </AdminPageLayout>
  );
}

// =============================================================================
// CONTENT COMPONENT
// =============================================================================

async function NamespaceContent({
  namespace,
  search,
  missingOnly,
}: {
  namespace: string;
  search: string;
  missingOnly: boolean;
}) {
  const entries = await getTranslationEntries({
    namespace,
    search: search || undefined,
    missingOnly,
  });

  const totalCount = entries.length;
  const missingCount = entries.filter(e => e.hasMissing).length;
  const completeCount = totalCount - missingCount;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="outline" className="gap-1">
          <LanguageIcon className="h-3 w-3" />
          {totalCount} keys
        </Badge>
        <Badge variant="default" className="gap-1">
          <CheckCircleIcon className="h-3 w-3" />
          {completeCount} complete
        </Badge>
        {missingCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <ExclamationTriangleIcon className="h-3 w-3" />
            {missingCount} missing
          </Badge>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Search keys or values..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="missing"
                value="true"
                defaultChecked={missingOnly}
                className="rounded border-input"
              />
              Show missing only
            </label>
            <Button type="submit" size="sm">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Translation Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium w-1/4">Key</th>
                  {locales.map((locale) => (
                    <th key={locale} className="px-4 py-3 text-left text-sm font-medium">
                      {localeNames[locale]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={locales.length + 2} className="px-4 py-8 text-center text-muted-foreground">
                      No translations found matching your criteria
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <TranslationRow key={entry.key} entry={entry} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function TranslationRow({
  entry,
}: {
  entry: {
    key: string;
    values: Record<Locale, string | null>;
    hasMissing: boolean;
    missingLocales: Locale[];
  };
}) {
  const relativeKey = getRelativeKey(entry.key);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {relativeKey}
        </code>
      </td>
      {locales.map((locale) => {
        const value = entry.values[locale];
        const isMissing = !value;

        return (
          <td key={locale} className="px-4 py-3">
            {isMissing ? (
              <span className="text-sm text-muted-foreground italic flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                Missing
              </span>
            ) : (
              <span className="text-sm line-clamp-2" title={value}>
                {value}
              </span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-3 text-center">
        {entry.hasMissing ? (
          <Badge variant="destructive" className="text-xs">
            {entry.missingLocales.length} missing
          </Badge>
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
        )}
      </td>
    </tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 rounded bg-muted" />
      <div className="h-16 rounded-lg bg-muted" />
      <div className="h-96 rounded-lg bg-muted" />
    </div>
  );
}
