import Link from 'next/link';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AchievementsSection } from '@/features/gamification/components/AchievementsSection';
import { AchievementCard } from '@/features/gamification/components/AchievementCard';
import { ProgressOverview } from '@/features/gamification/components/ProgressOverview';
import { mockAchievements, mockProgress } from '../mock-data';
import { StatusBadge } from '../status';

export default function AchievementsSandboxPage() {
  return (
    <SandboxShell
      moduleId="gamification-achievements"
      title="Achievements"
      description="Unlocks, progress, pinning, and achievements UI."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Achievement UI surfaces for unlocks, progress tracking, and pinning.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Overview grid + card states</li>
                <li>Progress snapshot and XP milestones</li>
                <li>Pinned achievements for dashboard</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Tables: achievements, user_achievements</li>
                <li>API: /api/gamification (snapshot)</li>
                <li>API: /api/gamification/pins</li>
                <li>Events: gamification_events (read-only log)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open /app/gamification/achievements.</li>
                <li>Pin up to 3 achievements and verify the dashboard.</li>
                <li>Review /app/gamification/events for unlock logs.</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge state="running" />
            <span>Achievements UI is implemented; pins require auth + tenant context.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <Badge variant="outline" size="sm">
              Mock data
            </Badge>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ProgressOverview progress={mockProgress} />
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Achievements section (app)</CardTitle>
              </CardHeader>
              <CardContent>
                <AchievementsSection achievements={mockAchievements} />
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Achievement card states</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <AchievementCard achievement={mockAchievements[0]} />
              <AchievementCard achievement={mockAchievements[1]} />
              <AchievementCard achievement={mockAchievements[2]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related routes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/app/gamification/achievements">
              /app/gamification/achievements
            </Link>
            <Link className="text-primary hover:underline" href="/app/gamification/events">
              /app/gamification/events
            </Link>
            <Link className="text-primary hover:underline" href="/api/gamification/pins">
              /api/gamification/pins
            </Link>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
