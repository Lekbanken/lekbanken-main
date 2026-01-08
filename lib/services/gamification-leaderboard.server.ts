import 'server-only'

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

// ============================================================================
// TYPES
// ============================================================================

export type LeaderboardType = 
  | 'coins_earned'     // Total coins earned (all time)
  | 'coins_balance'    // Current coin balance
  | 'xp_total'         // Total XP earned
  | 'level'            // Current level
  | 'streak_current'   // Current streak days
  | 'streak_best'      // Best streak ever
  | 'sessions_hosted'  // Total sessions hosted
  | 'achievements'     // Total achievements unlocked

export type LeaderboardPeriod = 'all_time' | 'monthly' | 'weekly' | 'daily'

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl: string | null
  value: number
  level?: number
  isCurrentUser: boolean
}

export interface LeaderboardResult {
  type: LeaderboardType
  period: LeaderboardPeriod
  tenantId: string
  entries: LeaderboardEntry[]
  currentUserRank: number | null
  currentUserEntry: LeaderboardEntry | null
  totalParticipants: number
  updatedAt: string
}

export interface LeaderboardPreferences {
  leaderboardVisible: boolean
  optedOutAt: string | null
  notificationsEnabled: boolean
}

type LeaderboardViewRow = Database['public']['Views']['v_gamification_leaderboard']['Row']

// ============================================================================
// LEADERBOARD VISIBILITY (USER CONTROLS)
// ============================================================================

/**
 * Get user's leaderboard preferences for a tenant.
 */
export async function getLeaderboardPreferences(
  tenantId: string
): Promise<LeaderboardPreferences> {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { leaderboardVisible: true, optedOutAt: null, notificationsEnabled: true }
  }

  const { data } = await supabase
    .from('user_gamification_preferences')
    .select('leaderboard_visible, leaderboard_opted_out_at, notifications_enabled')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    leaderboardVisible: data?.leaderboard_visible ?? true, // Default: visible
    optedOutAt: data?.leaderboard_opted_out_at ?? null,
    notificationsEnabled: data?.notifications_enabled ?? true,
  }
}

/**
 * Toggle leaderboard visibility for the current user.
 * Uses the set_leaderboard_visibility RPC function.
 */
export async function setLeaderboardVisibility(
  tenantId: string,
  visible: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient()

  const { error } = await supabase.rpc('set_leaderboard_visibility', {
    p_tenant_id: tenantId,
    p_visible: visible,
  })

  if (error) {
    console.error('[leaderboard] visibility toggle failed', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

/**
 * Get leaderboard rankings for a tenant.
 * Respects user opt-out preferences.
 */
export async function getLeaderboard(
  tenantId: string,
  type: LeaderboardType = 'coins_earned',
  period: LeaderboardPeriod = 'all_time',
  limit: number = 50
): Promise<LeaderboardResult> {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  // For all-time stats, use the prebuilt view
  if (period === 'all_time') {
    return getLeaderboardAllTime(tenantId, type, limit, currentUserId)
  }

  // For period-based leaderboards, query daily earnings
  return getLeaderboardByPeriod(tenantId, type, period, limit, currentUserId)
}

/**
 * All-time leaderboard using the v_gamification_leaderboard view.
 */
async function getLeaderboardAllTime(
  tenantId: string,
  type: LeaderboardType,
  limit: number,
  currentUserId: string | null
): Promise<LeaderboardResult> {
  const supabase = await createServerRlsClient()

  // Map type to column
  const orderColumn = getOrderColumn(type)

  const { data: entries, error } = await supabase
    .from('v_gamification_leaderboard')
    .select('*')
    .eq('tenant_id', tenantId)
    .order(orderColumn, { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[leaderboard] query failed', error)
    return emptyResult(tenantId, type, 'all_time')
  }

  // Get user profiles for display names
  const userIds = entries?.map((e: LeaderboardViewRow) => e.user_id) ?? []
  const profiles = await getUserProfiles(userIds)

  // Transform entries
  const leaderboardEntries: LeaderboardEntry[] = (entries ?? []).map((entry: LeaderboardViewRow, index: number) => ({
    rank: index + 1,
    userId: entry.user_id,
    displayName: profiles.get(entry.user_id)?.displayName ?? maskEmail(entry.email),
    avatarUrl: profiles.get(entry.user_id)?.avatarUrl ?? null,
    value: getValueForType(entry, type),
    level: entry.level ?? 1,
    isCurrentUser: entry.user_id === currentUserId,
  }))

  // Find current user's entry and rank
  const currentUserEntry = leaderboardEntries.find((e) => e.isCurrentUser) ?? null
  const currentUserRank = currentUserEntry?.rank ?? null

  // If user is not in top N but is logged in, fetch their rank separately
  let userRankOutsideTop: number | null = null
  let userEntryOutsideTop: LeaderboardEntry | null = null

  if (currentUserId && !currentUserEntry) {
    const userRank = await getUserRankAllTime(tenantId, currentUserId, type)
    if (userRank) {
      userRankOutsideTop = userRank.rank
      userEntryOutsideTop = {
        rank: userRank.rank,
        userId: currentUserId,
        displayName: profiles.get(currentUserId)?.displayName ?? 'You',
        avatarUrl: profiles.get(currentUserId)?.avatarUrl ?? null,
        value: userRank.value,
        level: userRank.level,
        isCurrentUser: true,
      }
    }
  }

  // Get total count
  const { count } = await supabase
    .from('v_gamification_leaderboard')
    .select('user_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  return {
    type,
    period: 'all_time',
    tenantId,
    entries: leaderboardEntries,
    currentUserRank: currentUserRank ?? userRankOutsideTop,
    currentUserEntry: currentUserEntry ?? userEntryOutsideTop,
    totalParticipants: count ?? 0,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Period-based leaderboard (monthly/weekly/daily) using daily earnings.
 */
async function getLeaderboardByPeriod(
  tenantId: string,
  type: LeaderboardType,
  period: LeaderboardPeriod,
  limit: number,
  currentUserId: string | null
): Promise<LeaderboardResult> {
  const admin = await createServiceRoleClient()

  // Calculate date range
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday)
      break
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = new Date(0)
  }

  // Query daily earnings aggregated
  // Note: Only coins and XP are tracked in daily earnings
  if (!['coins_earned', 'xp_total'].includes(type)) {
    // Fall back to all-time for types we can't query by period
    return getLeaderboardAllTime(tenantId, type, limit, currentUserId)
  }

  const column = type === 'coins_earned' ? 'coins_earned' : 'xp_earned'

  const { data: rawData, error } = await admin
    .from('gamification_daily_earnings')
    .select(`
      user_id,
      ${column}
    `)
    .eq('tenant_id', tenantId)
    .gte('earning_date', startDate.toISOString().split('T')[0])

  if (error) {
    console.error('[leaderboard] period query failed', error)
    return emptyResult(tenantId, type, period)
  }

  type DailyEarningSlice = {
    user_id: string
    coins_earned?: number | null
    xp_earned?: number | null
  }

  const rows = rawData as DailyEarningSlice[] | null

  // Aggregate by user
  const userTotals = new Map<string, number>()
  for (const row of rows ?? []) {
    const current = userTotals.get(row.user_id) ?? 0
    const value = column === 'coins_earned' ? row.coins_earned ?? 0 : row.xp_earned ?? 0
    userTotals.set(row.user_id, current + value)
  }

  // Filter out opted-out users
  const { data: optedOut } = await admin
    .from('user_gamification_preferences')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('leaderboard_visible', false)

  const optedOutIds = new Set(optedOut?.map((o) => o.user_id) ?? [])

  // Sort and rank
  const sortedEntries = Array.from(userTotals.entries())
    .filter(([userId]) => !optedOutIds.has(userId))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  // Get profiles
  const userIds = sortedEntries.map(([userId]) => userId)
  const profiles = await getUserProfiles(userIds)

  const leaderboardEntries: LeaderboardEntry[] = sortedEntries.map(([userId, value], index) => ({
    rank: index + 1,
    userId,
    displayName: profiles.get(userId)?.displayName ?? 'User',
    avatarUrl: profiles.get(userId)?.avatarUrl ?? null,
    value,
    isCurrentUser: userId === currentUserId,
  }))

  const currentUserEntry = leaderboardEntries.find((e) => e.isCurrentUser) ?? null

  return {
    type,
    period,
    tenantId,
    entries: leaderboardEntries,
    currentUserRank: currentUserEntry?.rank ?? null,
    currentUserEntry,
    totalParticipants: userTotals.size - optedOutIds.size,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// USER RANK QUERIES
// ============================================================================

/**
 * Get a specific user's rank in the all-time leaderboard.
 */
async function getUserRankAllTime(
  tenantId: string,
  userId: string,
  type: LeaderboardType
): Promise<{ rank: number; value: number; level: number } | null> {
  const supabase = await createServerRlsClient()

  const orderColumn = getOrderColumn(type)

  // Get user's entry
  const { data: userEntry } = await supabase
    .from('v_gamification_leaderboard')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!userEntry) return null

  const userValue = getValueForType(userEntry, type)

  // Count how many users have a higher value
  const { count } = await supabase
    .from('v_gamification_leaderboard')
    .select('user_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gt(orderColumn, userValue)

  return {
    rank: (count ?? 0) + 1,
    value: userValue,
    level: userEntry.level ?? 1,
  }
}

// ============================================================================
// ANTI-GAMING CONSIDERATIONS
// ============================================================================

/**
 * Check if a user appears to be gaming the leaderboard.
 * Returns a risk score (0-100) and reasons.
 * 
 * This is for admin review, not automatic action.
 */
export async function checkLeaderboardAbuseRisk(
  tenantId: string,
  userId: string
): Promise<{
  riskScore: number
  reasons: string[]
  recommendations: string[]
}> {
  const admin = await createServiceRoleClient()
  const reasons: string[] = []
  const recommendations: string[] = []
  let riskScore = 0

  // 1. Check for extreme earning velocity
  const { data: dailyEarnings } = await admin
    .from('gamification_daily_earnings')
    .select('coins_earned, xp_earned, event_count')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('earning_date', { ascending: false })
    .limit(7)

  if (dailyEarnings && dailyEarnings.length > 0) {
    const avgCoins = dailyEarnings.reduce((s, d) => s + d.coins_earned, 0) / dailyEarnings.length
    const avgEvents = dailyEarnings.reduce((s, d) => s + d.event_count, 0) / dailyEarnings.length

    // Flag if averaging >200 coins/day (2x softcap)
    if (avgCoins > 200) {
      riskScore += 25
      reasons.push(`High earning velocity: ${avgCoins.toFixed(0)} coins/day avg`)
    }

    // Flag if >50 events/day average
    if (avgEvents > 50) {
      riskScore += 20
      reasons.push(`High event frequency: ${avgEvents.toFixed(0)} events/day avg`)
    }
  }

  // 2. Check for suspicious session patterns
  const { count: sessionCount } = await admin
    .from('gamification_events')
    .select('id', { count: 'exact', head: true })
    .eq('actor_user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('event_type', 'session_completed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((sessionCount ?? 0) > 20) {
    riskScore += 30
    reasons.push(`${sessionCount} sessions in 24h (abnormal)`)
    recommendations.push('Review session logs for legitimate activity')
  }

  // 3. Check for rapid rank climbing
  // This would require historical rank snapshots - simplified check here
  const { data: userStats } = await admin
    .from('user_coins')
    .select('total_earned, created_at')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (userStats) {
    const accountAge = Date.now() - new Date(userStats.created_at).getTime()
    const accountDays = accountAge / (24 * 60 * 60 * 1000)
    const coinsPerDay = userStats.total_earned / Math.max(accountDays, 1)

    if (coinsPerDay > 150 && accountDays < 7) {
      riskScore += 25
      reasons.push(`New account with high earning rate: ${coinsPerDay.toFixed(0)} coins/day`)
      recommendations.push('Monitor account for continued pattern')
    }
  }

  // 4. Check for self-referral patterns (if invite system exists)
  // Would require checking invite relationships - skipped for now

  // Normalize score
  riskScore = Math.min(riskScore, 100)

  if (riskScore >= 50) {
    recommendations.push('Consider manual review of activity')
  }
  if (riskScore >= 75) {
    recommendations.push('Consider temporary leaderboard exclusion pending review')
  }

  return { riskScore, reasons, recommendations }
}

/**
 * Admin function to temporarily exclude a user from leaderboards.
 */
export async function adminSetLeaderboardExclusion(
  tenantId: string,
  userId: string,
  excluded: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await createServiceRoleClient()

  const { error } = await admin
    .from('user_gamification_preferences')
    .upsert({
      user_id: userId,
      tenant_id: tenantId,
      leaderboard_visible: !excluded,
      leaderboard_opted_out_at: excluded ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,tenant_id',
    })

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the admin action
  await admin.from('gamification_events').insert({
    event_type: excluded ? 'admin:leaderboard_exclusion' : 'admin:leaderboard_reinclusion',
    actor_user_id: userId,
    tenant_id: tenantId,
    source: 'admin',
    idempotency_key: `admin:leaderboard:${userId}:${Date.now()}`,
    metadata: { reason, excluded },
    created_at: new Date().toISOString(),
  })

  return { success: true }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getOrderColumn(type: LeaderboardType): string {
  switch (type) {
    case 'coins_earned':
      return 'total_earned'
    case 'coins_balance':
      return 'balance'
    case 'xp_total':
      return 'current_xp'
    case 'level':
      return 'level'
    case 'streak_current':
      return 'current_streak_days'
    case 'streak_best':
      return 'best_streak_days'
    default:
      return 'total_earned'
  }
}

function getValueForType(entry: LeaderboardViewRow, type: LeaderboardType): number {
  switch (type) {
    case 'coins_earned':
      return entry.total_earned ?? 0
    case 'coins_balance':
      return entry.balance ?? 0
    case 'xp_total':
      return entry.current_xp ?? 0
    case 'level':
      return entry.level ?? 1
    case 'streak_current':
      return entry.current_streak_days ?? 0
    case 'streak_best':
      return entry.best_streak_days ?? 0
    default:
      return 0
  }
}

async function getUserProfiles(
  userIds: string[]
): Promise<Map<string, { displayName: string; avatarUrl: string | null }>> {
  if (userIds.length === 0) return new Map()

  const supabase = await createServerRlsClient()
  const { data } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, email')
    .in('id', userIds)

  const profiles = new Map<string, { displayName: string; avatarUrl: string | null }>()
  for (const user of data ?? []) {
    profiles.set(user.id, {
      displayName: user.full_name || maskEmail(user.email),
      avatarUrl: user.avatar_url,
    })
  }

  return profiles
}

function maskEmail(email: string | null): string {
  if (!email) return 'User'
  const [local, domain] = email.split('@')
  if (!domain) return 'User'
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

function emptyResult(
  tenantId: string,
  type: LeaderboardType,
  period: LeaderboardPeriod
): LeaderboardResult {
  return {
    type,
    period,
    tenantId,
    entries: [],
    currentUserRank: null,
    currentUserEntry: null,
    totalParticipants: 0,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// LEADERBOARD STATS (ADMIN)
// ============================================================================

export interface LeaderboardStats {
  totalParticipants: number
  optedOutCount: number
  optedOutPercentage: number
  topEarnerCoins: number
  medianCoins: number
  flaggedForReview: number
}

/**
 * Get leaderboard statistics for admin dashboard.
 */
export async function getLeaderboardStats(tenantId: string): Promise<LeaderboardStats> {
  const admin = await createServiceRoleClient()

  // Get counts
  const { count: totalCount } = await admin
    .from('user_coins')
    .select('user_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const { count: optedOutCount } = await admin
    .from('user_gamification_preferences')
    .select('user_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('leaderboard_visible', false)

  // Get top earner
  const { data: topEarner } = await admin
    .from('v_gamification_leaderboard')
    .select('total_earned')
    .eq('tenant_id', tenantId)
    .order('total_earned', { ascending: false })
    .limit(1)
    .single()

  // Get all earnings for median calculation
  const { data: allEarnings } = await admin
    .from('user_coins')
    .select('total_earned')
    .eq('tenant_id', tenantId)
    .order('total_earned', { ascending: true })

  let medianCoins = 0
  if (allEarnings && allEarnings.length > 0) {
    const mid = Math.floor(allEarnings.length / 2)
    medianCoins = allEarnings.length % 2 !== 0
      ? allEarnings[mid].total_earned
      : (allEarnings[mid - 1].total_earned + allEarnings[mid].total_earned) / 2
  }

  const total = totalCount ?? 0
  const optedOut = optedOutCount ?? 0

  return {
    totalParticipants: total,
    optedOutCount: optedOut,
    optedOutPercentage: total > 0 ? Math.round((optedOut / total) * 100) : 0,
    topEarnerCoins: topEarner?.total_earned ?? 0,
    medianCoins,
    flaggedForReview: 0, // Would need abuse check integration
  }
}
