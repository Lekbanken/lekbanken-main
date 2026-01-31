'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { ProfileService, type ActivityLogEntry, type UserSession } from '@/lib/profile';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import {
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  KeyIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  AdjustmentsHorizontalIcon,
  TrophyIcon,
  CogIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const activityIcons: Record<string, React.ElementType> = {
  login: ArrowRightOnRectangleIcon,
  logout: ArrowRightOnRectangleIcon,
  password_change: KeyIcon,
  email_change: UserIcon,
  profile_update: UserIcon,
  mfa_enabled: ShieldCheckIcon,
  mfa_disabled: ShieldCheckIcon,
  settings_change: AdjustmentsHorizontalIcon,
  achievement_unlocked: TrophyIcon,
  gdpr_request: CogIcon,
  session_revoked: ExclamationTriangleIcon,
  default: ClockIcon,
};

const getActivityLabel = (t: (key: string) => string, action: string): string => {
  const types: Record<string, string> = {
    login: t('sections.activity.types.login'),
    logout: t('sections.activity.types.logout'),
    password_change: t('sections.activity.types.password_change'),
    email_change: t('sections.activity.types.email_change'),
    profile_update: t('sections.activity.types.profile_update'),
    mfa_enabled: t('sections.activity.types.mfa_enabled'),
    mfa_disabled: t('sections.activity.types.mfa_disabled'),
    settings_change: t('sections.activity.types.settings_change'),
    achievement_unlocked: t('sections.activity.types.achievement_unlocked'),
    gdpr_request: t('sections.activity.types.gdpr_request'),
    session_revoked: t('sections.activity.types.session_revoked'),
  };
  return types[action] || action;
};

const deviceIcons: Record<string, React.ElementType> = {
  desktop: ComputerDesktopIcon,
  mobile: DevicePhoneMobileIcon,
  tablet: DeviceTabletIcon,
  unknown: GlobeAltIcon,
};

const getActivityFilters = (t: (key: string) => string) => [
  { id: 'all', label: t('sections.activity.filters.all') },
  { id: 'security', label: t('sections.activity.filters.security') },
  { id: 'profile', label: t('sections.activity.filters.profile') },
  { id: 'achievements', label: t('sections.activity.filters.achievements') },
];

export default function ActivityPage() {
  const t = useTranslations('app.profile');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { supabase, error: supabaseError, isInitializing } = useBrowserSupabase();
  const activityFilters = useMemo(() => getActivityFilters(t), [t]);

  const [activeFilter, setActiveFilter] = useState('all');
  const [isRevokingSession, setIsRevokingSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  // Create stable profileService instance
  const profileService = useMemo(
    () => (supabase ? new ProfileService(supabase) : null),
    [supabase]
  );

  // Use the new single-flight hook for fetching
  const {
    data: activityData,
    status,
    error: loadError,
    isLoading,
    isTimeout,
    retry,
  } = useProfileQuery<{ activities: ActivityLogEntry[]; sessions: UserSession[] }>(
    `activity-${user?.id}`,
    async () => {
      if (!profileService || !user?.id) {
        throw new Error('Not ready');
      }
      const [activities, sessionsData] = await Promise.all([
        profileService.getActivityLog(user.id, 50),
        profileService.getActiveSessions(user.id),
      ]);
      return { activities, sessions: sessionsData };
    },
    { userId: user?.id, profileService },
    {
      skip: authLoading || isInitializing || !supabase || !user?.id,
      timeout: 12000,
    }
  );

  // Update sessions state when data is fetched
  useEffect(() => {
    if (!activityData?.sessions) return
    setSessions(activityData.sessions)
  }, [activityData?.sessions]);

  const activities = activityData?.activities || [];
  const stillLoading = isLoading || authLoading || isInitializing;

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    if (!user?.id || !profileService) return;

    setIsRevokingSession(sessionId);
    try {
      await profileService.revokeSession(user.id, sessionId);

      // Refresh sessions
      const updatedSessions = await profileService.getActiveSessions(user.id);
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setIsRevokingSession(null);
    }
  }, [user?.id, supabase]);

  const filteredActivities = activities.filter((activity) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'security') {
      return ['login', 'logout', 'password_change', 'mfa_enabled', 'mfa_disabled', 'session_revoked'].includes(activity.action);
    }
    if (activeFilter === 'profile') {
      return ['profile_update', 'email_change', 'settings_change'].includes(activity.action);
    }
    if (activeFilter === 'achievements') {
      return activity.action === 'achievement_unlocked';
    }
    return true;
  });

  const formatRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('sections.activity.relativeTime.now');
    if (diffMins < 60) return t('sections.activity.relativeTime.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('sections.activity.relativeTime.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('sections.activity.relativeTime.daysAgo', { days: diffDays });
    return date.toLocaleDateString('sv-SE');
  }, [t]);

  const getDeviceTypeFromSession = (session: UserSession): string => {
    if (session.device_type) return session.device_type;
    return 'unknown';
  };

  const getDeviceTypeFromUserAgent = (userAgent: string | undefined): string => {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  };

  const getLocationString = (session: UserSession): string | null => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`;
    }
    return session.city || session.country || null;
  };

  if (!authLoading && supabaseError) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="error" title="Kunde inte ladda aktivitet">
          <p>Det gick inte att initiera anslutningen till databasen.</p>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs text-foreground">
              {supabaseError.message}
            </pre>
          )}
        </Alert>
        <Button onClick={() => window.location.reload()} variant="outline">
          Ladda om
        </Button>
      </div>
    );
  }

  if (stillLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
        {isTimeout && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted-foreground">
              Det här tar ovanligt lång tid. Kolla Console/Network för vilken request som fastnat och prova att ladda om sidan.
            </p>
            <div className="flex gap-2">
              <Button onClick={retry} variant="outline" size="sm">
                Försök igen
              </Button>
              <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
                Ladda om
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error' || status === 'timeout') {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="error" title="Kunde inte ladda aktivitet">
          <p>{loadError || 'Ett oväntat fel inträffade.'}</p>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={retry} variant="outline">
            Försök igen
          </Button>
          <Button onClick={() => window.location.reload()} variant="ghost">
            Ladda om
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClockIcon className="h-6 w-6 text-primary" />
          {t('sections.activity.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('sections.activity.description')}
        </p>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5" />
            {t('sections.activity.activeSessions')}
          </CardTitle>
          <CardDescription>
            {t('sections.activity.activeSessionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t('sections.activity.noSessions')}
            </p>
          ) : (
            sessions.map((session) => {
              const deviceType = getDeviceTypeFromSession(session);
              const DeviceIcon = deviceIcons[deviceType];
              const isCurrentSession = session.is_current;
              const location = getLocationString(session);

              return (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    isCurrentSession
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'p-2 rounded-lg',
                      isCurrentSession ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <DeviceIcon className={cn(
                        'h-5 w-5',
                        isCurrentSession ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        {session.device_name || session.browser || t('sections.activity.unknownDevice')}
                        {isCurrentSession && (
                          <Badge variant="success">{t('sections.activity.currentDevice')}</Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span>{session.ip || t('sections.activity.unknownIp')}</span>
                        {location && (
                          <>
                            <span>•</span>
                            <span>{location}</span>
                          </>
                        )}
                        {session.last_seen_at && (
                          <>
                            <span>•</span>
                            <span>{t('sections.activity.lastActive', { time: formatRelativeTime(session.last_seen_at) })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={isRevokingSession === session.id}
                    >
                      {isRevokingSession === session.id ? t('sections.activity.revoking') : t('sections.activity.revokeSession')}
                    </Button>
                  )}
                </div>
              );
            })
          )}

          {sessions.length > 1 && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={async () => {
                if (!user?.id || !supabase) return;
                const profileService = new ProfileService(supabase);
                await profileService.revokeAllSessions(user.id);
                const updatedSessions = await profileService.getActiveSessions(user.id);
                setSessions(updatedSessions);
              }}
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              {t('sections.activity.revokeAllOther')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                {t('sections.activity.recentActivity')}
              </CardTitle>
              <CardDescription>
                {t('sections.activity.recentActivityDesc')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {activityFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      activeFilter === filter.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t('sections.activity.noFilteredActivity')}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {filteredActivities.map((activity, index) => {
                  const Icon = activityIcons[activity.action] || activityIcons.default;
                  const label = getActivityLabel(t, activity.action);
                  const isSecurityEvent = ['login', 'logout', 'password_change', 'mfa_enabled', 'mfa_disabled', 'session_revoked'].includes(activity.action);

                  return (
                    <div key={activity.id || index} className="relative flex gap-4 pl-12">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-4 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSecurityEvent
                          ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400'
                          : 'bg-background border-muted-foreground/30'
                      )}>
                        <Icon className={cn(
                          'h-3 w-3',
                          isSecurityEvent ? 'text-amber-600' : 'text-muted-foreground'
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{label}</p>
                            {activity.details && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {typeof activity.details === 'string'
                                  ? activity.details
                                  : JSON.stringify(activity.details)}
                              </p>
                            )}
                            {activity.ip_address && (
                              <p className="text-xs text-muted-foreground mt-1">
                                IP: {activity.ip_address}
                                {activity.user_agent && ` • ${getDeviceTypeFromUserAgent(activity.user_agent)}`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredActivities.length >= 50 && (
            <div className="text-center mt-4">
              <Button variant="outline">
                {t('sections.activity.loadMore')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.activity.exportLog')}</CardTitle>
          <CardDescription>
            {t('sections.activity.exportDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const data = JSON.stringify(activities, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
            >
              {t('sections.activity.exportJson')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const headers = [
                  t('sections.activity.csvHeaders.date'),
                  t('sections.activity.csvHeaders.activity'),
                  t('sections.activity.csvHeaders.details'),
                  t('sections.activity.csvHeaders.ip')
                ];
                const rows = activities.map((a) => [
                  new Date(a.created_at).toISOString(),
                  getActivityLabel(t, a.action),
                  typeof a.details === 'string' ? a.details : JSON.stringify(a.details),
                  a.ip_address || '',
                ]);
                const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
            >
              {t('sections.activity.exportCsv')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
