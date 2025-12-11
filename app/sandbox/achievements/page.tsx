'use client'

import AchievementBadge from '@/components/AchievementBadge'
import ScoreBoard from '@/components/ScoreBoard'

const sampleAchievement = {
  id: 'achv-1',
  name: 'Första steget',
  description: 'Fullföljde första utmaningen',
  badge_color: 'from-amber-400 to-amber-600',
  icon_url: null,
} as const

const rareAchievement = {
  id: 'achv-2',
  name: 'Sällsynt seger',
  description: 'Lås upp en svår prestation',
  badge_color: 'from-purple-500 to-indigo-600',
  icon_url: null,
} as const

export default function AchievementsSandbox() {
  return (
    <div className="space-y-8 p-6 md:p-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Achievements & ScoreBoard</h1>
        <p className="text-muted-foreground">Snabbvy över badge-komponenten och scoreboard-overlay.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AchievementBadge
          achievement={sampleAchievement as any}
          isUnlocked
          unlockedAt={new Date().toISOString()}
          size="md"
        />
        <AchievementBadge
          achievement={rareAchievement as any}
          isUnlocked={false}
          size="lg"
        />
        <AchievementBadge
          achievement={{ ...sampleAchievement, name: 'Liten badge' } as any}
          isUnlocked
          size="sm"
          showLabel={true}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">ScoreBoard (fixed overlay)</h2>
        <p className="text-sm text-muted-foreground">
          ScoreBoard renderas fixed högst upp för att visa poäng/tid under spel.
        </p>
        <ScoreBoard sessionId="session-123456" score={4200} gameTimeSeconds={90} />
      </div>
    </div>
  )
}
