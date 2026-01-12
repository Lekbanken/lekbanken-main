import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin as checkSystemAdmin } from '@/lib/utils/tenantAuth';
import {
  listShopItems,
  getShopItemStats,
  getTenantCurrencies,
  getUserAdminTenants,
  type TenantOption,
} from '@/app/actions/shop-rewards-admin';
import { ShopRewardsAdminClient } from './ShopRewardsAdminClient';
import { AdminPageLayout, AdminPageHeader, AdminBreadcrumbs } from '@/components/admin/shared';

export const metadata = {
  title: 'Shop & Rewards | Admin',
  description: 'Hantera butik och belöningar för organisationer',
};

interface SearchParams {
  tenant?: string;
}

// ============================================
// TENANT SELECTOR (for when no tenant is selected)
// ============================================

async function TenantSelector({ tenants }: { tenants: TenantOption[] }) {
  const t = await getTranslations('admin.gamification.shopRewards');

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.gamification'), href: '/admin/gamification' },
          { label: t('breadcrumbs.shopRewards') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('tenantSelector.description')}
      />

      <div className="mt-8 max-w-xl mx-auto">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">{t('tenantSelector.title')}</h2>
          
          {tenants.length === 0 ? (
            <p className="text-muted-foreground">
              {t('tenantSelector.noAccess')}
            </p>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <a
                  key={tenant.id}
                  href={`/admin/gamification/shop-rewards?tenant=${tenant.id}`}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    {tenant.slug && (
                      <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}

// ============================================
// SHOP CONTENT (when tenant is selected)
// ============================================

async function ShopContent({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  // Fetch initial data in parallel
  const [itemsResult, stats, currencies] = await Promise.all([
    listShopItems(tenantId, { page: 1, pageSize: 20 }),
    getShopItemStats(tenantId),
    getTenantCurrencies(tenantId),
  ]);

  const initialData = {
    items: itemsResult.data,
    totalCount: itemsResult.totalCount,
    totalPages: itemsResult.totalPages,
  };

  return (
    <ShopRewardsAdminClient
      tenantId={tenantId}
      tenantName={tenantName}
      initialData={initialData}
      initialStats={stats}
      currencies={currencies}
    />
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

async function LoadingFallback() {
  const t = await getTranslations('admin.gamification.shopRewards');

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.gamification'), href: '/admin/gamification' },
          { label: t('breadcrumbs.shopRewards') },
        ]}
      />
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription', { tenantName: '' })}
      />
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    </AdminPageLayout>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default async function ShopRewardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations('admin.gamification.shopRewards');
  const params = await searchParams;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const isSystemAdmin = checkSystemAdmin(user);

  // Get tenants the user has access to
  const { tenants } = await getUserAdminTenants();

  // Get tenant ID from query param or from user's primary tenant
  let tenantId = params.tenant;
  let tenantName = '';

  if (tenantId) {
    // Validate user has access to this tenant
    const tenant = tenants.find((tn) => tn.id === tenantId);
    if (!tenant && !isSystemAdmin) {
      // User doesn't have access to this tenant
      redirect('/admin/gamification/shop-rewards');
    }
    // For system admin, fetch tenant name if not in list
    if (isSystemAdmin && !tenant) {
      const { data: tn } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
      tenantName = tn?.name || t('unknownTenant');
    } else {
      tenantName = tenant?.name || t('unknownTenant');
    }
  } else if (tenants.length === 1) {
    // Auto-select if user only has one tenant
    tenantId = tenants[0].id;
    tenantName = tenants[0].name;
  }

  // If no tenant selected and user has multiple tenants, show selector
  if (!tenantId) {
    return <TenantSelector tenants={tenants} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ShopContent tenantId={tenantId} tenantName={tenantName} />
    </Suspense>
  );
}
