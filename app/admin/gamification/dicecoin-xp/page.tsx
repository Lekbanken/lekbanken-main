'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SparklesIcon,
  ChartBarIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button, Card, CardContent, Badge, Tabs, TabPanel, Input } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";

type DiceCoinTab = "xp" | "levels" | "leaderboards";

// Types
interface RuleFromAPI {
  name: string;
  event_type: string;
  reward_amount: number;
  xp_amount: number;
  cooldown_type: string;
  base_multiplier: number;
  is_active: boolean;
  conditions: unknown[];
  id: string | null;
  inDatabase: boolean;
  isCustom?: boolean;
  dbValues?: {
    reward_amount: number;
    xp_amount: number | null;
    cooldown_type: string | null;
    base_multiplier: number | null;
    is_active: boolean;
  } | null;
}

interface RulesResponse {
  rules: RuleFromAPI[];
  customRules: RuleFromAPI[];
  stats: {
    total: number;
    inDatabase: number;
    missing: number;
    custom: number;
  };
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

// Default levels (from gamification design)
const defaultLevels: Level[] = [
  { level: 1, name: "Nybörjare", xpRequired: 0, reward: null },
  { level: 2, name: "Lärling", xpRequired: 100, reward: "10 DiceCoin" },
  { level: 3, name: "Utforskare", xpRequired: 300, reward: "25 DiceCoin" },
  { level: 4, name: "Äventyrare", xpRequired: 600, reward: "50 DiceCoin" },
  { level: 5, name: "Mästare", xpRequired: 1000, reward: "100 DiceCoin + Level bonus aktiv" },
  { level: 6, name: "Expert", xpRequired: 1500, reward: "150 DiceCoin" },
  { level: 7, name: "Veteran", xpRequired: 2500, reward: "200 DiceCoin + 1.3x bonus" },
  { level: 8, name: "Legend", xpRequired: 4000, reward: "Badge: Legend" },
  { level: 9, name: "Champion", xpRequired: 6000, reward: "300 DiceCoin" },
  { level: 10, name: "Grandmaster", xpRequired: 10000, reward: "500 DiceCoin + Special Badge" },
];

const tabConfig: { id: DiceCoinTab; label: string }[] = [
  { id: "xp", label: "XP & DiceCoin Triggers" },
  { id: "levels", label: "Nivåer" },
  { id: "leaderboards", label: "Leaderboards" },
];

// Cooldown type display names
const cooldownLabels: Record<string, string> = {
  none: "Ingen",
  daily: "Daglig",
  weekly: "Veckovis",
  once: "En gång",
  once_per_streak: "Per streak",
};

// Event type categories for grouping
const eventCategories: Record<string, string> = {
  session_started: "Play",
  session_completed: "Play",
  run_completed: "Play",
  first_session: "Play",
  perfect_session: "Play",
  large_group_hosted: "Play",
  plan_created: "Planner",
  plan_published: "Planner",
  first_plan: "Planner",
  daily_login: "Engagement",
  streak_3_days: "Engagement",
  streak_7_days: "Engagement",
  streak_30_days: "Engagement",
  game_created: "Content",
  game_published: "Content",
  invite_accepted: "Social",
  tutorial_completed: "Learning",
};

export default function DiceCoinXPPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab") as DiceCoinTab | null;
  const [activeTab, setActiveTab] = useState<DiceCoinTab>(
    tabFromUrl && ["xp", "levels", "leaderboards"].includes(tabFromUrl) ? tabFromUrl : "xp"
  );

  // Rules state
  const [rulesData, setRulesData] = useState<RulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const newUrl = activeTab === "xp" 
      ? "/admin/gamification/dicecoin-xp" 
      : `/admin/gamification/dicecoin-xp?tab=${activeTab}`;
    router.replace(newUrl, { scroll: false });
  }, [activeTab, router]);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentTenant?.id) {
        params.set('tenantId', currentTenant.id);
      }
      const res = await fetch(`/api/admin/gamification/seed-rules?${params}`);
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      setRulesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentTenant?.id) {
        params.set('tenantId', currentTenant.id);
      }
      params.set('type', 'xp_total');
      params.set('period', 'all_time');
      params.set('limit', '10');
      
      const res = await fetch(`/api/admin/gamification/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.entries?.map((e: { rank: number; display_name?: string; xp?: number; coins_balance?: number }, i: number) => ({
          rank: e.rank || i + 1,
          name: e.display_name || 'Anonym',
          type: 'user' as const,
          score: e.xp || 0,
          coins: e.coins_balance || 0,
        })) || []);
      }
    } catch {
      // Silently fail for leaderboard
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (activeTab === 'leaderboards') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  // Seed rules
  const seedRules = async (mode: 'missing' | 'reset') => {
    setSeeding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/gamification/seed-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant?.id || null,
          mode,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setSuccessMessage(data.message);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setSeeding(false);
    }
  };

  const stats = useMemo(() => ({
    total: rulesData?.stats.total || 0,
    inDatabase: rulesData?.stats.inDatabase || 0,
    missing: rulesData?.stats.missing || 0,
    custom: rulesData?.stats.custom || 0,
  }), [rulesData]);

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
        description="Hantera XP-triggers, nivåer och leaderboards. Seeda alla default-triggers till databasen."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRules} disabled={loading}>
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Uppdatera
            </Button>
            <Button onClick={() => {}}>
              <Cog6ToothIcon className="mr-2 h-4 w-4" />
              Inställningar
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt triggers"
          value={stats.total}
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="I databasen"
          value={stats.inDatabase}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Saknas"
          value={stats.missing}
          icon={stats.missing > 0 ? <ExclamationTriangleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
          iconColor={stats.missing > 0 ? "amber" : "green"}
        />
        <AdminStatCard
          label="Nivåer"
          value={defaultLevels.length}
          icon={<ChartBarIcon className="h-5 w-5" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as DiceCoinTab)}
        tabs={tabConfig.map(t => ({ id: t.id, label: t.label }))}
      />
      <TabPanel id="xp" activeTab={activeTab}>
        <XPRulesTab 
          rules={rulesData?.rules || []} 
          customRules={rulesData?.customRules || []}
          loading={loading}
          seeding={seeding}
          onSeed={seedRules}
          missingCount={stats.missing}
        />
      </TabPanel>
      <TabPanel id="levels" activeTab={activeTab}>
        <LevelsTab levels={defaultLevels} tenantId={currentTenant?.id} />
      </TabPanel>
      <TabPanel id="leaderboards" activeTab={activeTab}>
        <LeaderboardsTab entries={leaderboard} loading={leaderboardLoading} onRefresh={fetchLeaderboard} />
      </TabPanel>
    </AdminPageLayout>
  );
}

// XP Rules Tab
function XPRulesTab({ 
  rules, 
  customRules,
  loading, 
  seeding,
  onSeed,
  missingCount,
}: { 
  rules: RuleFromAPI[]
  customRules: RuleFromAPI[]
  loading: boolean
  seeding: boolean
  onSeed: (mode: 'missing' | 'reset') => void
  missingCount: number
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const filteredRules = useMemo(() => {
    const allRules = [...rules, ...customRules];
    if (!searchQuery) return allRules;
    const q = searchQuery.toLowerCase();
    return allRules.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.event_type.toLowerCase().includes(q)
    );
  }, [rules, customRules, searchQuery]);

  // Group by category
  const groupedRules = useMemo(() => {
    const groups: Record<string, RuleFromAPI[]> = {};
    for (const rule of filteredRules) {
      const category = eventCategories[rule.event_type] || 'Custom';
      if (!groups[category]) groups[category] = [];
      groups[category].push(rule);
    }
    return groups;
  }, [filteredRules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Sök triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {missingCount > 0 && (
            <Button 
              onClick={() => onSeed('missing')} 
              disabled={seeding}
              className="bg-green-600 hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              {seeding ? 'Seedar...' : `Lägg till ${missingCount} saknade`}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowConfirmReset(true)}
            disabled={seeding}
          >
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Återställ alla
          </Button>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Skapa custom trigger
          </Button>
        </div>
      </div>

      {/* Confirm reset dialog */}
      {showConfirmReset && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-3 text-amber-800 dark:text-amber-200">
            <strong>Varning:</strong> Detta kommer att ta bort alla default-triggers och lägga till dem på nytt med standardvärden. 
            Custom triggers bevaras.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => { onSeed('reset'); setShowConfirmReset(false); }}
              disabled={seeding}
            >
              Ja, återställ
            </Button>
            <Button variant="outline" onClick={() => setShowConfirmReset(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Rules grouped by category */}
      {Object.entries(groupedRules).map(([category, categoryRules]) => (
        <Card key={category}>
          <div className="border-b bg-muted/30 px-4 py-2">
            <h3 className="font-semibold text-sm">{category}</h3>
          </div>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Namn</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Event Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Coins</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">XP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cooldown</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Aktiv</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categoryRules.map((rule) => (
                  <tr key={rule.event_type} className={`hover:bg-muted/30 ${!rule.inDatabase ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                    <td className="px-4 py-3">
                      {rule.inDatabase ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-amber-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {rule.name}
                      {rule.isCustom && (
                        <Badge variant="outline" className="ml-2">Custom</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{rule.event_type}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-amber-600">🪙</span>
                        {rule.dbValues?.reward_amount ?? rule.reward_amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <SparklesIcon className="h-4 w-4 text-purple-500" />
                        {rule.dbValues?.xp_amount ?? rule.xp_amount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {cooldownLabels[rule.dbValues?.cooldown_type ?? rule.cooldown_type] || rule.cooldown_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={(rule.dbValues?.is_active ?? rule.is_active) ? "default" : "outline"}>
                        {(rule.dbValues?.is_active ?? rule.is_active) ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {filteredRules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Inga triggers hittades
        </div>
      )}
    </div>
  );
}

// Levels Tab
function LevelsTab({ levels, tenantId: _tenantId }: { levels: Level[]; tenantId?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Nivåer baserade på total XP. Level-bonus aktiveras från nivå 5 (1.1x) och ökar med 0.1x per nivå, capped vid 2.0x.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => (
          <Card key={level.level} className="relative overflow-hidden">
            <div className={`absolute left-0 top-0 h-full w-1 ${
              level.level >= 5 ? 'bg-amber-500' : 'bg-primary'
            }`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                    level.level >= 5 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {level.level}
                  </div>
                  <div>
                    <h4 className="font-semibold">{level.name || `Nivå ${level.level}`}</h4>
                    <p className="text-sm text-muted-foreground">{level.xpRequired.toLocaleString()} XP</p>
                  </div>
                </div>
                {level.level >= 5 && (
                  <Badge variant="secondary" className="text-xs">
                    {(1.0 + (level.level - 4) * 0.1).toFixed(1)}x
                  </Badge>
                )}
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
function LeaderboardsTab({ 
  entries, 
  loading,
  onRefresh 
}: { 
  entries: LeaderboardEntry[]
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Topplista över användare baserat på total XP. Användare kan välja att dölja sig från leaderboards.
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Uppdatera
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Ingen data ännu. Leaderboard fylls på när användare tjänar XP.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Namn</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">XP</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">DiceCoin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={`${entry.type}-${entry.rank}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                        entry.rank === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                        entry.rank === 2 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        entry.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <SparklesIcon className="h-4 w-4 text-purple-500" />
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-amber-600">🪙</span>
                        {entry.coins.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
