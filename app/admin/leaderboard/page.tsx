'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminDataTable,
  AdminTableToolbar,
  AdminPagination,
} from '@/components/admin/shared';
import { Button, Badge, EmptyState } from '@/components/ui';
import {
  TrophyIcon,
  UsersIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Types
interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  type: 'user' | 'organisation';
  coins: number;
  gamesPlayed: number;
  achievementsEarned: number;
  score: number;
  avatarUrl?: string;
}

interface LeaderboardStats {
  totalUsers: number;
  totalOrganisations: number;
  totalCoinsEarned: number;
  totalAchievements: number;
}

type TimeframeFilter = '7d' | '30d' | '90d' | 'all';
type TypeFilter = 'all' | 'users' | 'organisations';
type MetricFilter = 'score' | 'coins' | 'games' | 'achievements';

// Mock data generator
function generateMockData(): { entries: LeaderboardEntry[]; stats: LeaderboardStats } {
  const userNames = [
    'Emma Lindqvist', 'Oscar Eriksson', 'Maja Andersson', 'Liam Nilsson',
    'Ella Johansson', 'William Karlsson', 'Alva Svensson', 'Lucas Olsson',
    'Wilma Pettersson', 'Oliver Gustafsson', 'Saga Jonsson', 'Hugo Larsson',
  ];
  
  const orgNames = [
    'Stockholms Skolor', 'Göteborgs Fritid', 'Malmö Förskolor', 'Uppsala Kommun',
    'Lunds Aktiviteter', 'Västerås Barn', 'Örebro Fritid', 'Linköpings Skolor',
  ];

  const entries: LeaderboardEntry[] = [];
  
  // Generate user entries
  userNames.forEach((name, i) => {
    const coins = Math.floor(Math.random() * 5000) + 500;
    const gamesPlayed = Math.floor(Math.random() * 100) + 10;
    const achievementsEarned = Math.floor(Math.random() * 30) + 5;
    entries.push({
      id: `user-${i}`,
      rank: 0,
      name,
      type: 'user',
      coins,
      gamesPlayed,
      achievementsEarned,
      score: coins + (gamesPlayed * 10) + (achievementsEarned * 50),
    });
  });

  // Generate organisation entries
  orgNames.forEach((name, i) => {
    const coins = Math.floor(Math.random() * 20000) + 2000;
    const gamesPlayed = Math.floor(Math.random() * 500) + 50;
    const achievementsEarned = Math.floor(Math.random() * 100) + 20;
    entries.push({
      id: `org-${i}`,
      rank: 0,
      name,
      type: 'organisation',
      coins,
      gamesPlayed,
      achievementsEarned,
      score: coins + (gamesPlayed * 10) + (achievementsEarned * 50),
    });
  });

  // Sort by score and assign ranks
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  const stats: LeaderboardStats = {
    totalUsers: userNames.length,
    totalOrganisations: orgNames.length,
    totalCoinsEarned: entries.reduce((sum, e) => sum + e.coins, 0),
    totalAchievements: entries.reduce((sum, e) => sum + e.achievementsEarned, 0),
  };

  return { entries, stats };
}

export default function LeaderboardAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const tenantId = currentTenant?.id;

  // State
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('30d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('score');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Try to load from Supabase first
      try {
        if (tenantId) {
          // Attempt to get real leaderboard data
          const { data: leaderboardData } = await supabase
            .from('achievement_leaderboards')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('total_points', { ascending: false })
            .limit(50);

          if (leaderboardData && leaderboardData.length > 0) {
            // Map real data
            const mappedEntries: LeaderboardEntry[] = leaderboardData.map((row, i) => ({
              id: row.user_id,
              rank: i + 1,
              name: 'Användare ' + (i + 1),
              type: 'user' as const,
              coins: row.total_achievement_points || 0,
              gamesPlayed: row.achievement_count || 0,
              achievementsEarned: row.seasonal_achievement_count || 0,
              score: row.total_achievement_points || 0,
            }));
            setEntries(mappedEntries);
            setStats({
              totalUsers: mappedEntries.length,
              totalOrganisations: 0,
              totalCoinsEarned: mappedEntries.reduce((sum, e) => sum + e.coins, 0),
              totalAchievements: mappedEntries.reduce((sum, e) => sum + e.achievementsEarned, 0),
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading leaderboard from Supabase:', err);
      }

      // Fall back to mock data
      const mockData = generateMockData();
      setEntries(mockData.entries);
      setStats(mockData.stats);
      setIsLoading(false);
    };

    loadData();
  }, [tenantId, timeframe]);

  // Filter and sort data
  const filteredEntries = entries.filter((entry) => {
    // Search filter
    if (searchQuery && !entry.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filter
    if (typeFilter === 'users' && entry.type !== 'user') return false;
    if (typeFilter === 'organisations' && entry.type !== 'organisation') return false;
    return true;
  });

  // Sort by selected metric
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    switch (metricFilter) {
      case 'coins': return b.coins - a.coins;
      case 'games': return b.gamesPlayed - a.gamesPlayed;
      case 'achievements': return b.achievementsEarned - a.achievementsEarned;
      default: return b.score - a.score;
    }
  });

  // Re-rank after filtering
  sortedEntries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const paginatedEntries = sortedEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRefresh = () => {
    const mockData = generateMockData();
    setEntries(mockData.entries);
    setStats(mockData.stats);
  };

  // Table columns
  const columns = [
    {
      header: 'Rank',
      accessor: (row: LeaderboardEntry) => (
        <div className="flex items-center gap-2">
          {row.rank <= 3 ? (
            <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-white ${
              row.rank === 1 ? 'bg-amber-500' :
              row.rank === 2 ? 'bg-slate-400' :
              'bg-amber-700'
            }`}>
              {row.rank}
            </div>
          ) : (
            <span className="text-muted-foreground font-medium pl-2">{row.rank}</span>
          )}
        </div>
      ),
      width: 'w-20',
    },
    {
      header: 'Namn',
      accessor: (row: LeaderboardEntry) => (
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            row.type === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {row.type === 'user' ? (
              <UsersIcon className="h-4 w-4" />
            ) : (
              <BuildingOfficeIcon className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{row.type === 'user' ? 'Användare' : 'Organisation'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Coins',
      accessor: (row: LeaderboardEntry) => (
        <span className="font-medium text-amber-600">{row.coins.toLocaleString('sv-SE')}</span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: 'Spel',
      accessor: (row: LeaderboardEntry) => row.gamesPlayed.toLocaleString('sv-SE'),
      align: 'right' as const,
      hideBelow: 'md' as const,
    },
    {
      header: 'Achievements',
      accessor: (row: LeaderboardEntry) => (
        <div className="flex items-center justify-end gap-1">
          <SparklesIcon className="h-4 w-4 text-purple-500" />
          <span>{row.achievementsEarned}</span>
        </div>
      ),
      align: 'right' as const,
      hideBelow: 'md' as const,
    },
    {
      header: 'Poäng',
      accessor: (row: LeaderboardEntry) => (
        <Badge variant="secondary" size="sm">
          {row.score.toLocaleString('sv-SE')}
        </Badge>
      ),
      align: 'right' as const,
    },
  ];

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Leaderboard"
        description="Se rankingar för användare och organisationer"
        icon={<TrophyIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Leaderboard' },
        ]}
        actions={
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Uppdatera
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Användare"
          value={stats?.totalUsers ?? 0}
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor="blue"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Organisationer"
          value={stats?.totalOrganisations ?? 0}
          icon={<BuildingOfficeIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Totalt coins"
          value={stats?.totalCoinsEarned.toLocaleString('sv-SE') ?? 0}
          icon={<span className="text-lg">🪙</span>}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Achievements"
          value={stats?.totalAchievements ?? 0}
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="purple"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filters */}
      <AdminTableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Sök namn..."
        className="mb-4"
        filters={
          <>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as TimeframeFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="7d">Senaste 7 dagarna</option>
              <option value="30d">Senaste 30 dagarna</option>
              <option value="90d">Senaste 90 dagarna</option>
              <option value="all">All tid</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Alla typer</option>
              <option value="users">Endast användare</option>
              <option value="organisations">Endast organisationer</option>
            </select>
            <select
              value={metricFilter}
              onChange={(e) => setMetricFilter(e.target.value as MetricFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="score">Sortera: Poäng</option>
              <option value="coins">Sortera: Coins</option>
              <option value="games">Sortera: Spel</option>
              <option value="achievements">Sortera: Achievements</option>
            </select>
          </>
        }
      />

      {/* Table */}
      <AdminDataTable
        data={paginatedEntries}
        columns={columns}
        keyAccessor="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<TrophyIcon className="h-8 w-8" />}
            title="Inga resultat"
            description={searchQuery ? `Inga resultat för "${searchQuery}"` : 'Det finns ingen data att visa ännu.'}
            action={searchQuery ? { label: 'Rensa sökning', onClick: () => setSearchQuery('') } : undefined}
          />
        }
        className="mb-4"
      />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={sortedEntries.length}
        itemsPerPage={itemsPerPage}
      />
    </AdminPageLayout>
  );
}
