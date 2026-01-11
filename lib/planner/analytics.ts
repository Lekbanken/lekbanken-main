/**
 * Plan Analytics Types and Utilities
 * 
 * Provides analytics data for plans including usage stats,
 * engagement metrics, and insights.
 */

import type { PlannerPlan, PlannerBlock, PlannerStatus, PlannerVisibility } from '@/types/planner'
import { defaultLocale, formatNumber, formatPercent, formatDuration } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Metric Types
// ─────────────────────────────────────────────────────────────────────────────

/** Time-based aggregation period */
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

/** Single data point in a time series */
export type TimeSeriesPoint = {
  timestamp: string // ISO date
  value: number
  label?: string
}

/** Usage stats for a single plan */
export type PlanUsageStats = {
  planId: string
  planName: string
  /** Number of times the plan was viewed */
  viewCount: number
  /** Number of times the plan was copied */
  copyCount: number
  /** Number of completed runs/sessions */
  runCount: number
  /** Number of times shared */
  shareCount: number
  /** Average run completion rate (0-1) */
  avgCompletionRate: number
  /** Average rating if available */
  avgRating?: number
  /** Last time the plan was used */
  lastUsedAt: string | null
}

/** Aggregate stats across all plans for a user/tenant */
export type PlanAggregateStats = {
  /** Total number of plans */
  totalPlans: number
  /** Plans by status */
  byStatus: Record<PlannerStatus, number>
  /** Plans by visibility */
  byVisibility: Record<PlannerVisibility, number>
  /** Total time across all plans (minutes) */
  totalTimeMinutes: number
  /** Average plan duration (minutes) */
  avgPlanDuration: number
  /** Total blocks across all plans */
  totalBlocks: number
  /** Average blocks per plan */
  avgBlocksPerPlan: number
  /** Most used game IDs */
  topGames: Array<{ gameId: string; gameTitle: string; usageCount: number }>
  /** Block type distribution */
  blockTypeDistribution: Record<PlannerBlock['blockType'], number>
}

/** Plan insights and recommendations */
export type PlanInsight = {
  id: string
  type: 'info' | 'success' | 'warning' | 'improvement'
  title: string
  description: string
  metric?: {
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'stable'
    changePercent?: number
  }
  action?: {
    label: string
    href: string
  }
}

/** Complete analytics response */
export type PlanAnalyticsResponse = {
  period: AnalyticsPeriod
  periodStart: string
  periodEnd: string
  aggregateStats: PlanAggregateStats
  topPlans: PlanUsageStats[]
  insights: PlanInsight[]
  activityTimeSeries: TimeSeriesPoint[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate aggregate stats from a list of plans
 */
export function calculateAggregateStats(plans: PlannerPlan[]): PlanAggregateStats {
  const byStatus: Record<PlannerStatus, number> = {
    draft: 0,
    published: 0,
    modified: 0,
    archived: 0,
  }
  
  const byVisibility: Record<PlannerVisibility, number> = {
    private: 0,
    tenant: 0,
    public: 0,
  }
  
  const blockTypeDistribution: Record<PlannerBlock['blockType'], number> = {
    game: 0,
    pause: 0,
    preparation: 0,
    custom: 0,
  }
  
  const gameUsage: Record<string, { id: string; title: string; count: number }> = {}
  
  let totalTime = 0
  let totalBlocks = 0
  
  for (const plan of plans) {
    byStatus[plan.status]++
    byVisibility[plan.visibility]++
    
    for (const block of plan.blocks) {
      totalBlocks++
      totalTime += block.durationMinutes ?? 0
      blockTypeDistribution[block.blockType]++
      
      if (block.blockType === 'game' && block.game) {
        const gameId = block.game.id
        if (!gameUsage[gameId]) {
          gameUsage[gameId] = {
            id: gameId,
            title: block.game.title,
            count: 0,
          }
        }
        gameUsage[gameId].count++
      }
    }
  }
  
  const topGames = Object.values(gameUsage)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((g) => ({ gameId: g.id, gameTitle: g.title, usageCount: g.count }))
  
  return {
    totalPlans: plans.length,
    byStatus,
    byVisibility,
    totalTimeMinutes: totalTime,
    avgPlanDuration: plans.length > 0 ? Math.round(totalTime / plans.length) : 0,
    totalBlocks,
    avgBlocksPerPlan: plans.length > 0 ? Math.round((totalBlocks / plans.length) * 10) / 10 : 0,
    topGames,
    blockTypeDistribution,
  }
}

/**
 * Generate insights from aggregate stats
 */
export function generateInsights(stats: PlanAggregateStats): PlanInsight[] {
  const insights: PlanInsight[] = []
  
  // Check for draft plans that might be forgotten
  if (stats.byStatus.draft > 5) {
    insights.push({
      id: 'many-drafts',
      type: 'info',
      title: 'Många utkast',
      description: `Du har ${stats.byStatus.draft} opublicerade utkast. Överväg att publicera eller arkivera dem.`,
      metric: {
        label: 'Utkast',
        value: stats.byStatus.draft,
      },
      action: {
        label: 'Visa utkast',
        href: '/app/planner?status=draft',
      },
    })
  }
  
  // Check for archived plans that could be cleaned up
  if (stats.byStatus.archived > 10) {
    insights.push({
      id: 'many-archived',
      type: 'info',
      title: 'Många arkiverade planer',
      description: `Du har ${stats.byStatus.archived} arkiverade planer. Överväg att rensa gamla.`,
      metric: {
        label: 'Arkiverade',
        value: stats.byStatus.archived,
      },
    })
  }
  
  // Celebrate published plans
  if (stats.byStatus.published > 0) {
    insights.push({
      id: 'published-plans',
      type: 'success',
      title: 'Aktiva planer',
      description: `Du har ${stats.byStatus.published} publicerade planer redo att användas!`,
      metric: {
        label: 'Publicerade',
        value: stats.byStatus.published,
      },
    })
  }
  
  // Suggest adding variety if most blocks are games
  if (stats.totalBlocks > 10) {
    const gameRatio = stats.blockTypeDistribution.game / stats.totalBlocks
    if (gameRatio > 0.8) {
      insights.push({
        id: 'add-variety',
        type: 'improvement',
        title: 'Lägg till variation',
        description: 'De flesta block är lekar. Överväg att lägga till pauser, reflektioner eller övergångar.',
        metric: {
          label: 'Lekar',
          value: `${Math.round(gameRatio * 100)}%`,
        },
      })
    }
  }
  
  // Warn about very short average duration
  if (stats.avgPlanDuration > 0 && stats.avgPlanDuration < 15) {
    insights.push({
      id: 'short-plans',
      type: 'warning',
      title: 'Korta planer',
      description: `Genomsnittlig plantid är bara ${stats.avgPlanDuration} minuter. Överväg att lägga till fler aktiviteter.`,
      metric: {
        label: 'Genomsnitt',
        value: `${stats.avgPlanDuration} min`,
      },
    })
  }
  
  // Celebrate top game if one stands out
  if (stats.topGames.length > 0 && stats.topGames[0].usageCount > 5) {
    const topGame = stats.topGames[0]
    insights.push({
      id: 'top-game',
      type: 'success',
      title: 'Favoritlek',
      description: `"${topGame.gameTitle}" är din mest använda lek med ${topGame.usageCount} användningar.`,
      metric: {
        label: 'Användningar',
        value: topGame.usageCount,
      },
    })
  }
  
  return insights
}

/**
 * Format analytics for display
 * @param value - The numeric value to format
 * @param type - The type of formatting to apply
 * @param locale - Optional locale code (defaults to system default)
 */
export function formatAnalyticsValue(
  value: number,
  type: 'count' | 'percent' | 'duration',
  locale: string = defaultLocale
): string {
  switch (type) {
    case 'count':
      return formatNumber(value, locale)
    case 'percent':
      return formatPercent(value, locale)
    case 'duration':
      return formatDuration(value, locale)
    default:
      return String(value)
  }
}
