'use client'

import { useState } from 'react'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select } from '@/components/ui'
import {
  TrophyIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChartBarIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

const mockLeaderboard = [
  { id: '1', name: 'Anna S.', score: 9850, plays: 125, bestScore: 980, avgScore: 78.8, achievements: 18 },
  { id: '2', name: 'Erik L.', score: 8720, plays: 98, bestScore: 890, avgScore: 88.9, achievements: 15 },
  { id: '3', name: 'Maria K.', score: 7650, plays: 87, bestScore: 820, avgScore: 87.9, achievements: 12 },
  { id: '4', name: 'Johan P.', score: 6540, plays: 76, bestScore: 750, avgScore: 86.0, achievements: 10 },
  { id: '5', name: 'Sara H.', score: 5430, plays: 65, bestScore: 680, avgScore: 83.5, achievements: 8 },
  { id: '6', name: 'Anders N.', score: 4320, plays: 54, bestScore: 620, avgScore: 80.0, achievements: 7 },
  { id: '7', name: 'Lisa B.', score: 3210, plays: 43, bestScore: 560, avgScore: 74.6, achievements: 5 },
  { id: '8', name: 'Oscar M.', score: 2100, plays: 32, bestScore: 480, avgScore: 65.6, achievements: 3 },
]

const gameOptions = [
  { value: '1', label: 'Kurragömma' },
  { value: '2', label: 'Stafett' },
  { value: '3', label: 'Ordlek' },
]

export default function LeaderboardSandbox() {
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global')
  const [selectedGame, setSelectedGame] = useState('1')

  const getMedalStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { emoji: '🥇', bgClass: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' }
      case 2:
        return { emoji: '🥈', bgClass: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800' }
      case 3:
        return { emoji: '🥉', bgClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' }
      default:
        return { emoji: null, bgClass: 'bg-gray-100 text-gray-700' }
    }
  }

  return (
    <SandboxShell
      moduleId="app-leaderboard"
      title="Leaderboard"
      description="Förhandsvisning av topplistan med podium och ranking."
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Topplista</h1>
          <p className="mt-1 text-gray-600">Se hur du står dig mot andra spelare</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-64">
                <Select
                  label="Välj lek"
                  value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      options={gameOptions}
                    />
                  </div>

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
            <div className="grid grid-cols-3 gap-4">
              {/* 2nd Place */}
              <Card className="mt-8">
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center text-3xl">
                    🥈
                  </div>
                  <p className="font-bold text-gray-900">{mockLeaderboard[1].name}</p>
                  <p className="text-2xl font-bold text-gray-600">{mockLeaderboard[1].score.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{mockLeaderboard[1].plays} omgångar</p>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card variant="featured" className="bg-gradient-to-b from-yellow-400 to-yellow-500">
                <CardContent className="p-4 text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-white flex items-center justify-center text-4xl shadow-lg">
                    🥇
                  </div>
                  <p className="font-bold text-white text-lg">{mockLeaderboard[0].name}</p>
                  <p className="text-3xl font-bold text-white">{mockLeaderboard[0].score.toLocaleString()}</p>
                  <p className="text-sm text-yellow-100">{mockLeaderboard[0].plays} omgångar</p>
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
                  <p className="font-bold text-gray-900">{mockLeaderboard[2].name}</p>
                  <p className="text-2xl font-bold text-gray-600">{mockLeaderboard[2].score.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{mockLeaderboard[2].plays} omgångar</p>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-primary" />
                  {activeTab === 'global' ? 'Global Ranking' : 'Vänner Ranking'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockLeaderboard.map((entry, index) => {
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
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${bgClass}`}>
                          {emoji || rank}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{entry.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{entry.plays} omgångar</span>
                            <span>Bäst: {entry.bestScore}</span>
                            <span className="hidden sm:inline">Snitt: {entry.avgScore.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">{entry.score.toLocaleString()}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <StarIcon className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-gray-500">{entry.achievements} achievements</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <UserGroupIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Totalt spelare</p>
                  <p className="text-2xl font-bold text-gray-900">{mockLeaderboard.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ChartBarIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Snittpoäng</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(mockLeaderboard.reduce((sum, e) => sum + e.score, 0) / mockLeaderboard.length)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrophyIcon className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Toppresultat</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockLeaderboard[0].score.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Link to real page */}
        <div className="mt-6 text-center">
          <Button href="/app/leaderboard" variant="outline">
            Öppna riktiga sidan →
          </Button>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Podium med topp 3: guld, silver, brons</li>
            <li>Full rankinglista med scroll</li>
            <li>Stats-summary med snittvärden</li>
            <li>Tidsfilter: vecka/månad/alla tider</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
    </SandboxShell>
  )
}
