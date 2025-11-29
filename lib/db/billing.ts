/**
 * Billing Queries
 *
 * Database queries for subscriptions, seats, invoices, and payments.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type TenantSubscription = Database['public']['Tables']['tenant_subscriptions']['Row']
type PrivateSubscription = Database['public']['Tables']['private_subscriptions']['Row']
type Invoice = Database['public']['Tables']['invoices']['Row']
type Payment = Database['public']['Tables']['payments']['Row']
type TenantSeatAssignment = Database['public']['Tables']['tenant_seat_assignments']['Row']

/**
 * Get tenant subscription
 */
export async function getTenantSubscription(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<TenantSubscription | null> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(`*,billing_product:billing_products(*)`)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Get user's private subscription
 */
export async function getUserPrivateSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PrivateSubscription | null> {
  const { data, error } = await supabase
    .from('private_subscriptions')
    .select(`*,billing_product:billing_products(*)`)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create tenant subscription
 */
export async function createTenantSubscription(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  billingProductId: string,
  startDate: string,
  seatsPurchased: number = 1
): Promise<TenantSubscription> {
  const insertData: Database['public']['Tables']['tenant_subscriptions']['Insert'] = {
    tenant_id: tenantId,
    billing_product_id: billingProductId,
    start_date: startDate,
    seats_purchased: seatsPurchased,
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert([insertData])
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Create user private subscription
 */
export async function createUserPrivateSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
  billingProductId: string,
  startDate: string
): Promise<PrivateSubscription> {
  const insertData: Database['public']['Tables']['private_subscriptions']['Insert'] = {
    user_id: userId,
    billing_product_id: billingProductId,
    start_date: startDate,
  }

  const { data, error } = await supabase
    .from('private_subscriptions')
    .insert([insertData])
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Update subscription status
 */
export async function updateTenantSubscriptionStatus(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  status: 'active' | 'paused' | 'canceled' | 'trial'
): Promise<TenantSubscription> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update({ status })
    .eq('id', subscriptionId)
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Update private subscription status
 */
export async function updatePrivateSubscriptionStatus(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  status: 'active' | 'paused' | 'canceled' | 'trial'
): Promise<PrivateSubscription> {
  const { data, error } = await supabase
    .from('private_subscriptions')
    .update({ status })
    .eq('id', subscriptionId)
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Cancel tenant subscription
 */
export async function cancelTenantSubscription(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  cancelledAt?: string
): Promise<TenantSubscription> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update({
      status: 'canceled',
      cancelled_at: cancelledAt || new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Cancel private subscription
 */
export async function cancelPrivateSubscription(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  cancelledAt?: string
): Promise<PrivateSubscription> {
  const { data, error } = await supabase
    .from('private_subscriptions')
    .update({
      status: 'canceled',
      cancelled_at: cancelledAt || new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select('*,billing_product:billing_products(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Get active seat assignments for tenant
 */
export async function getTenantSeatAssignments(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options?: {
    status?: 'pending' | 'active' | 'released' | 'revoked'
  }
): Promise<TenantSeatAssignment[]> {
  let query = supabase
    .from('tenant_seat_assignments')
    .select(`*,user:users(*),subscription:tenant_subscriptions(*)`)
    .eq('tenant_id', tenantId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query.order('assigned_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Assign seat to user
 */
export async function assignTenantSeat(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userId: string,
  subscriptionId: string,
  billingProductId: string,
  name?: string
): Promise<TenantSeatAssignment> {
  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .insert([
      {
        tenant_id: tenantId,
        user_id: userId,
        subscription_id: subscriptionId,
        billing_product_id: billingProductId,
        name: name || '',
      },
    ])
    .select('*,user:users(*),subscription:tenant_subscriptions(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Update seat assignment status
 */
export async function updateSeatAssignmentStatus(
  supabase: SupabaseClient<Database>,
  seatAssignmentId: string,
  status: 'pending' | 'active' | 'released' | 'revoked'
): Promise<TenantSeatAssignment> {
  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .update({ status })
    .eq('id', seatAssignmentId)
    .select('*,user:users(*),subscription:tenant_subscriptions(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Release seat assignment
 */
export async function releaseSeatAssignment(
  supabase: SupabaseClient<Database>,
  seatAssignmentId: string
): Promise<TenantSeatAssignment> {
  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', seatAssignmentId)
    .select('*,user:users(*),subscription:tenant_subscriptions(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Get tenant invoices
 */
export async function getTenantInvoices(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options?: {
    limit?: number
    offset?: number
    status?: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'
  }
): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('due_date', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get invoice details
 */
export async function getInvoice(
  supabase: SupabaseClient<Database>,
  invoiceId: string
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create invoice
 */
export async function createInvoice(
  supabase: SupabaseClient<Database>,
  invoice: {
    name: string
    tenant_id: string
    subscription_id?: string
    billing_product_id?: string
    amount: number
    currency?: string
    status?: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'
    due_date: string
  }
): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert([
      {
        ...invoice,
        status: invoice.status || 'draft',
        currency: invoice.currency || 'NOK',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled',
  paidAt?: string
): Promise<Invoice> {
  const updates: Record<string, unknown> = { status }

  if (paidAt && status === 'paid') {
    updates.paid_at = paidAt
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get payment history
 */
export async function getPaymentHistory(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Create payment record
 */
export async function createPayment(
  supabase: SupabaseClient<Database>,
  payment: {
    invoice_id: string
    name: string
    amount: number
    currency?: string
    provider?: string
    status?: 'pending' | 'confirmed' | 'failed' | 'refunded'
  }
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert([
      {
        ...payment,
        currency: payment.currency || 'NOK',
        status: payment.status || 'pending',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get subscription renewal dates upcoming
 */
export async function getUpcomingRenewals(
  supabase: SupabaseClient<Database>,
  daysAhead: number = 30
) {
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(`*,tenant:tenants(*),billing_product:billing_products(*)`)
    .lte('renewal_date', futureDate)
    .in('status', ['active', 'trial'])
    .order('renewal_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get billing summary for tenant
 */
export async function getTenantBillingSummary(
  supabase: SupabaseClient<Database>,
  tenantId: string
) {
  // Get current subscription
  const subscription = await getTenantSubscription(supabase, tenantId)

  // Get active seat assignments
  const seats = await getTenantSeatAssignments(supabase, tenantId, { status: 'active' })

  // Get unpaid invoices
  const { count: unpaidCount, error: unpaidError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .in('status', ['issued', 'overdue', 'sent'])

  if (unpaidError) throw unpaidError

  // Get first unpaid invoice for payment history
  const { data: firstInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['issued', 'overdue', 'sent'])
    .limit(1)
    .single()

  const recentPayments = firstInvoice ? await getPaymentHistory(supabase, firstInvoice.id, { limit: 10 }) : []

  return {
    subscription,
    activeSeats: seats.length,
    unpaidInvoices: unpaidCount || 0,
    recentPayments,
  }
}
