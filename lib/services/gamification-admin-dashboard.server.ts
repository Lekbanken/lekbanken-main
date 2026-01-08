import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'

// ============================================================================
// TYPES
// ============================================================================

export interface EconomyMetrics {
  // Mint (earning) metrics
  mintRate24h: number            // Coins minted in last 24h
  mintRate7d: number             // Coins minted in last 7d
  mintRateChange: number         // % change from previous period
  totalMinted: number            // All time coins minted
  
  // Burn (spending) metrics
  burnRate24h: number            // Coins burned in last 24h
  burnRate7d: number             // Coins burned in last 7d
  burnRateChange: number         // % change from previous period
  totalBurned: number            // All time coins burned
  
  // Net metrics
  netFlow24h: number             // Mint - Burn (24h)
  netFlow7d: number              // Mint - Burn (7d)
  inflationRate: number          // Net flow as % of total supply
  
  // Supply metrics
  totalSupply: number            // Current total coin supply
  activeUsers24h: number         // Users with activity in 24h
  avgBalancePerUser: number      // Average user balance
}

export interface TopEarner {
  userId: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  coinsEarned24h: number
  coinsEarned7d: number
  coinsEarnedTotal: number
  xpTotal: number
  level: number
  eventCount24h: number
  riskScore: number              // 0-100, higher = more suspicious
}

export interface SuspiciousActivity {
  userId: string
  displayName: string
  email: string | null
  riskScore: number
  riskFactors: RiskFactor[]
  lastActivityAt: string
  coinsEarned24h: number
  eventCount24h: number
  flaggedAt: string | null
  status: 'pending' | 'reviewed' | 'cleared' | 'suspended'
}

export interface RiskFactor {
  type: 'high_velocity' | 'session_spam' | 'event_flood' | 'new_account' | 'pattern_anomaly'
  severity: 'low' | 'medium' | 'high'
  description: string
  value: number
  threshold: number
}

export interface AutomationRule {
  id: string
  tenantId: string | null
  name: string
  eventType: string
  rewardAmount: number
  xpAmount: number | null
  baseMultiplier: number
  cooldownType: string | null
  isActive: boolean
  triggerCount24h: number
  triggerCount7d: number
  createdAt: string
  updatedAt: string
}

export interface DashboardSnapshot {
  economy: EconomyMetrics
  topEarners: TopEarner[]
  suspiciousActivities: SuspiciousActivity[]
  rules: AutomationRule[]
  generatedAt: string
}

export interface DashboardFilters {
  tenantId?: string | null    // null = global/system-wide
  period?: '24h' | '7d' | '30d'
  topN?: number               // Number of top earners to return
}

// ============================================================================
// ECONOMY METRICS
// ============================================================================

/**
 * Get economy metrics (mint/burn rates, supply stats).
 * Admin only - uses service role.
 */
export async function getEconomyMetrics(
  tenantId: string | null = null
): Promise<EconomyMetrics> {
  const admin = await createServiceRoleClient()
  
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const d14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  
  // Build tenant filter
  const tenantFilter = tenantId 
    ? `tenant_id.eq.${tenantId}` 
    : 'tenant_id.is.null'
  
  // 1. Get mint stats from coin_transactions (type = 'earn')
  const [mint24h, mint7d, mintPrev7d, mintTotal] = await Promise.all([
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'earn')
      .gte('created_at', h24Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'earn')
      .gte('created_at', d7Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'earn')
      .gte('created_at', d14Ago)
      .lt('created_at', d7Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'earn')
      .or(tenantFilter),
  ])
  
  // Sum amounts
  const sumMint24h = (mint24h.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const sumMint7d = (mint7d.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const sumMintPrev7d = (mintPrev7d.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const sumMintTotal = (mintTotal.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  
  // 2. Get burn stats from coin_transactions (type = 'spend')
  const [burn24h, burn7d, burnPrev7d, burnTotal] = await Promise.all([
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'spend')
      .gte('created_at', h24Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'spend')
      .gte('created_at', d7Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'spend')
      .gte('created_at', d14Ago)
      .lt('created_at', d7Ago)
      .or(tenantFilter),
    admin
      .from('coin_transactions')
      .select('amount', { count: 'exact' })
      .eq('type', 'spend')
      .or(tenantFilter),
  ])
  
  const sumBurn24h = Math.abs((burn24h.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0))
  const sumBurn7d = Math.abs((burn7d.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0))
  const sumBurnPrev7d = Math.abs((burnPrev7d.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0))
  const sumBurnTotal = Math.abs((burnTotal.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0))
  
  // 3. Get supply stats from user_coins
  let supplyQuery = admin.from('user_coins').select('balance, user_id')
  if (tenantId) {
    supplyQuery = supplyQuery.eq('tenant_id', tenantId)
  }
  const supplyResult = await supplyQuery
  
  const totalSupply = (supplyResult.data ?? []).reduce((sum, r) => sum + (r.balance ?? 0), 0)
  const userCount = new Set((supplyResult.data ?? []).map(r => r.user_id)).size
  const avgBalance = userCount > 0 ? Math.round(totalSupply / userCount) : 0
  
  // 4. Get active users in 24h
  const activeUsersResult = await admin
    .from('gamification_daily_earnings')
    .select('user_id')
    .gte('created_at', h24Ago)
  const activeUsers24h = new Set((activeUsersResult.data ?? []).map(r => r.user_id)).size
  
  // Calculate rate changes
  const mintRateChange = sumMintPrev7d > 0 
    ? Math.round(((sumMint7d - sumMintPrev7d) / sumMintPrev7d) * 100) 
    : 0
  const burnRateChange = sumBurnPrev7d > 0 
    ? Math.round(((sumBurn7d - sumBurnPrev7d) / sumBurnPrev7d) * 100) 
    : 0
  
  // Net flow and inflation
  const netFlow24h = sumMint24h - sumBurn24h
  const netFlow7d = sumMint7d - sumBurn7d
  const inflationRate = totalSupply > 0 
    ? Math.round((netFlow7d / totalSupply) * 10000) / 100 
    : 0
  
  return {
    mintRate24h: sumMint24h,
    mintRate7d: sumMint7d,
    mintRateChange,
    totalMinted: sumMintTotal,
    burnRate24h: sumBurn24h,
    burnRate7d: sumBurn7d,
    burnRateChange,
    totalBurned: sumBurnTotal,
    netFlow24h,
    netFlow7d,
    inflationRate,
    totalSupply,
    activeUsers24h,
    avgBalancePerUser: avgBalance,
  }
}

// ============================================================================
// TOP EARNERS
// ============================================================================

/**
 * Get top earners by coins earned.
 * Includes risk scoring for abuse detection.
 */
export async function getTopEarners(
  tenantId: string | null = null,
  limit: number = 10
): Promise<TopEarner[]> {
  const admin = await createServiceRoleClient()
  
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  // Get top earners from gamification_daily_earnings
  let query = admin
    .from('gamification_daily_earnings')
    .select(`
      user_id,
      coins_earned,
      xp_earned,
      event_count,
      earning_date
    `)
    .gte('earning_date', d7Ago.split('T')[0])
    .order('coins_earned', { ascending: false })
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data: earningsData, error } = await query
  
  if (error) {
    console.error('[admin-dashboard] failed to fetch top earners', error)
    return []
  }
  
  // Aggregate by user
  const userAgg = new Map<string, {
    coinsEarned24h: number
    coinsEarned7d: number
    xpTotal: number
    eventCount24h: number
    eventCount7d: number
  }>()
  
  for (const row of earningsData ?? []) {
    const userId = row.user_id
    const existing = userAgg.get(userId) ?? {
      coinsEarned24h: 0,
      coinsEarned7d: 0,
      xpTotal: 0,
      eventCount24h: 0,
      eventCount7d: 0,
    }
    
    existing.coinsEarned7d += row.coins_earned ?? 0
    existing.xpTotal += row.xp_earned ?? 0
    existing.eventCount7d += row.event_count ?? 0
    
    // Check if within 24h
    if (new Date(row.earning_date) >= new Date(h24Ago.split('T')[0])) {
      existing.coinsEarned24h += row.coins_earned ?? 0
      existing.eventCount24h += row.event_count ?? 0
    }
    
    userAgg.set(userId, existing)
  }
  
  // Sort by 7d earnings and take top N
  const sortedUsers = Array.from(userAgg.entries())
    .sort((a, b) => b[1].coinsEarned7d - a[1].coinsEarned7d)
    .slice(0, limit)
  
  if (sortedUsers.length === 0) {
    return []
  }
  
  // Get user details
  const userIds = sortedUsers.map(([userId]) => userId)
  const { data: usersData } = await admin
    .from('users')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds)
  
  const usersMap = new Map((usersData ?? []).map(u => [u.id, u]))
  
  // Get user progress (level, total coins)
  let progressQuery = admin
    .from('user_progress')
    .select('user_id, level')
    .in('user_id', userIds)
  
  if (tenantId) {
    progressQuery = progressQuery.eq('tenant_id', tenantId)
  }
  
  const { data: progressData } = await progressQuery
  const progressMap = new Map((progressData ?? []).map(p => [p.user_id, p]))
  
  // Get total coins earned
  let coinsQuery = admin
    .from('user_coins')
    .select('user_id, total_earned')
    .in('user_id', userIds)
  
  if (tenantId) {
    coinsQuery = coinsQuery.eq('tenant_id', tenantId)
  }
  
  const { data: coinsData } = await coinsQuery
  const coinsMap = new Map((coinsData ?? []).map(c => [c.user_id, c]))
  
  // Build result with risk scoring
  const result: TopEarner[] = sortedUsers.map(([userId, agg]) => {
    const user = usersMap.get(userId)
    const progress = progressMap.get(userId)
    const coins = coinsMap.get(userId)
    
    // Calculate risk score (simple heuristic)
    const riskScore = calculateRiskScore({
      coinsEarned24h: agg.coinsEarned24h,
      eventCount24h: agg.eventCount24h,
      level: progress?.level ?? 1,
    })
    
    return {
      userId,
      displayName: user?.full_name ?? 'Unknown',
      email: user?.email ?? null,
      avatarUrl: user?.avatar_url ?? null,
      coinsEarned24h: agg.coinsEarned24h,
      coinsEarned7d: agg.coinsEarned7d,
      coinsEarnedTotal: coins?.total_earned ?? 0,
      xpTotal: agg.xpTotal,
      level: progress?.level ?? 1,
      eventCount24h: agg.eventCount24h,
      riskScore,
    }
  })
  
  return result
}

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

/**
 * Detect and return suspicious activity patterns.
 * Uses multiple heuristics to flag potential abuse.
 */
export async function getSuspiciousActivities(
  tenantId: string | null = null,
  riskThreshold: number = 50
): Promise<SuspiciousActivity[]> {
  const admin = await createServiceRoleClient()
  
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  // Get recent activity data
  let query = admin
    .from('gamification_daily_earnings')
    .select(`
      user_id,
      coins_earned,
      xp_earned,
      event_count,
      coins_earned_raw,
      coins_reduced,
      earning_date,
      last_event_at
    `)
    .gte('earning_date', d7Ago.split('T')[0])
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data: earningsData, error } = await query
  
  if (error) {
    console.error('[admin-dashboard] failed to fetch earnings for suspicious activity', error)
    return []
  }
  
  // Aggregate and analyze per user
  const userAnalysis = new Map<string, {
    coinsEarned24h: number
    eventCount24h: number
    avgDailyEvents: number
    maxDailyEvents: number
    daysActive: number
    softcapHits: number
    lastActivityAt: string
  }>()
  
  for (const row of earningsData ?? []) {
    const userId = row.user_id
    const existing = userAnalysis.get(userId) ?? {
      coinsEarned24h: 0,
      eventCount24h: 0,
      avgDailyEvents: 0,
      maxDailyEvents: 0,
      daysActive: 0,
      softcapHits: 0,
      lastActivityAt: row.last_event_at,
    }
    
    existing.daysActive += 1
    existing.avgDailyEvents = 
      (existing.avgDailyEvents * (existing.daysActive - 1) + row.event_count) / existing.daysActive
    existing.maxDailyEvents = Math.max(existing.maxDailyEvents, row.event_count ?? 0)
    
    if (row.coins_reduced > 0) {
      existing.softcapHits += 1
    }
    
    if (new Date(row.last_event_at) > new Date(existing.lastActivityAt)) {
      existing.lastActivityAt = row.last_event_at
    }
    
    if (new Date(row.earning_date) >= new Date(h24Ago.split('T')[0])) {
      existing.coinsEarned24h += row.coins_earned ?? 0
      existing.eventCount24h += row.event_count ?? 0
    }
    
    userAnalysis.set(userId, existing)
  }
  
  // Calculate risk scores and filter
  const suspiciousUsers: Array<{ userId: string; analysis: typeof userAnalysis extends Map<string, infer V> ? V : never; riskScore: number; riskFactors: RiskFactor[] }> = []
  
  for (const [userId, analysis] of userAnalysis.entries()) {
    const { riskScore, riskFactors } = calculateDetailedRisk(analysis)
    
    if (riskScore >= riskThreshold) {
      suspiciousUsers.push({ userId, analysis, riskScore, riskFactors })
    }
  }
  
  if (suspiciousUsers.length === 0) {
    return []
  }
  
  // Get user details
  const userIds = suspiciousUsers.map(u => u.userId)
  const { data: usersData } = await admin
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds)
  
  const usersMap = new Map((usersData ?? []).map(u => [u.id, u]))
  
  // Get any existing flags
  let flagsQuery = admin
    .from('user_gamification_preferences')
    .select('user_id, leaderboard_visible')
    .in('user_id', userIds)
  
  if (tenantId) {
    flagsQuery = flagsQuery.eq('tenant_id', tenantId)
  }
  
  const { data: flagsData } = await flagsQuery
  const flagsMap = new Map((flagsData ?? []).map(f => [f.user_id, f]))
  
  // Build result
  const result: SuspiciousActivity[] = suspiciousUsers
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20)
    .map(({ userId, analysis, riskScore, riskFactors }) => {
      const user = usersMap.get(userId)
      const flags = flagsMap.get(userId)
      
      let status: SuspiciousActivity['status'] = 'pending'
      if (flags?.leaderboard_visible === false) {
        status = 'suspended'
      }
      
      return {
        userId,
        displayName: user?.full_name ?? 'Unknown',
        email: user?.email ?? null,
        riskScore,
        riskFactors,
        lastActivityAt: analysis.lastActivityAt,
        coinsEarned24h: analysis.coinsEarned24h,
        eventCount24h: analysis.eventCount24h,
        flaggedAt: null,
        status,
      }
    })
  
  return result
}

// ============================================================================
// AUTOMATION RULES
// ============================================================================

/**
 * Get automation rules with trigger statistics.
 */
export async function getAutomationRules(
  tenantId: string | null = null
): Promise<AutomationRule[]> {
  const admin = await createServiceRoleClient()
  
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  // Get rules
  let query = admin
    .from('gamification_automation_rules')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else {
    query = query.is('tenant_id', null)
  }
  
  const { data: rulesData, error } = await query
  
  if (error) {
    console.error('[admin-dashboard] failed to fetch automation rules', error)
    return []
  }
  
  if (!rulesData || rulesData.length === 0) {
    return []
  }
  
  // Get trigger counts from gamification_events
  const eventTypes = rulesData.map(r => r.event_type)
  
  const [events24h, events7d] = await Promise.all([
    admin
      .from('gamification_events')
      .select('event_type', { count: 'exact' })
      .in('event_type', eventTypes)
      .gte('created_at', h24Ago),
    admin
      .from('gamification_events')
      .select('event_type', { count: 'exact' })
      .in('event_type', eventTypes)
      .gte('created_at', d7Ago),
  ])
  
  // Count by event_type
  const count24h = new Map<string, number>()
  const count7d = new Map<string, number>()
  
  for (const row of events24h.data ?? []) {
    count24h.set(row.event_type, (count24h.get(row.event_type) ?? 0) + 1)
  }
  for (const row of events7d.data ?? []) {
    count7d.set(row.event_type, (count7d.get(row.event_type) ?? 0) + 1)
  }
  
  // Build result
  return rulesData.map(rule => ({
    id: rule.id,
    tenantId: rule.tenant_id,
    name: rule.name,
    eventType: rule.event_type,
    rewardAmount: rule.reward_amount,
    xpAmount: rule.xp_amount ?? null,
    baseMultiplier: rule.base_multiplier ?? 1.0,
    cooldownType: rule.cooldown_type ?? null,
    isActive: rule.is_active,
    triggerCount24h: count24h.get(rule.event_type) ?? 0,
    triggerCount7d: count7d.get(rule.event_type) ?? 0,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
  }))
}

/**
 * Toggle automation rule active state.
 */
export async function toggleAutomationRule(
  ruleId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const admin = await createServiceRoleClient()
  
  const { error } = await admin
    .from('gamification_automation_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
  
  if (error) {
    console.error('[admin-dashboard] failed to toggle rule', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ============================================================================
// FULL DASHBOARD SNAPSHOT
// ============================================================================

/**
 * Get complete dashboard snapshot with all metrics.
 * Single call for dashboard initialization.
 */
export async function getDashboardSnapshot(
  filters: DashboardFilters = {}
): Promise<DashboardSnapshot> {
  const tenantId = filters.tenantId ?? null
  const topN = filters.topN ?? 10
  
  const [economy, topEarners, suspiciousActivities, rules] = await Promise.all([
    getEconomyMetrics(tenantId),
    getTopEarners(tenantId, topN),
    getSuspiciousActivities(tenantId),
    getAutomationRules(tenantId),
  ])
  
  return {
    economy,
    topEarners,
    suspiciousActivities,
    rules,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// RISK SCORING HELPERS
// ============================================================================

/**
 * Simple risk score calculation for top earners list.
 */
function calculateRiskScore(params: {
  coinsEarned24h: number
  eventCount24h: number
  level: number
}): number {
  let risk = 0
  
  // High velocity: more than 200 coins in 24h
  if (params.coinsEarned24h > 200) {
    risk += Math.min(30, Math.floor((params.coinsEarned24h - 200) / 10))
  }
  
  // Event flood: more than 50 events in 24h
  if (params.eventCount24h > 50) {
    risk += Math.min(30, Math.floor((params.eventCount24h - 50) / 5))
  }
  
  // New account + high activity
  if (params.level <= 2 && params.coinsEarned24h > 100) {
    risk += 20
  }
  
  return Math.min(100, risk)
}

/**
 * Detailed risk analysis with specific factors.
 */
function calculateDetailedRisk(analysis: {
  coinsEarned24h: number
  eventCount24h: number
  avgDailyEvents: number
  maxDailyEvents: number
  daysActive: number
  softcapHits: number
}): { riskScore: number; riskFactors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let totalRisk = 0
  
  // High velocity
  const velocityThreshold = 150
  if (analysis.coinsEarned24h > velocityThreshold) {
    const severity = analysis.coinsEarned24h > 300 ? 'high' : analysis.coinsEarned24h > 200 ? 'medium' : 'low'
    const riskPoints = severity === 'high' ? 30 : severity === 'medium' ? 20 : 10
    totalRisk += riskPoints
    factors.push({
      type: 'high_velocity',
      severity,
      description: `Earned ${analysis.coinsEarned24h} coins in 24h (threshold: ${velocityThreshold})`,
      value: analysis.coinsEarned24h,
      threshold: velocityThreshold,
    })
  }
  
  // Event flood
  const eventThreshold = 40
  if (analysis.eventCount24h > eventThreshold) {
    const severity = analysis.eventCount24h > 100 ? 'high' : analysis.eventCount24h > 60 ? 'medium' : 'low'
    const riskPoints = severity === 'high' ? 30 : severity === 'medium' ? 20 : 10
    totalRisk += riskPoints
    factors.push({
      type: 'event_flood',
      severity,
      description: `${analysis.eventCount24h} events in 24h (threshold: ${eventThreshold})`,
      value: analysis.eventCount24h,
      threshold: eventThreshold,
    })
  }
  
  // Session spam (unusually high max vs average)
  if (analysis.avgDailyEvents > 0 && analysis.maxDailyEvents > analysis.avgDailyEvents * 3) {
    const severity = analysis.maxDailyEvents > analysis.avgDailyEvents * 5 ? 'high' : 'medium'
    const riskPoints = severity === 'high' ? 25 : 15
    totalRisk += riskPoints
    factors.push({
      type: 'session_spam',
      severity,
      description: `Peak day (${analysis.maxDailyEvents} events) is ${Math.round(analysis.maxDailyEvents / analysis.avgDailyEvents)}x average`,
      value: analysis.maxDailyEvents,
      threshold: Math.round(analysis.avgDailyEvents * 3),
    })
  }
  
  // New account with high activity
  if (analysis.daysActive <= 3 && analysis.coinsEarned24h > 100) {
    const severity = analysis.coinsEarned24h > 200 ? 'high' : 'medium'
    const riskPoints = severity === 'high' ? 25 : 15
    totalRisk += riskPoints
    factors.push({
      type: 'new_account',
      severity,
      description: `Account active for ${analysis.daysActive} days with ${analysis.coinsEarned24h} coins earned today`,
      value: analysis.daysActive,
      threshold: 7,
    })
  }
  
  // Frequent softcap hits
  if (analysis.softcapHits >= 3) {
    const severity = analysis.softcapHits >= 5 ? 'high' : 'medium'
    const riskPoints = severity === 'high' ? 20 : 10
    totalRisk += riskPoints
    factors.push({
      type: 'pattern_anomaly',
      severity,
      description: `Hit softcap ${analysis.softcapHits} times in 7 days`,
      value: analysis.softcapHits,
      threshold: 3,
    })
  }
  
  return {
    riskScore: Math.min(100, totalRisk),
    riskFactors: factors,
  }
}
