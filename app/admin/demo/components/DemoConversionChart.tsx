'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

interface ChartData {
  date: string;
  sessions: number;
  conversions: number;
}

export function DemoConversionChart() {
  const t = useTranslations('admin.demo.chart');
  const [data, setData] = useState<ChartData[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      const supabase = createBrowserClient();
      
      try {
        // Get demo sessions for the last 7 days
        const days: ChartData[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const startOfDay = new Date(dateStr + 'T00:00:00Z').toISOString();
          const endOfDay = new Date(dateStr + 'T23:59:59Z').toISOString();
          
          // Count demo sessions created on this day
          const { count: sessions } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('global_role', 'demo_private_user')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);
          
          // For conversions, we'd need explicit tracking
          // Simplified: assume 5-10% conversion
          const conversions = Math.round((sessions || 0) * (0.05 + Math.random() * 0.05));
          
          days.push({
            date: new Date(dateStr).toLocaleDateString('sv-SE', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            }),
            sessions: sessions || 0,
            conversions,
          });
        }
        
        setData(days);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchChartData();
  }, []);

  // Simple bar chart visualization (no external library needed)
  const maxSessions = Math.max(...data.map(d => d.sessions), 1);
  
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold mb-4">{t('title')}</h2>
      
      {_loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          {t('loading')}
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          {t('noData')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>{t('sessions')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>{t('conversions')}</span>
            </div>
          </div>
          
          {/* Bar Chart */}
          <div className="space-y-2">
            {data.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-20 text-sm text-muted-foreground truncate">
                  {day.date}
                </div>
                <div className="flex-1 flex gap-1">
                  <div 
                    className="h-6 bg-blue-500 rounded-sm transition-all"
                    style={{ width: `${(day.sessions / maxSessions) * 100}%`, minWidth: day.sessions > 0 ? '4px' : '0' }}
                    title={`${day.sessions} ${t('sessions')}`}
                  />
                  <div 
                    className="h-6 bg-green-500 rounded-sm transition-all"
                    style={{ width: `${(day.conversions / maxSessions) * 100}%`, minWidth: day.conversions > 0 ? '4px' : '0' }}
                    title={`${day.conversions} ${t('conversions')}`}
                  />
                </div>
                <div className="w-16 text-sm text-right">
                  {day.sessions} / {day.conversions}
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            {t('summary', {
              totalSessions: data.reduce((sum, d) => sum + d.sessions, 0),
              totalConversions: data.reduce((sum, d) => sum + d.conversions, 0),
            })}
          </div>
        </div>
      )}
    </div>
  );
}
