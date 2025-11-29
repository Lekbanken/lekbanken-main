import { supabaseAdmin } from '@/lib/supabase/server';

// Types
export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: Record<string, unknown>;
  user_limit: number | null;
  api_limit_daily: number | null;
  storage_gb: number | null;
  support_level: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  billing_cycle: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan?: BillingPlan;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  invoice_number: string;
  amount_subtotal: number;
  amount_tax: number;
  amount_total: number;
  currency: string;
  status: string;
  paid_at: string | null;
  due_date: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingHistory {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  event_type: string;
  from_plan_id: string | null;
  to_plan_id: string | null;
  amount_charged: number | null;
  amount_credited: number | null;
  notes: string | null;
  created_at: string;
}

// Plan Management
export async function getAvailablePlans(): Promise<BillingPlan[] | null> {
  try {
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const currentSub = await supabaseAdmin
      .from('subscriptions')
      .select('billing_plan_id')
      .eq('id', params.subscriptionId)
      .single();

    if (currentSub.error) {
      console.error('Error fetching current subscription:', currentSub.error);
      return null;
    }

    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
  invoiceNumber: string;
  amountSubtotal: number;
  amountTax?: number;
  amountTotal: number;
  currency?: string;
  stripeInvoiceId?: string;
  dueDate?: Date;
  notes?: string;
}): Promise<Invoice | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: params.tenantId,
        subscription_id: params.subscriptionId,
        invoice_number: params.invoiceNumber,
        amount_subtotal: params.amountSubtotal,
        amount_tax: params.amountTax || 0,
        amount_total: params.amountTotal,
        currency: params.currency || 'USD',
        stripe_invoice_id: params.stripeInvoiceId,
        due_date: params.dueDate?.toISOString(),
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
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
): Promise<
  Array<{
    id: string;
    tenant_id: string;
    stripe_payment_method_id: string | null;
    type: string;
    card_brand: string | null;
    card_last_four: string | null;
    card_exp_month: number | null;
    card_exp_year: number | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
  }> | null
> {
  try {
    const { data, error } = await supabaseAdmin
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
    await supabaseAdmin
      .from('payment_methods')
      .update({ is_default: false })
      .eq('tenant_id', tenantId);

    const { error } = await supabaseAdmin
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
    const { data: subs, error: subsError } = await supabaseAdmin
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

    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('amount_total, status')
      .eq('tenant_id', tenantId);

    if (invoicesError) throw invoicesError;

    const totalRevenue = (invoices || []).reduce(
      (sum: number, inv: { amount_total?: number }) => sum + (inv.amount_total || 0),
      0
    );
    const paidInvoices = (invoices || []).filter((inv: { status?: string }) => inv.status === 'paid').length;
    const outstandingInvoices = (invoices || []).filter((inv: { status?: string }) => inv.status === 'open').length;

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
    return !!plan && plan.is_active;
  } catch (err) {
    console.error('Error validating plan:', err);
    return false;
  }
}
