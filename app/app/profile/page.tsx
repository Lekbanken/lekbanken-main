'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { TenantSelector } from '@/components/tenant/TenantSelector';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UserIcon,
  AtSymbolIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  BellIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { ProfileAchievementsShowcase } from '@/features/profile/components/ProfileAchievementsShowcase';
import { isPrivateTenant } from '@/lib/tenant/helpers';

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
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'Användare';
  const email = user?.email || '';
  const avatarUrl = userProfile?.avatar_url;
  const _initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Check MFA status
  useEffect(() => {
    const checkMfa = async () => {
      try {
        const res = await fetch('/api/accounts/auth/mfa/status');
        if (res.ok) {
          const data = await res.json();
          setMfaEnabled(data.is_enabled);
        }
      } catch {
        // Ignore errors
      }
    };
    checkMfa();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <Avatar src={avatarUrl || undefined} name={displayName} size="xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-muted-foreground">{email}</p>
          {currentTenant && (
            <div className="flex items-center gap-2 mt-2">
              <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{currentTenant.name}</span>
            </div>
          )}
        </div>
        <Link
          href="/app/profile/general"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('editProfile')}
        </Link>
      </div>

      {/* Mobile Tenant Selector - only visible on small screens */}
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

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            {t('sections.security.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {user?.email_confirmed_at ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm">{t('sections.security.emailVerified')}</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-600">{t('sections.security.emailNotVerified')}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mfaEnabled ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm">{t('sections.security.mfaEnabled')}</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-amber-600">{t('sections.security.mfaDisabled')}</span>
                  <Link
                    href="/app/profile/security"
                    className="text-sm text-primary hover:underline"
                  >
                    {t('sections.security.enableMfa')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
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
          badge={mfaEnabled ? undefined : 'Rekommenderas'}
          badgeVariant="warning"
        />
        <QuickLink
          href="/app/profile/privacy"
          icon={LockClosedIcon}
          title={t('nav.privacy')}
          description={t('nav.privacyDesc')}
        />
        <QuickLink
          href="/app/profile/notifications"
          icon={BellIcon}
          title={t('nav.notifications')}
          description={t('nav.notificationsDesc')}
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

      {/* Achievements Showcase */}
      {user?.id && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 text-amber-500" />
              {t('achievementsShowcase.title')}
            </h2>
            <Link
              href="/app/profile/achievements"
              className="text-sm text-primary hover:underline"
            >
              {t('achievementsShowcase.viewAll')}
            </Link>
          </div>
          <ProfileAchievementsShowcase userId={user.id} maxDisplay={6} showLocked={false} />
        </div>
      )}
    </div>
  );
}
