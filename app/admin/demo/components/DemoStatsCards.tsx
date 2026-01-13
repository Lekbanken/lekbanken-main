'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  UserGroupIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon,
  PlayIcon 
} from '@heroicons/react/24/outline';
import { createBrowserClient } from '@/lib/supabase/client';

interface DemoStats {
  activeSessions: number;
  totalSessions24h: number;
  conversionRate: number;
  avgSessionDuration: number;
}

export function DemoStatsCards() {
  const t = useTranslations('admin.demo.stats');
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createBrowserClient();
      
      try {
        // Get active demo sessions (created in last 60 minutes, demo users)
        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Active sessions - demo users with recent activity
        const { count: activeSessions } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('global_role', 'demo_private_user')
          .gte('created_at', sixtyMinutesAgo);
        
        // Total sessions in 24h
        const { count: totalSessions24h } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('global_role', 'demo_private_user')
          .gte('created_at', twentyFourHoursAgo);
        
        // Conversion rate - demo users who upgraded (changed from demo_private_user)
        // This is a simplified calculation - in production you'd track conversions explicitly
        const { count: totalDemoUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('global_role', 'demo_private_user');
        
        const { count: convertedUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .neq('global_role', 'demo_private_user')
          .not('email', 'is', null)
          .ilike('email', '%+demo%'); // Demo users who upgraded typically have tracking in email
        
        const totalDemoEver = (totalDemoUsers || 0) + (convertedUsers || 0);
        const conversionRate = totalDemoEver > 0 
          ? ((convertedUsers || 0) / totalDemoEver) * 100 
          : 0;
        
        // Average session duration (based on page views or activity)
        // Simplified: assume 15 minutes average for now
        const avgSessionDuration = 15;
        
        setStats({
          activeSessions: activeSessions || 0,
          totalSessions24h: totalSessions24h || 0,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgSessionDuration,
        });
      } catch (error) {
        console.error('Error fetching demo stats:', error);
        setStats({
          activeSessions: 0,
          totalSessions24h: 0,
          conversionRate: 0,
          avgSessionDuration: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  const cards = [
    {
      title: t('activeSessions'),
      value: stats?.activeSessions ?? '-',
      icon: PlayIcon,
      description: t('activeSessionsDesc'),
      color: 'text-green-600',
    },
    {
      title: t('sessions24h'),
      value: stats?.totalSessions24h ?? '-',
      icon: UserGroupIcon,
      description: t('sessions24hDesc'),
      color: 'text-blue-600',
    },
    {
      title: t('conversionRate'),
      value: stats ? `${stats.conversionRate}%` : '-',
      icon: ArrowTrendingUpIcon,
      description: t('conversionRateDesc'),
      color: 'text-purple-600',
    },
    {
      title: t('avgDuration'),
      value: stats ? `${stats.avgSessionDuration}m` : '-',
      icon: ClockIcon,
      description: t('avgDurationDesc'),
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <card.icon className={`h-5 w-5 ${card.color}`} />
            <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{card.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
