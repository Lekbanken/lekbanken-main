'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CurrencyDollarIcon,
  SparklesIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
  AdminDataTable,
  AdminTableToolbar,
} from "@/components/admin/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabPanel, EmptyState, Input } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";

type DiceCoinTab = "xp" | "levels" | "leaderboards";

// Types
interface XPRule {
  id: string;
  name: string;
  trigger: string;
  xpAmount: number;
  multiplier: number;
  isActive: boolean;
}

interface Level {
  level: number;
  name: string | null;
  xpRequired: number;
  reward: string | null;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  type: "user" | "organisation";
  score: number;
  coins: number;
}

// Mock data
const mockXPRules: XPRule[] = [
  { id: "1", name: "Spel avslutat", trigger: "game_complete", xpAmount: 100, multiplier: 1, isActive: true },
  { id: "2", name: "Vinst", trigger: "game_win", xpAmount: 50, multiplier: 1.5, isActive: true },
  { id: "3", name: "Daglig inloggning", trigger: "daily_login", xpAmount: 25, multiplier: 1, isActive: true },
  { id: "4", name: "Achievement låst", trigger: "achievement_unlock", xpAmount: 200, multiplier: 1, isActive: true },
  { id: "5", name: "Första spelet", trigger: "first_game", xpAmount: 500, multiplier: 2, isActive: false },
];

const mockLevels: Level[] = [
  { level: 1, name: "Nybörjare", xpRequired: 0, reward: null },
  { level: 2, name: "Lärling", xpRequired: 100, reward: "10 DiceCoin" },
  { level: 3, name: "Utforskare", xpRequired: 300, reward: "25 DiceCoin" },
  { level: 4, name: "Äventyrare", xpRequired: 600, reward: "50 DiceCoin" },
  { level: 5, name: "Mästare", xpRequired: 1000, reward: "100 DiceCoin" },
  { level: 6, name: "Legend", xpRequired: 2000, reward: "Badge: Legend" },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Emma Lindqvist", type: "user", score: 15420, coins: 3200 },
  { rank: 2, name: "Stockholms Skolor", type: "organisation", score: 12800, coins: 8500 },
  { rank: 3, name: "Oscar Eriksson", type: "user", score: 11200, coins: 2100 },
  { rank: 4, name: "Göteborgs Fritid", type: "organisation", score: 9800, coins: 6200 },
  { rank: 5, name: "Maja Andersson", type: "user", score: 8500, coins: 1800 },
];

const tabConfig: { id: DiceCoinTab; label: string }[] = [
  { id: "xp", label: "XP & DiceCoin" },
  { id: "levels", label: "Nivåer" },
  { id: "leaderboards", label: "Leaderboards" },
];

export default function DiceCoinXPPage() {
  useAuth();
  const { currentTenant } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab") as DiceCoinTab | null;
  const [activeTab, setActiveTab] = useState<DiceCoinTab>(
    tabFromUrl && ["xp", "levels", "leaderboards"].includes(tabFromUrl) ? tabFromUrl : "xp"
  );

  // Sync tab with URL
  useEffect(() => {
    const newUrl = activeTab === "xp" 
      ? "/admin/gamification/dicecoin-xp" 
      : `/admin/gamification/dicecoin-xp?tab=${activeTab}`;
    router.replace(newUrl, { scroll: false });
  }, [activeTab, router]);

  const stats = useMemo(() => ({
    totalXPEarned: "2.4M",
    activeRules: mockXPRules.filter(r => r.isActive).length,
    totalLevels: mockLevels.length,
    topScore: mockLeaderboard[0]?.score || 0,
  }), []);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Gamification hub", href: "/admin/gamification" },
          { label: "DiceCoin & XP" },
        ]}
      />

      <AdminPageHeader
        title="DiceCoin & XP"
        description="Hantera progression, nivåer, XP-regler och leaderboards."
        actions={
          <Button onClick={() => {}}>
            <Cog6ToothIcon className="mr-2 h-4 w-4" />
            Inställningar
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt XP utdelat"
          value={stats.totalXPEarned}
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="Aktiva XP-regler"
          value={stats.activeRules}
          icon={<Cog6ToothIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Nivåer"
          value={stats.totalLevels}
          icon={<ChartBarIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label="Högsta poäng"
          value={stats.topScore.toLocaleString()}
          icon={<TrophyIcon className="h-5 w-5" />}
          iconColor="green"
        />
      </AdminStatGrid>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as DiceCoinTab)}
        tabs={tabConfig.map(t => ({ id: t.id, label: t.label }))}
      />
      <TabPanel id="xp" activeTab={activeTab}>
        <XPRulesTab rules={mockXPRules} />
      </TabPanel>
      <TabPanel id="levels" activeTab={activeTab}>
        <LevelsTab levels={mockLevels} tenantId={currentTenant?.id} />
      </TabPanel>
      <TabPanel id="leaderboards" activeTab={activeTab}>
        <LeaderboardsTab entries={mockLeaderboard} />
      </TabPanel>
    </AdminPageLayout>
  );
}

// XP Rules Tab
function XPRulesTab({ rules }: { rules: XPRule[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(r => r.name.toLowerCase().includes(q) || r.trigger.toLowerCase().includes(q));
  }, [rules, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Sök regler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Lägg till regel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Namn</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Trigger</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">XP</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Multiplikator</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{rule.trigger}</td>
                  <td className="px-4 py-3 text-right">{rule.xpAmount}</td>
                  <td className="px-4 py-3 text-right">{rule.multiplier}x</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={rule.isActive ? "default" : "outline"}>
                      {rule.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// Levels Tab
function LevelsTab({ levels, tenantId }: { levels: Level[]; tenantId?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Konfigurera nivåer och XP-trösklar för progression.
        </p>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Lägg till nivå
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => (
          <Card key={level.level} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {level.level}
                  </div>
                  <div>
                    <h4 className="font-semibold">{level.name || `Nivå ${level.level}`}</h4>
                    <p className="text-sm text-muted-foreground">{level.xpRequired.toLocaleString()} XP</p>
                  </div>
                </div>
              </div>
              {level.reward && (
                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Belöning</p>
                  <p className="text-sm font-medium">{level.reward}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Leaderboards Tab
function LeaderboardsTab({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Topplista över användare och organisationer baserat på poäng.
        </p>
        <Button variant="outline">
          <ArrowPathIcon className="mr-2 h-4 w-4" />
          Uppdatera
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Namn</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Typ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Poäng</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">DiceCoin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={`${entry.type}-${entry.rank}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                      entry.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                      entry.rank === 2 ? "bg-gray-100 text-gray-700" :
                      entry.rank === 3 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={entry.type === "user" ? "secondary" : "outline"}>
                      {entry.type === "user" ? "Användare" : "Organisation"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{entry.score.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{entry.coins.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
