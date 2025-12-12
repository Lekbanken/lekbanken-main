'use client'

import AchievementBadge from '@/components/AchievementBadge'
import ScoreBoard from '@/components/ScoreBoard'
import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2'

type Achievement = {
  id: string;
  name: string;
  description: string;
  badge_color: string;
  icon_url: string | null;
  achievement_key: string;
  condition_type: string;
  condition_value: number;
  created_at: string;
};

const sampleAchievement: Achievement = {
  id: 'achv-1',
  name: 'Första steget',
  description: 'Fullföljde första utmaningen',
  badge_color: 'from-amber-400 to-amber-600',
  icon_url: null,
  achievement_key: 'first_step',
  condition_type: 'session_count',
  condition_value: 1,
  created_at: new Date().toISOString(),
}

const rareAchievement: Achievement = {
  id: 'achv-2',
  name: 'Sällsynt seger',
  description: 'Lås upp en svår prestation',
  badge_color: 'from-purple-500 to-indigo-600',
  icon_url: null,
  achievement_key: 'rare_victory',
  condition_type: 'score_milestone',
  condition_value: 1000,
  created_at: new Date().toISOString(),
}

export default function AchievementsSandbox() {
  return (
    <SandboxShellV2
      moduleId="achievements"
      title="Achievements & Scoreboard"
      description="Badges, lås/öppna-states och scoreboard-overlay."
    >
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AchievementBadge
            achievement={sampleAchievement}
            isUnlocked
            unlockedAt={new Date().toISOString()}
            size="md"
          />
          <AchievementBadge
            achievement={rareAchievement}
            isUnlocked={false}
            size="lg"
          />
          <AchievementBadge
            achievement={{ ...sampleAchievement, name: 'Liten badge' }}
            isUnlocked
            size="sm"
            showLabel={true}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">ScoreBoard (inline preview)</h2>
          <p className="text-sm text-muted-foreground">
            ScoreBoard kan visas inline i sandlådan så den inte täcker navigationen.
          </p>
          <ScoreBoard
            sessionId="session-123456"
            score={4200}
            gameTimeSeconds={90}
            variant="inline"
          />
        </div>
      </div>
    </SandboxShellV2>
  )
}
