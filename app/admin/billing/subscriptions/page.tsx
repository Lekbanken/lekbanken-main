'use client';

import { useEffect, useMemo, useState } from 'react';
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

const statusConfig: Record<SubscriptionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active: { label: 'Aktiv', variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  trial: { label: 'Testperiod', variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  canceled: { label: 'Avslutad', variant: 'destructive', icon: <XCircleIcon className="h-4 w-4" /> },
  paused: { label: 'Pausad', variant: 'outline', icon: <PauseCircleIcon className="h-4 w-4" /> },
};

export default function SubscriptionsPage() {
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
      header: 'Organisation',
      accessor: (row: Subscription) => (
        <div>
          <p className="font-medium text-foreground">{row.billing_product?.name || 'Plan saknas'}</p>
          <p className="text-xs text-muted-foreground">Seats: {row.seats_purchased}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Subscription) => {
        const config = statusConfig[row.status];
        return (
          <Badge variant={config.variant} size="sm" className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: 'Belopp',
      accessor: (row: Subscription) => (
        <span className="font-medium">
          {row.billing_product?.price_per_seat
            ? `${(row.billing_product.price_per_seat * row.seats_purchased).toLocaleString('sv-SE')} ${row.billing_product.currency}/mån`
            : '—'}
        </span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: 'Förnyas',
      accessor: (row: Subscription) => (
        <span className={row.status === 'canceled' ? 'text-red-600' : ''}>
          {row.renewal_date ? new Date(row.renewal_date).toLocaleDateString('sv-SE') : '—'}
        </span>
      ),
      hideBelow: 'md' as const,
    },
  ];

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Prenumerationer"
        description="Hantera aktiva prenumerationer och abonnemang"
        icon={<CreditCardIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Fakturering', href: '/admin/billing' },
          { label: 'Prenumerationer' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/billing')} className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt"
          value={stats?.total ?? 0}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Aktiva"
          value={stats?.active ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Testperiod"
          value={stats?.trial ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="MRR"
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
        searchPlaceholder="Sök organisation..."
        className="mb-4"
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Alla statusar</option>
            <option value="active">Aktiva</option>
            <option value="trial">Testperiod</option>
            <option value="paused">Pausade</option>
            <option value="canceled">Avslutade</option>
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
            title="Inga prenumerationer"
            description={loadError ? loadError : searchQuery ? `Inga resultat för "${searchQuery}"` : 'Det finns inga prenumerationer att visa.'}
            action={searchQuery ? { label: 'Rensa sökning', onClick: () => setSearchQuery('') } : undefined}
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
