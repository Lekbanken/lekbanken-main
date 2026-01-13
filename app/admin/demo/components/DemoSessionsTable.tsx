'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

interface DemoSession {
  id: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Format a date as relative time (e.g., "3 minutes ago")
 * Uses Intl.RelativeTimeFormat instead of date-fns
 */
function formatRelativeTime(date: Date, locale: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays > 0) {
    return rtf.format(-diffDays, 'day');
  } else if (diffHours > 0) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffMinutes > 0) {
    return rtf.format(-diffMinutes, 'minute');
  } else {
    return rtf.format(-diffSeconds, 'second');
  }
}

export function DemoSessionsTable() {
  const t = useTranslations('admin.demo.table');
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const supabase = createBrowserClient();
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, created_at, full_name, avatar_url')
          .eq('global_role', 'demo_private_user')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching demo sessions:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSessions();
  }, []);

  // Determine locale for date formatting
  const getLocaleCode = (): string => {
    if (typeof window !== 'undefined') {
      const lang = document.documentElement.lang;
      if (lang === 'sv') return 'sv-SE';
      if (lang === 'no' || lang === 'nb') return 'nb-NO';
    }
    return 'en-US';
  };

  const getSessionStatus = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const hoursPassed = (now - createdTime) / (1000 * 60 * 60);
    
    if (hoursPassed < 1) {
      return { status: 'active', color: 'bg-green-100 text-green-800' };
    } else if (hoursPassed < 24) {
      return { status: 'expired', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'old', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        {t('loading')}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        {t('noSessions')}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">{t('user')}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t('created')}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t('status')}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">{t('sessionId')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sessions.map((session) => {
            const { status, color } = getSessionStatus(session.created_at);
            return (
              <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {session.full_name?.[0]?.toUpperCase() || 'D'}
                    </div>
                    <span className="text-sm">
                      {session.full_name || t('anonymousUser')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatRelativeTime(new Date(session.created_at), getLocaleCode())}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                    {t(`status.${status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                  {session.id.slice(0, 8)}...
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
