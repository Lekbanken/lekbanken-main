'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { getSocialLeaderboard, getFriendsLeaderboard, SocialLeaderboardEntry } from '@/lib/services/socialService'
import { supabase } from '@/lib/supabase/client'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select } from '@/components/ui'
import {
  TrophyIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChartBarIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

interface Game {
  id: string
  name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global')
  const [globalLeaderboard, setGlobalLeaderboard] = useState<SocialLeaderboardEntry[]>([])
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<SocialLeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load games on mount
  useEffect(() => {
    const loadGames = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('id, name')
          .eq('owner_tenant_id', currentTenant?.id || '')
          .order('name')

        if (error) {
          console.error('Error loading games:', error)
          return
        }

        setGames(data || [])
        if (data && data.length > 0) {
          setSelectedGameId(data[0].id)
        }
      } catch (err) {
        console.error('Error loading games:', err)
      }
    }

    if (currentTenant?.id) {
      loadGames()
    }
  }, [currentTenant?.id])

  // Load leaderboard data when game or tab changes
  useEffect(() => {
    if (!selectedGameId || !currentTenant?.id || !user?.id) return

    const loadLeaderboard = async () => {
      setIsLoading(true)
      try {
        if (activeTab === 'global') {
          const data = await getSocialLeaderboard(currentTenant.id, selectedGameId, 100, 0)
          setGlobalLeaderboard(data || [])
        } else {
          const data = await getFriendsLeaderboard(user.id, selectedGameId)
          setFriendsLeaderboard(data || [])
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err)
      }
      setIsLoading(false)
    }

    loadLeaderboard()
  }, [selectedGameId, activeTab, currentTenant?.id, user?.id])

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : friendsLeaderboard

  const getMedalStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { emoji: '🥇', bgClass: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' }
      case 2:
        return { emoji: '🥈', bgClass: 'bg-gradient-to-r from-gray-300 to-gray-400 text-foreground' }
      case 3:
        return { emoji: '🥉', bgClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' }
      default:
        return { emoji: null, bgClass: 'bg-muted text-muted-foreground' }
    }
  }

  const gameOptions = games.map(g => ({ value: g.id, label: g.name }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Topplista</h1>
        <p className="mt-1 text-muted-foreground">
          Se hur du står dig mot andra spelare
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Game Selector */}
            {games.length > 0 && (
              <div className="w-full sm:w-64">
                <Select
                  label="Välj lek"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  options={gameOptions}
                />
              </div>
            )}

            {/* Tab Toggle */}
            <div className="flex items-end gap-2">
              <Button
                variant={activeTab === 'global' ? 'default' : 'outline'}
                onClick={() => setActiveTab('global')}
                size="sm"
              >
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                Global
              </Button>
              <Button
                variant={activeTab === 'friends' ? 'default' : 'outline'}
                onClick={() => setActiveTab('friends')}
                size="sm"
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Vänner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {!isLoading && currentLeaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd Place */}
          <Card className="mt-8">
            <CardContent className="p-4 text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center text-3xl">
                🥈
              </div>
              <p className="font-bold text-foreground">{currentLeaderboard[1].user_id}</p>
              <p className="text-2xl font-bold text-muted-foreground">{currentLeaderboard[1].score.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{currentLeaderboard[1].total_plays} omgångar</p>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card variant="featured" className="bg-gradient-to-b from-yellow-400 to-yellow-500">
            <CardContent className="p-4 text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-white flex items-center justify-center text-4xl shadow-lg">
                🥇
              </div>
              <p className="font-bold text-white text-lg">{currentLeaderboard[0].user_id}</p>
              <p className="text-3xl font-bold text-white">{currentLeaderboard[0].score.toLocaleString()}</p>
              <p className="text-sm text-yellow-100">{currentLeaderboard[0].total_plays} omgångar</p>
              <Badge className="mt-2 bg-white/20 text-white border-0">
                <TrophyIcon className="h-3 w-3 mr-1" />
                Champion
              </Badge>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="mt-8">
            <CardContent className="p-4 text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 flex items-center justify-center text-3xl">
                🥉
              </div>
              <p className="font-bold text-foreground">{currentLeaderboard[2].user_id}</p>
              <p className="text-2xl font-bold text-muted-foreground">{currentLeaderboard[2].score.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{currentLeaderboard[2].total_plays} omgångar</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-primary" />
            {activeTab === 'global' ? 'Global Ranking' : 'Vänner Ranking'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : currentLeaderboard.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'global' ? 'Inga spelare än' : 'Du har inga vänner än'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentLeaderboard.map((entry, index) => {
                const rank = index + 1
                const { emoji, bgClass } = getMedalStyle(rank)
                const isTopTen = rank <= 10

                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg p-3 flex items-center gap-4 transition-all ${
                      isTopTen && rank > 3
                        ? 'bg-primary/5 border border-primary/10'
                        : rank <= 3
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${bgClass}`}>
                      {emoji || rank}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{entry.user_id}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{entry.total_plays} omgångar</span>
                        <span>Bäst: {entry.best_score || 0}</span>
                        <span className="hidden sm:inline">Snitt: {(entry.avg_score || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{entry.score.toLocaleString()}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <StarIcon className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">{entry.achievements_unlocked} achievements</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {currentLeaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <UserGroupIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Totalt spelare</p>
              <p className="text-2xl font-bold text-gray-900">{currentLeaderboard.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ChartBarIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Snittpoäng</p>
              <p className="text-2xl font-bold text-gray-900">
                {(currentLeaderboard.reduce((sum, e) => sum + e.score, 0) / currentLeaderboard.length).toFixed(0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrophyIcon className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Toppresultat</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentLeaderboard[0]?.score.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
