'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  FireIcon,
  TrophyIcon,
  StarIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const mockStats = {
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
    { type: 'games', achieved: true, description: 'Spela 25 lekar' },
    { type: 'streak', achieved: true, description: '7 dagars streak' },
    { type: 'level', achieved: true, description: 'Nå nivå 10' },
    { type: 'games', achieved: false, description: 'Spela 50 lekar' },
  ],
}

const mockAchievements = [
  { id: '1', name: 'Första leken', icon: '🎮' },
  { id: '2', name: 'Teamplayer', icon: '👥' },
  { id: '3', name: 'Morgonfågel', icon: '🌅' },
  { id: '4', name: 'Steak Master', icon: '🔥' },
  { id: '5', name: 'Explorer', icon: '🗺️' },
  { id: '6', name: 'Favorit', icon: '⭐' },
]

export default function ProfileSandbox() {
  const formatTime = (seconds: number): string => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
  }

  return (
    <SandboxShell
      moduleId="app-profile"
      title="Profile"
      description="Förhandsvisning av profilsidan med nivå, XP, achievements och milestones."
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Min Profil</h1>
          <p className="mt-1 text-gray-600">Se din progression och achievements</p>
            </div>

            {/* Level Card */}
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
                        <p className="text-4xl font-bold">{mockStats.level}</p>
                      </div>
                    </div>
                    <p className="text-lg text-white/90">Totalt {mockStats.totalXP.toLocaleString()} XP</p>
                    <Badge className="mt-2 bg-white/20 text-white border-0">
                      #127 i nivåranking
                    </Badge>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/80">XP till nästa nivå</span>
                      <span className="font-semibold">
                        {mockStats.currentXP.toLocaleString()} / {mockStats.xpNeeded.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-500 rounded-full"
                        style={{ width: `${mockStats.xpPercentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/70 mt-2">
                      {mockStats.xpNeeded - mockStats.currentXP} XP kvar till nivå {mockStats.level + 1}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <FireIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <span className="text-sm text-gray-500">Streak</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{mockStats.currentStreak}</p>
                  <p className="text-xs text-gray-500 mt-1">Bäst: {mockStats.longestStreak} dagar</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ChartBarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500">Lekar</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{mockStats.totalGamesPlayed}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTime(mockStats.totalTimeSpent)} spelat</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrophyIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-500">Rank</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">#{mockStats.globalRank}</p>
                  <p className="text-xs text-gray-500 mt-1">{mockStats.globalScore.toLocaleString()} poäng</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-500">Achievements</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {mockStats.achievements.unlockedCount}
                    <span className="text-lg text-gray-400">/{mockStats.achievements.totalCount}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{mockStats.achievements.completionPercentage}% klart</p>
                </CardContent>
              </Card>
            </div>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Milstolpar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mockStats.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                        milestone.achieved
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`text-2xl ${milestone.achieved ? '' : 'grayscale opacity-50'}`}>
                        🎯
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${milestone.achieved ? 'text-gray-900' : 'text-gray-500'}`}>
                          {milestone.description}
                        </p>
                      </div>
                      {milestone.achieved && <Badge variant="success" size="sm">Klar!</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-purple-500" />
                    Senaste Achievements
                  </CardTitle>
                  <Button variant="ghost" size="sm">Visa alla</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {mockAchievements.map((achievement) => (
                    <div key={achievement.id} className="text-center">
                      <div className="w-14 h-14 mx-auto mb-1 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-2xl">
                        {achievement.icon}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{achievement.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button variant="outline">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Topplista
              </Button>
              <Button variant="outline">
                <StarIcon className="h-4 w-4 mr-2" />
                Spela mer
              </Button>
            </div>
          </div>

        {/* Link to real page */}
        <div className="mt-6 text-center">
          <Button href="/app/profile" variant="outline">
            Öppna riktiga sidan →
          </Button>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Nivå och XP-progress med gradient-bar</li>
            <li>Milestones med checkmarks</li>
            <li>Achievement-grid med ikoner</li>
            <li>Quick actions för snabb navigation</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
    </SandboxShell>
  )
}
