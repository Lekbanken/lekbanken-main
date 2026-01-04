'use client';

import { useState, useMemo } from "react";
import {
  TrophyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CheckBadgeIcon,
  ClockIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button, Card, CardContent, Badge, Input, EmptyState } from "@/components/ui";

type AchievementStatus = "draft" | "active" | "archived";

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  tiers: number;
  currentTier: number;
  status: AchievementStatus;
  triggerType: string;
  unlockedCount: number;
  reward: string | null;
  createdAt: string;
}

const statusConfig: Record<AchievementStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Aktiv", variant: "default", icon: <CheckBadgeIcon className="h-3 w-3" /> },
  draft: { label: "Utkast", variant: "secondary", icon: <ClockIcon className="h-3 w-3" /> },
  archived: { label: "Arkiverad", variant: "outline", icon: <ArchiveBoxIcon className="h-3 w-3" /> },
};

// Mock data
const mockAchievements: Achievement[] = [
  {
    id: "1",
    name: "Första steget",
    description: "Slutför ditt första spel",
    iconUrl: null,
    tiers: 1,
    currentTier: 1,
    status: "active",
    triggerType: "game_complete",
    unlockedCount: 1234,
    reward: "50 DiceCoin",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Vinnare",
    description: "Vinn 10 spel",
    iconUrl: null,
    tiers: 3,
    currentTier: 2,
    status: "active",
    triggerType: "game_win",
    unlockedCount: 456,
    reward: "100 DiceCoin",
    createdAt: "2024-01-20",
  },
  {
    id: "3",
    name: "Streak Master",
    description: "Logga in 7 dagar i rad",
    iconUrl: null,
    tiers: 5,
    currentTier: 1,
    status: "active",
    triggerType: "daily_streak",
    unlockedCount: 234,
    reward: "Streak Badge",
    createdAt: "2024-02-01",
  },
  {
    id: "4",
    name: "Samlare",
    description: "Samla 1000 DiceCoin",
    iconUrl: null,
    tiers: 3,
    currentTier: 1,
    status: "draft",
    triggerType: "coin_collect",
    unlockedCount: 0,
    reward: "Collector Badge",
    createdAt: "2024-02-10",
  },
  {
    id: "5",
    name: "Social Butterfly",
    description: "Bjud in 5 vänner",
    iconUrl: null,
    tiers: 3,
    currentTier: 1,
    status: "archived",
    triggerType: "invite_friend",
    unlockedCount: 89,
    reward: "200 DiceCoin",
    createdAt: "2023-12-01",
  },
];

export default function AchievementsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AchievementStatus | "all">("all");

  const filteredAchievements = useMemo(() => {
    return mockAchievements.filter((a) => {
      const matchesSearch = !searchQuery || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: mockAchievements.length,
    active: mockAchievements.filter(a => a.status === "active").length,
    draft: mockAchievements.filter(a => a.status === "draft").length,
    totalUnlocks: mockAchievements.reduce((sum, a) => sum + a.unlockedCount, 0),
  }), []);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Gamification hub", href: "/admin/gamification" },
          { label: "Achievements" },
        ]}
      />

      <AdminPageHeader
        title="Achievements"
        description="Administrera achievements, badges, tiers och belöningskriterier."
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Skapa achievement
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt"
          value={stats.total}
          icon={<TrophyIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Aktiva"
          value={stats.active}
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Utkast"
          value={stats.draft}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="Totalt upplåsta"
          value={stats.totalUnlocks.toLocaleString()}
          icon={<StarIcon className="h-5 w-5" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "draft", "archived"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "Alla" : statusConfig[status].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Achievement Grid */}
      {filteredAchievements.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon className="h-12 w-12" />}
          title="Inga achievements hittades"
          description={searchQuery ? "Försök med en annan sökning." : "Skapa ditt första achievement."}
          action={{ label: "Skapa achievement", onClick: () => {} }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map((achievement) => (
            <Card key={achievement.id} className="group cursor-pointer transition-all hover:border-primary hover:shadow-md">
              <CardContent className="p-4">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <TrophyIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{achievement.name}</h3>
                      <Badge variant={statusConfig[achievement.status].variant} className="mt-1">
                        {statusConfig[achievement.status].label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{achievement.description}</p>

                {/* Tiers */}
                {achievement.tiers > 1 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: achievement.tiers }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-full ${
                            i < achievement.currentTier ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tier {achievement.currentTier} av {achievement.tiers}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Upplåst</p>
                    <p className="font-semibold">{achievement.unlockedCount.toLocaleString()}</p>
                  </div>
                  {achievement.reward && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Belöning</p>
                      <p className="font-semibold text-primary">{achievement.reward}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
