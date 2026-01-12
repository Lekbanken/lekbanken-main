'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import { getBillingStats } from '@/lib/services/billingService';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  CreditCardIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CogIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  totalRevenue: number;
  paidInvoices: number;
  outstandingInvoices: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  buttonLabel: string;
}

export default function BillingAdminPage() {
  const t = useTranslations('admin.billing.hub');
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const userId = user?.id;
  const tenantId = currentTenant?.id;

  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'subscriptions',
      title: t('actions.subscriptions.title'),
      description: t('actions.subscriptions.description'),
      href: '/admin/billing/subscriptions',
      icon: <CreditCardIcon className="h-5 w-5" />,
      color: 'from-primary/20 to-primary/5 text-primary',
      buttonLabel: t('actions.subscriptions.button'),
    },
    {
      id: 'invoices',
      title: t('actions.invoices.title'),
      description: t('actions.invoices.description'),
      href: '/admin/billing/invoices',
      icon: <DocumentTextIcon className="h-5 w-5" />,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600',
      buttonLabel: t('actions.invoices.button'),
    },
    {
      id: 'plans',
      title: t('actions.plans.title'),
      description: t('actions.plans.description'),
      href: '#',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      color: 'from-purple-500/20 to-purple-500/5 text-purple-600',
      buttonLabel: t('actions.plans.button'),
    },
    {
      id: 'settings',
      title: t('actions.settings.title'),
      description: t('actions.settings.description'),
      href: '#',
      icon: <CogIcon className="h-5 w-5" />,
      color: 'from-slate-500/20 to-slate-500/5 text-slate-600',
      buttonLabel: t('actions.settings.button'),
    },
  ], [t]);

  useEffect(() => {
    if (!userId || !tenantId) return;

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const billingStats = await getBillingStats(tenantId);
        setStats(billingStats);
      } catch (err) {
        console.error('Error loading billing stats:', err);
      }
      setIsLoading(false);
    };

    loadStats();
  }, [userId, tenantId]);

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
    <SystemAdminClientGuard>
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<CreditCardIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.billing') },
        ]}
      />

      {/* Stats */}
      <AdminStatGrid cols={5} className="mb-8">
        <AdminStatCard
          label={t('stats.activeSubscriptions')}
          value={stats?.activeSubscriptions ?? 0}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.mrr')}
          value={stats ? `$${stats.monthlyRecurringRevenue.toFixed(0)}` : '-'}
          icon={<span className="text-base">📈</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.totalRevenue')}
          value={stats ? `$${stats.totalRevenue.toFixed(0)}` : '-'}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconColor="purple"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.paidInvoices')}
          value={stats?.paidInvoices ?? 0}
          icon={<span className="text-base">✅</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.outstanding')}
          value={stats?.outstandingInvoices ?? 0}
          icon={<span className="text-base">⏳</span>}
          iconColor="amber"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {quickActions.map((action) => (
          <Card key={action.id} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} shadow-sm ring-1 ring-black/5`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                </div>
              </div>
              <Button
                variant={action.href === '#' ? 'outline' : 'default'}
                size="sm"
                className="w-full gap-2"
                onClick={() => action.href !== '#' && router.push(action.href)}
                disabled={action.href === '#'}
              >
                {action.buttonLabel}
                {action.href !== '#' && <ArrowRightIcon className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('about.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t('about.paragraph1')}
            </p>
            <p>
              {t('about.paragraph2')}
            </p>
            <p className="text-xs border-l-2 border-amber-500 pl-3 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-r">
              <strong>{t('about.note').split(':')[0]}:</strong>{t('about.note').split(':').slice(1).join(':')}
            </p>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
    </SystemAdminClientGuard>
  );
}
