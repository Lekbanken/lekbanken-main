import Link from 'next/link';
import { SandboxShell } from '../components/shell/SandboxShellV2';
import { ModuleGrid } from '../components/ModuleCard';
import { getCategoryById } from '../config/sandbox-modules';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AchievementsSection } from '@/features/gamification/components/AchievementsSection';
import { CallToActionSection } from '@/features/gamification/components/CallToActionSection';
import { CoinsSection } from '@/features/gamification/components/CoinsSection';
import { ProgressOverview } from '@/features/gamification/components/ProgressOverview';
import { StreakSection } from '@/features/gamification/components/StreakSection';
import { mockAchievements, mockCoins, mockProgress, mockStreak } from './mock-data';
import { StatusBadge } from './status';

const category = getCategoryById('gamification');
const modules = category?.modules ?? [];
const hubModules = modules.filter((module) => module.id !== 'gamification-hub');

export default function GamificationHubPage() {
  return (
    <SandboxShell
      moduleId="gamification-hub"
      title="Gamification Hub"
      description="Central sandbox hub for DiceCoin, achievements, rewards, exports, and admin tooling."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                A single place to discover every gamification surface in the repo, with links
                to real routes, API endpoints, and sandbox previews.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>App-facing DiceCoin and achievement UI</li>
                <li>Admin tools for awards, automation, levels, campaigns</li>
                <li>Badge builder exports and schema docs</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Supabase tables: coins, achievements, events, exports</li>
                <li>API routes under /api/gamification and /api/admin/gamification</li>
                <li>Tenant + auth context for admin surfaces</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Start with the module pages below for UI previews.</li>
                <li>Open the real app/admin routes from the links.</li>
                <li>Validate API and DB behavior with test users/tenants.</li>
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
            <span>Sandbox hub is wired to mock data; production flows require auth + DB.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Gamification sandbox modules</h2>
            <Badge variant="outline" size="sm">
              {hubModules.length} modules
            </Badge>
          </div>
          {hubModules.length > 0 ? (
            <ModuleGrid modules={hubModules} columns={3} />
          ) : (
            <p className="text-sm text-muted-foreground">No gamification modules registered yet.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">App snapshot</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ProgressOverview progress={mockProgress} />
            <CoinsSection summary={mockCoins} />
            <AchievementsSection achievements={mockAchievements} />
            <StreakSection streak={mockStreak} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <CallToActionSection />
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Key routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <Link className="text-primary hover:underline" href="/app/gamification">
                /app/gamification
              </Link>
              <Link className="text-primary hover:underline" href="/app/gamification/achievements">
                /app/gamification/achievements
              </Link>
              <Link className="text-primary hover:underline" href="/app/profile/coins">
                /app/profile/coins
              </Link>
              <Link className="text-primary hover:underline" href="/app/shop">
                /app/shop
              </Link>
              <Link className="text-primary hover:underline" href="/app/gamification/events">
                /app/gamification/events
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="text-primary hover:underline" href="/admin/gamification/awards">
                /admin/gamification/awards
              </Link>
              <Link className="text-primary hover:underline" href="/admin/gamification/automation">
                /admin/gamification/automation
              </Link>
              <Link className="text-primary hover:underline" href="/admin/gamification/levels">
                /admin/gamification/levels
              </Link>
              <Link className="text-primary hover:underline" href="/admin/gamification/campaigns">
                /admin/gamification/campaigns
              </Link>
              <Link className="text-primary hover:underline" href="/admin/gamification/analytics">
                /admin/gamification/analytics
              </Link>
              <Link className="text-primary hover:underline" href="/admin/library/badges">
                /admin/library/badges
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
