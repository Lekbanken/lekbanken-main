'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { PageTitleHeader } from '@/components/app/PageTitleHeader'
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
import { Badge, Button, Card, CardContent, InlineAlert } from '@/components/ui'
import { fetchJourneyFeed, fetchJourneySnapshot } from '@/features/journey/api'
import type { JourneyActivity, JourneySnapshot } from '@/features/journey/types'
import { fetchPinnedAchievements, type PinnedAchievementsPayload } from '@/features/gamification/api'
import { BadgeIcon } from '@/features/gamification/components/BadgeIcon'

type CosmeticLoadoutItem = {
  itemId: string
  name: string
  imageUrl: string | null
  isEquipped: boolean
}

const COSMETIC_LOADOUT_REQUIRED_LEVEL = 2

// Mock data - replace with real data fetching
const quickActions = [
  { icon: MagnifyingGlassIcon, label: 'Upptäck', href: '/app/browse', color: 'bg-primary/10 text-primary' },
  { icon: CalendarIcon, label: 'Planera', href: '/app/planner', color: 'bg-amber-500/10 text-amber-600' },
  { icon: PlayIcon, label: 'Spela', href: '/app/play', color: 'bg-emerald-500/10 text-emerald-600' },
  { icon: TrophyIcon, label: 'Topplista', href: '/app/leaderboard', color: 'bg-violet-500/10 text-violet-600' },
]

function formatRelativeTimeSv(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('sv', { numeric: 'auto' })
  const abs = Math.abs(seconds)

  if (abs < 60) return rtf.format(seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(days, 'day')
}

function activityIcon(activity: JourneyActivity) {
  switch (activity.type) {
    case 'achievement_unlocked':
      return TrophyIcon
    case 'session_completed':
      return PlayIcon
    case 'coin_earned':
    case 'coin_spent':
      return SparklesIcon
    case 'plan_progressed':
      return CalendarIcon
    default:
      return ClockIcon
  }
}

function activityAccent(activity: JourneyActivity): string {
  switch (activity.type) {
    case 'achievement_unlocked':
      return 'bg-amber-500/10 text-amber-600'
    case 'session_completed':
      return 'bg-emerald-500/10 text-emerald-600'
    case 'coin_earned':
    case 'coin_spent':
      return 'bg-primary/10 text-primary'
    case 'plan_progressed':
      return 'bg-violet-500/10 text-violet-600'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getNordicHour(): number {
  const now = new Date()
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/Stockholm',
    })
    const hour = Number(formatter.format(now))
    return Number.isNaN(hour) ? now.getHours() : hour
  } catch {
    return now.getHours()
  }
}

function getGreetingLine(name: string): string {
  const hour = getNordicHour()
  if (hour >= 5 && hour <= 9) return `God morgon ${name}`
  if (hour >= 10 && hour <= 11) return `God dag ${name}`
  if (hour >= 12 && hour <= 16) return `God eftermiddag ${name}`
  if (hour >= 17 && hour <= 22) return `God kväll ${name}`
  return `God kväll ${name}`
}

export default function AppDashboardPage() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const { currentTenant, isLoadingTenants } = useTenant()

  const userId = user?.id
  const tenantId = currentTenant?.id

  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null)
  const [activities, setActivities] = useState<JourneyActivity[]>([])
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false)
  const [pinned, setPinned] = useState<PinnedAchievementsPayload | null>(null)
  const [cosmeticItems, setCosmeticItems] = useState<CosmeticLoadoutItem[]>([])
  const [isCosmeticsLoading, setIsCosmeticsLoading] = useState(false)
  const [cosmeticsError, setCosmeticsError] = useState<string | null>(null)
  const [equipInFlightId, setEquipInFlightId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setIsActivitiesLoading(true)
        const [snapshotPayload, feedPayload, pinnedPayload] = await Promise.all([
          fetchJourneySnapshot(),
          fetchJourneyFeed({ limit: 10 }),
          tenantId ? fetchPinnedAchievements(tenantId) : Promise.resolve(null),
        ])
        if (!isMounted) return

        setSnapshot(snapshotPayload)
        setActivities(feedPayload.items)
        setPinned(pinnedPayload)
      } catch {
        if (!isMounted) return
        setSnapshot(null)
        setActivities([])
        setPinned(null)
      } finally {
        if (isMounted) setIsActivitiesLoading(false)
      }
    }

    if (userId) {
      load()
    }

    return () => {
      isMounted = false
    }
  }, [userId, tenantId])

  useEffect(() => {
    let isMounted = true

    const loadCosmetics = async () => {
      if (!userId || !tenantId) return

      try {
        setIsCosmeticsLoading(true)
        setCosmeticsError(null)

        const res = await fetch(`/api/cosmetics/loadout?tenantId=${encodeURIComponent(tenantId)}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`Loadout failed: ${res.status}`)

        const payload = (await res.json()) as {
          items?: Array<{ itemId: string; name: string; imageUrl: string | null; isEquipped: boolean }>
        }

        if (!isMounted) return
        setCosmeticItems(payload.items ?? [])
      } catch {
        if (!isMounted) return
        setCosmeticItems([])
        setCosmeticsError('Kunde inte ladda cosmetics.')
      } finally {
        if (isMounted) setIsCosmeticsLoading(false)
      }
    }

    loadCosmetics()

    return () => {
      isMounted = false
    }
  }, [userId, tenantId])

  const equipCosmetic = useCallback(
    async (itemId: string) => {
      const tenantId = currentTenant?.id
      if (!tenantId) return

      try {
        setEquipInFlightId(itemId)
        setCosmeticsError(null)

        const res = await fetch('/api/cosmetics/loadout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, itemId }),
        })

        if (res.status === 403) {
          const data = (await res.json().catch(() => null)) as { code?: string; requiredLevel?: number } | null
          if (data?.code === 'LEVEL_LOCKED') {
            setCosmeticsError(`Låst: nivå ${data.requiredLevel ?? COSMETIC_LOADOUT_REQUIRED_LEVEL}.`)
            return
          }
        }

        if (!res.ok) throw new Error(`Equip failed: ${res.status}`)

        setCosmeticItems((prev) => prev.map((c) => ({ ...c, isEquipped: c.itemId === itemId })))
      } catch {
        setCosmeticsError('Kunde inte utrusta.')
      } finally {
        setEquipInFlightId(null)
      }
    },
    [currentTenant?.id]
  )

  const userName = userProfile?.full_name || user?.user_metadata?.full_name || 'där'
  const firstName = userName.split(' ')[0]
  const greetingLine = useMemo(() => getGreetingLine(firstName), [firstName])

  const streakDays = snapshot?.streakDays ?? null
  const coinsBalance = snapshot?.coinsBalance ?? null
  const unlockedAchievements = snapshot?.unlockedAchievements ?? null
  const userLevel = snapshot?.level ?? 1
  const isCosmeticLoadoutUnlocked = userLevel >= COSMETIC_LOADOUT_REQUIRED_LEVEL
  const t = useTranslations('app')

  if (authLoading || isLoadingTenants) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <PageTitleHeader
        icon={<Image src="/lekbanken-icon.png" alt="Lekbanken" width={20} height={20} className="h-5 w-5" />}
        title="LEKBANKEN"
        subtitle={greetingLine}
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border/50 p-6 md:p-8">
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground mb-1">{currentTenant?.name || 'Lekbanken'}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('dashboard.heroTitle')}</h1>
          <p className="text-muted-foreground max-w-md">
            {t('dashboard.heroSubtitle')}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.quickActions')}</h2>
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
              <span className="text-2xl font-bold">{streakDays ?? '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.stats.streakDays')}</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <SparklesIcon className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{coinsBalance ?? '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.stats.coins')}</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrophyIcon className="h-5 w-5 text-violet-500" />
              <span className="text-2xl font-bold">{unlockedAchievements ?? '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.stats.achievements')}</p>
          </CardContent>
        </Card>
      </section>

      {/* Pinned Achievements */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.pinnedAchievements.title')}</h2>
          <Link href="/app/gamification/achievements" className="text-sm text-primary hover:underline">
            {t('dashboard.pinnedAchievements.manage')}
          </Link>
        </div>

        {pinned?.achievements?.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {pinned.achievements.slice(0, 3).map((a) => (
              <Card key={a.id} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <BadgeIcon 
                      iconConfig={a.icon_config}
                      size="sm"
                      showGlow
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.description ?? ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.pinnedAchievements.emptyHint')}
              </p>
              <div className="mt-3">
                <Link href="/app/gamification/achievements" className="inline-flex text-sm font-semibold text-primary hover:underline">
                  {t('dashboard.pinnedAchievements.goToAchievements')}
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Cosmetic Loadout */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.cosmetics.title')}</h2>
          <Link href="/app/shop" className="text-sm text-primary hover:underline">
            {t('dashboard.cosmetics.toShop')}
          </Link>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            {!isCosmeticLoadoutUnlocked ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('dashboard.cosmetics.locked')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.cosmetics.unlockHint')}</p>
                </div>
                <Badge variant="secondary">{t('dashboard.cosmetics.lockedLevel', { level: COSMETIC_LOADOUT_REQUIRED_LEVEL })}</Badge>
              </div>
            ) : (
              <div className="space-y-4">
                {cosmeticsError ? <InlineAlert variant="error">{cosmeticsError}</InlineAlert> : null}

                {isCosmeticsLoading ? (
                  <div className="py-2 text-sm text-muted-foreground">{t('dashboard.cosmetics.loading')}</div>
                ) : cosmeticItems.length === 0 ? (
                  <div className="py-2 text-sm text-muted-foreground">{t('dashboard.cosmetics.empty')}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {cosmeticItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.isEquipped ? 'Utrustad' : 'Inte utrustad'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={item.isEquipped ? 'outline' : 'default'}
                          disabled={item.isEquipped || equipInFlightId === item.itemId}
                          onClick={() => equipCosmetic(item.itemId)}
                        >
                          {item.isEquipped ? 'Utrustad' : equipInFlightId === item.itemId ? 'Utrustar…' : 'Utrusta'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.recentActivity.title')}</h2>
        </div>

        <Card>
          <CardContent className="divide-y divide-border">
            {isActivitiesLoading ? (
              <div className="py-6 text-sm text-muted-foreground">{t('dashboard.recentActivity.loading')}</div>
            ) : activities.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">{t('dashboard.recentActivity.empty')}</div>
            ) : (
              activities.map((activity) => {
                const Icon = activityIcon(activity)
                return (
                  <div key={activity.id} className="flex items-center gap-4 py-4 first:pt-6 last:pb-6">
                    <div className={`rounded-lg p-2 ${activityAccent(activity)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.href ? (
                        <Link href={activity.href} className="font-medium text-foreground truncate hover:underline">
                          {activity.title}
                        </Link>
                      ) : (
                        <p className="font-medium text-foreground truncate">{activity.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatRelativeTimeSv(activity.occurredAt)}
                      </p>
                      {activity.description ? (
                        <p className="text-sm text-muted-foreground truncate mt-1">{activity.description}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* Continue Where You Left Off */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.continue.title')}</h2>
        <Link
          href="/app/browse"
          className="flex items-center justify-between rounded-2xl border border-border/50 bg-gradient-to-r from-primary/5 to-accent/5 p-6 transition-all hover:border-primary/30 hover:shadow-lg group"
        >
          <div>
            <p className="font-semibold text-foreground mb-1">{t('dashboard.continue.findGames')}</p>
            <p className="text-sm text-muted-foreground">{t('dashboard.continue.exploreDescription')}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-3 transition-transform group-hover:translate-x-1">
            <ArrowRightIcon className="h-5 w-5 text-primary" />
          </div>
        </Link>
      </section>
    </div>
  )
}
