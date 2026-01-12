 'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCardIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from '@/components/admin/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/lib/context/TenantContext';
import { getSubscription, type Subscription } from '@/lib/services/billingService';

export default function TenantSubscriptionPage() {
  const t = useTranslations('admin.tenant.subscription');
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      if (!active) return;
      setIsLoading(true);
      const sub = await getSubscription(tenantId);
      if (!active) return;
      setSubscription(sub);
      setIsLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [tenantId]);

  const planName = useMemo(() => {
    if (!subscription) return t('plan.noActivePlan');
    const plan = (subscription as unknown as { plan?: { name?: string; slug?: string } }).plan;
    return plan?.name || plan?.slug || t('plan.unknownPlan');
  }, [subscription, t]);

  const period = useMemo(() => {
    if (!subscription?.current_period_start || !subscription?.current_period_end) return null;
    const start = new Date(subscription.current_period_start).toLocaleDateString();
    const end = new Date(subscription.current_period_end).toLocaleDateString();
    return `${start} – ${end}`;
  }, [subscription]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title={t('noOrganization.title')}
          description={t('noOrganization.description')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
        actions={isLoading ? <span className="text-sm text-muted-foreground">{t('loadingShort')}</span> : null}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : !subscription ? (
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('plan.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold text-foreground">{planName}</p>
              <p className="text-sm text-muted-foreground">{t('plan.status', { status: subscription.status })}</p>
              <p className="text-sm text-muted-foreground">{t('plan.period', { period: period || '–' })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('billing.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('billing.stripeSubscriptionId', { id: subscription.stripe_subscription_id || '–' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('billing.stripeCustomerId', { id: subscription.stripe_customer_id || '–' })}
              </p>
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <BoltIcon className="h-4 w-4" />
                {subscription.billing_cycle || '–'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPageLayout>
  );
}
