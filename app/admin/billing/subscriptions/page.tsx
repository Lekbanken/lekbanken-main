'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
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

// Types
interface Subscription {
  id: string;
  organisationId: string;
  organisationName: string;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionStats {
  total: number;
  active: number;
  trialing: number;
  cancelled: number;
  mrr: number;
}

type StatusFilter = 'all' | 'active' | 'trialing' | 'cancelled' | 'past_due' | 'paused';

// Mock data generator
function generateMockSubscriptions(): Subscription[] {
  const orgs = [
    'Stockholms Skolor', 'Göteborgs Fritid', 'Malmö Förskolor', 'Uppsala Kommun',
    'Lunds Aktiviteter', 'Västerås Barn', 'Örebro Fritid', 'Linköpings Skolor',
    'Helsingborgs Skolor', 'Norrköpings Kommun', 'Jönköpings Fritid', 'Umeå Skolor',
  ];

  const plans = ['Basic', 'Pro', 'Enterprise'];
  const amounts = [990, 2490, 4990];
  const statuses: Subscription['status'][] = ['active', 'active', 'active', 'trialing', 'cancelled', 'past_due'];

  return orgs.map((org, i) => {
    const planIndex = i % 3;
    const status = statuses[i % statuses.length];
    const periodStart = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: `sub-${i}`,
      organisationId: `org-${i}`,
      organisationName: org,
      plan: plans[planIndex],
      status,
      amount: amounts[planIndex],
      currency: 'SEK',
      interval: 'month',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: status === 'cancelled',
    };
  });
}

function calculateStats(subscriptions: Subscription[]): SubscriptionStats {
  const active = subscriptions.filter(s => s.status === 'active');
  return {
    total: subscriptions.length,
    active: active.length,
    trialing: subscriptions.filter(s => s.status === 'trialing').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
    mrr: active.reduce((sum, s) => sum + s.amount, 0),
  };
}

const statusConfig: Record<Subscription['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active: { label: 'Aktiv', variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  trialing: { label: 'Testperiod', variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  cancelled: { label: 'Avslutad', variant: 'destructive', icon: <XCircleIcon className="h-4 w-4" /> },
  past_due: { label: 'Förfallen', variant: 'destructive', icon: <XCircleIcon className="h-4 w-4" /> },
  paused: { label: 'Pausad', variant: 'outline', icon: <PauseCircleIcon className="h-4 w-4" /> },
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Try to load from Supabase
      try {
        if (currentTenant) {
          const { data } = await supabase
            .from('subscriptions')
            .select('*, tenants(name)')
            .eq('tenant_id', currentTenant.id)
            .limit(50);

          if (data && data.length > 0) {
            // Map real data if available
            console.log('Loaded subscriptions from Supabase:', data.length);
          }
        }
      } catch (err) {
        console.error('Error loading subscriptions:', err);
      }

      // Fall back to mock data
      const mockData = generateMockSubscriptions();
      setSubscriptions(mockData);
      setStats(calculateStats(mockData));
      setIsLoading(false);
    };

    loadData();
  }, [currentTenant]);

  // Filter data
  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (searchQuery && !sub.organisationName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
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
          <p className="font-medium text-foreground">{row.organisationName}</p>
          <p className="text-xs text-muted-foreground">Plan: {row.plan}</p>
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
          {row.amount.toLocaleString('sv-SE')} {row.currency}/{row.interval === 'month' ? 'mån' : 'år'}
        </span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: 'Nästa faktura',
      accessor: (row: Subscription) => (
        <span className={row.cancelAtPeriodEnd ? 'text-red-600' : ''}>
          {row.cancelAtPeriodEnd ? 'Avslutas ' : ''}
          {new Date(row.currentPeriodEnd).toLocaleDateString('sv-SE')}
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
          value={stats?.trialing ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="MRR"
          value={stats ? `${stats.mrr.toLocaleString('sv-SE')} SEK` : '-'}
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
            <option value="trialing">Testperiod</option>
            <option value="past_due">Förfallna</option>
            <option value="cancelled">Avslutade</option>
            <option value="paused">Pausade</option>
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
            description={searchQuery ? `Inga resultat för "${searchQuery}"` : 'Det finns inga prenumerationer att visa.'}
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
