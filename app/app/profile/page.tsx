'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import {
  getUserProgression,
  getUserMilestones,
  getLevelLeaderboard,
} from '@/lib/services/progressionService'
import {
  getUserAchievementStats,
  getUserAchievements,
  getAllAchievements,
  type UserAchievement,
  type Achievement,
} from '@/lib/services/achievementService'
import { getUserGlobalStats } from '@/lib/services/leaderboardService'
import AchievementBadge from '@/components/AchievementBadge'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  FireIcon,
  TrophyIcon,
  StarIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

interface Stats {
  level: number
  currentXP: number
  xpNeeded: number
  xpPercentage: number
  totalXP: number
  currentStreak: number
  longestStreak: number
  totalGamesPlayed: number
  totalTimeSpent: number
  globalRank: number | null
  globalScore: number
  achievements: {
    unlockedCount: number
    totalCount: number
    completionPercentage: number
  }
  milestones: Array<{
    type: string
    milestone: number
    achieved: boolean
    description: string
  }>
}

// Mock stats for demo
const mockStats: Stats = {
  level: 12,
  currentXP: 2450,
  xpNeeded: 3000,
  xpPercentage: 82,
  totalXP: 15450,
  currentStreak: 7,
  longestStreak: 14,
  totalGamesPlayed: 45,
  totalTimeSpent: 5400,
  globalRank: 127,
  globalScore: 8750,
  achievements: {
    unlockedCount: 12,
    totalCount: 30,
    completionPercentage: 40,
  },
  milestones: [
    { type: 'games', milestone: 50, achieved: false, description: 'Spela 50 lekar' },
    { type: 'streak', milestone: 7, achieved: true, description: '7 dagars streak' },
    { type: 'level', milestone: 10, achieved: true, description: 'Nå nivå 10' },
  ],
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [levelRank, setLevelRank] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        // Use mock data when no user
        setStats(mockStats)
        setUseMockData(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const [progression, achievementStats, globalStats, achievements, allAch, leaderboard] =
          await Promise.all([
            getUserProgression(user.id),
            getUserAchievementStats(user.id),
            getUserGlobalStats(user.id),
            getUserAchievements(user.id),
            getAllAchievements(),
            getLevelLeaderboard(1000),
          ])

        const userRank = leaderboard.findIndex((entry) => entry.userId === user.id) + 1
        const milestones = await getUserMilestones(user.id)

        setStats({
          level: progression.level.level,
          currentXP: progression.level.currentXP,
          xpNeeded: progression.level.xpNeeded,
          xpPercentage: progression.level.xpPercentage,
          totalXP: progression.level.totalXP,
          currentStreak: progression.streak.currentStreak,
          longestStreak: progression.streak.longestStreak,
          totalGamesPlayed: progression.totalGamesPlayed,
          totalTimeSpent: progression.totalTimeSpent,
          globalRank: globalStats.rank,
          globalScore: globalStats.totalScore,
          achievements: {
            unlockedCount: achievementStats.unlockedCount,
            totalCount: achievementStats.totalCount,
            completionPercentage: achievementStats.completionPercentage,
          },
          milestones,
        })

        setUserAchievements(achievements)
        setAllAchievements(allAch)
        setLevelRank(userRank)
      } catch (err) {
        console.error('Error loading profile:', err)
        // Fallback to mock data
        setStats(mockStats)
        setUseMockData(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-48 bg-muted rounded-xl mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Kunde inte ladda profilen</p>
          <Button href="/app" variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tillbaka till Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Min Profil</h1>
        <p className="mt-1 text-muted-foreground">
          Se din progression och achievements
          {useMockData && <span className="text-xs text-muted-foreground ml-2">(demo-data)</span>}
        </p>
      </div>

      {/* Level Card - Hero style */}
      <Card variant="featured" className="bg-gradient-to-r from-primary to-primary/80 text-white overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <StarIcon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">Nivå</p>
                  <p className="text-4xl font-bold">{stats.level}</p>
                </div>
              </div>
              <p className="text-lg text-white/90">Totalt {stats.totalXP.toLocaleString()} XP</p>
              {levelRank && (
                <Badge className="mt-2 bg-white/20 text-white border-0">
                  #{levelRank} i nivåranking
                </Badge>
              )}
            </div>

            {/* XP Progress */}
            <div className="flex flex-col justify-center">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/80">XP till nästa nivå</span>
                <span className="font-semibold">
                  {stats.currentXP.toLocaleString()} / {stats.xpNeeded.toLocaleString()}
                </span>
              </div>
              <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${stats.xpPercentage}%` }}
                />
              </div>
              <p className="text-sm text-white/70 mt-2">
                {stats.xpNeeded - stats.currentXP} XP kvar till nivå {stats.level + 1}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FireIcon className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm text-muted-foreground">Streak</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bäst: {stats.longestStreak} dagar
            </p>
          </CardContent>
        </Card>

        {/* Games Played */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Lekar</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.totalGamesPlayed}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTime(stats.totalTimeSpent)} spelat
            </p>
          </CardContent>
        </Card>

        {/* Global Rank */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrophyIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">Rank</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats.globalRank ? `#${stats.globalRank}` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.globalScore.toLocaleString()} poäng
            </p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-muted-foreground">Achievements</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats.achievements.unlockedCount}
              <span className="text-lg text-muted-foreground">/{stats.achievements.totalCount}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.achievements.completionPercentage}% klart
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 text-yellow-500" />
              Milstolpar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    milestone.achieved
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-muted border-border'
                  }`}
                >
                  <div className={`text-2xl ${milestone.achieved ? '' : 'grayscale opacity-50'}`}>
                    🎯
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {milestone.description}
                    </p>
                  </div>
                  {milestone.achieved && (
                    <Badge variant="success" size="sm">Klar!</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {userAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-purple-500" />
                Senaste Achievements
              </CardTitle>
              <Button href="/app/profile/achievements" variant="ghost" size="sm">
                Visa alla
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {userAchievements
                .slice(0, 12)
                .filter((ua) => ua.achievement)
                .map((ua) => (
                  <AchievementBadge
                    key={ua.id}
                    achievement={ua.achievement!}
                    isUnlocked={true}
                    unlockedAt={ua.unlocked_at}
                    size="md"
                    showLabel={false}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Progress */}
      {allAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Achievement Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allAchievements.slice(0, 5).map((achievement) => {
                const isUnlocked = userAchievements.some(
                  (ua) => ua.achievement_id === achievement.id
                )
                return (
                  <div key={achievement.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <p className={`flex-1 ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {achievement.name}
                    </p>
                    {isUnlocked && (
                      <Badge variant="success" size="sm">Upplåst</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button href="/app/leaderboard" variant="outline">
          <ChartBarIcon className="h-4 w-4 mr-2" />
          Topplista
        </Button>
        <Button href="/app/games" variant="outline">
          <StarIcon className="h-4 w-4 mr-2" />
          Spela mer
        </Button>
      </div>
    </div>
  )
}
