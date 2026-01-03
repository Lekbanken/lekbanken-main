import Link from 'next/link';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import AchievementBadge from '@/components/AchievementBadge';
import { AchievementBadgePreview } from '../../components/previews/AchievementBadgePreview';
import { StatusBadge } from '../status';

const sampleBadge = {
  id: 'badge-first-session',
  achievement_key: 'first_session',
  name: 'First Session',
  description: 'Complete your first activity.',
  icon_url: null,
  badge_color: 'from-amber-400 to-amber-600',
  condition_type: 'session_count',
  condition_value: 1,
  created_at: new Date().toISOString(),
};

const sampleLockedBadge = {
  ...sampleBadge,
  id: 'badge-locked',
  name: 'Locked Badge',
  description: 'Hidden until unlocked.',
  badge_color: 'from-zinc-400 to-zinc-500',
};

export default function BadgesSandboxPage() {
  return (
    <SandboxShell
      moduleId="gamification-badges"
      title="Badges & Builder"
      description="Badge rendering and the admin badge builder flow."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Badge rendering UI plus the admin-facing badge builder workflow.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Achievement badge component</li>
                <li>Asset packs + icon config</li>
                <li>Award builder export schema</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Table: award_builder_exports</li>
                <li>Docs: /docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md</li>
                <li>Admin UI: /admin/library/badges</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open /admin/library/badges and select a tenant.</li>
                <li>Create or edit a badge and save.</li>
                <li>Verify exports in /api/admin/award-builder/exports.</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge state="partial" />
            <span>Badge builder relies on DB + admin auth; UI is present but data-driven.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <Badge variant="outline" size="sm">
              Mixed sources
            </Badge>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Badge component</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-8">
                <AchievementBadge achievement={sampleBadge} isUnlocked size="md" showLabel />
                <AchievementBadge achievement={sampleLockedBadge} isUnlocked={false} size="md" showLabel />
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Sandbox badge styles</CardTitle>
              </CardHeader>
              <CardContent>
                <AchievementBadgePreview />
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Related routes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/admin/library/badges">
              /admin/library/badges
            </Link>
            <Link className="text-primary hover:underline" href="/api/admin/award-builder/exports">
              /api/admin/award-builder/exports
            </Link>
            <Link className="text-primary hover:underline" href="/docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md">
              /docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md
            </Link>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
