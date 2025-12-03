'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  TrophyIcon,
  SparklesIcon,
  FireIcon,
  PlayIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui'

// Mock data - replace with real data fetching
const quickActions = [
  { icon: MagnifyingGlassIcon, label: 'Upptäck', href: '/app/browse', color: 'bg-primary/10 text-primary' },
  { icon: CalendarIcon, label: 'Planera', href: '/app/planner', color: 'bg-amber-500/10 text-amber-600' },
  { icon: PlayIcon, label: 'Spela', href: '/app/play', color: 'bg-emerald-500/10 text-emerald-600' },
  { icon: TrophyIcon, label: 'Topplista', href: '/app/leaderboard', color: 'bg-violet-500/10 text-violet-600' },
]

const recentActivities = [
  { id: '1', title: 'Bollkull', type: 'game', time: '2 timmar sedan' },
  { id: '2', title: 'Samarbetspussel', type: 'game', time: 'Igår' },
  { id: '3', title: 'Nya achievement: Första steget', type: 'achievement', time: 'Igår' },
]

export default function AppDashboard() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const { currentTenant, isLoadingTenants } = useTenant()

  // Calculate greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 10) return 'God morgon'
    if (hour < 18) return 'Hej'
    return 'God kväll'
  }
  const greeting = getGreeting()

  const userName = userProfile?.full_name || user?.user_metadata?.full_name || 'där'
  const firstName = userName.split(' ')[0]

  if (authLoading || isLoadingTenants) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border/50 p-6 md:p-8">
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {currentTenant?.name || 'Lekbanken'}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground max-w-md">
            Redo att hitta nya lekar och aktiviteter? Utforska vår samling eller fortsätt där du slutade.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Snabbåtgärder</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`rounded-xl p-3 ${action.color} transition-transform group-hover:scale-110`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FireIcon className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">3</span>
            </div>
            <p className="text-xs text-muted-foreground">Dagars streak</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <SparklesIcon className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">150</span>
            </div>
            <p className="text-xs text-muted-foreground">Mynt</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrophyIcon className="h-5 w-5 text-violet-500" />
              <span className="text-2xl font-bold">5</span>
            </div>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Senaste aktivitet</h2>
          <Link href="/app/gamification" className="text-sm text-primary hover:underline flex items-center gap-1">
            Visa alla <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        
        <Card>
          <CardContent className="divide-y divide-border">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 py-4 first:pt-6 last:pb-6">
                <div className={`rounded-lg p-2 ${
                  activity.type === 'achievement' 
                    ? 'bg-amber-500/10 text-amber-600' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {activity.type === 'achievement' ? (
                    <TrophyIcon className="h-5 w-5" />
                  ) : (
                    <PlayIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{activity.title}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Continue Where You Left Off */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Fortsätt utforska</h2>
        <Link 
          href="/app/browse"
          className="flex items-center justify-between rounded-2xl border border-border/50 bg-gradient-to-r from-primary/5 to-accent/5 p-6 transition-all hover:border-primary/30 hover:shadow-lg group"
        >
          <div>
            <p className="font-semibold text-foreground mb-1">Hitta nya lekar</p>
            <p className="text-sm text-muted-foreground">
              Utforska 100+ aktiviteter för alla åldrar och gruppstorlekar
            </p>
          </div>
          <div className="rounded-full bg-primary/10 p-3 transition-transform group-hover:translate-x-1">
            <ArrowRightIcon className="h-5 w-5 text-primary" />
          </div>
        </Link>
      </section>
    </div>
  )
}
