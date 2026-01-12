 'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCardIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminStatCard, AdminStatGrid } from '@/components/admin/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/lib/context/TenantContext';
import { getBillingStats, getSubscription, getInvoices, type Subscription, type Invoice } from '@/lib/services/billingService';

export default function TenantBillingPage() {
  const t = useTranslations('admin.tenant.billing');
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [stats, setStats] = useState<{
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
    totalRevenue: number;
    paidInvoices: number;
    outstandingInvoices: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      if (!active) return;
      setIsLoading(true);
      const [sub, inv, st] = await Promise.all([
        getSubscription(tenantId),
        getInvoices(tenantId),
        getBillingStats(tenantId),
      ]);
      if (!active) return;
      setSubscription(sub);
      setInvoices(inv);
      setStats(st);
      setIsLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [tenantId]);

  const planName = useMemo(() => {
    if (!subscription) return t('noPlan');
    const plan = (subscription as unknown as { plan?: { name?: string; slug?: string } }).plan;
    return plan?.name || plan?.slug || t('unknownPlan');
  }, [subscription, t]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title={t('noOrganizationTitle')}
          description={t('noOrganizationDescription')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
        actions={
          isLoading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              {t('loading')}
            </span>
          ) : null
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label={t('activePlan')}
          value={planName}
          subtitle={subscription?.status ?? t('noStatus')}
          trend="flat"
          icon={<CreditCardIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('mrr')}
          value={stats ? `${stats.monthlyRecurringRevenue.toLocaleString()} kr` : '–'}
          subtitle={t('mrrSubtitle')}
          trend="flat"
          icon={<CreditCardIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('totalBilled')}
          value={stats ? `${stats.totalRevenue.toLocaleString()} kr` : '–'}
          subtitle={t('totalBilledSubtitle')}
          trend="flat"
          icon={<DocumentTextIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
      </AdminStatGrid>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('invoicesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loadingInvoices')}</p>
          ) : !invoices || invoices.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-5 w-5" />}
              title={t('noInvoicesTitle')}
              description={t('noInvoicesDescription')}
            />
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border/60">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{inv.name || inv.invoice_number || t('invoiceFallbackName')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()} · {inv.status}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {(inv.amount_total ?? inv.amount)?.toLocaleString()} {inv.currency || 'SEK'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
