'use client'

import { AchievementBuilder } from '@/components/achievements/AchievementBuilder'
import { Badge } from '@/components/ui/badge'
import { SandboxShell as SandboxShellV2 } from '../../components/shell/SandboxShellV2'

export default function AchievementsBuilderPage() {
  return (
    <SandboxShellV2
      moduleId="admin-achievements"
      title="Achievement Builder"
      description="Designa och exportera custom achievements."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">?</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">Achievement Builder</h1>
              <p className="text-sm text-muted-foreground">
                Designa och exportera custom achievements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="primary" size="sm">
              Admin Tool
            </Badge>
            <Badge variant="outline" size="sm">
              v1.0.0
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Sa har bygger du en achievement:</h2>
          <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span><strong>Valj tema</strong> - fargpalett for hela achievementen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span><strong>Valj bas & symbol</strong> - formen och central ikon</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span><strong>Lagg till dekorationer</strong> - bakre och framre lager</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              <span><strong>Exportera</strong> - generera JSON for anvandning</span>
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <AchievementBuilder />
        </div>
      </div>
    </SandboxShellV2>
  )
}
