'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import {
  TrophyIcon,
  UserGroupIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Idag' },
  { value: 'week', label: 'Denna vecka' },
  { value: 'month', label: 'Denna månad' },
  { value: 'year', label: 'Detta år' },
  { value: 'all', label: 'All tid' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Alla kategorier' },
  { value: 'points', label: 'Poäng' },
  { value: 'games', label: 'Spelade spel' },
  { value: 'streak', label: 'Streak' },
  { value: 'achievements', label: 'Prestationer' },
]

const TYPE_OPTIONS = [
  { value: 'individual', label: 'Individuell' },
  { value: 'school', label: 'Skola' },
  { value: 'class', label: 'Klass' },
]

const TOP_PLAYERS = [
  { rank: 1, name: 'SuperSpelare99', avatar: '🏆', points: 45230, games: 342, streak: 28, trend: 'up' },
  { rank: 2, name: 'QuizMästaren', avatar: '🥈', points: 42180, games: 315, streak: 21, trend: 'up' },
  { rank: 3, name: 'PusselPro', avatar: '🥉', points: 39450, games: 298, streak: 14, trend: 'down' },
  { rank: 4, name: 'MinnasAllt', avatar: '⭐', points: 36890, games: 276, streak: 19, trend: 'up' },
  { rank: 5, name: 'MatteNinja', avatar: '🎯', points: 34560, games: 251, streak: 12, trend: 'same' },
  { rank: 6, name: 'OrdJägaren', avatar: '📚', points: 32100, games: 234, streak: 8, trend: 'up' },
  { rank: 7, name: 'SpelGuru', avatar: '🎮', points: 29870, games: 212, streak: 15, trend: 'down' },
  { rank: 8, name: 'TankeFenomen', avatar: '🧠', points: 27650, games: 198, streak: 6, trend: 'up' },
  { rank: 9, name: 'SnabbFingrarna', avatar: '⚡', points: 25430, games: 187, streak: 9, trend: 'same' },
  { rank: 10, name: 'VinnarVilja', avatar: '🌟', points: 23210, games: 165, streak: 11, trend: 'up' },
]

const TOP_SCHOOLS = [
  { rank: 1, name: 'Stockholms Grundskola', students: 156, avgPoints: 2450, totalGames: 4521 },
  { rank: 2, name: 'Göteborgs Förskola', students: 42, avgPoints: 2280, totalGames: 2134 },
  { rank: 3, name: 'Uppsala Skola', students: 89, avgPoints: 2150, totalGames: 3456 },
  { rank: 4, name: 'Malmö Daghem', students: 35, avgPoints: 1980, totalGames: 1876 },
  { rank: 5, name: 'Lund International', students: 67, avgPoints: 1850, totalGames: 2543 },
]

const LEADERBOARD_STATS = [
  { label: 'Totala spelare', value: '12,847', icon: UserGroupIcon },
  { label: 'Spel spelade idag', value: '3,241', icon: ChartBarIcon },
  { label: 'Högsta streak', value: '45 dagar', icon: FireIcon },
  { label: 'Nya rekord idag', value: '127', icon: SparklesIcon },
]

export default function LeaderboardSandboxPage() {
  const [period, setPeriod] = useState('month')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('individual')

  return (
    <SandboxShell
      moduleId="admin-leaderboard"
      title="Leaderboard"
      description="Topplistor, statistik"
    >
      <div className="space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline">
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Inställningar
            </Button>
            <Button>
              Exportera data
            </Button>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEADERBOARD_STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <Select
                  options={PERIOD_OPTIONS}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <Select
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      type === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold text-lg">
                      {type === 'individual' ? 'Topspelare' : type === 'school' ? 'Topskolor' : 'Topklasser'}
                    </h3>
                  </div>
                  <Badge variant="secondary">Uppdateras varje timme</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {type === 'individual' ? (
                  <div className="space-y-2">
                    {TOP_PLAYERS.map((player) => (
                      <div
                        key={player.rank}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                          player.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                            player.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                            player.rank === 2 ? 'bg-gray-300 text-gray-700' :
                            player.rank === 3 ? 'bg-orange-300 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {player.rank <= 3 ? player.avatar : player.rank}
                          </div>
                          <div>
                            <p className="font-semibold">{player.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{player.games} spel</span>
                              <span className="flex items-center gap-1">
                                <FireIcon className="h-3 w-3 text-orange-500" />
                                {player.streak} dagar
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg">{player.points.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">poäng</p>
                          </div>
                          {player.trend === 'up' && (
                            <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                          )}
                          {player.trend === 'down' && (
                            <ArrowTrendingUpIcon className="h-5 w-5 text-red-500 rotate-180" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {TOP_SCHOOLS.map((school) => (
                      <div
                        key={school.rank}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          school.rank <= 3 ? 'bg-gradient-to-r from-blue-50 to-transparent' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                            school.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                            school.rank === 2 ? 'bg-gray-300 text-gray-700' :
                            school.rank === 3 ? 'bg-orange-300 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {school.rank}
                          </div>
                          <div>
                            <p className="font-semibold">{school.name}</p>
                            <p className="text-xs text-gray-500">{school.students} elever</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{school.avgPoints.toLocaleString()} snitt</p>
                          <p className="text-xs text-gray-500">{school.totalGames.toLocaleString()} spel totalt</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Today's Champions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Dagens hjältar</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: 'Mest poäng idag', name: 'SuperSpelare99', value: '2,450 poäng' },
                    { title: 'Flest spel idag', name: 'SpelGuru', value: '47 spel' },
                    { title: 'Längsta streak', name: 'QuizMästaren', value: '28 dagar' },
                  ].map((item) => (
                    <div key={item.title} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">{item.title}</p>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-primary">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Adminåtgärder</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Redigera poängsystem
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Hantera spelarkonton
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Skapa tävling
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600">
                  Återställ topplista
                </Button>
              </CardContent>
            </Card>

            {/* Recent Records */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Nya rekord</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { player: 'MinnasAllt', record: 'Bästa tid Minneslek', time: '12 min sedan' },
                    { player: 'MatteNinja', record: 'Högsta poäng Matteknep', time: '1 tim sedan' },
                    { player: 'OrdJägaren', record: 'Längsta ord hittat', time: '2 tim sedan' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.player}</p>
                        <p className="text-xs text-gray-500">{item.record}</p>
                      </div>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Filter: period, kategori, typ</li>
            <li>Podium och full rankinglista</li>
            <li>Dagens hjältar med statistik</li>
            <li>Adminåtgärder: återställ, exportera</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
