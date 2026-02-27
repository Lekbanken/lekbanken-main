'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminEmptyState,
  AdminErrorState,
} from '@/components/admin/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Input, Select } from '@/components/ui';
import {
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase/client';

type LicenseStatus = 'active' | 'expired' | 'trial' | 'suspended';
type StatusFilter = 'all' | LicenseStatus;

interface LicenseRow {
  id: string;
  organisationName: string;
  product: string;
  plan: string;
  status: LicenseStatus;
  seats: number;
  usedSeats: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  trial: number;
  totalSeats: number;
  usedSeats: number;
}

const statusConfig: Record<LicenseStatus, { labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active: { labelKey: 'status.active', variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  trial: { labelKey: 'status.trial', variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  expired: { labelKey: 'status.expired', variant: 'destructive', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  suspended: { labelKey: 'status.suspended', variant: 'outline', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
};

export default function LicensesPage() {
  const t = useTranslations('admin.licenses.legacy');
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const tenantId = currentTenant?.id;

  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // For system admin: show all tenants; for tenant admin: just current
        const { data, error: queryError } = await supabase
          .from('tenants')
          .select('id, name, subscription_tier, subscription_status, created_at')
          .limit(200);

        if (queryError) throw queryError;

        const tenants = data || [];

        // Fetch member counts per tenant to reflect actual usage
        const memberCounts = await Promise.all(
          tenants.map(async (t) => {
            const { count, error: countError } = await supabase
              .from('user_tenant_memberships')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', t.id);
            if (countError) {
              console.error('Error counting members for tenant', t.id, countError);
            }
            return { tenantId: t.id, count: count ?? 0 };
          })
        );

        const mapped: LicenseRow[] =
          tenants.map((t) => {
            const status = (t.subscription_status === 'active' ? 'active' : t.subscription_status === 'trial' ? 'trial' : 'expired') as LicenseStatus;
            const usedSeats = memberCounts.find((m) => m.tenantId === t.id)?.count ?? 0;
            const seats = Math.max(50, usedSeats); // TODO: replace with actual seat/quota field if available
            const startDate = t.created_at;
            const endDate = new Date(new Date(t.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
            return {
              id: t.id,
              organisationName: t.name || 'Okänd org',
              product: `Lekbanken ${t.subscription_tier || 'Basic'}`,
              plan: 'Årsvis',
              status,
              seats,
              usedSeats,
              startDate,
              endDate,
              autoRenew: status === 'active',
            };
          }) || [];

        const nextStats: LicenseStats = {
          total: mapped.length,
          active: mapped.filter((l) => l.status === 'active').length,
          expired: mapped.filter((l) => l.status === 'expired').length,
          trial: mapped.filter((l) => l.status === 'trial').length,
          totalSeats: mapped.reduce((sum, l) => sum + l.seats, 0),
            usedSeats: mapped.reduce((sum, l) => sum + l.usedSeats, 0),
          };

        setLicenses(mapped);
        setStats(nextStats);
      } catch (err) {
        console.error('Error loading licenses:', err);
        setError('Kunde inte ladda licenser just nu.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [tenantId]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return licenses.filter((license) => {
      if (statusFilter !== 'all' && license.status !== statusFilter) return false;
      if (!term) return true;
      return (
        license.organisationName.toLowerCase().includes(term) ||
        license.product.toLowerCase().includes(term) ||
        license.plan.toLowerCase().includes(term)
      );
    });
  }, [licenses, statusFilter, searchQuery]);

  if (!user) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<KeyIcon className="h-6 w-6" />}
          title={t('notLoggedIn')}
          description={t('loginToSee')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Licenser"
        description={t('pageDescription')}
        icon={<KeyIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('errorOccurred')}
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      {stats && (
        <AdminStatGrid className="mb-4">
          <AdminStatCard label="Totalt" value={stats.total} />
          <AdminStatCard label="Aktiva" value={stats.active} />
          <AdminStatCard label="Testperiod" value={stats.trial} />
          <AdminStatCard label={t('stats.expired')} value={stats.expired} />
        </AdminStatGrid>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          options={[
            { value: 'all', label: 'Alla statusar' },
            { value: 'active', label: 'Aktiv' },
            { value: 'trial', label: 'Testperiod' },
            { value: 'expired', label: 'Utgången' },
            { value: 'suspended', label: 'Pausad' },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<KeyIcon className="h-6 w-6" />}
          title={t('empty.noLicenses')}
          description={t('empty.noLicensesDescription')}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((license) => {
            const statusCfg = statusConfig[license.status];
            return (
              <Card key={license.id} className="flex flex-col">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{license.organisationName}</p>
                      <p className="text-xs text-muted-foreground">{license.product}</p>
                    </div>
                    <Badge variant={statusCfg.variant}>{t(statusCfg.labelKey)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('planSeats', { plan: license.plan, used: license.usedSeats, total: license.seats })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('validPeriod', { start: new Date(license.startDate).toLocaleDateString('sv-SE'), end: new Date(license.endDate).toLocaleDateString('sv-SE') })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminPageLayout>
  );
}
