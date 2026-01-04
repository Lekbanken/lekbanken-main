'use client';

import { useState } from "react";
import {
  CreditCardIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantSubscription, BillingAccount, SubscriptionStatus } from "../../types";

type OrganisationBillingSectionProps = {
  tenantId: string;
  subscription: TenantSubscription | null;
  billingAccount: BillingAccount | null;
  trialEndsAt: string | null;
};

// Status configuration
const subscriptionStatusConfig: Record<SubscriptionStatus, {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  active: {
    label: 'Aktiv',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircleIcon,
  },
  trialing: {
    label: 'Provperiod',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    icon: ClockIcon,
  },
  past_due: {
    label: 'Förfallen betalning',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    icon: ExclamationTriangleIcon,
  },
  canceled: {
    label: 'Avslutad',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircleIcon,
  },
  paused: {
    label: 'Pausad',
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400',
    icon: PauseCircleIcon,
  },
};

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '–';
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate days until trial ends
function getDaysUntilTrialEnds(trialEndsAt: string): number {
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diffTime = trialEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function OrganisationBillingSection({
  tenantId: _tenantId,
  subscription,
  billingAccount,
  trialEndsAt,
}: OrganisationBillingSectionProps) {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  
  // Get status config
  const statusConfig = subscription 
    ? subscriptionStatusConfig[subscription.status] 
    : null;
  const StatusIcon = statusConfig?.icon || CreditCardIcon;
  
  // Calculate trial info
  const trialDaysRemaining = trialEndsAt ? getDaysUntilTrialEnds(trialEndsAt) : null;
  const isTrialActive = trialDaysRemaining !== null && trialDaysRemaining > 0;
  
  // Handle open Stripe portal (placeholder - would need API integration)
  const handleOpenStripePortal = async () => {
    if (!billingAccount?.providerCustomerId) return;
    
    setIsOpeningPortal(true);
    try {
      // In production, this would call an API to create a Stripe billing portal session
      // const response = await fetch('/api/billing/portal', {
      //   method: 'POST',
      //   body: JSON.stringify({ customerId: billingAccount.providerCustomerId }),
      // });
      // const { url } = await response.json();
      // window.open(url, '_blank');
      
      // Placeholder: open Stripe dashboard
      window.open(`https://dashboard.stripe.com/customers/${billingAccount.providerCustomerId}`, '_blank');
    } finally {
      setIsOpeningPortal(false);
    }
  };
  
  return (
    <Card id="billing">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4" />
          Fakturering & Prenumeration
        </CardTitle>
        {billingAccount && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenStripePortal}
            disabled={isOpeningPortal}
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
            Stripe Dashboard
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No subscription state */}
        {!subscription && !isTrialActive && (
          <div className="text-center py-6 text-muted-foreground">
            <CreditCardIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ingen aktiv prenumeration</p>
            <p className="text-xs mt-1">
              Kontakta support för att konfigurera fakturering.
            </p>
          </div>
        )}
        
        {/* Trial banner */}
        {isTrialActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Provperiod aktiv
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dag' : 'dagar'} kvar 
                (slutar {formatDate(trialEndsAt)})
              </p>
            </div>
          </div>
        )}
        
        {/* Subscription details */}
        {subscription && (
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig?.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig?.label}
              </span>
            </div>
            
            {/* Subscription info grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Plan */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium">
                  {subscription.product?.name || 'Standard'}
                </p>
              </div>
              
              {/* Seats */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Platser</p>
                <p className="text-sm font-medium">{subscription.seatsPurchased}</p>
              </div>
              
              {/* Start date */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Startdatum</p>
                <p className="text-sm font-medium">{formatDate(subscription.startDate)}</p>
              </div>
              
              {/* Renewal date */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {subscription.status === 'canceled' ? 'Avslutad' : 'Nästa förnyelse'}
                </p>
                <p className="text-sm font-medium">
                  {subscription.cancelledAt 
                    ? formatDate(subscription.cancelledAt)
                    : formatDate(subscription.renewalDate)
                  }
                </p>
              </div>
            </div>
            
            {/* Stripe IDs for debugging */}
            {subscription.stripeSubscriptionId && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Stripe Prenumerations-ID</p>
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {subscription.stripeSubscriptionId}
                </code>
              </div>
            )}
          </div>
        )}
        
        {/* Billing account info */}
        {billingAccount && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Stripe Kund-ID</p>
            <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {billingAccount.providerCustomerId}
            </code>
          </div>
        )}
        
        {/* Warning for past_due */}
        {subscription?.status === 'past_due' && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Betalning förfallen
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Det finns en förfallen betalning. Kontrollera faktureringsinformationen i Stripe 
                för att undvika avbrott i tjänsten.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
