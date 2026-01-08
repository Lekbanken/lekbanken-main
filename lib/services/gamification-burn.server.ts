import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

// ============================================================================
// TYPES
// ============================================================================

export type SinkType = 'shop_item' | 'boost' | 'cosmetic' | 'donation' | 'custom'

export interface BurnSink {
  id: string
  tenantId: string | null
  sinkType: SinkType
  name: string
  description: string | null
  costCoins: number
  isAvailable: boolean
  availableFrom: string | null
  availableUntil: string | null
  totalStock: number | null
  remainingStock: number | null
  perUserLimit: number | null
  metadata: Json | null
}

export interface BurnResult {
  success: boolean
  burnLogId: string | null
  coinTransactionId: string | null
  newBalance: number | null
  errorMessage: string | null
}

export interface BurnInput {
  userId: string
  tenantId: string | null
  sinkId: string | null
  amount?: number // Override if no sink
  idempotencyKey: string
  metadata?: Json
}

export interface RefundInput {
  burnLogId: string
  reason?: string
}

export interface RefundResult {
  success: boolean
  refundTransactionId: string | null
  newBalance: number | null
  errorMessage: string | null
}

// ============================================================================
// GET AVAILABLE SINKS
// ============================================================================

/**
 * Get all available burn sinks for a tenant context.
 * Includes global sinks (tenant_id = null) and tenant-specific sinks.
 */
export async function getAvailableSinks(tenantId: string | null): Promise<BurnSink[]> {
  const admin = await createServiceRoleClient()
  const now = new Date().toISOString()

  let query = admin
    .from('gamification_burn_sinks')
    .select('*')
    .eq('is_available', true)
    .or(`available_from.is.null,available_from.lte.${now}`)
    .or(`available_until.is.null,available_until.gte.${now}`)
    .order('cost_coins', { ascending: true })

  if (tenantId) {
    query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('[burn] failed to fetch sinks', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    sinkType: row.sink_type as SinkType,
    name: row.name,
    description: row.description,
    costCoins: row.cost_coins,
    isAvailable: row.is_available,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    totalStock: row.total_stock,
    remainingStock: row.remaining_stock,
    perUserLimit: row.per_user_limit,
    metadata: row.metadata,
  }))
}

// ============================================================================
// BURN COINS
// ============================================================================

/**
 * Execute a coin burn transaction.
 * 
 * Uses the database function `burn_coins_v1` which handles:
 * - Double-spend protection via advisory lock
 * - Idempotency via unique key
 * - Stock management
 * - Balance validation
 */
export async function burnCoins(input: BurnInput): Promise<BurnResult> {
  const admin = await createServiceRoleClient()

  // Determine amount - either from sink or explicit
  let amount = input.amount
  if (input.sinkId && !amount) {
    const { data: sink } = await admin
      .from('gamification_burn_sinks')
      .select('cost_coins')
      .eq('id', input.sinkId)
      .single()

    if (!sink) {
      return {
        success: false,
        burnLogId: null,
        coinTransactionId: null,
        newBalance: null,
        errorMessage: 'Sink not found',
      }
    }
    amount = sink.cost_coins
  }

  if (!amount || amount <= 0) {
    return {
      success: false,
      burnLogId: null,
      coinTransactionId: null,
      newBalance: null,
      errorMessage: 'Invalid amount',
    }
  }

  // Type assertion: RPC allows nullable tenant_id and sink_id
  const { data, error } = await (admin.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: { success: boolean; burn_log_id: string | null; coin_transaction_id: string | null; new_balance: number | null; error_message: string | null }[] | null; error: Error | null }>)(
    'burn_coins_v1',
    {
      p_user_id: input.userId,
      p_tenant_id: input.tenantId,
      p_sink_id: input.sinkId,
      p_amount: amount,
      p_idempotency_key: input.idempotencyKey,
      p_metadata: input.metadata ?? null,
    }
  )

  if (error) {
    console.error('[burn] RPC failed', error)
    return {
      success: false,
      burnLogId: null,
      coinTransactionId: null,
      newBalance: null,
      errorMessage: error.message,
    }
  }

  const row = data?.[0]
  return {
    success: row?.success ?? false,
    burnLogId: row?.burn_log_id ?? null,
    coinTransactionId: row?.coin_transaction_id ?? null,
    newBalance: row?.new_balance ?? null,
    errorMessage: row?.error_message ?? null,
  }
}

// ============================================================================
// CHECK USER PURCHASE LIMIT
// ============================================================================

/**
 * Check if user has reached per-user limit for a sink.
 */
export async function checkUserPurchaseLimit(
  userId: string,
  tenantId: string | null,
  sinkId: string
): Promise<{ allowed: boolean; purchased: number; limit: number | null }> {
  const admin = await createServiceRoleClient()

  // Get sink limit
  const { data: sink } = await admin
    .from('gamification_burn_sinks')
    .select('per_user_limit')
    .eq('id', sinkId)
    .single()

  if (!sink) {
    return { allowed: false, purchased: 0, limit: null }
  }

  if (!sink.per_user_limit) {
    // No limit set
    return { allowed: true, purchased: 0, limit: null }
  }

  // Count user's purchases of this sink
  const { count } = await admin
    .from('gamification_burn_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('sink_id', sinkId)
    .eq('result_status', 'completed')

  const purchased = count ?? 0
  return {
    allowed: purchased < sink.per_user_limit,
    purchased,
    limit: sink.per_user_limit,
  }
}

// ============================================================================
// REFUND
// ============================================================================

/**
 * Process a refund for a previous burn transaction.
 * Admin-only operation.
 */
export async function refundBurn(input: RefundInput): Promise<RefundResult> {
  const admin = await createServiceRoleClient()

  // 1. Get burn log entry
  const { data: burnLog, error: fetchError } = await admin
    .from('gamification_burn_log')
    .select('*')
    .eq('id', input.burnLogId)
    .single()

  if (fetchError || !burnLog) {
    return {
      success: false,
      refundTransactionId: null,
      newBalance: null,
      errorMessage: 'Burn log not found',
    }
  }

  if (burnLog.result_status === 'refunded') {
    return {
      success: false,
      refundTransactionId: burnLog.refund_transaction_id,
      newBalance: null,
      errorMessage: 'Already refunded',
    }
  }

  // Ensure user_id exists (should always be present in burn_log)
  if (!burnLog.user_id) {
    return {
      success: false,
      refundTransactionId: null,
      newBalance: null,
      errorMessage: 'Invalid burn log: missing user_id',
    }
  }

  // 2. Create refund transaction - Type assertion for nullable tenant_id
  const { data: txResult, error: txError } = await (admin.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: { transaction_id: string; balance: number }[] | null; error: Error | null }>)(
    'apply_coin_transaction_v1',
    {
      p_user_id: burnLog.user_id,
      p_tenant_id: burnLog.tenant_id,
      p_type: 'earn',
      p_amount: burnLog.amount_spent,
      p_reason_code: 'refund',
      p_idempotency_key: `refund:${input.burnLogId}`,
      p_description: `Refund: ${input.reason ?? 'Admin refund'}`,
      p_source: 'admin',
      p_metadata: { originalBurnLogId: input.burnLogId },
    }
  )

  if (txError) {
    console.error('[burn] refund transaction failed', txError)
    return {
      success: false,
      refundTransactionId: null,
      newBalance: null,
      errorMessage: txError.message,
    }
  }

  const refundTxId = txResult?.[0]?.transaction_id
  const newBalance = txResult?.[0]?.balance

  // 3. Update burn log status
  await admin
    .from('gamification_burn_log')
    .update({
      result_status: 'refunded',
      refund_transaction_id: refundTxId,
    })
    .eq('id', input.burnLogId)

  // 4. Restore stock if applicable
  if (burnLog.sink_id) {
    const { data: sink } = await admin
      .from('gamification_burn_sinks')
      .select('remaining_stock')
      .eq('id', burnLog.sink_id)
      .single()

    if (sink && sink.remaining_stock !== null) {
      await admin
        .from('gamification_burn_sinks')
        .update({ remaining_stock: sink.remaining_stock + 1, updated_at: new Date().toISOString() })
        .eq('id', burnLog.sink_id)
    }
  }

  return {
    success: true,
    refundTransactionId: refundTxId ?? null,
    newBalance: newBalance ?? null,
    errorMessage: null,
  }
}

// ============================================================================
// ADMIN: CREATE SINK
// ============================================================================

export interface CreateSinkInput {
  tenantId?: string
  sinkType: SinkType
  name: string
  description?: string
  costCoins: number
  isAvailable?: boolean
  availableFrom?: string
  availableUntil?: string
  totalStock?: number
  perUserLimit?: number
  metadata?: Json
}

/**
 * Create a new burn sink (shop item, boost, etc.).
 * Admin-only operation.
 */
export async function createBurnSink(input: CreateSinkInput): Promise<{ id: string } | { error: string }> {
  const admin = await createServiceRoleClient()

  const { data, error } = await admin
    .from('gamification_burn_sinks')
    .insert({
      tenant_id: input.tenantId ?? null,
      sink_type: input.sinkType,
      name: input.name,
      description: input.description,
      cost_coins: input.costCoins,
      is_available: input.isAvailable ?? false,
      available_from: input.availableFrom,
      available_until: input.availableUntil,
      total_stock: input.totalStock,
      remaining_stock: input.totalStock,
      per_user_limit: input.perUserLimit,
      metadata: input.metadata,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  return { id: data.id }
}

// ============================================================================
// ADMIN: UPDATE SINK
// ============================================================================

export interface UpdateSinkInput {
  id: string
  name?: string
  description?: string
  costCoins?: number
  isAvailable?: boolean
  availableFrom?: string | null
  availableUntil?: string | null
  remainingStock?: number
  perUserLimit?: number | null
  metadata?: Json
}

/**
 * Update an existing burn sink.
 * Admin-only operation.
 */
export async function updateBurnSink(input: UpdateSinkInput): Promise<{ success: boolean; error?: string }> {
  const admin = await createServiceRoleClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.costCoins !== undefined) updates.cost_coins = input.costCoins
  if (input.isAvailable !== undefined) updates.is_available = input.isAvailable
  if (input.availableFrom !== undefined) updates.available_from = input.availableFrom
  if (input.availableUntil !== undefined) updates.available_until = input.availableUntil
  if (input.remainingStock !== undefined) updates.remaining_stock = input.remainingStock
  if (input.perUserLimit !== undefined) updates.per_user_limit = input.perUserLimit
  if (input.metadata !== undefined) updates.metadata = input.metadata

  const { error } = await admin
    .from('gamification_burn_sinks')
    .update(updates)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// STATS: BURN METRICS
// ============================================================================

export interface BurnMetrics {
  totalBurned: number
  totalTransactions: number
  uniqueBurners: number
  topSinks: Array<{ sinkId: string; name: string; count: number; amount: number }>
}

/**
 * Get burn metrics for a tenant over a time period.
 */
export async function getBurnMetrics(
  tenantId: string | null,
  fromDate: string,
  toDate: string
): Promise<BurnMetrics> {
  const admin = await createServiceRoleClient()

  let query = admin
    .from('gamification_burn_log')
    .select('id, user_id, sink_id, amount_spent, result_status')
    .eq('result_status', 'completed')
    .gte('created_at', fromDate)
    .lte('created_at', toDate)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: logs } = await query

  if (!logs || logs.length === 0) {
    return { totalBurned: 0, totalTransactions: 0, uniqueBurners: 0, topSinks: [] }
  }

  const totalBurned = logs.reduce((sum, l) => sum + l.amount_spent, 0)
  const uniqueBurners = new Set(logs.map((l) => l.user_id)).size

  // Group by sink
  const sinkStats = new Map<string, { count: number; amount: number }>()
  for (const log of logs) {
    if (log.sink_id) {
      const current = sinkStats.get(log.sink_id) ?? { count: 0, amount: 0 }
      current.count++
      current.amount += log.amount_spent
      sinkStats.set(log.sink_id, current)
    }
  }

  // Get sink names
  const sinkIds = Array.from(sinkStats.keys())
  const { data: sinks } = await admin
    .from('gamification_burn_sinks')
    .select('id, name')
    .in('id', sinkIds)

  const sinkNameMap = new Map(sinks?.map((s) => [s.id, s.name]) ?? [])

  const topSinks = Array.from(sinkStats.entries())
    .map(([sinkId, stats]) => ({
      sinkId,
      name: sinkNameMap.get(sinkId) ?? 'Unknown',
      count: stats.count,
      amount: stats.amount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalBurned,
    totalTransactions: logs.length,
    uniqueBurners,
    topSinks,
  }
}
