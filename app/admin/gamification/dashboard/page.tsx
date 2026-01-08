'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
  AdminCard,
  AdminEmptyState,
} from '@/components/admin/shared'
import { CardHeader, CardTitle, CardContent, Badge, Button, Switch } from '@/components/ui'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  FireIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

// ============================================================================
// TYPES (matching server types)
// ============================================================================

interface EconomyMetrics {
  mintRate24h: number
  mintRate7d: number
  mintRateChange: number
  totalMinted: number
  burnRate24h: number
  burnRate7d: number
  burnRateChange: number
  totalBurned: number
  netFlow24h: number
  netFlow7d: number
  inflationRate: number
  totalSupply: number
  activeUsers24h: number
  avgBalancePerUser: number
}

interface TopEarner {
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
  riskScore: number
}

interface RiskFactor {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  value: number
  threshold: number
}

interface SuspiciousActivity {
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

interface AutomationRule {
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

interface DashboardSnapshot {
  economy: EconomyMetrics
  topEarners: TopEarner[]
  suspiciousActivities: SuspiciousActivity[]
  rules: AutomationRule[]
  generatedAt: string
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function _RateChangeBadge({ change }: { change: number }) {
  const isPositive = change > 0
  const isNeutral = change === 0
  
  if (isNeutral) {
    return <Badge variant="secondary">0%</Badge>
  }
  
  return (
    <Badge variant={isPositive ? 'default' : 'outline'} className={isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
      {isPositive ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
      {isPositive ? '+' : ''}{change}%
    </Badge>
  )
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 70) {
    return <Badge variant="destructive">High Risk ({score})</Badge>
  }
  if (score >= 50) {
    return <Badge className="bg-orange-100 text-orange-800">Medium ({score})</Badge>
  }
  if (score >= 30) {
    return <Badge className="bg-yellow-100 text-yellow-800">Low ({score})</Badge>
  }
  return <Badge variant="secondary">Normal ({score})</Badge>
}

function StatusBadge({ status }: { status: SuspiciousActivity['status'] }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>
    case 'reviewed':
      return <Badge className="bg-blue-100 text-blue-800">Reviewed</Badge>
    case 'cleared':
      return <Badge className="bg-green-100 text-green-800">Cleared</Badge>
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>
  }
}

// ============================================================================
// ECONOMY PANEL
// ============================================================================

function EconomyPanel({ economy }: { economy: EconomyMetrics }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ChartBarIcon className="w-5 h-5" />
        Economy Overview
      </h3>
      
      <AdminStatGrid cols={4}>
        <AdminStatCard
          label="Mint Rate (24h)"
          value={formatNumber(economy.mintRate24h)}
          subtitle="DiceCoin minted"
          icon={<CurrencyDollarIcon className="w-5 h-5 text-green-600" />}
          trend={economy.mintRateChange > 0 ? 'up' : economy.mintRateChange < 0 ? 'down' : 'flat'}
          change={`${economy.mintRateChange >= 0 ? '+' : ''}${economy.mintRateChange}% vs prev`}
        />
        <AdminStatCard
          label="Burn Rate (24h)"
          value={formatNumber(economy.burnRate24h)}
          subtitle="DiceCoin burned"
          icon={<FireIcon className="w-5 h-5 text-orange-600" />}
          trend={economy.burnRateChange > 0 ? 'up' : economy.burnRateChange < 0 ? 'down' : 'flat'}
          change={`${economy.burnRateChange >= 0 ? '+' : ''}${economy.burnRateChange}% vs prev`}
        />
        <AdminStatCard
          label="Net Flow (24h)"
          value={formatNumber(economy.netFlow24h)}
          subtitle={economy.netFlow24h >= 0 ? 'Inflationary' : 'Deflationary'}
          icon={economy.netFlow24h >= 0 ? <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" /> : <ArrowTrendingDownIcon className="w-5 h-5 text-purple-600" />}
        />
        <AdminStatCard
          label="Active Users"
          value={formatNumber(economy.activeUsers24h)}
          subtitle="Last 24 hours"
          icon={<UserGroupIcon className="w-5 h-5 text-indigo-600" />}
        />
      </AdminStatGrid>
      
      <AdminStatGrid cols={4}>
        <AdminStatCard
          label="Total Supply"
          value={formatNumber(economy.totalSupply)}
          subtitle="In circulation"
        />
        <AdminStatCard
          label="Inflation Rate"
          value={`${economy.inflationRate}%`}
          subtitle="7-day net / supply"
        />
        <AdminStatCard
          label="Total Minted"
          value={formatNumber(economy.totalMinted)}
          subtitle="All time"
        />
        <AdminStatCard
          label="Avg Balance"
          value={formatNumber(economy.avgBalancePerUser)}
          subtitle="Per user"
        />
      </AdminStatGrid>
    </div>
  )
}

// ============================================================================
// TOP EARNERS PANEL
// ============================================================================

function TopEarnersPanel({ earners }: { earners: TopEarner[] }) {
  if (earners.length === 0) {
    return (
      <AdminCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5" />
            Top Earners (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEmptyState title="No earning data available" />
        </CardContent>
      </AdminCard>
    )
  }
  
  return (
    <AdminCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5" />
          Top Earners (7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium text-right">24h</th>
                <th className="pb-2 font-medium text-right">7d</th>
                <th className="pb-2 font-medium text-right">Level</th>
                <th className="pb-2 font-medium text-right">Events</th>
                <th className="pb-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {earners.map((earner, idx) => (
                <tr key={earner.userId} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{earner.displayName}</span>
                      {earner.email && (
                        <span className="text-xs text-muted-foreground">{earner.email}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono">{formatNumber(earner.coinsEarned24h)}</td>
                  <td className="py-2 text-right font-mono font-medium">{formatNumber(earner.coinsEarned7d)}</td>
                  <td className="py-2 text-right">{earner.level}</td>
                  <td className="py-2 text-right text-muted-foreground">{earner.eventCount24h}</td>
                  <td className="py-2">
                    <RiskBadge score={earner.riskScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </AdminCard>
  )
}

// ============================================================================
// SUSPICIOUS ACTIVITY PANEL
// ============================================================================

function SuspiciousActivityPanel({ activities }: { activities: SuspiciousActivity[] }) {
  if (activities.length === 0) {
    return (
      <AdminCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            Suspicious Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircleIcon className="w-5 h-5" />
            <span>No suspicious activity detected</span>
          </div>
        </CardContent>
      </AdminCard>
    )
  }
  
  return (
    <AdminCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
          Suspicious Activity ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.userId} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">{activity.displayName}</span>
                  {activity.email && (
                    <span className="text-xs text-muted-foreground">{activity.email}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge score={activity.riskScore} />
                  <StatusBadge status={activity.status} />
                </div>
              </div>
              
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>24h: {activity.coinsEarned24h} DC</span>
                <span>Events: {activity.eventCount24h}</span>
              </div>
              
              <div className="space-y-1">
                {activity.riskFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge 
                      variant="outline" 
                      className={
                        factor.severity === 'high' ? 'border-red-500 text-red-600' :
                        factor.severity === 'medium' ? 'border-orange-500 text-orange-600' :
                        'border-yellow-500 text-yellow-600'
                      }
                    >
                      {factor.type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-muted-foreground">{factor.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {activities.length > 5 && (
            <Button variant="outline" className="w-full">
              View all {activities.length} flagged users
            </Button>
          )}
        </div>
      </CardContent>
    </AdminCard>
  )
}

// ============================================================================
// RULES TOGGLE PANEL
// ============================================================================

function RulesPanel({ 
  rules, 
  onToggle 
}: { 
  rules: AutomationRule[]
  onToggle: (ruleId: string, isActive: boolean) => Promise<void>
}) {
  const [toggling, setToggling] = useState<string | null>(null)
  
  const handleToggle = async (rule: AutomationRule) => {
    setToggling(rule.id)
    try {
      await onToggle(rule.id, !rule.isActive)
    } finally {
      setToggling(null)
    }
  }
  
  if (rules.length === 0) {
    return (
      <AdminCard>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEmptyState title="No automation rules configured" />
        </CardContent>
      </AdminCard>
    )
  }
  
  return (
    <AdminCard>
      <CardHeader>
        <CardTitle>Automation Rules ({rules.filter(r => r.isActive).length} active)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Rule</th>
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium text-right">Reward</th>
                <th className="pb-2 font-medium text-right">24h</th>
                <th className="pb-2 font-medium text-right">7d</th>
                <th className="pb-2 font-medium">Cooldown</th>
                <th className="pb-2 font-medium text-center">Active</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 font-medium">{rule.name}</td>
                  <td className="py-2">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{rule.eventType}</code>
                  </td>
                  <td className="py-2 text-right">
                    {rule.rewardAmount} DC
                    {rule.xpAmount && <span className="text-muted-foreground"> + {rule.xpAmount} XP</span>}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">{rule.triggerCount24h}</td>
                  <td className="py-2 text-right font-mono text-muted-foreground">{rule.triggerCount7d}</td>
                  <td className="py-2">
                    {rule.cooldownType ? (
                      <Badge variant="outline">{rule.cooldownType}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      disabled={toggling === rule.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </AdminCard>
  )
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function GamificationDashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/admin/gamification/dashboard')
      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard: ${res.status}`)
      }
      
      const data = await res.json()
      setSnapshot(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])
  
  const handleRuleToggle = async (ruleId: string, isActive: boolean) => {
    const res = await fetch('/api/admin/gamification/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId, isActive }),
    })
    
    if (res.ok) {
      // Refresh dashboard
      await fetchDashboard()
    }
  }
  
  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Gamification', href: '/admin/gamification' },
          { label: 'Dashboard' },
        ]}
      />
      
      <AdminPageHeader
        title="Economy Dashboard"
        description="Monitor DiceCoin mint/burn rates, top earners, and suspicious activity"
        actions={
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {loading && !snapshot && (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {snapshot && (
        <div className="space-y-8">
          {/* Economy Overview */}
          <EconomyPanel economy={snapshot.economy} />
          
          {/* Two-column layout for lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Earners */}
            <TopEarnersPanel earners={snapshot.topEarners} />
            
            {/* Suspicious Activity */}
            <SuspiciousActivityPanel activities={snapshot.suspiciousActivities} />
          </div>
          
          {/* Rules Panel - full width */}
          <RulesPanel rules={snapshot.rules} onToggle={handleRuleToggle} />
          
          {/* Footer with timestamp */}
          <div className="text-center text-sm text-muted-foreground">
            Last updated: {new Date(snapshot.generatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </AdminPageLayout>
  )
}
