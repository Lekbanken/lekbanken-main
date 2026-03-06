'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { TenantSelector } from '@/components/tenant/TenantSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UserIcon,
  AtSymbolIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { profileCacheKeys } from '@/lib/profile/cacheKeys';
import { ProfileHero, StatsCards, AchievementShowcaseCard, SecurityStatusCard, JourneyToggleCard } from '@/features/profile-overview';
import type { GamificationPayload } from '@/features/gamification/types';

interface QuickLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'destructive';
}

function QuickLink({ href, icon: Icon, title, description, badge, badgeVariant }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{title}</span>
          {badge && (
            <Badge variant={badgeVariant || 'default'} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRightIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

export default function ProfileOverviewPage() {
  const t = useTranslations('app.profile');
  const tCommon = useTranslations('common');
  const { user, userProfile } = useAuth();
  const { currentTenant, userTenants } = useTenant();

  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'Användare';
  const email = user?.email || '';
  const avatarUrl = userProfile?.avatar_url ?? null;

  // ── MFA status ──────────────────────────────────────────────────────────
  const mfaFetchKey = user?.id ? profileCacheKeys.mfaStatus(user.id) : 'mfa-status-anon';
  const {
    data: mfaStatus,
    status: mfaStatusStatus,
    error: mfaStatusError,
  } = useProfileQuery<{ is_enabled?: boolean }>(
    mfaFetchKey,
    async (signal) => {
      const res = await fetch('/api/accounts/auth/mfa/status', {
        credentials: 'include',
        signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Failed to load MFA status (${res.status})`);
      }
      return (await res.json()) as { is_enabled?: boolean };
    },
    { userId: user?.id },
    { timeout: 12000, skip: !user?.id }
  );

  const mfaEnabled = mfaStatusStatus === 'success' ? Boolean(mfaStatus?.is_enabled) : null;
  const mfaLoading = mfaStatusStatus === 'loading' || mfaStatusStatus === 'idle';

  // ── Gamification data ───────────────────────────────────────────────────
  const {
    data: gamification,
  } = useProfileQuery<GamificationPayload | null>(
    user?.id ? `gamification-overview::${user.id}` : 'gamification-overview-anon',
    async (signal) => {
      const res = await fetch('/api/gamification', {
        credentials: 'include',
        signal,
      });
      if (!res.ok) return null;
      return (await res.json()) as GamificationPayload;
    },
    { userId: user?.id },
    { timeout: 12000, skip: !user?.id }
  );

  const handleJourneyToggle = async (enabled: boolean) => {
    const res = await fetch('/api/gamification/journey-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to update journey preference');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Hero: avatar + name + level + XP */}
      <ProfileHero
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        tenantName={currentTenant?.name ?? null}
        progress={gamification?.progress ?? null}
        identity={gamification?.identity ?? null}
      />

      {/* Journey toggle */}
      <JourneyToggleCard
        enabled={gamification?.journeyPreference?.enabled ?? false}
        onToggle={handleJourneyToggle}
      />

      {/* Mobile Tenant Selector */}
      <div className="block lg:hidden">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BuildingOfficeIcon className="h-5 w-5 text-primary" />
              {tCommon('tenant.selectTenant')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TenantSelector variant="full" className="w-full" />
          </CardContent>
        </Card>
      </div>

      {/* DiceCoin + Streak */}
      <StatsCards
        coins={gamification?.coins ?? null}
        streak={gamification?.streak ?? null}
      />

      {/* Achievement Showcase */}
      <AchievementShowcaseCard
        showcase={gamification?.showcase ?? null}
        achievements={gamification?.achievements ?? []}
      />

      {/* Security + Quick Links — 2-column on desktop */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SecurityStatusCard
          emailVerified={Boolean(user?.email_confirmed_at)}
          mfaEnabled={mfaEnabled}
          mfaLoading={mfaLoading}
          mfaError={mfaStatusError}
        />

        {/* Quick Links column */}
        <div className="space-y-3">
          <QuickLink
            href="/app/profile/general"
            icon={UserIcon}
            title={t('nav.general')}
            description={t('nav.generalDesc')}
          />
          <QuickLink
            href="/app/profile/account"
            icon={AtSymbolIcon}
            title={t('nav.account')}
            description={t('nav.accountDesc')}
          />
          <QuickLink
            href="/app/profile/security"
            icon={ShieldCheckIcon}
            title={t('nav.security')}
            description={t('nav.securityDesc')}
            badge={mfaEnabled === false ? t('sections.overview.recommended') : undefined}
            badgeVariant="warning"
          />
          <QuickLink
            href="/app/profile/preferences"
            icon={Cog6ToothIcon}
            title={t('nav.preferences')}
            description={t('nav.preferencesDesc')}
          />
          <QuickLink
            href="/app/profile/organizations"
            icon={BuildingOfficeIcon}
            title={t('nav.organizations')}
            description={t('nav.organizationsDesc')}
            badge={userTenants.length > 0 ? `${userTenants.length}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}
