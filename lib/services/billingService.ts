import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

// =========================================
// TYPES - Use Supabase generated types
// =========================================

export type BillingPlan = Database['public']['Tables']['billing_plans']['Row'];
export type BillingPlanInsert = Database['public']['Tables']['billing_plans']['Insert'];

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];

export type BillingHistory = Database['public']['Tables']['billing_history']['Row'];
export type BillingHistoryInsert = Database['public']['Tables']['billing_history']['Insert'];

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];

export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
export type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert'];

// Extended types with relations
export type SubscriptionWithPlan = Subscription & { plan?: BillingPlan };

// Plan Management
export async function getAvailablePlans(): Promise<BillingPlan[] | null> {
  try {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching plans:', err);
    return null;
  }
}

export async function getPlanById(planId: string): Promise<BillingPlan | null> {
  try {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching plan:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching plan:', err);
    return null;
  }
}

export async function getPlanBySlug(slug: string): Promise<BillingPlan | null> {
  try {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching plan by slug:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching plan by slug:', err);
    return null;
  }
}

// Subscription Management
export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plan:billing_plan_id(*)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching subscription:', err);
    return null;
  }
}

export async function createSubscription(params: {
  tenantId: string;
  billingPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: params.tenantId,
        billing_plan_id: params.billingPlanId,
        billing_cycle: params.billingCycle,
        stripe_subscription_id: params.stripeSubscriptionId,
        stripe_customer_id: params.stripeCustomerId,
        current_period_start: params.periodStart?.toISOString(),
        current_period_end: params.periodEnd?.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return null;
    }

    await createBillingHistory({
      tenantId: params.tenantId,
      subscriptionId: data.id,
      eventType: 'subscription_created',
      toPlanId: params.billingPlanId,
    });

    return data;
  } catch (err) {
    console.error('Error creating subscription:', err);
    return null;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error updating subscription:', err);
    return null;
  }
}

export async function upgradeSubscription(params: {
  subscriptionId: string;
  newPlanId: string;
  tenantId: string;
}): Promise<Subscription | null> {
  try {
    const currentSub = await supabase
      .from('subscriptions')
      .select('billing_plan_id')
      .eq('id', params.subscriptionId)
      .single();

    if (currentSub.error) {
      console.error('Error fetching current subscription:', currentSub.error);
      return null;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        billing_plan_id: params.newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Error upgrading subscription:', error);
      return null;
    }

    await createBillingHistory({
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      eventType: 'upgraded',
      fromPlanId: currentSub.data.billing_plan_id,
      toPlanId: params.newPlanId,
    });

    return data;
  } catch (err) {
    console.error('Error upgrading subscription:', err);
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  tenantId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('Error canceling subscription:', error);
      return null;
    }

    await createBillingHistory({
      tenantId,
      subscriptionId,
      eventType: 'canceled',
    });

    return data;
  } catch (err) {
    console.error('Error canceling subscription:', err);
    return null;
  }
}

// Billing History
export async function createBillingHistory(params: {
  tenantId: string;
  subscriptionId?: string;
  eventType: string;
  fromPlanId?: string;
  toPlanId?: string;
  amountCharged?: number;
  amountCredited?: number;
  notes?: string;
}): Promise<BillingHistory | null> {
  try {
    const { data, error } = await supabase
      .from('billing_history')
      .insert({
        tenant_id: params.tenantId,
        subscription_id: params.subscriptionId,
        event_type: params.eventType,
        from_plan_id: params.fromPlanId,
        to_plan_id: params.toPlanId,
        amount_charged: params.amountCharged,
        amount_credited: params.amountCredited,
        notes: params.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating billing history:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error creating billing history:', err);
    return null;
  }
}

export async function getBillingHistory(
  tenantId: string,
  limit = 50,
  offset = 0
): Promise<BillingHistory[] | null> {
  try {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching billing history:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching billing history:', err);
    return null;
  }
}

// Invoices
export async function createInvoice(params: {
  tenantId: string;
  subscriptionId?: string;
  name: string;
  invoiceNumber?: string;
  amount: number;
  amountSubtotal?: number;
  amountTax?: number;
  amountTotal?: number;
  currency?: string;
  stripeInvoiceId?: string;
  dueDate: Date;
  notes?: string;
}): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: params.tenantId,
        subscription_id: params.subscriptionId,
        name: params.name,
        invoice_number: params.invoiceNumber,
        amount: params.amount,
        amount_subtotal: params.amountSubtotal,
        amount_tax: params.amountTax ?? 0,
        amount_total: params.amountTotal ?? params.amount,
        currency: params.currency ?? 'USD',
        stripe_invoice_id: params.stripeInvoiceId,
        due_date: params.dueDate.toISOString(),
        notes: params.notes,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error creating invoice:', err);
    return null;
  }
}

export async function getInvoices(tenantId: string): Promise<Invoice[] | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching invoices:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return null;
  }
}

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Invoice>
): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error updating invoice:', err);
    return null;
  }
}

// Payment Methods
export async function getPaymentMethods(
  tenantId: string
): Promise<PaymentMethod[] | null> {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    return null;
  }
}

export async function setDefaultPaymentMethod(
  paymentMethodId: string,
  tenantId: string
): Promise<boolean> {
  try {
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('tenant_id', tenantId);

    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error setting default payment method:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error setting default payment method:', err);
    return false;
  }
}

// Billing Stats
export async function getBillingStats(
  tenantId: string
): Promise<
  {
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
    totalRevenue: number;
    paidInvoices: number;
    outstandingInvoices: number;
  } | null
> {
  try {
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*, plan:billing_plan_id(price_monthly)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (subsError) throw subsError;

    const mrr =
      (subs || []).reduce((sum: number, sub: { plan?: { price_monthly?: number }; billing_cycle?: string }) => {
        const price = sub.plan?.price_monthly || 0;
        return sum + (sub.billing_cycle === 'monthly' ? price : price / 12);
      }, 0) || 0;

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('amount_total, status')
      .eq('tenant_id', tenantId);

    if (invoicesError) throw invoicesError;

    const totalRevenue = (invoices || []).reduce(
      (sum: number, inv: { amount_total: number | null }) => sum + (inv.amount_total ?? 0),
      0
    );
    const paidInvoices = (invoices || []).filter((inv) => inv.status === 'paid').length;
    const outstandingInvoices = (invoices || []).filter((inv) => inv.status === 'draft' || inv.status === 'issued').length;

    return {
      activeSubscriptions: (subs || []).length,
      monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidInvoices,
      outstandingInvoices,
    };
  } catch (err) {
    console.error('Error fetching billing stats:', err);
    return null;
  }
}

// Validation
export async function validatePlan(planId: string): Promise<boolean> {
  try {
    const plan = await getPlanById(planId);
    return !!plan && (plan.is_active ?? false);
  } catch (err) {
    console.error('Error validating plan:', err);
    return false;
  }
}
