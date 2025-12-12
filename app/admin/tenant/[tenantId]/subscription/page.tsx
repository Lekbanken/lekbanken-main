import { useEffect, useMemo, useState } from "react";
import { CreditCardIcon, BoltIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/context/TenantContext";
import { getSubscription, type Subscription } from "@/lib/services/billingService";

export default function TenantSubscriptionPage() {
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
    if (!subscription) return "Ingen aktiv plan";
    const plan = (subscription as unknown as { plan?: { name?: string; slug?: string } }).plan;
    return plan?.name || plan?.slug || "Okänd plan";
  }, [subscription]);

  const period = useMemo(() => {
    if (!subscription?.period_start || !subscription?.period_end) return null;
    const start = new Date(subscription.period_start).toLocaleDateString();
    const end = new Date(subscription.period_end).toLocaleDateString();
    return `${start} – ${end}`;
  }, [subscription]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj en organisation för att se prenumeration."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Prenumeration"
        description="Prenumerationsplan och användning för organisationen."
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
        actions={
          isLoading ? <span className="text-sm text-muted-foreground">Laddar...</span> : null
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar prenumeration...</p>
      ) : !subscription ? (
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title="Ingen aktiv prenumeration"
          description="Ingen prenumeration hittades för denna organisation."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold text-foreground">{planName}</p>
              <p className="text-sm text-muted-foreground">Status: {subscription.status}</p>
              <p className="text-sm text-muted-foreground">
                Period: {period || "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fakturering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Stripe Subscription ID: {subscription.stripe_subscription_id || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                Stripe Customer ID: {subscription.stripe_customer_id || "—"}
              </p>
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <BoltIcon className="h-4 w-4" />
                {subscription.billing_cycle || "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPageLayout>
  );
}
