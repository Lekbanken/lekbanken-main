import { useEffect, useMemo, useState } from "react";
import { CreditCardIcon, DocumentTextIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminStatCard, AdminStatGrid } from "@/components/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/context/TenantContext";
import { getBillingStats, getSubscription, getInvoices, type Subscription, type Invoice } from "@/lib/services/billingService";

export default function TenantBillingPage() {
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
    setIsLoading(true);
    const load = async () => {
      const [sub, inv, st] = await Promise.all([
        getSubscription(tenantId),
        getInvoices(tenantId),
        getBillingStats(tenantId),
      ]);
      setSubscription(sub);
      setInvoices(inv);
      setStats(st);
      setIsLoading(false);
    };
    void load();
  }, [tenantId]);

  const planName = useMemo(() => {
    if (!subscription) return "Ingen aktiv plan";
    const plan = (subscription as unknown as { plan?: { name?: string; slug?: string } }).plan;
    return plan?.name || plan?.slug || "Okänd plan";
  }, [subscription]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<CreditCardIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj eller byt organisation för att se fakturering."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Fakturering"
        description="Översikt över prenumeration och fakturor."
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
        actions={
          isLoading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Laddar...
            </span>
          ) : null
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="Aktiv plan"
          value={planName}
          trend={subscription?.status ?? "—"}
          icon={<CreditCardIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        <AdminStatCard
          label="MRR"
          value={stats ? `${stats.monthlyRecurringRevenue.toLocaleString()} kr` : "—"}
          trend="Beräknat"
          icon={<CreditCardIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Totalt fakturerat"
          value={stats ? `${stats.totalRevenue.toLocaleString()} kr` : "—"}
          trend="Summa"
          icon={<DocumentTextIcon className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
      </AdminStatGrid>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fakturor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar fakturor...</p>
          ) : !invoices || invoices.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-5 w-5" />}
              title="Inga fakturor ännu"
              description="När fakturor finns för denna organisation visas de här."
            />
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border/60">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{inv.name || inv.invoice_number || "Faktura"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()} • {inv.status}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {(inv.amount_total ?? inv.amount)?.toLocaleString()} {inv.currency || "SEK"}
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
