'use client';

import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import type { ProgressSnapshot, GamificationIdentity } from '@/features/gamification/types';

const FACTION_META: Record<string, { emoji: string; name: string; color: string }> = {
  forest: { emoji: '🌿', name: 'Skog', color: '#10b981' },
  sea:    { emoji: '🌊', name: 'Hav',  color: '#0ea5e9' },
  sky:    { emoji: '☀️', name: 'Himmel', color: '#f59e0b' },
  void:   { emoji: '✦',  name: 'Void',  color: '#7c3aed' },
};

type ProfileHeroProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  tenantName: string | null;
  progress: ProgressSnapshot | null;
  identity: GamificationIdentity | null;
};

export function ProfileHero({ displayName, email, avatarUrl, tenantName, progress, identity }: ProfileHeroProps) {
  const faction = identity?.factionId ? FACTION_META[identity.factionId] : null;
  const percent = progress ? Math.min(100, Math.round((progress.currentXp / Math.max(1, progress.nextLevelXp)) * 100)) : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar with level badge */}
          <div className="relative">
            <Avatar src={avatarUrl || undefined} name={displayName} size="xl" />
            {progress && (
              <span
                className="absolute -bottom-1 -right-1 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shadow-lg border-2 border-card"
                style={{ backgroundColor: faction?.color ?? '#8661ff' }}
              >
                {progress.level}
              </span>
            )}
          </div>

          {/* Name, email, faction, org */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{email}</p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {progress && (
                <span className="text-sm font-medium" style={{ color: faction?.color ?? '#8661ff' }}>
                  Level {progress.level}
                  {progress.levelName && ` — ${progress.levelName}`}
                </span>
              )}
              {faction && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{faction.emoji}</span>
                  <span>{faction.name}</span>
                </span>
              )}
            </div>

            {tenantName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{tenantName}</span>
              </div>
            )}
          </div>
        </div>

        {/* XP progress bar */}
        {progress && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{progress.currentXp.toLocaleString('sv-SE')} XP</span>
              <span>{progress.nextLevelXp.toLocaleString('sv-SE')} XP</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percent}%`,
                  backgroundColor: faction?.color ?? '#8661ff',
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
