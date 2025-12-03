'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
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

const quickActions: QuickAction[] = [
  {
    id: 'subscriptions',
    title: 'Prenumerationer',
    description: 'Hantera kundprenumerationer och abonnemang.',
    href: '/admin/billing/subscriptions',
    icon: <CreditCardIcon className="h-5 w-5" />,
    color: 'from-primary/20 to-primary/5 text-primary',
    buttonLabel: 'Visa prenumerationer',
  },
  {
    id: 'invoices',
    title: 'Fakturor',
    description: 'Visa och hantera kundfakturor och betalningar.',
    href: '/admin/billing/invoices',
    icon: <DocumentTextIcon className="h-5 w-5" />,
    color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600',
    buttonLabel: 'Visa fakturor',
  },
  {
    id: 'plans',
    title: 'Prisplaner',
    description: 'Konfigurera prenumerationsnivåer och prissättning.',
    href: '#',
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
    color: 'from-purple-500/20 to-purple-500/5 text-purple-600',
    buttonLabel: 'Hantera planer',
  },
  {
    id: 'settings',
    title: 'Betalningsinställningar',
    description: 'Konfigurera betalningsmetoder och integrationer.',
    href: '#',
    icon: <CogIcon className="h-5 w-5" />,
    color: 'from-slate-500/20 to-slate-500/5 text-slate-600',
    buttonLabel: 'Inställningar',
  },
];

export default function BillingAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const billingStats = await getBillingStats(currentTenant.id);
        setStats(billingStats);
      } catch (err) {
        console.error('Error loading billing stats:', err);
      }
      setIsLoading(false);
    };

    loadStats();
  }, [user, currentTenant]);

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
        title="Fakturering"
        description="Hantera prenumerationer, fakturor och betalningar"
        icon={<CreditCardIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Fakturering' },
        ]}
      />

      {/* Stats */}
      <AdminStatGrid cols={5} className="mb-8">
        <AdminStatCard
          label="Aktiva prenumerationer"
          value={stats?.activeSubscriptions ?? 0}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="MRR"
          value={stats ? `$${stats.monthlyRecurringRevenue.toFixed(0)}` : '-'}
          icon={<span className="text-base">📈</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Total intäkt"
          value={stats ? `$${stats.totalRevenue.toFixed(0)}` : '-'}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconColor="purple"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Betalda fakturor"
          value={stats?.paidInvoices ?? 0}
          icon={<span className="text-base">✅</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Utestående"
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
          <CardTitle className="text-base">Om fakturering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Faktureringsdashboarden ger en översikt över alla prenumerations- och betalningsaktiviteter.
            </p>
            <p>
              Här kan du hantera kundprenumerationer, visa fakturor, konfigurera prisplaner och övervaka betalningsmetoder.
            </p>
            <p className="text-xs border-l-2 border-amber-500 pl-3 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-r">
              <strong>OBS:</strong> Stripe-integration kommer att aktiveras i produktion. För tillfället lagras faktureringsdata i Supabase.
            </p>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
