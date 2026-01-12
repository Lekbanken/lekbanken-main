'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  { level: 1, name: null, xpRequired: 0, reward: null },
  { level: 2, name: null, xpRequired: 100, reward: "10 DiceCoin" },
  { level: 3, name: null, xpRequired: 300, reward: "25 DiceCoin" },
  { level: 4, name: null, xpRequired: 600, reward: "50 DiceCoin" },
  { level: 5, name: null, xpRequired: 1000, reward: "100 DiceCoin + Level bonus" },
  { level: 6, name: null, xpRequired: 1500, reward: "150 DiceCoin" },
  { level: 7, name: null, xpRequired: 2500, reward: "200 DiceCoin + 1.3x bonus" },
  { level: 8, name: null, xpRequired: 4000, reward: "Badge: Legend" },
  { level: 9, name: null, xpRequired: 6000, reward: "300 DiceCoin" },
  { level: 10, name: null, xpRequired: 10000, reward: "500 DiceCoin + Special Badge" },
];

// Event type categories for grouping (category keys for translation)
const eventCategories: Record<string, string> = {
  session_started: "play",
  session_completed: "play",
  run_completed: "play",
  first_session: "play",
  perfect_session: "play",
  large_group_hosted: "play",
  plan_created: "planner",
  plan_published: "planner",
  first_plan: "planner",
  daily_login: "engagement",
  streak_3_days: "engagement",
  streak_7_days: "engagement",
  streak_30_days: "engagement",
  game_created: "content",
  game_published: "content",
  invite_accepted: "social",
  tutorial_completed: "learning",
};

export default function DiceCoinXPPage() {
  const t = useTranslations('admin.gamification.dicecoinXp');
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab") as DiceCoinTab | null;
  const [activeTab, setActiveTab] = useState<DiceCoinTab>(
    tabFromUrl && ["xp", "levels", "leaderboards"].includes(tabFromUrl) ? tabFromUrl : "xp"
  );

  const tabConfig = useMemo(() => [
    { id: "xp" as const, label: t('tabs.xpTriggers') },
    { id: "levels" as const, label: t('tabs.levels') },
    { id: "leaderboards" as const, label: t('tabs.leaderboards') },
  ], [t]);

  const cooldownLabels = useMemo(() => ({
    none: t('cooldown.none'),
    daily: t('cooldown.daily'),
    weekly: t('cooldown.weekly'),
    once: t('cooldown.once'),
    once_per_streak: t('cooldown.oncePerStreak'),
  }), [t]);

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
      if (!res.ok) throw new Error(t('errors.fetchFailed'));
      const data = await res.json();
      setRulesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, t]);

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
          name: e.display_name || t('leaderboardsTab.anonymous'),
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
  }, [currentTenant?.id, t]);

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
      setError(err instanceof Error ? err.message : t('errors.generic'));
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
          { label: t('breadcrumbs.admin'), href: "/admin" },
          { label: t('breadcrumbs.gamificationHub'), href: "/admin/gamification" },
          { label: t('breadcrumbs.dicecoinXp') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRules} disabled={loading}>
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('actions.refresh')}
            </Button>
            <Button onClick={() => {}}>
              <Cog6ToothIcon className="mr-2 h-4 w-4" />
              {t('actions.settings')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label={t('stats.totalTriggers')}
          value={stats.total}
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label={t('stats.inDatabase')}
          value={stats.inDatabase}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.missing')}
          value={stats.missing}
          icon={stats.missing > 0 ? <ExclamationTriangleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
          iconColor={stats.missing > 0 ? "amber" : "green"}
        />
        <AdminStatCard
          label={t('stats.levels')}
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
          cooldownLabels={cooldownLabels}
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
  cooldownLabels,
}: { 
  rules: RuleFromAPI[]
  customRules: RuleFromAPI[]
  loading: boolean
  seeding: boolean
  onSeed: (mode: 'missing' | 'reset') => void
  missingCount: number
  cooldownLabels: Record<string, string>
}) {
  const t = useTranslations('admin.gamification.dicecoinXp');
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
      const categoryKey = eventCategories[rule.event_type] || 'custom';
      if (!groups[categoryKey]) groups[categoryKey] = [];
      groups[categoryKey].push(rule);
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
            placeholder={t('xpTab.searchPlaceholder')}
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
              {seeding ? t('xpTab.seeding') : t('xpTab.addMissing', { count: missingCount })}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowConfirmReset(true)}
            disabled={seeding}
          >
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            {t('xpTab.resetAll')}
          </Button>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('xpTab.createCustom')}
          </Button>
        </div>
      </div>

      {/* Confirm reset dialog */}
      {showConfirmReset && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-3 text-amber-800 dark:text-amber-200">
            <strong>⚠️</strong> {t('xpTab.resetWarning')}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => { onSeed('reset'); setShowConfirmReset(false); }}
              disabled={seeding}
            >
              {t('xpTab.confirmReset')}
            </Button>
            <Button variant="outline" onClick={() => setShowConfirmReset(false)}>
              {t('xpTab.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Rules grouped by category */}
      {Object.entries(groupedRules).map(([categoryKey, categoryRules]) => (
        <Card key={categoryKey}>
          <div className="border-b bg-muted/30 px-4 py-2">
            <h3 className="font-semibold text-sm">{t(`categories.${categoryKey}`)}</h3>
          </div>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('xpTab.table.status')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('xpTab.table.name')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('xpTab.table.eventType')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('xpTab.table.coins')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('xpTab.table.xp')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('xpTab.table.cooldown')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('xpTab.table.active')}</th>
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
                        <Badge variant="outline" className="ml-2">{t('xpTab.custom')}</Badge>
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
                        {(rule.dbValues?.is_active ?? rule.is_active) ? t('xpTab.table.active') : t('xpTab.table.inactive')}
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
          {t('xpTab.noTriggers')}
        </div>
      )}
    </div>
  );
}

// Levels Tab
function LevelsTab({ levels, tenantId: _tenantId }: { levels: Level[]; tenantId?: string }) {
  const t = useTranslations('admin.gamification.dicecoinXp');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('levelsTab.description')}
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
                    <h4 className="font-semibold">{t(`levelsTab.levelNames.${level.level}`)}</h4>
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
                  <p className="text-xs text-muted-foreground">{t('levelsTab.reward')}</p>
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
  const t = useTranslations('admin.gamification.dicecoinXp');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('leaderboardsTab.description')}
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('leaderboardsTab.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('leaderboardsTab.emptyState')}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('leaderboardsTab.table.rank')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('leaderboardsTab.table.name')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('leaderboardsTab.table.xp')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('leaderboardsTab.table.dicecoin')}</th>
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
