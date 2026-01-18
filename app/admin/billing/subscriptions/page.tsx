'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminDataTable,
  AdminTableToolbar,
  AdminPagination,
} from '@/components/admin/shared';
import { Button, Badge, EmptyState } from '@/components/ui';
import {
  CreditCardIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';

type SubscriptionStatus = 'trial' | 'active' | 'paused' | 'canceled';

interface BillingProduct {
  id: string;
  name: string;
  price_per_seat: number;
  currency: string;
  seats_included: number | null;
}

interface Subscription {
  id: string;
  tenant_id: string;
  billing_product_id: string;
  seats_purchased: number;
  start_date: string;
  renewal_date: string | null;
  status: SubscriptionStatus;
  billing_product?: BillingProduct | null;
}

interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  paused: number;
  canceled: number;
  mrr: number;
}

type StatusFilter = 'all' | SubscriptionStatus;

const statusConfig: Record<SubscriptionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active: { variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  trial: { variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  canceled: { variant: 'destructive', icon: <XCircleIcon className="h-4 w-4" /> },
  paused: { variant: 'outline', icon: <PauseCircleIcon className="h-4 w-4" /> },
};

export default function SubscriptionsPage() {
  const t = useTranslations('admin.billing.subscriptions');
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const tenantId = currentTenant?.id;

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const calculateStats = useMemo(
    () => (list: Subscription[]): SubscriptionStats => {
      const active = list.filter((s) => s.status === 'active');
      const mrr = active.reduce((sum, s) => {
        const seatPrice = s.billing_product?.price_per_seat ?? 0;
        const seats = s.seats_purchased || s.billing_product?.seats_included || 0;
        return sum + seatPrice * seats;
      }, 0);

      return {
        total: list.length,
        active: active.length,
        trial: list.filter((s) => s.status === 'trial').length,
        paused: list.filter((s) => s.status === 'paused').length,
        canceled: list.filter((s) => s.status === 'canceled').length,
        mrr,
      };
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      if (!tenantId) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/billing/tenants/${tenantId}/subscription`);
        if (!res.ok) throw new Error('Failed to load subscription');
        const json = await res.json();
        const sub: Subscription | null = json.subscription ?? null;
        const list = sub ? [sub] : [];
        setSubscriptions(list);
        setStats(calculateStats(list));
      } catch (err) {
        console.error('Error loading subscriptions:', err);
        setLoadError('Kunde inte ladda prenumerationer');
        setSubscriptions([]);
        setStats({ total: 0, active: 0, trial: 0, paused: 0, canceled: 0, mrr: 0 });
      }
      setIsLoading(false);
    };

    loadData();
  }, [tenantId, calculateStats]);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (searchQuery && !(sub.billing_product?.name || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(Math.ceil(filteredSubscriptions.length / itemsPerPage), 1);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Table columns
  const columns = [
    {
      header: t('table.organization'),
      accessor: (row: Subscription) => (
        <div>
          <p className="font-medium text-foreground">{row.billing_product?.name || t('table.missingPlan')}</p>
          <p className="text-xs text-muted-foreground">{t('table.seatsLabel', { count: row.seats_purchased })}</p>
        </div>
      ),
    },
    {
      header: t('table.status'),
      accessor: (row: Subscription) => {
        const config = statusConfig[row.status];
        return (
          <Badge variant={config.variant} size="sm" className="gap-1">
            {config.icon}
            {t(`status.${row.status}`)}
          </Badge>
        );
      },
    },
    {
      header: t('table.amount'),
      accessor: (row: Subscription) => (
        <span className="font-medium">
          {row.billing_product?.price_per_seat
            ? t('table.amountPerMonth', {
                amount: (row.billing_product.price_per_seat * row.seats_purchased).toLocaleString('sv-SE'),
                currency: row.billing_product.currency,
              })
            : t('table.emptyValue')}
        </span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: t('table.renews'),
      accessor: (row: Subscription) => (
        <span className={row.status === 'canceled' ? 'text-red-600' : ''}>
          {row.renewal_date ? new Date(row.renewal_date).toLocaleDateString('sv-SE') : t('table.emptyValue')}
        </span>
      ),
      hideBelow: 'md' as const,
    },
  ];

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">{t('notLoggedIn')}</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<CreditCardIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.billing'), href: '/admin/billing' },
          { label: t('breadcrumbs.subscriptions') },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/billing')} className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('back')}
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label={t('stats.total')}
          value={stats?.total ?? 0}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.active')}
          value={stats?.active ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.trial')}
          value={stats?.trial ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.mrr')}
          value={stats ? `${stats.mrr.toLocaleString('sv-SE')} ${subscriptions[0]?.billing_product?.currency || 'SEK'}` : '-'}
          icon={<span className="text-base">💰</span>}
          iconColor="blue"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filters */}
      <AdminTableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('search')}
        className="mb-4"
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">{t('filter.all')}</option>
            <option value="active">{t('filter.active')}</option>
            <option value="trial">{t('filter.trial')}</option>
            <option value="paused">{t('filter.paused')}</option>
            <option value="canceled">{t('filter.canceled')}</option>
          </select>
        }
      />

      {/* Table */}
      <AdminDataTable
        data={paginatedSubscriptions}
        columns={columns}
        keyAccessor="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<CreditCardIcon className="h-8 w-8" />}
            title={t('emptyTitle')}
            description={loadError ? loadError : searchQuery ? t('noResultsFor', { query: searchQuery }) : t('emptyDescription')}
            action={searchQuery ? { label: t('clearSearch'), onClick: () => setSearchQuery('') } : undefined}
          />
        }
        className="mb-4"
      />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredSubscriptions.length}
        itemsPerPage={itemsPerPage}
      />
    </AdminPageLayout>
  );
}
